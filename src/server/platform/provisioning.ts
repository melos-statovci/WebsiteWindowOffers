// Application-level provisioning orchestration (Milestone 4).
//
// Turns ONE approved trial application into ONE new Kornizo tenant. This is the
// only place that drives src/server/provisioning.ts on behalf of an applicant,
// and it is reachable exclusively from platform-admin-gated actions.
//
// WHY THIS EXISTS AT ALL (rather than just calling the trusted helper):
// Better Auth's organization/member writes and Kornizo's profile/account/pricing
// writes do not share one SQL transaction. A crash between them would otherwise
// leave a half-built tenant, and a naive retry would create a SECOND
// organization. The guarantees below are what close that window.
//
// EXACTLY-ONCE ORGANIZATION (the important one)
//   The claim transaction persists `provisioning_slug` — derived from the
//   application id — BEFORE Better Auth is ever called, and commits. Because
//   `organization.slug` is UNIQUE, any later attempt for this application either
//   finds that organization and adopts it, or creates it. There is no input
//   under which two organizations can exist for one application, even if the
//   process dies immediately after Better Auth commits.
//
// CONCURRENCY
//   The claim runs `SELECT ... FOR UPDATE` on the application row, so two
//   simultaneous approvals serialize. The loser sees `in_progress` and is
//   rejected with PROVISIONING_IN_PROGRESS instead of racing. The stale-claim
//   window below still lets a crashed attempt be retried; correctness never
//   depends on that window, only operator ergonomics — the slug key is what
//   makes even a wrongly-concurrent attempt converge.
//
// RETRY SEMANTICS
//   Retry is safe from `failed` and from a stale `in_progress`. Every completion
//   step is idempotent, so a retry converges to exactly one profile, one
//   account, one active price list and one owner membership. Retrying a
//   `provisioned` application is a no-op that reports success.
//
// TRIAL START
//   The 14-day Standard trial begins when `ensureOrganizationAccount()` first
//   inserts the row — i.e. at successful provisioning, not at application or
//   approval time. Nothing here computes trial dates.

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getAccountState } from "@/server/platform/accounts";
import { recordAuditEvent } from "@/server/platform/audit";
import {
  completeOrganizationProvisioning,
  createOrAdoptOrganization,
  stableProvisioningSlug,
  verifyOrganizationProvisioning,
} from "@/server/provisioning";

/** How long an `in_progress` claim is respected before a retry may take it over. */
const STALE_CLAIM_MS = 2 * 60 * 1000;

export type ProvisioningStatus = "not_started" | "in_progress" | "provisioned" | "failed";

/**
 * Sanitized failure CATEGORIES. Raw Better Auth/Postgres error text is never
 * persisted, never audited and never shown to an operator — only these codes.
 */
export type ProvisioningErrorCode =
  | "ORGANIZATION_CREATE_FAILED"
  | "LINK_CONFLICT"
  | "OWNER_MEMBERSHIP_MISSING"
  | "PROFILE_MISSING"
  | "ACCOUNT_MISSING"
  | "PRICING_MISSING"
  | "UNEXPECTED";

export type ClaimRejection =
  | "NOT_FOUND"
  | "NOT_APPROVED"
  | "PROVISIONING_IN_PROGRESS";

export interface ProvisioningSuccess {
  ok: true;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  trialEndsAt: Date | null;
  /** true when the application was already fully provisioned before this call. */
  alreadyProvisioned: boolean;
}

export interface ProvisioningRejected {
  ok: false;
  kind: "rejected";
  reason: ClaimRejection;
}

export interface ProvisioningFailed {
  ok: false;
  kind: "failed";
  errorCode: ProvisioningErrorCode;
}

export type ProvisioningResult = ProvisioningSuccess | ProvisioningRejected | ProvisioningFailed;

export interface ProvisioningActor {
  userId: string;
  email: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  company_name: string;
  status: string;
  organization_id: string | null;
  provisioning_status: string;
  provisioning_slug: string | null;
  provisioning_attempts: number;
}

type Claim =
  | { ok: true; row: ApplicationRow; slug: string; attempt: number; alreadyProvisioned: false }
  | { ok: true; row: ApplicationRow; slug: string; attempt: number; alreadyProvisioned: true }
  | { ok: false; reason: ClaimRejection };

/**
 * Take (or refuse) exclusive responsibility for provisioning this application.
 * Runs in its own committed transaction so the intent — including the stable
 * slug — is durable before any external system is touched.
 */
async function claimApplication(applicationId: string): Promise<Claim> {
  return db.transaction(async (tx) => {
    const res = await tx.execute(sql`
      select id, user_id, company_name, status, organization_id,
             provisioning_status, provisioning_slug, provisioning_attempts,
             (provisioning_started_at is not null
               and provisioning_started_at > now() - (${STALE_CLAIM_MS}::text || ' milliseconds')::interval) as claim_fresh
      from trial_applications
      where id = ${applicationId}
      for update
    `);
    const row = res.rows[0] as unknown as (ApplicationRow & { claim_fresh: boolean }) | undefined;
    if (!row) return { ok: false, reason: "NOT_FOUND" };
    if (row.status !== "approved") return { ok: false, reason: "NOT_APPROVED" };

    if (row.provisioning_status === "provisioned" && row.organization_id) {
      return {
        ok: true,
        row,
        slug: row.provisioning_slug ?? "",
        attempt: row.provisioning_attempts,
        alreadyProvisioned: true,
      };
    }
    if (row.provisioning_status === "in_progress" && row.claim_fresh) {
      return { ok: false, reason: "PROVISIONING_IN_PROGRESS" };
    }

    // Persist the stable slug on the FIRST claim and never rewrite it.
    const slug = row.provisioning_slug ?? stableProvisioningSlug(row.company_name, row.id);
    const attempt = Number(row.provisioning_attempts) + 1;
    await tx.execute(sql`
      update trial_applications
      set provisioning_status = 'in_progress',
          provisioning_slug = ${slug},
          provisioning_started_at = now(),
          provisioning_attempts = ${attempt},
          provisioning_error_code = null,
          updated_at = now()
      where id = ${applicationId}
    `);
    return { ok: true, row, slug, attempt, alreadyProvisioned: false };
  });
}

/** Record a sanitized failure and audit it. Never stores raw error text. */
async function markFailed(
  applicationId: string,
  companyName: string,
  organizationId: string | null,
  errorCode: ProvisioningErrorCode,
  attempt: number,
  actor: ProvisioningActor,
): Promise<ProvisioningFailed> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update trial_applications
      set provisioning_status = 'failed',
          provisioning_error_code = ${errorCode},
          updated_at = now()
      where id = ${applicationId}
    `);
    await recordAuditEvent(tx, {
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: "TRIAL_APPLICATION_PROVISIONING_FAILED",
      organizationId,
      metadata: { trialApplicationId: applicationId, companyName, errorCode, attempt },
    });
  });
  return { ok: false, kind: "failed", errorCode };
}

export interface ProvisionedOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  commercialAccess: string;
  effectiveCommercialAccess: string;
  status: string;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
}

/**
 * Cheap platform read for the "Application -> provisioned organization" panel.
 * Canonical data only: the Better Auth organization row plus the control-plane
 * account state. No second platform representation of an organization exists.
 */
export async function getProvisionedOrganizationSummary(
  orgId: string,
): Promise<ProvisionedOrganizationSummary | null> {
  const res = await db.execute(sql`select id, name, slug from organization where id = ${orgId} limit 1`);
  const row = res.rows[0] as { id: string; name: string; slug: string } | undefined;
  if (!row) return null;
  const account = await getAccountState(orgId);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: account.plan,
    commercialAccess: account.commercialAccess,
    effectiveCommercialAccess: account.effectiveCommercialAccess,
    status: account.status,
    trialStartedAt: account.trialStartedAt,
    trialEndsAt: account.trialEndsAt,
    trialDaysRemaining: account.trialDaysRemaining,
  };
}

/**
 * Drive one approved application to a fully provisioned tenant.
 * Idempotent, concurrency-safe and resumable (see the file header).
 */
export async function provisionApprovedTrialApplication(
  applicationId: string,
  actor: ProvisioningActor,
): Promise<ProvisioningResult> {
  const claim = await claimApplication(applicationId);
  if (!claim.ok) return { ok: false, kind: "rejected", reason: claim.reason };

  const { row, slug, attempt } = claim;

  if (claim.alreadyProvisioned) {
    const organizationId = row.organization_id!;
    const account = await getAccountState(organizationId);
    const org = await db.execute(sql`select name, slug from organization where id = ${organizationId} limit 1`);
    const orgRow = org.rows[0] as { name?: string; slug?: string } | undefined;
    return {
      ok: true,
      organizationId,
      organizationName: orgRow?.name ?? row.company_name,
      organizationSlug: orgRow?.slug ?? slug,
      trialEndsAt: account.trialEndsAt,
      alreadyProvisioned: true,
    };
  }

  // 1. Exactly-once organization (create, or adopt one a prior attempt made).
  let organization: { organizationId: string; name: string; slug: string };
  try {
    organization = await createOrAdoptOrganization({
      userId: row.user_id,
      name: row.company_name,
      slug,
    });
  } catch (e) {
    console.error("[provisioning] organization create/adopt failed:", e);
    return markFailed(applicationId, row.company_name, null, "ORGANIZATION_CREATE_FAILED", attempt, actor);
  }

  // 2. Record the linkage IMMEDIATELY, so a crash in step 3 still leaves the
  //    organization discoverable through the application (belt and braces —
  //    the slug alone would already find it).
  try {
    const linked = await db.execute(sql`
      update trial_applications
      set organization_id = ${organization.organizationId},
          updated_at = now()
      where id = ${applicationId}
        and (organization_id is null or organization_id = ${organization.organizationId})
    `);
    if (linked.rowCount === 0) {
      return markFailed(applicationId, row.company_name, null, "LINK_CONFLICT", attempt, actor);
    }
  } catch (e) {
    console.error("[provisioning] organization linkage failed:", e);
    return markFailed(applicationId, row.company_name, null, "LINK_CONFLICT", attempt, actor);
  }

  // 3. Idempotent completion: profile + account (starts the 14-day trial) +
  //    default pricing, then verify all four invariants.
  let verification;
  try {
    verification = await completeOrganizationProvisioning({
      organizationId: organization.organizationId,
      ownerUserId: row.user_id,
    });
  } catch (e) {
    console.error("[provisioning] completion steps failed:", e);
    verification = await verifyOrganizationProvisioning(organization.organizationId, row.user_id).catch(() => null);
    if (!verification) {
      return markFailed(applicationId, row.company_name, organization.organizationId, "UNEXPECTED", attempt, actor);
    }
  }

  const missing: ProvisioningErrorCode | null = !verification.ownerMembership
    ? "OWNER_MEMBERSHIP_MISSING"
    : !verification.profile
      ? "PROFILE_MISSING"
      : !verification.account
        ? "ACCOUNT_MISSING"
        : !verification.activePricing
          ? "PRICING_MISSING"
          : null;
  if (missing) {
    return markFailed(applicationId, row.company_name, organization.organizationId, missing, attempt, actor);
  }

  // 4. Mark provisioned + audit atomically.
  const account = await getAccountState(organization.organizationId);
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update trial_applications
      set provisioning_status = 'provisioned',
          provisioned_at = coalesce(provisioned_at, now()),
          provisioning_error_code = null,
          updated_at = now()
      where id = ${applicationId}
        and organization_id = ${organization.organizationId}
    `);
    await recordAuditEvent(tx, {
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: "TRIAL_APPLICATION_PROVISIONED",
      organizationId: organization.organizationId,
      organizationName: organization.name,
      metadata: {
        trialApplicationId: applicationId,
        companyName: row.company_name,
        organizationId: organization.organizationId,
        organizationSlug: organization.slug,
        plan: account.plan,
        commercialAccess: account.commercialAccess,
        trialEndsAt: account.trialEndsAt ? account.trialEndsAt.toISOString() : null,
        attempt,
      },
    });
  });

  return {
    ok: true,
    organizationId: organization.organizationId,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    trialEndsAt: account.trialEndsAt,
    alreadyProvisioned: false,
  };
}
