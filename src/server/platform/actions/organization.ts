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
  setPlanSchema,
  setStatusSchema,
  setInternalNoteSchema,
} from "@/domain/validation/platform";
import { createPlatformAction, fail } from "@/server/platform/action";
import { recordAuditEvent } from "@/server/platform/audit";
import { asPlanTier } from "@/lib/plan";

/** Load the org name + current account state inside a tx; throws NOT_FOUND if the org is unknown. */
async function loadTarget(tx: TenantTx, orgId: string) {
  const org = await tx.execute(sql`select name from organization where id = ${orgId} limit 1`);
  const orgRow = org.rows[0] as { name?: string } | undefined;
  if (!orgRow) throw fail("NOT_FOUND", "Organizata nuk u gjet.");
  const acc = await tx.execute(
    sql`select plan, status, internal_note from organization_accounts where organization_id = ${orgId} limit 1`,
  );
  const accRow = acc.rows[0] as { plan?: string; status?: string; internal_note?: string | null } | undefined;
  return {
    name: orgRow.name ?? null,
    plan: asPlanTier(accRow?.plan),
    status: accRow?.status === "suspended" ? "suspended" : "active",
    internalNote: accRow?.internal_note ?? null,
  };
}

/** Manually set an organization's plan tier. Immediately respected by tenant gates. Audited. */
export const setPlanAction = createPlatformAction({
  input: setPlanSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const before = await loadTarget(tx, input.organizationId);
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
