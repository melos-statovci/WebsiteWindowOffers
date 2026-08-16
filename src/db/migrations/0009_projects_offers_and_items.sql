-- Phase 6 Checkpoint A — tenant-owned Projects (Offers) and Project Items.
--
-- This ONE migration bundles the three concerns Phase 4/5 split across files
-- (structural DDL, RLS, runtime grants) because they form a single logical unit
-- and keeping them together means exactly one Drizzle snapshot to maintain. The
-- structural section below was produced by `drizzle-kit generate`; the RLS and
-- GRANT sections are hand-written (Drizzle does not model policies/grants) and
-- follow the exact proven pattern from clients (0004/0005) and price_lists
-- (0007/0008).
--
-- Tenant integrity enforced at the DB level (not app convention):
--   * projects.organization_id  -> organization(id) ON DELETE CASCADE.
--   * project_items.organization_id -> organization(id) ON DELETE CASCADE.
--   * COMPOSITE (organization_id, client_id) -> clients(organization_id, id):
--     a project can only reference a Client in its OWN org. ON DELETE NO ACTION
--     blocks deleting a client that still has projects, yet org-delete cascade
--     (which removes both in one statement) still succeeds.
--   * COMPOSITE (organization_id, project_id) -> projects(organization_id, id)
--     ON DELETE CASCADE: an item can only attach to a Project in its OWN org;
--     deleting a project removes its items.
--   * COMPOSITE (organization_id, price_list_id) -> price_lists(organization_id,
--     id): an item can only reference a pricing version in its OWN org.
--   * projects_org_number_uidx makes the human-readable offer number unique/org.

-- ---------------------------------------------------------------------------
-- Structural (drizzle-kit generated)
-- ---------------------------------------------------------------------------
CREATE TABLE "project_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"width_mm" integer NOT NULL,
	"height_mm" integer NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"config" jsonb NOT NULL,
	"price_list_id" uuid NOT NULL,
	"price_list_version" integer NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"calc_snapshot" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"profile_system" text DEFAULT '' NOT NULL,
	"profile_color" text DEFAULT '' NOT NULL,
	"vat_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "projects_org_number_uidx" UNIQUE("organization_id","number")
);
--> statement-breakpoint
-- Add the price_lists composite unique key FIRST so the project_items ->
-- price_lists composite FK below has a matching unique constraint to reference.
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_org_id_uidx" UNIQUE("organization_id","id");--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_org_project_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_org_price_list_fk" FOREIGN KEY ("organization_id","price_list_id") REFERENCES "public"."price_lists"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_items_org_idx" ON "project_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_items_org_project_idx" ON "project_items" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_org_client_idx" ON "projects" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "projects_org_status_idx" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-Level Security (fail-closed, tenant-scoped) — same pattern as 0004/0007.
-- Tenant context is transaction-scoped via
-- current_setting('app.current_org', true); nullif(...,'') makes an unset/empty
-- context cast to NULL -> `organization_id = NULL` -> zero rows (no cast error).
-- FORCE subjects the table owner to RLS too, so isolation cannot be bypassed by
-- connecting as a privileged role. All four commands are policed, so with no
-- tenant context every read/insert/update/delete is denied.
-- ---------------------------------------------------------------------------
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "projects_select" ON "projects"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "projects_insert" ON "projects"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "projects_update" ON "projects"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "projects_delete" ON "projects"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "project_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "project_items_select" ON "project_items"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "project_items_insert" ON "project_items"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "project_items_update" ON "project_items"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "project_items_delete" ON "project_items"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Runtime grants for the restricted role kornizo_app (NOSUPERUSER, NOBYPASSRLS,
-- no DDL/ownership). Projects and their items are mutable business records the
-- user manages directly, so — unlike immutable pricing history — DELETE IS
-- granted (deleting a project / removing an item). RLS + FORCE still confine
-- every granted statement to the active organization.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "projects" TO kornizo_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "project_items" TO kornizo_app;
