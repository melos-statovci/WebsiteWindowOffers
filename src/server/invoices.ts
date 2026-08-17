// Server-side invoice READS. The active organization is resolved from the Better
// Auth session (requireAuthContext) — never from client input — and every query
// runs inside a withOrg() RLS-scoped transaction as the restricted role, so
// Postgres guarantees a caller only ever sees its own tenant's invoices.
//
// Rows are mapped to the EXACT shared domain Invoice / InvoiceLine shape so the
// existing UI, selectors (invoiceTotal/invoicePaid/invoiceOutstanding/…), print
// and search keep working unchanged after the data-source migration.
//
// clientName is read from the invoice's OWN snapshot column (client_name), NOT a
// live JOIN: an invoice is a historical document, so renaming or deleting the
// live client must never rewrite what a past invoice says.

import { and, asc, desc, eq } from "drizzle-orm";
import { invoices, invoiceLines } from "@/db/schema/business";
import { withOrg, type TenantTx } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import { isUuid } from "@/auth/organization";
import type { Invoice, InvoiceLine, InvoiceStatus } from "@/domain/types";

type InvoiceRow = typeof invoices.$inferSelect;
type LineRow = typeof invoiceLines.$inferSelect;

function toLine(row: LineRow): InvoiceLine {
  return {
    description: row.description,
    qty: row.qty,
    unitPrice: Number(row.unitPrice),
  };
}

function toInvoice(row: InvoiceRow, lines: InvoiceLine[]): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientId: row.clientId,
    clientName: row.clientName,
    projectId: row.projectId ?? undefined,
    reference: row.reference ?? undefined,
    issuedAt: row.issuedAt,
    dueAt: row.dueAt,
    status: row.status as InvoiceStatus,
    lines,
    vatRate: Number(row.vatRate),
    companySnapshot: row.companySnapshot ?? undefined,
  };
}

/** All lines of the active org, grouped by invoice id (sorted for display). */
async function linesByInvoice(tx: TenantTx): Promise<Map<string, InvoiceLine[]>> {
  const rows = await tx
    .select()
    .from(invoiceLines)
    .orderBy(asc(invoiceLines.sortOrder), asc(invoiceLines.createdAt), asc(invoiceLines.id));
  const map = new Map<string, InvoiceLine[]>();
  for (const r of rows) {
    const list = map.get(r.invoiceId) ?? [];
    list.push(toLine(r));
    map.set(r.invoiceId, list);
  }
  return map;
}

/** All invoices of the caller's active organization, newest first, with lines. */
export async function listInvoices(): Promise<Invoice[]> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt), desc(invoices.id));
    const lines = await linesByInvoice(tx);
    return rows.map((r) => toInvoice(r, lines.get(r.id) ?? []));
  });
}

/**
 * One invoice by id, scoped to the active organization. Returns null when the id
 * is malformed, does not exist, or belongs to another tenant (RLS hides it).
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  if (!isUuid(id)) return null;
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!rows[0]) return null;
    const lineRows = await tx
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, id)))
      .orderBy(asc(invoiceLines.sortOrder), asc(invoiceLines.createdAt), asc(invoiceLines.id));
    return toInvoice(rows[0], lineRows.map(toLine));
  });
}
