// Phase 6 Checkpoint A — DB-layer tenancy/integrity tests for projects and
// project_items. Runs against the Neon dev DB as the restricted role kornizo_app
// (NOBYPASSRLS) via runWithOrg, the same transaction the server read/actions use.
//
// These assert the DATABASE guarantees (RLS + composite FKs), independent of any
// application code, so a bug in a future server action can never cross tenants:
//   - RLS: no context -> no rows; A cannot see/insert B's projects or items.
//   - Composite (organization_id, client_id) -> clients: a project cannot
//     reference another org's client.
//   - Composite (organization_id, project_id) -> projects: an item cannot attach
//     to another org's project; deleting a project cascades to its items.
//   - Composite (organization_id, price_list_id) -> price_lists: an item cannot
//     reference another org's pricing version.
//   - Client delete is BLOCKED while projects reference it (NO ACTION), but
//     deleting the organization cascades everything away.
//   - projects_org_number_uidx makes the offer number unique per org (not global).
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { projects } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { TestCleanup, testRunId } from "@/db/testing/fixtures";
import { ensureActivePriceList } from "@/server/pricing-init";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p6a-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P6A ${who}` },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}

/** Create a client directly (owner pool, setup only) and return its id. */
async function createClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into clients(organization_id, name, type) values($1,$2,'Privat') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}

/** Ensure + return the active price_lists row (id, version) for an org. */
async function activePriceList(orgId: string): Promise<{ id: string; version: number }> {
  await runWithOrg(appDb, orgId, (tx) => ensureActivePriceList(tx, orgId));
  const r = await ownerPool.query(
    `select id, version from price_lists where organization_id=$1 and is_active`,
    [orgId],
  );
  return { id: r.rows[0].id as string, version: r.rows[0].version as number };
}

/** Insert a project via the RLS-scoped restricted transaction; returns its id. */
function insertProject(
  ctxOrg: string,
  row: { orgId: string; clientId: string; number: string; title?: string },
): Promise<string> {
  return runWithOrg(appDb, ctxOrg, async (tx) => {
    const r = await tx.execute(sql`
      insert into projects(organization_id, client_id, number, title)
      values(${row.orgId}::uuid, ${row.clientId}::uuid, ${row.number}, ${row.title ?? "T"})
      returning id
    `);
    return (r.rows[0] as { id: string }).id;
  });
}

/** Insert a project item via the RLS-scoped restricted transaction; returns id. */
function insertItem(
  ctxOrg: string,
  row: { orgId: string; projectId: string; priceListId: string; version: number },
): Promise<string> {
  return runWithOrg(appDb, ctxOrg, async (tx) => {
    const r = await tx.execute(sql`
      insert into project_items(
        organization_id, project_id, kind, label, width_mm, height_mm, qty,
        unit_price, config, price_list_id, price_list_version, calculation_version,
        calc_snapshot
      ) values(
        ${row.orgId}::uuid, ${row.projectId}::uuid, 'Dritare', 'W', 1000, 1200, 1,
        100.00, '{}'::jsonb, ${row.priceListId}::uuid, ${row.version}, 1, '{}'::jsonb
      ) returning id
    `);
    return (r.rows[0] as { id: string }).id;
  });
}

let orgA = "";
let orgB = "";
let clientA = "";
let clientB = "";
let plA = { id: "", version: 1 };
let plB = { id: "", version: 1 };

beforeAll(async () => {
  const ownerA = await signUp("ownera");
  const oa = await auth.api.createOrganization({
    headers: H(ownerA.cookie),
    body: { name: "P6A Org A", slug: `p6a-a-${suffix}` },
  });
  orgA = cleanup.org(oa!.id);

  const ownerB = await signUp("ownerb");
  const ob = await auth.api.createOrganization({
    headers: H(ownerB.cookie),
    body: { name: "P6A Org B", slug: `p6a-b-${suffix}` },
  });
  orgB = cleanup.org(ob!.id);

  clientA = await createClient(orgA, "Client A");
  clientB = await createClient(orgB, "Client B");
  plA = await activePriceList(orgA);
  plB = await activePriceList(orgB);
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

describe("projects/project_items RLS tenant isolation", () => {
  it("no tenant context = no rows", async () => {
    expect((await appPool.query("select id from projects")).rows).toHaveLength(0);
    expect((await appPool.query("select id from project_items")).rows).toHaveLength(0);
  });

  it("A cannot see B's projects", async () => {
    await insertProject(orgB, { orgId: orgB, clientId: clientB, number: `PRJ-${suffix}-B1` });
    const seen = await runWithOrg(appDb, orgA, (tx) =>
      tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, orgB)),
    );
    expect(seen).toHaveLength(0);
  });

  it("A cannot INSERT a project for another org (RLS WITH CHECK)", async () => {
    await expect(
      insertProject(orgA, { orgId: orgB, clientId: clientB, number: `PRJ-${suffix}-X1` }),
    ).rejects.toThrow();
  });

  it("A cannot INSERT a project_item for another org (RLS WITH CHECK)", async () => {
    const pB = await insertProject(orgB, {
      orgId: orgB,
      clientId: clientB,
      number: `PRJ-${suffix}-B2`,
    });
    await expect(
      insertItem(orgA, { orgId: orgB, projectId: pB, priceListId: plB.id, version: plB.version }),
    ).rejects.toThrow();
  });
});

describe("composite tenant foreign keys", () => {
  it("a project CANNOT reference another org's client", async () => {
    // org context A, org A row, but client belongs to org B -> (A, clientB) is
    // not a clients row -> composite FK violation.
    await expect(
      insertProject(orgA, { orgId: orgA, clientId: clientB, number: `PRJ-${suffix}-A-BADCLIENT` }),
    ).rejects.toThrow();
  });

  it("a valid same-tenant project + item inserts", async () => {
    const pid = await insertProject(orgA, {
      orgId: orgA,
      clientId: clientA,
      number: `PRJ-${suffix}-A-OK`,
    });
    const iid = await insertItem(orgA, {
      orgId: orgA,
      projectId: pid,
      priceListId: plA.id,
      version: plA.version,
    });
    expect(pid).toBeTruthy();
    expect(iid).toBeTruthy();
  });

  it("an item CANNOT attach to another org's project", async () => {
    const pB = await insertProject(orgB, {
      orgId: orgB,
      clientId: clientB,
      number: `PRJ-${suffix}-B3`,
    });
    // org context A, org A item, project belongs to B -> (A, pB) not a projects
    // row -> composite FK violation.
    await expect(
      insertItem(orgA, { orgId: orgA, projectId: pB, priceListId: plA.id, version: plA.version }),
    ).rejects.toThrow();
  });

  it("an item CANNOT reference another org's pricing version", async () => {
    const pid = await insertProject(orgA, {
      orgId: orgA,
      clientId: clientA,
      number: `PRJ-${suffix}-A-BADPL`,
    });
    // org A item, price_list belongs to B -> (A, plB) not a price_lists row.
    await expect(
      insertItem(orgA, { orgId: orgA, projectId: pid, priceListId: plB.id, version: plB.version }),
    ).rejects.toThrow();
  });
});

describe("cascade + client-delete semantics", () => {
  it("deleting a project cascades to its items", async () => {
    const pid = await insertProject(orgA, {
      orgId: orgA,
      clientId: clientA,
      number: `PRJ-${suffix}-A-CASCADE`,
    });
    await insertItem(orgA, {
      orgId: orgA,
      projectId: pid,
      priceListId: plA.id,
      version: plA.version,
    });
    await runWithOrg(appDb, orgA, (tx) =>
      tx.delete(projects).where(eq(projects.id, pid)),
    );
    const items = await ownerPool.query(`select id from project_items where project_id=$1`, [pid]);
    expect(items.rows).toHaveLength(0);
  });

  it("a client with projects CANNOT be deleted (NO ACTION), but the org cascade removes both", async () => {
    // dedicated throwaway org so the cascade delete cannot disturb other tests.
    const ownerC = await signUp("ownerc");
    const oc = await auth.api.createOrganization({
      headers: H(ownerC.cookie),
      body: { name: "P6A Org C", slug: `p6a-c-${suffix}` },
    });
    const orgC = oc!.id; // intentionally NOT tracked in cleanup: we delete it here
    const clientC = await createClient(orgC, "Client C");
    const plC = await activePriceList(orgC);
    const pid = await insertProject(orgC, {
      orgId: orgC,
      clientId: clientC,
      number: `PRJ-${suffix}-C1`,
    });
    await insertItem(orgC, { orgId: orgC, projectId: pid, priceListId: plC.id, version: plC.version });

    // Direct client delete is blocked while a project references it.
    await expect(
      ownerPool.query(`delete from clients where id=$1`, [clientC]),
    ).rejects.toThrow();

    // Deleting the organization cascades: projects + items + clients all gone.
    await ownerPool.query(`delete from organization where id=$1`, [orgC]);
    cleanup.userEmail(email("ownerc")); // user row still needs teardown
    expect((await ownerPool.query(`select id from projects where id=$1`, [pid])).rows).toHaveLength(0);
    expect((await ownerPool.query(`select id from clients where id=$1`, [clientC])).rows).toHaveLength(0);
  });
});

describe("tenant-safe offer numbering", () => {
  it("the same number is unique within an org but allowed across orgs", async () => {
    const num = `PRJ-${suffix}-DUP`;
    await insertProject(orgA, { orgId: orgA, clientId: clientA, number: num });
    // same number, same org -> unique violation
    await expect(
      insertProject(orgA, { orgId: orgA, clientId: clientA, number: num }),
    ).rejects.toThrow();
    // same number, different org -> allowed
    const pB = await insertProject(orgB, { orgId: orgB, clientId: clientB, number: num });
    expect(pB).toBeTruthy();
  });
});
