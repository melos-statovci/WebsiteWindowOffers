// Default pricing initialization — deliberately auth-free so it can be used from
// BOTH the read boundary (src/server/pricing.ts, lazy authoritative recovery)
// AND the Better Auth organization-creation hook (best-effort seed) without
// creating an import cycle through the auth module.
//
// A brand-new organization has no pricing rows. This creates version 1 from the
// canonical domain default, so pricing/configuration work immediately with no
// dependence on browser localStorage.

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { runWithOrg, type TenantTx } from "@/db/tenant";
import { defaultPricingCatalog } from "@/domain/pricing/defaults";
import { PRICING_CALCULATION_VERSION } from "@/domain/configurator/window-calc";

/**
 * Ensure an active price-list version exists for `orgId`. MUST run inside a
 * withOrg(orgId) transaction (so RLS WITH CHECK and the partial-unique index
 * apply). Idempotent and concurrency-safe:
 *   - Inserts only when the org has no active version.
 *   - `ON CONFLICT (organization_id) WHERE is_active DO NOTHING` targets the
 *     partial-unique active index, so a racing initializer's duplicate is
 *     swallowed rather than creating two active versions.
 *   - version = COALESCE(max(version),0)+1 keeps numbering monotonic even if
 *     historical rows somehow exist.
 */
export async function ensureActivePriceList(
  tx: TenantTx,
  orgId: string,
  createdByUserId?: string,
): Promise<void> {
  const catalogJson = JSON.stringify(defaultPricingCatalog());
  await tx.execute(sql`
    insert into price_lists (organization_id, version, is_active, catalog, calculation_version, created_by_user_id)
    select ${orgId}::uuid,
           coalesce(max(version), 0) + 1,
           true,
           ${catalogJson}::jsonb,
           ${PRICING_CALCULATION_VERSION},
           ${createdByUserId ?? null}
    from price_lists
    where organization_id = ${orgId}::uuid
    on conflict (organization_id) where is_active do nothing
  `);
}

/**
 * Standalone seeder (opens its own withOrg transaction). Best-effort entry point
 * for the org-creation hook; correctness does not depend on it because the read
 * boundary re-ensures authoritatively on first pricing read.
 */
export async function ensureDefaultPricing(orgId: string, createdByUserId?: string): Promise<void> {
  await runWithOrg(db, orgId, (tx) => ensureActivePriceList(tx, orgId, createdByUserId));
}
