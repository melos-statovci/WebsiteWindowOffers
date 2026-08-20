// PLATFORM-ADMIN authorization — the security foundation of the control plane.
//
// This is a SEPARATE authority from every tenant/org role (owner/admin/sales/
// operator/accounting). Being an org `owner` grants ZERO platform access. The
// ONLY source of platform authority is a row in `platform_admins` keyed to the
// Better Auth user id, read fresh server-side on every request. It is never
// derived from browser metadata, a tenant role, an env var at request time, or
// any user-editable profile field.
//
// Deliberately independent of active-organization resolution: a platform admin
// need not belong to any organization, so this MUST NOT reuse requireAuthContext
// (which forces an active org and would redirect a legitimate admin to
// /onboarding). Platform routes live outside the tenant (app) group entirely.

import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";

export interface PlatformAdminContext {
  userId: string;
  user: { id: string; name: string; email: string };
}

export type PlatformAuthResult =
  | { ok: true; ctx: PlatformAdminContext }
  | { ok: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" };

/** Is this user id a platform admin? Authoritative, fail-closed on any error. */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const res = await db.execute(sql`select 1 from platform_admins where user_id = ${userId} limit 1`);
  return res.rows.length > 0;
}

/**
 * Resolve platform-admin context from explicit request headers (no redirects) —
 * for platform server actions. Returns a typed result so the platform action
 * spine can map it to a safe error.
 */
export async function getPlatformAdminContext(reqHeaders: Headers): Promise<PlatformAuthResult> {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return { ok: false, reason: "UNAUTHENTICATED" };
  if (!(await isPlatformAdmin(session.user.id))) return { ok: false, reason: "FORBIDDEN" };
  return {
    ok: true,
    ctx: {
      userId: session.user.id,
      user: { id: session.user.id, name: session.user.name, email: session.user.email },
    },
  };
}

/**
 * Require a signed-in PLATFORM ADMIN (for platform layouts/pages). No session ->
 * /sign-in. Signed in but NOT a platform admin -> notFound(): a tenant owner/
 * admin poking at /platform gets an ordinary 404 and no acknowledgement that the
 * platform area exists, and never any cross-tenant data.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const r = await getPlatformAdminContext(await headers());
  if (!r.ok) {
    if (r.reason === "UNAUTHENTICATED") redirect("/sign-in");
    notFound();
  }
  return r.ctx;
}
