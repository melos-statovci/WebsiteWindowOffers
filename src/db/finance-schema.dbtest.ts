// Phase 7 Checkpoint A — DB-layer tenancy/integrity tests for invoices,
// invoice_lines and payments. Runs against the Neon dev DB as the restricted role
// kornizo_app (NOBYPASSRLS) via runWithOrg, the same transaction the server
// read/actions use.
//
// These assert the DATABASE guarantees (RLS + composite FKs + delete actions +
// CHECK), independent of any application code, so a bug in a future server action
// can never cross tenants or destroy accounting history:
//   - RLS: no context -> no rows; A cannot see/insert B's finance rows.
//   - Composite (org, client_id)/(org, project_id)/(org, invoice_id) FKs: an
//     invoice/line/payment can only reference same-org parents.
//   - Client delete is BLOCKED while invoices OR payments reference it (NO ACTION).
//   - Project delete NULLs invoice.project_id (column-scoped SET NULL) — the
//     invoice survives with its `reference` snapshot.
//   - Invoice delete CASCADES its lines but SET NULLs its payments (money survives
//     as client advance/credit) — never destroys a payment.
//   - payments_amount_positive CHECK rejects a non-positive amount at the DB.
//   - invoices_org_number_uidx makes the invoice number unique per org (not global).
//   - Org delete cascades all finance away.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { invoices, payments } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p7a-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P7A ${who}` },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}

async function createClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into clients(organization_id, name, type) values($1,$2,'Privat') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}

/** Insert a project directly (owner pool, setup only). */
async function createProject(orgId: string, clientId: string, number: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into projects(organization_id, client_id, number, title) values($1,$2,$3,'T') returning id`,
    [orgId, clientId, number],
  );
  return r.rows[0].id as string;
}

/** Insert an invoice via the RLS-scoped restricted transaction; returns its id. */
function insertInvoice(
  ctxOrg: string,
  row: { orgId: string; clientId: string; number: string; projectId?: string | null },
): Promise<string> {
  return runWithOrg(appDb, ctxOrg, async (tx) => {
    const r = await tx.execute(sql`
      insert into invoices(
        organization_id, client_id, project_id, number, client_name, client_snapshot,
        reference, issued_at, due_at, status, vat_rate
      ) values(
        ${row.orgId}::uuid, ${row.clientId}::uuid, ${row.projectId ?? null}, ${row.number},
        'Snapshot Name', '{"name":"Snapshot Name","type":"Privat"}'::jsonb,
        'OF-REF', '2026-01-01', '2026-01-15', 'Dërguar', 0.18
      ) returning id
    `);
    return (r.rows[0] as { id: string }).id;
  });
}

/** Insert an invoice line via the RLS-scoped restricted transaction; returns id. */
function insertLine(
  ctxOrg: string,
  row: { orgId: string; invoiceId: string },
): Promise<string> {
  return runWithOrg(appDb, ctxOrg, async (tx) => {
    const r = await tx.execute(sql`
      insert into invoice_lines(organization_id, invoice_id, description, qty, unit_price)
      values(${row.orgId}::uuid, ${row.invoiceId}::uuid, 'Line', 2, 100.00)
      returning id
    `);
    return (r.rows[0] as { id: string }).id;
  });
}

/** Insert a payment via the RLS-scoped restricted transaction; returns id. */
function insertPayment(
  ctxOrg: string,
  row: { orgId: string; clientId: string; invoiceId?: string | null; amount?: number },
): Promise<string> {
  return runWithOrg(appDb, ctxOrg, async (tx) => {
    const r = await tx.execute(sql`
      insert into payments(organization_id, client_id, invoice_id, amount, date, method)
      values(${row.orgId}::uuid, ${row.clientId}::uuid, ${row.invoiceId ?? null},
        ${row.amount ?? 50}, '2026-01-10', 'Transfertë bankare')
      returning id
    `);
    return (r.rows[0] as { id: string }).id;
  });
}

let orgA = "";
let orgB = "";
let clientA = "";
let clientB = "";
let projectA = "";

beforeAll(async () => {
  const ownerA = await signUp("ownera");
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerA.cookie), "P7A Org A", `p7a-a-${suffix}`);

  const ownerB = await signUp("ownerb");
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerB.cookie), "P7A Org B", `p7a-b-${suffix}`);

  clientA = await createClient(orgA, "Client A");
  clientB = await createClient(orgB, "Client B");
  projectA = await createProject(orgA, clientA, `PRJ-${suffix}-A`);
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

describe("finance RLS tenant isolation", () => {
  it("no tenant context = no rows", async () => {
    expect((await appPool.query("select id from invoices")).rows).toHaveLength(0);
    expect((await appPool.query("select id from invoice_lines")).rows).toHaveLength(0);
    expect((await appPool.query("select id from payments")).rows).toHaveLength(0);
  });

  it("A cannot see B's invoices/payments", async () => {
    const inv = await insertInvoice(orgB, { orgId: orgB, clientId: clientB, number: `FAT-${suffix}-B1` });
    await insertPayment(orgB, { orgId: orgB, clientId: clientB, invoiceId: inv });
    const seenInv = await runWithOrg(appDb, orgA, (tx) =>
      tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.organizationId, orgB)),
    );
    const seenPay = await runWithOrg(appDb, orgA, (tx) =>
      tx.select({ id: payments.id }).from(payments).where(eq(payments.organizationId, orgB)),
    );
    expect(seenInv).toHaveLength(0);
    expect(seenPay).toHaveLength(0);
  });

  it("A cannot INSERT an invoice/line/payment for another org (RLS WITH CHECK)", async () => {
    await expect(
      insertInvoice(orgA, { orgId: orgB, clientId: clientB, number: `FAT-${suffix}-X1` }),
    ).rejects.toThrow();
    const invB = await insertInvoice(orgB, { orgId: orgB, clientId: clientB, number: `FAT-${suffix}-B2` });
    await expect(insertLine(orgA, { orgId: orgB, invoiceId: invB })).rejects.toThrow();
    await expect(
      insertPayment(orgA, { orgId: orgB, clientId: clientB }),
    ).rejects.toThrow();
  });
});

describe("finance composite tenant foreign keys", () => {
  it("a valid same-tenant invoice + line + payment inserts", async () => {
    const inv = await insertInvoice(orgA, {
      orgId: orgA, clientId: clientA, number: `FAT-${suffix}-A-OK`, projectId: projectA,
    });
    const line = await insertLine(orgA, { orgId: orgA, invoiceId: inv });
    const pay = await insertPayment(orgA, { orgId: orgA, clientId: clientA, invoiceId: inv });
    expect(inv && line && pay).toBeTruthy();
  });

  it("an invoice CANNOT reference another org's client", async () => {
    await expect(
      insertInvoice(orgA, { orgId: orgA, clientId: clientB, number: `FAT-${suffix}-BADCLIENT` }),
    ).rejects.toThrow();
  });

  it("an invoice CANNOT reference another org's project", async () => {
    const projB = await createProject(orgB, clientB, `PRJ-${suffix}-B`);
    await expect(
      insertInvoice(orgA, {
        orgId: orgA, clientId: clientA, number: `FAT-${suffix}-BADPROJ`, projectId: projB,
      }),
    ).rejects.toThrow();
  });

  it("a line CANNOT attach to another org's invoice", async () => {
    const invB = await insertInvoice(orgB, { orgId: orgB, clientId: clientB, number: `FAT-${suffix}-B3` });
    await expect(insertLine(orgA, { orgId: orgA, invoiceId: invB })).rejects.toThrow();
  });

  it("a payment CANNOT reference another org's client or invoice", async () => {
    await expect(
      insertPayment(orgA, { orgId: orgA, clientId: clientB }),
    ).rejects.toThrow();
    const invB = await insertInvoice(orgB, { orgId: orgB, clientId: clientB, number: `FAT-${suffix}-B4` });
    await expect(
      insertPayment(orgA, { orgId: orgA, clientId: clientA, invoiceId: invB }),
    ).rejects.toThrow();
  });
});

describe("finance money CHECK", () => {
  it("a zero or negative payment amount is rejected at the DB", async () => {
    await expect(
      insertPayment(orgA, { orgId: orgA, clientId: clientA, amount: 0 }),
    ).rejects.toThrow();
    await expect(
      insertPayment(orgA, { orgId: orgA, clientId: clientA, amount: -5 }),
    ).rejects.toThrow();
  });
});

describe("finance delete semantics (accounting history is protected)", () => {
  it("deleting an invoice CASCADES its lines but SET NULLs its payments", async () => {
    const inv = await insertInvoice(orgA, { orgId: orgA, clientId: clientA, number: `FAT-${suffix}-DEL` });
    const line = await insertLine(orgA, { orgId: orgA, invoiceId: inv });
    const pay = await insertPayment(orgA, { orgId: orgA, clientId: clientA, invoiceId: inv });

    await runWithOrg(appDb, orgA, (tx) => tx.delete(invoices).where(eq(invoices.id, inv)));

    // Line is gone (cascade).
    expect((await ownerPool.query(`select id from invoice_lines where id=$1`, [line])).rows).toHaveLength(0);
    // Payment survives, unlinked (invoice_id -> NULL), money -> client advance.
    const p = await ownerPool.query(`select invoice_id from payments where id=$1`, [pay]);
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0].invoice_id).toBeNull();
  });

  it("deleting a project SET NULLs invoice.project_id (invoice survives)", async () => {
    const proj = await createProject(orgA, clientA, `PRJ-${suffix}-A-INVLINK`);
    const inv = await insertInvoice(orgA, {
      orgId: orgA, clientId: clientA, number: `FAT-${suffix}-PROJLINK`, projectId: proj,
    });
    // Delete the project through the RLS-scoped app role (as the real action does).
    await runWithOrg(appDb, orgA, (tx) =>
      tx.execute(sql`delete from projects where id=${proj}::uuid`),
    );
    const row = await ownerPool.query(`select project_id, reference from invoices where id=$1`, [inv]);
    expect(row.rows).toHaveLength(1);
    expect(row.rows[0].project_id).toBeNull();
    expect(row.rows[0].reference).toBe("OF-REF"); // human reference snapshot survives
  });

  it("a client with invoices OR payments CANNOT be deleted (NO ACTION); org cascade removes all", async () => {
    const ownerC = await signUp("ownerc");
    const orgC = await createProvisionedTestOrganization(auth, cleanup, H(ownerC.cookie), "P7A Org C", `p7a-c-${suffix}`);
    const clientC = await createClient(orgC, "Client C");
    const invC = await insertInvoice(orgC, { orgId: orgC, clientId: clientC, number: `FAT-${suffix}-C1` });
    await insertLine(orgC, { orgId: orgC, invoiceId: invC });
    await insertPayment(orgC, { orgId: orgC, clientId: clientC, invoiceId: invC });

    // Blocked while an invoice references the client.
    await expect(ownerPool.query(`delete from clients where id=$1`, [clientC])).rejects.toThrow();

    await ownerPool.query(`delete from organization where id=$1`, [orgC]);
    cleanup.userEmail(email("ownerc"));
    expect((await ownerPool.query(`select id from invoices where id=$1`, [invC])).rows).toHaveLength(0);
    expect((await ownerPool.query(`select id from clients where id=$1`, [clientC])).rows).toHaveLength(0);
  });
});

describe("tenant-safe invoice numbering", () => {
  it("the same number is unique within an org but allowed across orgs", async () => {
    const num = `FAT-${suffix}-DUP`;
    await insertInvoice(orgA, { orgId: orgA, clientId: clientA, number: num });
    await expect(
      insertInvoice(orgA, { orgId: orgA, clientId: clientA, number: num }),
    ).rejects.toThrow();
    const invB = await insertInvoice(orgB, { orgId: orgB, clientId: clientB, number: num });
    expect(invB).toBeTruthy();
  });
});
