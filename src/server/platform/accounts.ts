// Low-level control-plane account state (plan + commercial access + suspension
// status), used BOTH by the tenant runtime (to read its OWN account) and by the
// platform admin area (to read/write ANY org's account).
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
import {
  effectiveCommercialAccess,
  trialDaysRemaining,
  type AccountStatus,
  type CommercialAccess,
  type EffectiveCommercialAccess,
} from "@/lib/account-lifecycle";

export type { AccountStatus, CommercialAccess, EffectiveCommercialAccess };

export interface AccountState {
  accountReady: boolean;
  plan: PlanTier;
  status: AccountStatus;
  commercialAccess: CommercialAccess;
  effectiveCommercialAccess: EffectiveCommercialAccess;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  activatedAt: Date | null;
  trialDaysRemaining: number;
  serverNow: Date;
  suspendedReason: string | null;
}

function toDate(value: string | Date | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * The product/commercial/suspension state for ONE organization. Direct pooled
 * read (no RLS on this table); the caller is responsible for passing a
 * legitimate org id (tenant: its session's active org; platform: a validated
 * target org).
 */
export async function getAccountState(orgId: string): Promise<AccountState> {
  const res = await db.execute(
    sql`
      select
        plan,
        status,
        commercial_access,
        trial_started_at,
        trial_ends_at,
        activated_at,
        suspended_reason,
        now() as server_now
      from organization_accounts
      where organization_id = ${orgId}
      limit 1
    `,
  );
  const row = res.rows[0] as
    | {
        plan?: string;
        status?: string;
        commercial_access?: string;
        trial_started_at?: string | Date | null;
        trial_ends_at?: string | Date | null;
        activated_at?: string | Date | null;
        suspended_reason?: string | null;
        server_now?: string | Date;
      }
    | undefined;
  const now = toDate(row?.server_now) ?? new Date();
  if (!row) {
    return {
      accountReady: false,
      plan: "STANDARD",
      status: "active",
      commercialAccess: "trial",
      effectiveCommercialAccess: "account_not_ready",
      trialStartedAt: null,
      trialEndsAt: null,
      activatedAt: null,
      trialDaysRemaining: 0,
      serverNow: now,
      suspendedReason: null,
    };
  }
  const commercialAccess: CommercialAccess = row.commercial_access === "active" ? "active" : "trial";
  const trialStartedAt = toDate(row.trial_started_at);
  const trialEndsAt = toDate(row.trial_ends_at);
  return {
    accountReady: true,
    plan: asPlanTier(row.plan),
    status: row.status === "suspended" ? "suspended" : "active",
    commercialAccess,
    effectiveCommercialAccess: effectiveCommercialAccess({ commercialAccess, trialEndsAt, now }),
    trialStartedAt,
    trialEndsAt,
    activatedAt: toDate(row.activated_at),
    trialDaysRemaining: trialDaysRemaining({ trialEndsAt, now }),
    serverNow: now,
    suspendedReason: row.suspended_reason ?? null,
  };
}

/**
 * Guarantee an organization_accounts row exists (default 14-day full Standard
 * trial). Idempotent and best-effort for trusted provisioning paths; callers
 * that need tenant access must still fail closed when this row is missing.
 */
export async function ensureOrganizationAccount(orgId: string): Promise<void> {
  await db.execute(
    sql`
      insert into organization_accounts (organization_id, plan, commercial_access, trial_started_at, trial_ends_at)
      values (${orgId}, 'STANDARD', 'trial', now(), now() + interval '14 days')
      on conflict (organization_id) do nothing
    `,
  );
}
