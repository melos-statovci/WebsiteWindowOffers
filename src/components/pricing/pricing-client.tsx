"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, FileSpreadsheet, ImageIcon, Trash2, RotateCcw } from "lucide-react";
import { PageHeader, Button, Card, Badge, Field, Input, Label, Toggle } from "@/components/ui/kit";
import { useApp } from "@/components/providers/providers";
import { useStore, uid } from "@/lib/store";
import { cn } from "@/lib/utils";
import { eurAfter } from "@/lib/format";
import type { CatalogRow, PricingSystem } from "@/types";

type Pricing = ReturnType<typeof useStore.getState>["pricing"];

const TABS = [
  { value: "", label: "Sistemet" },
  { value: "metals", label: "Metalet" },
  { value: "mechanisms", label: "Mekanizmat" },
  { value: "glass", label: "Xhamat" },
  { value: "door-panels", label: "Panelet" },
  { value: "expansion-profiles", label: "Shtesat" },
  { value: "accessories", label: "Aksesorët" },
  { value: "production", label: "Parametrat" },
  { value: "roleta", label: "Roletat" },
  { value: "doors", label: "Dyer të Hyrjes" },
] as const;

const TAB_DESC: Record<string, string> = {
  "": "Regjistri i sistemeve të profileve — dritare, dyer dhe rrëshqitëse, PVC ose alumin.",
  metals: "Çmimet e metaleve të armimit (vetëm sistemet PVC armohen).",
  mechanisms: "Matricat e mekanizmave hapje/kip sipas përmasave dhe hardueri i rrëshqitëses.",
  glass: "Çmimet e xhamit për m². Për: dritare, derë banjo/ballkoni dhe rrëshqitëse.",
  "door-panels": "Çmimet e paneleve të dyerve për m².",
  "expansion-profiles": "Çmimet e profileve zgjeruese (shtesave) për metër.",
  accessories: "Aksesorët e përbashkët dhe aksesorët e derës banjo/ballkoni.",
  production: "Cilësimet e prodhimit: humbja e saldimit dhe parametrat teknikë.",
  roleta: "Llojet dhe çmimet e roletave.",
  doors: "Modelet e dyerve të hyrjes dhe çmimi i tyre: Fiks ose sipas Tabelës.",
};

const VALID = new Set<string>(TABS.map((t) => t.value));

export function PricingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast, confirm } = useApp();
  const stored = useStore((s) => s.pricing);
  const savePricing = useStore((s) => s.savePricing);

  const raw = params.get("tab") ?? "";
  const tab = VALID.has(raw) ? raw : "";
  const setTab = (v: string) => router.push(v ? `/pricing?tab=${v}` : "/pricing");

  const [draft, setDraft] = useState<Pricing>(stored);
  // keep draft in sync if store changes externally (e.g. reset demo)
  useEffect(() => {
     
    setDraft(stored);
  }, [stored]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(stored), [draft, stored]);
  const update = (fn: (d: Pricing) => Pricing) => setDraft((d) => fn(structuredClone(d)));

  const save = () => {
    savePricing(draft);
    toast("Ndryshimet u ruajtën.");
  };
  const discard = async () => {
    const ok = await confirm({ title: "Rikthe ndryshimet?", message: "Ndryshimet e paruajtura do të humbasin.", confirmLabel: "Rikthe", danger: true });
    if (ok) setDraft(stored);
  };

  return (
    <div>
      <PageHeader
        title="Çmimet & Sistemet"
        subtitle="Sistemet e profileve, materialet, produktet dhe parametrat — një vend i vetëm për çdo çmim."
      />

      <div className="mb-5 flex items-center gap-3 border-b border-slate-200">
        <div className="no-scrollbar -mb-px flex flex-1 gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={cn("shrink-0 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                tab === t.value ? "border-neutral-500 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <button onClick={discard} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700">
              <RotateCcw className="size-3.5" /> Rikthe
            </button>
          )}
          <Button onClick={save} disabled={!dirty}>
            {dirty ? "Ruaj Ndryshimet •" : "Ruaj Ndryshimet"}
          </Button>
        </div>
      </div>

      <p className="mb-5 max-w-3xl text-sm text-slate-400">{TAB_DESC[tab]}</p>

      {tab === "" && <SystemsTab draft={draft} update={update} />}
      {tab === "metals" && <MetalsTab draft={draft} update={update} />}
      {tab === "mechanisms" && <MechanismsTab draft={draft} update={update} />}
      {tab === "glass" && <PhotoTab draft={draft} update={update} coll="glass" title="Llojet e xhamave" addLabel="Shto Xham" showDesc importExcel />}
      {tab === "door-panels" && <PhotoTab draft={draft} update={update} coll="panels" title="Panelet e dyerve" addLabel="Shto Panel" />}
      {tab === "expansion-profiles" && <ExpansionsTab draft={draft} update={update} />}
      {tab === "accessories" && <ParamsTab draft={draft} update={update} which="accessoryParams" heading="Aksesorët" />}
      {tab === "production" && <ParamsTab draft={draft} update={update} which="productionParams" heading="Parametrat e prodhimit" />}
      {tab === "roleta" && <RoletaTab draft={draft} update={update} />}
      {tab === "doors" && <DoorsTab draft={draft} update={update} />}
    </div>
  );
}

type TabProps = { draft: Pricing; update: (fn: (d: Pricing) => Pricing) => void };

function num(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
function positiveInt(v: string, fallback = 0): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
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
                  {draft.profilePriceRows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="py-2 pr-3 font-semibold text-slate-700">{r.profile}</td>
                      <td className="py-2 pr-3 text-slate-400">{r.code}</td>
                      {(["white", "whiteColor", "colorColor"] as const).map((k, i) => (
                        <td key={k} className={cn("py-2", i < 2 && "pr-3")}>
                          <input value={String(r[k])} onChange={(e) => update((d) => ({ ...d, profilePriceRows: d.profilePriceRows.map((x) => (x.id === r.id ? { ...x, [k]: num(e.target.value) } : x)) }))}
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

// --- Metalet --------------------------------------------------------------
function MetalsTab({ draft, update }: TabProps) {
  const [selected, setSelected] = useState(draft.metals[0]?.id ?? "");
  const addMetal = () => { const m: CatalogRow = { id: uid(), name: "Metal i ri", brand: "Metal Standard", price: 0 }; update((d) => ({ ...d, metals: [...d.metals, m] })); setSelected(m.id); };
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <Card className="divide-y divide-slate-200 overflow-hidden">
          {draft.metals.map((m) => (
            <div key={m.id} className={cn("flex items-center border-l-2 px-4 py-3", selected === m.id ? "border-neutral-500 bg-slate-200/80" : "border-transparent")}>
              <button onClick={() => setSelected(m.id)} className="flex-1 text-left">
                <span className="block text-sm font-semibold text-slate-900">{m.name}</span>
                <span className="block text-xs text-slate-400">{m.brand}</span>
              </button>
              <button onClick={() => update((d) => ({ ...d, metals: d.metals.filter((x) => x.id !== m.id) }))} className="text-slate-400 hover:text-rose-400" aria-label="Fshi"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </Card>
        <Button variant="outline" className="mt-3 w-full" onClick={addMetal}><Plus className="size-4" /> Shto Metal</Button>
      </div>
      <Card className="p-5">
        <Label>Çmimet e armimit (€/m)</Label>
        <div className="mt-3 space-y-2">
          {draft.armingRows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700">{r.component} <span className="text-xs text-slate-400">· {r.code}</span></span>
              <input value={String(r.price)} onChange={(e) => update((d) => ({ ...d, armingRows: d.armingRows.map((x) => (x.id === r.id ? { ...x, price: num(e.target.value) } : x)) }))}
                className="h-9 w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Mekanizmat (matrices — display + editable global hardware) -----------
function MechanismsTab({ draft, update }: TabProps) {
  const heights = [60, 80, 100, 140, 180, 200, 230];
  const widths = [40, 60, 80, 105, 130];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Matrica single — lartësi × gjerësi (cm) → €</Label>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[480px] text-sm">
            <thead><tr><th className="p-2 text-left text-xs text-slate-400">H \ W</th>{widths.map((w) => <th key={w} className="p-2 text-right text-xs text-slate-400">{w}</th>)}</tr></thead>
            <tbody>
              {heights.map((h, ri) => (
                <tr key={h} className="border-t border-slate-200">
                  <td className="p-2 font-semibold text-slate-700">{h}</td>
                  {widths.map((w, ci) => <td key={w} className="p-2 text-right text-slate-500">{(24 + ri * 6 + ci * 4).toFixed(0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">Matricat janë demonstrim lokal (vetëm-shikim). Hardueri global është i editueshëm më poshtë.</p>
      </Card>
      <Card className="p-5">
        <Label>Hardueri i rrëshqitëses (global)</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {["Set rrëshqitës (për krah lëvizës) €", "Shina lart/poshtë (€/m, 2 × gjerësia)"].map((k, i) => (
            <Field key={k} label={k}>
              <Input value={draft.accessoryParams["_hw" + i] ?? (i === 0 ? "85" : "9")}
                onChange={(e) => update((d) => ({ ...d, accessoryParams: { ...d.accessoryParams, ["_hw" + i]: e.target.value } }))} inputMode="decimal" />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Xhamat / Panelet (photo tables, editable + add/delete) ---------------
function PhotoTab({ draft, update, coll, title, addLabel, showDesc, importExcel }: TabProps & { coll: "glass" | "panels"; title: string; addLabel: string; showDesc?: boolean; importExcel?: boolean }) {
  const { toast } = useApp();
  const rows = draft[coll];
  const add = () => update((d) => ({ ...d, [coll]: [...d[coll], { id: uid(), name: "I ri", brand: "Brand", price: 0, photo: true, extra: "" } as CatalogRow] }));
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">{title} ({rows.length})</span>
        <div className="flex gap-2">
          {importExcel && <Button size="sm" variant="outline" onClick={() => toast("Importo Excel — jo në demon lokale.")}><FileSpreadsheet className="size-4" /> Importo Excel</Button>}
          <Button size="sm" onClick={add}><Plus className="size-4" /> {addLabel}</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-4 py-3">Foto</th><th className="px-4 py-3">Emri</th><th className="px-4 py-3">Brendi</th>
              {showDesc && <th className="px-4 py-3">Përshkrimi</th>}<th className="px-4 py-3 text-right">€/m²</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3"><span className="grid size-10 place-items-center rounded-lg bg-slate-200/70 text-slate-400"><ImageIcon className="size-4" /></span></td>
                <td className="px-4 py-3"><input value={r.name} onChange={(e) => update((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)) }))} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500" /></td>
                <td className="px-4 py-3"><input value={r.brand} onChange={(e) => update((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === r.id ? { ...x, brand: e.target.value } : x)) }))} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-neutral-500" /></td>
                {showDesc && <td className="px-4 py-3"><input value={r.extra ?? ""} onChange={(e) => update((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === r.id ? { ...x, extra: e.target.value } : x)) }))} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-500 outline-none focus:border-neutral-500" /></td>}
                <td className="px-4 py-3 text-right"><input value={String(r.price)} onChange={(e) => update((d) => ({ ...d, [coll]: d[coll].map((x) => (x.id === r.id ? { ...x, price: num(e.target.value) } : x)) }))} className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" /></td>
                <td className="px-4 py-3 text-right"><button onClick={() => update((d) => ({ ...d, [coll]: d[coll].filter((x) => x.id !== r.id) }))} className="text-slate-400 hover:text-rose-400" aria-label="Fshi"><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Shtesat --------------------------------------------------------------
function ExpansionsTab({ draft, update }: TabProps) {
  const add = () => update((d) => ({ ...d, expansions: [...d.expansions, { id: uid(), name: "Shtesë e re", brand: "Expansion Brand A", widthMm: 20, price: 0 }] }));
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Profilet zgjeruese / shtesat ({draft.expansions.length})</span>
        <Button size="sm" onClick={add}><Plus className="size-4" /> Shto Shtesë</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase"><th className="px-4 py-3">Emri</th><th className="px-4 py-3">Brendi</th><th className="px-4 py-3 text-right">Gjerësia (mm)</th><th className="px-4 py-3 text-right">€/m</th><th /></tr></thead>
          <tbody>
            {draft.expansions.map((e) => (
              <tr key={e.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3"><input value={e.name} onChange={(ev) => update((d) => ({ ...d, expansions: d.expansions.map((x) => (x.id === e.id ? { ...x, name: ev.target.value } : x)) }))} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500" /></td>
                <td className="px-4 py-3 text-slate-500">{e.brand}</td>
                <td className="px-4 py-3 text-right"><input value={String(e.widthMm)} onChange={(ev) => update((d) => ({ ...d, expansions: d.expansions.map((x) => (x.id === e.id ? { ...x, widthMm: positiveInt(ev.target.value) } : x)) }))} className="h-8 w-16 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="numeric" min={0} /></td>
                <td className="px-4 py-3 text-right"><input value={String(e.price)} onChange={(ev) => update((d) => ({ ...d, expansions: d.expansions.map((x) => (x.id === e.id ? { ...x, price: num(ev.target.value) } : x)) }))} className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" /></td>
                <td className="px-4 py-3 text-right"><button onClick={() => update((d) => ({ ...d, expansions: d.expansions.filter((x) => x.id !== e.id) }))} className="text-slate-400 hover:text-rose-400" aria-label="Fshi"><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Aksesorët / Parametrat (param maps) ----------------------------------
function ParamsTab({ draft, update, which, heading }: TabProps & { which: "accessoryParams" | "productionParams"; heading: string }) {
  const entries = Object.entries(draft[which]).filter(([k]) => !k.startsWith("_"));
  return (
    <Card className="p-5">
      <Label>{heading}</Label>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([k, v]) => (
          <Field key={k} label={k}>
            <Input value={v} onChange={(e) => update((d) => ({ ...d, [which]: { ...d[which], [k]: e.target.value } }))} inputMode="decimal" />
          </Field>
        ))}
      </div>
    </Card>
  );
}

// --- Roletat --------------------------------------------------------------
function RoletaTab({ draft, update }: TabProps) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Versionet e roletës</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {draft.roletaVersions.map((r) => (
            <Field key={r.id} label={`${r.name} — çmimi për m²`}>
              <Input value={String(r.pricePerM2)} onChange={(e) => update((d) => ({ ...d, roletaVersions: d.roletaVersions.map((x) => (x.id === r.id ? { ...x, pricePerM2: num(e.target.value) } : x)) }))} inputMode="decimal" />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Dyer të Hyrjes -------------------------------------------------------
function DoorsTab({ draft, update }: TabProps) {
  const [showPhoto, setShowPhoto] = useState(false);
  const add = () => update((d) => ({ ...d, doorModels: [...d.doorModels, { id: uid(), name: "Model i ri", mode: "FIKS", basePrice: 0 }] }));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">Modelet e dyerve të hyrjes</span>
        <Button size="sm" onClick={add}><Plus className="size-4" /> Shto Model</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {draft.doorModels.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="mb-3 grid h-28 place-items-center rounded-xl bg-slate-200/60 text-slate-400"><ImageIcon className="size-6" /></div>
            <input value={m.name} onChange={(e) => update((d) => ({ ...d, doorModels: d.doorModels.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) }))} className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500" />
            <div className="mt-2 flex gap-2">
              {(["FIKS", "TABELË"] as const).map((mode) => (
                <button key={mode} onClick={() => update((d) => ({ ...d, doorModels: d.doorModels.map((x) => (x.id === m.id ? { ...x, mode } : x)) }))}
                  className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", m.mode === mode ? "bg-slate-200 text-slate-900" : "bg-slate-200 text-slate-500")}>{mode}</button>
              ))}
            </div>
            <div className="mt-3">
              <Label>Çmimi bazë</Label>
              <input value={String(m.basePrice)} onChange={(e) => update((d) => ({ ...d, doorModels: d.doorModels.map((x) => (x.id === m.id ? { ...x, basePrice: num(e.target.value) } : x)) }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="decimal" />
              <div className="mt-1 text-xs text-slate-400">{eurAfter(m.basePrice)}</div>
            </div>
            <div className="mt-2 text-right"><button onClick={() => update((d) => ({ ...d, doorModels: d.doorModels.filter((x) => x.id !== m.id) }))} className="text-xs font-semibold text-rose-400 hover:underline">Fshi modelin</button></div>
          </Card>
        ))}
      </div>
      <Card className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Shfaq foton e modelit në ofertë</div>
          <div className="text-xs text-slate-400">Te oferta finale shfaqet fotoja e modelit në vend të skicës teknike.</div>
        </div>
        <Toggle checked={showPhoto} onChange={setShowPhoto} label="Shfaq foton" />
      </Card>
    </div>
  );
}
