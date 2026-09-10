ALTER TABLE "platform_audit_events" DROP CONSTRAINT "platform_audit_events_action_chk";--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioning_status" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioning_slug" text;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioning_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioned_at" timestamp;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioning_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD COLUMN "provisioning_error_code" text;--> statement-breakpoint
ALTER TABLE "trial_applications" ADD CONSTRAINT "trial_applications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trial_applications_organization_uidx" ON "trial_applications" USING btree ("organization_id") WHERE "trial_applications"."organization_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "trial_applications_provisioning_slug_uidx" ON "trial_applications" USING btree ("provisioning_slug") WHERE "trial_applications"."provisioning_slug" is not null;--> statement-breakpoint
CREATE INDEX "trial_applications_provisioning_status_idx" ON "trial_applications" USING btree ("provisioning_status");--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_action_chk" CHECK ("platform_audit_events"."action" in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED','TRIAL_APPLICATION_APPROVED','TRIAL_APPLICATION_REJECTED','DEMO_REQUEST_STATUS_CHANGED','TRIAL_APPLICATION_PROVISIONED','TRIAL_APPLICATION_PROVISIONING_FAILED'));--> statement-breakpoint
ALTER TABLE "trial_applications" ADD CONSTRAINT "trial_applications_provisioning_status_chk" CHECK ("trial_applications"."provisioning_status" in ('not_started','in_progress','provisioned','failed'));--> statement-breakpoint
ALTER TABLE "trial_applications" ADD CONSTRAINT "trial_applications_provisioned_shape_chk" CHECK ("trial_applications"."provisioning_status" <> 'provisioned' or ("trial_applications"."organization_id" is not null and "trial_applications"."provisioned_at" is not null));--> statement-breakpoint
ALTER TABLE "trial_applications" ADD CONSTRAINT "trial_applications_link_requires_approval_chk" CHECK ("trial_applications"."organization_id" is null or "trial_applications"."status" = 'approved');