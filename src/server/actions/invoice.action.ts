"use server";

// Public "use server" entry points for invoice mutations. They accept only the
// validated input shapes; request headers (and therefore the session / active
// organization) are read server-side and can never be supplied by the caller.
// Mirrors the Phase 3/4/5/6 wrapper template.

import { headers } from "next/headers";
import {
  createInvoiceFromProjectAction,
  createManualInvoiceAction,
  setInvoiceStatusAction,
  deleteInvoiceAction,
} from "@/server/actions/invoice";
import type {
  InvoiceFromProjectInput,
  InvoiceManualInput,
  InvoiceStatusInput,
  InvoiceDeleteInput,
} from "@/domain/validation/invoice";

export async function createInvoiceFromProject(input: InvoiceFromProjectInput) {
  return createInvoiceFromProjectAction(input, await headers());
}
export async function createManualInvoice(input: InvoiceManualInput) {
  return createManualInvoiceAction(input, await headers());
}
export async function setInvoiceStatus(input: InvoiceStatusInput) {
  return setInvoiceStatusAction(input, await headers());
}
export async function deleteInvoice(input: InvoiceDeleteInput) {
  return deleteInvoiceAction(input, await headers());
}
