// Domain types for the local Kornizo clone. All data is local/mock.
// Financial aggregates (client value/paid/debt, project total) are DERIVED via
// src/lib/selectors.ts, not stored — so relationships stay consistent.

export type ClientType = "Privat" | "Biznes";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  nui?: string;
  createdAt: string; // ISO date
}

export type OfferStatus = "Draft" | "Dërguar" | "Pranuar" | "Refuzuar";

export type ProductType =
  | "Dritare"
  | "Derë Hyrje"
  | "Derë"
  | "Rreshqitëse"
  | "Roletë";

export type ModelType =
  | "custom"
  | "njeshe"
  | "dyshe-v"
  | "treshe-v"
  | "katershe-v"
  | "transom-top-1-1"
  | "transom-top-1-2"
  | "transom-top-2-2"
  | "transom-top-1-3"
  | "transom-top-3-3"
  | "transom-bot-1-1"
  | "transom-bot-2-1"
  | "transom-bot-2-2"
  | "transom-bot-3-1"
  | "transom-bot-3-3"
  | "trekendesh"
  | "trapez"
  | "pesekendesh"
  | "hark"
  | "rreth";

export type ProfileColor = "white" | "white_color" | "color_color";

export type ShteseSide = "Majtas" | "Djathtas" | "Lart" | "Poshtë";

export interface Shtese {
  id: string;
  side: ShteseSide;
  widthMm: number;
}

/** Per-pane opening: fixed glass, hinged left/right, tilt, or tilt-turn. */
export type OpeningType = "fiks" | "majtas" | "majtas-kip" | "djathtas" | "djathtas-kip" | "kip";

export interface WindowConfig {
  productType: ProductType;
  modelType: ModelType;
  widthMm: number;
  heightMm: number;
  systemId: string;
  color: ProfileColor;
  mechanismId: string;
  glassId: string;
  glassDesc?: string;
  roleta: boolean;
  roletaBoxMm?: number;
  shtesa: Shtese[];
  /** custom model-only mullion counts; production defaults custom to 1 vertical, 0 horizontal. */
  customVerticalMullions?: number;
  customHorizontalMullions?: number;
  /** pane index -> opening type; absent = "fiks" (fixed). */
  openings: Record<number, OpeningType>;
  /** door-only */
  doorModel?: string;
  sashComposition?: string;
  /** manual price override in € (0/undefined = auto-calculate). */
  manualPrice?: number;
}

export interface OfferItem {
  id: string;
  kind: "Dritare" | "Derë" | "Rrëshqitëse" | "Roletë";
  label: string;
  widthMm: number;
  heightMm: number;
  qty: number;
  unitPrice: number;
  /** Full window-configurator state (present for configurator-built items). */
  config?: WindowConfig;
}

export interface Project {
  id: string; // uuid-like
  number: string; // PRJ-2026-001
  title: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  status: OfferStatus;
  archived: boolean;
  items: OfferItem[];
  profileSystem: string;
  profileColor: string;
  vatRate: number; // 0..1
  options?: Record<string, boolean>; // Marzha, Zbritje, TVSH, Montimi, …
}

export type InvoiceStatus =
  | "Draft"
  | "Dërguar"
  | "Paguar"
  | "Vonesë"
  | "Anuluar";

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string; // FAT-2026-001
  clientId: string;
  clientName: string;
  /** Stable link to the originating project/offer (when created from one). */
  projectId?: string;
  /** Human-readable reference (offer number). Kept for display/back-compat. */
  reference?: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  vatRate: number;
}

export interface Payment {
  id: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  date: string;
  method: string; // Para në dorë, Transfertë bankare, Kartelë
  note?: string;
}

export interface Note {
  id: string;
  clientId: string;
  text: string;
  at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  nui: string;
  vatNo: string;
  postalCode: string;
  city: string;
  bank: string;
  swift: string;
  iban: string;
  marginDefault: number;
  vatDefault: number;
  logoDataUrl?: string;
}

export interface Device {
  id: string;
  owner: string;
  browser: string;
  os: string;
  ip: string;
  lastActive: string;
  loggedInAt: string;
  current?: boolean;
}

export interface LoginEvent {
  id: string;
  kind: "success" | "failure";
  who: string;
  device: string;
  ip: string;
  at: string;
}

export interface PricingSystem {
  id: string;
  name: string;
  brand: string;
  material: string;
  badges: string[];
  category: "Dritare" | "Dyer" | "Rrëshq.";
}

export interface CatalogRow {
  id: string;
  name: string;
  brand: string;
  extra?: string;
  price: number;
  photo?: boolean;
}

export interface GuideStep {
  id: string;
  group: string;
  label: string;
  done: boolean;
}
