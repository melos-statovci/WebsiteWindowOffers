// Project (offer) + Project Item action cores. Each composes the Phase 3 spine
// (createAction): Zod validation -> auth -> trusted active org -> canonical
// permission -> withOrg RLS transaction -> typed result -> revalidate.
//
// The tenant is ALWAYS ctx.organizationId (session-derived); any org id in input
// is ignored and RLS + the composite FKs are the backstop.
//
// MONEY AUTHORITY: item add/update/duplicate NEVER trust a browser price. The
// server loads the org's active pricing version and runs the shared
// computePrice/computeMaterials, persisting only its own result plus the pricing
// provenance (price_list_id + version + calculation_version + calc_snapshot).
//
// STALE PRICING: the client may pass previewedPriceListVersion (the version it
// priced the live preview against). If that no longer matches the active version,
// the save is rejected as CONFLICT so the user reviews the repriced value. The
// stored price always comes from the authoritative active catalog regardless.
//
// EDIT/DUPLICATE REPRICE RULE (deliberate): editing or duplicating an item is a
// re-quote — it recomputes against the CURRENT active pricing and records the new
// version/snapshot. Items that are never edited keep their original stored price
// and price_list reference forever (historical reproducibility).

import { and, desc, eq, sql } from "drizzle-orm";
import { projects, projectItems, priceLists } from "@/db/schema/business";
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectStatusSchema,
  projectArchiveSchema,
  projectDeleteSchema,
  projectOptionSchema,
  itemAddSchema,
  itemUpdateSchema,
  itemRefSchema,
} from "@/domain/validation/project";
import {
  computePrice,
  computeMaterials,
  PRICING_CALCULATION_VERSION,
} from "@/domain/configurator/window-calc";
import { parsePricingCatalog } from "@/domain/validation/pricing";
import { ensureActivePriceList } from "@/server/pricing-init";
import { createAction, fail } from "@/server/action";
import { can } from "@/server/authz";
import type { TenantTx } from "@/db/tenant";
import type { OfferItem, ProductType, WindowConfig } from "@/domain/types";
import type { ProjectItemCalcSnapshot } from "@/domain/configurator/calc-snapshot";

const currentYear = () => new Date().getFullYear();

/** Detect a specific FK violation across drizzle's wrapped error + pg cause. */
function isConstraintViolation(e: unknown, name: string): boolean {
  const node = e as { constraint?: string; message?: string; cause?: unknown } | null;
  if (!node) return false;
  if (node.constraint === name) return true;
  if (typeof node.message === "string" && node.message.includes(name)) return true;
  return isConstraintViolation(node.cause, name);
}

/** OfferItem.kind from the configured product type (mirrors the configurator). */
function kindOf(pt: ProductType): OfferItem["kind"] {
  if (pt === "Dritare") return "Dritare";
  if (pt === "Rreshqitëse") return "Rrëshqitëse";
  if (pt === "Roletë") return "Roletë";
  return "Derë";
}

/** Assert the project exists in the active org (RLS-scoped); returns its status. */
async function requireProject(tx: TenantTx, orgId: string, projectId: string): Promise<string> {
  const rows = await tx
    .select({ status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1);
  if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
  return rows[0].status;
}

// ACCEPTED-OFFER FREEZE (Phase 7 hard precondition). An offer with status
// "Pranuar" (accepted) is a committed commercial document: its VALUE must not
// silently drift, because that is exactly what an invoice is generated from. So
// value-changing edits (add/edit/duplicate/delete items, edit commercial fields,
// toggle options) are blocked while accepted. The user must first REOPEN it
// (setProjectStatus back to a non-accepted status) — a deliberate action — then
// edit. Accepting, archiving, and deleting remain allowed. Editing an item still
// re-quotes at current pricing (the Phase 6 rule), which is precisely why an
// accepted offer must be frozen: otherwise a later pricing change would rewrite an
// accepted value with no explicit decision.
function assertEditable(status: string): void {
  if (status === "Pranuar") {
    throw fail(
      "RULE_VIOLATION",
      "Oferta është e pranuar. Rihapeni ofertën para se ta ndryshoni.",
    );
  }
}

interface PricedItem {
  kind: OfferItem["kind"];
  label: string;
  widthMm: number;
  heightMm: number;
  unitPrice: string; // numeric column value (2dp string)
  priceListId: string;
  priceListVersion: number;
  calculationVersion: number;
  calcSnapshot: ProjectItemCalcSnapshot;
}

/**
 * Compute the AUTHORITATIVE item price from a config using the org's active
 * pricing version. Enforces the stale-preview CONFLICT rule. This is the only
 * place a stored item price is ever produced.
 */
async function priceItem(
  tx: TenantTx,
  orgId: string,
  userId: string,
  config: WindowConfig,
  previewedVersion: number | undefined,
): Promise<PricedItem> {
  await ensureActivePriceList(tx, orgId, userId);
  const rows = await tx
    .select()
    .from(priceLists)
    .where(and(eq(priceLists.organizationId, orgId), eq(priceLists.isActive, true)))
    .orderBy(desc(priceLists.version))
    .limit(1);
  const active = rows[0];
  if (!active) throw fail("INTERNAL", "Nuk u gjet çmimorja aktive.");

  // Stale-preview guard: the browser priced its live preview against a version
  // that is no longer active -> reject so the user reviews the repriced value.
  if (previewedVersion !== undefined && previewedVersion !== active.version) {
    throw fail(
      "CONFLICT",
      "Çmimorja u përditësua ndërkohë. Rishikoni çmimin e ri para se ta ruani.",
    );
  }

  const catalog = parsePricingCatalog(active.catalog);
  const unit = computePrice(config, catalog);
  const materials = computeMaterials(config);

  const snapshot: ProjectItemCalcSnapshot = {
    materials,
    unitPrice: unit,
    manualPriceUsed: typeof config.manualPrice === "number" && config.manualPrice > 0,
    priceListId: active.id,
    priceListVersion: active.version,
    calculationVersion: PRICING_CALCULATION_VERSION,
    computedAtIso: new Date().toISOString(),
  };

  return {
    kind: kindOf(config.productType),
    label: config.productType,
    widthMm: config.widthMm,
    heightMm: config.heightMm,
    unitPrice: unit.toFixed(2),
    priceListId: active.id,
    priceListVersion: active.version,
    calculationVersion: PRICING_CALCULATION_VERSION,
    calcSnapshot: snapshot,
  };
}

/** Serialize per-project item ordering / numbering with a transaction lock. */
async function nextSortOrder(tx: TenantTx, projectId: string): Promise<number> {
  const rows = await tx
    .select({ m: sql<number>`coalesce(max(${projectItems.sortOrder}), -1)` })
    .from(projectItems)
    .where(eq(projectItems.projectId, projectId));
  return (rows[0]?.m ?? -1) + 1;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const createProjectAction = createAction({
  input: projectCreateSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;

    // Tenant-safe, collision-free numbering: serialize per-org, then take the
    // next suffix for the current year. UNIQUE(org, number) is the hard backstop.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('projects_number'), hashtext(${orgId}))`,
    );
    const year = currentYear();
    const prefix = `PRJ-${year}-`;
    const existing = await tx
      .select({ number: projects.number })
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), sql`${projects.number} like ${prefix + "%"}`));
    let maxN = 0;
    for (const r of existing) {
      const m = r.number.match(/(\d+)$/);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    const number = `${prefix}${String(maxN + 1).padStart(3, "0")}`;

    // organization_id from the trusted session only. The composite
    // (organization_id, client_id) FK rejects a client from another org; surface
    // it as a clean VALIDATION rather than a raw DB error.
    try {
      const rows = await tx
        .insert(projects)
        .values({
          organizationId: orgId,
          clientId: input.clientId,
          number,
          title: input.title,
          status: input.status ?? "Draft",
          profileSystem: input.profileSystem ?? "",
          profileColor: input.profileColor ?? "",
          vatRate: input.vatRate.toString(),
        })
        .returning({ id: projects.id, number: projects.number });
      return { id: rows[0].id, number: rows[0].number };
    } catch (e) {
      if (isConstraintViolation(e, "projects_org_client_fk")) {
        throw fail("VALIDATION", "Klienti nuk i përket organizatës aktive.");
      }
      throw e;
    }
  },
});

export const updateProjectAction = createAction({
  input: projectUpdateSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    // Frozen while accepted (commercial fields incl. vatRate change the value).
    assertEditable(await requireProject(tx, ctx.organizationId, input.id));
    const rows = await tx
      .update(projects)
      .set({
        title: input.title,
        profileSystem: input.profileSystem ?? "",
        profileColor: input.profileColor ?? "",
        vatRate: input.vatRate.toString(),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)))
      .returning({ id: projects.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    return { id: rows[0].id };
  },
});

export const setProjectStatusAction = createAction({
  input: projectStatusSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    // Accepting an offer is a distinct capability: operators may edit but not
    // accept. Other status changes only need project:write.
    if (input.status === "Pranuar" && !can(ctx.role, { project: ["accept"] })) {
      throw fail("FORBIDDEN", "Nuk keni leje për të pranuar oferta.");
    }
    const rows = await tx
      .update(projects)
      .set({ status: input.status, updatedAt: new Date() })
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)))
      .returning({ id: projects.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    return { id: rows[0].id };
  },
});

export const archiveProjectAction = createAction({
  input: projectArchiveSchema,
  permission: { project: ["archive"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const rows = await tx
      .update(projects)
      .set({ archived: input.archived, updatedAt: new Date() })
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)))
      .returning({ id: projects.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    return { id: rows[0].id };
  },
});

export const deleteProjectAction = createAction({
  input: projectDeleteSchema,
  permission: { project: ["delete"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    // Items cascade via the composite FK ON DELETE CASCADE.
    const rows = await tx
      .delete(projects)
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)))
      .returning({ id: projects.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    return { id: rows[0].id };
  },
});

export const setProjectOptionAction = createAction({
  input: projectOptionSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects"],
  handler: async ({ input, ctx, tx }) => {
    const rows = await tx
      .select({ options: projects.options, status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)))
      .limit(1);
    if (rows.length === 0) throw fail("NOT_FOUND", "Projekti nuk u gjet.");
    assertEditable(rows[0].status);
    const options = { ...((rows[0].options ?? {}) as Record<string, boolean>), [input.key]: input.value };
    await tx
      .update(projects)
      .set({ options, updatedAt: new Date() })
      .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)));
    return { id: input.id };
  },
});

// ---------------------------------------------------------------------------
// Project items
// ---------------------------------------------------------------------------
export const addProjectItemAction = createAction({
  input: itemAddSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    assertEditable(await requireProject(tx, orgId, input.projectId));
    const priced = await priceItem(tx, orgId, ctx.userId, input.config as WindowConfig, input.previewedPriceListVersion);
    const sortOrder = await nextSortOrder(tx, input.projectId);
    const rows = await tx
      .insert(projectItems)
      .values({
        organizationId: orgId,
        projectId: input.projectId,
        kind: priced.kind,
        label: priced.label,
        widthMm: priced.widthMm,
        heightMm: priced.heightMm,
        qty: input.qty,
        unitPrice: priced.unitPrice,
        config: input.config as WindowConfig,
        priceListId: priced.priceListId,
        priceListVersion: priced.priceListVersion,
        calculationVersion: priced.calculationVersion,
        calcSnapshot: priced.calcSnapshot,
        sortOrder,
      })
      .returning({ id: projectItems.id });
    return { id: rows[0].id, unitPrice: Number(priced.unitPrice), priceListVersion: priced.priceListVersion };
  },
});

export const updateProjectItemAction = createAction({
  input: itemUpdateSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    assertEditable(await requireProject(tx, orgId, input.projectId));
    // Re-quote: recompute against the CURRENT active pricing and record the new
    // version/snapshot (deliberate edit=reprice rule).
    const priced = await priceItem(tx, orgId, ctx.userId, input.config as WindowConfig, input.previewedPriceListVersion);
    const rows = await tx
      .update(projectItems)
      .set({
        kind: priced.kind,
        label: priced.label,
        widthMm: priced.widthMm,
        heightMm: priced.heightMm,
        qty: input.qty,
        unitPrice: priced.unitPrice,
        config: input.config as WindowConfig,
        priceListId: priced.priceListId,
        priceListVersion: priced.priceListVersion,
        calculationVersion: priced.calculationVersion,
        calcSnapshot: priced.calcSnapshot,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectItems.id, input.itemId),
          eq(projectItems.projectId, input.projectId),
          eq(projectItems.organizationId, orgId),
        ),
      )
      .returning({ id: projectItems.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Artikulli nuk u gjet.");
    return { id: rows[0].id, unitPrice: Number(priced.unitPrice), priceListVersion: priced.priceListVersion };
  },
});

export const duplicateProjectItemAction = createAction({
  input: itemRefSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;
    assertEditable(await requireProject(tx, orgId, input.projectId));
    const src = await tx
      .select()
      .from(projectItems)
      .where(
        and(
          eq(projectItems.id, input.itemId),
          eq(projectItems.projectId, input.projectId),
          eq(projectItems.organizationId, orgId),
        ),
      )
      .limit(1);
    if (src.length === 0) throw fail("NOT_FOUND", "Artikulli nuk u gjet.");
    const config = src[0].config as WindowConfig;
    // A duplicate is a NEW item created now -> priced against current active
    // pricing (never copies the source's possibly-stale money).
    const priced = await priceItem(tx, orgId, ctx.userId, config, undefined);
    const sortOrder = await nextSortOrder(tx, input.projectId);
    const rows = await tx
      .insert(projectItems)
      .values({
        organizationId: orgId,
        projectId: input.projectId,
        kind: priced.kind,
        label: src[0].label,
        widthMm: priced.widthMm,
        heightMm: priced.heightMm,
        qty: src[0].qty,
        unitPrice: priced.unitPrice,
        config,
        priceListId: priced.priceListId,
        priceListVersion: priced.priceListVersion,
        calculationVersion: priced.calculationVersion,
        calcSnapshot: priced.calcSnapshot,
        sortOrder,
      })
      .returning({ id: projectItems.id });
    return { id: rows[0].id, unitPrice: Number(priced.unitPrice) };
  },
});

export const deleteProjectItemAction = createAction({
  input: itemRefSchema,
  permission: { project: ["write"] },
  revalidate: ["/projects", "/dashboard"],
  handler: async ({ input, ctx, tx }) => {
    assertEditable(await requireProject(tx, ctx.organizationId, input.projectId));
    const rows = await tx
      .delete(projectItems)
      .where(
        and(
          eq(projectItems.id, input.itemId),
          eq(projectItems.projectId, input.projectId),
          eq(projectItems.organizationId, ctx.organizationId),
        ),
      )
      .returning({ id: projectItems.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Artikulli nuk u gjet.");
    return { id: rows[0].id };
  },
});
