// Parametric window/door configurator engine — pure functions, unit-tested.
// Geometry reverse-engineered from app.kornizo.io (55mm ram face, 42mm mullion
// face). Prices integrate with the local pricing store; per-sash / labour
// constants are tuned so a fixed single 1000×1200 window ≈ €100 and opening a
// sash adds KRAH + MEKANIZËM + DOREZA, matching the observed live behaviour.

import type { ModelType, ProductType, WindowConfig } from "@/types";
import type { useStore } from "@/lib/store";

type Pricing = ReturnType<typeof useStore.getState>["pricing"];

export const FRAME_FACE = 55;
export const MULLION_FACE = 42;

const LABOR_PER_M = 5.145;
const MECH_BASE = 15; // € per opening sash (before size)
const MECH_PER_M = 8; // € per m of sash perimeter
const HANDLE_PRICE = 8;
const PANEL_PRICE = 90; // €/m² door panel
// Shtesë (expansion band) — tuned so a 300×1200 band adds ~€150 (observed
// production total went 100.15 → 234.54 with a 300mm right shtesë).
const SHTESE_PER_M2 = 350;
const SHTESE_EDGE_PER_M = 20;
const DOOR_BASE: Record<ProductType, number> = {
  Dritare: 0,
  "Derë Hyrje": 60,
  Derë: 40,
  Rreshqitëse: 0,
  Roletë: 0,
};

interface RowDef { hf: number; cols: number }
export interface ModelDef {
  label: string;
  rows: RowDef[];
  shape?: "triangle" | "trapez" | "pentagon" | "arch" | "circle";
}

export const MODELS: Record<ModelType, ModelDef> = {
  custom: { label: "Ndërto vetë modelin", rows: [{ hf: 1, cols: 1 }] },
  njeshe: { label: "Njëshe", rows: [{ hf: 1, cols: 1 }] },
  "dyshe-v": { label: "Dyshe Vertikale", rows: [{ hf: 1, cols: 2 }] },
  "treshe-v": { label: "Treshe Vertikale", rows: [{ hf: 1, cols: 3 }] },
  "katershe-v": { label: "Katërshe Vertikale", rows: [{ hf: 1, cols: 4 }] },
  "transom-top-1-1": { label: "Transom Lart (1-1)", rows: [{ hf: 0.28, cols: 1 }, { hf: 0.72, cols: 1 }] },
  "transom-top-1-2": { label: "Transom Lart (1-2)", rows: [{ hf: 0.28, cols: 1 }, { hf: 0.72, cols: 2 }] },
  "transom-top-2-2": { label: "Transom Lart (2-2)", rows: [{ hf: 0.28, cols: 2 }, { hf: 0.72, cols: 2 }] },
  "transom-top-1-3": { label: "Transom Lart (1-3)", rows: [{ hf: 0.28, cols: 1 }, { hf: 0.72, cols: 3 }] },
  "transom-top-3-3": { label: "Transom Lart (3-3)", rows: [{ hf: 0.28, cols: 3 }, { hf: 0.72, cols: 3 }] },
  "transom-bot-1-1": { label: "Transom Poshtë (1-1)", rows: [{ hf: 0.72, cols: 1 }, { hf: 0.28, cols: 1 }] },
  "transom-bot-2-1": { label: "Transom Poshtë (2-1)", rows: [{ hf: 0.72, cols: 2 }, { hf: 0.28, cols: 1 }] },
  "transom-bot-2-2": { label: "Transom Poshtë (2-2)", rows: [{ hf: 0.72, cols: 2 }, { hf: 0.28, cols: 2 }] },
  "transom-bot-3-1": { label: "Transom Poshtë (3-1)", rows: [{ hf: 0.72, cols: 3 }, { hf: 0.28, cols: 1 }] },
  "transom-bot-3-3": { label: "Transom Poshtë (3-3)", rows: [{ hf: 0.72, cols: 3 }, { hf: 0.28, cols: 3 }] },
  trekendesh: { label: "Trekëndësh", rows: [{ hf: 1, cols: 1 }], shape: "triangle" },
  trapez: { label: "Trapez", rows: [{ hf: 1, cols: 1 }], shape: "trapez" },
  pesekendesh: { label: "Pesëkëndësh", rows: [{ hf: 1, cols: 1 }], shape: "pentagon" },
  hark: { label: "Hark", rows: [{ hf: 1, cols: 1 }], shape: "arch" },
  rreth: { label: "Rreth", rows: [{ hf: 1, cols: 1 }], shape: "circle" },
};

export const DOOR_MODELS = ["ARIES", "CARINA", "CONNA"] as const;
export const isGlassProduct = (pt: ProductType) => pt === "Dritare" || pt === "Rreshqitëse";
export const isDoorProduct = (pt: ProductType) => pt === "Derë Hyrje" || pt === "Derë";
const safeMullions = (n: number | undefined, fallback: number) =>
  Number.isFinite(n) ? Math.min(5, Math.max(0, Math.round(n as number))) : fallback;

function modelDef(modelType: ModelType, custom?: Pick<WindowConfig, "customVerticalMullions" | "customHorizontalMullions">): ModelDef {
  if (modelType !== "custom") return MODELS[modelType] ?? MODELS.njeshe;
  const cols = safeMullions(custom?.customVerticalMullions, 1) + 1;
  const rows = safeMullions(custom?.customHorizontalMullions, 0) + 1;
  return {
    label: MODELS.custom.label,
    rows: Array.from({ length: rows }, () => ({ hf: 1, cols })),
  };
}

export interface Pane { x: number; y: number; w: number; h: number }
export interface Layout {
  W: number;
  H: number;
  panes: Pane[];
  vMullions: { x: number; y: number; h: number }[];
  hMullions: { y: number; x: number; w: number }[];
  mainCols: number;
  shape?: ModelDef["shape"];
}

export function computeLayout(
  modelType: ModelType,
  W: number,
  H: number,
  custom?: Pick<WindowConfig, "customVerticalMullions" | "customHorizontalMullions">,
): Layout {
  const def = modelDef(modelType, custom);
  const R = def.rows.length;
  const innerX = FRAME_FACE;
  const innerY = FRAME_FACE;
  const innerW = Math.max(0, W - 2 * FRAME_FACE);
  const innerH = Math.max(0, H - 2 * FRAME_FACE);
  const usableH = innerH - (R - 1) * MULLION_FACE;
  const totalHf = def.rows.reduce((s, r) => s + r.hf, 0);

  const panes: Pane[] = [];
  const vMullions: Layout["vMullions"] = [];
  const hMullions: Layout["hMullions"] = [];
  let y = innerY;
  let mainCols = 1;

  def.rows.forEach((row, i) => {
    const rowH = usableH * (row.hf / totalHf);
    const C = row.cols;
    if (C > mainCols) mainCols = C;
    const usableW = innerW - (C - 1) * MULLION_FACE;
    const paneW = usableW / C;
    let x = innerX;
    for (let c = 0; c < C; c++) {
      panes.push({ x, y, w: paneW, h: rowH });
      if (c < C - 1) vMullions.push({ x: x + paneW, y, h: rowH });
      x += paneW + MULLION_FACE;
    }
    y += rowH;
    if (i < R - 1) { hMullions.push({ y, x: innerX, w: innerW }); y += MULLION_FACE; }
  });

  return { W, H, panes, vMullions, hMullions, mainCols, shape: def.shape };
}

export interface Materials {
  productType: ProductType;
  ramPerimM: number;
  krahM: number;
  tShtylleM: number;
  llajsneM: number;
  glassM2: number; // XHAM (window/sliding)
  panelM2: number; // PANEL (doors)
  kutiaM: number; // KUTIA (roleta)
  mechCount: number;
  handleCount: number;
  paneCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const safeMm = (n: number): number => (Number.isFinite(n) ? Math.max(200, n) : 200);
const safeBandMm = (n: number): number => (Number.isFinite(n) ? Math.max(0, n) : 0);

export interface EffectiveDims {
  ew: number; // window width after shtesa carve-out
  eh: number; // window height after shtesa carve-out
  left: number; right: number; top: number; bottom: number;
}

// A shtesë (expansion profile) does NOT enlarge the product: it carves a band
// out of the overall opening, shrinking the actual window to fit inside it.
export function effectiveDims(config: WindowConfig): EffectiveDims {
  let left = 0, right = 0, top = 0, bottom = 0;
  for (const s of config.shtesa) {
    const widthMm = safeBandMm(s.widthMm);
    if (s.side === "Majtas") left += widthMm;
    else if (s.side === "Djathtas") right += widthMm;
    else if (s.side === "Lart") top += widthMm;
    else bottom += widthMm;
  }
  const ew = Math.max(200, safeMm(config.widthMm) - left - right);
  const eh = Math.max(200, safeMm(config.heightMm) - top - bottom);
  return { ew, eh, left, right, top, bottom };
}

export function openingCount(config: WindowConfig): number {
  const { ew, eh } = effectiveDims(config);
  const layout = computeLayout(config.modelType, ew, eh, config);
  let n = 0;
  for (let i = 0; i < layout.panes.length; i++) {
    const t = config.openings?.[i];
    if (t && t !== "fiks") n++;
  }
  return n;
}

export function computeMaterials(config: WindowConfig): Materials {
  const { productType } = config;
  const W = safeMm(config.widthMm);
  const { ew, eh } = effectiveDims(config);
  const ramPerimM = round2((2 * (ew + eh)) / 1000);

  if (productType === "Roletë") {
    return { productType, ramPerimM: 0, krahM: 0, tShtylleM: 0, llajsneM: 0, glassM2: 0, panelM2: 0, kutiaM: round2(W / 1000), mechCount: 0, handleCount: 0, paneCount: 0 };
  }

  if (isDoorProduct(productType)) {
    const innerW = Math.max(0, ew - 2 * FRAME_FACE);
    const innerH = Math.max(0, eh - 2 * FRAME_FACE);
    const panelM2 = round2((innerW * innerH) / 1e6);
    const llajsneM = round2((2 * (innerW + innerH)) / 1000);
    return { productType, ramPerimM, krahM: 0, tShtylleM: 0, llajsneM, glassM2: 0, panelM2, kutiaM: 0, mechCount: 0, handleCount: 0, paneCount: 1 };
  }

  // window / sliding — computed on the effective (carved) window size
  const def = modelDef(config.modelType, config);
  const layout = computeLayout(config.modelType, ew, eh, config);
  const glassM2 = round2(layout.panes.reduce((s, p) => s + (p.w * p.h) / 1e6, 0));
  const llajsneM = round2(layout.panes.reduce((s, p) => s + (2 * (p.w + p.h)) / 1000, 0));
  const totalHf = def.rows.reduce((s, r) => s + r.hf, 0);
  let mullionMm = 0;
  def.rows.forEach((row) => { mullionMm += (row.cols - 1) * (eh * (row.hf / totalHf)); });
  mullionMm += (def.rows.length - 1) * ew;

  let krahMm = 0;
  let mechCount = 0;
  layout.panes.forEach((p, i) => {
    const t = config.openings?.[i];
    if (t && t !== "fiks") { krahMm += 2 * (p.w + p.h); mechCount++; }
  });

  return {
    productType,
    ramPerimM,
    krahM: round2(krahMm / 1000),
    tShtylleM: round2(mullionMm / 1000),
    llajsneM,
    glassM2,
    panelM2: 0,
    kutiaM: 0,
    mechCount,
    handleCount: mechCount,
    paneCount: layout.panes.length,
  };
}

function colorKey(color: WindowConfig["color"]): "white" | "whiteColor" | "colorColor" {
  return color === "white" ? "white" : color === "white_color" ? "whiteColor" : "colorColor";
}
function num(v: string | undefined, fallback: number): number {
  const n = parseFloat((v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Cost of the expansion bands (filler section + coupling profile).
function shtesaCost(config: WindowConfig): number {
  let c = 0;
  for (const s of config.shtesa) {
    const widthMm = safeBandMm(s.widthMm);
    if (!widthMm) continue;
    const vertical = s.side === "Majtas" || s.side === "Djathtas";
    const longMm = vertical ? safeMm(config.heightMm) : safeMm(config.widthMm);
    const areaM2 = (widthMm / 1000) * (longMm / 1000);
    c += areaM2 * SHTESE_PER_M2 + (longMm / 1000) * SHTESE_EDGE_PER_M;
  }
  return c;
}

export function computePrice(config: WindowConfig, pricing: Pricing): number {
  if (config.manualPrice && config.manualPrice > 0) return round2(config.manualPrice);

  const m = computeMaterials(config);
  const key = colorKey(config.color);
  const ramRow = pricing.profilePriceRows.find((r) => r.profile.startsWith("Ram")) ?? pricing.profilePriceRows[0];
  const krahRow = pricing.profilePriceRows.find((r) => r.profile.startsWith("Krah")) ?? ramRow;
  const tRow = pricing.profilePriceRows.find((r) => r.profile.startsWith("T-")) ?? ramRow;
  const ramPrice = ramRow?.[key] ?? 6.2;
  const krahPrice = krahRow?.[key] ?? 7.0;
  const tPrice = tRow?.[key] ?? 7.6;
  const llajsnePrice = config.color === "white"
    ? num(pricing.accessoryParams["Llajsne bardhë (€/m)"], 0.8)
    : num(pricing.accessoryParams["Llajsne color (€/m)"], 1.2);
  const system = pricing.systems.find((s) => s.id === config.systemId);
  const isPVC = (system?.material ?? "PVC").toUpperCase().includes("PVC");
  const armimPrice = pricing.armingRows.find((a) => a.component.startsWith("Armim Ram"))?.price ?? 3.2;
  const glass = pricing.glass.find((g) => g.id === config.glassId) ?? pricing.glass[0];
  const glassPrice = glass?.price ?? 34;

  if (config.productType === "Roletë") {
    const area = (safeMm(config.widthMm) * safeMm(config.heightMm)) / 1e6;
    const roletaPrice = pricing.roletaVersions[0]?.pricePerM2 ?? 45;
    return round2(area * roletaPrice + 65 + (safeMm(config.widthMm) / 1000) * 14);
  }

  if (isDoorProduct(config.productType)) {
    let price =
      m.ramPerimM * ramPrice +
      m.llajsneM * llajsnePrice +
      m.panelM2 * PANEL_PRICE +
      (isPVC ? m.ramPerimM * armimPrice : 0) +
      m.ramPerimM * LABOR_PER_M +
      DOOR_BASE[config.productType];
    if (config.sashComposition === "glass") price += m.panelM2 * (glassPrice - PANEL_PRICE) * 0.5;
    price += shtesaCost(config);
    return round2(price);
  }

  // window / sliding — geometry on the effective (carved) window size
  const { ew, eh } = effectiveDims(config);
  const layout = computeLayout(config.modelType, ew, eh, config);
  let price =
    m.ramPerimM * ramPrice +
    m.tShtylleM * tPrice +
    m.glassM2 * glassPrice +
    m.llajsneM * llajsnePrice +
    (isPVC ? m.ramPerimM * armimPrice : 0) +
    m.ramPerimM * LABOR_PER_M +
    m.krahM * krahPrice;

  // per opening sash: size-dependent mechanism + handle
  layout.panes.forEach((p, i) => {
    const t = config.openings?.[i];
    if (t && t !== "fiks") {
      const sashPerimM = (2 * (p.w + p.h)) / 1000;
      price += MECH_BASE + sashPerimM * MECH_PER_M + HANDLE_PRICE;
    }
  });

  if (config.roleta) {
    const area = (safeMm(config.widthMm) * safeMm(config.heightMm)) / 1e6;
    price += area * (pricing.roletaVersions[0]?.pricePerM2 ?? 45) + 65;
  }
  price += shtesaCost(config);

  return round2(price);
}
