CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"text" text NOT NULL,
	"author_user_id" uuid,
	"author_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_org_client_fk" FOREIGN KEY ("organization_id","client_id") REFERENCES "public"."clients"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_org_idx" ON "notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notes_org_client_idx" ON "notes" USING btree ("organization_id","client_id");--> statement-breakpoint

-- Row-Level Security for the notes tenant table. Same proven, fail-closed
-- pattern as clients (migration 0004): tenant context is transaction-scoped via
-- current_setting('app.current_org', true), wrapped in nullif(...,'') so an
-- unset/empty context casts to NULL -> zero rows and no cast error. FORCE makes
-- the table owner subject to RLS too.
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "notes_select" ON "notes"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

CREATE POLICY "notes_insert" ON "notes"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

CREATE POLICY "notes_update" ON "notes"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

CREATE POLICY "notes_delete" ON "notes"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

-- Runtime role gets only row-level CRUD; RLS + FORCE confine every statement to
-- the active organization. No ownership, no DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "notes" TO kornizo_app;