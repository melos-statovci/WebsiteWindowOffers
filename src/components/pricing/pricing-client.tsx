"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, ImageIcon, Trash2, RotateCcw } from "lucide-react";
import { PageHeader, Button, Card, Badge, Field, Input, Label } from "@/components/ui/kit";
import { useApp } from "@/components/providers/providers";
import { useStore, uid } from "@/lib/store";
import { cn } from "@/lib/utils";
import { savePricing } from "@/server/actions/pricing.action";
import type { CatalogRow, PricingSystem } from "@/domain/types";
import type { PricingCatalog } from "@/domain/pricing/types";
import {
  ACTIVE_PRICING_TABS,
  EDITABLE_ACCESSORY_KEYS,
  activeArmingRow,
  activeProfileRows,
} from "@/domain/pricing/editable";

type Pricing = PricingCatalog;

const TAB_DESC: Record<string, string> = {
  "": "Sistemet e zgjedhshme dhe çmimet aktive Ram, Krah dhe T-Shtyllë sipas ngjyrës.",
  arming: "Çmimi aktiv i armimit të ramit për sistemet PVC.",
  glass: "Çmimet e xhamit për m². Për: dritare, derë banjo/ballkoni dhe rrëshqitëse.",
  accessories: "Çmimet aktive të llajsnës së xhamit sipas ngjyrës së profilit.",
  roleta: "Çmimi aktiv për m² i roletës në llogaritjen aktuale.",
};

const VALID = new Set<string>(ACTIVE_PRICING_TABS.map((t) => t.value));

interface PricingClientProps {
  /** Active organization pricing loaded server-side (the editor baseline). */
  initialCatalog: PricingCatalog;
  /** Active version number — the optimistic-concurrency baseVersion for saves. */
  initialVersion: number;
  /** Whether the current role may edit pricing (canonical can(role, pricing:edit)). */
  canEdit: boolean;
}

export function PricingClient({ initialCatalog, initialVersion, canEdit }: PricingClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast, confirm } = useApp();
  // Keep the runtime configurator mirror in sync when authoritative server data
  // arrives/changes (e.g. after a save's router.refresh reloads this page).
  const setPricing = useStore((s) => s.setPricing);

  const raw = params.get("tab") ?? "";
  const tab = VALID.has(raw) ? raw : "";
  const setTab = (v: string) => router.push(v ? `/pricing?tab=${v}` : "/pricing");

  const [draft, setDraft] = useState<Pricing>(initialCatalog);
  const [saving, setSaving] = useState(false);
  // Re-baseline the editor whenever the server sends a new active version.
  useEffect(() => {
    setDraft(initialCatalog);
    setPricing(initialCatalog);
  }, [initialCatalog, setPricing]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialCatalog), [draft, initialCatalog]);
  const update = (fn: (d: Pricing) => Pricing) => setDraft((d) => fn(structuredClone(d)));

  const save = async () => {
    if (!canEdit || !dirty || saving) return;
    setSaving(true);
    try {
      // Postgres is authoritative: the server validates, versions, and activates.
      const res = await savePricing({ catalog: draft, baseVersion: initialVersion });
      if (res.ok) {
        // Optimistic mirror update for instant configurator preview; the refresh
        // then re-hydrates the authoritative active version app-wide.
        setPricing(draft);
        toast("Ndryshimet u ruajtën.");
        router.refresh();
      } else if (res.error.code === "CONFLICT") {
        toast("Çmimet u ndryshuan nga dikush tjetër. U rifreskuan.");
        router.refresh();
      } else if (res.error.code === "FORBIDDEN") {
        toast("Nuk keni leje për të ndryshuar çmimet.");
      } else {
        toast(res.error.message || "Ruajtja dështoi.");
      }
    } finally {
      setSaving(false);
    }
  };
  const discard = async () => {
    const ok = await confirm({ title: "Rikthe ndryshimet?", message: "Ndryshimet e paruajtura do të humbasin.", confirmLabel: "Rikthe", danger: true });
    if (ok) setDraft(initialCatalog);
  };

  return (
    <div>
      <PageHeader
        title="Çmimet & Sistemet"
        subtitle="Vetëm çmimet dhe zgjedhjet që përdoren nga llogaritja aktuale."
      />

      <div className="mb-5 flex items-center gap-3 border-b border-slate-200">
        <div className="no-scrollbar -mb-px flex flex-1 gap-1 overflow-x-auto">
          {ACTIVE_PRICING_TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={cn("shrink-0 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                tab === t.value ? "border-neutral-500 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700")}>
              {t.label}
            </button>
          ))}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            {dirty && (
              <button onClick={discard} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700">
                <RotateCcw className="size-3.5" /> Rikthe
              </button>
            )}
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Duke ruajtur…" : dirty ? "Ruaj Ndryshimet •" : "Ruaj Ndryshimet"}
            </Button>
          </div>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-slate-400">Vetëm shikim</span>
        )}
      </div>

      <p className="mb-5 max-w-3xl text-sm text-slate-400">{TAB_DESC[tab]}</p>

      {/* Non-editors get a fully read-only editor; the server action is the hard
          gate, this just prevents pointless local edits. */}
      <fieldset disabled={!canEdit} className="contents">
        {tab === "" && <SystemsTab draft={draft} update={update} />}
        {tab === "arming" && <ArmingTab draft={draft} update={update} />}
        {tab === "glass" && <GlassTab draft={draft} update={update} />}
        {tab === "accessories" && <BeadsTab draft={draft} update={update} />}
        {tab === "roleta" && <RoletaTab draft={draft} update={update} />}
      </fieldset>
    </div>
  );
}

type TabProps = { draft: Pricing; update: (fn: (d: Pricing) => Pricing) => void };

function num(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
// --- Sistemet -------------------------------------------------------------
function SystemsTab({ draft, update }: TabProps) {
  const [selected, setSelected] = useState(draft.systems[0]?.id ?? "");
  const [filter, setFilter] = useState<string>("Të gjitha");
  const filters = ["Të gjitha", "Dritare", "Dyer", "Rrëshq."];
  const list = draft.systems.filter((s) => filter === "Të gjitha" || s.category === filter);
  const sys = draft.systems.find((s) => s.id === selected) ?? draft.systems[0];

  const addSystem = () => {
    const s: PricingSystem = { id: uid(), name: "Sistem i ri", brand: "Aluplast", material: "PVC", badges: ["PVC"], category: "Dritare" };
    update((d) => ({ ...d, systems: [...d.systems, s] }));
    setSelected(s.id);
  };
  const patchSystem = (patch: Partial<PricingSystem>) =>
    update((d) => ({ ...d, systems: d.systems.map((s) => (s.id === sys.id ? { ...s, ...patch } : s)) }));
  const delSystem = () => {
    update((d) => ({ ...d, systems: d.systems.filter((s) => s.id !== sys.id) }));
    setSelected(draft.systems.find((s) => s.id !== sys.id)?.id ?? "");
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <div className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <input placeholder="Kërko sistem ose brend..." className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", filter === f ? "bg-slate-300 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900")}>{f}</button>
          ))}
        </div>
        <Card className="divide-y divide-slate-200 overflow-hidden">
          {list.map((s) => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className={cn("flex w-full flex-col items-start gap-1 border-l-2 px-4 py-3 text-left transition-colors",
                selected === s.id ? "border-neutral-500 bg-slate-200/80" : "border-transparent hover:bg-slate-200/40")}>
              <span className="text-sm font-semibold text-slate-900">{s.name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {s.brand}
                {s.badges.map((b) => <Badge key={b} tone="emerald" className="text-[10px]">{b}</Badge>)}
              </span>
            </button>
          ))}
        </Card>
        <Button variant="outline" className="mt-3 w-full" onClick={addSystem}><Plus className="size-4" /> Shto Sistem</Button>
      </div>

      {sys && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Label>Të dhënat e sistemit</Label>
              <button onClick={delSystem} className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline"><Trash2 className="size-3.5" /> Fshi sistemin</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emri"><Input value={sys.name} onChange={(e) => patchSystem({ name: e.target.value })} /></Field>
              <Field label="Brendi"><Input value={sys.brand} onChange={(e) => patchSystem({ brand: e.target.value })} /></Field>
              <Field label="Materiali"><Input value={sys.material} onChange={(e) => patchSystem({ material: e.target.value })} /></Field>
              <div>
                <Label>Kategoria</Label>
                <select value={sys.category} onChange={(e) => patchSystem({ category: e.target.value as PricingSystem["category"] })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500">
                  <option>Dritare</option><option>Dyer</option><option>Rrëshq.</option>
                </select>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <Label>Çmimet e profileve (€/m)</Label>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    <th className="py-2 pr-3">Profili</th><th className="py-2 pr-3">Kodi</th>
                    <th className="py-2 pr-3 text-right">Bardhë</th><th className="py-2 pr-3 text-right">Bardhë-Color</th><th className="py-2 text-right">Color-Color</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProfileRows(draft).map((r) => (
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="py-2 pr-3 font-semibold text-slate-700">{r.profile}</td>
                      <td className="py-2 pr-3 text-slate-400">{r.code}</td>
                      {(["white", "whiteColor", "colorColor"] as const).map((k, i) => (
                        <td key={k} className={cn("py-2", i < 2 && "pr-3")}>
                          <input aria-label={`${r.profile} ${["Bardhë", "Bardhë-Color", "Color-Color"][i]} €/m`} value={String(r[k])} onChange={(e) => update((d) => ({ ...d, profilePriceRows: d.profilePriceRows.map((x) => (x.id === r.id ? { ...x, [k]: num(e.target.value) } : x)) }))}
                            className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Armimi ---------------------------------------------------------------
function ArmingTab({ draft, update }: TabProps) {
  const row = activeArmingRow(draft);
  return (
    <Card className="max-w-xl p-5">
      <Label>Armimi aktiv për ram (€/m)</Label>
      {row ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-700">{row.component} <span className="text-xs text-slate-400">· {row.code}</span></span>
          <input aria-label={`${row.component} €/m`} value={String(row.price)} onChange={(e) => update((d) => ({ ...d, armingRows: d.armingRows.map((item) => (item.id === row.id ? { ...item, price: num(e.target.value) } : item)) }))}
            className="h-9 w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Nuk ka rresht aktiv të armimit të ramit.</p>
      )}
    </Card>
  );
}
// --- Xhamat ---------------------------------------------------------------
function GlassTab({ draft, update }: TabProps) {
  const add = () => update((d) => ({
    ...d,
    glass: [...d.glass, { id: uid(), name: "I ri", brand: "Brand", price: 0, photo: true, extra: "" } as CatalogRow],
  }));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Llojet e xhamave ({draft.glass.length})</span>
        <Button size="sm" onClick={add}><Plus className="size-4" /> Shto Xham</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Emri</th>
              <th className="px-4 py-3">Brendi</th>
              <th className="px-4 py-3">Përshkrimi</th>
              <th className="px-4 py-3 text-right">€/m²</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {draft.glass.map((row) => (
              <tr key={row.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-slate-200/70 text-slate-400">
                    <ImageIcon className="size-4" />
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Emri i xhamit ${row.name}`} value={row.name} onChange={(event) => update((d) => ({ ...d, glass: d.glass.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)) }))}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500" />
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Brendi i xhamit ${row.name}`} value={row.brand} onChange={(event) => update((d) => ({ ...d, glass: d.glass.map((item) => (item.id === row.id ? { ...item, brand: event.target.value } : item)) }))}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-neutral-500" />
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Përshkrimi i xhamit ${row.name}`} value={row.extra ?? ""} onChange={(event) => update((d) => ({ ...d, glass: d.glass.map((item) => (item.id === row.id ? { ...item, extra: event.target.value } : item)) }))}
                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-500 outline-none focus:border-neutral-500" />
                </td>
                <td className="px-4 py-3 text-right">
                  <input aria-label={`${row.name} €/m²`} value={String(row.price)} onChange={(event) => update((d) => ({ ...d, glass: d.glass.map((item) => (item.id === row.id ? { ...item, price: num(event.target.value) } : item)) }))}
                    className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" />
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => update((d) => ({ ...d, glass: d.glass.filter((item) => item.id !== row.id) }))} className="text-slate-400 hover:text-rose-400" aria-label={`Fshi ${row.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Llajsnet -------------------------------------------------------------
function BeadsTab({ draft, update }: TabProps) {
  return (
    <Card className="max-w-2xl p-5">
      <Label>Çmimet aktive të llajsnës</Label>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EDITABLE_ACCESSORY_KEYS.map((key) => (
          <Field key={key} label={key}>
            <Input value={draft.accessoryParams[key] ?? ""} onChange={(event) => update((d) => ({
              ...d,
              accessoryParams: { ...d.accessoryParams, [key]: event.target.value },
            }))} inputMode="decimal" />
          </Field>
        ))}
      </div>
    </Card>
  );
}

// --- Roletat --------------------------------------------------------------
function RoletaTab({ draft, update }: TabProps) {
  const row = draft.roletaVersions[0];

  return (
    <Card className="max-w-xl p-5">
      <Label>Çmimi aktiv i roletës</Label>
      {row ? (
        <div className="mt-4">
          <Field label={`${row.name} — çmimi për m²`}>
            <Input value={String(row.pricePerM2)} onChange={(event) => update((d) => ({
              ...d,
              roletaVersions: d.roletaVersions.map((item) => (
                item.id === row.id ? { ...item, pricePerM2: num(event.target.value) } : item
              )),
            }))} inputMode="decimal" />
          </Field>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Nuk ka rresht aktiv të roletës.</p>
      )}
    </Card>
  );
}
