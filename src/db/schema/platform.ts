// PLATFORM CONTROL-PLANE schema — SaaS operational state, owned by Kornizo the
// PLATFORM, not by any tenant. This is deliberately SEPARATE from business.ts
// (tenant-owned, RLS+FORCE) because the security model is different:
//
//   - These tables carry NO tenant RLS. They are modelled exactly like the
//     Better Auth identity/tenancy tables (user/organization/member): not
//     tenant-scoped data, reachable cross-tenant by the restricted runtime role
//     with plain grants, and scoped in application code by the caller's id.
//   - Writes are gated by PLATFORM-ADMIN authorization (server-side), never by
//     tenant membership or a tenant RLS policy.
//
// Why not put plan/suspension on organization_profiles (a tenant RLS table)?
// Because then the platform list/dashboard would need one withOrg() transaction
// per org just to read a plan, and it would blur ownership — a tenant could, in
// principle, be granted a policy to write its own plan. Keeping SaaS state here
// makes the platform reads simple and keeps the plan a one-way (platform-only)
// write. See PLATFORM_ADMIN_HANDOFF.md / memory platform-admin-architecture.

import { pgTable, uuid, text, timestamp, jsonb, index, check, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user, organization } from "../auth-schema";

// platform_admins — the ONLY source of platform-operator authority. Keyed to a
// Better Auth user. Presence of a row === this user may operate the Kornizo
// platform. Completely separate from the org-level roles (owner/admin/...).
//
// SECURITY: the restricted runtime role gets SELECT-ONLY on this table, so a
// compromised app runtime can read (to authorize) but can NEVER insert/escalate
// a platform admin. Grants are done out-of-band by an operator with owner creds
// (scripts/seed-platform-admin.mjs).
export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // Snapshot of the email at grant time, for display/audit in the dashboard.
  email: text("email").notNull().default(""),
  // Free-text provenance ("bootstrap", "granted by X on ...").
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// organization_accounts — per-tenant SaaS account state (1:1 with a Better Auth
// organization). plan is the CANONICAL product plan source. commercial_access
// is the commercial lifecycle (trial/active). status is operational suspension.
//
// A missing row is treated as account_not_ready everywhere it is read. Better
// Auth organization membership alone must never grant tenant app access.
export const organizationAccounts = pgTable(
  "organization_accounts",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    // PlanTier: 'STANDARD' for launch. Future plans need an explicit migration.
    plan: text("plan").notNull().default("STANDARD"),
    // CommercialAccess: 'trial' | 'active'. Trial expiration is derived from
    // trial_ends_at and server time; 'trial_expired' is NOT stored.
    commercialAccess: text("commercial_access").notNull().default("trial"),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }).defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).default(sql`now() + interval '14 days'`),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    // 'active' | 'suspended'. Suspension blocks tenant app access; it never
    // deletes or alters business data.
    status: text("status").notNull().default("active"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    // Private control-plane note (invisible to tenant members). NOT the tenant's
    // client notes table.
    internalNote: text("internal_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("organization_accounts_plan_chk", sql`${table.plan} in ('STANDARD')`),
    check("organization_accounts_commercial_access_chk", sql`${table.commercialAccess} in ('trial','active')`),
    check(
      "organization_accounts_trial_window_chk",
      sql`${table.commercialAccess} = 'active' or (${table.trialStartedAt} is not null and ${table.trialEndsAt} is not null and ${table.trialEndsAt} > ${table.trialStartedAt})`,
    ),
    check("organization_accounts_status_chk", sql`${table.status} in ('active','suspended')`),
    index("organization_accounts_status_idx").on(table.status),
    index("organization_accounts_plan_idx").on(table.plan),
    index("organization_accounts_commercial_access_idx").on(table.commercialAccess),
    index("organization_accounts_trial_ends_idx").on(table.trialEndsAt),
  ],
);

// platform_audit_events — an APPEND-ONLY control-plane audit trail of platform
// mutations. NOT tenant data; only platform admins may read it; only the trusted
// platform mutation path writes it (in the SAME transaction as the mutation, so
// an event is never recorded for a change that did not persist, and vice versa).
//
// The actor + target are SNAPSHOTS (bare ids + name/email captured at write
// time), deliberately NOT FKs, so audit history survives a later user/org
// deletion. The runtime role gets SELECT + INSERT only (no UPDATE/DELETE), so the
// trail is immutable even to the app itself. Never log secrets/tokens/passwords/
// customer business records — metadata carries only the structured change.
export const platformAuditEvents = pgTable(
  "platform_audit_events",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    // Snapshot of the acting platform admin (from the authenticated platform
    // context — NEVER from the browser). Bare id: no FK, so deleting the user
    // never erases the audit record.
    actorUserId: uuid("actor_user_id").notNull(),
    actorEmail: text("actor_email").notNull().default(""),
    // Action type (CHECK-constrained to the known set).
    action: text("action").notNull(),
    // Target organization snapshot (nullable for non-org-scoped future events).
    organizationId: uuid("organization_id"),
    organizationName: text("organization_name"),
    // Structured, non-sensitive change description.
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "platform_audit_events_action_chk",
      sql`${table.action} in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED','TRIAL_APPLICATION_APPROVED','TRIAL_APPLICATION_REJECTED','DEMO_REQUEST_STATUS_CHANGED','TRIAL_APPLICATION_PROVISIONED','TRIAL_APPLICATION_PROVISIONING_FAILED')`,
    ),
    index("platform_audit_events_created_idx").on(table.createdAt),
    index("platform_audit_events_org_idx").on(table.organizationId),
    index("platform_audit_events_action_idx").on(table.action),
  ],
);

// trial_applications — public acquisition applications for a future Kornizo
// tenant. Linked to a Better Auth user AND (after Milestone 4 provisioning) to
// the ONE organization created from it.
//
// PROVISIONING MODEL (Milestone 4). Creating a tenant spans Better Auth
// organization/member writes and Kornizo profile/account/pricing writes; those
// do not share one SQL transaction, so the lifecycle is modelled explicitly
// rather than pretended atomic:
//
//   not_started -> in_progress -> provisioned
//                       \-------> failed -> in_progress -> ...
//
// Exactly-once organization creation does NOT rely on this status column. It
// relies on `provisioning_slug`: a stable slug derived from the application id
// and persisted BEFORE Better Auth is called. `organization.slug` is UNIQUE, so
// a crash between "organization created" and "organization_id recorded" cannot
// produce a second organization — the retry either finds the slug taken and
// adopts that organization, or creates it. See src/server/provisioning.ts.
export const trialApplications = pgTable(
  "trial_applications",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    applicantName: text("applicant_name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    companyName: text("company_name").notNull(),
    phone: text("phone").notNull(),
    country: text("country").notNull(),
    companySize: text("company_size").notNull(),
    offersPerMonth: integer("offers_per_month"),
    message: text("message"),
    status: text("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id"),
    reviewedByEmail: text("reviewed_by_email"),
    internalReviewNote: text("internal_review_note"),
    // --- Milestone 4 provisioning linkage/state (platform-written only) ---
    // The ONE organization created from this application. Never client-supplied.
    //
    // RESTRICT, not CASCADE/SET NULL: a provisioned application is historical
    // acquisition evidence, so the organization it points at may not simply
    // vanish beneath it. (Org hard-delete is not a product feature; test/DEV
    // teardown unlinks these rows explicitly first.)
    organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "restrict" }),
    // 'not_started' | 'in_progress' | 'provisioned' | 'failed'
    provisioningStatus: text("provisioning_status").notNull().default("not_started"),
    // Stable, application-derived organization slug. Persisted on the FIRST
    // claim and never rewritten — this is the exactly-once key.
    provisioningSlug: text("provisioning_slug"),
    provisioningStartedAt: timestamp("provisioning_started_at", { withTimezone: true }),
    provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
    provisioningAttempts: integer("provisioning_attempts").notNull().default(0),
    // Sanitized failure CATEGORY only — never a raw DB/Better Auth error string.
    provisioningErrorCode: text("provisioning_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("trial_applications_user_uidx").on(table.userId),
    uniqueIndex("trial_applications_normalized_email_uidx").on(table.normalizedEmail),
    index("trial_applications_status_idx").on(table.status),
    index("trial_applications_created_idx").on(table.createdAt),
    // One organization may belong to at most one trial application, and one
    // application to at most one organization.
    uniqueIndex("trial_applications_organization_uidx")
      .on(table.organizationId)
      .where(sql`${table.organizationId} is not null`),
    uniqueIndex("trial_applications_provisioning_slug_uidx")
      .on(table.provisioningSlug)
      .where(sql`${table.provisioningSlug} is not null`),
    index("trial_applications_provisioning_status_idx").on(table.provisioningStatus),
    check("trial_applications_status_chk", sql`${table.status} in ('pending','approved','rejected')`),
    check(
      "trial_applications_provisioning_status_chk",
      sql`${table.provisioningStatus} in ('not_started','in_progress','provisioned','failed')`,
    ),
    // A provisioned application MUST carry its organization and a timestamp.
    check(
      "trial_applications_provisioned_shape_chk",
      sql`${table.provisioningStatus} <> 'provisioned' or (${table.organizationId} is not null and ${table.provisionedAt} is not null)`,
    ),
    // Only an APPROVED application may ever be linked to an organization, so a
    // rejected/pending row can never carry tenant access.
    check(
      "trial_applications_link_requires_approval_chk",
      sql`${table.organizationId} is null or ${table.status} = 'approved'`,
    ),
    check("trial_applications_company_size_chk", sql`${table.companySize} in ('1-5','6-15','16-50','51+')`),
    check("trial_applications_offers_per_month_chk", sql`${table.offersPerMonth} is null or (${table.offersPerMonth} >= 0 and ${table.offersPerMonth} <= 100000)`),
  ],
);

// demo_requests — lightweight public demo/contact requests. These never create
// a Better Auth user and never grant tenant access.
export const demoRequests = pgTable(
  "demo_requests",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    name: text("name").notNull(),
    companyName: text("company_name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    phone: text("phone").notNull(),
    country: text("country").notNull(),
    message: text("message"),
    status: text("status").notNull().default("new"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    statusChangedByUserId: uuid("status_changed_by_user_id"),
    statusChangedByEmail: text("status_changed_by_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("demo_requests_normalized_email_uidx").on(table.normalizedEmail),
    index("demo_requests_status_idx").on(table.status),
    index("demo_requests_created_idx").on(table.createdAt),
    check("demo_requests_status_chk", sql`${table.status} in ('new','contacted','closed')`),
  ],
);
