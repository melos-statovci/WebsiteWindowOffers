import { sql } from "drizzle-orm";
import {
  retryTrialApplicationProvisioningSchema,
  reviewTrialApplicationSchema,
  setDemoRequestStatusSchema,
} from "@/domain/validation/acquisition";
import { createPlatformAction, fail } from "@/server/platform/action";
import { recordAuditEvent } from "@/server/platform/audit";
import {
  provisionApprovedTrialApplication,
  type ProvisioningResult,
} from "@/server/platform/provisioning";

/**
 * The operator-visible outcome of the provisioning half of an approval.
 * Deliberately narrow: an operator sees a state, not an internal error.
 */
export interface ProvisioningOutcome {
  state: "provisioned" | "failed" | "in_progress";
  organizationId?: string;
  organizationName?: string;
  trialEndsAt?: string | null;
  errorCode?: string;
}

function outcomeOf(result: ProvisioningResult): ProvisioningOutcome {
  if (result.ok) {
    return {
      state: "provisioned",
      organizationId: result.organizationId,
      organizationName: result.organizationName,
      trialEndsAt: result.trialEndsAt ? result.trialEndsAt.toISOString() : null,
    };
  }
  if (result.kind === "rejected" && result.reason === "PROVISIONING_IN_PROGRESS") {
    return { state: "in_progress" };
  }
  return { state: "failed", errorCode: result.kind === "failed" ? result.errorCode : result.reason };
}

/**
 * Review a pending trial application.
 *
 * APPROVAL IS NOW TWO STEPS, in this order and deliberately not one transaction:
 *   1. the human decision (pending -> approved) + TRIAL_APPLICATION_APPROVED,
 *      committed on its own so the decision is never lost;
 *   2. provisioning of the new organization + 14-day Standard trial, which is
 *      resumable and separately audited.
 * If (2) fails the application stays approved with provisioning_status='failed'
 * and the operator gets an explicit Retry — no silent success, no auto-retry.
 */
export const reviewTrialApplicationAction = createPlatformAction({
  input: reviewTrialApplicationSchema,
  handler: async ({ input, ctx, db }) => {
    const decided = await db.transaction(async (tx) => {
      const current = await tx.execute(sql`
        select id, company_name, status
        from trial_applications
        where id = ${input.id}
        for update
      `);
      const row = current.rows[0] as { id: string; company_name: string; status: string } | undefined;
      if (!row) throw fail("NOT_FOUND", "Kërkesa nuk u gjet.");
      if (row.status !== "pending") {
        throw fail("CONFLICT", "Kjo kërkesë është shqyrtuar tashmë.");
      }

      const note = input.internalReviewNote.trim() || null;
      await tx.execute(sql`
        update trial_applications
        set status = ${input.decision},
            reviewed_at = now(),
            reviewed_by_user_id = ${ctx.userId},
            reviewed_by_email = ${ctx.user.email},
            internal_review_note = ${note},
            updated_at = now()
        where id = ${input.id}
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: input.decision === "approved" ? "TRIAL_APPLICATION_APPROVED" : "TRIAL_APPLICATION_REJECTED",
        metadata: {
          trialApplicationId: input.id,
          companyName: row.company_name,
          oldStatus: "pending",
          newStatus: input.decision,
          hasInternalNote: note !== null,
        },
      });
      return { id: input.id, status: input.decision, companyName: row.company_name };
    });

    if (decided.status !== "approved") {
      return { id: decided.id, status: decided.status, provisioning: null as ProvisioningOutcome | null };
    }

    // Approval means "start the trial". Provisioning runs after the decision
    // commits, so a provisioning failure never rolls the decision back.
    const result = await provisionApprovedTrialApplication(input.id, {
      userId: ctx.userId,
      email: ctx.user.email,
    });
    return { id: decided.id, status: decided.status, provisioning: outcomeOf(result) };
  },
});

/**
 * Re-run provisioning for an approved application whose first attempt failed
 * (or was left stale by a crash). Platform-admin only, same idempotency
 * contract as the approval path: it can never produce a second organization.
 */
export const retryTrialApplicationProvisioningAction = createPlatformAction({
  input: retryTrialApplicationProvisioningSchema,
  handler: async ({ input, ctx }) => {
    const result = await provisionApprovedTrialApplication(input.id, {
      userId: ctx.userId,
      email: ctx.user.email,
    });
    if (!result.ok && result.kind === "rejected") {
      if (result.reason === "NOT_FOUND") throw fail("NOT_FOUND", "Kërkesa nuk u gjet.");
      if (result.reason === "NOT_APPROVED") {
        throw fail("CONFLICT", "Vetëm një aplikim i aprovuar mund të provizionohet.");
      }
      throw fail("CONFLICT", "Provizionimi është duke u ekzekutuar. Provoni sërish pas pak.");
    }
    return { id: input.id, provisioning: outcomeOf(result) };
  },
});

export const setDemoRequestStatusAction = createPlatformAction({
  input: setDemoRequestStatusSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
      const current = await tx.execute(sql`
        select id, company_name, status
        from demo_requests
        where id = ${input.id}
        for update
      `);
      const row = current.rows[0] as { id: string; company_name: string; status: string } | undefined;
      if (!row) throw fail("NOT_FOUND", "Demo kërkesa nuk u gjet.");
      if (row.status === input.status) return { id: input.id, status: input.status };

      await tx.execute(sql`
        update demo_requests
        set status = ${input.status},
            status_changed_at = now(),
            status_changed_by_user_id = ${ctx.userId},
            status_changed_by_email = ${ctx.user.email},
            updated_at = now()
        where id = ${input.id}
      `);
      await recordAuditEvent(tx, {
        actorUserId: ctx.userId,
        actorEmail: ctx.user.email,
        action: "DEMO_REQUEST_STATUS_CHANGED",
        metadata: {
          demoRequestId: input.id,
          companyName: row.company_name,
          oldStatus: row.status,
          newStatus: input.status,
        },
      });
      return { id: input.id, status: input.status };
    });
  },
});
