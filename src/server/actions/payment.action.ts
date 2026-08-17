"use server";

// Public "use server" entry points for payment mutations. They accept only the
// validated input shapes; request headers (and therefore the session / active
// organization) are read server-side and can never be supplied by the caller.

import { headers } from "next/headers";
import {
  recordInvoicePaymentAction,
  markInvoicePaidAction,
  recordAdvancePaymentAction,
  deletePaymentAction,
} from "@/server/actions/payment";
import type {
  RecordInvoicePaymentInput,
  MarkInvoicePaidInput,
  AdvancePaymentInput,
  PaymentDeleteInput,
} from "@/domain/validation/payment";

export async function recordInvoicePayment(input: RecordInvoicePaymentInput) {
  return recordInvoicePaymentAction(input, await headers());
}
export async function markInvoicePaid(input: MarkInvoicePaidInput) {
  return markInvoicePaidAction(input, await headers());
}
export async function recordAdvancePayment(input: AdvancePaymentInput) {
  return recordAdvancePaymentAction(input, await headers());
}
export async function deletePayment(input: PaymentDeleteInput) {
  return deletePaymentAction(input, await headers());
}
