// Server-side pricing READS + default initialization. The active organization is
// always resolved from the Better Auth session (requireAuthContext) — never from
// client input — and every query runs inside a withOrg() RLS-scoped transaction
// as the restricted role, so Postgres itself guarantees a caller only ever sees
// its own tenant's pricing.
//
// A brand-new organization has no pricing rows yet. Rather than depend on the
// browser's localStorage (the old source), the server LAZILY and idempotently
// creates version 1 from the canonical domain default the first time pricing is
// read. The insert is guarded by the partial-unique "one active per org" index,
// so repeated/concurrent initialization can never create a second active
// version. This is the authoritative recovery path; the org-creation hook also
// best-effort seeds it, but correctness does not depend on the hook running.

import { and, desc, eq } from "drizzle-orm";
import { priceLists } from "@/db/schema/business";
import { withOrg } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import { ensureActivePriceList } from "@/server/pricing-init";
import { parsePricingCatalog } from "@/domain/validation/pricing";
import type { PricingCatalog } from "@/domain/pricing/types";

export { ensureActivePriceList } from "@/server/pricing-init";

/** The active pricing version of an organization, reconstructed as domain data. */
export interface ActivePriceList {
  priceListId: string;
  version: number;
  calculationVersion: number;
  catalog: PricingCatalog;
  /** Version creation timestamp (ISO) — used only for display. */
  createdAt: string;
}

type PriceListRow = typeof priceLists.$inferSelect;

/** DB row -> ActivePriceList; the catalog JSONB is re-validated (fail-closed). */
function toActivePriceList(row: PriceListRow): ActivePriceList {
  return {
    priceListId: row.id,
    version: row.version,
    calculationVersion: row.calculationVersion,
    // Authoritative reconstruction: parse guarantees the stored JSON still maps
    // losslessly onto the domain PricingCatalog shape before the app uses it.
    catalog: parsePricingCatalog(row.catalog),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * The caller's active pricing version, as domain data. Ensures a default v1
 * exists first, so this never returns null for a real, authenticated org.
 */
export async function getActivePriceList(): Promise<ActivePriceList> {
  const { user, activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    await ensureActivePriceList(tx, activeOrg.id, user.id);
    const rows = await tx
      .select()
      .from(priceLists)
      .where(and(eq(priceLists.organizationId, activeOrg.id), eq(priceLists.isActive, true)))
      .orderBy(desc(priceLists.version))
      .limit(1);
    // ensureActivePriceList guarantees a row; the guard keeps types honest.
    if (!rows[0]) throw new Error("getActivePriceList: no active pricing after init");
    return toActivePriceList(rows[0]);
  });
}

/** Just the active PricingCatalog — for the configurator/hydrator read path. */
export async function getActivePricingCatalog(): Promise<PricingCatalog> {
  return (await getActivePriceList()).catalog;
}
