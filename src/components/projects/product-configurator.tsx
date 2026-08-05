"use client";

import { useMemo, useState } from "react";
import {
  Ruler, Layers, Settings2, Square, DoorOpen, DoorClosed, PanelsTopLeft, Rows3,
  Plus, Minus, ChevronDown, Trash2, Check, MoveDiagonal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/kit";
import { WindowPreview } from "@/components/projects/window-preview";
import { useStore, uid } from "@/lib/store";
import {
  computeMaterials, computePrice, MODELS, DOOR_MODELS, isDoorProduct, isGlassProduct,
} from "@/lib/window-calc";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ModelType, OfferItem, ProductType, WindowConfig, ProfileColor, OpeningType, ShteseSide,
} from "@/types";

export const PRODUCT_TYPES: { type: ProductType; icon: LucideIcon }[] = [
  { type: "Dritare", icon: Square },
  { type: "Derë Hyrje", icon: DoorOpen },
  { type: "Derë", icon: DoorClosed },
  { type: "Rreshqitëse", icon: PanelsTopLeft },
  { type: "Roletë", icon: Rows3 },
];

const MODEL_ORDER: ModelType[] = [
  "custom", "njeshe", "dyshe-v", "treshe-v", "katershe-v",
  "transom-top-1-1", "transom-top-1-2", "transom-top-2-2", "transom-top-1-3", "transom-top-3-3",
  "transom-bot-1-1", "transom-bot-2-1", "transom-bot-2-2", "transom-bot-3-1", "transom-bot-3-3",
  "trekendesh", "trapez", "pesekendesh", "hark",
];

const COLORS: { value: ProfileColor; label: string }[] = [
  { value: "white", label: "Bardhë - Bardhë" },
  { value: "white_color", label: "Bardhë - Color" },
  { value: "color_color", label: "Color - Color" },
];
const MECHANISMS = ["Roto NX", "Roto Patio", "Vorne Kip"];
const SIDES: ShteseSide[] = ["Lart", "Poshtë", "Majtas", "Djathtas"];
const OPENING_CYCLE: OpeningType[] = ["fiks", "majtas", "djathtas", "kip"];

function kindOf(pt: ProductType): OfferItem["kind"] {
  if (pt === "Dritare") return "Dritare";
  if (pt === "Rreshqitëse") return "Rrëshqitëse";
  if (pt === "Roletë") return "Roletë";
  return "Derë";
}

type SystemLite = { id: string; name: string; brand: string; material: string; category: string };
function systemsFor(pt: ProductType, systems: SystemLite[]): SystemLite[] {
  if (isDoorProduct(pt)) return systems.filter((s) => s.category === "Dyer" || s.material.toUpperCase().includes("ALU"));
  if (pt === "Rreshqitëse") return systems.filter((s) => s.category === "Rrëshq." || s.category === "Dritare");
  return systems.filter((s) => s.category === "Dritare");
}

function defaultConfig(pt: ProductType, systems: SystemLite[], glassId: string): WindowConfig {
  const sys = systemsFor(pt, systems)[0]?.id ?? systems[0]?.id ?? "s1";
  const base: WindowConfig = {
    productType: pt, modelType: "njeshe", widthMm: 1000, heightMm: 1200,
    systemId: sys, color: "white", mechanismId: MECHANISMS[0], glassId,
    glassDesc: "", roleta: false, shtesa: [], openings: {},
  };
  if (isDoorProduct(pt)) return { ...base, heightMm: 2500, doorModel: "ARIES", sashComposition: "panel", manualPrice: 0 };
  if (pt === "Rreshqitëse") return { ...base, modelType: "dyshe-v", widthMm: 2000, heightMm: 1200, manualPrice: 0 };
  if (pt === "Roletë") return { ...base, heightMm: 1200 };
  return base;
}

export function ProductConfigurator({
  initial,
  initialProductType = "Dritare",
  onSave,
  onCancel,
}: {
  initial?: OfferItem | null;
  initialProductType?: ProductType;
  onSave: (item: Omit<OfferItem, "id">, id?: string) => void;
  onCancel: () => void;
}) {
  const pricing = useStore((s) => s.pricing);

  const [cfg, setCfg] = useState<WindowConfig>(
    () => initial?.config ?? defaultConfig(initialProductType, pricing.systems, pricing.glass[0]?.id ?? "g1"),
  );
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [subtab, setSubtab] = useState<"permasat" | "shtesa" | "mekanizmi">("permasat");
  const [productOpen, setProductOpen] = useState(false);
  const [shtesaMenu, setShtesaMenu] = useState(false);

  const set = <K extends keyof WindowConfig>(k: K, v: WindowConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const materials = useMemo(() => computeMaterials(cfg), [cfg]);
  const price = useMemo(() => computePrice(cfg, pricing), [cfg, pricing]);

  const pt = cfg.productType;
  const glass = isGlassProduct(pt);
  const door = isDoorProduct(pt);
  const roleta = pt === "Roletë";
  const activeProduct = PRODUCT_TYPES.find((p) => p.type === pt)!;
  const sysOptions = systemsFor(pt, pricing.systems);

  const changeType = (newPt: ProductType) => {
    setProductOpen(false);
    setCfg(defaultConfig(newPt, pricing.systems, pricing.glass[0]?.id ?? "g1"));
    setSubtab("permasat");
  };

  const cyclePane = (i: number) => {
    setCfg((c) => {
      const cur = (c.openings?.[i] ?? "fiks") as OpeningType;
      const next = OPENING_CYCLE[(OPENING_CYCLE.indexOf(cur) + 1) % OPENING_CYCLE.length];
      const openings = { ...c.openings };
      if (next === "fiks") delete openings[i]; else openings[i] = next;
      return { ...c, openings };
    });
  };

  const addShtese = (side: ShteseSide) => {
    setShtesaMenu(false);
    set("shtesa", [...cfg.shtesa, { id: uid(), side, widthMm: 0 }]);
  };

  const save = () => {
    onSave(
      { kind: kindOf(pt), label: pt, widthMm: cfg.widthMm, heightMm: cfg.heightMm, qty, unitPrice: price, config: cfg },
      initial?.id,
    );
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* LEFT: configuration panel */}
      <div className="order-2 space-y-4 lg:order-1">
        {/* Product type dropdown */}
        <div className="relative">
          <button onClick={() => setProductOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-xl border-2 border-indigo-500/60 bg-slate-100 px-4 py-3 text-left">
            <activeProduct.icon className="size-5 text-slate-500" />
            <span className="flex-1 font-semibold text-slate-900">{pt}</span>
            <ChevronDown className={cn("size-4 text-slate-400 transition-transform", productOpen && "rotate-180")} />
          </button>
          {productOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProductOpen(false)} />
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 py-1 shadow-xl">
                {PRODUCT_TYPES.map(({ type, icon: Icon }) => (
                  <button key={type} onClick={() => changeType(type)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-200/60", pt === type ? "font-semibold text-slate-900" : "text-slate-500")}>
                    <Icon className="size-4" /> {type}
                    {pt === type && <Check className="ml-auto size-4 text-indigo-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sub-tabs (roleta has none) */}
        {!roleta && (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {([["permasat", "Përmasat", Ruler], ["shtesa", "Shtesa & Roleta", Layers], ["mekanizmi", "Mekanizmi & Xhami", Settings2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setSubtab(v)}
                className={cn("flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-colors", subtab === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {(roleta || subtab === "permasat") && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DimInput label="Gjerësia (W)" value={cfg.widthMm} onChange={(v) => set("widthMm", v)} />
              <DimInput label="Lartësia (H)" value={cfg.heightMm} onChange={(v) => set("heightMm", v)} />
            </div>

            {!roleta && (
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Layers className="size-4 text-indigo-400" /> Profili & Ngjyra</div>
                <Field label="Sistemi i profilit">
                  <Select value={cfg.systemId} onChange={(v) => set("systemId", v)} options={sysOptions.map((s) => ({ value: s.id, label: `${s.name} (${s.brand})` }))} />
                </Field>
                <Field label="Ngjyra e profilit">
                  <Select value={cfg.color} onChange={(v) => set("color", v as ProfileColor)} options={COLORS} />
                </Field>
              </div>
            )}

            {(door || pt === "Rreshqitëse") && (
              <Field label="Mbishkrim manual (opsional) — 0 = automatik">
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-indigo-500">
                  <input value={String(cfg.manualPrice ?? 0)} onChange={(e) => set("manualPrice", parseFloat(e.target.value.replace(",", ".")) || 0)} inputMode="decimal"
                    className="h-10 w-full bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none" />
                  <span className="px-3 text-xs font-semibold text-slate-400">€</span>
                </div>
              </Field>
            )}

            {door && (
              <>
                <Field label="Modeli i derës">
                  <Select value={cfg.doorModel ?? "ARIES"} onChange={(v) => set("doorModel", v)} options={DOOR_MODELS.map((d) => ({ value: d, label: d }))} />
                </Field>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase">Përbërja e krahut</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[["panel", "Panel i plotë", "Krah masiv"], ["glass", pt === "Derë Hyrje" ? "Gjysmë xham" : "Me xham", pt === "Derë Hyrje" ? "Panel + xham lart" : "Krah me xham"]].map(([v, t, sub]) => (
                      <button key={v} onClick={() => set("sashComposition", v)}
                        className={cn("rounded-xl border p-3 text-left", cfg.sashComposition === v ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 hover:bg-slate-200/40")}>
                        <span className="block text-sm font-semibold text-slate-900">{t}</span>
                        <span className="block text-xs text-slate-400">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!roleta && subtab === "shtesa" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
              <div className="relative mb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Shtesa</span>
                <button onClick={() => setShtesaMenu((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline"><Plus className="size-3.5" /> Shto shtesë</button>
                {shtesaMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShtesaMenu(false)} />
                    <div className="absolute top-6 right-0 z-20 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 py-1 shadow-xl">
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Ku ta shtoni?</div>
                      {SIDES.map((s) => (
                        <button key={s} onClick={() => addShtese(s)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/60">
                          <MoveDiagonal className="size-4 text-slate-400" /> {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {cfg.shtesa.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">Nuk ka shtesa. Kliko &ldquo;Shto shtesë&rdquo; për të zgjeruar profilin anash.</p>
              ) : (
                <ul className="space-y-2">
                  {cfg.shtesa.map((sh) => (
                    <li key={sh.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="flex-1 text-xs font-bold tracking-wide text-slate-500 uppercase">{sh.side}</span>
                      <input value={String(sh.widthMm)} onChange={(e) => set("shtesa", cfg.shtesa.map((x) => (x.id === sh.id ? { ...x, widthMm: parseInt(e.target.value) || 0 } : x)))}
                        className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-indigo-500" inputMode="numeric" />
                      <span className="text-xs text-slate-400">mm</span>
                      <button onClick={() => set("shtesa", cfg.shtesa.filter((x) => x.id !== sh.id))} className="text-slate-400 hover:text-rose-400" aria-label="Hiq"><Trash2 className="size-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-4 py-3">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Aktivizo Roletën</span>
              <Toggle checked={cfg.roleta} onChange={(v) => set("roleta", v)} />
            </div>
          </div>
        )}

        {!roleta && subtab === "mekanizmi" && (
          <div className="space-y-4">
            <Field label="Sistemi i mekanizmit">
              <Select value={cfg.mechanismId} onChange={(v) => set("mechanismId", v)} options={MECHANISMS.map((m) => ({ value: m, label: m }))} />
            </Field>
            <Field label="Lloji i xhamit">
              <Select value={cfg.glassId} onChange={(v) => set("glassId", v)} options={pricing.glass.map((g) => ({ value: g.id, label: `${g.name} (${g.brand})` }))} />
            </Field>
            <Field label="Përshkrimi i xhamit (opsionale)">
              <input value={cfg.glassDesc ?? ""} onChange={(e) => set("glassDesc", e.target.value)} placeholder="4mm Float + 16mm Argon + 4mm Low-E"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500" />
            </Field>
          </div>
        )}
      </div>

      {/* RIGHT: preview + summary */}
      <div className="order-1 space-y-4 lg:order-2">
        {glass && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-2">
            {MODEL_ORDER.map((mt) => (
              <button key={mt} onClick={() => set("modelType", mt)} title={MODELS[mt].label} aria-label={MODELS[mt].label}
                className={cn("grid size-11 shrink-0 place-items-center rounded-lg border transition-colors", cfg.modelType === mt ? "border-indigo-500 bg-indigo-600/10 text-indigo-400" : "border-slate-200 text-slate-400 hover:text-slate-700")}>
                <ModelGlyph modelType={mt} />
              </button>
            ))}
          </div>
        )}

        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-slate-200 bg-slate-100 p-6 text-slate-500">
          <WindowPreview config={cfg} onPaneClick={glass ? cyclePane : undefined} />
        </div>
        {glass && <p className="-mt-2 text-center text-xs text-slate-400">Kliko një sekcion të xhamit për ta bërë hapëse (fiks → majtas → djathtas → kip).</p>}

        {/* materials */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-500 uppercase"><Check className="size-4" /> Materialet për këtë pozicion</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {roleta ? (
              <Chip label="Kutia" value={`${materials.kutiaM.toFixed(2)} m`} />
            ) : door ? (
              <>
                <Chip label="Profil Ram" value={`${materials.ramPerimM.toFixed(2)} m`} />
                <Chip label="Llajsne" value={`${materials.llajsneM.toFixed(2)} m`} />
                <Chip label="Panel" value={`${materials.panelM2.toFixed(2)} m²`} />
              </>
            ) : (
              <>
                <Chip label="Profil Ram" value={`${materials.ramPerimM.toFixed(2)} m`} />
                {materials.krahM > 0 && <Chip label="Profil Krah" value={`${materials.krahM.toFixed(2)} m`} />}
                {materials.tShtylleM > 0 && <Chip label="T-Shtyllë" value={`${materials.tShtylleM.toFixed(2)} m`} />}
                <Chip label="Llajsne" value={`${materials.llajsneM.toFixed(2)} m`} />
                <Chip label="Xham" value={`${materials.glassM2.toFixed(2)} m²`} />
                {materials.mechCount > 0 && <Chip label="Mekanizëm single" value={`${materials.mechCount} copë`} />}
                {materials.handleCount > 0 && <Chip label="Doreza" value={`${materials.handleCount} copë`} />}
              </>
            )}
          </div>
        </div>

        {/* quantity + price + add */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Sasia</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-9 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Zvogëlo"><Minus className="size-4" /></button>
              <input value={String(qty)} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="h-9 w-14 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500" inputMode="numeric" />
              <button onClick={() => setQty((q) => q + 1)} className="grid size-9 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Rrit"><Plus className="size-4" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Çmimi i përllogaritur</span>
            <span className="font-heading text-2xl font-bold text-slate-900">{eur(price * qty)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Anulo</Button>
            <Button className="flex-1" onClick={save}><Plus className="size-4" /> {initial ? "Ruaj Ndryshimet" : "Shto në Ofertë"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- small UI helpers -----------------------------------------------------
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200/70 px-2.5 py-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </span>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3 last:mb-0"><label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</label>{children}</div>;
}
function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={cn("h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-500", className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</label>
      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-indigo-500">
        <input value={String(value)} onChange={(e) => onChange(parseInt(e.target.value) || 0)} inputMode="numeric" className="h-10 w-full bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none" />
        <span className="px-3 text-xs font-semibold text-slate-400">MM</span>
      </div>
    </div>
  );
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-slate-300")}>
      <span className={cn("inline-block size-5 transform rounded-full bg-white transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
function ModelGlyph({ modelType }: { modelType: ModelType }) {
  const def = MODELS[modelType];
  if (modelType === "custom") return <Plus className="size-5" />;
  if (def.shape) {
    if (def.shape === "arch") return <svg viewBox="0 0 24 24" className="size-6"><path d="M4 20 V11 Q12 3 20 11 V20 Z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
    const pts = def.shape === "triangle" ? "12,4 20,20 4,20" : def.shape === "trapez" ? "8,4 16,4 20,20 4,20" : "12,4 20,10 17,20 7,20 4,10";
    return <svg viewBox="0 0 24 24" className="size-6"><polygon points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
  }
  const rows = def.rows;
  const R = rows.length;
  return (
    <svg viewBox="0 0 24 24" className="size-6">
      <rect x="3" y="3" width="18" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {(() => {
        const els: React.ReactElement[] = [];
        let y = 3;
        rows.forEach((row, ri) => {
          const rh = 18 * (row.hf / rows.reduce((s, r) => s + r.hf, 0));
          for (let c = 1; c < row.cols; c++) { const x = 3 + (18 * c) / row.cols; els.push(<line key={`v${ri}-${c}`} x1={x} y1={y} x2={x} y2={y + rh} stroke="currentColor" strokeWidth="1.2" />); }
          y += rh;
          if (ri < R - 1) els.push(<line key={`h${ri}`} x1="3" y1={y} x2="21" y2={y} stroke="currentColor" strokeWidth="1.2" />);
        });
        return els;
      })()}
    </svg>
  );
}
