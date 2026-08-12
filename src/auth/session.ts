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
import type { AuthContext, OrgSummary } from "@/auth/types";

export type { AuthContext, OrgSummary };

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type ContextReason = "UNAUTHENTICATED" | "NO_ORGANIZATION";

type Resolved =
  | { ok: true; session: Session; orgs: OrgSummary[]; activeId: string; role: string }
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
  return { ok: true, session, orgs, activeId, role };
}

/** Minimal, authoritative context for server actions. */
export interface ActionAuthContext {
  userId: string;
  organizationId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export type AuthContextResult =
  | { ok: true; ctx: ActionAuthContext }
  | { ok: false; reason: ContextReason };

/** Resolve action context from explicit request headers (no redirects). */
export async function getAuthContext(reqHeaders: Headers): Promise<AuthContextResult> {
  const r = await resolveContext(reqHeaders);
  if (!r.ok) return { ok: false, reason: r.reason };
  return {
    ok: true,
    ctx: {
      userId: r.session.user.id,
      organizationId: r.activeId,
      role: r.role,
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
  await ensureOrganizationProfile(r.activeId).catch(() => {});
  const active = r.orgs.find((o) => o.id === r.activeId)!;
  return {
    user: { id: r.session.user.id, name: r.session.user.name, email: r.session.user.email },
    activeOrg: { id: active.id, name: active.name, slug: active.slug },
    role: r.role,
    memberships: r.orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
  };
}
