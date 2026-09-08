// Shared validation for PLATFORM control-plane mutations. Pure and client-safe
// (no DB/Next/React imports), re-run authoritatively on the server by the
// platform action spine. The target organization id is explicit input here
// (unlike tenant actions) because a platform admin is authorized over every org;
// it is still validated as a UUID and checked to exist before any write.

import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orgId = z.string().regex(UUID_RE, "Organizatë e pavlefshme.");

// Kept in sync with PLAN_TIERS in src/lib/plan.ts.
export const PLAN_ENUM = ["STANDARD"] as const;

export const setPlanSchema = z.object({
  organizationId: orgId,
  plan: z.enum(PLAN_ENUM),
});
export type SetPlanInput = z.infer<typeof setPlanSchema>;

export const setStatusSchema = z.object({
  organizationId: orgId,
  status: z.enum(["active", "suspended"]),
  // Optional operator note, shown to the suspended tenant. Only meaningful when
  // suspending; ignored/cleared on reactivation.
  reason: z.string().trim().max(300).optional(),
});
export type SetStatusInput = z.infer<typeof setStatusSchema>;

export const setInternalNoteSchema = z.object({
  organizationId: orgId,
  note: z.string().trim().max(2000),
});
export type SetInternalNoteInput = z.infer<typeof setInternalNoteSchema>;

export const activateCustomerSchema = z.object({
  organizationId: orgId,
});
export type ActivateCustomerInput = z.infer<typeof activateCustomerSchema>;

export const extendTrialSchema = z.object({
  organizationId: orgId,
  days: z.union([z.literal(7), z.literal(14)]),
});
export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;
