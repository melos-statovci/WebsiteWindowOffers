-- Row-Level Security for the clients tenant table. Same proven pattern as
-- organization_profiles (migration 0001): tenant context is transaction-scoped
-- via current_setting('app.current_org', true), wrapped in nullif(...,'') so an
-- unset/empty context casts to NULL -> `organization_id = NULL` -> zero rows and
-- no cast error (fail-closed).
--
-- FORCE makes the table owner (neondb_owner) subject to RLS too, so isolation
-- proofs cannot pass merely by running as a privileged role.

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "clients_select" ON "clients"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "clients_insert" ON "clients"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "clients_update" ON "clients"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "clients_delete" ON "clients"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
