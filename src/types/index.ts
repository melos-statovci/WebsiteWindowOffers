// Domain types for the local Proferto clone. All data is local/mock.
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
