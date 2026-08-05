"use client";

import { useState } from "react";
import {
  Building2,
  Palette,
  Users,
  CreditCard,
  Download,
  Upload,
  ChevronRight,
  ArrowLeft,
  ImageIcon,
  Check,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, Badge, Field, Input, Label, Toggle } from "@/components/ui/kit";
import { company, currentUser, sampleOffer } from "@/lib/mock/data";
import { plans, offerDesigns } from "@/lib/plan";
import { eurAfter } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";

type PanelId = "profili" | "dizajni" | "perdoruesit" | "abonimi" | "backup";

const MENU: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: "profili", label: "Profili i Kompanisë", icon: Building2 },
  { id: "dizajni", label: "Dizajni i Ofertës", icon: Palette },
  { id: "perdoruesit", label: "Përdoruesit", icon: Users },
  { id: "abonimi", label: "Abonimi", icon: CreditCard },
  { id: "backup", label: "Backup & Eksport", icon: Download },
];

export default function SettingsPage() {
  const [active, setActive] = useState<PanelId>("profili");
  const [mobileView, setMobileView] = useState<"menu" | "panel">("menu");

  const activeItem = MENU.find((m) => m.id === active)!;

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-slate-900">
        Cilësimet
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Secondary sidebar (desktop) / menu (mobile) */}
        <Card
          className={cn(
            "h-fit overflow-hidden p-2",
            mobileView === "panel" && "hidden lg:block",
          )}
        >
          <div className="px-3 py-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            Kompania
          </div>
          <ul className="space-y-1">
            {MENU.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      setActive(m.id);
                      setMobileView("panel");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active === m.id
                        ? "bg-slate-200/70 text-slate-900"
                        : "text-slate-500 hover:bg-slate-200/40 hover:text-slate-900",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="flex-1 text-left">{m.label}</span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Panel */}
        <div className={cn(mobileView === "menu" && "hidden lg:block")}>
          <button
            onClick={() => setMobileView("menu")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 lg:hidden"
          >
            <ArrowLeft className="size-4" /> Kthehu te Cilësimet
          </button>
          <div className="mb-4 flex items-center gap-3">
            <activeItem.icon className="size-6 text-indigo-400" />
            <h2 className="font-heading text-xl font-bold text-slate-900">
              {activeItem.label}
            </h2>
          </div>

          {active === "profili" && <ProfiliPanel />}
          {active === "dizajni" && <DizajniPanel />}
          {active === "perdoruesit" && <PerdoruesitPanel />}
          {active === "abonimi" && <AbonimiPanel />}
          {active === "backup" && <BackupPanel />}
        </div>
      </div>
    </div>
  );
}

function ProfiliPanel() {
  const { toast } = useApp();
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Label>Logo</Label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="grid size-24 place-items-center rounded-xl bg-slate-200/70 text-slate-400">
            <ImageIcon className="size-8" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Logo e Kompanisë
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              Kjo logo do të shfaqet në të gjitha ofertat dhe dokumentet zyrtare.
            </p>
            <button
              onClick={() => toast("Logo u fshi (demo lokale).")}
              className="mt-1 text-xs font-bold text-rose-400 uppercase hover:underline"
            >
              Fshij logon
            </button>
          </div>
        </div>
        <div className="mt-5">
          <Label>Logot e profileve / sistemeve</Label>
          <p className="mt-1 mb-3 max-w-lg text-sm text-slate-400">
            Deri në 3 logo opsionale (PNG transparent ose SVG) të markave që
            përdorni.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="grid aspect-video place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-400"
              >
                LOGO {n}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Emri i kompanisë"><Input defaultValue={company.name} /></Field>
          <Field label="Adresa"><Input defaultValue={company.address} /></Field>
          <Field label="Telefoni"><Input defaultValue={company.phone} /></Field>
          <Field label="Email zyrtar"><Input defaultValue={company.email} /></Field>
          <Field label="Marzha default (%)"><Input defaultValue={String(company.marginDefault)} /></Field>
          <Field label="TVSH default (%)"><Input defaultValue={String(company.vatDefault)} /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <Label>Të dhënat e faturimit</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NUI / Numri i biznesit"><Input defaultValue={company.nui} /></Field>
          <Field label="Numri i TVSH-së"><Input defaultValue={company.vatNo} /></Field>
          <Field label="Kodi postar"><Input defaultValue={company.postalCode} /></Field>
          <Field label="Qyteti"><Input defaultValue={company.city} /></Field>
          <Field label="Banka"><Input defaultValue={company.bank} /></Field>
          <Field label="SWIFT / BIC"><Input defaultValue={company.swift} /></Field>
          <div className="sm:col-span-2">
            <Field label="IBAN / Llogaria bankare"><Input defaultValue={company.iban} /></Field>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast("Ndryshimet u ruajtën (demo lokale).")}>
          Ruaj Ndryshimet
        </Button>
      </div>
    </div>
  );
}

function DizajniPanel() {
  const { toast } = useApp();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Plani juaj (SOLO) ju lejon të zgjidhni nga 1 dizajn nga gjithsej 6.
        Klikoni një dizajn për ta parë në madhësi të plotë (A4) dhe për ta
        zgjedhur.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerDesigns.map((d) => (
          <Card key={d.id} className="overflow-hidden p-3">
            <div className="relative mb-3 aspect-[1/1.414] overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-[6px] leading-tight text-slate-700">
              <div className="mb-1 font-bold text-indigo-600">{company.name}</div>
              <div className="mb-2 text-[7px] font-bold">OFERTË {sampleOffer.number}</div>
              <div className="space-y-0.5">
                {[1, 2, 3, 4].map((r) => (
                  <div key={r} className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span>Pozicioni {r}</span>
                    <span>€{(r * 111).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="absolute right-2 bottom-2 text-[7px] font-bold">
                TOTALI {eurAfter(sampleOffer.total)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                <Badge tone={d.plan === "SOLO" ? "emerald" : d.plan === "BIZNES" ? "blue" : "violet"}>
                  {d.plan}
                </Badge>
              </div>
              {d.active ? (
                <Badge tone="emerald">
                  <Check className="size-3" /> AKTIV
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast(
                      d.plan === "SOLO"
                        ? `“${d.name}” u zgjodh (demo lokale).`
                        : `“${d.name}” kërkon planin ${d.plan}.`,
                    )
                  }
                >
                  Shiko
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <Label>Tekstet e Ofertës</Label>
        <div className="mt-4 space-y-4">
          <Field label="Kushtet & vlefshmëria (teksti i fundit)">
            <textarea
              defaultValue="Çmimet janë në Euro (€). Matjet finale verifikohen para prodhimit. Garancia: 5 vjet për profilet, 2 vjet për mekanizmat."
              className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </Field>
          <Field label="Mesazhi i falenderimit">
            <Input defaultValue="Faleminderit për besimin tuaj. Mbetemi në dispozicion për çdo paqartësi." />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">
              Shfaq të dhënat e pagesës në ofertë
            </span>
            <Toggle checked onChange={() => {}} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => toast("Tekstet u ruajtën (demo lokale).")}>
            Ruaj tekstet
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PerdoruesitPanel() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-heading font-semibold text-slate-900">
            Përdoruesit e kompanisë
          </div>
          <div className="text-sm text-slate-400">1 / 1 ulëse · Plani SOLO</div>
        </div>
        <Button disabled>Shto Përdorues</Button>
      </div>
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-500">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        Keni arritur limitin e përdoruesve për planin tuaj (Plani SOLO: 1).
        Përmirësoni planin ose rritni limitin.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="py-3 pr-4">Emri</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3">Roli</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-3 pr-4 font-semibold text-slate-900">{currentUser.name}</td>
              <td className="py-3 pr-4 text-slate-500">{currentUser.email}</td>
              <td className="py-3">
                <Badge tone="indigo">{currentUser.role}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AbonimiPanel() {
  const { toast } = useApp();
  const [yearly, setYearly] = useState(false);
  const steps = ["Plani", "Faturimi", "Pagesa", "Konfirmimi"];
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="violet">PROVË</Badge>
            <div className="mt-2 font-heading text-2xl font-bold text-slate-900">
              SOLO
            </div>
            <div className="text-sm text-slate-400">
              Për zejtarë dhe instalues të pavarur
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Prova mbaron më {company.trialEndsAt} — edhe {company.trialDaysLeft} ditë
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                i === 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-sm", i === 0 ? "font-semibold text-slate-900" : "text-slate-400")}>
              {s}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="font-heading font-semibold text-slate-900">Zgjidhni planin</div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 p-1 text-sm font-semibold">
          <button
            onClick={() => setYearly(false)}
            className={cn("rounded-lg px-3 py-1.5", !yearly ? "bg-slate-50 text-slate-900" : "text-slate-400")}
          >
            Mujor
          </button>
          <button
            onClick={() => setYearly(true)}
            className={cn("rounded-lg px-3 py-1.5", yearly ? "bg-slate-50 text-slate-900" : "text-slate-400")}
          >
            Vjetor −17%
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.tier} className={cn("p-5", p.current && "ring-2 ring-indigo-500")}>
            <div className="flex items-center justify-between">
              <div className="font-heading font-bold text-slate-900">{p.name}</div>
              {p.current && <Badge tone="indigo">AKTUAL</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-400">{p.tagline}</p>
            <div className="mt-4 font-heading text-2xl font-bold text-slate-900">
              €{p.monthly.toFixed(2)}
              <span className="text-sm font-normal text-slate-400">/muaj</span>
            </div>
            <div className="text-xs text-slate-400">€{p.yearly} në vit</div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast("Vazhdim i abonimit — demo lokale.")}>Vazhdo</Button>
      </div>
      <p className="text-xs text-slate-400">
        Për ndryshim plani, anulim ose çdo pyetje për faturimin, na shkruani te
        info@arios.systems.
      </p>
    </div>
  );
}

function BackupPanel() {
  const { toast } = useApp();
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="font-heading font-semibold text-slate-900">
          Backup i të Dhënave
        </div>
        <p className="mt-1 mb-4 max-w-lg text-sm text-slate-400">
          Shkarkoni të gjitha të dhënat tuaja (përdoruesit, klientët, ofertat,
          çmimet) në një skedar JSON.
        </p>
        <Button onClick={() => toast("Backup u shkarkua (demo lokale).")}>
          <Download className="size-4" /> Shkarko Backup
        </Button>
      </Card>
      <Card className="p-5">
        <div className="font-heading font-semibold text-slate-900">
          Rikthimi i të Dhënave (Restore)
        </div>
        <p className="mt-1 mb-4 max-w-lg text-sm text-slate-400">
          Ngarkoni skedarin e backup-it për të rikthyer të dhënat tuaja.
        </p>
        <Button variant="outline" onClick={() => toast("Ngarkim backup-i — demo lokale.")}>
          <Upload className="size-4" /> Ngarko Backup
        </Button>
      </Card>
    </div>
  );
}
