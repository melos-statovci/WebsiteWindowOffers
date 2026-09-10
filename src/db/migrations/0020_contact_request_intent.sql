-- 0020_contact_request_intent
--
-- Second half of the Milestone 5.5 demo -> contact consolidation (0019 did the
-- rename). Turns the renamed table into a genuinely generic contact table:
--
--   * `intent` ('demo' | 'general') discriminates the two public entry points.
--     Stored lower-case to match `status` on the same table.
--   * company_name / phone / country become NULLABLE, because a general
--     question needs none of them. Two intent-conditional CHECKs keep the
--     proven demo shape enforced BY THE DATABASE (a demo still requires
--     company, phone and country) and require a general contact to actually
--     carry a message.
--   * The old UNIQUE index on normalized_email alone is replaced by a PARTIAL
--     unique index on (normalized_email, intent) WHERE status <> 'closed'.
--
--     The old index was table-wide and permanent. Carried into a shared contact
--     table it would mean: requesting a demo permanently blocks you from ever
--     sending a support question, and the contact form accepts exactly ONE
--     message per person for all time. Scoping by intent fixes the first;
--     excluding 'closed' fixes the second using the lifecycle an operator
--     already drives. Demo behaviour is unchanged where it matters — an OPEN
--     demo request still suppresses a repeat submission.
--
-- Data-preserving: no row is deleted and no column is dropped.

DROP INDEX "contact_requests_normalized_email_uidx";--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "company_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "country" DROP NOT NULL;--> statement-breakpoint
-- HAND-EDITED. drizzle-kit generated a bare `ADD COLUMN "intent" text NOT NULL`,
-- which cannot succeed on a table that already has rows. The DEFAULT backfills
-- every pre-existing row as a DEMO request, which is exactly what they are —
-- they came from the /request-demo funnel. The default is then DROPPED so a
-- future insert must state its intent explicitly and a general contact can
-- never be silently filed as a sales demo lead. This also matches the Drizzle
-- column, which is notNull() with no default.
ALTER TABLE "contact_requests" ADD COLUMN "intent" text NOT NULL DEFAULT 'demo';--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "intent" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_requests_open_email_intent_uidx" ON "contact_requests" USING btree ("normalized_email","intent") WHERE status <> 'closed';--> statement-breakpoint
CREATE INDEX "contact_requests_intent_idx" ON "contact_requests" USING btree ("intent");--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_intent_chk" CHECK ("contact_requests"."intent" in ('demo','general'));--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_demo_shape_chk" CHECK ("contact_requests"."intent" <> 'demo' or ("contact_requests"."company_name" is not null and "contact_requests"."phone" is not null and "contact_requests"."country" is not null));--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_general_shape_chk" CHECK ("contact_requests"."intent" <> 'general' or "contact_requests"."message" is not null);