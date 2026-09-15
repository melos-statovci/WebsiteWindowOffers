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
import { randomUUID } from "node:crypto";
import pg from "pg";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, pool as appPool } from "@/db/client";
import { paymentOperations } from "@/db/schema/business";
import { runWithOrg } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createManualInvoiceAction } from "@/server/actions/invoice";
import {
  recordInvoicePaymentAction,
  recordInvoicePaymentInTx,
  markInvoicePaidAction,
  recordAdvancePaymentAction,
  recordAdvancePaymentInTx,
  deletePaymentAction,
} from "@/server/actions/payment";
import { invoiceOutstanding, clientStats } from "@/domain/finance/selectors";
import type { Invoice, Payment, InvoiceStatus } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p7c-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });
const K = () => ({ operationKey: randomUUID() });

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
let orgB = "";
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
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerBCookie), "P7C B", `p7c-b-${suffix}`);
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
    const denied = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 10, ...D }, H(salesCookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
    const ok = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 10, ...D }, H(accountingCookie));
    expect(ok.ok).toBe(true);
  });
});

describe("partial payment + settlement", () => {
  it("100: pay 40 -> outstanding 60; pay 60 -> 0 (Paguar); another -> rejected", async () => {
    const inv = await makeInvoice(100);
    const p1 = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 40, ...D }, H(ownerCookie));
    expect(p1.ok).toBe(true);
    if (p1.ok) expect(p1.data.paidInFull).toBe(false);
    expect(await outstandingOf(inv)).toBeCloseTo(60, 2);

    const p2 = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 60, ...D }, H(ownerCookie));
    expect(p2.ok).toBe(true);
    if (p2.ok) expect(p2.data.paidInFull).toBe(true);
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
    expect(await invoiceStatusOf(inv)).toBe("Paguar");

    const p3 = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 10, ...D }, H(ownerCookie));
    expect(p3.ok).toBe(false);
    if (!p3.ok) expect(p3.error.code).toBe("RULE_VIOLATION");
  });

  it("recording a payment on a Draft issues it (Dërguar)", async () => {
    const r = await createManualInvoiceAction(
      { clientId: clientA, issuedAt: "2026-06-01", dueAt: "2026-06-15", status: "Draft", vatRate: 0, lines: [{ description: "D", qty: 1, unitPrice: 100 }] },
      H(ownerCookie),
    );
    if (!r.ok) throw new Error("setup");
    await recordInvoicePaymentAction({ ...K(), invoiceId: r.data.id, amount: 10, ...D }, H(ownerCookie));
    expect(await invoiceStatusOf(r.data.id)).toBe("Dërguar");
  });
});

describe("overpayment -> client credit", () => {
  it("rejects overpayment by default; allowCredit records excess as credit exactly once", async () => {
    // Dedicated client so client-level credit/debt math is not polluted by the
    // other tests' invoices on the shared clientA.
    const creditClient = await createClient(orgA, "Credit Client");
    const inv = await makeInvoice(100, ownerCookie, creditClient);
    const rejected = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 150, ...D }, H(ownerCookie));
    expect(rejected.ok).toBe(false);

    const ok = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 150, ...D, allowCredit: true }, H(ownerCookie));
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
    const r = await recordAdvancePaymentAction({ ...K(), clientId: clientA, amount: 200, ...D }, H(ownerCookie));
    expect(r.ok).toBe(true);
    const after = await loadClientFinance(clientA);
    const s1 = clientStats(clientA, [], after.invoices, after.payments);
    expect(s1.advancePaid - s0.advancePaid).toBeCloseTo(200, 2);

    const cross = await recordAdvancePaymentAction({ ...K(), clientId: clientB, amount: 50, ...D }, H(ownerCookie));
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("VALIDATION");
  });
});

describe("delete payment", () => {
  it("restores outstanding and reverts a stale Paguar to Dërguar", async () => {
    const inv = await makeInvoice(100);
    const rec = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 100, ...D }, H(ownerCookie));
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
    const neg = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: -5, ...D }, H(ownerCookie));
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.error.code).toBe("VALIDATION");
    const zero = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 0, ...D }, H(ownerCookie));
    expect(zero.ok).toBe(false);
    // org B tries to pay org A's invoice -> RLS hides it -> NOT_FOUND
    const cross = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 10, ...D }, H(ownerBCookie));
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("NOT_FOUND");
  });
});

describe("same-org sharing", () => {
  it("a payment one member records is visible to the org's finance state", async () => {
    const inv = await makeInvoice(80);
    const r = await recordInvoicePaymentAction({ ...K(), invoiceId: inv, amount: 80, ...D }, H(user2Cookie));
    expect(r.ok).toBe(true);
    expect(await invoiceStatusOf(inv)).toBe("Paguar");
    expect(await outstandingOf(inv)).toBeCloseTo(0, 2);
  });
});

describe("RC-12 invoice payment operation identity", () => {
  it("replays the same key and payload sequentially without a second payment", async () => {
    const inv = await makeInvoice(100);
    const operationKey = randomUUID();
    const input = { operationKey, invoiceId: inv, amount: 40, ...D };

    const first = await recordInvoicePaymentAction(input, H(ownerCookie));
    const retry = await recordInvoicePaymentAction(input, H(ownerCookie));

    expect(first.ok && retry.ok).toBe(true);
    if (first.ok && retry.ok) {
      expect(first.data.replayed).toBe(false);
      expect(retry.data.replayed).toBe(true);
      expect(retry.data.id).toBe(first.data.id);
    }
    expect(await paymentCount(inv)).toBe(1);
    expect(await outstandingOf(inv)).toBeCloseTo(60, 2);
  });

  it("converges parallel same-key retries to one payment", async () => {
    const inv = await makeInvoice(100);
    const operationKey = randomUUID();
    const input = { operationKey, invoiceId: inv, amount: 40, ...D };

    const [a, b] = await Promise.all([
      recordInvoicePaymentAction(input, H(ownerCookie)),
      recordInvoicePaymentAction(input, H(ownerCookie)),
    ]);

    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(new Set([a.data.id, b.data.id]).size).toBe(1);
      expect([a.data.replayed, b.data.replayed].sort()).toEqual([false, true]);
    }
    expect(await paymentCount(inv)).toBe(1);
    expect(await outstandingOf(inv)).toBeCloseTo(60, 2);
  });

  it("rejects same-key changes to amount, date, method, and command type", async () => {
    const inv = await makeInvoice(200);
    const operationKey = randomUUID();
    const original = { operationKey, invoiceId: inv, amount: 40, ...D };
    expect((await recordInvoicePaymentAction(original, H(ownerCookie))).ok).toBe(true);

    for (const changed of [
      { ...original, amount: 50 },
      { ...original, date: "2026-06-11" },
      { ...original, method: "Kartelë" },
    ]) {
      const result = await recordInvoicePaymentAction(changed, H(ownerCookie));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CONFLICT");
    }

    const crossCommand = await recordAdvancePaymentAction(
      { operationKey, clientId: clientA, amount: 40, ...D },
      H(ownerCookie),
    );
    expect(crossCommand.ok).toBe(false);
    if (!crossCommand.ok) expect(crossCommand.error.code).toBe("CONFLICT");
    expect(await paymentCount(inv)).toBe(1);
  });

  it("accepts two equal payments when their operation keys differ", async () => {
    const inv = await makeInvoice(100);
    const input = { invoiceId: inv, amount: 40, ...D };
    const a = await recordInvoicePaymentAction({ operationKey: randomUUID(), ...input }, H(ownerCookie));
    const b = await recordInvoicePaymentAction({ operationKey: randomUUID(), ...input }, H(ownerCookie));
    expect(a.ok && b.ok).toBe(true);
    expect(await paymentCount(inv)).toBe(2);
    expect(await outstandingOf(inv)).toBeCloseTo(20, 2);
  });

  it("allows the same operation UUID independently in two tenants", async () => {
    const operationKey = randomUUID();
    const invA = await makeInvoice(50);
    const invB = await makeInvoice(50, ownerBCookie, clientB);
    const [a, b] = await Promise.all([
      recordInvoicePaymentAction({ operationKey, invoiceId: invA, amount: 20, ...D }, H(ownerCookie)),
      recordInvoicePaymentAction({ operationKey, invoiceId: invB, amount: 20, ...D }, H(ownerBCookie)),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(await paymentCount(invA)).toBe(1);
    expect(await paymentCount(invB)).toBe(1);
  });

  it("returns a tombstoned success after deletion and never recreates the payment", async () => {
    const inv = await makeInvoice(100);
    const operationKey = randomUUID();
    const input = { operationKey, invoiceId: inv, amount: 40, ...D };
    const first = await recordInvoicePaymentAction(input, H(ownerCookie));
    if (!first.ok) throw new Error("setup payment");
    expect((await deletePaymentAction({ id: first.data.id }, H(ownerCookie))).ok).toBe(true);

    const retry = await recordInvoicePaymentAction(input, H(ownerCookie));
    expect(retry.ok).toBe(true);
    if (retry.ok) {
      expect(retry.data.outcome).toBe("PAYMENT_REMOVED");
      expect(retry.data.paymentExists).toBe(false);
      expect(retry.data.replayed).toBe(true);
    }
    expect(await paymentCount(inv)).toBe(0);
    expect(await outstandingOf(inv)).toBeCloseTo(100, 2);
    expect(
      Number((await ownerPool.query(
        `select count(*) c from payment_operations where organization_id=$1 and operation_key=$2`,
        [orgA, operationKey],
      )).rows[0].c),
    ).toBe(1);
  });

  it("rolls back both payment and receipt when the surrounding transaction fails", async () => {
    const inv = await makeInvoice(100);
    const operationKey = randomUUID();
    await expect(
      runWithOrg(db, orgA, async (tx) => {
        await recordInvoicePaymentInTx(tx, orgA, { operationKey, invoiceId: inv, amount: 40, ...D });
        throw new Error("forced rollback after operation");
      }),
    ).rejects.toThrow("forced rollback after operation");

    expect(await paymentCount(inv)).toBe(0);
    expect(
      Number((await ownerPool.query(
        `select count(*) c from payment_operations where organization_id=$1 and operation_key=$2`,
        [orgA, operationKey],
      )).rows[0].c),
    ).toBe(0);
  });

  it("preserves insufficient-outstanding rules and stores no failed receipt", async () => {
    const inv = await makeInvoice(30);
    const operationKey = randomUUID();
    const result = await recordInvoicePaymentAction(
      { operationKey, invoiceId: inv, amount: 40, ...D },
      H(ownerCookie),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("RULE_VIOLATION");
    expect(await paymentCount(inv)).toBe(0);
    expect(
      Number((await ownerPool.query(
        `select count(*) c from payment_operations where organization_id=$1 and operation_key=$2`,
        [orgA, operationKey],
      )).rows[0].c),
    ).toBe(0);
  });
});

describe("RC-12 advance payment operation identity", () => {
  it("deduplicates sequential and parallel retries", async () => {
    const sequentialClient = await createClient(orgA, "Advance sequential");
    const sequentialKey = randomUUID();
    const sequentialInput = { operationKey: sequentialKey, clientId: sequentialClient, amount: 40, ...D };
    const first = await recordAdvancePaymentAction(sequentialInput, H(ownerCookie));
    const retry = await recordAdvancePaymentAction(sequentialInput, H(ownerCookie));
    expect(first.ok && retry.ok).toBe(true);
    if (first.ok && retry.ok) expect(retry.data.id).toBe(first.data.id);
    expect(Number((await ownerPool.query(`select count(*) c from payments where client_id=$1`, [sequentialClient])).rows[0].c)).toBe(1);

    const parallelClient = await createClient(orgA, "Advance parallel");
    const parallelKey = randomUUID();
    const parallelInput = { operationKey: parallelKey, clientId: parallelClient, amount: 40, ...D };
    const [a, b] = await Promise.all([
      recordAdvancePaymentAction(parallelInput, H(ownerCookie)),
      recordAdvancePaymentAction(parallelInput, H(ownerCookie)),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.data.id).toBe(b.data.id);
    expect(Number((await ownerPool.query(`select count(*) c from payments where client_id=$1`, [parallelClient])).rows[0].c)).toBe(1);
  });

  it("conflicts on changed business fields but accepts equal details under different keys", async () => {
    const client = await createClient(orgA, "Advance conflict");
    const operationKey = randomUUID();
    const original = { operationKey, clientId: client, amount: 40, ...D };
    expect((await recordAdvancePaymentAction(original, H(ownerCookie))).ok).toBe(true);
    for (const changed of [
      { ...original, amount: 50 },
      { ...original, date: "2026-06-11" },
      { ...original, method: "Kartelë" },
    ]) {
      const result = await recordAdvancePaymentAction(changed, H(ownerCookie));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CONFLICT");
    }
    expect((await recordAdvancePaymentAction({ ...original, operationKey: randomUUID() }, H(ownerCookie))).ok).toBe(true);
    expect(Number((await ownerPool.query(`select count(*) c from payments where client_id=$1`, [client])).rows[0].c)).toBe(2);
  });

  it("scopes an equal UUID independently by tenant", async () => {
    const clientA2 = await createClient(orgA, "Advance tenant A");
    const clientB2 = await createClient(orgB, "Advance tenant B");
    const operationKey = randomUUID();
    const [a, b] = await Promise.all([
      recordAdvancePaymentAction({ operationKey, clientId: clientA2, amount: 25, ...D }, H(ownerCookie)),
      recordAdvancePaymentAction({ operationKey, clientId: clientB2, amount: 25, ...D }, H(ownerBCookie)),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(Number((await ownerPool.query(`select count(*) c from payment_operations where operation_key=$1`, [operationKey])).rows[0].c)).toBe(2);
  });

  it("does not resurrect a deleted advance payment", async () => {
    const client = await createClient(orgA, "Advance deleted");
    const operationKey = randomUUID();
    const input = { operationKey, clientId: client, amount: 30, ...D };
    const first = await recordAdvancePaymentAction(input, H(ownerCookie));
    if (!first.ok) throw new Error("setup advance");
    expect((await deletePaymentAction({ id: first.data.id }, H(ownerCookie))).ok).toBe(true);
    const retry = await recordAdvancePaymentAction(input, H(ownerCookie));
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.data.outcome).toBe("PAYMENT_REMOVED");
    expect(Number((await ownerPool.query(`select count(*) c from payments where client_id=$1`, [client])).rows[0].c)).toBe(0);
  });

  it("rolls back payment and receipt together", async () => {
    const client = await createClient(orgA, "Advance rollback");
    const operationKey = randomUUID();
    await expect(
      runWithOrg(db, orgA, async (tx) => {
        await recordAdvancePaymentInTx(tx, orgA, { operationKey, clientId: client, amount: 30, ...D });
        throw new Error("forced advance rollback");
      }),
    ).rejects.toThrow("forced advance rollback");
    expect(Number((await ownerPool.query(`select count(*) c from payments where client_id=$1`, [client])).rows[0].c)).toBe(0);
    expect(Number((await ownerPool.query(`select count(*) c from payment_operations where operation_key=$1`, [operationKey])).rows[0].c)).toBe(0);
  });
});

describe("RC-12 payment_operations RLS and grants", () => {
  it("is FORCE RLS tenant data with SELECT/INSERT-only runtime grants", async () => {
    const table = (await ownerPool.query(
      `select relrowsecurity, relforcerowsecurity from pg_class where oid='payment_operations'::regclass`,
    )).rows[0];
    expect(table.relrowsecurity).toBe(true);
    expect(table.relforcerowsecurity).toBe(true);

    const role = (await appPool.query(
      `select current_user, (select rolbypassrls from pg_roles where rolname=current_user) bypass,
              has_table_privilege(current_user,'payment_operations','SELECT') can_select,
              has_table_privilege(current_user,'payment_operations','INSERT') can_insert,
              has_table_privilege(current_user,'payment_operations','UPDATE') can_update,
              has_table_privilege(current_user,'payment_operations','DELETE') can_delete`,
    )).rows[0];
    expect(role.current_user).toBe("kornizo_app");
    expect(role.bypass).toBe(false);
    expect(role.can_select).toBe(true);
    expect(role.can_insert).toBe(true);
    expect(role.can_update).toBe(false);
    expect(role.can_delete).toBe(false);
  });

  it("hides other tenants, rejects cross-tenant inserts, and fails closed without context", async () => {
    const key = randomUUID();
    const client = await createClient(orgB, "RLS receipt B");
    expect((await recordAdvancePaymentAction({ operationKey: key, clientId: client, amount: 10, ...D }, H(ownerBCookie))).ok).toBe(true);

    const seenByA = await runWithOrg(db, orgA, (tx) =>
      tx.select({ id: paymentOperations.id }).from(paymentOperations).where(eq(paymentOperations.operationKey, key)),
    );
    expect(seenByA).toHaveLength(0);
    await expect(
      runWithOrg(db, orgA, (tx) => tx.insert(paymentOperations).values({
        organizationId: orgB,
        operationKey: randomUUID(),
        operationType: "ADVANCE_PAYMENT",
        requestHash: "a".repeat(64),
        paymentId: randomUUID(),
      })),
    ).rejects.toThrow();

    expect((await appPool.query(`select id from payment_operations`)).rows).toHaveLength(0);
    await expect(
      appPool.query(
        `insert into payment_operations(organization_id,operation_key,operation_type,request_hash,payment_id)
         values($1,$2,'ADVANCE_PAYMENT',$3,$4)`,
        [orgA, randomUUID(), "b".repeat(64), randomUUID()],
      ),
    ).rejects.toThrow();
  });
});
