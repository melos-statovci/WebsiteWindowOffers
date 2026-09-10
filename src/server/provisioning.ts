// TRUSTED, SERVER-ONLY tenant provisioning primitives.
//
// Nothing here has a "use server" wrapper and nothing here is imported by a
// public route/action. Better Auth is configured with
// allowUserToCreateOrganization:false, so a session-based createOrganization is
// rejected; these helpers use its server-only `userId` path, which is exactly
// why they must stay unreachable from user-driven code. Callers are: the
// platform-admin provisioning flow (src/server/platform/provisioning.ts) and
// DEV/test fixtures.
//
// The functions are split into RESUMABLE PHASES so a partially provisioned
// tenant can be driven to completion instead of being recreated:
//
//   1. createOrAdoptOrganization  — exactly-once org creation, keyed on a
//      caller-supplied stable slug (organization.slug is UNIQUE).
//   2. completeOrganizationProvisioning — idempotent profile + account +
//      pricing, then a verification read.
//
// createTrustedProvisionedOrganization() composes both for callers that do not
// need application-level bookkeeping (fixtures/tests).

import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { runWithOrg } from "@/db/tenant";
import { ensureOrganizationProfile } from "@/auth/organization";
import { ensureDefaultPricing } from "@/server/pricing-init";
import { ensureOrganizationAccount } from "@/server/platform/accounts";
import { organizationSlugBase, stableProvisioningSlug } from "@/lib/provisioning-slug";

export interface TrustedOrganizationProvisioningInput {
  userId: string;
  name: string;
  slug?: string;
}

/** Random slug for callers with no stable record id (fixtures/tests). */
function slugify(name: string): string {
  return `${organizationSlugBase(name) || "org"}-${randomBytes(3).toString("hex")}`;
}

export { stableProvisioningSlug };

/** Look up an organization by its unique slug. Trusted, non-RLS read. */
export async function findOrganizationBySlug(
  slug: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const res = await db.execute(
    sql`select id, name, slug from organization where slug = ${slug} limit 1`,
  );
  const row = res.rows[0] as { id: string; name: string; slug: string } | undefined;
  return row ?? null;
}

/** True when `userId` holds the owner role in `orgId`. */
export async function isOrganizationOwner(orgId: string, userId: string): Promise<boolean> {
  const res = await db.execute(
    sql`select role from member where organization_id = ${orgId} and user_id = ${userId} limit 1`,
  );
  const row = res.rows[0] as { role?: string } | undefined;
  return row?.role === "owner";
}

export interface CreateOrAdoptResult {
  organizationId: string;
  name: string;
  slug: string;
  /** false when a previous attempt had already created this organization. */
  created: boolean;
}

/**
 * PHASE 1 — get the organization for `slug`, creating it exactly once.
 *
 * Ordering is deliberate: look up FIRST (so a resumed attempt adopts the
 * organization an earlier crashed attempt created), then create, then look up
 * ONE more time if creation failed (so a lost unique-slug race also adopts
 * rather than erroring). The applicant becomes the Better Auth `owner` through
 * Better Auth's own organization-creation path; no parallel owner table exists.
 */
export async function createOrAdoptOrganization(input: {
  userId: string;
  name: string;
  slug: string;
}): Promise<CreateOrAdoptResult> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Provisioning requires an organization name.");

  const existing = await findOrganizationBySlug(input.slug);
  if (existing) {
    return { organizationId: existing.id, name: existing.name, slug: existing.slug, created: false };
  }

  try {
    const organization = (await auth.api.createOrganization({
      body: { name, slug: input.slug, userId: input.userId },
    })) as { id: string; name: string; slug: string };
    return { organizationId: organization.id, name: organization.name, slug: organization.slug, created: true };
  } catch (e) {
    // Either a concurrent attempt won the unique slug, or the organization row
    // committed and a later step in Better Auth's own call threw. Both are
    // recoverable by adopting the row that now exists.
    const adopted = await findOrganizationBySlug(input.slug);
    if (adopted) {
      return { organizationId: adopted.id, name: adopted.name, slug: adopted.slug, created: false };
    }
    throw e;
  }
}

export interface ProvisioningVerification {
  ownerMembership: boolean;
  profile: boolean;
  account: boolean;
  activePricing: boolean;
}

/**
 * Read back the four things a usable tenant needs.
 *
 * `member` and `organization_accounts` are control-plane/non-RLS and are read
 * on the pool. `organization_profiles` and `price_lists` are tenant RLS+FORCE
 * tables, so they are read INSIDE withOrg(orgId) — this verification deliberately
 * proves the rows are visible under the tenant's own RLS context rather than
 * bypassing it.
 */
export async function verifyOrganizationProvisioning(
  orgId: string,
  ownerUserId: string,
): Promise<ProvisioningVerification> {
  const controlPlane = await db.execute(sql`
    select
      (select count(*)::int from member where organization_id = ${orgId} and user_id = ${ownerUserId} and role = 'owner') as owner_membership,
      (select count(*)::int from organization_accounts where organization_id = ${orgId}) as account
  `);
  const cp = controlPlane.rows[0] as { owner_membership: number; account: number };

  const tenant = await runWithOrg(db, orgId, async (tx) => {
    const res = await tx.execute(sql`
      select
        (select count(*)::int from organization_profiles where organization_id = ${orgId}) as profile,
        (select count(*)::int from price_lists where organization_id = ${orgId} and is_active) as active_pricing
    `);
    return res.rows[0] as { profile: number; active_pricing: number };
  });

  return {
    ownerMembership: Number(cp.owner_membership) > 0,
    account: Number(cp.account) > 0,
    profile: Number(tenant.profile) > 0,
    activePricing: Number(tenant.active_pricing) === 1,
  };
}

/**
 * PHASE 2 — bring an existing organization to a fully usable tenant.
 *
 * Every step is idempotent (INSERT ... ON CONFLICT DO NOTHING), so this is safe
 * to re-run against a partially provisioned organization and converges to
 * exactly one profile, one account and one active price list.
 *
 * The 14-day Kornizo Standard trial starts HERE, and only here:
 * ensureOrganizationAccount() is the single writer of trial_started_at /
 * trial_ends_at for a new organization. No caller computes its own trial dates.
 */
export async function completeOrganizationProvisioning(input: {
  organizationId: string;
  ownerUserId: string;
}): Promise<ProvisioningVerification> {
  await ensureOrganizationProfile(input.organizationId);
  await ensureOrganizationAccount(input.organizationId);
  await ensureDefaultPricing(input.organizationId, input.ownerUserId);
  return verifyOrganizationProvisioning(input.organizationId, input.ownerUserId);
}

/**
 * Compose both phases. Used by DEV/test fixtures and any trusted caller that
 * does not track application-level provisioning state itself.
 */
export async function createTrustedProvisionedOrganization(input: TrustedOrganizationProvisioningInput) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Provisioning requires an organization name.");
  const slug = input.slug ?? slugify(name);
  const org = await createOrAdoptOrganization({ userId: input.userId, name, slug });
  await completeOrganizationProvisioning({ organizationId: org.organizationId, ownerUserId: input.userId });
  return { id: org.organizationId, name: org.name, slug: org.slug };
}
