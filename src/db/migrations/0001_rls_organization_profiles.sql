-- Row-Level Security for our tenant table. Applied ONLY to business tables,
-- never to Better Auth's own tables (which the auth adapter must access freely).
--
-- Tenant context is transaction-scoped via current_setting('app.current_org',
-- true). Once set_config(...) registers the custom GUC on a session it reverts
-- to an EMPTY STRING (not NULL) after the transaction, so we wrap it in
-- nullif(...,'') before casting: unset/empty -> NULL -> `organization_id = NULL`
-- -> no rows and no cast error. Fail-closed and clean.
--
-- FORCE guarantees the table owner (neondb_owner) is ALSO subject to RLS, so a
-- passing proof cannot depend on running as a privileged role.

ALTER TABLE "organization_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organization_profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "org_profiles_select" ON "organization_profiles"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "org_profiles_insert" ON "organization_profiles"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "org_profiles_update" ON "organization_profiles"
  FOR UPDATE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
--> statement-breakpoint

CREATE POLICY "org_profiles_delete" ON "organization_profiles"
  FOR DELETE
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);
