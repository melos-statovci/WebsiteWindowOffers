import type { WindowConfig } from "@/domain/types";
import type { PricingCatalog } from "@/domain/pricing/types";

// Existing database monetary capacity (numeric(12,2)); also caps derived debt so
// it can be settled without overflowing a payment. This does not change pricing.
export const MAX_COMMERCIAL_TOTAL = 9_999_999_999.99;
export function validCommercialTotal(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_COMMERCIAL_TOTAL;
}

/** Match the existing configurator's product/system compatibility rules. */
export function catalogSelectionError(config: WindowConfig, catalog: PricingCatalog): string | null {
  // Standalone roller shutters use neither a profile system nor glass.
  if (config.productType === "Roletë") return null;
  const system = catalog.systems.find((row) => row.id === config.systemId);
  if (!system) return "Sistemi nuk ekziston më në çmimoren aktive.";
  const door = config.productType === "Derë" || config.productType === "Derë Hyrje";
  const compatible = door
    ? system.category === "Dyer" || system.material.toUpperCase().includes("ALU")
    : config.productType === "Rreshqitëse"
      ? system.category === "Rrëshq." || system.category === "Dritare"
      : system.category === "Dritare";
  if (!compatible) return "Sistemi nuk përputhet me produktin.";
  if (!catalog.glass.some((row) => row.id === config.glassId)) {
    return "Xhami nuk ekziston më në çmimoren aktive.";
  }
  return null;
}
