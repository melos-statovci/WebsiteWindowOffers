// Pure derivation helpers — no React, no store. Unit-tested in selectors.test.ts.
import type { Project, Invoice, Payment } from "@/types";

export function projectNet(p: Pick<Project, "items">): number {
  return p.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
}

export function projectTotal(p: Pick<Project, "items" | "vatRate">): number {
  return projectNet(p) * (1 + p.vatRate);
}

export function invoiceNet(inv: Pick<Invoice, "lines">): number {
  return inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

export function invoiceVat(inv: Pick<Invoice, "lines" | "vatRate">): number {
  return invoiceNet(inv) * inv.vatRate;
}

export function invoiceTotal(inv: Pick<Invoice, "lines" | "vatRate">): number {
  return invoiceNet(inv) * (1 + inv.vatRate);
}

export interface ClientStats {
  offersTotal: number;
  offersAccepted: number;
  offersRejected: number;
  acceptedValue: number;
  paid: number;
  debt: number;
  paymentsCount: number;
  invoicedTotal: number;
}

export function clientStats(
  clientId: string,
  projects: Project[],
  invoices: Invoice[],
  payments: Payment[],
): ClientStats {
  // Archived offers are excluded from a client's live financials so debt stays
  // consistent with the dashboard (which counts active offers only).
  const offers = projects.filter((p) => p.clientId === clientId && !p.archived);
  const accepted = offers.filter((p) => p.status === "Pranuar");
  const rejected = offers.filter((p) => p.status === "Refuzuar");
  const acceptedValue = accepted.reduce((s, p) => s + projectTotal(p), 0);
  const clientPayments = payments.filter((p) => p.clientId === clientId);
  const paid = clientPayments.reduce((s, p) => s + p.amount, 0);
  const invoicedTotal = invoices
    .filter((i) => i.clientId === clientId && i.status !== "Anuluar")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  return {
    offersTotal: offers.length,
    offersAccepted: accepted.length,
    offersRejected: rejected.length,
    acceptedValue,
    paid,
    debt: Math.max(0, acceptedValue - paid),
    paymentsCount: clientPayments.length,
    invoicedTotal,
  };
}

export interface DashboardStats {
  offersThisMonth: number;
  jobsInProduction: number;
  jobsCompleted: number;
  revenue: number; // accepted (pranuar) total
  received: number; // total payments
  receivedCount: number;
  pending: number; // accepted not yet fully paid
  pendingCount: number;
  clientDebt: number;
  expenses: number;
}

export function dashboardStats(
  projects: Project[],
  payments: Payment[],
  clients: { id: string }[],
): DashboardStats {
  const active = projects.filter((p) => !p.archived);
  const accepted = active.filter((p) => p.status === "Pranuar");
  const revenue = accepted.reduce((s, p) => s + projectTotal(p), 0);
  const received = payments.reduce((s, p) => s + p.amount, 0);
  const clientDebt = clients.reduce((sum, c) => {
    const s = clientStats(c.id, projects, [], payments);
    return sum + s.debt;
  }, 0);
  const pending = Math.max(0, revenue - received);
  return {
    offersThisMonth: active.length,
    jobsInProduction: accepted.length,
    jobsCompleted: 0,
    revenue,
    received,
    receivedCount: payments.length,
    pending,
    pendingCount: accepted.filter((p) => {
      const s = clientStats(p.clientId, projects, [], payments);
      return s.debt > 0;
    }).length,
    clientDebt,
    expenses: 0,
  };
}
