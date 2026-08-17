// Payment action cores. Money-moving operations, so each runs inside the withOrg
// RLS transaction AND takes a ROW LOCK on the target invoice (SELECT … FOR UPDATE)
// before reading the outstanding balance, so concurrent payments / mark-paid
// clicks on the same invoice serialize and can never oversettle or double-charge.
//
// Financial rules preserved from the pre-DB model (src/lib/store.ts):
//   - amount is positive (Zod + DB CHECK) and rounded to cents server-side.
//   - recordInvoicePayment: rejects a payment on a cancelled invoice; rejects a
//     payment when nothing is outstanding, and rejects overpayment, UNLESS
//     allowCredit is set (then the excess becomes client credit via the
//     overpayment the selectors already model). Recording on a Draft issues it
//     (Dërguar); full settlement sets Paguar.
//   - markInvoicePaid is IDEMPOTENT: it settles only the REMAINING balance under
//     the lock, so repeated / concurrent clicks create at most one settling
//     payment.
//   - deletePayment reverts a now-under-paid invoice's derived "Paguar" back to
//     Dërguar so the badge cannot lie; the money leaves outstanding/credit at once.

import { and, eq, sql } from "drizzle-orm";
import { invoices, invoiceLines, payments } from "@/db/schema/business";
import {
  recordInvoicePaymentSchema,
  markInvoicePaidSchema,
  advancePaymentSchema,
  paymentDeleteSchema,
} from "@/domain/validation/payment";
import { invoiceTotal } from "@/domain/finance/selectors";
import { createAction, fail } from "@/server/action";
import type { TenantTx } from "@/db/tenant";

/** Half-a-cent tolerance, matching the domain selectors. */
const EPS = 0.005;
const money = (n: number): number => Math.round(n * 100) / 100;
const todayIso = () => new Date().toISOString().slice(0, 10);

function isConstraintViolation(e: unknown, name: string): boolean {
  const node = e as { constraint?: string; message?: string; cause?: unknown } | null;
  if (!node) return false;
  if (node.constraint === name) return true;
  if (typeof node.message === "string" && node.message.includes(name)) return true;
  return isConstraintViolation(node.cause, name);
}

interface LockedInvoice {
  id: string;
  clientId: string;
  status: string;
  vatRate: number;
}

/** Lock the invoice row (FOR UPDATE) within the active org; throws NOT_FOUND. */
async function lockInvoice(tx: TenantTx, orgId: string, invoiceId: string): Promise<LockedInvoice> {
  const rows = await tx
    .select({ id: invoices.id, clientId: invoices.clientId, status: invoices.status, vatRate: invoices.vatRate })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, orgId)))
    .limit(1)
    .for("update");
  if (rows.length === 0) throw fail("NOT_FOUND", "Fatura nuk u gjet.");
  return { id: rows[0].id, clientId: rows[0].clientId, status: rows[0].status, vatRate: Number(rows[0].vatRate) };
}

/** Server-authoritative invoice total, derived from the stored lines (selectors). */
async function invoiceTotalOf(tx: TenantTx, invoiceId: string, vatRate: number): Promise<number> {
  const rows = await tx
    .select({ qty: invoiceLines.qty, unitPrice: invoiceLines.unitPrice })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId));
  const lines = rows.map((r) => ({ description: "", qty: r.qty, unitPrice: Number(r.unitPrice) }));
  return invoiceTotal({ lines, vatRate });
}

/** Sum of payments already linked to this invoice (within the RLS tx). */
async function paidSoFar(tx: TenantTx, invoiceId: string): Promise<number> {
  const rows = await tx
    .select({ s: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  return money(Number(rows[0]?.s ?? 0));
}

async function setInvoiceStatus(tx: TenantTx, orgId: string, invoiceId: string, status: string): Promise<void> {
  await tx
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, orgId)));
}

// ---------------------------------------------------------------------------
// Record a payment against a specific invoice
// ---------------------------------------------------------------------------
export const recordInvoicePaymentAction = createAction({
  input: recordInvoicePaymentSchema,
  permission: { payment: ["record"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    const inv = await lockInvoice(tx, orgId, input.invoiceId);
    if (inv.status === "Anuluar") throw fail("RULE_VIOLATION", "Fatura është e anuluar.");

    const amount = money(input.amount);
    const total = await invoiceTotalOf(tx, inv.id, inv.vatRate);
    const alreadyPaid = await paidSoFar(tx, inv.id);
    const outstanding = Math.max(0, money(total - alreadyPaid));

    if (outstanding <= EPS && !input.allowCredit) {
      throw fail("RULE_VIOLATION", "Kjo faturë është tashmë e paguar plotësisht.");
    }
    if (amount > outstanding + EPS && !input.allowCredit) {
      throw fail(
        "RULE_VIOLATION",
        `Shuma tejkalon mbetjen e faturës (${outstanding.toFixed(2)} €). Aktivizoni kredinë për ta lejuar.`,
      );
    }

    await tx.insert(payments).values({
      organizationId: orgId,
      clientId: inv.clientId,
      invoiceId: inv.id,
      amount: amount.toFixed(2),
      date: input.date,
      method: input.method,
      note: input.note,
    });

    const paidInFull = alreadyPaid + amount + EPS >= total;
    const credit = Math.max(0, money(amount - outstanding));
    if (paidInFull) await setInvoiceStatus(tx, orgId, inv.id, "Paguar");
    else if (inv.status === "Draft") await setInvoiceStatus(tx, orgId, inv.id, "Dërguar");

    return { paidInFull, credit: credit > EPS ? credit : undefined };
  },
});

// ---------------------------------------------------------------------------
// Mark an invoice paid — IDEMPOTENT settle-the-remaining
// ---------------------------------------------------------------------------
export const markInvoicePaidAction = createAction({
  input: markInvoicePaidSchema,
  permission: { payment: ["record"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    const inv = await lockInvoice(tx, orgId, input.invoiceId);
    if (inv.status === "Anuluar") throw fail("RULE_VIOLATION", "Fatura është e anuluar.");

    const total = await invoiceTotalOf(tx, inv.id, inv.vatRate);
    const alreadyPaid = await paidSoFar(tx, inv.id);
    const remaining = Math.max(0, money(total - alreadyPaid));

    // Already settled -> no duplicate payment (idempotent). Reconcile the status.
    if (remaining <= EPS) {
      if (inv.status !== "Paguar") await setInvoiceStatus(tx, orgId, inv.id, "Paguar");
      return { paidInFull: true, created: false, amount: 0 };
    }

    await tx.insert(payments).values({
      organizationId: orgId,
      clientId: inv.clientId,
      invoiceId: inv.id,
      amount: remaining.toFixed(2),
      date: input.date ?? todayIso(),
      method: input.method ?? "Transfertë bankare",
      note: input.note ?? "Shlyerje e plotë",
    });
    await setInvoiceStatus(tx, orgId, inv.id, "Paguar");
    return { paidInFull: true, created: true, amount: remaining };
  },
});

// ---------------------------------------------------------------------------
// Record an unlinked advance/credit payment for a client
// ---------------------------------------------------------------------------
export const recordAdvancePaymentAction = createAction({
  input: advancePaymentSchema,
  permission: { payment: ["record"] },
  revalidate: ["/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    try {
      const rows = await tx
        .insert(payments)
        .values({
          organizationId: orgId,
          clientId: input.clientId,
          invoiceId: null,
          amount: money(input.amount).toFixed(2),
          date: input.date,
          method: input.method,
          note: input.note,
        })
        .returning({ id: payments.id });
      return { id: rows[0].id };
    } catch (e) {
      if (isConstraintViolation(e, "payments_org_client_fk")) {
        throw fail("VALIDATION", "Klienti nuk i përket organizatës aktive.");
      }
      throw e;
    }
  },
});

// ---------------------------------------------------------------------------
// Delete a payment
// ---------------------------------------------------------------------------
export const deletePaymentAction = createAction({
  input: paymentDeleteSchema,
  permission: { payment: ["delete"] },
  revalidate: ["/invoices", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    const rows = await tx
      .select({ id: payments.id, invoiceId: payments.invoiceId })
      .from(payments)
      .where(and(eq(payments.id, input.id), eq(payments.organizationId, orgId)))
      .limit(1)
      .for("update");
    if (rows.length === 0) throw fail("NOT_FOUND", "Pagesa nuk u gjet.");
    const invoiceId = rows[0].invoiceId;

    await tx.delete(payments).where(and(eq(payments.id, input.id), eq(payments.organizationId, orgId)));

    // If it settled an invoice, re-derive: a now-under-paid "Paguar" reverts to
    // Dërguar so the payment-derived state cannot be stale.
    if (invoiceId) {
      const inv = await tx
        .select({ status: invoices.status, vatRate: invoices.vatRate })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, orgId)))
        .limit(1)
        .for("update");
      if (inv.length > 0 && inv[0].status === "Paguar") {
        const total = await invoiceTotalOf(tx, invoiceId, Number(inv[0].vatRate));
        const paid = await paidSoFar(tx, invoiceId);
        if (paid + EPS < total) await setInvoiceStatus(tx, orgId, invoiceId, "Dërguar");
      }
    }
    return { id: input.id };
  },
});
