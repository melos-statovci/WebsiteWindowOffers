// Our business-owned schema. Better Auth remains canonical for identity and
// tenancy (organization / member / invitation); this file only extends it.
//
// organization_profiles is 1:1 with Better Auth's organization: organization_id
// is BOTH the primary key and a FK -> organization.id (uuid), with ON DELETE
// CASCADE so a deleted org takes its profile with it. We deliberately do NOT
// duplicate name / slug / membership / role / invitation state here.

import {
  pgTable,
  uuid,
  text,
  numeric,
  jsonb,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PricingCatalog } from "@/domain/pricing/types";
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

// Pricing — tenant-owned and VERSIONED. Each row is ONE immutable version of an
// organization's complete pricing, stored as a self-contained snapshot in the
// `catalog` JSONB column (the whole domain PricingCatalog: systems, profiles,
// metals, arming, glass, panels, expansions, roleta, doors, and the accessory /
// production parameter maps).
//
// Why a snapshot-per-version (JSONB) rather than child tables per collection:
// the catalog is always read and written as ONE atomic unit — the editor saves
// the entire draft with a single button, and the configurator needs the whole
// catalog to compute a price. Nothing queries individual pricing rows across
// versions relationally. Decomposing into child tables would duplicate every row
// for every version for zero query benefit, and would enlarge the surface over
// which per-version immutability must be defended. A single directly-org-owned
// row also removes the entire class of cross-tenant child-attachment bugs: there
// is no child row that could be pointed at another org's parent.
//
// Invariants (DB-enforced, not UI convention):
//   - version is monotonic per org: UNIQUE(organization_id, version).
//   - EXACTLY ONE active version per org: a PARTIAL UNIQUE index over
//     organization_id WHERE is_active (see migration 0007). A successful save
//     inserts a new active version and deactivates the previous one in one
//     transaction, so old versions are retained, never mutated.
//   - calculation_version records which window-calc contract priced this catalog
//     (PRICING_CALCULATION_VERSION), so Phase 6 can reproduce stored money.
export const priceLists = pgTable(
  "price_lists",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    // The complete domain PricingCatalog for this version (validated at the
    // action boundary before insert; reconstructed losslessly on read).
    catalog: jsonb("catalog").notNull().$type<PricingCatalog>(),
    calculationVersion: integer("calculation_version").notNull().default(1),
    // Audit only: the member who saved this version. Intentionally NOT a FK — a
    // later-deleted user must never cascade-delete pricing history.
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("price_lists_org_version_uidx").on(table.organizationId, table.version),
    // At most one active version per organization. Partial index -> only rows
    // with is_active = true participate, so historical (inactive) versions never
    // collide. Combined with the save transaction this yields EXACTLY one active.
    uniqueIndex("price_lists_one_active_uidx")
      .on(table.organizationId)
      .where(sql`${table.isActive}`),
    index("price_lists_org_idx").on(table.organizationId),
  ],
);
