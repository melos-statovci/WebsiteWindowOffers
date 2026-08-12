// Server-side session/authorization context. The ACTIVE ORGANIZATION is derived
// only from Better Auth's server session — never from client input. A client may
// request a switch, but membership is always re-verified server-side.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { ensureOrganizationProfile, isUuid } from "@/auth/organization";
import type { AuthContext, OrgSummary } from "@/auth/types";

export type { AuthContext, OrgSummary };

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

/**
 * Require a signed-in user WITH a valid active organization. Handles:
 *  - no session            -> /sign-in
 *  - no memberships        -> /onboarding
 *  - unset/stale/malformed activeOrganizationId -> re-point to a real membership
 * Also lazily ensures the active org's profile row exists.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) redirect("/sign-in");

  const orgs = (await auth.api.listOrganizations({ headers: h })) as OrgSummary[];
  if (!orgs || orgs.length === 0) redirect("/onboarding");

  const current = session.session.activeOrganizationId;
  const valid = isUuid(current) && orgs.some((o) => o.id === current);
  const activeId = valid ? (current as string) : orgs[0].id;

  if (!valid) {
    // Unset, malformed, or points at an org the user is no longer in.
    await auth.api.setActiveOrganization({ headers: h, body: { organizationId: activeId } });
  }

  const active = orgs.find((o) => o.id === activeId)!;
  const role = await memberRole(activeId, session.user.id);
  await ensureOrganizationProfile(activeId).catch(() => {});

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    activeOrg: { id: active.id, name: active.name, slug: active.slug },
    role,
    memberships: orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
  };
}
