CREATE TABLE "platform_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_email" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"organization_id" uuid,
	"organization_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_audit_events_action_chk" CHECK ("platform_audit_events"."action" in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED'))
);
--> statement-breakpoint
CREATE INDEX "platform_audit_events_created_idx" ON "platform_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_events_org_idx" ON "platform_audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_audit_events_action_idx" ON "platform_audit_events" USING btree ("action");--> statement-breakpoint
-- GRANTS (hand-appended, same pattern as 0002/0005/0008/0013). Non-RLS
-- control-plane table. The runtime role gets SELECT + INSERT only — NO UPDATE
-- and NO DELETE — so the audit trail is append-only and immutable even to the
-- application itself. Only the trusted platform mutation path inserts rows.
GRANT SELECT, INSERT ON TABLE "platform_audit_events" TO kornizo_app;
