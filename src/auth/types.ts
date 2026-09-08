// Pure auth context types — safe to import from client components (no server
// dependencies). The concrete resolution lives in session.ts (server-only).

import type { PlanTier } from "@/lib/plan";
import type { CommercialAccess, EffectiveCommercialAccess } from "@/lib/account-lifecycle";

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
}

export interface AuthContext {
  user: { id: string; name: string; email: string };
  activeOrg: OrgSummary;
  role: string;
  /** The active org's real plan tier (from the platform control plane). */
  plan: PlanTier;
  commercialAccess: CommercialAccess;
  effectiveCommercialAccess: EffectiveCommercialAccess;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  memberships: OrgSummary[];
}
