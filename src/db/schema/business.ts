// Our business-owned schema. Better Auth remains canonical for identity and
// tenancy (organization / member / invitation); this file only extends it.
//
// organization_profiles is 1:1 with Better Auth's organization: organization_id
// is BOTH the primary key and a FK -> organization.id (uuid), with ON DELETE
// CASCADE so a deleted org takes its profile with it. We deliberately do NOT
// duplicate name / slug / membership / role / invitation state here.

import { pgTable, uuid, text, numeric, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

// Clients — the first tenant-owned business table. Every row belongs to exactly
// one Better Auth organization; organization_id is the RLS tenant key (NOT NULL,
// FK -> organization.id, ON DELETE CASCADE). We deliberately mirror the existing
// local Client shape (name/type/phone/email/address/city/nui) rather than adding
// speculative CRM fields — this is a data-source migration, not a redesign.
//
// UNIQUE(organization_id, id) is redundant for uniqueness (id is already the PK)
// but lets FUTURE tenant tables (projects, invoices) carry a composite
// FK (organization_id, client_id) that structurally cannot cross tenants.
export const clients = pgTable(
  "clients",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // ClientType: 'Privat' | 'Biznes' (validated at the domain/action boundary).
    type: text("type").notNull().default("Privat"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    nui: text("nui"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("clients_org_id_uidx").on(table.organizationId, table.id),
    index("clients_org_idx").on(table.organizationId),
    index("clients_org_name_idx").on(table.organizationId, table.name),
  ],
);
