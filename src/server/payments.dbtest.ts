// Phase 7 Checkpoint C — payment action-layer integration tests. Runs against the
// Neon dev DB as the restricted role kornizo_app via the real action cores. Covers
// the HARD Phase 7 money proofs:
//   - canonical permissions (sales/operator cannot record; accounting can)
//   - PARTIAL: total 100, pay 40 -> outstanding 60; pay 60 -> 0; another -> no-op
//   - OVERPAYMENT: rejected by default; allowCredit -> excess becomes client credit
//     exactly once (and a fresh invoice then draws on that credit for debt)
//   - MARK-PAID idempotency: repeated calls create at most one settling payment
//   - MARK-PAID CONCURRENCY: two simultaneous calls -> exactly one full payment
//   - advance/unlinked payment -> client credit; cross-org client rejected
//   - delete payment restores outstanding and reverts a stale "Paguar"
//   - negative/zero rejected; cross-tenant invoice payment rejected
//   - same-org sharing (RLS)
//
// Decimal-safe money via the domain selectors (invoiceOutstanding/clientStats).
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createManualInvoiceAction } from "@/server/actions/invoice";
import {
  recordInvoicePaymentAction,
  markInvoicePaidAction,
  recordAdvancePaymentAction,
  deletePaymentAction,
} from "@/server/actions/payment";
import { invoiceOutstanding, clientStats } from "@/domain/finance/selectors";
import type { Invoice, Payment, InvoiceStatus } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p7c-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P7C ${who}` },
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
    `insert into clients(organization_id, name, type) values($1,$2,'Privat') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}

/** Read one invoice (+ lines) from the owner pool as a domain Invoice. */
async function loadInvoice(id: string): Promise<Invoice> {
  const inv = (await ownerPool.query(
    `select id, number, client_id, client_name, project_id, reference, issued_at::text, due_at::text, status, vat_rate from invoices where id=$1`,
    [id],
  )).rows[0];
  const lines = (await ownerPool.query(
    `select description, qty, unit_price from invoice_lines where invoice_id=$1 order by sort_order`,
    [id],
  )).rows;
  return {
    id: inv.id,
    number: inv.number,
    clientId: inv.client_id,
    clientName: inv.client_name,
    projectId: inv.project_id ?? undefined,
    reference: inv.reference ?? undefined,
    issuedAt: inv.issued_at,
    dueAt: inv.due_at,
    status: inv.status as InvoiceStatus,
    vatRate: Number(inv.vat_rate),
    lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: Number(l.unit_price) })),
  };
}
async function loadClientFinance(clientId: string): Promise<{ invoices: Invoice[]; payments: Payment[] }> {
  const invIds = (await ownerPool.query(`select id from invoices where client_id=$1`, [clientId])).rows.map((r) => r.id);
  const invoices = await Promise.all(invIds.map((id: string) => loadInvoice(id)));
  const payments = (await ownerPool.query(
    `select id, client_id, invoice_id, amount, date::text, method, note from payments where client_id=$1`,
    [clientId],
  )).rows.map((p) => ({
    id: p.id,
    clientId: p.client_id,
    invoiceId: p.invoice_id ?? undefined,
    amount: Number(p.amount),
    date: p.date,
    method: p.method,
    note: p.note ?? undefined,
  }));
  return { invoices, payments };
}
async function outstandingOf(id: string): Promise<number> {
  const inv = await loadInvoice(id);
  const { payments } = await loadClientFinance(inv.clientId);
  return invoiceOutstanding(inv, payments);
}
async function paymentCount(invoiceId: string): Promise<number> {
  return Number((await ownerPool.query(`select count(*) c from payments where invoice_id=$1`, [invoiceId])).rows[0].c);
}
async function invoiceStatusOf(id: string): Promise<string> {
  return (await ownerPool.query(`select status from invoices where id=$1`, [id])).rows[0].status;
}

let ownerCookie = "";
let salesCookie = "";
let accountingCookie = "";
let user2Cookie = "";
let ownerBCookie = "";
let orgA = "";
let clientA = "";
let clientB = "";

/** Create a receivable manual invoice (vatRate 0 for round totals). */
async function makeInvoice(total: number, cookie = ownerCookie, client = clientA): Promise<string> {
  const r = await createManualInvoiceAction(
    {
      clientId: client,
      issuedAt: "2026-06-01",
      dueAt: "2026-06-15",
      status: "Dërguar",
      vatRate: 0,
      lines: [{ description: "Line", qty: 1, unitPrice: total }],
    },
    H(cookie),
  );
  if (!r.ok) throw new Error("setup: invoice");
  return r.data.id;
}

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "P7C A", `p7c-a-${suffix}`);

  const ownerB = await signUp("ownerb");
  ownerBCookie = ownerB.cookie;
  const orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerBCookie), "P7C B", `p7c-b-${suffix}`);
  clientB = await createClient(orgB, "Client B");

  const sales = await signUp("sales");
  salesCookie = sales.cookie;
  await addMember(orgA, sales.userId, "sales");
  const acct = await signUp("acct");
  accountingCookie = acct.cookie;
  await addMember(orgA, acct.userId, "accounting");
  const user2 = await signUp("user2");
  user2Cookie = user2.cookie;
  await addMember(orgA, user2.userId, "accounting");

  clientA = await createClient(orgA, "Client A");
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await ownerPool.end();
});

const D = { date: "2026-06-10", method: "Transfertë bankare" };

describe("payment permissions", () => {
  it("sales cannot record a payment; accounting can", async () => {
    const inv = await makeInvoice(100);
    const denied = await recordInvoicePaymentAction({ invoiceId: inv, amount: 10, ...D }, H(salesCookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
    const ok = await recordInvoicePaymentAction({ invoiceId: inv, amount: 10, ...D }, H(accountingCookie));
    expect(ok.ok).toBe(true);
  });
});

describe("partial payment + settlement", () => {
  it("100: pay 40 -> outstanding 60; pay 60 -> 0 (Paguar); another -> rejected", async () => {
    const inv = await makeInvoice(100);
    const p1 = await recordInvoicePaymentAction({ invoiceId: inv, amount: 40, ...D }, H(ownerCookie));
    expect(p1.ok).toBe(true);
    if (p1.ok) expect(p1.data.paidInFull).toBe(false);
    expect(await outstandingOf(inv)).toBeCloseTo(60, 2);

    const p2 = await recordInvoicePaymentAction({ invoiceId: inv, amount: 60, ...D }, H(ownerCookie));
    expect(p2.ok).toBe(true);
    if (p2.ok) expect(p2.data.paidInFull).toBe(true);
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
    expect(await invoiceStatusOf(inv)).toBe("Paguar");

    const p3 = await recordInvoicePaymentAction({ invoiceId: inv, amount: 10, ...D }, H(ownerCookie));
    expect(p3.ok).toBe(false);
    if (!p3.ok) expect(p3.error.code).toBe("RULE_VIOLATION");
  });

  it("recording a payment on a Draft issues it (Dërguar)", async () => {
    const r = await createManualInvoiceAction(
      { clientId: clientA, issuedAt: "2026-06-01", dueAt: "2026-06-15", status: "Draft", vatRate: 0, lines: [{ description: "D", qty: 1, unitPrice: 100 }] },
      H(ownerCookie),
    );
    if (!r.ok) throw new Error("setup");
    await recordInvoicePaymentAction({ invoiceId: r.data.id, amount: 10, ...D }, H(ownerCookie));
    expect(await invoiceStatusOf(r.data.id)).toBe("Dërguar");
  });
});

describe("overpayment -> client credit", () => {
  it("rejects overpayment by default; allowCredit records excess as credit exactly once", async () => {
    // Dedicated client so client-level credit/debt math is not polluted by the
    // other tests' invoices on the shared clientA.
    const creditClient = await createClient(orgA, "Credit Client");
    const inv = await makeInvoice(100, ownerCookie, creditClient);
    const rejected = await recordInvoicePaymentAction({ invoiceId: inv, amount: 150, ...D }, H(ownerCookie));
    expect(rejected.ok).toBe(false);

    const ok = await recordInvoicePaymentAction({ invoiceId: inv, amount: 150, ...D, allowCredit: true }, H(ownerCookie));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.credit).toBeCloseTo(50, 2);
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
    expect(await paymentCount(inv)).toBe(1); // excess is NOT a second payment

    // The 50 excess is available client credit exactly once.
    const fin1 = await loadClientFinance(creditClient);
    const s1 = clientStats(creditClient, [], fin1.invoices, fin1.payments);
    expect(s1.availableCredit).toBeCloseTo(50, 2);

    // A NEW 100 invoice: credit offsets debt (debt = max(0, 100 - 50) = 50).
    await makeInvoice(100, ownerCookie, creditClient);
    const fin2 = await loadClientFinance(creditClient);
    const s2 = clientStats(creditClient, [], fin2.invoices, fin2.payments);
    expect(s2.debt).toBeCloseTo(50, 2);
  });
});

describe("mark-paid idempotency + concurrency", () => {
  it("mark-paid settles the remaining once; a second call is a no-op", async () => {
    const inv = await makeInvoice(100);
    const first = await markInvoicePaidAction({ invoiceId: inv }, H(ownerCookie));
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.data.created).toBe(true);
    const second = await markInvoicePaidAction({ invoiceId: inv }, H(ownerCookie));
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.data.created).toBe(false);
    expect(await paymentCount(inv)).toBe(1);
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
  });

  it("two SIMULTANEOUS mark-paid calls create exactly one full payment", async () => {
    const inv = await makeInvoice(250);
    const [a, b] = await Promise.all([
      markInvoicePaidAction({ invoiceId: inv }, H(ownerCookie)),
      markInvoicePaidAction({ invoiceId: inv }, H(ownerCookie)),
    ]);
    expect(a.ok && b.ok).toBe(true);
    // exactly one created a payment
    const created = [a, b].filter((r) => r.ok && r.data.created).length;
    expect(created).toBe(1);
    expect(await paymentCount(inv)).toBe(1);
    const paid = Number((await ownerPool.query(`select coalesce(sum(amount),0) s from payments where invoice_id=$1`, [inv])).rows[0].s);
    expect(paid).toBeCloseTo(250, 2); // not 500
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
  });
});

describe("advance / unlinked payment", () => {
  it("records an unlinked advance as client credit; cross-org client rejected", async () => {
    const before = await loadClientFinance(clientA);
    const s0 = clientStats(clientA, [], before.invoices, before.payments);
    const r = await recordAdvancePaymentAction({ clientId: clientA, amount: 200, ...D }, H(ownerCookie));
    expect(r.ok).toBe(true);
    const after = await loadClientFinance(clientA);
    const s1 = clientStats(clientA, [], after.invoices, after.payments);
    expect(s1.advancePaid - s0.advancePaid).toBeCloseTo(200, 2);

    const cross = await recordAdvancePaymentAction({ clientId: clientB, amount: 50, ...D }, H(ownerCookie));
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("VALIDATION");
  });
});

describe("delete payment", () => {
  it("restores outstanding and reverts a stale Paguar to Dërguar", async () => {
    const inv = await makeInvoice(100);
    const rec = await recordInvoicePaymentAction({ invoiceId: inv, amount: 100, ...D }, H(ownerCookie));
    if (!rec.ok) throw new Error("setup");
    expect(await invoiceStatusOf(inv)).toBe("Paguar");
    const payId = (await ownerPool.query(`select id from payments where invoice_id=$1`, [inv])).rows[0].id;

    const del = await deletePaymentAction({ id: payId }, H(ownerCookie));
    expect(del.ok).toBe(true);
    expect(await outstandingOf(inv)).toBeCloseTo(100, 2);
    expect(await invoiceStatusOf(inv)).toBe("Dërguar");
  });
});

describe("validation + tenancy", () => {
  it("negative/zero amount rejected; payment on another tenant's invoice rejected", async () => {
    const inv = await makeInvoice(100);
    const neg = await recordInvoicePaymentAction({ invoiceId: inv, amount: -5, ...D }, H(ownerCookie));
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.error.code).toBe("VALIDATION");
    const zero = await recordInvoicePaymentAction({ invoiceId: inv, amount: 0, ...D }, H(ownerCookie));
    expect(zero.ok).toBe(false);
    // org B tries to pay org A's invoice -> RLS hides it -> NOT_FOUND
    const cross = await recordInvoicePaymentAction({ invoiceId: inv, amount: 10, ...D }, H(ownerBCookie));
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("NOT_FOUND");
  });
});

describe("same-org sharing", () => {
  it("a payment one member records is visible to the org's finance state", async () => {
    const inv = await makeInvoice(80);
    const r = await recordInvoicePaymentAction({ invoiceId: inv, amount: 80, ...D }, H(user2Cookie));
    expect(r.ok).toBe(true);
    expect(await invoiceStatusOf(inv)).toBe("Paguar");
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
  });
});
