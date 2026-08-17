// Server-side payment READS. The active organization is resolved from the Better
// Auth session (requireAuthContext) — never from client input — and the query
// runs inside a withOrg() RLS-scoped transaction as the restricted role, so
// Postgres guarantees a caller only ever sees its own tenant's payments.
//
// Rows are mapped to the EXACT shared domain Payment shape so the existing
// selectors (clientStats/dashboardStats/invoicePaid/…) keep working unchanged.

import { desc } from "drizzle-orm";
import { payments } from "@/db/schema/business";
import { withOrg } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import type { Payment } from "@/domain/types";

type PaymentRow = typeof payments.$inferSelect;

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    clientId: row.clientId,
    invoiceId: row.invoiceId ?? undefined,
    amount: Number(row.amount),
    date: row.date,
    method: row.method,
    note: row.note ?? undefined,
  };
}

/** All payments of the caller's active organization, newest first. */
export async function listPayments(): Promise<Payment[]> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select()
      .from(payments)
      .orderBy(desc(payments.date), desc(payments.createdAt), desc(payments.id));
    return rows.map(toPayment);
  });
}
