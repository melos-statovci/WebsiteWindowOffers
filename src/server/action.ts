// The reusable authorized server-action spine. Every future business mutation
// composes through createAction:
//
//   validate (Zod) -> authenticate -> resolve trusted active org -> authorize
//   -> withOrg (RLS-scoped tx) -> handler -> safe typed result -> revalidate
//
// The generic wrapper only orchestrates BOUNDARIES. Domain logic lives in each
// action's handler. Raw DB errors never reach the client — unexpected failures
// are logged server-side and returned as a generic INTERNAL result.
//
// NOTE: this module is intentionally NOT a "use server" file. It takes request
// headers explicitly so it is unit-testable. The thin "use server" wrappers
// (e.g. *.action.ts) call it with `await headers()`.

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { db } from "@/db/client";
import { runWithOrg, type TenantTx } from "@/db/tenant";
import { getAuthContext, type ActionAuthContext } from "@/auth/session";
import { can, type Permission } from "@/server/authz";

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RULE_VIOLATION"
  | "INTERNAL";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

/** Throw from a handler to return a specific, safe error. */
export class ActionFailure extends Error {
  constructor(
    public code: ActionErrorCode,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ActionFailure";
  }
}
export const fail = (code: ActionErrorCode, message: string, fieldErrors?: Record<string, string[]>) =>
  new ActionFailure(code, message, fieldErrors);

// Generic, user-safe messages. Nothing here leaks DB/SQL/stack details.
const SAFE_MESSAGES: Record<"UNAUTHENTICATED" | "FORBIDDEN" | "INTERNAL", string> = {
  UNAUTHENTICATED: "Nuk jeni i kyçur.",
  FORBIDDEN: "Nuk keni leje për këtë veprim.",
  INTERNAL: "Ndodhi një gabim i papritur. Provoni përsëri.",
};

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

interface ActionConfig<I, O> {
  /** Shared Zod schema — re-run authoritatively here regardless of client checks. */
  input: ZodType<I>;
  /** Canonical permission required (omit for authenticated-only actions). */
  permission?: Permission;
  /** Paths to revalidate on success (best-effort). */
  revalidate?: string[];
  handler: (args: { input: I; ctx: ActionAuthContext; tx: TenantTx }) => Promise<O>;
}

/**
 * Build an action core. Takes request headers explicitly (testable). The public
 * "use server" wrapper supplies `await headers()`.
 */
export function createAction<I, O>(config: ActionConfig<I, O>) {
  return async (rawInput: unknown, reqHeaders: Headers): Promise<ActionResult<O>> => {
    // 1. Validation (authoritative, server-side).
    const parsed = config.input.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) } };
    }

    // 2. Authentication + trusted active-organization context (role read fresh).
    const auth = await getAuthContext(reqHeaders);
    if (!auth.ok) {
      return auth.reason === "UNAUTHENTICATED"
        ? { ok: false, error: { code: "UNAUTHENTICATED", message: SAFE_MESSAGES.UNAUTHENTICATED } }
        : { ok: false, error: { code: "FORBIDDEN", message: SAFE_MESSAGES.FORBIDDEN } };
    }
    const ctx = auth.ctx;

    // 3. Authorization against the canonical role.
    if (config.permission && !can(ctx.role, config.permission)) {
      return { ok: false, error: { code: "FORBIDDEN", message: SAFE_MESSAGES.FORBIDDEN } };
    }

    // 4. RLS-scoped tenant transaction (restricted role, app.current_org set).
    let data: O;
    try {
      data = await runWithOrg(db, ctx.organizationId, (tx) => config.handler({ input: parsed.data, ctx, tx }));
    } catch (e) {
      if (e instanceof ActionFailure) {
        return { ok: false, error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } };
      }
      // Unexpected: log the real error server-side ONLY; return a generic result.
      console.error("[action] internal error:", e);
      return { ok: false, error: { code: "INTERNAL", message: SAFE_MESSAGES.INTERNAL } };
    }

    // 5. Revalidate (best-effort; never affects the result, and no-ops in tests).
    if (config.revalidate?.length) {
      try {
        for (const p of config.revalidate) revalidatePath(p);
      } catch {
        /* not in a request scope (e.g. integration tests) */
      }
    }

    return { ok: true, data };
  };
}
