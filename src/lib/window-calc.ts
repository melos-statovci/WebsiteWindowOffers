// Parametric window/door configurator engine — pure functions, unit-tested.
// Geometry model reverse-engineered from app.proferto.io (55mm ram face,
// 42mm mullion face). Prices integrate with the local pricing store; the
// per-sash / labour constants are tuned so a single 1000×1200 window ≈ €100
// and a double ≈ €125 (matching the observed live prices within ~1%).

import type { ModelType, WindowConfig } from "@/types";
import type { useStore } from "@/lib/store";

type Pricing = ReturnType<typeof useStore.getState>["pricing"];

export const FRAME_FACE = 55; // mm — ram ballore
export const MULLION_FACE = 42; // mm — t-shtyllë / transom ballore

const MECH_PER_SASH = 8;
const HANDLE_PER_SASH = 5;
const LABOR_PER_M = 2.5;

interface RowDef {
  hf: number;
  cols: number;
}
export interface ModelDef {
  label: string;
  rows: RowDef[];
  shape?: "triangle" | "trapez" | "pentagon" | "arch";
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
};

export interface Pane { x: number; y: number; w: number; h: number }
export interface Layout {
  W: number;
  H: number;
  panes: Pane[]; // glass panes in mm, full-frame coords
  vMullions: { x: number; y: number; h: number }[];
  hMullions: { y: number; x: number; w: number }[];
  mainCols: number;
  shape?: ModelDef["shape"];
}

export function computeLayout(modelType: ModelType, W: number, H: number): Layout {
  const def = MODELS[modelType] ?? MODELS.njeshe;
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
    if (i < R - 1) {
      hMullions.push({ y, x: innerX, w: innerW });
      y += MULLION_FACE;
    }
  });

  return { W, H, panes, vMullions, hMullions, mainCols, shape: def.shape };
}

export interface Materials {
  ramPerimM: number;
  tShtylleM: number;
  llajsneM: number;
  glassM2: number;
  paneCount: number;
}

export function computeMaterials(modelType: ModelType, W: number, H: number): Materials {
  const def = MODELS[modelType] ?? MODELS.njeshe;
  const layout = computeLayout(modelType, W, H);
  const glassM2 = layout.panes.reduce((s, p) => s + (p.w * p.h) / 1e6, 0);
  const llajsneM = layout.panes.reduce((s, p) => s + (2 * (p.w + p.h)) / 1000, 0);
  const ramPerimM = (2 * (W + H)) / 1000;
  const R = def.rows.length;
  const totalHf = def.rows.reduce((s, r) => s + r.hf, 0);
  let mullionMm = 0;
  def.rows.forEach((row) => {
    const rowFullH = H * (row.hf / totalHf);
    mullionMm += (row.cols - 1) * rowFullH; // vertical mullions
  });
  mullionMm += (R - 1) * W; // horizontal transoms
  const paneCount = def.rows.reduce((s, r) => s + r.cols, 0);
  return {
    ramPerimM: round2(ramPerimM),
    tShtylleM: round2(mullionMm / 1000),
    llajsneM: round2(llajsneM),
    glassM2: round2(glassM2),
    paneCount,
  };
}

function colorKey(color: WindowConfig["color"]): "white" | "whiteColor" | "colorColor" {
  return color === "white" ? "white" : color === "white_color" ? "whiteColor" : "colorColor";
}

export function computePrice(config: WindowConfig, pricing: Pricing): number {
  const m = computeMaterials(config.modelType, config.widthMm, config.heightMm);
  const key = colorKey(config.color);
  const ramRow = pricing.profilePriceRows.find((r) => r.profile.startsWith("Ram")) ?? pricing.profilePriceRows[0];
  const tRow = pricing.profilePriceRows.find((r) => r.profile.startsWith("T-")) ?? ramRow;
  const ramPrice = ramRow?.[key] ?? 6.2;
  const tPrice = tRow?.[key] ?? 7.6;

  const glass = pricing.glass.find((g) => g.id === config.glassId) ?? pricing.glass[0];
  const glassPrice = glass?.price ?? 34;

  const llajsnePrice =
    config.color === "white"
      ? num(pricing.accessoryParams["Llajsne bardhë (€/m)"], 0.8)
      : num(pricing.accessoryParams["Llajsne color (€/m)"], 1.2);

  const system = pricing.systems.find((s) => s.id === config.systemId);
  const isPVC = (system?.material ?? "PVC").toUpperCase().includes("PVC");
  const armimPrice = pricing.armingRows.find((a) => a.component.startsWith("Armim Ram"))?.price ?? 3.2;

  let price =
    m.ramPerimM * ramPrice +
    m.tShtylleM * tPrice +
    m.glassM2 * glassPrice +
    m.llajsneM * llajsnePrice +
    m.paneCount * (MECH_PER_SASH + HANDLE_PER_SASH) +
    (isPVC ? m.ramPerimM * armimPrice : 0) +
    m.ramPerimM * LABOR_PER_M;

  if (config.roleta) {
    const area = (config.widthMm * config.heightMm) / 1e6;
    const roletaPrice = pricing.roletaVersions[0]?.pricePerM2 ?? 45;
    price += area * roletaPrice + 65; // + motor
  }
  for (const sh of config.shtesa) {
    const sideLenMm = sh.side === "Lart" || sh.side === "Poshtë" ? config.widthMm : config.heightMm;
    const exp = pricing.expansions[0]?.price ?? 3;
    price += (sideLenMm / 1000) * exp;
  }

  // Doors carry a base surcharge (hardware, panel)
  if (config.productType === "Derë Hyrje") price += 220;
  else if (config.productType === "Derë") price += 60;

  return round2(price);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function num(v: string | undefined, fallback: number): number {
  const n = parseFloat((v ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
