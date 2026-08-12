// Shared, authoritative validation for the pricing catalog. Pure and
// client-safe: the same schema can guard the browser editor AND re-validate a
// submitted catalog on the server before it becomes a new persisted version
// (the server NEVER trusts an unvalidated pricing blob). No DB / Next / React /
// Zustand imports (enforced by the domain ESLint boundary).
//
// The shape mirrors the domain PricingCatalog (src/domain/pricing/types.ts)
// EXACTLY — this validates structure + preserves the current product's semantics
// (finite non-negative prices, the existing category/door-mode unions, string
// parameter maps that permit "" as "not set"). It deliberately invents NO new
// manufacturing rules. Parsing returns a value assignable to PricingCatalog.

import { z } from "zod";
import type { PricingCatalog } from "@/domain/pricing/types";

// A price/measurement: a finite, non-negative number. Rejects NaN/Infinity and
// negatives; 0 is allowed (a legitimately free line).
const money = z.number().finite("Vlerë numerike e pavlefshme.").min(0, "Nuk lejohen vlera negative.");

// Free-text identifiers/labels. Non-empty where the product requires a label;
// generously capped to reject abusive payloads without constraining real data.
const id = z.string().min(1).max(64);
const label = z.string().min(1, "Emri është i detyrueshëm.").max(200);
const shortText = z.string().max(120);

const pricingSystem = z.object({
  id,
  name: label,
  brand: shortText,
  material: shortText,
  badges: z.array(z.string().max(40)).max(20),
  category: z.enum(["Dritare", "Dyer", "Rrëshq."]),
});

const catalogRow = z.object({
  id,
  name: label,
  brand: shortText,
  extra: z.string().max(200).optional(),
  price: money,
  photo: z.boolean().optional(),
});

const profilePriceRow = z.object({
  id,
  profile: label,
  code: shortText,
  white: money,
  whiteColor: money,
  colorColor: money,
});

const armingRow = z.object({
  id,
  component: label,
  code: shortText,
  price: money,
});

const expansionRow = z.object({
  id,
  name: label,
  brand: shortText,
  widthMm: money,
  price: money,
});

const roletaVersion = z.object({
  id,
  name: label,
  pricePerM2: money,
});

const doorModel = z.object({
  id,
  name: label,
  mode: z.enum(["FIKS", "TABELË"]),
  basePrice: money,
});

// Parameter maps are edited as string key/value pairs; "" legitimately means
// "not set" (see MechanismsTab's "_hw*" keys and blank production params), so
// empty strings are permitted. Keys/values are length-capped.
const paramMap = z.record(z.string().min(1).max(120), z.string().max(120));

// Collection sizes are generously capped: enough for any real catalog, low
// enough that a hostile payload can't balloon a single JSONB row.
const list = <T extends z.ZodTypeAny>(item: T) => z.array(item).max(500);

export const pricingCatalogSchema: z.ZodType<PricingCatalog> = z.object({
  systems: list(pricingSystem),
  profilePriceRows: list(profilePriceRow),
  metals: list(catalogRow),
  armingRows: list(armingRow),
  glass: list(catalogRow),
  panels: list(catalogRow),
  expansions: list(expansionRow),
  roletaVersions: list(roletaVersion),
  doorModels: list(doorModel),
  accessoryParams: paramMap,
  productionParams: paramMap,
});

export type PricingCatalogInput = z.infer<typeof pricingCatalogSchema>;

/** Convenience guard for non-action callers (hydration mapping, tests). */
export function parsePricingCatalog(value: unknown): PricingCatalog {
  return pricingCatalogSchema.parse(value);
}
