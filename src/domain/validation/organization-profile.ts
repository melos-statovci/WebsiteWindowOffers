// Shared validation for the organization (company) profile. Pure and
// client-safe: usable by browser forms for instant UX AND re-run authoritatively
// on the server. No DB / Next / React / Zustand imports (enforced by the domain
// ESLint boundary).

import { z } from "zod";

// Version-stable email check (avoids relying on zod version-specific helpers).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimmed = (max: number) => z.string().trim().max(max);

// All fields optional: this is a partial update. The tenant (organization_id) is
// NEVER part of the input — it comes only from the server session.
export const organizationProfileUpdateSchema = z.object({
  nui: trimmed(32).optional(),
  vatNo: trimmed(32).optional(),
  address: trimmed(200).optional(),
  city: trimmed(80).optional(),
  postalCode: trimmed(16).optional(),
  phone: trimmed(40).optional(),
  // Allow an empty string so the field can be cleared; otherwise a valid email.
  businessEmail: trimmed(120)
    .refine((v) => v === "" || EMAIL_RE.test(v), "Email i pavlefshëm.")
    .optional(),
  bank: trimmed(80).optional(),
  swift: trimmed(32).optional(),
  iban: trimmed(48).optional(),
  marginDefault: z.number().min(0, "Duhet 0–100.").max(100, "Duhet 0–100.").optional(),
  vatDefault: z.number().min(0, "Duhet 0–100.").max(100, "Duhet 0–100.").optional(),
});

export type OrganizationProfileUpdate = z.infer<typeof organizationProfileUpdateSchema>;
