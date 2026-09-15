import { describe, expect, it } from "vitest";
import { computePrice } from "@/domain/configurator/window-calc";
import { defaultPricingCatalog } from "@/domain/pricing/defaults";
import {
  ACTIVE_PRICING_TABS,
  EDITABLE_ACCESSORY_KEYS,
  activeArmingRow,
  activeProfileRows,
  mergeEditablePricingCatalog,
} from "@/domain/pricing/editable";
import type { WindowConfig } from "@/domain/types";

const config: WindowConfig = {
  productType: "Dritare",
  modelType: "dyshe-v",
  widthMm: 1000,
  heightMm: 1200,
  systemId: "s1",
  color: "white",
  mechanismId: "Roto NX",
  glassId: "g1",
  roleta: true,
  shtesa: [{ id: "shtese", side: "Djathtas", widthMm: 100 }],
  openings: { 0: "majtas" },
};

describe("RC-11 active pricing contract", () => {
  it("exposes only launch-supported editor tabs", () => {
    expect(ACTIVE_PRICING_TABS.map((tab) => tab.value)).toEqual([
      "", "arming", "glass", "accessories", "roleta",
    ]);
    expect(ACTIVE_PRICING_TABS.map((tab) => tab.label)).not.toEqual(expect.arrayContaining([
      "Mekanizmat", "Panelet", "Shtesat", "Parametrat", "Dyer të Hyrjes",
    ]));
  });

  it("identifies only the exact profile, arming, and accessory inputs consumed by the calculator", () => {
    const catalog = defaultPricingCatalog();
    expect(activeProfileRows(catalog).map((row) => row.id)).toEqual(["pp1", "pp2", "pp3"]);
    expect(activeArmingRow(catalog)?.id).toBe("ar1");
    expect(EDITABLE_ACCESSORY_KEYS).toEqual([
      "Llajsne bardhë (€/m)",
      "Llajsne color (€/m)",
    ]);
  });

  it("preserves unsupported legacy data while applying supported edits", () => {
    const current = defaultPricingCatalog();
    current.accessoryParams._hw0 = "85";
    const submitted = structuredClone(current);

    submitted.systems[0].material = "ALU";
    submitted.profilePriceRows[0].white = 101;
    submitted.profilePriceRows[3].white = 102;
    submitted.metals[0].price = 103;
    submitted.armingRows[0].price = 104;
    submitted.armingRows[1].price = 105;
    submitted.glass[0].price = 106;
    submitted.panels[0].price = 107;
    submitted.expansions[0].price = 108;
    submitted.accessoryParams["Llajsne bardhë (€/m)"] = "109";
    submitted.accessoryParams["Dorezë (copë) — vetëm dritare"] = "110";
    submitted.accessoryParams._hw0 = "111";
    submitted.productionParams["Tarifa e punës (€/h)"] = "112";
    submitted.roletaVersions[0].pricePerM2 = 113;
    submitted.roletaVersions[1].pricePerM2 = 114;
    submitted.doorModels[0].basePrice = 115;

    const merged = mergeEditablePricingCatalog(current, submitted);

    expect(merged.systems[0].material).toBe("ALU");
    expect(merged.profilePriceRows[0].white).toBe(101);
    expect(merged.armingRows[0].price).toBe(104);
    expect(merged.glass[0].price).toBe(106);
    expect(merged.accessoryParams["Llajsne bardhë (€/m)"]).toBe("109");
    expect(merged.roletaVersions[0].pricePerM2).toBe(113);

    expect(merged.profilePriceRows[3]).toEqual(current.profilePriceRows[3]);
    expect(merged.metals).toEqual(current.metals);
    expect(merged.armingRows[1]).toEqual(current.armingRows[1]);
    expect(merged.panels).toEqual(current.panels);
    expect(merged.expansions).toEqual(current.expansions);
    expect(merged.accessoryParams["Dorezë (copë) — vetëm dritare"]).toBe(current.accessoryParams["Dorezë (copë) — vetëm dritare"]);
    expect(merged.accessoryParams._hw0).toBe("85");
    expect(merged.productionParams).toEqual(current.productionParams);
    expect(merged.roletaVersions[1]).toEqual(current.roletaVersions[1]);
    expect(merged.doorModels).toEqual(current.doorModels);
  });

  it("makes an unsupported-only submitted catalog a calculation no-op", () => {
    const current = defaultPricingCatalog();
    current.accessoryParams._hw0 = "85";
    const submitted = structuredClone(current);
    submitted.profilePriceRows[3].white = 999_999;
    submitted.metals[0].price = 999_999;
    submitted.armingRows[1].price = 999_999;
    submitted.panels[0].price = 999_999;
    submitted.expansions[0].price = 999_999;
    submitted.accessoryParams._hw0 = "999999";
    submitted.productionParams["Tarifa e punës (€/h)"] = "999999";
    submitted.roletaVersions[1].pricePerM2 = 999_999;
    submitted.doorModels[0].basePrice = 999_999;

    const merged = mergeEditablePricingCatalog(current, submitted);
    expect(merged).toEqual(current);
    expect(computePrice(config, merged)).toBe(computePrice(config, current));
  });
});
