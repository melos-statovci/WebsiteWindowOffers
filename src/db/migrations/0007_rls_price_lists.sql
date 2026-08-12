-- Row-Level Security for the price_lists tenant table. Same proven, fail-closed
-- pattern as clients (migration 0004) and organization_profiles (0001): tenant
-- context is transaction-scoped via current_setting('app.current_org', true),
-- wrapped in nullif(...,'') so an unset/empty context casts to NULL ->
-- `organization_id = NULL` -> zero rows and no cast error.
--
-- FORCE makes the table owner subject to RLS too, so isolation cannot be
-- bypassed merely by connecting as a privileged role.
--
-- All four commands are policed, so with no tenant context every read/insert/
-- update/delete is denied, and no statement can ever cross organizations.

ALTER TABLE "price_lists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_lists" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "price_lists_select" ON "price_lists"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "price_lists_insert" ON "price_lists"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "price_lists_update" ON "price_lists"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "price_lists_delete" ON "price_lists"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
