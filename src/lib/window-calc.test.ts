import { describe, it, expect } from "vitest";
import { computeMaterials, computeLayout, computePrice } from "./window-calc";
import * as seed from "@/lib/mock/data";
import type { WindowConfig } from "@/types";

const pricing = {
  systems: seed.pricingSystems,
  profilePriceRows: seed.profilePriceRows,
  metals: seed.metals,
  armingRows: seed.armingRows,
  glass: seed.glass,
  panels: seed.panels,
  expansions: seed.expansions,
  roletaVersions: seed.roletaVersions,
  doorModels: seed.doorModels,
  accessoryParams: seed.accessoryParams,
  productionParams: seed.productionParams,
};

const cfg = (over: Partial<WindowConfig>): WindowConfig => ({
  productType: "Dritare",
  modelType: "njeshe",
  widthMm: 1000,
  heightMm: 1200,
  systemId: "s1",
  color: "white",
  mechanismId: "Roto NX",
  glassId: "g1",
  roleta: false,
  shtesa: [],
  ...over,
});

describe("window materials — matches observed Proferto values", () => {
  it("single 1000×1200: ram 4.40m, glass 0.97m², llajsne 3.96m, no mullion", () => {
    const m = computeMaterials("njeshe", 1000, 1200);
    expect(m.ramPerimM).toBe(4.4);
    expect(m.glassM2).toBe(0.97);
    expect(m.llajsneM).toBe(3.96);
    expect(m.tShtylleM).toBe(0);
    expect(m.paneCount).toBe(1);
  });

  it("double vertical 1000×1200: t-shtyllë 1.20m, glass 0.92m², llajsne 6.06m", () => {
    const m = computeMaterials("dyshe-v", 1000, 1200);
    expect(m.ramPerimM).toBe(4.4);
    expect(m.tShtylleM).toBe(1.2);
    expect(m.glassM2).toBe(0.92);
    expect(m.llajsneM).toBe(6.06);
    expect(m.paneCount).toBe(2);
  });

  it("triple vertical adds two mullions", () => {
    const m = computeMaterials("treshe-v", 1000, 1200);
    expect(m.tShtylleM).toBe(2.4);
    expect(m.paneCount).toBe(3);
  });
});

describe("window layout", () => {
  it("produces one pane for single, two for double", () => {
    expect(computeLayout("njeshe", 1000, 1200).panes).toHaveLength(1);
    expect(computeLayout("dyshe-v", 1000, 1200).panes).toHaveLength(2);
    expect(computeLayout("dyshe-v", 1000, 1200).vMullions).toHaveLength(1);
  });
  it("transom adds a horizontal mullion", () => {
    expect(computeLayout("transom-top-1-1", 1000, 1200).hMullions).toHaveLength(1);
  });
});

describe("window price", () => {
  it("single window is in the observed ballpark (~€100)", () => {
    const p = computePrice(cfg({}), pricing);
    expect(p).toBeGreaterThan(90);
    expect(p).toBeLessThan(112);
  });
  it("double costs more than single (extra mullion + sash)", () => {
    const single = computePrice(cfg({ modelType: "njeshe" }), pricing);
    const dbl = computePrice(cfg({ modelType: "dyshe-v" }), pricing);
    expect(dbl).toBeGreaterThan(single);
  });
  it("roleta and shtesa increase the price", () => {
    const base = computePrice(cfg({}), pricing);
    expect(computePrice(cfg({ roleta: true }), pricing)).toBeGreaterThan(base);
    expect(computePrice(cfg({ shtesa: [{ id: "x", side: "Djathtas", widthMm: 40 }] }), pricing)).toBeGreaterThan(base);
  });
  it("larger dimensions cost more", () => {
    expect(computePrice(cfg({ widthMm: 2000, heightMm: 2000 }), pricing)).toBeGreaterThan(computePrice(cfg({}), pricing));
  });
});
