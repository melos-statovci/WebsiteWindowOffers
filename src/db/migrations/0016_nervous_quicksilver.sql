CREATE TABLE "demo_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"status_changed_at" timestamp,
	"status_changed_by_user_id" uuid,
	"status_changed_by_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "demo_requests_status_chk" CHECK ("demo_requests"."status" in ('new','contacted','closed'))
);
--> statement-breakpoint
CREATE TABLE "trial_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"applicant_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"company_name" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"company_size" text NOT NULL,
	"offers_per_month" integer,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" uuid,
	"reviewed_by_email" text,
	"internal_review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trial_applications_status_chk" CHECK ("trial_applications"."status" in ('pending','approved','rejected')),
	CONSTRAINT "trial_applications_company_size_chk" CHECK ("trial_applications"."company_size" in ('1-5','6-15','16-50','51+')),
	CONSTRAINT "trial_applications_offers_per_month_chk" CHECK ("trial_applications"."offers_per_month" is null or ("trial_applications"."offers_per_month" >= 0 and "trial_applications"."offers_per_month" <= 100000))
);
--> statement-breakpoint
ALTER TABLE "platform_audit_events" DROP CONSTRAINT "platform_audit_events_action_chk";--> statement-breakpoint
ALTER TABLE "trial_applications" ADD CONSTRAINT "trial_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demo_requests_normalized_email_uidx" ON "demo_requests" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "demo_requests_status_idx" ON "demo_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "demo_requests_created_idx" ON "demo_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_applications_user_uidx" ON "trial_applications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trial_applications_normalized_email_uidx" ON "trial_applications" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "trial_applications_status_idx" ON "trial_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trial_applications_created_idx" ON "trial_applications" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_action_chk" CHECK ("platform_audit_events"."action" in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED','TRIAL_APPLICATION_APPROVED','TRIAL_APPLICATION_REJECTED','DEMO_REQUEST_STATUS_CHANGED'));
--> statement-breakpoint
-- GRANTS (hand-appended). Acquisition/application data is Kornizo control-plane
-- data, not tenant business data, so it is not attached to tenant RLS. Runtime
-- code scopes reads/writes by authenticated user for applicants and by
-- platform_admins for operators. No DELETE grant.
GRANT SELECT, INSERT, UPDATE ON TABLE "trial_applications" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "demo_requests" TO kornizo_app;
