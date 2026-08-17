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
  date,
  index,
  unique,
  uniqueIndex,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PricingCatalog } from "@/domain/pricing/types";
import type { WindowConfig, InvoiceClientSnapshot, InvoiceCompanySnapshot } from "@/domain/types";
import type { ProjectItemCalcSnapshot } from "@/domain/configurator/calc-snapshot";
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
    // Redundant for uniqueness (id is already the PK) but lets a Project Item
    // carry a composite FK (organization_id, price_list_id) -> price_lists so a
    // stored item can NEVER reference another organization's pricing version.
    unique("price_lists_org_id_uidx").on(table.organizationId, table.id),
    // At most one active version per organization. Partial index -> only rows
    // with is_active = true participate, so historical (inactive) versions never
    // collide. Combined with the save transaction this yields EXACTLY one active.
    uniqueIndex("price_lists_one_active_uidx")
      .on(table.organizationId)
      .where(sql`${table.isActive}`),
    index("price_lists_org_idx").on(table.organizationId),
  ],
);

// Projects (a.k.a. Offers) — tenant-owned business records migrated from
// localStorage in Phase 6. Directly org-owned (organization_id is the RLS tenant
// key). The Client relationship is DB-enforced same-tenant via a COMPOSITE FK
// (organization_id, client_id) -> clients(organization_id, id): Org A can never
// reference Org B's client even if application code is buggy. Client delete is
// blocked while projects exist (NO ACTION, the FK default) rather than RESTRICT,
// so a real client-delete with offers fails, yet deleting the whole organization
// still cascades (org CASCADE removes projects AND clients in one statement, and
// NO ACTION is satisfied once the projects are gone).
//
// Monetary totals are NOT stored: projectNet/projectTotal are DERIVED from the
// items (see src/domain/finance/selectors.ts). Only per-item authoritative
// unit_price lives in the DB. vat_rate is the 0..1 fraction the offer was priced
// at. number is the human-readable PRJ-YYYY-NNN, unique per org.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    // Human-readable offer number, unique per org (PRJ-YYYY-NNN).
    number: text("number").notNull(),
    title: text("title").notNull(),
    // OfferStatus: 'Draft' | 'Dërguar' | 'Pranuar' | 'Refuzuar' (validated at the
    // action boundary).
    status: text("status").notNull().default("Draft"),
    archived: boolean("archived").notNull().default(false),
    profileSystem: text("profile_system").notNull().default(""),
    profileColor: text("profile_color").notNull().default(""),
    // Offer VAT fraction (0..1), e.g. 0.18. Priced-at rate for this offer.
    vatRate: numeric("vat_rate", { precision: 5, scale: 4 }).notNull().default("0"),
    // Record<string, boolean> of toggle options (Marzha, Zbritje, TVSH, ...).
    options: jsonb("options").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Lets project_items carry a composite (organization_id, project_id) FK.
    unique("projects_org_id_uidx").on(table.organizationId, table.id),
    // Tenant-safe human-readable numbering: monotonic/unique per org.
    unique("projects_org_number_uidx").on(table.organizationId, table.number),
    // Same-tenant Client relationship, DB-enforced. Default ON DELETE NO ACTION:
    // blocks deleting a client that still has projects, but org-delete cascade
    // (which removes both) still succeeds.
    foreignKey({
      name: "projects_org_client_fk",
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
    }),
    index("projects_org_idx").on(table.organizationId),
    index("projects_org_client_idx").on(table.organizationId, table.clientId),
    index("projects_org_status_idx").on(table.organizationId, table.status),
  ],
);

// Project Items — the configured offer line items (one per configured product).
// Directly org-owned AND tenant-linked to their parent Project by a COMPOSITE FK
// (organization_id, project_id) -> projects(organization_id, id) ON DELETE
// CASCADE, so an item can never attach to another org's project and deleting a
// project removes its items. The pricing provenance is likewise tenant-safe: a
// composite FK (organization_id, price_list_id) -> price_lists(organization_id,
// id) makes it impossible to reference another org's pricing version.
//
// unit_price is SERVER-AUTHORITATIVE: computed on save via the shared
// computePrice(config, catalog) using the org's active price_lists version. The
// browser never supplies it. price_list_id + price_list_version pin the exact
// immutable catalog used; calculation_version pins the algorithm; calc_snapshot
// stores the server-generated materials/intermediates so the price is
// reproducible/explainable later without duplicating the whole catalog.
export const projectItems = pgTable(
  "project_items",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    // OfferItem.kind: 'Dritare' | 'Derë' | 'Rrëshqitëse' | 'Roletë'.
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    qty: integer("qty").notNull().default(1),
    // Server-authoritative unit price in EUR.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    // Full WindowConfig (validated at the action boundary before insert).
    config: jsonb("config").$type<WindowConfig>().notNull(),
    // Immutable pricing version used to compute unit_price.
    priceListId: uuid("price_list_id").notNull(),
    priceListVersion: integer("price_list_version").notNull(),
    // PRICING_CALCULATION_VERSION at compute time.
    calculationVersion: integer("calculation_version").notNull().default(1),
    // Server-generated snapshot (materials + key intermediates + pricing meta).
    calcSnapshot: jsonb("calc_snapshot").$type<ProjectItemCalcSnapshot>().notNull(),
    // Stable display order within a project (append-on-add). Avoids relying on
    // insertion timestamp for ordering.
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "project_items_org_project_fk",
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "project_items_org_price_list_fk",
      columns: [table.organizationId, table.priceListId],
      foreignColumns: [priceLists.organizationId, priceLists.id],
    }),
    index("project_items_org_idx").on(table.organizationId),
    index("project_items_org_project_idx").on(table.organizationId, table.projectId),
  ],
);

// ===========================================================================
// FINANCE (Phase 7) — Invoices, Invoice Lines, Payments.
//
// Invoices are historical accounting documents: once issued, what a past invoice
// SAYS must never change because a live business record (client name, project,
// pricing) later changes. That drives two design choices:
//   1. Snapshot: the client's fiscal identity is FROZEN onto the invoice
//      (client_name + client_snapshot JSONB) and the line values are copied at
//      creation. The printed document reads these, not a live JOIN.
//   2. Non-destructive relationships: deleting a Client or Project must never
//      delete an invoice. Client delete is BLOCKED while invoices exist (NO
//      ACTION); Project delete NULLS the invoice's project link (column-scoped
//      ON DELETE SET NULL (project_id)) while the invoice + its `reference`
//      snapshot survive. Only org-delete cascades finance away.
//
// Totals are NOT stored: invoiceNet/invoiceVat/invoiceTotal are DERIVED from the
// stored lines + invoice vat_rate in src/domain/finance/selectors.ts (the single
// source of truth every consumer already shares). The browser can never submit an
// authoritative total.
// ===========================================================================

// Invoices — directly org-owned (organization_id is the RLS tenant key). The
// Client relationship is DB-enforced same-tenant via a COMPOSITE FK
// (organization_id, client_id) -> clients(organization_id, id); NO ACTION blocks
// deleting a client that still has invoices (org-delete cascade still works). The
// optional Project relationship is likewise composite/same-tenant, with a
// column-scoped ON DELETE SET NULL (project_id) so deleting a source offer nulls
// the link but keeps the historical invoice and its human `reference`.
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    // Nullable link to the originating offer. Kept tenant-safe by the composite
    // FK below; NULLed (not cascaded) if the project is later deleted.
    projectId: uuid("project_id"),
    // Human-readable invoice number, unique per org (FAT-YYYY-NNN).
    number: text("number").notNull(),
    // SNAPSHOT of the client name at issue (the printed document reads this, not a
    // live JOIN, so renaming/deleting the client never rewrites history).
    clientName: text("client_name").notNull(),
    // Richer fiscal snapshot for the legal/printed document (name, NUI, address …).
    clientSnapshot: jsonb("client_snapshot").$type<InvoiceClientSnapshot>().notNull(),
    // ISSUER snapshot frozen at creation (organization.name + organization_profiles)
    // so re-printing a historical invoice never adopts the org's later details.
    // Default '{}' lets a pre-snapshot row degrade to the live profile on print.
    companySnapshot: jsonb("company_snapshot")
      .$type<InvoiceCompanySnapshot>()
      .notNull()
      .default({}),
    // Human-readable reference to the source offer (PRJ/OF number) — a snapshot
    // string that survives even if the project link is later NULLed.
    reference: text("reference"),
    // Pure dates (no time/tz). `date` mode:'string' returns 'YYYY-MM-DD' verbatim,
    // matching the domain Invoice.issuedAt/dueAt string shape.
    issuedAt: date("issued_at", { mode: "string" }).notNull(),
    dueAt: date("due_at", { mode: "string" }).notNull(),
    // InvoiceStatus: 'Draft'|'Dërguar'|'Paguar'|'Vonesë'|'Anuluar'. 'Paguar' is
    // payment-DERIVED (set when a payment settles the balance), never a free-form
    // manual status. Validated at the action boundary.
    status: text("status").notNull().default("Draft"),
    // Invoice VAT fraction (0..1), e.g. 0.18. Frozen at issue.
    vatRate: numeric("vat_rate", { precision: 5, scale: 4 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Lets invoice_lines + payments carry a composite (organization_id, invoice_id) FK.
    unique("invoices_org_id_uidx").on(table.organizationId, table.id),
    // Tenant-safe human-readable numbering: unique per org.
    unique("invoices_org_number_uidx").on(table.organizationId, table.number),
    // Same-tenant Client relationship, DB-enforced. ON DELETE NO ACTION (default)
    // blocks deleting a client that still has invoices; org-delete cascade still
    // removes both. An accounting document is never destroyed by a client delete.
    foreignKey({
      name: "invoices_org_client_fk",
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
    }),
    // Same-tenant, OPTIONAL Project relationship. Column-scoped SET NULL: deleting
    // a project nulls project_id (not organization_id, which is NOT NULL) so the
    // invoice survives with its `reference` snapshot intact.
    foreignKey({
      name: "invoices_org_project_fk",
      columns: [table.organizationId, table.projectId],
      foreignColumns: [projects.organizationId, projects.id],
    }).onDelete("set null"),
    index("invoices_org_idx").on(table.organizationId),
    index("invoices_org_client_idx").on(table.organizationId, table.clientId),
    index("invoices_org_status_idx").on(table.organizationId, table.status),
    index("invoices_org_project_idx").on(table.organizationId, table.projectId),
  ],
);

// Invoice Lines — the historical line items. Directly org-owned AND tenant-linked
// to their parent Invoice by a COMPOSITE FK (organization_id, invoice_id) ->
// invoices(organization_id, id) ON DELETE CASCADE (a line can never attach to
// another org's invoice; deleting an invoice removes its lines). Values are
// SNAPSHOTS copied at creation (from offer items or manual entry) — they never
// re-derive from a live project. Per-line VAT is NOT modelled: VAT is an
// invoice-level rate (matches the existing InvoiceLine shape).
export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").notNull(),
    description: text("description").notNull(),
    qty: integer("qty").notNull().default(1),
    // Snapshot unit price in EUR. For from-project invoices this is copied from the
    // authoritative project item; for manual invoices it is validated user input.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    // Provenance only (NOT a FK): the project item this line was snapshotted from,
    // if any. Kept as a bare id so item deletion never touches invoice history.
    sourceProjectItemId: uuid("source_project_item_id"),
    // Stable display order within the invoice (append-on-add).
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "invoice_lines_org_invoice_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.id],
    }).onDelete("cascade"),
    index("invoice_lines_org_idx").on(table.organizationId),
    index("invoice_lines_org_invoice_idx").on(table.organizationId, table.invoiceId),
  ],
);

// Payments — directly org-owned. Belongs to a Client (same-tenant composite FK,
// NO ACTION so a client with payment history cannot be deleted). MAY reference one
// Invoice (nullable): a linked payment settles that invoice; an unlinked payment
// is a customer ADVANCE / available credit. The invoice link is column-scoped ON
// DELETE SET NULL (invoice_id) so deleting an invoice UNLINKS its payments (the
// money survives as client credit) exactly as the current store does — it never
// deletes the payment. amount is a positive money value (DB CHECK), so a negative
// or zero payment can never be persisted even if application code is bypassed.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    invoiceId: uuid("invoice_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    // Pure date (no time/tz), 'YYYY-MM-DD'.
    date: date("date", { mode: "string" }).notNull(),
    // Payment method free text (Para në dorë / Transfertë bankare / Kartelë …).
    method: text("method").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Same-tenant Client relationship, NO ACTION (blocks client delete while
    // payments exist; org-delete cascade still removes both).
    foreignKey({
      name: "payments_org_client_fk",
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
    }),
    // Same-tenant, OPTIONAL Invoice relationship. Column-scoped SET NULL: deleting
    // an invoice unlinks its payments (money -> client advance/credit) rather than
    // destroying them.
    foreignKey({
      name: "payments_org_invoice_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.id],
    }).onDelete("set null"),
    // Money integrity: a persisted payment is always strictly positive.
    check("payments_amount_positive", sql`${table.amount} > 0`),
    index("payments_org_idx").on(table.organizationId),
    index("payments_org_client_idx").on(table.organizationId, table.clientId),
    index("payments_org_invoice_idx").on(table.organizationId, table.invoiceId),
  ],
);
