-- 0019_contact_requests_rename
--
-- Milestone 5.5: retire the dedicated `demo_requests` domain in favour of one
-- generic `contact_requests` table. "Request a demo" stays a real, visible,
-- distinct public action; only the persistence becomes generic.
--
-- This is a RENAME, not a drop-and-recreate. Production has never been
-- migrated, but DEV holds real demo rows and there is no reason to destroy
-- them. A Postgres RENAME also carries the table's GRANTs with it (they follow
-- the table OID), so kornizo_app keeps exactly SELECT/INSERT/UPDATE and still
-- has no DELETE.
--
-- The audit CHECK gains 'CONTACT_REQUEST_STATUS_CHANGED' and KEEPS
-- 'DEMO_REQUEST_STATUS_CHANGED'. The audit trail is append-only and immutable
-- even to the application; historical event names stay as they were recorded.
-- New code emits only the contact-domain name.
--
-- Indexes and the status CHECK are recreated under the new table name. That
-- touches no data.

ALTER TABLE "demo_requests" RENAME TO "contact_requests";--> statement-breakpoint
ALTER TABLE "contact_requests" DROP CONSTRAINT "demo_requests_status_chk";--> statement-breakpoint
ALTER TABLE "platform_audit_events" DROP CONSTRAINT "platform_audit_events_action_chk";--> statement-breakpoint
DROP INDEX "demo_requests_normalized_email_uidx";--> statement-breakpoint
DROP INDEX "demo_requests_status_idx";--> statement-breakpoint
DROP INDEX "demo_requests_created_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "contact_requests_normalized_email_uidx" ON "contact_requests" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "contact_requests_status_idx" ON "contact_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_requests_created_idx" ON "contact_requests" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_status_chk" CHECK ("contact_requests"."status" in ('new','contacted','closed'));--> statement-breakpoint
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_action_chk" CHECK ("platform_audit_events"."action" in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED','TRIAL_APPLICATION_APPROVED','TRIAL_APPLICATION_REJECTED','DEMO_REQUEST_STATUS_CHANGED','CONTACT_REQUEST_STATUS_CHANGED','TRIAL_APPLICATION_PROVISIONED','TRIAL_APPLICATION_PROVISIONING_FAILED'));