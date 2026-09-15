import { describe, it, expect } from "vitest";
import { computeMaterials, computeLayout, computePrice, effectiveDims, validateConfig } from "./window-calc";
import * as seed from "@/lib/mock/data";
import { defaultPricingCatalog } from "@/domain/pricing/defaults";
import type { WindowConfig, ProductType, ProfileColor } from "@/domain/types";

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

describe("RC-11 supported pricing sensitivity", () => {
  it("selected system material changes PVC armoring on an applicable window", () => {
    const catalog = defaultPricingCatalog();
    const baseline = computePrice(cfg({ systemId: "s1" }), catalog);
    catalog.systems.find((system) => system.id === "s1")!.material = "ALU";
    const changed = computePrice(cfg({ systemId: "s1" }), catalog);
    expect({ baseline, changed }).toEqual({ baseline: 100.15, changed: 86.07 });
  });

  it.each([
    ["white", "white"],
    ["white_color", "whiteColor"],
    ["color_color", "colorColor"],
  ] as const)("Ram %s price changes a fixed window", (color, key) => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ color: color as ProfileColor });
    const baseline = computePrice(config, catalog);
    catalog.profilePriceRows[0][key] += 10;
    const changed = computePrice(config, catalog);
    expect(changed - baseline).toBeCloseTo(44, 2);
  });

  it.each([
    ["white", "white"],
    ["white_color", "whiteColor"],
    ["color_color", "colorColor"],
  ] as const)("Krah %s price changes a window with an opening sash", (color, key) => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ color: color as ProfileColor, openings: { 0: "majtas" } });
    const baseline = computePrice(config, catalog);
    catalog.profilePriceRows[1][key] += 10;
    const changed = computePrice(config, catalog);
    expect(changed).toBeGreaterThan(baseline);
    expect(changed - baseline).toBeCloseTo(computeMaterials(config).krahM * 10, 2);
  });

  it.each([
    ["white", "white"],
    ["white_color", "whiteColor"],
    ["color_color", "colorColor"],
  ] as const)("T-Shtyllë %s price changes a divided window", (color, key) => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ color: color as ProfileColor, modelType: "dyshe-v" });
    const baseline = computePrice(config, catalog);
    catalog.profilePriceRows[2][key] += 10;
    const changed = computePrice(config, catalog);
    expect(changed).toBeGreaterThan(baseline);
    expect(changed - baseline).toBeCloseTo(computeMaterials(config).tShtylleM * 10, 2);
  });

  it("Armim Ram price changes a selected PVC window", () => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ systemId: "s1" });
    const baseline = computePrice(config, catalog);
    catalog.armingRows[0].price += 10;
    const changed = computePrice(config, catalog);
    expect({ baseline, changed }).toEqual({ baseline: 100.15, changed: 144.15 });
  });

  it.each(defaultPricingCatalog().glass.map((row) => [row.id, row.name] as const))(
    "selected glass %s (%s) price changes a glazed window",
    (glassId) => {
      const catalog = defaultPricingCatalog();
      const config = cfg({ glassId });
      const baseline = computePrice(config, catalog);
      catalog.glass.find((row) => row.id === glassId)!.price += 10;
      const changed = computePrice(config, catalog);
      expect(changed).toBeGreaterThan(baseline);
      expect(changed - baseline).toBeCloseTo(computeMaterials(config).glassM2 * 10, 2);
    },
  );

  it.each([
    ["white", "Llajsne bardhë (€/m)"],
    ["color_color", "Llajsne color (€/m)"],
  ] as const)("%s bead price changes a glazed window", (color, key) => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ color: color as ProfileColor });
    const baseline = computePrice(config, catalog);
    catalog.accessoryParams[key] = String(Number(catalog.accessoryParams[key]) + 10);
    const changed = computePrice(config, catalog);
    expect(changed).toBeGreaterThan(baseline);
    expect(changed - baseline).toBeCloseTo(computeMaterials(config).llajsneM * 10, 2);
  });

  it("first roller-shutter rate changes an applicable standalone shutter", () => {
    const catalog = defaultPricingCatalog();
    const config = cfg({ productType: "Roletë" });
    const baseline = computePrice(config, catalog);
    catalog.roletaVersions[0].pricePerM2 += 10;
    const changed = computePrice(config, catalog);
    expect({ baseline, changed }).toEqual({ baseline: 133, changed: 145 });
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

describe("validateConfig — business validation", () => {
  it("a normal single window has no issues", () => {
    expect(validateConfig(cfg({ modelType: "njeshe", widthMm: 1000, heightMm: 1200 }))).toEqual([]);
  });

  it("warns when a multi-pane model makes panes too small", () => {
    const issues = validateConfig(cfg({ modelType: "katershe-v", widthMm: 800, heightMm: 1000 }));
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("flags sub-minimum dimensions as an error", () => {
    const issues = validateConfig(cfg({ widthMm: 100 }));
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });

  it("warns when shtesa shrink the window below the usable minimum", () => {
    const issues = validateConfig(cfg({ widthMm: 400, shtesa: [{ id: "s", side: "Majtas", widthMm: 300 }] }));
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });
});
