"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, FileSpreadsheet, ImageIcon } from "lucide-react";
import { PageHeader, Button, Card, Badge, Field, Input, Label, Toggle } from "@/components/ui/kit";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";
import { eurAfter } from "@/lib/format";
import {
  pricingSystems,
  profilePriceRows,
  metals,
  armingRows,
  glass,
  panels,
  expansions,
  roletaVersions,
  doorModels,
} from "@/lib/mock/data";

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
  "": "Regjistri i sistemeve të profileve — dritare, dyer dhe rrëshqitëse, PVC ose alumin. Çdo sistem lidhet me produktet ku përdoret dhe mban çmimet e veta.",
  metals: "Çmimet e metaleve të armimit (vetëm sistemet PVC armohen). Lidhen nga secili sistem profili.",
  mechanisms: "Matricat e mekanizmave hapje/kip sipas përmasave dhe hardueri i rrëshqitëses.",
  glass: "Çmimet e xhamit për m². Për: dritare, derë banjo/ballkoni dhe rrëshqitëse.",
  "door-panels": "Çmimet e paneleve të dyerve për m². Për: derë banjo/ballkoni.",
  "expansion-profiles": "Çmimet e profileve zgjeruese (shtesave) për metër.",
  accessories: "Aksesorët e përbashkët dhe aksesorët e derës banjo/ballkoni.",
  production: "Cilësimet e prodhimit: humbja e saldimit, gjatësitë e shufrave dhe parametrat teknikë.",
  roleta: "Llojet dhe çmimet e roletave.",
  doors: "Modelet e dyerve të hyrjes (blihen gati) dhe çmimi i tyre: Fiks ose sipas Tabelës.",
};

const VALID = new Set<string>(TABS.map((t) => t.value));

export function PricingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useApp();

  const raw = params.get("tab") ?? "";
  const tab = VALID.has(raw) ? raw : ""; // unknown → default Sistemet

  const setTab = (v: string) => {
    router.push(v ? `/pricing?tab=${v}` : "/pricing");
  };

  return (
    <div>
      <PageHeader
        title="Çmimet & Sistemet"
        subtitle="Sistemet e profileve, materialet, produktet dhe parametrat — një vend i vetëm për çdo çmim."
      />

      {/* Tab bar + save */}
      <div className="mb-5 flex items-center gap-3 border-b border-slate-200">
        <div className="no-scrollbar -mb-px flex flex-1 gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
                tab === t.value
                  ? "border-indigo-500 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button className="shrink-0" onClick={() => toast("Ndryshimet u ruajtën (demo lokale).")}>
          Ruaj Ndryshimet
        </Button>
      </div>

      <p className="mb-5 max-w-3xl text-sm text-slate-400">{TAB_DESC[tab]}</p>

      {tab === "" && <SystemsTab />}
      {tab === "metals" && <MetalsTab />}
      {tab === "mechanisms" && <MechanismsTab />}
      {tab === "glass" && <GlassTab />}
      {tab === "door-panels" && <PanelsTab />}
      {tab === "expansion-profiles" && <ExpansionsTab />}
      {tab === "accessories" && <AccessoriesTab />}
      {tab === "production" && <ProductionTab />}
      {tab === "roleta" && <RoletaTab />}
      {tab === "doors" && <DoorsTab />}
    </div>
  );
}

// --- Sistemet -------------------------------------------------------------
function SystemsTab() {
  const [selected, setSelected] = useState(pricingSystems[0].id);
  const [filter, setFilter] = useState<string>("Të gjitha");
  const filters = ["Të gjitha", "Dritare", "Dyer", "Rrëshq."];
  const list = pricingSystems.filter((s) => filter === "Të gjitha" || s.category === filter);
  const sys = pricingSystems.find((s) => s.id === selected) ?? pricingSystems[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <div className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3">
          <Search className="size-4 text-slate-400" />
          <input placeholder="Kërko sistem ose brend..." className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold",
                filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Card className="divide-y divide-slate-200 overflow-hidden">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-l-2 px-4 py-3 text-left transition-colors",
                selected === s.id ? "border-indigo-500 bg-indigo-50/40" : "border-transparent hover:bg-slate-200/40",
              )}
            >
              <span className="text-sm font-semibold text-slate-900">{s.name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {s.brand}
                {s.badges.map((b) => (
                  <Badge key={b} tone="emerald" className="text-[10px]">{b}</Badge>
                ))}
              </span>
            </button>
          ))}
        </Card>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline"><Plus className="size-4" /> Shto</Button>
          <Button variant="outline"><ImageIcon className="size-4" /> Shablloni</Button>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <Label>Të dhënat e sistemit</Label>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Emri"><Input defaultValue={sys.name} /></Field>
            <Field label="Brendi"><Input defaultValue={sys.brand} /></Field>
            <Field label="Materiali"><Input defaultValue={sys.material} /></Field>
            <Field label="Thellësia (mm)"><Input defaultValue="70" /></Field>
          </div>
        </Card>
        <Card className="p-5">
          <Label>Çmimet e profileve (€/m)</Label>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  <th className="py-2 pr-3">Profili</th>
                  <th className="py-2 pr-3">Kodi</th>
                  <th className="py-2 pr-3 text-right">Bardhë</th>
                  <th className="py-2 pr-3 text-right">Bardhë-Color</th>
                  <th className="py-2 text-right">Color-Color</th>
                </tr>
              </thead>
              <tbody>
                {profilePriceRows.map((r) => (
                  <tr key={r.code} className="border-t border-slate-200">
                    <td className="py-2 pr-3 font-semibold text-slate-700">{r.profile}</td>
                    <td className="py-2 pr-3 text-slate-400">{r.code}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{r.white.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{r.whiteColor.toFixed(2)}</td>
                    <td className="py-2 text-right text-slate-700">{r.colorColor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <Label>Gjeometria e profilit (mm)</Label>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Ballore e ramit"><Input defaultValue="55" /></Field>
            <Field label="Ballore e krahut"><Input defaultValue="77" /></Field>
            <Field label="Mbivendosja e krahut"><Input defaultValue="20" /></Field>
            <Field label="Ballore e T-shtyllës"><Input defaultValue="42" /></Field>
            <Field label="Ballore e adapterit"><Input defaultValue="32" /></Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- Metalet --------------------------------------------------------------
function MetalsTab() {
  const [selected, setSelected] = useState(metals[0].id);
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <Card className="divide-y divide-slate-200 overflow-hidden">
          {metals.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-l-2 px-4 py-3 text-left",
                selected === m.id ? "border-indigo-500 bg-indigo-50/40" : "border-transparent hover:bg-slate-200/40",
              )}
            >
              <span className="text-sm font-semibold text-slate-900">{m.name}</span>
              <span className="text-xs text-slate-400">{m.brand}</span>
            </button>
          ))}
        </Card>
        <Button variant="outline" className="mt-3 w-full"><Plus className="size-4" /> Shto Metal</Button>
      </div>
      <Card className="p-5">
        <Label>Çmimet e armimit (€/m)</Label>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="py-2 pr-3">Komponenti</th>
                <th className="py-2 pr-3">Kodi</th>
                <th className="py-2 text-right">€/m</th>
              </tr>
            </thead>
            <tbody>
              {armingRows.map((r) => (
                <tr key={r.code} className="border-t border-slate-200">
                  <td className="py-2 pr-3 font-semibold text-slate-700">{r.component}</td>
                  <td className="py-2 pr-3 text-slate-400">{r.code}</td>
                  <td className="py-2 text-right text-slate-700">{r.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- Mekanizmat -----------------------------------------------------------
function MechanismsTab() {
  const heights = [60, 80, 100, 140, 180, 200, 230];
  const widths = [40, 60, 80, 105, 130];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Matrica single — lartësi × gjerësi (cm) → €</Label>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[480px] text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs text-slate-400">H \ W</th>
                {widths.map((w) => (
                  <th key={w} className="p-2 text-right text-xs text-slate-400">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heights.map((h, ri) => (
                <tr key={h} className="border-t border-slate-200">
                  <td className="p-2 font-semibold text-slate-700">{h}</td>
                  {widths.map((w, ci) => (
                    <td key={w} className="p-2 text-right text-slate-500">
                      {(24 + ri * 6 + ci * 4).toFixed(0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <Label>Hardueri i rrëshqitëses (global)</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Set rrëshqitës (për krah lëvizës) €"><Input defaultValue="85" /></Field>
          <Field label="Shina lart/poshtë (€/m, 2 × gjerësia)"><Input defaultValue="9" /></Field>
        </div>
      </Card>
    </div>
  );
}

// --- Xhamat / Panelet (photo tables) --------------------------------------
function PhotoTable({
  title,
  addLabel,
  rows,
  showDesc,
  importExcel,
}: {
  title: string;
  addLabel: string;
  rows: typeof glass;
  showDesc?: boolean;
  importExcel?: boolean;
}) {
  const { toast } = useApp();
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          {title} ({rows.length})
        </span>
        <div className="flex gap-2">
          {importExcel && (
            <Button size="sm" variant="outline" onClick={() => toast("Importo Excel — demo lokale.")}>
              <FileSpreadsheet className="size-4" /> Importo Excel
            </Button>
          )}
          <Button size="sm" onClick={() => toast(`${addLabel} — demo lokale.`)}>
            <Plus className="size-4" /> {addLabel}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Emri</th>
              <th className="px-4 py-3">Brendi</th>
              {showDesc && <th className="px-4 py-3">Përshkrimi</th>}
              <th className="px-4 py-3 text-right">€/m²</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-slate-200/70 text-slate-400">
                    <ImageIcon className="size-4" />
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-500">{r.brand}</td>
                {showDesc && <td className="px-4 py-3 text-slate-500">{r.extra ?? "—"}</td>}
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {r.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GlassTab() {
  return <PhotoTable title="Llojet e xhamave" addLabel="Shto Xham" rows={glass} showDesc importExcel />;
}
function PanelsTab() {
  return <PhotoTable title="Panelet e dyerve" addLabel="Shto Panel" rows={panels} />;
}

// --- Shtesat --------------------------------------------------------------
function ExpansionsTab() {
  const { toast } = useApp();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Profilet zgjeruese / shtesat ({expansions.length})
        </span>
        <Button size="sm" onClick={() => toast("Shto Shtesë — demo lokale.")}>
          <Plus className="size-4" /> Shto Shtesë
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="px-4 py-3">Emri</th>
              <th className="px-4 py-3">Brendi</th>
              <th className="px-4 py-3 text-right">Gjerësia (mm)</th>
              <th className="px-4 py-3 text-right">€/m</th>
            </tr>
          </thead>
          <tbody>
            {expansions.map((e) => (
              <tr key={e.id} className="border-b border-slate-200 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{e.name}</td>
                <td className="px-4 py-3 text-slate-500">{e.brand}</td>
                <td className="px-4 py-3 text-right text-slate-700">{e.widthMm}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{e.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Aksesorët ------------------------------------------------------------
function AccessoriesTab() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Aksesorët e përbashkët</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dorezë (copë) — vetëm dritare"><Input defaultValue="4.50" /></Field>
          <Field label="Llajsne bardhë (€/m)"><Input defaultValue="0.80" /></Field>
          <Field label="Llajsne color (€/m)"><Input defaultValue="1.20" /></Field>
          <Field label="Lidhëse T-shtylle (copë)"><Input defaultValue="2.10" /></Field>
        </div>
      </Card>
      <Card className="p-5">
        <Label>Aksesorët e derës (banjo/ballkoni)</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pragu (copë)"><Input defaultValue="18.00" /></Field>
          <Field label="Doreza (copë)"><Input defaultValue="12.50" /></Field>
          <Field label="Bravë / mekanizmi i mbylljes (copë)"><Input defaultValue="22.00" /></Field>
          <Field label="Menteshat (për copë)"><Input defaultValue="3.40" /></Field>
        </div>
      </Card>
    </div>
  );
}

// --- Parametrat -----------------------------------------------------------
function ProductionTab() {
  const general = [
    ["Humbja e saldimit në çmim (%)", "3"],
    ["Humbja e prerjes ALU (%)", ""],
    ["Gjatësia e profilit (m)", "6.5"],
    ["Gjatësia e metalit (m)", "6"],
  ];
  const params = [
    ["Shtesa e saldimit për skaj (mm)", "3"],
    ["Trashësia e diskut të sharrës (mm)", "4"],
    ["Pastrim skajesh për shufër (mm)", "10"],
    ["Mbetja min. e shfrytëzueshme (mm)", "300"],
    ["Hapësira e xhamit për anë (mm)", "3"],
    ["Fytyra e dukshme e krahut (mm)", "77"],
    ["Tarifa e punës (€/h)", "12"],
    ["Minuta pune për element (min)", "25"],
    ["Shpenzimet e përgjithshme (%)", "8"],
  ];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Të përgjithshme</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {general.map(([l, v]) => (
            <Field key={l} label={l}><Input defaultValue={v} /></Field>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Label>Parametrat e prodhimit</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {params.map(([l, v]) => (
            <Field key={l} label={l}><Input defaultValue={v} /></Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Roletat --------------------------------------------------------------
function RoletaTab() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Versionet e roletës</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {roletaVersions.map((r) => (
            <Field key={r.id} label={`${r.name} — çmimi për m²`}>
              <Input defaultValue={r.pricePerM2.toFixed(2)} />
            </Field>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Label>Pjesët e roletës</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Motorr Roletë (për copë)"><Input defaultValue="65.00" /></Field>
          <Field label="Kutia e Roletës (€/m gjerësie)"><Input defaultValue="14.00" /></Field>
          <Field label="Shina Udhëzuese (€/m, 2×lartësia)"><Input defaultValue="6.00" /></Field>
        </div>
      </Card>
    </div>
  );
}

// --- Dyer të Hyrjes -------------------------------------------------------
function DoorsTab() {
  const [showPhoto, setShowPhoto] = useState(false);
  const { toast } = useApp();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Modelet e dyerve të hyrjes
        </span>
        <Button size="sm" onClick={() => toast("Shto Model — demo lokale.")}>
          <Plus className="size-4" /> Shto Model
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doorModels.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="mb-3 grid h-28 place-items-center rounded-xl bg-slate-200/60 text-slate-400">
              <ImageIcon className="size-6" />
            </div>
            <div className="text-sm font-semibold text-slate-900">{m.name}</div>
            <div className="mt-2 flex gap-2">
              <Badge tone={m.mode === "FIKS" ? "indigo" : "neutral"}>FIKS</Badge>
              <Badge tone={m.mode === "TABELË" ? "indigo" : "neutral"}>TABELË</Badge>
            </div>
            <div className="mt-3">
              <Label>Çmimi bazë</Label>
              <Input className="mt-1" defaultValue={eurAfter(m.basePrice)} />
            </div>
          </Card>
        ))}
      </div>
      <Card className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Shfaq foton e modelit në ofertë
          </div>
          <div className="text-xs text-slate-400">
            Te oferta finale shfaqet fotoja e modelit në vend të skicës teknike.
          </div>
        </div>
        <Toggle checked={showPhoto} onChange={setShowPhoto} label="Shfaq foton" />
      </Card>
    </div>
  );
}
