import { sql } from "drizzle-orm";
import {
  reviewTrialApplicationSchema,
  setDemoRequestStatusSchema,
} from "@/domain/validation/acquisition";
import { createPlatformAction, fail } from "@/server/platform/action";
import { recordAuditEvent } from "@/server/platform/audit";

export const reviewTrialApplicationAction = createPlatformAction({
  input: reviewTrialApplicationSchema,
  handler: async ({ input, ctx, db }) => {
    return db.transaction(async (tx) => {
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
      return { id: input.id, status: input.decision };
    });
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
