// Server-generated calculation snapshot persisted on each project_items row.
//
// Purpose: make a stored unit price EXPLAINABLE and REPRODUCIBLE after the fact
// without duplicating the whole PricingCatalog inside every item. The immutable
// `price_list_id` (a price_lists row) already preserves the exact pricing input;
// this snapshot records the SERVER-COMPUTED output/intermediates at save time:
//
//   - materials: the geometry/material breakdown from computeMaterials(config).
//   - unitPrice: the authoritative computePrice(config, catalog) result (EUR).
//   - manualPriceUsed: true when the config carried a manualPrice override, so a
//     later reader knows the price did NOT come from the catalog formula.
//   - priceListId / priceListVersion: which immutable pricing version was used.
//   - calculationVersion: the PRICING_CALCULATION_VERSION algorithm contract.
//   - computedAtIso: server timestamp of the computation.
//
// The whole object is stored as JSONB. It is produced ONLY on the server; the
// browser never supplies any of these fields.

import type { Materials } from "@/domain/configurator/window-calc";

export interface ProjectItemCalcSnapshot {
  materials: Materials;
  unitPrice: number;
  manualPriceUsed: boolean;
  priceListId: string;
  priceListVersion: number;
  calculationVersion: number;
  computedAtIso: string;
}
