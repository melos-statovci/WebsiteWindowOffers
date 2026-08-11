import { describe, it, expect } from "vitest";
import { computeMaterials, computeLayout, computePrice, effectiveDims } from "./window-calc";
import * as seed from "@/lib/mock/data";
import type { WindowConfig, ProductType } from "@/types";

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
  openings: {},
  ...over,
});

describe("window materials — matches observed Kornizo values", () => {
  it("single 1000×1200 fixed: ram 4.40m, glass 0.97m², llajsne 3.96m, no mullion/krah", () => {
    const m = computeMaterials(cfg({ modelType: "njeshe" }));
    expect(m.ramPerimM).toBe(4.4);
    expect(m.glassM2).toBe(0.97);
    expect(m.llajsneM).toBe(3.96);
    expect(m.tShtylleM).toBe(0);
    expect(m.krahM).toBe(0);
    expect(m.mechCount).toBe(0);
    expect(m.paneCount).toBe(1);
  });

  it("double vertical: t-shtyllë 1.20m, glass 0.92m², llajsne 6.06m", () => {
    const m = computeMaterials(cfg({ modelType: "dyshe-v" }));
    expect(m.tShtylleM).toBe(1.2);
    expect(m.glassM2).toBe(0.92);
    expect(m.llajsneM).toBe(6.06);
    expect(m.paneCount).toBe(2);
  });
});

describe("opening panes add krah/mechanism/handle", () => {
  it("opening one pane adds PROFIL KRAH + MEKANIZËM + DOREZA", () => {
    const fixed = computeMaterials(cfg({ modelType: "dyshe-v" }));
    const opened = computeMaterials(cfg({ modelType: "dyshe-v", openings: { 0: "kip" } }));
    expect(fixed.krahM).toBe(0);
    expect(fixed.mechCount).toBe(0);
    expect(opened.krahM).toBeGreaterThan(0);
    expect(opened.mechCount).toBe(1);
    expect(opened.handleCount).toBe(1);
  });
  it("opening a pane increases the price", () => {
    const fixed = computePrice(cfg({ modelType: "dyshe-v" }), pricing);
    const opened = computePrice(cfg({ modelType: "dyshe-v", openings: { 0: "majtas" } }), pricing);
    expect(opened).toBeGreaterThan(fixed);
  });
});

describe("shtesa carve the window down (not enlarge it)", () => {
  const withShtese = cfg({ shtesa: [{ id: "a", side: "Djathtas", widthMm: 300 }] });
  it("effectiveDims subtracts shtesa widths from the overall opening", () => {
    const d = effectiveDims(withShtese);
    expect(d.ew).toBe(700);
    expect(d.eh).toBe(1200);
    expect(d.right).toBe(300);
  });
  it("materials recompute on the smaller window (matches observed 3.80/3.36/0.64)", () => {
    const m = computeMaterials(withShtese);
    expect(m.ramPerimM).toBe(3.8);
    expect(m.glassM2).toBe(0.64);
    expect(m.llajsneM).toBe(3.36);
  });
  it("adding a shtesë raises the price above the plain window", () => {
    expect(computePrice(withShtese, pricing)).toBeGreaterThan(computePrice(cfg({}), pricing));
  });
});

describe("product-type variations", () => {
  it("doors report PANEL (not glass) and a door base", () => {
    const m = computeMaterials(cfg({ productType: "Derë Hyrje", heightMm: 2500 }));
    expect(m.panelM2).toBeGreaterThan(0);
    expect(m.glassM2).toBe(0);
    expect(m.paneCount).toBe(1);
  });
  it("roletë reports only KUTIA", () => {
    const m = computeMaterials(cfg({ productType: "Roletë" }));
    expect(m.kutiaM).toBeGreaterThan(0);
    expect(m.glassM2).toBe(0);
    expect(m.panelM2).toBe(0);
  });
  it("manual price override wins", () => {
    const p = computePrice(cfg({ productType: "Derë", manualPrice: 999 }), pricing);
    expect(p).toBe(999);
  });
});

describe("window layout + price", () => {
  it("layout: 1 pane single, 2 panes double, transom adds hMullion", () => {
    expect(computeLayout("njeshe", 1000, 1200).panes).toHaveLength(1);
    expect(computeLayout("dyshe-v", 1000, 1200).panes).toHaveLength(2);
    expect(computeLayout("transom-top-1-1", 1000, 1200).hMullions).toHaveLength(1);
  });
  it("fixed single window ~€100", () => {
    const p = computePrice(cfg({}), pricing);
    expect(p).toBeGreaterThan(90);
    expect(p).toBeLessThan(112);
  });
  it("larger dimensions cost more", () => {
    expect(computePrice(cfg({ widthMm: 2000, heightMm: 2000 }), pricing)).toBeGreaterThan(computePrice(cfg({}), pricing));
  });
  it("supports every product type without throwing", () => {
    const types: ProductType[] = ["Dritare", "Derë Hyrje", "Derë", "Rreshqitëse", "Roletë"];
    for (const t of types) expect(computePrice(cfg({ productType: t }), pricing)).toBeGreaterThan(0);
  });
});

describe("malformed persisted dimensions are sanitized", () => {
  it("clamps non-positive width/height for effective materials", () => {
    const m = computeMaterials(cfg({ widthMm: -100, heightMm: 0 }));
    expect(m.ramPerimM).toBe(0.8);
    expect(m.glassM2).toBe(0.01);
    expect(computePrice(cfg({ widthMm: -100, heightMm: 0 }), pricing)).toBeGreaterThan(0);
  });

  it("ignores negative shtesa widths instead of enlarging the window", () => {
    const d = effectiveDims(cfg({ shtesa: [{ id: "bad", side: "Majtas", widthMm: -300 }] }));
    expect(d.left).toBe(0);
    expect(d.ew).toBe(1000);
  });

  it("roletë prices cannot go negative from invalid dimensions", () => {
    const p = computePrice(cfg({ productType: "Roletë", widthMm: -1000, heightMm: -1000 }), pricing);
    expect(p).toBeGreaterThan(0);
  });
});
