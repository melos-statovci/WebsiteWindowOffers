// Organization-profile lifecycle helpers. Kept free of any `./index` (auth)
// import so it can be used inside Better Auth's organizationCreation hook
// without a circular dependency.

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { runWithOrg } from "@/db/tenant";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical lowercase/uppercase UUID string. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Guarantee an organization_profiles row exists for `orgId`. Idempotent and
 * RLS-correct: it runs inside withOrg(orgId), so the INSERT ... ON CONFLICT
 * satisfies the tenant WITH CHECK policy. Safe to call from the org-creation
 * hook (best-effort) AND lazily from the app shell (authoritative recovery),
 * so no organization is ever left without a profile.
 */
export async function ensureOrganizationProfile(orgId: string): Promise<void> {
  if (!isUuid(orgId)) throw new Error("ensureOrganizationProfile: invalid organization id");
  await runWithOrg(db, orgId, async (tx) => {
    await tx.execute(
      sql`insert into organization_profiles (organization_id) values (${orgId}) on conflict (organization_id) do nothing`,
    );
  });
}
