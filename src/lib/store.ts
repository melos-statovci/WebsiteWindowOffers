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
  OfferItem,
  OfferStatus,
  InvoiceStatus,
  CompanyProfile,
} from "@/domain/types";
import type { PricingCatalog } from "@/domain/pricing/types";
import * as seed from "@/lib/mock/data";
import { guideStepKeys } from "@/lib/plan";
import { invoiceTotal, invoicePaid } from "@/domain/finance/selectors";
import { validateBackup, SCHEMA_VERSION } from "@/domain/backup/backup";

/** Half-a-cent tolerance, matching selectors. */
const MONEY_EPS = 0.005;

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
    clients: structuredClone(seed.clients),
    projects: structuredClone(seed.projects),
    invoices: structuredClone(seed.invoices),
    payments: structuredClone(seed.payments),
    notes: structuredClone(seed.notes),
    users: structuredClone(seed.users),
    notifications: structuredClone(seed.notifications),
    company: structuredClone(seed.company),
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

  // clients
  addClient: (data: Omit<Client, "id" | "createdAt"> & { createdAt?: string }) => string;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // projects
  addProject: (data: Omit<Project, "id" | "number" | "createdAt"> & { createdAt?: string }) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setProjectStatus: (id: string, status: OfferStatus) => void;
  archiveProject: (id: string, archived: boolean) => void;
  deleteProject: (id: string) => void;
  addProjectItem: (pid: string, item: Omit<OfferItem, "id">) => void;
  updateProjectItem: (pid: string, itemId: string, patch: Partial<OfferItem>) => void;
  removeProjectItem: (pid: string, itemId: string) => void;
  duplicateProjectItem: (pid: string, itemId: string) => void;
  setProjectOption: (pid: string, key: string, value: boolean) => void;

  // invoices
  addInvoice: (data: Omit<Invoice, "id" | "number">) => string;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  deleteInvoice: (id: string) => void;

  // payments / notes
  addPayment: (data: Omit<Payment, "id">) => string;
  /**
   * Record a payment against a specific invoice. Idempotent by design: it can
   * only ever settle the *remaining* balance, so "mark paid" cannot create
   * duplicate full-value payments. Overpayment is rejected unless allowCredit.
   */
  recordInvoicePayment: (
    invoiceId: string,
    data: { amount: number; date: string; method: string; note?: string; allowCredit?: boolean },
  ) => { ok: boolean; error?: string; credit?: number; paidInFull?: boolean };
  addNote: (clientId: string, text: string) => void;
  deleteNote: (id: string) => void;

  // company / users
  updateCompany: (patch: Partial<CompanyProfile>) => void;
  addUser: (data: Omit<User, "id">) => void;
  removeUser: (id: string) => void;

  // notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // pricing / design / guide
  savePricing: (pricing: PricingState) => void;
  setDesign: (id: string) => void;
  toggleGuideStep: (key: string, done: boolean) => void;
  dismissUi: (key: UiDismissalKey, mode: UiDismissalMode) => void;
  clearUiDismissal: (key: UiDismissalKey) => void;

  // demo data mgmt
  resetDemo: () => void;
  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
}

function nextNumber(prefix: string, existing: { number: string }[]): string {
  const year = 2026;
  const nums = existing
    .map((e) => {
      const m = e.number.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seedData(),
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      addClient: (data) => {
        const id = uid();
        const client: Client = { id, createdAt: data.createdAt ?? todayIso(), ...data };
        set((s) => ({ clients: [client, ...s.clients] }));
        return id;
      },
      updateClient: (id, patch) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          // keep denormalised clientName in sync on projects/invoices
          projects: patch.name
            ? s.projects.map((p) => (p.clientId === id ? { ...p, clientName: patch.name! } : p))
            : s.projects,
          invoices: patch.name
            ? s.invoices.map((i) => (i.clientId === id ? { ...i, clientName: patch.name! } : i))
            : s.invoices,
        })),
      deleteClient: (id) =>
        set((s) => ({
          clients: s.clients.filter((c) => c.id !== id),
          projects: s.projects.filter((p) => p.clientId !== id),
          invoices: s.invoices.filter((i) => i.clientId !== id),
          payments: s.payments.filter((p) => p.clientId !== id),
          notes: s.notes.filter((n) => n.clientId !== id),
        })),

      addProject: (data) => {
        const id = uid();
        const number = nextNumber("PRJ", get().projects);
        const project: Project = {
          id,
          number,
          createdAt: data.createdAt ?? todayIso(),
          ...data,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },
      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      setProjectStatus: (id, status) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)) })),
      archiveProject: (id, archived) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, archived } : p)) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      addProjectItem: (pid, item) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === pid ? { ...p, items: [...p.items, { ...item, id: uid() }] } : p,
          ),
        })),
      updateProjectItem: (pid, itemId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === pid
              ? { ...p, items: p.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
              : p,
          ),
        })),
      removeProjectItem: (pid, itemId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === pid ? { ...p, items: p.items.filter((it) => it.id !== itemId) } : p,
          ),
        })),
      duplicateProjectItem: (pid, itemId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== pid) return p;
            const it = p.items.find((x) => x.id === itemId);
            if (!it) return p;
            const idx = p.items.findIndex((x) => x.id === itemId);
            const copy = { ...it, id: uid() };
            const items = [...p.items];
            items.splice(idx + 1, 0, copy);
            return { ...p, items };
          }),
        })),
      setProjectOption: (pid, key, value) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === pid ? { ...p, options: { ...(p.options ?? {}), [key]: value } } : p,
          ),
        })),

      addInvoice: (data) => {
        const id = uid();
        const number = nextNumber("FAT", get().invoices);
        set((s) => ({ invoices: [{ id, number, ...data }, ...s.invoices] }));
        return id;
      },
      updateInvoice: (id, patch) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      setInvoiceStatus: (id, status) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status } : i)) })),
      // Deleting an invoice must not orphan its payments. They are kept but
      // unlinked, so the money survives as client credit (an advance) instead
      // of pointing at a non-existent invoice.
      deleteInvoice: (id) =>
        set((s) => ({
          invoices: s.invoices.filter((i) => i.id !== id),
          payments: s.payments.map((p) =>
            p.invoiceId === id ? { ...p, invoiceId: undefined } : p,
          ),
        })),

      addPayment: (data) => {
        const id = uid();
        set((s) => ({ payments: [{ id, ...data }, ...s.payments] }));
        return id;
      },
      recordInvoicePayment: (invoiceId, data) => {
        const s = get();
        const inv = s.invoices.find((i) => i.id === invoiceId);
        if (!inv) return { ok: false, error: "Fatura nuk u gjet." };
        if (inv.status === "Anuluar") return { ok: false, error: "Fatura është e anuluar." };
        const amount = Math.round(data.amount * 100) / 100;
        if (!(amount > 0)) return { ok: false, error: "Shuma duhet të jetë më e madhe se zero." };

        const total = invoiceTotal(inv);
        const alreadyPaid = invoicePaid(inv.id, s.payments);
        const outstanding = Math.max(0, Math.round((total - alreadyPaid) * 100) / 100);

        if (outstanding <= MONEY_EPS && !data.allowCredit) {
          return { ok: false, error: "Kjo faturë është tashmë e paguar plotësisht." };
        }
        if (amount > outstanding + MONEY_EPS && !data.allowCredit) {
          return {
            ok: false,
            error: `Shuma tejkalon mbetjen e faturës (${outstanding.toFixed(2)} €). Aktivizoni kredinë për ta lejuar.`,
          };
        }

        const id = uid();
        const payment: Payment = {
          id,
          clientId: inv.clientId,
          invoiceId: inv.id,
          amount,
          date: data.date,
          method: data.method,
          note: data.note,
        };
        const paidInFull = alreadyPaid + amount + MONEY_EPS >= total;
        const credit = Math.max(0, Math.round((amount - outstanding) * 100) / 100);

        set((st) => ({
          payments: [payment, ...st.payments],
          invoices: st.invoices.map((i) => {
            if (i.id !== inv.id) return i;
            if (paidInFull) return { ...i, status: "Paguar" as InvoiceStatus };
            // Recording a payment on a Draft invoice issues it.
            if (i.status === "Draft") return { ...i, status: "Dërguar" as InvoiceStatus };
            return i;
          }),
        }));
        return { ok: true, credit: credit > MONEY_EPS ? credit : undefined, paidInFull };
      },
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

      savePricing: (pricing) => set({ pricing }),
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
        if (fromVersion < 2 && Array.isArray(merged.invoices)) {
          // v1 invoices had no projectId — nothing to backfill, just normalise.
          merged.invoices = merged.invoices.map((inv) => ({ ...inv }));
        }
        return merged as never;
      },
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const {
          clients, projects, invoices, payments, notes, users,
          notifications, company, pricing, selectedDesignId, guideDone, uiDismissals,
        } = s;
        return { clients, projects, invoices, payments, notes, users, notifications, company, pricing, selectedDesignId, guideDone, uiDismissals };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
