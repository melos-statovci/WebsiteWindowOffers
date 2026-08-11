// Pricing catalog shape — the single source of truth for the editable pricing
// state used by both the configurator engine (window-calc) and the Zustand
// store. Extracted verbatim from the store's former `PricingState` interface so
// the dependency points app → domain, never domain → store.
//
// This is a straight extraction, NOT a redesign: field names and shapes match
// the current seed data (src/lib/mock/data.ts) exactly.

import type { PricingSystem, CatalogRow } from "@/domain/types";

/** A profile price row with per-colour pricing (Ram, Krah, T-Shtyllë, …). */
export interface ProfilePriceRow {
  id: string;
  profile: string;
  code: string;
  white: number;
  whiteColor: number;
  colorColor: number;
}

/** Reinforcement (armim) price row. */
export interface ArmingRow {
  id: string;
  component: string;
  code: string;
  price: number;
}

/** Expansion profile (shtesë) catalog row. */
export interface ExpansionRow {
  id: string;
  name: string;
  brand: string;
  widthMm: number;
  price: number;
}

/** Roller-shutter (roletë) version with per-m² pricing. */
export interface RoletaVersion {
  id: string;
  name: string;
  pricePerM2: number;
}

/** Entry-door model. */
export interface DoorModel {
  id: string;
  name: string;
  mode: "FIKS" | "TABELË";
  basePrice: number;
}

/** The full editable pricing catalog held by the store and read by window-calc. */
export interface PricingCatalog {
  systems: PricingSystem[];
  profilePriceRows: ProfilePriceRow[];
  metals: CatalogRow[];
  armingRows: ArmingRow[];
  glass: CatalogRow[];
  panels: CatalogRow[];
  expansions: ExpansionRow[];
  roletaVersions: RoletaVersion[];
  doorModels: DoorModel[];
  accessoryParams: Record<string, string>;
  productionParams: Record<string, string>;
}
