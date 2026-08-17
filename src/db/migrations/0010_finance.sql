-- Phase 7 Checkpoint A — tenant-owned FINANCE: Invoices, Invoice Lines, Payments.
--
-- Like Phase 6's 0009 this ONE migration bundles the three concerns (structural
-- DDL, RLS, runtime grants) as a single logical unit -> exactly one Drizzle
-- snapshot to maintain. The structural section was produced by `drizzle-kit
-- generate` (into a temp out dir; the classifier blocks generating into
-- src/db/migrations under the default config) and then HAND-EDITED in two places
-- Drizzle cannot express: the two OPTIONAL composite FKs use PostgreSQL 15+
-- COLUMN-SCOPED `ON DELETE SET NULL (<col>)`. A plain `SET NULL` on a composite
-- (organization_id, x_id) FK would try to null organization_id too (NOT NULL) and
-- ERROR, which would BLOCK the parent delete. Column-scoped SET NULL nulls only
-- the optional link column, so the historical accounting row survives with its
-- tenant key intact. The RLS and GRANT sections are hand-written (Drizzle models
-- neither) and follow the exact proven pattern from 0004/0005, 0007/0008, 0009.
--
-- Tenant integrity enforced at the DB level (not app convention):
--   * invoices/invoice_lines/payments.organization_id -> organization(id) CASCADE.
--   * invoices COMPOSITE (organization_id, client_id) -> clients(org, id): an
--     invoice can only reference a Client in its OWN org. ON DELETE NO ACTION
--     blocks deleting a client that still has invoices (accounting history is
--     never destroyed by a client delete); org-delete cascade still succeeds.
--   * invoices COMPOSITE (organization_id, project_id) -> projects(org, id) with
--     ON DELETE SET NULL (project_id): deleting the source offer NULLs the link
--     but keeps the invoice + its `reference` snapshot.
--   * invoice_lines COMPOSITE (organization_id, invoice_id) -> invoices(org, id)
--     ON DELETE CASCADE: a line can only attach to an invoice in its OWN org;
--     deleting an invoice removes its lines.
--   * payments COMPOSITE (organization_id, client_id) -> clients(org, id) NO
--     ACTION (a client with payment history cannot be deleted).
--   * payments COMPOSITE (organization_id, invoice_id) -> invoices(org, id) with
--     ON DELETE SET NULL (invoice_id): deleting an invoice UNLINKS its payments
--     (money survives as client advance/credit) rather than destroying them.
--   * payments CHECK (amount > 0): a persisted payment is always strictly positive.
--   * invoices_org_number_uidx makes the human-readable FAT number unique/org.

-- ---------------------------------------------------------------------------
-- Structural (drizzle-kit generated; the two SET NULL FKs hand-edited to be
-- column-scoped — see header).
-- ---------------------------------------------------------------------------
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"source_project_item_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"number" text NOT NULL,
	"client_name" text NOT NULL,
	"client_snapshot" jsonb NOT NULL,
	"reference" text,
	"issued_at" date NOT NULL,
	"due_at" date NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"vat_rate" numeric(5, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_org_id_uidx" UNIQUE("organization_id","id"),
	CONSTRAINT "invoices_org_number_uidx" UNIQUE("organization_id","number")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"invoice_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"method" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_org_invoice_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."invoices"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_project_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."projects"("organization_id","id") ON DELETE SET NULL ("project_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_invoice_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."invoices"("organization_id","id") ON DELETE SET NULL ("invoice_id") ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_lines_org_idx" ON "invoice_lines" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_org_invoice_idx" ON "invoice_lines" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_org_client_idx" ON "invoices" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "invoices_org_project_idx" ON "invoices" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_org_client_idx" ON "payments" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "payments_org_invoice_idx" ON "payments" USING btree ("organization_id","invoice_id");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row-Level Security (fail-closed, tenant-scoped) — same pattern as 0004/0007/0009.
-- Tenant context is transaction-scoped via current_setting('app.current_org',
-- true); nullif(...,'') makes an unset/empty context cast to NULL ->
-- `organization_id = NULL` -> zero rows (no cast error). FORCE subjects the table
-- owner to RLS too. All four commands are policed, so with no tenant context every
-- read/insert/update/delete is denied.
-- ---------------------------------------------------------------------------
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "invoices_select" ON "invoices"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoices_insert" ON "invoices"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoices_update" ON "invoices"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoices_delete" ON "invoices"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_lines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "invoice_lines_select" ON "invoice_lines"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoice_lines_insert" ON "invoice_lines"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoice_lines_update" ON "invoice_lines"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "invoice_lines_delete" ON "invoice_lines"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "payments_select" ON "payments"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payments_insert" ON "payments"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payments_update" ON "payments"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payments_delete" ON "payments"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Runtime grants for the restricted role kornizo_app (NOSUPERUSER, NOBYPASSRLS,
-- no DDL/ownership). Finance rows are mutable business records the user manages
-- directly (create invoice, change status, cancel, delete; record/delete
-- payment), so SELECT/INSERT/UPDATE/DELETE are all granted. RLS + FORCE still
-- confine every granted statement to the active organization. (invoice_lines are
-- immutable snapshots in practice; UPDATE is granted only for pattern parity with
-- project_items and never weakens tenant isolation.)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invoices" TO kornizo_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invoice_lines" TO kornizo_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "payments" TO kornizo_app;
