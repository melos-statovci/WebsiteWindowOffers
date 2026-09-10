// Phase 7 Closeout — historical ISSUER snapshot + invoice deletion lifecycle.
// Runs against the Neon dev DB as the restricted role via the real action cores.
//
//   - Company/issuer identity is FROZEN on the invoice at creation from the
//     authoritative org sources; later organization_profiles changes do NOT
//     rewrite a historical invoice.
//   - Invoice deletion is limited to Draft/Cancelled invoices with NO payments;
//     issued invoices must be cancelled, and an invoice with payments can never be
//     hard-deleted (so its payments can never be silently turned into credit).
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createProjectAction, setProjectStatusAction, addProjectItemAction } from "@/server/actions/project";
import { createInvoiceFromProjectAction, createManualInvoiceAction, setInvoiceStatusAction, deleteInvoiceAction } from "@/server/actions/invoice";
import { recordInvoicePaymentAction } from "@/server/actions/payment";
import type { WindowConfig } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p7co-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name: `P7CO ${who}` }, asResponse: true });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function createClient(orgId: string): Promise<string> {
  const r = await ownerPool.query(`insert into clients(organization_id, name, type) values($1,'Client A','Privat') returning id`, [orgId]);
  return r.rows[0].id as string;
}
async function setProfile(orgId: string, v: { nui: string; address: string; bank: string; iban: string }) {
  await ownerPool.query(
    `insert into organization_profiles(organization_id, nui, address, bank, iban)
     values($1,$2,$3,$4,$5)
     on conflict (organization_id) do update set nui=excluded.nui, address=excluded.address, bank=excluded.bank, iban=excluded.iban`,
    [orgId, v.nui, v.address, v.bank, v.iban],
  );
}
async function companySnapshotOf(invoiceId: string) {
  const r = await ownerPool.query(`select company_snapshot from invoices where id=$1`, [invoiceId]);
  return r.rows[0]?.company_snapshot as Record<string, string> | undefined;
}
async function invoiceExists(invoiceId: string): Promise<boolean> {
  return (await ownerPool.query(`select 1 from invoices where id=$1`, [invoiceId])).rows.length > 0;
}
async function paymentLinkedInvoice(paymentId: string): Promise<string | null> {
  const r = await ownerPool.query(`select invoice_id from payments where id=$1`, [paymentId]);
  return r.rows[0] ? (r.rows[0].invoice_id as string | null) : null;
}

const cfg: WindowConfig = {
  productType: "Dritare", modelType: "njeshe", widthMm: 1000, heightMm: 1200,
  systemId: "s1", color: "white", mechanismId: "Roto NX", glassId: "g1", roleta: false, shtesa: [], openings: {},
};
const DATES = { issuedAt: "2026-06-01", dueAt: "2026-06-15" };

let ownerCookie = "";
let orgA = "";
let orgName = "";
let clientA = "";

async function acceptedProject(): Promise<string> {
  const c = await createProjectAction({ clientId: clientA, title: "Src", vatRate: 0.18 }, H(ownerCookie));
  if (!c.ok) throw new Error("setup project");
  const a = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 1 }, H(ownerCookie));
  if (!a.ok) throw new Error("setup item");
  await setProjectStatusAction({ id: c.data.id, status: "Pranuar" }, H(ownerCookie));
  return c.data.id;
}
async function manualInvoice(status: "Draft" | "Dërguar"): Promise<string> {
  const r = await createManualInvoiceAction(
    { clientId: clientA, ...DATES, status, vatRate: 0, lines: [{ description: "L", qty: 1, unitPrice: 100 }] },
    H(ownerCookie),
  );
  if (!r.ok) throw new Error("setup invoice");
  return r.data.id;
}

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgName = `P7CO Org ${suffix}`;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), orgName, `p7co-${suffix}`);
  clientA = await createClient(orgA);
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await ownerPool.end();
});

describe("historical issuer (company) snapshot", () => {
  it("freezes the issuer identity at creation and survives later org-profile changes", async () => {
    await setProfile(orgA, { nui: "NUI-A", address: "Address A", bank: "Bank A", iban: "IBAN-A" });
    const projectId = await acceptedProject();
    const inv = await createInvoiceFromProjectAction({ projectId, ...DATES }, H(ownerCookie));
    expect(inv.ok).toBe(true);
    if (!inv.ok) return;

    const snap = await companySnapshotOf(inv.data.id);
    expect(snap?.name).toBe(orgName);
    expect(snap?.nui).toBe("NUI-A");
    expect(snap?.address).toBe("Address A");
    expect(snap?.bank).toBe("Bank A");
    expect(snap?.iban).toBe("IBAN-A");

    // Change the live organization profile to "Company B".
    await setProfile(orgA, { nui: "NUI-B", address: "Address B", bank: "Bank B", iban: "IBAN-B" });

    // The historical invoice's snapshot is unchanged.
    const after = await companySnapshotOf(inv.data.id);
    expect(after?.nui).toBe("NUI-A");
    expect(after?.address).toBe("Address A");
    expect(after?.bank).toBe("Bank A");
    expect(after?.iban).toBe("IBAN-A");
  });
});

describe("invoice deletion lifecycle", () => {
  it("a Draft invoice with no payments can be hard-deleted", async () => {
    const id = await manualInvoice("Draft");
    const del = await deleteInvoiceAction({ id }, H(ownerCookie));
    expect(del.ok).toBe(true);
    expect(await invoiceExists(id)).toBe(false);
  });

  it("an issued (Dërguar) invoice cannot be hard-deleted (must be cancelled)", async () => {
    const id = await manualInvoice("Dërguar");
    const del = await deleteInvoiceAction({ id }, H(ownerCookie));
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.error.code).toBe("RULE_VIOLATION");
    expect(await invoiceExists(id)).toBe(true);
    // …but cancelling then deleting works.
    await setInvoiceStatusAction({ id, status: "Anuluar" }, H(ownerCookie));
    const del2 = await deleteInvoiceAction({ id }, H(ownerCookie));
    expect(del2.ok).toBe(true);
    expect(await invoiceExists(id)).toBe(false);
  });

  it("an invoice WITH payments cannot be deleted — payments never silently become credit", async () => {
    const id = await manualInvoice("Dërguar");
    const pay = await recordInvoicePaymentAction({ invoiceId: id, amount: 100, date: "2026-06-10", method: "Transfertë bankare" }, H(ownerCookie));
    if (!pay.ok) throw new Error("setup payment");
    const payId = (await ownerPool.query(`select id from payments where invoice_id=$1`, [id])).rows[0].id as string;

    // Even cancelled, an invoice that still has payments is protected from deletion.
    await setInvoiceStatusAction({ id, status: "Anuluar" }, H(ownerCookie));
    const del = await deleteInvoiceAction({ id }, H(ownerCookie));
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.error.code).toBe("RULE_VIOLATION");

    // Invoice survives and the payment is still LINKED (not turned into an advance).
    expect(await invoiceExists(id)).toBe(true);
    expect(await paymentLinkedInvoice(payId)).toBe(id);
  });
});
