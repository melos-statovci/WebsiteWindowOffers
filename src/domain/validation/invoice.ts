// Shared validation for invoices. Pure and client-safe: the SAME schemas power
// browser form UX and authoritative server-side re-validation via the action
// spine. No DB / Next / React / Zustand imports (domain ESLint boundary).
//
// MONEY INVARIANT:
//   - createInvoiceFromProject carries NO money and NO lines — only the project
//     id + dates + status. The server loads the authoritative project items from
//     Postgres and snapshots their prices; a hostile browser cannot inject a line
//     price or total.
//   - createManualInvoice DOES accept user-entered line unit prices (legitimate
//     business input for ad-hoc invoices), but the server recomputes every line
//     total and the invoice total from the validated lines. A submitted grand
//     total is never trusted (there is no field for one).
// Per-line VAT is not modelled: VAT is a single invoice-level fraction (0..1),
// matching the existing InvoiceLine/Invoice shape.

import { z } from "zod";

// Manual/settable statuses. "Paguar" (paid) is DERIVED from payments, never set
// by hand, so it is intentionally absent here.
export const INVOICE_SETTABLE_STATUSES = ["Draft", "Dërguar", "Vonesë", "Anuluar"] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datë e pavlefshme.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Datë e pavlefshme.");

const invoiceLineSchema = z.object({
  description: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Përshkrimi është i detyrueshëm.").max(300),
  ),
  qty: z.number().int().min(1).max(99999),
  // Manual line price: legitimate user input, but bounded and finite. Line + grand
  // totals are always recomputed server-side.
  unitPrice: z.number().finite().min(0).max(1_000_000),
});

/** Common date pair with dueAt >= issuedAt. */
const datesRefinement = {
  issuedAt: isoDate,
  dueAt: isoDate,
} as const;
const dueNotBeforeIssued = (v: { issuedAt: string; dueAt: string }) => v.dueAt >= v.issuedAt;
const dueMsg = { message: "Afati nuk mund të jetë para datës së faturimit.", path: ["dueAt"] };

// ---- Create from an existing (accepted) project/offer -------------------------
// No client, no lines, no vat, no money: all are derived server-side from the
// authoritative project. status is optional (defaults to Dërguar on the server).
export const invoiceFromProjectSchema = z
  .object({
    projectId: z.string().uuid("Projekt i pavlefshëm."),
    ...datesRefinement,
    status: z.enum(INVOICE_SETTABLE_STATUSES).optional(),
  })
  .refine(dueNotBeforeIssued, dueMsg);
export type InvoiceFromProjectInput = z.infer<typeof invoiceFromProjectSchema>;

// ---- Create a manual/ad-hoc invoice ------------------------------------------
export const invoiceManualSchema = z
  .object({
    clientId: z.string().uuid("Klient i pavlefshëm."),
    ...datesRefinement,
    status: z.enum(INVOICE_SETTABLE_STATUSES).optional(),
    // VAT fraction 0..1 (e.g. 0.18). Legitimate business input; validated + bounded.
    vatRate: z.number().finite().min(0).max(1),
    reference: z.string().trim().max(120).optional(),
    lines: z.array(invoiceLineSchema).min(1, "Shtoni të paktën një rresht.").max(200),
  })
  .refine(dueNotBeforeIssued, dueMsg);
export type InvoiceManualInput = z.infer<typeof invoiceManualSchema>;

// ---- Status / delete ----------------------------------------------------------
export const invoiceStatusSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  status: z.enum(INVOICE_SETTABLE_STATUSES),
});
export type InvoiceStatusInput = z.infer<typeof invoiceStatusSchema>;

export const invoiceDeleteSchema = z.object({ id: z.string().uuid("ID e pavlefshme.") });
export type InvoiceDeleteInput = z.infer<typeof invoiceDeleteSchema>;
