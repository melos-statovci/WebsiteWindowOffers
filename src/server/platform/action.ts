// The PLATFORM action spine — the control-plane analogue of createAction.
//
// It deliberately does NOT reuse the tenant createAction: that spine resolves
// the caller's active organization from their session and runs withOrg() scoped
// to it. Platform mutations are different in kind — they are authorized by
// platform-admin status (not a tenant role), and they operate on a TARGET
// organization chosen in the request, not the admin's own active org (a platform
// admin may have no org at all). So this spine:
//
//   validate (Zod) -> authenticate -> verify PLATFORM ADMIN -> handler -> safe
//   typed result -> revalidate
//
// Reuses the tenant spine's ActionResult / ActionError / ActionFailure shapes so
// the client handling and the "no raw DB error ever leaks" guarantee are
// identical. Accepting a target org id from the request is safe HERE (unlike a
// tenant action) precisely because a platform admin is authorized over every
// org — the id is still validated to be a real organization before use.

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { AppDatabase } from "@/db/tenant";
import {
  ActionFailure,
  fail,
  type ActionResult,
} from "@/server/action";
import { getPlatformAdminContext, type PlatformAdminContext } from "@/server/platform/auth";

export { fail };
export type { ActionResult };

const SAFE = {
  UNAUTHENTICATED: "Nuk jeni i kyçur.",
  FORBIDDEN: "Nuk keni leje për këtë veprim.",
  INTERNAL: "Ndodhi një gabim i papritur. Provoni përsëri.",
} as const;

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

interface PlatformActionConfig<I, O> {
  input: ZodType<I>;
  revalidate?: string[];
  handler: (args: { input: I; ctx: PlatformAdminContext; db: AppDatabase }) => Promise<O>;
}

export function createPlatformAction<I, O>(config: PlatformActionConfig<I, O>) {
  return async (rawInput: unknown, reqHeaders: Headers): Promise<ActionResult<O>> => {
    // 1. Validation (authoritative, server-side).
    const parsed = config.input.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) } };
    }

    // 2. Authenticate + verify PLATFORM ADMIN (server-authoritative).
    const auth = await getPlatformAdminContext(reqHeaders);
    if (!auth.ok) {
      return auth.reason === "UNAUTHENTICATED"
        ? { ok: false, error: { code: "UNAUTHENTICATED", message: SAFE.UNAUTHENTICATED } }
        : { ok: false, error: { code: "FORBIDDEN", message: SAFE.FORBIDDEN } };
    }

    // 3. Handler (control-plane writes go to non-RLS organization_accounts).
    let data: O;
    try {
      data = await config.handler({ input: parsed.data, ctx: auth.ctx, db });
    } catch (e) {
      if (e instanceof ActionFailure) {
        return { ok: false, error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } };
      }
      console.error("[platform-action] internal error:", e);
      return { ok: false, error: { code: "INTERNAL", message: SAFE.INTERNAL } };
    }

    // 4. Revalidate (best-effort).
    if (config.revalidate?.length) {
      try {
        for (const p of config.revalidate) revalidatePath(p);
      } catch {
        /* not in a request scope (tests) */
      }
    }

    return { ok: true, data };
  };
}

/** Assert a target org id is a real organization; throws NOT_FOUND otherwise. */
export async function assertOrganizationExists(orgId: string): Promise<void> {
  const res = await db.execute(sql`select 1 from organization where id = ${orgId} limit 1`);
  if (res.rows.length === 0) throw fail("NOT_FOUND", "Organizata nuk u gjet.");
}
