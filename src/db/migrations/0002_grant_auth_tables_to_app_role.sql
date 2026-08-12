-- Better Auth runs at RUNTIME as the restricted role kornizo_app, so it needs
-- CRUD on its own tables. These tables carry NO RLS (identity is not tenant
-- data), so plain table grants suffice. The role remains NOSUPERUSER /
-- NOBYPASSRLS / no-DDL / no-ownership — it only reads and writes rows.
--
-- Our tenant business table (organization_profiles) keeps RLS + FORCE; the app
-- reaches it only through withOrg().

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "session" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "account" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "verification" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "organization" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "member" TO kornizo_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "invitation" TO kornizo_app;
