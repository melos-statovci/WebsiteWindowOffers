ALTER TABLE "organization" ADD COLUMN "provisioning_application_id" uuid;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "provisioning_owner_id" uuid;--> statement-breakpoint
-- Backfill only the already-authoritative application -> organization links.
-- Unlinked historical rows are intentionally not inferred from mutable slug.
UPDATE "organization" AS o
SET "provisioning_application_id" = t."id",
    "provisioning_owner_id" = t."user_id"
FROM "trial_applications" AS t
WHERE t."status" = 'approved'
  AND t."organization_id" = o."id";--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_user_uidx" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_provisioning_application_uidx" ON "organization" USING btree ("provisioning_application_id") WHERE "organization"."provisioning_application_id" is not null;
