// Server-only authorization. There is ONE source of role truth: the Better Auth
// access-control roles defined in src/auth/permissions.ts. can() simply asks the
// canonical role object whether it authorizes a permission — it never re-encodes
// a role→permission matrix here, so the two can't drift.

import { roles, statement, type AppRole } from "@/auth/permissions";

/** A permission request: resource -> required actions, typed against the statement. */
export type Permission = {
  [K in keyof typeof statement]?: (typeof statement)[K][number][];
};

/** Does this role authorize the requested permission? Unknown roles are denied. */
export function can(role: string, permission: Permission): boolean {
  const r = roles[role as AppRole];
  if (!r) return false;
  // Better Auth role.authorize returns { success }. Default connector is AND.
  return r.authorize(permission as Parameters<typeof r.authorize>[0]).success === true;
}
