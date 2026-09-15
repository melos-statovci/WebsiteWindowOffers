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
//   1. createOrAdoptApplicationOrganization — exactly-once Trial Application
//      organization creation, keyed on immutable provisioning_application_id.
//      The legacy slug-keyed helper remains only for non-application fixtures.
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
import { runWithTrustedProvisioningIdentity } from "@/auth/provisioning-identity";

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

export class ProvisioningIdentityConflictError extends Error {
  constructor(message = "Provisioning organization identity conflicts with the application.") {
    super(message);
    this.name = "ProvisioningIdentityConflictError";
  }
}

export class ProvisioningOwnerMembershipConflictError extends Error {
  constructor(message = "Provisioning owner membership is incompatible with safe repair.") {
    super(message);
    this.name = "ProvisioningOwnerMembershipConflictError";
  }
}

export interface ProvisioningOrganization {
  id: string;
  name: string;
  slug: string;
  provisioningApplicationId: string;
  provisioningOwnerId: string;
}

function assertProvisioningIdentity(
  organization: ProvisioningOrganization,
  applicationId: string,
  ownerUserId: string,
): ProvisioningOrganization {
  if (
    organization.provisioningApplicationId !== applicationId ||
    organization.provisioningOwnerId !== ownerUserId
  ) {
    throw new ProvisioningIdentityConflictError();
  }
  return organization;
}

async function findProvisioningOrganizationById(
  organizationId: string,
): Promise<ProvisioningOrganization | null> {
  const res = await db.execute(sql`
    select id, name, slug,
           provisioning_application_id as "provisioningApplicationId",
           provisioning_owner_id as "provisioningOwnerId"
    from organization
    where id = ${organizationId}
    limit 1
  `);
  return (res.rows[0] as unknown as ProvisioningOrganization | undefined) ?? null;
}

export async function findOrganizationByProvisioningApplicationId(
  applicationId: string,
): Promise<ProvisioningOrganization | null> {
  const res = await db.execute(sql`
    select id, name, slug,
           provisioning_application_id as "provisioningApplicationId",
           provisioning_owner_id as "provisioningOwnerId"
    from organization
    where provisioning_application_id = ${applicationId}
    limit 2
  `);
  if (res.rows.length > 1) throw new ProvisioningIdentityConflictError();
  return (res.rows[0] as unknown as ProvisioningOrganization | undefined) ?? null;
}

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

interface OwnerMembershipState {
  intendedRole: string | null;
  intendedCount: number;
  unrelatedOwnerCount: number;
}

async function readOwnerMembershipState(
  organizationId: string,
  ownerUserId: string,
): Promise<OwnerMembershipState> {
  const res = await db.execute(sql`
    select
      count(*) filter (where user_id = ${ownerUserId})::int as intended_count,
      max(role) filter (where user_id = ${ownerUserId}) as intended_role,
      count(*) filter (
        where user_id <> ${ownerUserId}
          and 'owner' = any(string_to_array(replace(role, ' ', ''), ','))
      )::int as unrelated_owner_count
    from member
    where organization_id = ${organizationId}
  `);
  const row = res.rows[0] as {
    intended_count: number;
    intended_role: string | null;
    unrelated_owner_count: number;
  };
  return {
    intendedCount: Number(row.intended_count),
    intendedRole: row.intended_role,
    unrelatedOwnerCount: Number(row.unrelated_owner_count),
  };
}

function roleContainsOwner(role: string | null): boolean {
  return role?.split(",").some((value) => value.trim() === "owner") ?? false;
}

/**
 * Repair only the intended applicant's missing canonical Better Auth member.
 * The application link and both immutable organization fields are re-checked
 * immediately before the provider's server-only addMember path is used.
 */
export async function repairProvisioningOwnerMembership(input: {
  applicationId: string;
  organizationId: string;
  ownerUserId: string;
}): Promise<{ repaired: boolean }> {
  const authoritative = await db.execute(sql`
    select t.status, t.user_id, t.organization_id,
           o.provisioning_application_id, o.provisioning_owner_id
    from trial_applications t
    join organization o on o.id = ${input.organizationId}
    where t.id = ${input.applicationId}
    limit 1
  `);
  const row = authoritative.rows[0] as {
    status: string;
    user_id: string;
    organization_id: string | null;
    provisioning_application_id: string | null;
    provisioning_owner_id: string | null;
  } | undefined;
  if (
    !row ||
    row.status !== "approved" ||
    row.user_id !== input.ownerUserId ||
    row.organization_id !== input.organizationId ||
    row.provisioning_application_id !== input.applicationId ||
    row.provisioning_owner_id !== input.ownerUserId
  ) {
    throw new ProvisioningIdentityConflictError();
  }

  const before = await readOwnerMembershipState(input.organizationId, input.ownerUserId);
  if (before.intendedCount > 1) throw new ProvisioningOwnerMembershipConflictError();
  if (before.intendedCount === 1) {
    if (!roleContainsOwner(before.intendedRole)) throw new ProvisioningOwnerMembershipConflictError();
    return { repaired: false };
  }
  if (before.unrelatedOwnerCount > 0) throw new ProvisioningOwnerMembershipConflictError();

  try {
    await auth.api.addMember({
      body: {
        organizationId: input.organizationId,
        userId: input.ownerUserId,
        role: "owner",
      },
    });
  } catch (error) {
    // Concurrent repairs converge on the UNIQUE (organization_id,user_id)
    // backstop. Treat the losing provider call as success only after re-reading
    // the exact intended owner state.
    const raced = await readOwnerMembershipState(input.organizationId, input.ownerUserId);
    if (
      raced.intendedCount === 1 &&
      roleContainsOwner(raced.intendedRole) &&
      raced.unrelatedOwnerCount === 0
    ) {
      return { repaired: false };
    }
    throw error;
  }

  const after = await readOwnerMembershipState(input.organizationId, input.ownerUserId);
  if (
    after.intendedCount !== 1 ||
    !roleContainsOwner(after.intendedRole) ||
    after.unrelatedOwnerCount > 0
  ) {
    throw new ProvisioningOwnerMembershipConflictError();
  }
  return { repaired: true };
}

export interface CreateOrAdoptResult {
  organizationId: string;
  name: string;
  slug: string;
  /** false when a previous attempt had already created this organization. */
  created: boolean;
}

/**
 * Resolve the authoritative organization for one approved Trial Application.
 *
 * A persisted application link wins and is validated first. Without a link,
 * the immutable UNIQUE application reference is the only adoption key. The
 * display slug is passed only when creating a brand-new organization and is
 * never used to identify or adopt an existing provisioned tenant.
 */
export async function createOrAdoptApplicationOrganization(input: {
  applicationId: string;
  ownerUserId: string;
  linkedOrganizationId: string | null;
  name: string;
  slug: string;
}): Promise<CreateOrAdoptResult> {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Provisioning requires an organization name.");

  if (input.linkedOrganizationId) {
    const linked = await findProvisioningOrganizationById(input.linkedOrganizationId);
    if (!linked) throw new ProvisioningIdentityConflictError("Linked provisioning organization is missing.");
    const valid = assertProvisioningIdentity(linked, input.applicationId, input.ownerUserId);
    return { organizationId: valid.id, name: valid.name, slug: valid.slug, created: false };
  }

  const existing = await findOrganizationByProvisioningApplicationId(input.applicationId);
  if (existing) {
    const valid = assertProvisioningIdentity(existing, input.applicationId, input.ownerUserId);
    return { organizationId: valid.id, name: valid.name, slug: valid.slug, created: false };
  }

  try {
    await runWithTrustedProvisioningIdentity(
      { applicationId: input.applicationId, ownerUserId: input.ownerUserId },
      () => auth.api.createOrganization({
        body: { name, slug: input.slug, userId: input.ownerUserId },
      }),
    );
  } catch (error) {
    // A concurrent attempt may have won the immutable unique-key race, or the
    // organization INSERT may have committed before a later provider step
    // failed. Only the immutable reference is eligible for adoption.
    const adopted = await findOrganizationByProvisioningApplicationId(input.applicationId);
    if (adopted) {
      const valid = assertProvisioningIdentity(adopted, input.applicationId, input.ownerUserId);
      return { organizationId: valid.id, name: valid.name, slug: valid.slug, created: false };
    }
    throw error;
  }

  const created = await findOrganizationByProvisioningApplicationId(input.applicationId);
  if (!created) throw new ProvisioningIdentityConflictError("Created organization has no provisioning identity.");
  const valid = assertProvisioningIdentity(created, input.applicationId, input.ownerUserId);
  return { organizationId: valid.id, name: valid.name, slug: valid.slug, created: true };
}

/**
 * Legacy fixture helper — get the organization for `slug`, creating it once.
 * Trial Application provisioning must use createOrAdoptApplicationOrganization.
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
