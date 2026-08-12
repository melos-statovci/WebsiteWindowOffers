// Shared validation for clients. Pure and client-safe: the same schema powers
// instant form UX in the browser AND authoritative re-validation on the server
// (via the action spine). No DB / Next / React / Zustand imports (enforced by
// the domain ESLint boundary).
//
// The tenant (organization_id) is NEVER part of the input — it comes only from
// the server session. Update carries the stable client UUID; create does not.
// Optional contact fields are genuinely optional keys and may be omitted or ""
// (an empty field); the action handlers coerce "" to NULL before persisting.

import { z } from "zod";

// Version-stable email check (matches the org-profile schema).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requiredName = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().min(1, "Emri i klientit është i detyrueshëm.").max(120),
);

// Optional free text: trimmed, length-capped, "" permitted (means "not set").
const optionalText = (max: number) => z.string().trim().max(max).optional();

// Optional email: "" is allowed (no email); a non-empty value must look valid.
const optionalEmail = z
  .union([z.literal(""), z.string().trim().regex(EMAIL_RE, "Email i pavlefshëm.")])
  .optional();

// The mutable fields shared by create and update. `type` mirrors the local
// ClientType union ('Privat' | 'Biznes').
const clientBody = {
  name: requiredName,
  type: z.enum(["Privat", "Biznes"]),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(200),
  city: optionalText(80),
  nui: optionalText(32),
};

export const clientCreateSchema = z.object(clientBody);

export const clientUpdateSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  ...clientBody,
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
