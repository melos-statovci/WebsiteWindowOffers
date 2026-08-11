"use client";

import { useMemo, useState } from "react";
import {
  Ruler, Layers, Settings2, Square, DoorOpen, DoorClosed, PanelsTopLeft, Rows3,
  Plus, Minus, ChevronDown, Trash2, Check, MoveDiagonal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/kit";
import { WindowPreview } from "@/components/projects/window-preview";
import { useApp } from "@/components/providers/providers";
import { useStore, uid } from "@/lib/store";
import {
  computeLayout, computeMaterials, computePrice, validateConfig, MODELS, DOOR_MODELS, isDoorProduct, isGlassProduct,
} from "@/domain/configurator/window-calc";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ModelType, OfferItem, ProductType, WindowConfig, ProfileColor, OpeningType, ShteseSide,
} from "@/domain/types";

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
  "trekendesh", "trapez", "pesekendesh", "hark", "rreth",
];

const COLORS: { value: ProfileColor; label: string }[] = [
  { value: "white", label: "Bardhë - Bardhë" },
  { value: "white_color", label: "Bardhë - Color" },
  { value: "color_color", label: "Color - Color" },
];
const MECHANISMS = ["Roto NX", "Roto Patio", "Vorne Kip"];
const SIDES: ShteseSide[] = ["Lart", "Poshtë", "Majtas", "Djathtas"];
const OPENING_CYCLE: OpeningType[] = ["fiks", "majtas", "majtas-kip", "djathtas", "djathtas-kip", "kip"];
const clampNumber = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const intFromInput = (value: string, min: number, max: number) =>
  clampNumber(parseInt(value, 10), min, max);
const decimalFromInput = (value: string, min: number, max: number) =>
  clampNumber(parseFloat(value.replace(",", ".")), min, max);
const sanitizeConfig = (config: WindowConfig): WindowConfig => ({
  ...config,
  widthMm: clampNumber(config.widthMm, 200, 10000),
  heightMm: clampNumber(config.heightMm, 200, 10000),
  manualPrice: config.manualPrice == null ? config.manualPrice : clampNumber(config.manualPrice, 0, 1_000_000),
  customVerticalMullions: config.customVerticalMullions == null ? config.customVerticalMullions : clampNumber(config.customVerticalMullions, 0, 5),
  customHorizontalMullions: config.customHorizontalMullions == null ? config.customHorizontalMullions : clampNumber(config.customHorizontalMullions, 0, 5),
  shtesa: config.shtesa.map((s) => ({ ...s, widthMm: clampNumber(s.widthMm, 0, 2000) })),
});

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
  offerItemCount = 0,
  onSave,
  onCancel,
}: {
  initial?: OfferItem | null;
  initialProductType?: ProductType;
  offerItemCount?: number;
  onSave: (item: Omit<OfferItem, "id">, id?: string) => void;
  onCancel: () => void;
}) {
  const pricing = useStore((s) => s.pricing);
  const { toast } = useApp();

  const [cfg, setCfg] = useState<WindowConfig>(
    () => initial?.config ? sanitizeConfig(structuredClone(initial.config)) : defaultConfig(initialProductType, pricing.systems, pricing.glass[0]?.id ?? "g1"),
  );
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [subtab, setSubtab] = useState<"permasat" | "shtesa" | "mekanizmi">("permasat");
  const [productOpen, setProductOpen] = useState(false);
  const [shtesaMenu, setShtesaMenu] = useState(false);

  const set = <K extends keyof WindowConfig>(k: K, v: WindowConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const materials = useMemo(() => computeMaterials(cfg), [cfg]);
  const price = useMemo(() => computePrice(cfg, pricing), [cfg, pricing]);
  const issues = useMemo(() => validateConfig(cfg), [cfg]);
  const hasErrors = issues.some((i) => i.level === "error");

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

  const changeModel = (modelType: ModelType) => {
    setCfg((c) => {
      const next = {
        ...c,
        modelType,
        ...(modelType === "custom" && {
          customVerticalMullions: c.customVerticalMullions ?? 1,
          customHorizontalMullions: c.customHorizontalMullions ?? 0,
        }),
      };
      const paneCount = computeLayout(modelType, next.widthMm, next.heightMm, next).panes.length;
      const openings = Object.fromEntries(
        Object.entries(next.openings ?? {}).filter(([index]) => Number(index) < paneCount),
      ) as Record<number, OpeningType>;
      return { ...next, openings };
    });
  };

  const changeCustomMullions = (axis: "vertical" | "horizontal", delta: number) => {
    setCfg((c) => {
      const next = {
        ...c,
        modelType: "custom" as ModelType,
        customVerticalMullions: axis === "vertical"
          ? clampNumber((c.customVerticalMullions ?? 1) + delta, 0, 5)
          : c.customVerticalMullions ?? 1,
        customHorizontalMullions: axis === "horizontal"
          ? clampNumber((c.customHorizontalMullions ?? 0) + delta, 0, 5)
          : c.customHorizontalMullions ?? 0,
      };
      const paneCount = computeLayout(next.modelType, next.widthMm, next.heightMm, next).panes.length;
      const openings = Object.fromEntries(
        Object.entries(next.openings ?? {}).filter(([index]) => Number(index) < paneCount),
      ) as Record<number, OpeningType>;
      return { ...next, openings };
    });
  };

  const addShtese = (side: ShteseSide) => {
    setShtesaMenu(false);
    set("shtesa", [...cfg.shtesa, { id: uid(), side, widthMm: 0 }]);
  };

  const save = () => {
    if (hasErrors) {
      toast(issues.find((i) => i.level === "error")?.message ?? "Konfigurimi ka gabime.");
      return;
    }
    onSave(
      { kind: kindOf(pt), label: pt, widthMm: cfg.widthMm, heightMm: cfg.heightMm, qty: clampNumber(qty, 1, 999), unitPrice: price, config: sanitizeConfig(cfg) },
      initial?.id,
    );
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-[380px_minmax(0,1fr)]">
      {/* LEFT: configuration panel */}
      <div className="no-scrollbar order-2 space-y-4 lg:order-1 lg:h-full lg:max-w-[380px] lg:overflow-y-auto lg:pr-6 lg:pt-10">
        {/* Product type dropdown */}
        <div className="relative">
          <button onClick={() => setProductOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-xl border-2 border-neutral-500/60 bg-slate-100 px-4 py-3 text-left">
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
                    {pt === type && <Check className="ml-auto size-4 text-slate-900" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sub-tabs (roleta has none) */}
        {!roleta && (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
            {([["permasat", "Përmasat", Ruler], ["shtesa", "Shtesa & Roleta", Layers], ["mekanizmi", "Mekanizmi & Xhami", Settings2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setSubtab(v)}
                className={cn("flex h-[72px] flex-col items-center justify-center gap-1 rounded-lg px-2 text-center text-[11px] font-semibold leading-tight transition-colors", subtab === v ? "bg-slate-300 text-white" : "text-slate-500 hover:text-slate-900")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {(roleta || subtab === "permasat") && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DimInput key={`width-${pt}`} label="Gjerësia (W)" value={cfg.widthMm} onChange={(v) => set("widthMm", v)} />
              <DimInput key={`height-${pt}`} label="Lartësia (H)" value={cfg.heightMm} onChange={(v) => set("heightMm", v)} />
            </div>

            {!roleta && cfg.modelType === "custom" && (
              <CustomModelControls
                vertical={cfg.customVerticalMullions ?? 1}
                horizontal={cfg.customHorizontalMullions ?? 0}
                onChange={changeCustomMullions}
              />
            )}

            {!roleta && cfg.modelType !== "custom" && (
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Layers className="size-4 text-slate-900" /> Profili & Ngjyra</div>
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
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-neutral-500">
                  <input value={String(cfg.manualPrice ?? 0)} onChange={(e) => set("manualPrice", decimalFromInput(e.target.value, 0, 1_000_000))} inputMode="decimal" min={0}
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
                        className={cn("rounded-xl border p-3 text-left", cfg.sashComposition === v ? "border-neutral-500 bg-slate-200/80" : "border-slate-200 hover:bg-slate-200/40")}>
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
                <button onClick={() => setShtesaMenu((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:underline"><Plus className="size-3.5" /> Shto shtesë</button>
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
                      <input value={String(sh.widthMm)} onChange={(e) => set("shtesa", cfg.shtesa.map((x) => (x.id === sh.id ? { ...x, widthMm: intFromInput(e.target.value, 0, 2000) } : x)))}
                        className="h-8 w-20 rounded-md border border-slate-200 bg-slate-50 px-2 text-right text-sm text-slate-900 outline-none focus:border-neutral-500" inputMode="numeric" min={0} max={2000} />
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
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-neutral-500" />
            </Field>
          </div>
        )}
      </div>

      {/* RIGHT: preview + summary */}
      <div className="order-1 flex flex-col gap-3 lg:order-2 lg:h-full lg:min-h-0">
        {glass && (
          <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-1">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Modeli</span>
            <span className="truncate text-sm font-semibold text-slate-900">{MODELS[cfg.modelType].label}</span>
          </div>
        )}
        {glass && (
          <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto p-2">
            {MODEL_ORDER.map((mt) => (
              <button key={mt} onClick={() => changeModel(mt)} title={MODELS[mt].label} aria-label={MODELS[mt].label}
                className={cn(
                  mt === "custom"
                    ? "group relative flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-dashed transition-all"
                    : "group relative size-11 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-900/25 transition-all shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]",
                  cfg.modelType === mt && mt === "custom"
                    ? "border-neutral-500 bg-slate-200 text-slate-900"
                    : cfg.modelType === mt
                      ? "border-neutral-500 ring-2 ring-slate-300"
                      : mt === "custom"
                        ? "border-slate-300 text-slate-400 hover:border-neutral-400 hover:bg-slate-200/80 hover:text-slate-900"
                        : "border-slate-200 hover:border-neutral-500",
                )}>
                <ModelGlyph modelType={mt} />
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-[220px] flex-1 items-center justify-center p-2 text-slate-500 lg:min-h-0">
          <WindowPreview config={cfg} onPaneClick={glass ? cyclePane : undefined} />
        </div>

        {glass && (
          <p className="shrink-0 px-2 text-center text-[11px] text-slate-400">
            Kliko një panel për të ndryshuar hapjen: fiks → majtas → majtas-kip → djathtas → djathtas-kip → kip.
          </p>
        )}

        {issues.length > 0 && (
          <div className="shrink-0 space-y-1.5 px-2">
            {issues.map((it, i) => (
              <p key={i} className={cn("flex items-start gap-1.5 text-xs", it.level === "error" ? "text-rose-500" : "text-amber-500")}>
                <span aria-hidden>{it.level === "error" ? "⚠" : "ⓘ"}</span>
                {it.message}
              </p>
            ))}
          </div>
        )}

        {/* materials */}
        <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-500 uppercase"><Check className="size-3.5" /> Materialet për këtë pozicion</div>
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
        <div className="shrink-0 space-y-3">
          <div className="flex items-center justify-end gap-4">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Sasia</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setQty((q) => clampNumber(q - 1, 1, 999))} className="grid size-9 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Zvogëlo"><Minus className="size-4" /></button>
              <input value={String(qty)} onChange={(e) => setQty(intFromInput(e.target.value, 1, 999))} className="h-9 w-14 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-semibold text-slate-900 outline-none focus:border-neutral-500" inputMode="numeric" min={1} max={999} />
              <button onClick={() => setQty((q) => clampNumber(q + 1, 1, 999))} className="grid size-9 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300" aria-label="Rrit"><Plus className="size-4" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Çmimi i përllogaritur</span>
            <span className="font-heading text-2xl font-bold text-slate-900">{eur(price * qty)}</span>
          </div>
          <Button className="w-full" onClick={save} disabled={hasErrors}><Plus className="size-4" /> {initial ? "Ruaj ndryshimet" : "Shto në Ofertë"}</Button>
          <Button variant="ghost" className="w-full" onClick={onCancel}>Shiko ofertën ({offerItemCount})</Button>
        </div>
      </div>
    </div>
  );
}

function CustomModelControls({
  vertical,
  horizontal,
  onChange,
}: {
  vertical: number;
  horizontal: number;
  onChange: (axis: "vertical" | "horizontal", delta: number) => void;
}) {
  return (
    <div className="divide-y divide-slate-200/70">
      <div className="py-3">
        <CustomStepper
          label="Shtyllë Vertikale"
          value={vertical}
          minusLabel="Hiq shtyllë vertikale"
          plusLabel="Shto shtyllë vertikale"
          onMinus={() => onChange("vertical", -1)}
          onPlus={() => onChange("vertical", 1)}
        />
        <div className="mt-1.5 flex flex-col">
          {Array.from({ length: vertical + 1 }).map((_, i) => (
            <button key={i} type="button" className="flex items-center justify-between py-1.5 pl-3 text-left text-xs text-slate-500 transition-colors hover:text-slate-900">
              <span>Kolona {i + 1}</span>
              <span className="text-slate-300">›</span>
            </button>
          ))}
        </div>
      </div>
      <div className="py-3">
        <CustomStepper
          label="Shtyllë Horizontale"
          value={horizontal}
          minusLabel="Hiq shtyllë horizontale"
          plusLabel="Shto shtyllë horizontale"
          onMinus={() => onChange("horizontal", -1)}
          onPlus={() => onChange("horizontal", 1)}
        />
      </div>
    </div>
  );
}

function CustomStepper({
  label,
  value,
  minusLabel,
  plusLabel,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  minusLabel: string;
  plusLabel: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={minusLabel}
          disabled={value <= 0}
          onClick={onMinus}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-lg leading-none text-slate-600 transition-colors active:bg-slate-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-4 text-center text-sm font-semibold text-slate-700">{value}</span>
        <button
          type="button"
          aria-label={plusLabel}
          disabled={value >= 5}
          onClick={onPlus}
          className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-lg leading-none text-slate-600 transition-colors active:bg-slate-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ---- small UI helpers -----------------------------------------------------
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5">
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
      className={cn("h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-neutral-500", className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { toast } = useApp();

  const commitIfValid = (nextDraft: string) => {
    const parsed = Number(nextDraft);
    if (/^\d+$/.test(nextDraft) && parsed >= 200 && parsed <= 10000) {
      onChange(parsed);
    }
  };

  const validateOnBlur = (input: HTMLInputElement) => {
    const draft = input.value.trim();
    const parsed = Number(draft);
    if (!/^\d+$/.test(draft) || parsed < 200) {
      toast("Dimensioni nuk mund të jetë nën 200 mm.");
      onChange(200);
      input.value = "200";
      return;
    }
    if (parsed > 10000) {
      toast("Dimensioni maksimal është 10000 mm.");
      onChange(10000);
      input.value = "10000";
      return;
    }
    onChange(parsed);
    input.value = String(parsed);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</label>
      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-neutral-500">
        <input
          defaultValue={String(value)}
          onChange={(e) => commitIfValid(e.target.value)}
          onBlur={(e) => validateOnBlur(e.currentTarget)}
          inputMode="numeric"
          className="h-16 w-full bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none"
        />
        <span className="px-3 text-xs font-semibold text-slate-400">MM</span>
      </div>
    </div>
  );
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", checked ? "bg-slate-300" : "bg-slate-300")}>
      <span className={cn("inline-block size-5 transform rounded-full bg-white transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
function ModelGlyph({ modelType }: { modelType: ModelType }) {
  const def = MODELS[modelType];
  if (modelType === "custom") return <Plus className="size-5 text-current" />;
  const frame = "#3f3f46";
  const glass = "#d4d4d8";
  if (def.shape) {
    if (def.shape === "triangle") {
      return <ShapeGlyph outer="M 0 110 L 110 110 L 55 0 Z" inner="M 11 102 L 99 102 L 55 15 Z" />;
    }
    if (def.shape === "trapez") {
      return <ShapeGlyph outer="M 0 110 L 110 110 L 110 0 L 0 44 Z" inner="M 7 103 L 103 103 L 103 10.3 L 7 48.7 Z" />;
    }
    if (def.shape === "pentagon") {
      return <ShapeGlyph outer="M 0 110 L 110 110 L 110 38.5 L 55 0 L 0 38.5 Z" inner="M 7 103 L 103 103 L 103 42.1 L 55 8.5 L 7 42.1 Z" />;
    }
    if (def.shape === "arch") {
      return (
        <svg width="110" height="110" viewBox="0 0 110 110" className="block size-full overflow-visible" aria-hidden="true">
          <path d="M 0 110 L 0 49 C 0 18 24 0 55 0 C 86 0 110 18 110 49 L 110 110 Z" fill="none" stroke="#e4e4e7" strokeWidth="7" />
          <path d="M 8 102 L 8 50 C 8 25 28 8 55 8 C 82 8 102 25 102 50 L 102 102 Z" fill="none" stroke="#a1a1aa" strokeWidth="3" />
        </svg>
      );
    }
    return (
      <svg width="110" height="110" viewBox="0 0 110 110" className="block size-full overflow-visible" aria-hidden="true">
        <circle cx="55" cy="55" r="50" fill="none" stroke="#e4e4e7" strokeWidth="7" />
        <circle cx="55" cy="55" r="40" fill="none" stroke="#a1a1aa" strokeWidth="3" />
      </svg>
    );
  }
  const rows = def.rows;
  const totalHf = rows.reduce((s, r) => s + r.hf, 0);
  return (
    <svg viewBox="0 0 100 100" className="size-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="8" y="8" width="84" height="84" rx="7" fill={glass} stroke={frame} strokeWidth="8" />
      {(() => {
        const els: React.ReactElement[] = [];
        let y = 8;
        rows.forEach((row, ri) => {
          const rh = 84 * (row.hf / totalHf);
          for (let c = 1; c < row.cols; c++) {
            const x = 8 + (84 * c) / row.cols;
            els.push(<line key={`v${ri}-${c}`} x1={x} y1={y} x2={x} y2={y + rh} stroke={frame} strokeWidth="8" />);
          }
          y += rh;
          if (ri < rows.length - 1) els.push(<line key={`h${ri}`} x1="8" y1={y} x2="92" y2={y} stroke={frame} strokeWidth="8" />);
        });
        return els;
      })()}
    </svg>
  );
}

function ShapeGlyph({ outer, inner }: { outer: string; inner: string }) {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="block size-full overflow-visible" aria-hidden="true">
      <path d={outer} fill="none" stroke="#e4e4e7" strokeWidth="7" strokeLinejoin="round" />
      <path d={inner} fill="none" stroke="#a1a1aa" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
