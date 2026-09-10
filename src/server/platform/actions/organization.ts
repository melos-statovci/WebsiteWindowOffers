// PLATFORM mutation cores — change plan, suspend/reactivate, edit internal note.
// Each composes through createPlatformAction (validate -> authenticate -> verify
// PLATFORM ADMIN -> handler). Writes target the non-RLS control-plane table
// organization_accounts, upserted by organization id.
//
// AUDIT: every successful mutation records ONE audit event in the SAME
// transaction as the change (recordAuditEvent bound to `tx`), so we never record
// an event for a change that did not persist, and never persist a change without
// its event. The actor comes from the authenticated platform context (ctx),
// never from client input. A mutation that throws (e.g. NOT_FOUND) rolls the
// whole transaction back — no partial state, no orphan audit row.
//
// No tenant business data is ever touched — suspension is purely an access flag.

import { sql } from "drizzle-orm";
import type { TenantTx } from "@/db/tenant";
import {
  activateCustomerSchema,
  extendTrialSchema,
  setPlanSchema,
  setStatusSchema,
  setInternalNoteSchema,
} from "@/domain/validation/platform";
import { createPlatformAction, fail } from "@/server/platform/action";
import { recordAuditEvent } from "@/server/platform/audit";
import { asPlanTier } from "@/lib/plan";
import {
  effectiveCommercialAccess,
  trialDaysRemaining,
  type AccountStatus,
  type CommercialAccess,
} from "@/lib/account-lifecycle";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function asDate(value: string | Date | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** Load the org name + current account state inside a tx; throws NOT_FOUND if the org is unknown. */
async function loadTarget(tx: TenantTx, orgId: string) {
  const org = await tx.execute(sql`select name from organization where id = ${orgId} limit 1`);
  const orgRow = org.rows[0] as { name?: string } | undefined;
  if (!orgRow) throw fail("NOT_FOUND", "Organizata nuk u gjet.");
  const acc = await tx.execute(
    sql`
      select
        plan,
        status,
        commercial_access,
        trial_started_at,
        trial_ends_at,
        activated_at,
        suspended_at,
        suspended_reason,
        internal_note,
        now() as server_now
      from organization_accounts
      where organization_id = ${orgId}
      limit 1
    `,
  );
  const accRow = acc.rows[0] as
    | {
        plan?: string;
        status?: string;
        commercial_access?: string;
        trial_started_at?: string | Date | null;
        trial_ends_at?: string | Date | null;
        activated_at?: string | Date | null;
        suspended_at?: string | Date | null;
        suspended_reason?: string | null;
        internal_note?: string | null;
        server_now?: string | Date;
      }
    | undefined;
  const now = asDate(accRow?.server_now) ?? new Date();
  const commercialAccess: CommercialAccess = accRow?.commercial_access === "trial" ? "trial" : "active";
  const trialStartedAt = asDate(accRow?.trial_started_at);
  const trialEndsAt = asDate(accRow?.trial_ends_at);
  return {
    name: orgRow.name ?? null,
    plan: asPlanTier(accRow?.plan),
    status: (accRow?.status === "suspended" ? "suspended" : "active") as AccountStatus,
    commercialAccess,
    effectiveCommercialAccess: effectiveCommercialAccess({ commercialAccess, trialEndsAt, now }),
    trialStartedAt,
    trialEndsAt,
    activatedAt: asDate(accRow?.activated_at),
    trialDaysRemaining: trialDaysRemaining({ trialEndsAt, now }),
    serverNow: now,
    suspendedAt: asDate(accRow?.suspended_at),
    suspendedReason: accRow?.suspended_reason ?? null,
    internalNote: accRow?.internal_note ?? null,
  };
}

/** Keep plan extensibility server-side, but launch accepts only Standard. */
export const setPlanAction = createPlatformAction({
  input: setPlanSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
      if (before.plan === input.plan) return { organizationId: input.organizationId, plan: input.plan };
      await tx.execute(sql`
        insert into organization_accounts (organization_id, plan)
        values (${input.organizationId}, ${input.plan})
        on conflict (organization_id) do update set plan = ${input.plan}, updated_at = now()
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: "PLAN_CHANGED",
        organizationId: input.organizationId,
        organizationName: before.name,
        metadata: { oldPlan: before.plan, newPlan: input.plan },
      });
      return { organizationId: input.organizationId, plan: input.plan };
    });
  },
});

/** Convert a trial/expired-trial organization to an active manual customer. */
export const activateCustomerAction = createPlatformAction({
  input: activateCustomerSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
      if (before.effectiveCommercialAccess === "active") {
        return { organizationId: input.organizationId, commercialAccess: "active" as const };
      }
      await tx.execute(sql`
        insert into organization_accounts (organization_id, plan, commercial_access, activated_at)
        values (${input.organizationId}, 'STANDARD', 'active', now())
        on conflict (organization_id) do update
          set plan = 'STANDARD',
              commercial_access = 'active',
              activated_at = now(),
              updated_at = now()
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: "CUSTOMER_ACTIVATED",
        organizationId: input.organizationId,
        organizationName: before.name,
        metadata: {
          oldAccess: before.effectiveCommercialAccess,
          newAccess: "active",
          oldTrialEndsAt: iso(before.trialEndsAt),
        },
      });
      return { organizationId: input.organizationId, commercialAccess: "active" as const };
    });
  },
});

/** Extend a trial from its current end date, or from server-now when expired. */
export const extendTrialAction = createPlatformAction({
  input: extendTrialSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
      if (before.commercialAccess === "active") {
        throw fail("RULE_VIOLATION", "Klienti aktiv nuk ka nevojë për zgjatje trial.");
      }
      const base =
        before.trialEndsAt && before.trialEndsAt.getTime() > before.serverNow.getTime()
          ? before.trialEndsAt
          : before.serverNow;
      const newTrialEndsAt = new Date(base.getTime() + input.days * MS_PER_DAY);
      const trialStartedAt = before.trialStartedAt ?? before.serverNow;
      // Bind ISO-8601 UTC strings, never bare Date objects. node-postgres
      // serializes a Date in the PROCESS timezone; the columns are timestamptz
      // (migration 0018) so either form is now interpreted correctly, but the
      // explicit UTC string keeps the written instant independent of where the
      // server happens to run. See the timestamp audit in the launch handoff.
      const trialStartedAtUtc = trialStartedAt.toISOString();
      const newTrialEndsAtUtc = newTrialEndsAt.toISOString();

      await tx.execute(sql`
        insert into organization_accounts (organization_id, plan, commercial_access, trial_started_at, trial_ends_at)
        values (${input.organizationId}, 'STANDARD', 'trial', ${trialStartedAtUtc}, ${newTrialEndsAtUtc})
        on conflict (organization_id) do update
          set plan = 'STANDARD',
              commercial_access = 'trial',
              trial_started_at = coalesce(organization_accounts.trial_started_at, ${trialStartedAtUtc}),
              trial_ends_at = ${newTrialEndsAtUtc},
              activated_at = null,
              updated_at = now()
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: "TRIAL_EXTENDED",
        organizationId: input.organizationId,
        organizationName: before.name,
        metadata: {
          days: input.days,
          oldAccess: before.effectiveCommercialAccess,
          newAccess: "trial",
          oldTrialEndsAt: iso(before.trialEndsAt),
          newTrialEndsAt: iso(newTrialEndsAt),
        },
      });
      return { organizationId: input.organizationId, commercialAccess: "trial" as const, trialEndsAt: newTrialEndsAt };
    });
  },
});

/** Suspend or reactivate an organization. Suspension stamps time+reason; reactivation clears them. Audited. */
export const setStatusAction = createPlatformAction({
  input: setStatusSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
      if (input.status === "suspended") {
        await tx.execute(sql`
          insert into organization_accounts (organization_id, status, suspended_at, suspended_reason)
          values (${input.organizationId}, 'suspended', now(), ${input.reason ?? null})
          on conflict (organization_id) do update
            set status = 'suspended', suspended_at = now(), suspended_reason = ${input.reason ?? null}, updated_at = now()
        `);
        await recordAuditEvent(tx, {
          actorUserId: ctx.userId,
          actorEmail: ctx.user.email,
          action: "ORGANIZATION_SUSPENDED",
          organizationId: input.organizationId,
          organizationName: before.name,
          metadata: input.reason ? { reason: input.reason } : {},
        });
      } else {
        await tx.execute(sql`
          insert into organization_accounts (organization_id, status)
          values (${input.organizationId}, 'active')
          on conflict (organization_id) do update
            set status = 'active', suspended_at = null, suspended_reason = null, updated_at = now()
        `);
        await recordAuditEvent(tx, {
          actorUserId: ctx.userId,
          actorEmail: ctx.user.email,
          action: "ORGANIZATION_REACTIVATED",
          organizationId: input.organizationId,
          organizationName: before.name,
          metadata: {},
        });
      }
      return { organizationId: input.organizationId, status: input.status };
    });
  },
});

/** Maintain a private control-plane note (invisible to tenant members). Audited (metadata records only whether set/cleared, never the note text). */
export const setInternalNoteAction = createPlatformAction({
  input: setInternalNoteSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
      const note = input.note.length ? input.note : null;
      await tx.execute(sql`
        insert into organization_accounts (organization_id, internal_note)
        values (${input.organizationId}, ${note})
        on conflict (organization_id) do update set internal_note = ${note}, updated_at = now()
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: "INTERNAL_NOTE_UPDATED",
        organizationId: input.organizationId,
        organizationName: before.name,
        // Never store the note text in the audit trail — only whether it now has content.
        metadata: { cleared: note === null, hadNote: before.internalNote !== null },
      });
      return { organizationId: input.organizationId };
    });
  },
});
