-- Phase 7 Closeout — historical ISSUER snapshot on invoices.
--
-- Freezes the organization's identity (name + fiscal/contact/bank details) onto
-- each invoice at creation so re-printing a historical invoice never adopts the
-- org's later organization_profiles changes. The column is on the existing
-- invoices table, so it inherits that table's RLS policies and kornizo_app grants
-- unchanged — no new policy/grant needed. DEFAULT '{}' lets any pre-existing row
-- degrade gracefully to the live profile on print; every new invoice writes the
-- authoritative snapshot server-side.
ALTER TABLE "invoices" ADD COLUMN "company_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;
