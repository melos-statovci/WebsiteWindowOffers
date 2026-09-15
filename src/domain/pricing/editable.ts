import type { PricingCatalog, ProfilePriceRow } from "@/domain/pricing/types";

export const ACTIVE_PRICING_TABS = [
  { value: "", label: "Sistemet" },
  { value: "arming", label: "Armimi" },
  { value: "glass", label: "Xhamat" },
  { value: "accessories", label: "Llajsnet" },
  { value: "roleta", label: "Roletat" },
] as const;

export const EDITABLE_ACCESSORY_KEYS = [
  "Llajsne bardhë (€/m)",
  "Llajsne color (€/m)",
] as const;

export function calculationProfileRows(catalog: PricingCatalog) {
  const first = catalog.profilePriceRows[0];
  return {
    ram: catalog.profilePriceRows.find((row) => row.profile.startsWith("Ram")) ?? first,
    krah: catalog.profilePriceRows.find((row) => row.profile.startsWith("Krah")) ?? first,
    tShtylle: catalog.profilePriceRows.find((row) => row.profile.startsWith("T-")) ?? first,
  };
}

export function activeProfileRows(catalog: PricingCatalog): ProfilePriceRow[] {
  const candidates = Object.values(calculationProfileRows(catalog));
  return candidates.filter((row, index): row is ProfilePriceRow =>
    Boolean(row) && candidates.findIndex((candidate) => candidate?.id === row?.id) === index,
  );
}

export function activeArmingRow(catalog: PricingCatalog) {
  return catalog.armingRows.find((row) => row.component.startsWith("Armim Ram"));
}

export function mergeEditablePricingCatalog(
  current: PricingCatalog,
  submitted: PricingCatalog,
): PricingCatalog {
  const next = structuredClone(current);

  next.systems = structuredClone(submitted.systems);
  next.glass = structuredClone(submitted.glass);

  for (const currentRow of activeProfileRows(current)) {
    const submittedRow = submitted.profilePriceRows.find((row) => row.id === currentRow.id);
    if (!submittedRow) continue;
    const target = next.profilePriceRows.find((row) => row.id === currentRow.id);
    if (!target) continue;
    target.white = submittedRow.white;
    target.whiteColor = submittedRow.whiteColor;
    target.colorColor = submittedRow.colorColor;
  }

  const currentArming = activeArmingRow(current);
  const submittedArming = currentArming
    ? submitted.armingRows.find((row) => row.id === currentArming.id)
    : undefined;
  const targetArming = currentArming
    ? next.armingRows.find((row) => row.id === currentArming.id)
    : undefined;
  if (submittedArming && targetArming) targetArming.price = submittedArming.price;

  for (const key of EDITABLE_ACCESSORY_KEYS) {
    if (submitted.accessoryParams[key] !== undefined) {
      next.accessoryParams[key] = submitted.accessoryParams[key];
    }
  }

  const currentRoleta = current.roletaVersions[0];
  const submittedRoleta = currentRoleta
    ? submitted.roletaVersions.find((row) => row.id === currentRoleta.id)
    : undefined;
  if (currentRoleta && submittedRoleta && next.roletaVersions[0]?.id === currentRoleta.id) {
    next.roletaVersions[0].pricePerM2 = submittedRoleta.pricePerM2;
  }

  return next;
}
