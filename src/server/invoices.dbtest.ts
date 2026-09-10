// Phase 7 Checkpoint B — invoice action-layer integration tests. Runs against the
// Neon dev DB as the restricted role kornizo_app via the real action cores (driven
// with explicit session headers) plus RLS-scoped reads that mirror the server read
// boundary. Covers the HARD Phase 7 invoice proofs:
//   - canonical permissions (sales/operator read-only; accounting can create/cancel)
//   - tenant-safe sequential invoice numbering
//   - invoice-from-project money authority: lines are snapshotted from the
//     AUTHORITATIVE project items; a tampered payload cannot inject line prices
//   - manual invoices: user line prices honoured, totals recomputed server-side,
//     no browser grand total trusted
//   - HISTORICAL STABILITY: editing/repricing the source project after invoicing
//     does NOT rewrite the invoice's frozen lines/snapshot
//   - status/cancel rules; "Paguar" cannot be set by hand
//   - same-org sharing + cross-org isolation (create/read/status/delete/attach)
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { invoices } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createProjectAction, setProjectStatusAction, addProjectItemAction, updateProjectItemAction } from "@/server/actions/project";
import {
  createInvoiceFromProjectAction,
  createManualInvoiceAction,
  setInvoiceStatusAction,
  deleteInvoiceAction,
} from "@/server/actions/invoice";
import { invoiceNet, invoiceTotal } from "@/domain/finance/selectors";
import type { WindowConfig } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p7b-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P7B ${who}` },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function addMember(orgId: string, userId: string, role: string) {
  await ownerPool.query(
    `insert into member(organization_id,user_id,role,created_at) values($1,$2,$3,now())`,
    [orgId, userId, role],
  );
}
async function createClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into clients(organization_id, name, type, nui, address) values($1,$2,'Biznes','810123456','Rr. Test') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}
async function invoiceLinesOf(invoiceId: string) {
  const r = await ownerPool.query(
    `select description, qty, unit_price from invoice_lines where invoice_id=$1 order by sort_order`,
    [invoiceId],
  );
  return r.rows as { description: string; qty: number; unit_price: string }[];
}
async function invoiceRow(invoiceId: string) {
  const r = await ownerPool.query(
    `select number, client_name, client_snapshot, reference, status, vat_rate, project_id from invoices where id=$1`,
    [invoiceId],
  );
  return r.rows[0] as
    | { number: string; client_name: string; client_snapshot: Record<string, unknown>; reference: string | null; status: string; vat_rate: string; project_id: string | null }
    | undefined;
}
async function invoicesVisibleTo(orgId: string): Promise<string[]> {
  return runWithOrg(appDb, orgId, async (tx) => {
    const rows = await tx.select({ id: invoices.id }).from(invoices);
    return rows.map((r) => r.id);
  });
}

const cfg: WindowConfig = {
  productType: "Dritare",
  modelType: "njeshe",
  widthMm: 1000,
  heightMm: 1200,
  systemId: "s1",
  color: "white",
  mechanismId: "Roto NX",
  glassId: "g1",
  roleta: false,
  shtesa: [],
  openings: {},
};

const DATES = { issuedAt: "2026-06-01", dueAt: "2026-06-15" };

let ownerCookie = "";
let ownerBCookie = "";
let salesCookie = "";
let operatorCookie = "";
let accountingCookie = "";
let user2Cookie = "";
let orgA = "";
let orgB = "";
let clientA = "";
let clientB = "";

/** Create an accepted project in org A with one item; returns {projectId, unitPrice}. */
async function acceptedProjectWithItem(): Promise<{ projectId: string; unitPrice: number }> {
  const c = await createProjectAction({ clientId: clientA, title: "Src", vatRate: 0.18 }, H(ownerCookie));
  if (!c.ok) throw new Error("setup: project");
  const add = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 3 }, H(ownerCookie));
  if (!add.ok) throw new Error("setup: item");
  await setProjectStatusAction({ id: c.data.id, status: "Pranuar" }, H(ownerCookie));
  return { projectId: c.data.id, unitPrice: add.data.unitPrice };
}

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "P7B A", `p7b-a-${suffix}`);

  const ownerB = await signUp("ownerb");
  ownerBCookie = ownerB.cookie;
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerBCookie), "P7B B", `p7b-b-${suffix}`);

  const sales = await signUp("sales");
  salesCookie = sales.cookie;
  await addMember(orgA, sales.userId, "sales");
  const operator = await signUp("operator");
  operatorCookie = operator.cookie;
  await addMember(orgA, operator.userId, "operator");
  const accounting = await signUp("acct");
  accountingCookie = accounting.cookie;
  await addMember(orgA, accounting.userId, "accounting");
  const user2 = await signUp("user2");
  user2Cookie = user2.cookie;
  await addMember(orgA, user2.userId, "accounting");

  clientA = await createClient(orgA, "Client A");
  clientB = await createClient(orgB, "Client B");
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

describe("invoice permissions", () => {
  it("sales/operator cannot create an invoice (read-only)", async () => {
    const rs = await createManualInvoiceAction(
      { clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "X", qty: 1, unitPrice: 10 }] },
      H(salesCookie),
    );
    expect(rs.ok).toBe(false);
    if (!rs.ok) expect(rs.error.code).toBe("FORBIDDEN");
    const ro = await createManualInvoiceAction(
      { clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "X", qty: 1, unitPrice: 10 }] },
      H(operatorCookie),
    );
    expect(ro.ok).toBe(false);
  });
  it("unauthenticated is rejected", async () => {
    const r = await createManualInvoiceAction(
      { clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "X", qty: 1, unitPrice: 10 }] },
      new Headers(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHENTICATED");
  });
  it("accounting can create an invoice", async () => {
    const r = await createManualInvoiceAction(
      { clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "Acct", qty: 1, unitPrice: 10 }] },
      H(accountingCookie),
    );
    expect(r.ok).toBe(true);
  });
});

describe("tenant-safe invoice numbering", () => {
  it("creates sequential FAT numbers, formatted FAT-YYYY-NNN", async () => {
    const r1 = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "N1", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    const r2 = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "N2", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    const row1 = await invoiceRow(r1.data.id);
    const row2 = await invoiceRow(r2.data.id);
    expect(row1!.number).toMatch(/^FAT-\d{4}-\d{3}$/);
    const n1 = parseInt(row1!.number.match(/(\d+)$/)![1], 10);
    const n2 = parseInt(row2!.number.match(/(\d+)$/)![1], 10);
    expect(n2).toBe(n1 + 1);
  });
});

describe("invoice-from-project (server-authoritative money)", () => {
  it("snapshots lines from the AUTHORITATIVE project items and ignores tampered payload money", async () => {
    const { projectId, unitPrice } = await acceptedProjectWithItem();
    // Hostile payload: extra lines + fake total + fake price. None are in the
    // from-project schema, so they are stripped; the server uses DB items.
    const payload = {
      projectId,
      ...DATES,
      lines: [{ description: "HACKED", qty: 999, unitPrice: 0.01 }],
      total: 0.01,
      vatRate: 0,
    };
    const r = await createInvoiceFromProjectAction(payload, H(ownerCookie));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lines = await invoiceLinesOf(r.data.id);
    expect(lines).toHaveLength(1);
    expect(lines[0].description).not.toBe("HACKED");
    expect(lines[0].qty).toBe(3); // authoritative item qty
    expect(Number(lines[0].unit_price)).toBe(unitPrice); // authoritative item price
    const row = await invoiceRow(r.data.id);
    expect(Number(row!.vat_rate)).toBe(0.18); // project's rate, not the tampered 0
    expect(row!.project_id).toBe(projectId);
    // Derived total matches selectors over the snapshot.
    const net = invoiceNet({ lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: Number(l.unit_price) })) });
    expect(net).toBeCloseTo(3 * unitPrice, 2);
  });

  it("freezes a client + reference snapshot on the invoice", async () => {
    const { projectId } = await acceptedProjectWithItem();
    const r = await createInvoiceFromProjectAction({ projectId, ...DATES }, H(ownerCookie));
    if (!r.ok) throw new Error("setup");
    const row = await invoiceRow(r.data.id);
    expect(row!.client_name).toBe("Client A");
    expect((row!.client_snapshot as { nui?: string }).nui).toBe("810123456");
    expect(row!.reference).toMatch(/^PRJ-\d{4}-\d{3}$/);
  });

  it("HISTORICAL STABILITY: repricing the source project does not rewrite the invoice", async () => {
    const { projectId, unitPrice } = await acceptedProjectWithItem();
    const inv = await createInvoiceFromProjectAction({ projectId, ...DATES }, H(ownerCookie));
    if (!inv.ok) throw new Error("setup");
    const before = await invoiceLinesOf(inv.data.id);

    // Reopen + edit the source item (Phase 6 edit=reprice). This changes the
    // project's live item, and must NOT touch the historical invoice.
    await setProjectStatusAction({ id: projectId, status: "Dërguar" }, H(ownerCookie));
    // Find the item id.
    const items = await ownerPool.query(`select id from project_items where project_id=$1`, [projectId]);
    const itemId = items.rows[0].id as string;
    const edit = await updateProjectItemAction(
      { projectId, itemId, config: { ...cfg, widthMm: 1500, heightMm: 1800 }, qty: 9 },
      H(ownerCookie),
    );
    expect(edit.ok).toBe(true);
    if (edit.ok) expect(edit.data.unitPrice).not.toBe(unitPrice); // project item changed

    const after = await invoiceLinesOf(inv.data.id);
    expect(after).toEqual(before); // invoice lines are frozen
    expect(after[0].qty).toBe(3);
    expect(Number(after[0].unit_price)).toBe(unitPrice);
  });

  it("rejects invoicing a project with no items", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Empty", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const r = await createInvoiceFromProjectAction({ projectId: c.data.id, ...DATES }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("RULE_VIOLATION");
  });
});

describe("manual invoice (validated user money)", () => {
  it("honours user line prices and recomputes totals server-side", async () => {
    const r = await createManualInvoiceAction(
      {
        clientId: clientA,
        ...DATES,
        vatRate: 0.18,
        reference: "Manual-REF",
        lines: [
          { description: "Montim", qty: 2, unitPrice: 100 },
          { description: "Transport", qty: 1, unitPrice: 50 },
        ],
      },
      H(ownerCookie),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lines = await invoiceLinesOf(r.data.id);
    const net = invoiceNet({ lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: Number(l.unit_price) })) });
    const total = invoiceTotal({ lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: Number(l.unit_price) })), vatRate: 0.18 });
    expect(net).toBe(250);
    expect(total).toBeCloseTo(295, 2);
  });

  it("rejects a negative line price and a bad date range at validation", async () => {
    const neg = await createManualInvoiceAction(
      { clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "Neg", qty: 1, unitPrice: -5 }] },
      H(ownerCookie),
    );
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.error.code).toBe("VALIDATION");
    const badDates = await createManualInvoiceAction(
      { clientId: clientA, issuedAt: "2026-06-15", dueAt: "2026-06-01", vatRate: 0.18, lines: [{ description: "X", qty: 1, unitPrice: 5 }] },
      H(ownerCookie),
    );
    expect(badDates.ok).toBe(false);
  });
});

describe("status / cancel rules", () => {
  it("'Paguar' cannot be set by hand (payment-derived)", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "S", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const r = await setInvoiceStatusAction({ id: c.data.id, status: "Paguar" as never }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
  it("'Vonesë' cannot be set by hand (overdue is derived)", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "V", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const r = await setInvoiceStatusAction({ id: c.data.id, status: "Vonesë" as never }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
  it("accounting can cancel; a normal status change works", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "S", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const upd = await setInvoiceStatusAction({ id: c.data.id, status: "Dërguar" }, H(accountingCookie));
    expect(upd.ok).toBe(true);
    const cancel = await setInvoiceStatusAction({ id: c.data.id, status: "Anuluar" }, H(accountingCookie));
    expect(cancel.ok).toBe(true);
  });
});

describe("same-org sharing + cross-org isolation", () => {
  it("an invoice one member creates is visible to another same-org member (RLS)", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "Shared", qty: 1, unitPrice: 5 }] }, H(user2Cookie));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(await invoicesVisibleTo(orgA)).toContain(c.data.id);
  });

  it("org B cannot see / status / delete an org A invoice, nor invoice A's project", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "A-priv", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const id = c.data.id;
    expect(await invoicesVisibleTo(orgB)).not.toContain(id);

    const upd = await setInvoiceStatusAction({ id, status: "Anuluar" }, H(ownerBCookie));
    expect(upd.ok).toBe(false);
    if (!upd.ok) expect(upd.error.code).toBe("NOT_FOUND");

    const del = await deleteInvoiceAction({ id }, H(ownerBCookie));
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.error.code).toBe("NOT_FOUND");

    // org B invoicing org A's project -> NOT_FOUND (RLS hides it).
    const { projectId } = await acceptedProjectWithItem();
    const cross = await createInvoiceFromProjectAction({ projectId, ...DATES }, H(ownerBCookie));
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("NOT_FOUND");
  });

  it("a manual invoice cannot be created against another org's client", async () => {
    const r = await createManualInvoiceAction({ clientId: clientB, ...DATES, vatRate: 0.18, lines: [{ description: "X", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
});

describe("delete", () => {
  it("deleting an invoice removes it and cascades its lines", async () => {
    const c = await createManualInvoiceAction({ clientId: clientA, ...DATES, vatRate: 0.18, lines: [{ description: "Del", qty: 1, unitPrice: 5 }] }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const del = await deleteInvoiceAction({ id: c.data.id }, H(ownerCookie));
    expect(del.ok).toBe(true);
    expect(await invoiceRow(c.data.id)).toBeUndefined();
    expect(await invoiceLinesOf(c.data.id)).toHaveLength(0);
  });
});
