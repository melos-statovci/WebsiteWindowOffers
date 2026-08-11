// Pure derivation helpers — no React, no store. Unit-tested in selectors.test.ts.
//
// FINANCIAL MODEL (local demo)
// ----------------------------
// The app has two distinct financial layers that must not be conflated:
//
//   1. Offer/pipeline layer  — projects (offers) with a status. An *accepted*
//      offer has a value ("acceptedValue") but does NOT by itself create a
//      receivable. It is expected/backlog revenue.
//   2. Receivable layer      — invoices. Issuing an invoice creates money the
//      client actually owes. Payments (optionally linked to an invoice) settle
//      it.
//
// Debt is therefore an INVOICE concept, never "accepted offers minus payments".
//
//   invoiceTotal        = net + VAT
//   invoicePaid         = Σ payments whose invoiceId === invoice.id
//   invoiceOutstanding  = max(0, total − paid)  (0 for Draft/Anuluar)
//   client credit       = advance payments (no invoiceId) + any overpayments
//   client debt         = max(0, Σ outstanding − credit)
//
// Every consumer (client card, dashboard, invoice list) derives from these same
// helpers so the numbers can never disagree.

import type { Project, Invoice, Payment } from "@/domain/types";

/** Half-a-cent tolerance so float noise never flips a paid invoice to "partial". */
const EPS = 0.005;
const money = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Project / offer totals
// ---------------------------------------------------------------------------
export function projectNet(p: Pick<Project, "items">): number {
  return money(p.items.reduce((s, i) => s + i.qty * i.unitPrice, 0));
}

export function projectTotal(p: Pick<Project, "items" | "vatRate">): number {
  return money(projectNet(p) * (1 + p.vatRate));
}

// ---------------------------------------------------------------------------
// Invoice totals & balances
// ---------------------------------------------------------------------------
export function invoiceNet(inv: Pick<Invoice, "lines">): number {
  return money(inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
}

export function invoiceVat(inv: Pick<Invoice, "lines" | "vatRate">): number {
  return money(invoiceNet(inv) * inv.vatRate);
}

export function invoiceTotal(inv: Pick<Invoice, "lines" | "vatRate">): number {
  return money(invoiceNet(inv) * (1 + inv.vatRate));
}

/**
 * Does this invoice represent money the client owes? Draft (not yet issued) and
 * Anuluar (cancelled) invoices are NOT receivables and never count toward debt.
 */
export function isReceivable(inv: Pick<Invoice, "status">): boolean {
  return inv.status !== "Draft" && inv.status !== "Anuluar";
}

/** Sum of payments explicitly linked to this invoice id. */
export function invoicePaid(invoiceId: string, payments: Payment[]): number {
  return money(
    payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0),
  );
}

/** Remaining balance on an invoice (0 for Draft/Anuluar or when fully paid). */
export function invoiceOutstanding(
  inv: Pick<Invoice, "id" | "lines" | "vatRate" | "status">,
  payments: Payment[],
): number {
  if (!isReceivable(inv)) return 0;
  return money(Math.max(0, invoiceTotal(inv) - invoicePaid(inv.id, payments)));
}

export type InvoicePaymentState =
  | "draft"
  | "cancelled"
  | "unpaid"
  | "partial"
  | "paid"
  | "overpaid";

/** Payment-derived state — the source of truth for "is this invoice paid?". */
export function invoicePaymentState(
  inv: Pick<Invoice, "id" | "lines" | "vatRate" | "status">,
  payments: Payment[],
): InvoicePaymentState {
  if (inv.status === "Anuluar") return "cancelled";
  if (inv.status === "Draft") return "draft";
  const total = invoiceTotal(inv);
  const paid = invoicePaid(inv.id, payments);
  if (paid <= EPS) return "unpaid";
  if (paid > total + EPS) return "overpaid";
  if (paid + EPS >= total) return "paid";
  return "partial";
}

// ---------------------------------------------------------------------------
// Client aggregates
// ---------------------------------------------------------------------------
export interface ClientStats {
  offersTotal: number;
  offersAccepted: number;
  offersRejected: number;
  /** Pipeline value of accepted offers (NOT a receivable). */
  acceptedValue: number;
  /** Σ total of the client's receivable (issued, non-cancelled) invoices. */
  invoicedTotal: number;
  /** All money received from this client (allocated + advances). */
  paid: number;
  /** Money received against invoices. */
  invoicePaid: number;
  /** Advance/unlinked payments — client credit until applied to an invoice. */
  advancePaid: number;
  /** Gross unpaid balance across receivable invoices (before credit offset). */
  outstanding: number;
  /** Advances + overpayments available to the client. */
  credit: number;
  /** Net amount the client still owes: max(0, outstanding − credit). */
  debt: number;
  /** Credit left over after covering all outstanding invoices. */
  availableCredit: number;
  paymentsCount: number;
}

export function clientStats(
  clientId: string,
  projects: Project[],
  invoices: Invoice[],
  payments: Payment[],
): ClientStats {
  // Archived offers are excluded from live pipeline figures.
  const offers = projects.filter((p) => p.clientId === clientId && !p.archived);
  const accepted = offers.filter((p) => p.status === "Pranuar");
  const rejected = offers.filter((p) => p.status === "Refuzuar");
  const acceptedValue = money(accepted.reduce((s, p) => s + projectTotal(p), 0));

  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientInvoiceIds = new Set(clientInvoices.map((i) => i.id));
  const receivable = clientInvoices.filter(isReceivable);
  const invoicedTotal = money(receivable.reduce((s, i) => s + invoiceTotal(i), 0));

  let outstanding = 0;
  let overpayment = 0;
  for (const inv of receivable) {
    const total = invoiceTotal(inv);
    const paid = invoicePaid(inv.id, payments);
    outstanding += Math.max(0, total - paid);
    overpayment += Math.max(0, paid - total);
  }
  outstanding = money(outstanding);

  const clientPayments = payments.filter((p) => p.clientId === clientId);
  // An "advance" is any payment not linked to one of this client's own invoices
  // (no invoiceId, or a dangling reference to a deleted invoice).
  const advancePaid = money(
    clientPayments
      .filter((p) => !p.invoiceId || !clientInvoiceIds.has(p.invoiceId))
      .reduce((s, p) => s + p.amount, 0),
  );
  const paid = money(clientPayments.reduce((s, p) => s + p.amount, 0));
  const invoicePaidTotal = money(paid - advancePaid);

  const credit = money(advancePaid + overpayment);
  const debt = money(Math.max(0, outstanding - credit));
  const availableCredit = money(Math.max(0, credit - outstanding));

  return {
    offersTotal: offers.length,
    offersAccepted: accepted.length,
    offersRejected: rejected.length,
    acceptedValue,
    invoicedTotal,
    paid,
    invoicePaid: invoicePaidTotal,
    advancePaid,
    outstanding,
    credit,
    debt,
    availableCredit,
    paymentsCount: clientPayments.length,
  };
}

// ---------------------------------------------------------------------------
// Dashboard aggregates (same source of truth as client/invoice views)
// ---------------------------------------------------------------------------
export interface DashboardStats {
  offersThisMonth: number;
  acceptedCount: number;
  acceptedValue: number;
  invoicedTotal: number;
  received: number;
  receivedCount: number;
  outstanding: number;
  outstandingCount: number;
  clientDebt: number;
  clientCredit: number;
}

export function dashboardStats(
  projects: Project[],
  invoices: Invoice[],
  payments: Payment[],
  clients: { id: string }[],
  now: Date = new Date(),
): DashboardStats {
  const active = projects.filter((p) => !p.archived);
  const accepted = active.filter((p) => p.status === "Pranuar");
  const acceptedValue = money(accepted.reduce((s, p) => s + projectTotal(p), 0));

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const offersThisMonth = active.filter((p) => p.createdAt.slice(0, 7) === monthKey).length;

  const receivable = invoices.filter(isReceivable);
  const invoicedTotal = money(receivable.reduce((s, i) => s + invoiceTotal(i), 0));
  const outstanding = money(receivable.reduce((s, i) => s + invoiceOutstanding(i, payments), 0));
  const outstandingCount = receivable.filter((i) => invoiceOutstanding(i, payments) > EPS).length;

  const received = money(payments.reduce((s, p) => s + p.amount, 0));

  let clientDebt = 0;
  let clientCredit = 0;
  for (const c of clients) {
    const s = clientStats(c.id, projects, invoices, payments);
    clientDebt += s.debt;
    clientCredit += s.availableCredit;
  }

  return {
    offersThisMonth,
    acceptedCount: accepted.length,
    acceptedValue,
    invoicedTotal,
    received,
    receivedCount: payments.length,
    outstanding,
    outstandingCount,
    clientDebt: money(clientDebt),
    clientCredit: money(clientCredit),
  };
}
