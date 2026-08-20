// PLATFORM read layer — cross-tenant organization metadata for the control plane.
//
// SECURITY / cross-tenant strategy (see PLATFORM_ADMIN_HANDOFF.md):
//   - organization / member / user / invitation and the platform control-plane
//     tables (organization_accounts) carry NO tenant RLS — exactly the existing
//     design for identity/tenancy tables. So the list + dashboard aggregates are
//     plain cross-tenant SELECTs the restricted runtime role can already run. No
//     RLS change, no BYPASSRLS, no per-org loop.
//   - The ONLY tenant-RLS data a platform admin reads is per-org USAGE COUNTS and
//     the company PROFILE, and only on the single-org detail view. Those reuse
//     the EXISTING withOrg(targetOrgId) machinery: the same RLS enforcement,
//     reached through the platform-authorized code path instead of membership.
//     One org is scoped at a time; no policy is weakened.
//
// EVERY function here assumes the caller has already passed platform-admin
// authorization (the layout gate + the page/action re-check). These are plain
// reads with no auth of their own by design — they are never imported by tenant
// code paths.

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { withOrg } from "@/db/tenant";
import { asPlanTier, type PlanTier } from "@/lib/plan";
import type { AccountStatus } from "@/server/platform/accounts";

export interface PlatformOrgListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  plan: PlanTier;
  status: AccountStatus;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface OrgListFilters {
  q?: string;
  status?: AccountStatus | "all";
  plan?: PlanTier | "all";
}

/**
 * Searchable tenant-organization list. Single cross-tenant query over non-RLS
 * tables (organization + organization_accounts + member + user). Owner is the
 * lexically-first member with role 'owner' (there is exactly one per org in this
 * product). Filters are applied in SQL.
 */
export async function listPlatformOrganizations(filters: OrgListFilters = {}): Promise<PlatformOrgListItem[]> {
  const q = filters.q?.trim();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const plan = filters.plan && filters.plan !== "all" ? filters.plan : null;

  const res = await db.execute(sql`
    select
      o.id,
      o.name,
      o.slug,
      o.created_at as "createdAt",
      coalesce(a.plan, 'SOLO') as plan,
      coalesce(a.status, 'active') as status,
      (select count(*) from member m where m.organization_id = o.id)::int as "memberCount",
      owner_u.name as "ownerName",
      owner_u.email as "ownerEmail"
    from organization o
    left join organization_accounts a on a.organization_id = o.id
    left join lateral (
      select u.name, u.email
      from member m
      join "user" u on u.id = m.user_id
      where m.organization_id = o.id and m.role = 'owner'
      order by m.created_at asc
      limit 1
    ) owner_u on true
    where
      (${q}::text is null or o.name ilike '%' || ${q} || '%' or o.slug ilike '%' || ${q} || '%')
      and (${status}::text is null or coalesce(a.status, 'active') = ${status})
      and (${plan}::text is null or coalesce(a.plan, 'SOLO') = ${plan})
    order by o.created_at desc
  `);

  return res.rows.map((r) => {
    const row = r as {
      id: string; name: string; slug: string; createdAt: string | Date;
      plan: string; status: string; memberCount: number;
      ownerName: string | null; ownerEmail: string | null;
    };
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: new Date(row.createdAt),
      plan: asPlanTier(row.plan),
      status: row.status === "suspended" ? "suspended" : "active",
      memberCount: Number(row.memberCount) || 0,
      ownerName: row.ownerName,
      ownerEmail: row.ownerEmail,
    };
  });
}

export interface PlatformMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
}

export interface PlatformOrgUsage {
  clients: number;
  projects: number;
  projectItems: number;
  invoices: number;
  payments: number;
}

export interface PlatformOrgProfile {
  nui: string | null;
  vatNo: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  businessEmail: string | null;
}

export interface PlatformOrgDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  plan: PlanTier;
  status: AccountStatus;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  internalNote: string | null;
  members: PlatformMember[];
  profile: PlatformOrgProfile;
  usage: PlatformOrgUsage;
}

/** One organization's full operational view, or null if the id is unknown. */
export async function getPlatformOrganization(orgId: string): Promise<PlatformOrgDetail | null> {
  // Base identity + account state — non-RLS, cross-tenant read.
  const base = await db.execute(sql`
    select
      o.id, o.name, o.slug, o.created_at as "createdAt",
      coalesce(a.plan, 'SOLO') as plan,
      coalesce(a.status, 'active') as status,
      a.suspended_at as "suspendedAt",
      a.suspended_reason as "suspendedReason",
      a.internal_note as "internalNote"
    from organization o
    left join organization_accounts a on a.organization_id = o.id
    where o.id = ${orgId}
    limit 1
  `);
  const b = base.rows[0] as
    | {
        id: string; name: string; slug: string; createdAt: string | Date;
        plan: string; status: string;
        suspendedAt: string | Date | null; suspendedReason: string | null; internalNote: string | null;
      }
    | undefined;
  if (!b) return null;

  // Members — non-RLS join.
  const memberRes = await db.execute(sql`
    select m.user_id as "userId", u.name, u.email, m.role, m.created_at as "joinedAt"
    from member m
    join "user" u on u.id = m.user_id
    where m.organization_id = ${orgId}
    order by m.created_at asc
  `);
  const members: PlatformMember[] = memberRes.rows.map((r) => {
    const row = r as { userId: string; name: string; email: string; role: string; joinedAt: string | Date };
    return { userId: row.userId, name: row.name, email: row.email, role: row.role, joinedAt: new Date(row.joinedAt) };
  });

  // Company profile + usage COUNTS — the only tenant-RLS data here. One
  // withOrg(orgId) transaction scopes RLS to exactly this org (platform-gated).
  // Counts only — never customer business CONTENTS.
  const { profile, usage } = await withOrg(orgId, async (tx) => {
    const prof = await tx.execute(sql`
      select nui, vat_no as "vatNo", address, city, phone, business_email as "businessEmail"
      from organization_profiles where organization_id = ${orgId} limit 1
    `);
    const counts = await tx.execute(sql`
      select
        (select count(*) from clients)::int        as clients,
        (select count(*) from projects)::int       as projects,
        (select count(*) from project_items)::int  as "projectItems",
        (select count(*) from invoices)::int       as invoices,
        (select count(*) from payments)::int       as payments
    `);
    const p = prof.rows[0] as unknown as PlatformOrgProfile | undefined;
    const c = counts.rows[0] as Record<keyof PlatformOrgUsage, number>;
    return {
      profile: {
        nui: p?.nui ?? null,
        vatNo: p?.vatNo ?? null,
        address: p?.address ?? null,
        city: p?.city ?? null,
        phone: p?.phone ?? null,
        businessEmail: p?.businessEmail ?? null,
      },
      usage: {
        clients: Number(c.clients) || 0,
        projects: Number(c.projects) || 0,
        projectItems: Number(c.projectItems) || 0,
        invoices: Number(c.invoices) || 0,
        payments: Number(c.payments) || 0,
      },
    };
  });

  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    createdAt: new Date(b.createdAt),
    plan: asPlanTier(b.plan),
    status: b.status === "suspended" ? "suspended" : "active",
    suspendedAt: b.suspendedAt ? new Date(b.suspendedAt) : null,
    suspendedReason: b.suspendedReason,
    internalNote: b.internalNote,
    members,
    profile,
    usage,
  };
}

export interface PlatformOverview {
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  totalMemberships: number;
  planDistribution: Record<PlatformTier, number>;
}

type PlatformTier = PlanTier;

/**
 * High-level platform metrics for the dashboard. All cheap single queries over
 * non-RLS tables. Deliberately NO platform-wide business-content totals (e.g.
 * total projects across every tenant) — those would require one RLS-scoped
 * transaction per org and are not "cheap"; per-org usage lives on the detail
 * view instead. This keeps V1 account-administration, not a BI system.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const orgRes = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where coalesce(a.status,'active') = 'active')::int as active,
      count(*) filter (where coalesce(a.status,'active') = 'suspended')::int as suspended,
      count(*) filter (where coalesce(a.plan,'SOLO') = 'SOLO')::int as solo,
      count(*) filter (where coalesce(a.plan,'SOLO') = 'BIZNES')::int as biznes,
      count(*) filter (where coalesce(a.plan,'SOLO') = 'FABRIKA')::int as fabrika
    from organization o
    left join organization_accounts a on a.organization_id = o.id
  `);
  const o = orgRes.rows[0] as Record<string, number>;

  const userRes = await db.execute(sql`select count(*)::int as users from "user"`);
  const memberRes = await db.execute(sql`select count(*)::int as memberships from member`);

  return {
    totalOrganizations: Number(o.total) || 0,
    activeOrganizations: Number(o.active) || 0,
    suspendedOrganizations: Number(o.suspended) || 0,
    totalUsers: Number((userRes.rows[0] as { users: number }).users) || 0,
    totalMemberships: Number((memberRes.rows[0] as { memberships: number }).memberships) || 0,
    planDistribution: {
      SOLO: Number(o.solo) || 0,
      BIZNES: Number(o.biznes) || 0,
      FABRIKA: Number(o.fabrika) || 0,
    },
  };
}
