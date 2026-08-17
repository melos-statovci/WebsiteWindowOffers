// Shared validation for payments. Pure and client-safe: the SAME schemas power
// browser form UX and authoritative server-side re-validation via the action
// spine. No DB / Next / React / Zustand imports (domain ESLint boundary).
//
// MONEY INVARIANT: a payment amount is a positive, bounded, finite number. The
// server additionally rounds to cents and (for invoice-linked payments) enforces
// the outstanding-balance / overpayment rules under a row lock — validation only
// guards the shape.

import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datë e pavlefshme.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Datë e pavlefshme.");

const amount = z.number().finite().positive("Shuma duhet të jetë më e madhe se zero.").max(1_000_000);
const method = z.string().trim().min(1, "Zgjidhni një metodë.").max(64);
const note = z.string().trim().max(300).optional();

// Record a payment against a specific invoice (may allow excess as client credit).
export const recordInvoicePaymentSchema = z.object({
  invoiceId: z.string().uuid("Faturë e pavlefshme."),
  amount,
  date: isoDate,
  method,
  note,
  allowCredit: z.boolean().optional(),
});
export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;

// Idempotently settle an invoice's REMAINING balance (server computes the amount).
export const markInvoicePaidSchema = z.object({
  invoiceId: z.string().uuid("Faturë e pavlefshme."),
  date: isoDate.optional(),
  method: method.optional(),
  note,
});
export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;

// Record an unlinked advance/credit payment for a client (no invoice).
export const advancePaymentSchema = z.object({
  clientId: z.string().uuid("Klient i pavlefshëm."),
  amount,
  date: isoDate,
  method,
  note,
});
export type AdvancePaymentInput = z.infer<typeof advancePaymentSchema>;

export const paymentDeleteSchema = z.object({ id: z.string().uuid("ID e pavlefshme.") });
export type PaymentDeleteInput = z.infer<typeof paymentDeleteSchema>;
