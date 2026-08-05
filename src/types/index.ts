// Domain types for the local Proferto clone. All data is local/mock.

export type ClientType = "Privat" | "Biznes";

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  phone?: string;
  email?: string;
  address?: string;
  nui?: string;
  createdAt: string; // ISO date
  totalValue: number;
  paid: number;
  debt: number;
  offersTotal: number;
  offersAccepted: number;
  offersRejected: number;
  paymentsCount: number;
  notes?: string;
}

export type OfferStatus = "Draft" | "Dërguar" | "Pranuar" | "Refuzuar";

export interface OfferItem {
  id: string;
  kind: "Dritare" | "Derë" | "Rrëshqitëse" | "Roletë";
  label: string;
  widthMm: number;
  heightMm: number;
  qty: number;
  unitPrice: number;
}

export interface Project {
  id: string; // uuid-like
  number: string; // PRJ-2026-001
  title: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  total: number;
  status: OfferStatus;
  archived: boolean;
  items: OfferItem[];
  profileSystem: string;
  profileColor: string;
  vatRate: number; // 0..1
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
  reference?: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  vatRate: number;
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
