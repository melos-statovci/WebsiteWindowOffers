-- The app runs at RUNTIME as the restricted role kornizo_app (NOSUPERUSER,
-- NOBYPASSRLS, no DDL/ownership). Grant it only row-level CRUD on clients; RLS +
-- FORCE (migration 0004) still confine every one of those statements to the
-- active organization. No ownership, no DDL, no weakening of RLS.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "clients" TO kornizo_app;
