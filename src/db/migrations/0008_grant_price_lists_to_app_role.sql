-- The app runs at RUNTIME as the restricted role kornizo_app (NOSUPERUSER,
-- NOBYPASSRLS, no DDL/ownership). Grant it only the row-level verbs pricing
-- actually needs:
--   SELECT  — read the active catalog for the configurator/editor.
--   INSERT  — append a new immutable version on save.
--   UPDATE  — flip is_active when activating a new version / archiving the old.
--
-- DELETE is deliberately NOT granted: pricing history is immutable and retained,
-- so runtime code must never remove a version. (Deleting an organization removes
-- its pricing via ON DELETE CASCADE, executed by the privileged owner role, not
-- kornizo_app.) RLS + FORCE (0007) still confine every granted statement to the
-- active organization.

GRANT SELECT, INSERT, UPDATE ON TABLE "price_lists" TO kornizo_app;
