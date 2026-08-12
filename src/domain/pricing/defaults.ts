// The canonical, server-side DEFAULT pricing catalog for a brand-new
// organization. This is the SINGLE source of truth for "factory" pricing:
//
//   - The server seeds every new organization's price-list version 1 from it
//     (src/server/pricing.ts), so a fresh org can price/configure immediately
//     without any browser localStorage.
//   - src/lib/mock/data.ts re-exports its slices, so the store's pre-hydration
//     mirror and the window-calc unit tests all exercise these exact numbers —
//     which means the calc-regression suite implicitly proves the default.
//
// Values are the pricing that previously lived inline in src/lib/mock/data.ts
// (extracted verbatim, not retuned). This file is pure domain data: no React,
// Zustand, Next, DB, or browser imports (enforced by the domain ESLint boundary).

import type { PricingSystem, CatalogRow } from "@/domain/types";
import type {
  PricingCatalog,
  ProfilePriceRow,
  ArmingRow,
  ExpansionRow,
  RoletaVersion,
  DoorModel,
} from "@/domain/pricing/types";

const systems: PricingSystem[] = [
  { id: "s1", name: "Dritare PVC 70 mm (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC"], category: "Dritare" },
  { id: "s2", name: "Dritare PVC 82 mm premium (shembull)", brand: "Salamander", material: "PVC", badges: ["PVC"], category: "Dritare" },
  { id: "s3", name: "Derë PVC 70 mm (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC"], category: "Dyer" },
  { id: "s4", name: "Rrëshqitëse Smart-Slide (shembull)", brand: "Aluplast", material: "PVC", badges: ["PVC", "SMART"], category: "Rrëshq." },
  { id: "s5", name: "Rrëshqitëse HST 85 Lift & Slide (shembull)", brand: "Salamander", material: "PVC", badges: ["PVC", "HST"], category: "Rrëshq." },
  { id: "s6", name: "Dritare/Derë ALU 70 me urë termike (shembull)", brand: "Aluplast", material: "ALU-TERMIK", badges: ["ALU-TERMIK"], category: "Dritare" },
];

const profilePriceRows: ProfilePriceRow[] = [
  { id: "pp1", profile: "Ram (Kasa)", code: "RAM-70", white: 6.2, whiteColor: 8.1, colorColor: 9.4 },
  { id: "pp2", profile: "Krah", code: "KRH-70", white: 7.0, whiteColor: 9.2, colorColor: 10.8 },
  { id: "pp3", profile: "T-Shtyllë", code: "TSH-70", white: 7.6, whiteColor: 9.9, colorColor: 11.5 },
  { id: "pp4", profile: "Adapter", code: "ADP-70", white: 3.1, whiteColor: 4.0, colorColor: 4.7 },
];

const metals: CatalogRow[] = [
  { id: "m1", name: "Metal për PVC 70mm", brand: "Metal Standard", price: 3.2 },
  { id: "m2", name: "Metal për PVC 82mm", brand: "Metal Standard", price: 3.8 },
  { id: "m3", name: "Metal për Dyer 70mm", brand: "Metal Standard", price: 4.5 },
];

const armingRows: ArmingRow[] = [
  { id: "ar1", component: "Armim Ram", code: "AR-RAM", price: 3.2 },
  { id: "ar2", component: "Armim Krah", code: "AR-KRH", price: 3.6 },
  { id: "ar3", component: "Armim T-Shtyllë", code: "AR-TSH", price: 4.1 },
  { id: "ar4", component: "Armim Adapter", code: "AR-ADP", price: 1.9 },
];

const glass: CatalogRow[] = [
  { id: "g1", name: "Dopjo Low-E 4-16-4", brand: "Guardian", extra: "Termoizolues, Ug 1.1", price: 34.0, photo: true },
  { id: "g2", name: "Trepjo Low-E 4-14-4-14-4", brand: "Sisecam", extra: "Ug 0.6, akustik", price: 58.5, photo: true },
];

const panels: CatalogRow[] = [
  { id: "p1", name: "Panel dekorativ Klasik", brand: "Panel Brand A", price: 120.0, photo: true },
  { id: "p2", name: "Panel modern i lëmuar", brand: "Panel Brand B", price: 165.0, photo: true },
];

const expansions: ExpansionRow[] = [
  { id: "e1", name: "Shtesë 20mm", brand: "Expansion Brand A", widthMm: 20, price: 2.4 },
  { id: "e2", name: "Shtesë 40mm", brand: "Expansion Brand A", widthMm: 40, price: 3.6 },
];

const roletaVersions: RoletaVersion[] = [
  { id: "r1", name: "E Bardhë", pricePerM2: 45.0 },
  { id: "r2", name: "Antracit", pricePerM2: 52.0 },
];

const doorModels: DoorModel[] = [
  { id: "dm1", name: "Model Lira", mode: "FIKS", basePrice: 620.0 },
  { id: "dm2", name: "Model Onyx", mode: "TABELË", basePrice: 780.0 },
  { id: "dm3", name: "Model Terra", mode: "FIKS", basePrice: 540.0 },
];

const accessoryParams: Record<string, string> = {
  "Dorezë (copë) — vetëm dritare": "4.50",
  "Llajsne bardhë (€/m)": "0.80",
  "Llajsne color (€/m)": "1.20",
  "Lidhëse T-shtylle (copë)": "2.10",
  "Pragu (copë)": "18.00",
  "Doreza (copë)": "12.50",
  "Bravë / mekanizmi i mbylljes (copë)": "22.00",
  "Menteshat (për copë)": "3.40",
};

const productionParams: Record<string, string> = {
  "Humbja e saldimit në çmim (%)": "3",
  "Humbja e prerjes ALU (%)": "",
  "Gjatësia e profilit (m)": "6.5",
  "Gjatësia e metalit (m)": "6",
  "Shtesa e saldimit për skaj (mm)": "3",
  "Trashësia e diskut të sharrës (mm)": "4",
  "Pastrim skajesh për shufër (mm)": "10",
  "Mbetja min. e shfrytëzueshme (mm)": "300",
  "Tarifa e punës (€/h)": "12",
  "Minuta pune për element (min)": "25",
  "Shpenzimet e përgjithshme (%)": "8",
};

/**
 * Deep, structurally-fresh copy of the default catalog. Always returns a NEW
 * object graph so callers (store seed, server seed) can never accidentally
 * mutate the shared template.
 */
export function defaultPricingCatalog(): PricingCatalog {
  return structuredClone({
    systems,
    profilePriceRows,
    metals,
    armingRows,
    glass,
    panels,
    expansions,
    roletaVersions,
    doorModels,
    accessoryParams,
    productionParams,
  });
}

/** Frozen reference copy for read-only consumers (e.g. mock re-exports). */
export const DEFAULT_PRICING_CATALOG: PricingCatalog = defaultPricingCatalog();
