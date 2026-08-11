// Backup import/export schema validation for the local demo store.
//
// Goals (Priority 6):
//  • Validate the *shape* of imported JSON before it touches the store.
//  • Only ever copy KNOWN keys across — arbitrary keys can never overwrite
//    store actions or inject unexpected state.
//  • Carry a schema version; migrate older backups when reasonable, otherwise
//    reject with a clear message.
//
// This is deliberately pragmatic (a small demo backup), not an enterprise
// schema engine: we assert the collections are the right kind of thing and that
// each record carries the fields the app relies on.

import type {
  Client, Project, Invoice, Payment, Note, User, AppNotification, CompanyProfile,
} from "@/domain/types";

/** Bumped whenever the persisted shape changes in a breaking way. */
export const SCHEMA_VERSION = 2;

/** The subset of store state that is persisted / exported. */
export interface PersistedShape {
  version: number;
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  notes: Note[];
  users: User[];
  notifications: AppNotification[];
  company: CompanyProfile;
  pricing: unknown;
  selectedDesignId: string;
  guideDone: Record<string, boolean>;
  uiDismissals: Record<string, string>;
}

export type ParseResult =
  | { ok: true; data: Partial<PersistedShape>; migratedFrom?: number }
  | { ok: false; error: string };

// --- primitive guards ------------------------------------------------------
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const nonEmptyString = (v: unknown): v is string => isString(v) && v.length > 0;

/** Every record in an array must satisfy `check`; empty arrays are allowed. */
function everyRecord(arr: unknown, check: (r: Record<string, unknown>) => boolean): arr is unknown[] {
  return Array.isArray(arr) && arr.every((r) => isObject(r) && check(r));
}

// --- collection guards -----------------------------------------------------
const okClient = (c: Record<string, unknown>) => nonEmptyString(c.id) && isString(c.name);
const okProject = (p: Record<string, unknown>) =>
  nonEmptyString(p.id) && isString(p.clientId) && Array.isArray(p.items);
const okInvoice = (i: Record<string, unknown>) =>
  nonEmptyString(i.id) && isString(i.clientId) && Array.isArray(i.lines) && isFiniteNumber(i.vatRate);
const okPayment = (p: Record<string, unknown>) =>
  nonEmptyString(p.id) && isString(p.clientId) && isFiniteNumber(p.amount);
const okNote = (n: Record<string, unknown>) => nonEmptyString(n.id) && isString(n.clientId);
const okUser = (u: Record<string, unknown>) => nonEmptyString(u.id) && isString(u.name);
const okNotification = (n: Record<string, unknown>) => nonEmptyString(n.id) && isString(n.title);

/** Fields we accept from a backup. Anything else is dropped on purpose. */
const KNOWN_KEYS: (keyof PersistedShape)[] = [
  "version", "clients", "projects", "invoices", "payments", "notes", "users",
  "notifications", "company", "pricing", "selectedDesignId", "guideDone", "uiDismissals",
];

/**
 * Validate + migrate a parsed backup object. Returns only whitelisted keys.
 * Does NOT touch the store — the caller decides how to apply the result.
 */
export function validateBackup(raw: unknown): ParseResult {
  if (!isObject(raw)) return { ok: false, error: "Skedari nuk përmban një objekt të vlefshëm." };

  // Version handling.
  const rawVersion = raw.version;
  const version = rawVersion === undefined ? 1 : rawVersion;
  if (!isFiniteNumber(version) || version < 1) {
    return { ok: false, error: "Versioni i backup-it është i pavlefshëm." };
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Ky backup është nga një version më i ri (v${version}) sesa ky aplikacion (v${SCHEMA_VERSION}).`,
    };
  }

  // Core collections must exist and be well-formed.
  if (!everyRecord(raw.clients, okClient)) return { ok: false, error: "Lista e klientëve mungon ose është e dëmtuar." };
  if (!everyRecord(raw.projects, okProject)) return { ok: false, error: "Lista e projekteve mungon ose është e dëmtuar." };

  // Optional collections: if present they must still be well-formed.
  const optional: [keyof PersistedShape, (r: Record<string, unknown>) => boolean][] = [
    ["invoices", okInvoice],
    ["payments", okPayment],
    ["notes", okNote],
    ["users", okUser],
    ["notifications", okNotification],
  ];
  for (const [key, check] of optional) {
    if (raw[key] !== undefined && !everyRecord(raw[key], check)) {
      return { ok: false, error: `Të dhënat "${key}" janë të dëmtuara ose të tipit të gabuar.` };
    }
  }

  if (raw.company !== undefined && !isObject(raw.company)) {
    return { ok: false, error: "Profili i kompanisë është i dëmtuar." };
  }
  if (raw.pricing !== undefined && !isObject(raw.pricing)) {
    return { ok: false, error: "Të dhënat e çmimeve janë të dëmtuara." };
  }

  // Copy only known keys.
  const data: Partial<PersistedShape> = {};
  for (const key of KNOWN_KEYS) {
    if (raw[key] !== undefined) {
      (data as Record<string, unknown>)[key] = raw[key];
    }
  }
  data.version = SCHEMA_VERSION;

  return version < SCHEMA_VERSION
    ? { ok: true, data: migrate(data, version), migratedFrom: version }
    : { ok: true, data };
}

/**
 * Forward-migrate a validated backup to the current schema. v1 had no
 * `invoice.projectId`; nothing else changed, so this is mostly a no-op that
 * guarantees the fields the app now reads exist.
 */
function migrate(data: Partial<PersistedShape>, from: number): Partial<PersistedShape> {
  const out = { ...data };
  if (from < 2 && Array.isArray(out.invoices)) {
    out.invoices = out.invoices.map((inv) => ({ ...inv }));
  }
  out.version = SCHEMA_VERSION;
  return out;
}
