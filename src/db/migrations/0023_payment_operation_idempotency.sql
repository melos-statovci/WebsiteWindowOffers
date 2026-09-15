-- RC-12 — durable, tenant-scoped identity for NEW payment commands.
--
-- The action takes a transaction-local advisory lock for the exact tenant/key,
-- then relies on payment_operations_org_key_uidx as the durable backstop. The
-- receipt insert and payment insert share the existing app.current_org
-- transaction, so both commit or both roll back. payment_id is intentionally
-- NOT a foreign key: deleting/reversing the payment leaves a tombstone that
-- prevents an old ambiguous request from recreating money. Existing historical
-- payments are intentionally not backfilled with invented operation keys.
CREATE TABLE "payment_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_key" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"request_hash" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"paid_in_full" boolean,
	"credit" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_operations_org_key_uidx" UNIQUE("organization_id","operation_key"),
	CONSTRAINT "payment_operations_type_check" CHECK ("payment_operations"."operation_type" in ('INVOICE_PAYMENT', 'ADVANCE_PAYMENT')),
	CONSTRAINT "payment_operations_hash_check" CHECK ("payment_operations"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "payment_operations_credit_check" CHECK ("payment_operations"."credit" is null or "payment_operations"."credit" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_operations_org_idx" ON "payment_operations" USING btree ("organization_id");--> statement-breakpoint

-- Tenant data: fail closed without app.current_org and subject even the table
-- owner to the policy. Runtime only needs to read an existing receipt and insert
-- a completed one; UPDATE/DELETE are deliberately not granted.
ALTER TABLE "payment_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_operations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "payment_operations_select" ON "payment_operations"
  FOR SELECT
  USING ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payment_operations_insert" ON "payment_operations"
  FOR INSERT
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "payment_operations" TO kornizo_app;
