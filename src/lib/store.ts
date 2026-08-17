"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Client,
  Project,
  Invoice,
  Payment,
  Note,
  User,
  AppNotification,
  CompanyProfile,
} from "@/domain/types";
import type { PricingCatalog } from "@/domain/pricing/types";
import * as seed from "@/lib/mock/data";
import { guideStepKeys } from "@/lib/plan";
import { validateBackup, SCHEMA_VERSION } from "@/domain/backup/backup";

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.abs(Math.floor(performance.now() * 1000)).toString(36) + Date.now().toString(36);

const todayIso = () => new Date().toISOString().slice(0, 10);

export type UiDismissalKey = "configGuide" | "trialBanner";
export type UiDismissalMode = "tomorrow" | "forever";
type UiDismissals = Partial<Record<UiDismissalKey, string>>;

const nextLocalMidnightIso = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
};

export function isUiDismissed(value?: string): boolean {
  if (!value) return false;
  if (value === "forever") return true;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now();
}

// The editable pricing catalog shape now lives in the domain layer
// (@/domain/pricing/types) so it can be shared without importing the store.
type PricingState = PricingCatalog;

interface DataSlice {
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  notes: Note[];
  users: User[];
  notifications: AppNotification[];
  company: CompanyProfile;
  pricing: PricingState;
  selectedDesignId: string;
  guideDone: Record<string, boolean>;
  uiDismissals: UiDismissals;
}

function seedData(): DataSlice {
  return {
    // Clients are DB-backed (Phase 4). The store keeps a NON-persisted,
    // read-only MIRROR of the active org's clients, hydrated from the server by
    // <ClientsHydrator>. It seeds empty and is never written locally.
    clients: [],
    // Projects are DB-backed (Phase 6). Like clients, the store keeps a
    // NON-persisted, read-only MIRROR of the active org's projects, hydrated from
    // the server by <ProjectsHydrator>. It seeds empty and is never written
    // locally (all writes go through the project server actions).
    projects: [],
    // Invoices + payments are DB-backed (Phase 7). Like clients/projects, the
    // store keeps a NON-persisted, read-only MIRROR of the active org's finance,
    // hydrated from the server by <InvoicesHydrator>/<PaymentsHydrator>. It seeds
    // empty and is never written locally (all writes go through the invoice /
    // payment server actions).
    invoices: [],
    payments: [],
    notes: structuredClone(seed.notes),
    users: structuredClone(seed.users),
    notifications: structuredClone(seed.notifications),
    company: structuredClone(seed.company),
    // Pricing is DB-backed (Phase 5). This is a NON-persisted, server-hydrated
    // runtime MIRROR (via <PricingHydrator>) that the configurator reads
    // synchronously for live preview. It seeds with the canonical default so the
    // configurator never sees an empty catalog before hydration; Postgres is the
    // authoritative source and the mirror is never persisted to localStorage.
    pricing: {
      systems: structuredClone(seed.pricingSystems),
      profilePriceRows: structuredClone(seed.profilePriceRows),
      metals: structuredClone(seed.metals),
      armingRows: structuredClone(seed.armingRows),
      glass: structuredClone(seed.glass),
      panels: structuredClone(seed.panels),
      expansions: structuredClone(seed.expansions),
      roletaVersions: structuredClone(seed.roletaVersions),
      doorModels: structuredClone(seed.doorModels),
      accessoryParams: { ...seed.accessoryParams },
      productionParams: { ...seed.productionParams },
    },
    selectedDesignId: "klasik",
    // all 12 steps complete by default (matches original 12/12)
    guideDone: Object.fromEntries(guideStepKeys.map((k) => [k, true])),
    uiDismissals: {},
  };
}

interface StoreState extends DataSlice {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // clients — DB-backed. The store holds only a read-only mirror; all writes go
  // through the server actions in src/server/actions/client.action.ts. There is
  // deliberately NO local add/update/delete (no dual-write).
  setClients: (clients: Client[]) => void;

  // projects — DB-backed (Phase 6). The store holds only a read-only mirror; all
  // writes go through the server actions in src/server/actions/project.action.ts.
  // setProjects is hydration/mirror-only (no local authority, no dual-write),
  // mirroring setClients/setPricing. There is deliberately NO local add/update/
  // delete for projects or their items.
  setProjects: (projects: Project[]) => void;

  // invoices + payments — DB-backed (Phase 7). The store holds only read-only
  // mirrors; all writes go through the server actions in
  // src/server/actions/invoice.action.ts / payment.action.ts. setInvoices /
  // setPayments are hydration/mirror-only (no local authority, no dual-write),
  // mirroring setClients/setProjects. There is deliberately NO local
  // add/update/delete/record for invoices or payments.
  setInvoices: (invoices: Invoice[]) => void;
  setPayments: (payments: Payment[]) => void;

  // notes
  addNote: (clientId: string, text: string) => void;
  deleteNote: (id: string) => void;

  // company / users
  updateCompany: (patch: Partial<CompanyProfile>) => void;
  addUser: (data: Omit<User, "id">) => void;
  removeUser: (id: string) => void;

  // notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // pricing — DB-backed (Phase 5). The store holds only a server-hydrated,
  // non-persisted mirror; the authoritative save goes through the server action
  // in src/server/actions/pricing.action.ts. setPricing is hydration/mirror-only
  // (no local authority, no dual-write), mirroring setClients.
  setPricing: (pricing: PricingState) => void;
  setDesign: (id: string) => void;
  toggleGuideStep: (key: string, done: boolean) => void;
  dismissUi: (key: UiDismissalKey, mode: UiDismissalMode) => void;
  clearUiDismissal: (key: UiDismissalKey) => void;

  // demo data mgmt
  resetDemo: () => void;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seedData(),
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      // Hydration only: replace the read-only mirror with the server's clients.
      setClients: (clients) => set({ clients }),

      // Hydration only: replace the read-only mirror with the server's projects.
      setProjects: (projects) => set({ projects }),

      // Hydration only: replace the read-only mirrors with the server's finance.
      setInvoices: (invoices) => set({ invoices }),
      setPayments: (payments) => set({ payments }),

      addNote: (clientId, text) =>
        set((s) => ({ notes: [{ id: uid(), clientId, text, at: todayIso() }, ...s.notes] })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      updateCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),
      addUser: (data) => set((s) => ({ users: [...s.users, { id: uid(), ...data }] })),
      removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      setPricing: (pricing) => set({ pricing }),
      setDesign: (id) => set({ selectedDesignId: id }),
      toggleGuideStep: (key, done) =>
        set((s) => ({ guideDone: { ...s.guideDone, [key]: done } })),
      dismissUi: (key, mode) =>
        set((s) => ({
          uiDismissals: {
            ...s.uiDismissals,
            [key]: mode === "forever" ? "forever" : nextLocalMidnightIso(),
          },
        })),
      clearUiDismissal: (key) =>
        set((s) => {
          const uiDismissals = { ...s.uiDismissals };
          delete uiDismissals[key];
          return { uiDismissals };
        }),

      resetDemo: () => set({ ...seedData(), uiDismissals: get().uiDismissals }),
      exportData: () => {
        const s = get();
        const {
          clients, projects, invoices, payments, notes, users,
          notifications, company, pricing, selectedDesignId, guideDone, uiDismissals,
        } = s;
        return JSON.stringify(
          { version: SCHEMA_VERSION, clients, projects, invoices, payments, notes, users, notifications, company, pricing, selectedDesignId, guideDone, uiDismissals },
          null,
          2,
        );
      },
      importData: (json) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return { ok: false, error: "Skedari JSON është i pavlefshëm." };
        }
        const result = validateBackup(parsed);
        if (!result.ok) return { ok: false, error: result.error };
        // Start from a clean seed and overlay only validated, whitelisted keys.
        const base = seedData();
        const data = { ...result.data };
        delete data.version;
        set({ ...base, ...(data as Partial<DataSlice>) });
        return { ok: true };
      },
    }),
    {
      name: "kornizo-demo-store",
      version: SCHEMA_VERSION,
      migrate: (persisted, fromVersion) => {
        // Older persisted state may predate fields the app now reads. Merge onto
        // a fresh seed shape so missing collections/fields never crash selectors.
        if (!persisted || typeof persisted !== "object") return persisted as never;
        const base = seedData();
        const merged = { ...base, ...(persisted as Partial<DataSlice>) } as DataSlice;
        // Clients (Phase 4) and pricing (Phase 5) are DB-backed. Ignore anything
        // an OLD persisted store still carries for them so stale localStorage can
        // never re-become an authoritative source; both are re-hydrated from the
        // server after mount.
        merged.clients = [];
        merged.pricing = base.pricing;
        // Projects (Phase 6) are DB-backed too — ignore anything an OLD persisted
        // store still carries so stale localStorage can never re-become an
        // authoritative source; they are re-hydrated from the server after mount.
        merged.projects = [];
        // Invoices + payments (Phase 7) are DB-backed too — wipe any stale
        // localStorage copy so it can never re-become authoritative; both are
        // re-hydrated from the server after mount.
        merged.invoices = [];
        merged.payments = [];
        void fromVersion;
        return merged as never;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        // NOTE: clients (Phase 4), pricing (Phase 5), projects (Phase 6) and now
        // invoices + payments (Phase 7) are intentionally EXCLUDED — they live in
        // Postgres, not localStorage. Persisting them would recreate a stale local
        // source of truth and let clearing localStorage "delete" server data. All
        // are server-hydrated at runtime.
        const {
          notes, users, notifications, company, selectedDesignId, guideDone, uiDismissals,
        } = s;
        return { notes, users, notifications, company, selectedDesignId, guideDone, uiDismissals };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
