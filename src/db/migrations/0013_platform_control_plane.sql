CREATE TABLE "organization_accounts" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'SOLO' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"internal_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_accounts_plan_chk" CHECK ("organization_accounts"."plan" in ('SOLO','BIZNES','FABRIKA')),
	CONSTRAINT "organization_accounts_status_chk" CHECK ("organization_accounts"."status" in ('active','suspended'))
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_accounts" ADD CONSTRAINT "organization_accounts_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_accounts_status_idx" ON "organization_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_accounts_plan_idx" ON "organization_accounts" USING btree ("plan");--> statement-breakpoint
-- Backfill an account row for every EXISTING organization, carrying the old
-- (now-retired) organization_profiles.plan value where present. Runs BEFORE the
-- DROP COLUMN below so no plan data is lost. Idempotent via ON CONFLICT.
INSERT INTO "organization_accounts" ("organization_id", "plan")
SELECT o."id", COALESCE(op."plan", 'SOLO')
FROM "organization" o
LEFT JOIN "organization_profiles" op ON op."organization_id" = o."id"
ON CONFLICT ("organization_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "organization_profiles" DROP COLUMN "plan";--> statement-breakpoint
-- GRANTS (hand-appended, same pattern as 0002/0005/0008). These platform
-- control-plane tables carry NO tenant RLS — they are identity/operational-state
-- tables like Better Auth's user/organization/member, scoped in app code.
--
--   platform_admins       : SELECT-ONLY for the runtime role, so a compromised
--                           app can authorize against it but can NEVER escalate
--                           someone to platform admin. Granting is done by an
--                           operator with owner creds (seed-platform-admin.mjs).
--   organization_accounts : SELECT/INSERT/UPDATE (no DELETE — suspension never
--                           deletes; an account row is only ever created or
--                           edited). Only the platform action spine writes it.
GRANT SELECT ON TABLE "platform_admins" TO kornizo_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "organization_accounts" TO kornizo_app;
