// Our business-owned schema. Better Auth remains canonical for identity and
// tenancy (organization / member / invitation); this file only extends it.
//
// organization_profiles is 1:1 with Better Auth's organization: organization_id
// is BOTH the primary key and a FK -> organization.id (uuid), with ON DELETE
// CASCADE so a deleted org takes its profile with it. We deliberately do NOT
// duplicate name / slug / membership / role / invitation state here.

import { pgTable, uuid, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { organization } from "../auth-schema";

export const organizationProfiles = pgTable("organization_profiles", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  nui: text("nui"),
  vatNo: text("vat_no"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  businessEmail: text("business_email"),
  bank: text("bank"),
  swift: text("swift"),
  iban: text("iban"),
  marginDefault: numeric("margin_default", { precision: 5, scale: 2 }).notNull().default("0"),
  vatDefault: numeric("vat_default", { precision: 5, scale: 2 }).notNull().default("0"),
  plan: text("plan").notNull().default("SOLO"),
  logoStorageKey: text("logo_storage_key"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
