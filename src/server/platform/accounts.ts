// Low-level control-plane account state (plan + suspension status), used BOTH by
// the tenant runtime (to read its OWN account) and by the platform admin area
// (to read/write ANY org's account).
//
// organization_accounts carries NO tenant RLS (see schema/platform.ts), so these
// helpers query the shared pool directly and scope by organization_id in code —
// exactly like session.ts already reads the non-RLS `member` table. A tenant
// caller only ever passes its own session-derived org id; it can NEVER widen its
// own access, because it cannot forge the platform-admin gate that the platform
// readers below sit behind.

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { asPlanTier, type PlanTier } from "@/lib/plan";

export type AccountStatus = "active" | "suspended";

export interface AccountState {
  plan: PlanTier;
  status: AccountStatus;
  suspendedReason: string | null;
}

/** A missing account row degrades to an active SOLO account (never a lockout). */
const DEFAULT_STATE: AccountState = { plan: "SOLO", status: "active", suspendedReason: null };

/**
 * The plan + suspension status for ONE organization. Direct pooled read (no RLS
 * on this table); the caller is responsible for passing a legitimate org id
 * (tenant: its session's active org; platform: a validated target org).
 */
export async function getAccountState(orgId: string): Promise<AccountState> {
  const res = await db.execute(
    sql`select plan, status, suspended_reason from organization_accounts where organization_id = ${orgId} limit 1`,
  );
  const row = res.rows[0] as
    | { plan?: string; status?: string; suspended_reason?: string | null }
    | undefined;
  if (!row) return DEFAULT_STATE;
  return {
    plan: asPlanTier(row.plan),
    status: row.status === "suspended" ? "suspended" : "active",
    suspendedReason: row.suspended_reason ?? null,
  };
}

/**
 * Guarantee an organization_accounts row exists (default active SOLO). Idempotent
 * and best-effort — a missing row is already handled by getAccountState's
 * default, so callers never need to await success. Used by the org-creation hook.
 */
export async function ensureOrganizationAccount(orgId: string): Promise<void> {
  await db.execute(
    sql`insert into organization_accounts (organization_id) values (${orgId}) on conflict (organization_id) do nothing`,
  );
}
