-- Versioned, tenant-owned pricing. One row = one immutable version holding an
-- organization's COMPLETE pricing catalog as a self-contained JSONB snapshot.
-- RLS is added in 0007 and runtime grants in 0008 (same layering as clients:
-- 0003 table -> 0004 RLS -> 0005 grants).
--
-- Invariants enforced here at the DB level:
--   * organization_id NOT NULL, FK -> organization(id) ON DELETE CASCADE.
--   * version monotonic per org: UNIQUE(organization_id, version).
--   * EXACTLY ONE active version per org: partial UNIQUE index over
--     organization_id WHERE is_active (historical/inactive rows never collide).
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"catalog" jsonb NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_lists_org_version_uidx" UNIQUE("organization_id","version")
);
--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "price_lists_one_active_uidx" ON "price_lists" USING btree ("organization_id") WHERE "price_lists"."is_active";--> statement-breakpoint
CREATE INDEX "price_lists_org_idx" ON "price_lists" USING btree ("organization_id");
