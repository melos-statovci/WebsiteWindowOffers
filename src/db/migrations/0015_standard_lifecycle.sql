ALTER TABLE "organization_accounts" DROP CONSTRAINT "organization_accounts_plan_chk";--> statement-breakpoint
ALTER TABLE "platform_audit_events" DROP CONSTRAINT "platform_audit_events_action_chk";--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "plan" SET DEFAULT 'STANDARD';--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD COLUMN "commercial_access" text;--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD COLUMN "trial_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
UPDATE "organization_accounts"
SET "plan" = 'STANDARD',
    "commercial_access" = 'active',
    "activated_at" = COALESCE("activated_at", "updated_at", now()),
    "updated_at" = now();--> statement-breakpoint
INSERT INTO "organization_accounts" ("organization_id", "plan", "status", "commercial_access", "activated_at")
SELECT o."id", 'STANDARD', 'active', 'active', now()
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "organization_accounts" a WHERE a."organization_id" = o."id"
);--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "commercial_access" SET DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "commercial_access" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_started_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_ends_at" SET DEFAULT now() + interval '14 days';--> statement-breakpoint
CREATE INDEX "organization_accounts_commercial_access_idx" ON "organization_accounts" USING btree ("commercial_access");--> statement-breakpoint
CREATE INDEX "organization_accounts_trial_ends_idx" ON "organization_accounts" USING btree ("trial_ends_at");--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD CONSTRAINT "organization_accounts_commercial_access_chk" CHECK ("organization_accounts"."commercial_access" in ('trial','active'));--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD CONSTRAINT "organization_accounts_trial_window_chk" CHECK ("organization_accounts"."commercial_access" = 'active' or ("organization_accounts"."trial_started_at" is not null and "organization_accounts"."trial_ends_at" is not null and "organization_accounts"."trial_ends_at" > "organization_accounts"."trial_started_at"));--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD CONSTRAINT "organization_accounts_plan_chk" CHECK ("organization_accounts"."plan" in ('STANDARD'));--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_action_chk" CHECK ("platform_audit_events"."action" in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED'));
