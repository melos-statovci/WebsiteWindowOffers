// Pure auth context types — safe to import from client components (no server
// dependencies). The concrete resolution lives in session.ts (server-only).

import type { PlanTier } from "@/lib/plan";

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
  memberships: OrgSummary[];
}
