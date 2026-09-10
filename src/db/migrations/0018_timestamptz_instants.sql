-- 0018_timestamptz_instants
--
-- Normalize every ABSOLUTE INSTANT column from `timestamp without time zone`
-- to `timestamptz`. Pre-launch correctness fix; no production database exists
-- yet.
--
-- WHY (proven, not assumed — see KORNIZO_LAUNCH_HANDOFF.md "Timestamp audit"):
--
--   1. Every writer of these columns stored UTC:
--        * SQL `now()` (all column DEFAULTs, ensureOrganizationAccount,
--          activated_at, suspended_at, reviewed_at, provisioning timestamps,
--          audit created_at) under the Neon session TimeZone `GMT`;
--        * Drizzle typed inserts, whose PgTimestamp.mapToDriverValue is
--          `value.toISOString()` (UTC), which covers every Better Auth write.
--      The single exception was extendTrialAction, which bound a JS Date into a
--      raw `sql` template; node-postgres serializes that as process-LOCAL time
--      and Postgres then discarded the offset. A DEV audit proved NO row was
--      ever written by that path (zero TRIAL_EXTENDED audit events; the one
--      trial row carries the `now()` / `now() + interval '14 days'` signature:
--      identical microseconds, trial_started_at = created_at, window exactly
--      14 days). timestamptz makes that path correct too, because Postgres now
--      honours the offset instead of discarding it.
--
--   2. A live DEV scan confirmed max(col) <= UTC now() for every past-event
--      column, and > now() only for the two legitimately-future columns
--      (organization_accounts.trial_ends_at, session.expires_at).
--
-- Therefore `AT TIME ZONE 'UTC'` is the correct reinterpretation. It is written
-- EXPLICITLY on every statement: a bare `SET DATA TYPE timestamptz` would cast
-- using whatever TimeZone the migrating session happens to have, which is the
-- exact implicit dependency this migration removes.
--
-- NOT CONVERTED (deliberate — BUSINESS CALENDAR DATEs, must not shift):
--   invoices.issued_at, invoices.due_at, payments.date  -> stay `date`.
--
-- No TRUE LOCAL WALL-CLOCK column exists in this schema.
--
-- The Drizzle schema was updated to `{ withTimezone: true }` in the SAME commit.
-- That is MANDATORY, not cosmetic: PgTimestamp.mapFromDriverValue appends
-- "+0000" to the raw string when withTimezone is false, so a timestamptz column
-- read through a withTimezone:false Drizzle column yields "…+00+0000" =>
-- Invalid Date.
--
-- Additive/typed only: no row is deleted and no column is dropped.

ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp with time zone USING "access_token_expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp with time zone USING "refresh_token_expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone USING "expires_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invoice_lines" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_profiles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_profiles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_profiles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_profiles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "price_lists" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "price_lists" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "project_items" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "project_items" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "project_items" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "project_items" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "demo_requests" ALTER COLUMN "status_changed_at" SET DATA TYPE timestamp with time zone USING "status_changed_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "demo_requests" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "demo_requests" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "demo_requests" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "demo_requests" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_started_at" SET DATA TYPE timestamp with time zone USING "trial_started_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_started_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_ends_at" SET DATA TYPE timestamp with time zone USING "trial_ends_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "trial_ends_at" SET DEFAULT now() + interval '14 days';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "activated_at" SET DATA TYPE timestamp with time zone USING "activated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "suspended_at" SET DATA TYPE timestamp with time zone USING "suspended_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "organization_accounts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "platform_admins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "platform_admins" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "platform_audit_events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "platform_audit_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "reviewed_at" SET DATA TYPE timestamp with time zone USING "reviewed_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "provisioning_started_at" SET DATA TYPE timestamp with time zone USING "provisioning_started_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "provisioned_at" SET DATA TYPE timestamp with time zone USING "provisioned_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "trial_applications" ALTER COLUMN "updated_at" SET DEFAULT now();