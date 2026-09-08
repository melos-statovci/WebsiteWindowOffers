// Server-side session/authorization context. The ACTIVE ORGANIZATION is derived
// only from Better Auth's server session — never from client input. A client may
// request a switch, but membership is always re-verified server-side.
//
// Two entry points share ONE resolution core (resolveContext):
//   - requireAuthContext()  -> for LAYOUTS; redirects on failure.
//   - getAuthContext(headers) -> for SERVER ACTIONS; returns a typed result.
// The member ROLE is always read fresh from the member table (authoritative), so
// a stale session cannot carry an outdated/removed role into a mutation.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { ensureOrganizationProfile, isUuid } from "@/auth/organization";
import { getAccountState, type AccountState } from "@/server/platform/accounts";
import type { PlanTier } from "@/lib/plan";
import type { CommercialAccess, EffectiveCommercialAccess } from "@/lib/account-lifecycle";
import type { AuthContext, OrgSummary } from "@/auth/types";

export type { AuthContext, OrgSummary };

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type ContextReason = "UNAUTHENTICATED" | "NO_ORGANIZATION" | "SUSPENDED" | "TRIAL_EXPIRED";

type Resolved =
  | { ok: true; session: Session; orgs: OrgSummary[]; activeId: string; role: string; account: AccountState }
  | { ok: false; reason: ContextReason };

/** Raw session (or null) — for optimistic checks / already-signed-in redirects. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function memberRole(orgId: string, userId: string): Promise<string> {
  // member has no RLS; the restricted role has SELECT on it.
  const res = await db.execute(
    sql`select role from member where organization_id = ${orgId} and user_id = ${userId} limit 1`,
  );
  const row = res.rows[0] as { role?: string } | undefined;
  return row?.role ?? "member";
}

/** Shared core: validate session, resolve a real active org, read the live role. */
async function resolveContext(reqHeaders: Headers): Promise<Resolved> {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return { ok: false, reason: "UNAUTHENTICATED" };

  const orgs = (await auth.api.listOrganizations({ headers: reqHeaders })) as OrgSummary[];
  if (!orgs || orgs.length === 0) return { ok: false, reason: "NO_ORGANIZATION" };

  const current = session.session.activeOrganizationId;
  const valid = isUuid(current) && orgs.some((o) => o.id === current);
  const activeId = valid ? (current as string) : orgs[0].id;
  if (!valid) {
    // Unset, malformed, or points at an org the user is no longer in.
    await auth.api.setActiveOrganization({ headers: reqHeaders, body: { organizationId: activeId } });
  }

  const role = await memberRole(activeId, session.user.id);
  // Platform account state (plan + commercial access + suspension) for the
  // active org. Read from the control plane; a missing row degrades to active
  // Standard. Suspension and trial expiry are enforced by the two entry points
  // below (layout redirect + action FORBIDDEN).
  const account = await getAccountState(activeId);
  return { ok: true, session, orgs, activeId, role, account };
}

/** Minimal, authoritative context for server actions. */
export interface ActionAuthContext {
  userId: string;
  organizationId: string;
  role: string;
  plan: PlanTier;
  commercialAccess: CommercialAccess;
  effectiveCommercialAccess: EffectiveCommercialAccess;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
  user: { id: string; name: string; email: string };
}

export type AuthContextResult =
  | { ok: true; ctx: ActionAuthContext }
  | { ok: false; reason: ContextReason };

/** Resolve action context from explicit request headers (no redirects). */
export async function getAuthContext(reqHeaders: Headers): Promise<AuthContextResult> {
  const r = await resolveContext(reqHeaders);
  if (!r.ok) return { ok: false, reason: r.reason };
  // Fail closed for a suspended/expired tenant: no business mutation may
  // proceed. The action spine maps these non-UNAUTHENTICATED reasons to a safe
  // FORBIDDEN.
  if (r.account.status === "suspended") return { ok: false, reason: "SUSPENDED" };
  if (r.account.effectiveCommercialAccess === "trial_expired") return { ok: false, reason: "TRIAL_EXPIRED" };
  return {
    ok: true,
    ctx: {
      userId: r.session.user.id,
      organizationId: r.activeId,
      role: r.role,
      plan: r.account.plan,
      commercialAccess: r.account.commercialAccess,
      effectiveCommercialAccess: r.account.effectiveCommercialAccess,
      trialEndsAt: r.account.trialEndsAt,
      trialDaysRemaining: r.account.trialDaysRemaining,
      user: { id: r.session.user.id, name: r.session.user.name, email: r.session.user.email },
    },
  };
}

/**
 * Require a signed-in user WITH a valid active organization (for layouts).
 * Redirects to /sign-in (no session) or /onboarding (no org). Also lazily
 * ensures the active org's profile row exists.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const r = await resolveContext(await headers());
  if (!r.ok) {
    redirect(r.reason === "UNAUTHENTICATED" ? "/sign-in" : "/onboarding");
  }
  // Suspension gate for the whole tenant app shell. A suspended org's members
  // are sent to /suspended instead of the app; no business data is touched, and
  // platform admins (who never pass through here) can still manage the org.
  if (r.account.status === "suspended") redirect("/suspended");
  if (r.account.effectiveCommercialAccess === "trial_expired") redirect("/trial-expired");
  await ensureOrganizationProfile(r.activeId).catch(() => {});
  const active = r.orgs.find((o) => o.id === r.activeId)!;
  return {
    user: { id: r.session.user.id, name: r.session.user.name, email: r.session.user.email },
    activeOrg: { id: active.id, name: active.name, slug: active.slug },
    role: r.role,
    plan: r.account.plan,
    commercialAccess: r.account.commercialAccess,
    effectiveCommercialAccess: r.account.effectiveCommercialAccess,
    trialEndsAt: r.account.trialEndsAt,
    trialDaysRemaining: r.account.trialDaysRemaining,
    memberships: r.orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
  };
}

export interface TrialExpiredContext {
  user: { id: string; name: string; email: string };
  activeOrg: OrgSummary;
  plan: PlanTier;
  trialEndsAt: Date | null;
}

/** Require exactly a signed-in tenant whose active organization trial has expired. */
export async function requireTrialExpiredContext(): Promise<TrialExpiredContext> {
  const r = await resolveContext(await headers());
  if (!r.ok) {
    redirect(r.reason === "UNAUTHENTICATED" ? "/sign-in" : "/onboarding");
  }
  if (r.account.status === "suspended") redirect("/suspended");
  if (r.account.effectiveCommercialAccess !== "trial_expired") redirect("/dashboard");
  const active = r.orgs.find((o) => o.id === r.activeId)!;
  return {
    user: { id: r.session.user.id, name: r.session.user.name, email: r.session.user.email },
    activeOrg: { id: active.id, name: active.name, slug: active.slug },
    plan: r.account.plan,
    trialEndsAt: r.account.trialEndsAt,
  };
}
