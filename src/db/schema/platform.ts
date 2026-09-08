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

import { pgTable, uuid, text, timestamp, jsonb, index, check } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// organization_accounts — per-tenant SaaS account state (1:1 with a Better Auth
// organization). plan is the CANONICAL product plan source. commercial_access
// is the commercial lifecycle (trial/active). status is operational suspension.
//
// A missing row degrades to Standard + active access everywhere it is read, so
// an org can never be locked out merely because its account row was not created
// yet; suspension and trial expiry are explicit/derived states.
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
    trialStartedAt: timestamp("trial_started_at").defaultNow(),
    trialEndsAt: timestamp("trial_ends_at").default(sql`now() + interval '14 days'`),
    activatedAt: timestamp("activated_at"),
    // 'active' | 'suspended'. Suspension blocks tenant app access; it never
    // deletes or alters business data.
    status: text("status").notNull().default("active"),
    suspendedAt: timestamp("suspended_at"),
    suspendedReason: text("suspended_reason"),
    // Private control-plane note (invisible to tenant members). NOT the tenant's
    // client notes table.
    internalNote: text("internal_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "platform_audit_events_action_chk",
      sql`${table.action} in ('PLAN_CHANGED','ORGANIZATION_SUSPENDED','ORGANIZATION_REACTIVATED','INTERNAL_NOTE_UPDATED','CUSTOMER_ACTIVATED','TRIAL_EXTENDED')`,
    ),
    index("platform_audit_events_created_idx").on(table.createdAt),
    index("platform_audit_events_org_idx").on(table.organizationId),
    index("platform_audit_events_action_idx").on(table.action),
  ],
);
