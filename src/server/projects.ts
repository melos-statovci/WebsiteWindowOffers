// Server-side project (offer) READS. The active organization is resolved from the
// Better Auth session (requireAuthContext) — never from client input — and every
// query runs inside a withOrg() RLS-scoped transaction as the restricted role, so
// Postgres guarantees a caller only ever sees its own tenant's projects.
//
// Rows are mapped to the EXACT shared domain Project / OfferItem shape so the
// existing UI, selectors (projectNet/projectTotal/clientStats/dashboardStats),
// print, and search keep working unchanged after the data-source migration.
//
// clientName is JOINed live from the clients table rather than stored: the
// clients table is the single source of truth for client identity and the
// composite (organization_id, client_id) FK (with client-delete blocked while
// projects exist) guarantees the JOIN always resolves. If a future requirement
// needs the client name frozen at offer acceptance, add an explicit snapshot
// column then — do not reintroduce a redundant always-live copy.

import { and, asc, desc, eq } from "drizzle-orm";
import { projects, projectItems, clients } from "@/db/schema/business";
import { withOrg, type TenantTx } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import { isUuid } from "@/auth/organization";
import type { Project, OfferItem, OfferStatus, WindowConfig } from "@/domain/types";

type ProjectRow = typeof projects.$inferSelect;
type ItemRow = typeof projectItems.$inferSelect;

/** DB item row -> shared domain OfferItem (numeric text -> number). */
function toOfferItem(row: ItemRow): OfferItem {
  return {
    id: row.id,
    kind: row.kind as OfferItem["kind"],
    label: row.label,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    qty: row.qty,
    unitPrice: Number(row.unitPrice),
    config: row.config as WindowConfig,
  };
}

/** DB project row (+ joined client name + its items) -> shared domain Project. */
function toProject(row: ProjectRow, clientName: string, items: OfferItem[]): Project {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    clientId: row.clientId,
    clientName,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    status: row.status as OfferStatus,
    archived: row.archived,
    items,
    profileSystem: row.profileSystem,
    profileColor: row.profileColor,
    vatRate: Number(row.vatRate),
    options: (row.options ?? {}) as Record<string, boolean>,
  };
}

/** Load all items of the active org, grouped by project id (sorted for display). */
async function itemsByProject(tx: TenantTx): Promise<Map<string, OfferItem[]>> {
  const rows = await tx
    .select()
    .from(projectItems)
    .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt), asc(projectItems.id));
  const map = new Map<string, OfferItem[]>();
  for (const r of rows) {
    const list = map.get(r.projectId) ?? [];
    list.push(toOfferItem(r));
    map.set(r.projectId, list);
  }
  return map;
}

/**
 * All projects of the caller's active organization, newest first, each with its
 * items and live client name — the exact shape the store/UI consumes.
 */
export async function listProjects(): Promise<Project[]> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select({ project: projects, clientName: clients.name })
      .from(projects)
      .innerJoin(
        clients,
        and(eq(clients.organizationId, projects.organizationId), eq(clients.id, projects.clientId)),
      )
      .orderBy(desc(projects.createdAt), desc(projects.id));
    const items = await itemsByProject(tx);
    return rows.map((r) => toProject(r.project, r.clientName, items.get(r.project.id) ?? []));
  });
}

/**
 * One project by id, scoped to the active organization. Returns null when the id
 * is malformed, does not exist, or belongs to another tenant (RLS hides it) — the
 * caller cannot distinguish these cases, which is deliberate.
 */
export async function getProject(id: string): Promise<Project | null> {
  if (!isUuid(id)) return null;
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select({ project: projects, clientName: clients.name })
      .from(projects)
      .innerJoin(
        clients,
        and(eq(clients.organizationId, projects.organizationId), eq(clients.id, projects.clientId)),
      )
      .where(eq(projects.id, id))
      .limit(1);
    if (!rows[0]) return null;
    const itemRows = await tx
      .select()
      .from(projectItems)
      .where(eq(projectItems.projectId, id))
      .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt), asc(projectItems.id));
    return toProject(rows[0].project, rows[0].clientName, itemRows.map(toOfferItem));
  });
}
