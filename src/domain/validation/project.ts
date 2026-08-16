// Shared validation for projects (offers) and their configured items. Pure and
// client-safe: the SAME schemas power browser form UX and authoritative
// server-side re-validation via the action spine. No DB / Next / React / Zustand
// imports (domain ESLint boundary).
//
// MONEY INVARIANT: the item-save payload carries only STRUCTURAL, non-monetary
// input — the WindowConfig, quantity, and (optional, non-authoritative) the
// pricing version the browser previewed against. It deliberately does NOT accept
// a unit price or material totals. The server recomputes the authoritative price
// from the config + the org's active pricing catalog. `manualPrice` inside the
// WindowConfig is a legitimate, intentional business override (the calculator
// honours it) — it is NOT a browser-supplied "final price" and is still run
// through the shared calculator server-side.

import { z } from "zod";

const PRODUCT_TYPES = ["Dritare", "Derë Hyrje", "Derë", "Rreshqitëse", "Roletë"] as const;
const MODEL_TYPES = [
  "custom", "njeshe", "dyshe-v", "treshe-v", "katershe-v",
  "transom-top-1-1", "transom-top-1-2", "transom-top-2-2", "transom-top-1-3", "transom-top-3-3",
  "transom-bot-1-1", "transom-bot-2-1", "transom-bot-2-2", "transom-bot-3-1", "transom-bot-3-3",
  "trekendesh", "trapez", "pesekendesh", "hark", "rreth",
] as const;
const PROFILE_COLORS = ["white", "white_color", "color_color"] as const;
const SHTESE_SIDES = ["Majtas", "Djathtas", "Lart", "Poshtë"] as const;
const OPENING_TYPES = ["fiks", "majtas", "majtas-kip", "djathtas", "djathtas-kip", "kip"] as const;
export const OFFER_STATUSES = ["Draft", "Dërguar", "Pranuar", "Refuzuar"] as const;

const DIM_MIN = 200;
const DIM_MAX = 10000;

const shteseSchema = z.object({
  id: z.string().min(1).max(64),
  side: z.enum(SHTESE_SIDES),
  widthMm: z.number().finite().min(0).max(2000),
});

// Structural configurator state. Bounds mirror the configurator's own
// sanitizeConfig clamps so the server accepts exactly what the UI can produce.
export const windowConfigSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  modelType: z.enum(MODEL_TYPES),
  widthMm: z.number().int().min(DIM_MIN).max(DIM_MAX),
  heightMm: z.number().int().min(DIM_MIN).max(DIM_MAX),
  systemId: z.string().min(1).max(64),
  color: z.enum(PROFILE_COLORS),
  mechanismId: z.string().min(1).max(64),
  glassId: z.string().min(1).max(64),
  glassDesc: z.string().max(200).optional(),
  roleta: z.boolean(),
  roletaBoxMm: z.number().finite().min(0).max(2000).optional(),
  shtesa: z.array(shteseSchema).max(8),
  customVerticalMullions: z.number().int().min(0).max(5).optional(),
  customHorizontalMullions: z.number().int().min(0).max(5).optional(),
  // JSON object keys are strings (pane index). The calculator reads
  // openings?.[i] which coerces the numeric index to the string key.
  openings: z.record(z.string(), z.enum(OPENING_TYPES)),
  doorModel: z.string().max(64).optional(),
  sashComposition: z.string().max(64).optional(),
  manualPrice: z.number().finite().min(0).max(1_000_000).optional(),
});

export type WindowConfigInput = z.infer<typeof windowConfigSchema>;

// ---- Project create / update -------------------------------------------------
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const projectCreateSchema = z.object({
  clientId: z.string().uuid("Klient i pavlefshëm."),
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Titulli është i detyrueshëm.").max(160),
  ),
  profileSystem: optionalText(120),
  profileColor: optionalText(120),
  // VAT fraction 0..1 (e.g. 0.18).
  vatRate: z.number().finite().min(0).max(1),
  status: z.enum(OFFER_STATUSES).optional(),
});
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Titulli është i detyrueshëm.").max(160),
  ),
  profileSystem: optionalText(120),
  profileColor: optionalText(120),
  vatRate: z.number().finite().min(0).max(1),
});
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectStatusSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  status: z.enum(OFFER_STATUSES),
});
export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;

export const projectArchiveSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  archived: z.boolean(),
});

export const projectDeleteSchema = z.object({ id: z.string().uuid("ID e pavlefshme.") });

export const projectOptionSchema = z.object({
  id: z.string().uuid("ID e pavlefshme."),
  key: z.string().min(1).max(64),
  value: z.boolean(),
});

// ---- Project item add / update / duplicate / delete --------------------------
// NOTE: no unitPrice / materials fields — the server computes those. qty and the
// config are the only structural inputs; previewedPriceListVersion is optional,
// non-authoritative concurrency metadata (the version the browser previewed).
export const itemAddSchema = z.object({
  projectId: z.string().uuid("Projekt i pavlefshëm."),
  config: windowConfigSchema,
  qty: z.number().int().min(1).max(9999),
  previewedPriceListVersion: z.number().int().positive().optional(),
});
export type ItemAddInput = z.infer<typeof itemAddSchema>;

export const itemUpdateSchema = z.object({
  projectId: z.string().uuid("Projekt i pavlefshëm."),
  itemId: z.string().uuid("Artikull i pavlefshëm."),
  config: windowConfigSchema,
  qty: z.number().int().min(1).max(9999),
  previewedPriceListVersion: z.number().int().positive().optional(),
});
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;

export const itemRefSchema = z.object({
  projectId: z.string().uuid("Projekt i pavlefshëm."),
  itemId: z.string().uuid("Artikull i pavlefshëm."),
});
