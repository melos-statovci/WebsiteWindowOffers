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
  PricingSystem,
  CatalogRow,
} from "@/types";
import * as seed from "@/lib/mock/data";
import { guideStepKeys } from "@/lib/plan";

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

interface PricingState {
  systems: PricingSystem[];
  profilePriceRows: typeof seed.profilePriceRows;
  metals: CatalogRow[];
  armingRows: typeof seed.armingRows;
  glass: CatalogRow[];
  panels: CatalogRow[];
  expansions: typeof seed.expansions;
  roletaVersions: typeof seed.roletaVersions;
  doorModels: typeof seed.doorModels;
  accessoryParams: Record<string, string>;
  productionParams: Record<string, string>;
}

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
      deleteInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),

      addPayment: (data) => {
        const id = uid();
        set((s) => ({ payments: [{ id, ...data }, ...s.payments] }));
        return id;
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
          { clients, projects, invoices, payments, notes, users, notifications, company, pricing, selectedDesignId, guideDone, uiDismissals },
          null,
          2,
        );
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== "object" || !Array.isArray(data.clients) || !Array.isArray(data.projects)) {
            return { ok: false, error: "Skedari nuk përmban të dhëna Kornizo të vlefshme." };
          }
          const base = seedData();
          set({ ...base, ...data });
          return { ok: true };
        } catch {
          return { ok: false, error: "Skedari JSON është i pavlefshëm." };
        }
      },
    }),
    {
      name: "kornizo-demo-store",
      version: 1,
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
