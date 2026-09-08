"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Palette, Users, CreditCard, Download, ChevronRight,
  ArrowLeft, ImageIcon, Check, RotateCcw, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, Badge, Field, Input, Label } from "@/components/ui/kit";
import { useStore } from "@/lib/store";
import { sampleOffer } from "@/lib/mock/data";
import { STANDARD_FEATURES, STANDARD_PLAN_NAME, offerDesigns } from "@/lib/plan";
import { eurAfter } from "@/lib/format";
import { useApp } from "@/components/providers/providers";
import { useAuth } from "@/components/providers/session-provider";
import { authClient } from "@/auth/client";
import { updateOrganizationProfile } from "@/server/actions/organization-profile.action";
import type { OrganizationProfileUpdate } from "@/domain/validation/organization-profile";
import { cn } from "@/lib/utils";
import type { CompanyProfile } from "@/domain/types";

type PanelId = "profili" | "dizajni" | "perdoruesit" | "abonimi" | "backup";

const MENU: { id: PanelId; label: string; icon: LucideIcon }[] = [
  { id: "profili", label: "Profili i Kompanisë", icon: Building2 },
  { id: "dizajni", label: "Dizajni i Ofertës", icon: Palette },
  { id: "perdoruesit", label: "Përdoruesit", icon: Users },
  { id: "abonimi", label: "Abonimi", icon: CreditCard },
  { id: "backup", label: "Backup & Eksport", icon: Download },
];
const clampInt = (value: string, min: number, max: number) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export default function SettingsPage() {
  const [active, setActive] = useState<PanelId>("profili");
  const [mobileView, setMobileView] = useState<"menu" | "panel">("menu");
  const activeItem = MENU.find((m) => m.id === active)!;

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-slate-900">Cilësimet</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className={cn("h-fit overflow-hidden p-2", mobileView === "panel" && "hidden lg:block")}>
          <div className="px-3 py-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Kompania</div>
          <ul className="space-y-1">
            {MENU.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.id}>
                  <button onClick={() => { setActive(m.id); setMobileView("panel"); }}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active === m.id ? "bg-slate-200/70 text-slate-900" : "text-slate-500 hover:bg-slate-200/40 hover:text-slate-900")}>
                    <Icon className="size-4" />
                    <span className="flex-1 text-left">{m.label}</span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className={cn(mobileView === "menu" && "hidden lg:block")}>
          <button onClick={() => setMobileView("menu")} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 lg:hidden">
            <ArrowLeft className="size-4" /> Kthehu te Cilësimet
          </button>
          <div className="mb-4 flex items-center gap-3">
            <activeItem.icon className="size-6 text-slate-900" />
            <h2 className="font-heading text-xl font-bold text-slate-900">{activeItem.label}</h2>
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
  const router = useRouter();
  const { activeOrg, role } = useAuth();
  const canEdit = role === "owner" || role === "admin";
  const company = useStore((s) => s.company);
  const [draft, setDraft] = useState<CompanyProfile>(company);
  const [saving, setSaving] = useState(false);

  // Re-sync the editable draft whenever the server-hydrated mirror changes
  // (initial hydration, org switch, or after a save + router.refresh()).
  useEffect(() => { setDraft(company); }, [company]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(company);
  const set = (k: keyof CompanyProfile, v: string | number) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      // The company name (Better Auth) and the business/profile fields
      // (organization_profiles) live in two different stores and cannot be
      // written in a single transaction. To avoid a half-saved state that still
      // reports success, do the VALIDATION-PRONE profile write FIRST: if it is
      // rejected, nothing has been persisted yet and we can abort cleanly.
      const payload: OrganizationProfileUpdate = {
        nui: draft.nui, vatNo: draft.vatNo, address: draft.address, city: draft.city,
        postalCode: draft.postalCode, phone: draft.phone, businessEmail: draft.email.trim(),
        bank: draft.bank, swift: draft.swift, iban: draft.iban,
        marginDefault: draft.marginDefault, vatDefault: draft.vatDefault,
      };
      const result = await updateOrganizationProfile(payload);
      if (!result.ok) {
        toast(result.error.fieldErrors?.businessEmail?.[0] ?? result.error.message);
        return; // nothing persisted — safe to abort
      }

      // Org NAME is canonical in Better Auth — update it there, only if changed.
      // The profile is already saved at this point, so a failure here is a real
      // PARTIAL save: report it honestly (never claim full success) and refresh
      // so the mirror reflects what actually persisted.
      const nextName = draft.name.trim();
      if (nextName && nextName !== company.name) {
        const res = await authClient.organization.update({
          data: { name: nextName },
          organizationId: activeOrg.id,
        });
        if (res.error) {
          toast(res.error.message ?? "Të dhënat u ruajtën, por emri i kompanisë nuk u ruajt — provoni sërish.");
          router.refresh();
          return;
        }
      }
      toast("Ndryshimet u ruajtën.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Lock className="mt-0.5 size-4 shrink-0" />
          Vetëm pronari ose administratori mund të ndryshojnë profilin e kompanisë. Ju mund ta shihni por jo ta ndryshoni.
        </div>
      )}

      <Card className="p-5">
        <Label>Logo</Label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="grid size-24 place-items-center overflow-hidden rounded-xl bg-slate-200/70 text-slate-400">
            <ImageIcon className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">Logo e Kompanisë</div>
              <Badge tone="amber">Së shpejti</Badge>
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              Ngarkimi i logos kërkon ruajtje të skedarëve (object storage) dhe do të aktivizohet së bashku me modulin e Dokumenteve.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Emri i kompanisë"><Input value={draft.name} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Adresa"><Input value={draft.address} onChange={(e) => set("address", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Telefoni"><Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Email zyrtar"><Input value={draft.email} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Marzha default (%)"><Input value={String(draft.marginDefault)} onChange={(e) => set("marginDefault", clampInt(e.target.value, 0, 100))} inputMode="numeric" min={0} max={100} disabled={!canEdit} /></Field>
          <Field label="TVSH default (%)"><Input value={String(draft.vatDefault)} onChange={(e) => set("vatDefault", clampInt(e.target.value, 0, 100))} inputMode="numeric" min={0} max={100} disabled={!canEdit} /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <Label>Të dhënat e faturimit</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NUI / Numri i biznesit"><Input value={draft.nui} onChange={(e) => set("nui", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Numri i TVSH-së"><Input value={draft.vatNo} onChange={(e) => set("vatNo", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Kodi postar"><Input value={draft.postalCode} onChange={(e) => set("postalCode", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Qyteti"><Input value={draft.city} onChange={(e) => set("city", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Banka"><Input value={draft.bank} onChange={(e) => set("bank", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="SWIFT / BIC"><Input value={draft.swift} onChange={(e) => set("swift", e.target.value)} disabled={!canEdit} /></Field>
          <div className="sm:col-span-2"><Field label="IBAN / Llogaria bankare"><Input value={draft.iban} onChange={(e) => set("iban", e.target.value)} disabled={!canEdit} /></Field></div>
        </div>
      </Card>

      {canEdit && (
        <div className="flex items-center justify-end gap-2">
          {dirty && <button onClick={() => setDraft(company)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-700"><RotateCcw className="size-4" /> Rikthe</button>}
          <Button disabled={!dirty || saving} onClick={save}>{saving ? "Duke ruajtur…" : "Ruaj Ndryshimet"}</Button>
        </div>
      )}
    </div>
  );
}

function DizajniPanel() {
  const { toast } = useApp();
  const company = useStore((s) => s.company);
  const selectedId = useStore((s) => s.selectedDesignId);
  const setDesign = useStore((s) => s.setDesign);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">Kornizo Standard përdor dizajnin aktual të ofertës. Klikoni dizajnin për ta zgjedhur si preferencë lokale.</p>
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Palette className="mt-0.5 size-4 shrink-0" />
        <span>Ofertat e gjeneruara aktualisht përdorin dizajnin standard <strong>“Klasik”</strong>. Dizajne shtesë mund të shtohen më vonë vetëm kur ato të zbatohen realisht në PDF.</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerDesigns.map((d) => {
          const isActive = selectedId === d.id;
          return (
            <Card key={d.id} className={cn("overflow-hidden p-3", isActive && "ring-2 ring-neutral-500")}>
              <div className="relative mb-3 aspect-[1/1.414] overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-[6px] leading-tight text-slate-700">
                <div className="mb-1 font-bold text-neutral-700">{company.name}</div>
                <div className="mb-2 text-[7px] font-bold">OFERTË {sampleOffer.number}</div>
                <div className="space-y-0.5">
                  {[1, 2, 3, 4].map((r) => (
                    <div key={r} className="flex justify-between border-b border-slate-100 pb-0.5"><span>Pozicioni {r}</span><span>€{(r * 111).toFixed(0)}</span></div>
                  ))}
                </div>
                <div className="absolute right-2 bottom-2 text-[7px] font-bold">TOTALI {eurAfter(sampleOffer.total)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                  <Badge tone="emerald">{STANDARD_PLAN_NAME}</Badge>
                </div>
                {isActive ? (
                  <Badge tone="emerald"><Check className="size-3" /> AKTIV</Badge>
                ) : (
                  <Button size="sm" variant="outline"
                    onClick={() => { setDesign(d.id); toast(`“${d.name}” u zgjodh.`); }}>
                    Zgjidh
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface OrgMember {
  id: string;
  role: string;
  userId: string;
  user: { name: string; email: string };
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Pronar",
  admin: "Administrator",
  sales: "Shitje",
  operator: "Operator",
  accounting: "Kontabilitet",
  member: "Anëtar",
};

function PerdoruesitPanel() {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await authClient.organization.listMembers();
      if (alive && !res.error && res.data) {
        setMembers((res.data.members ?? []) as unknown as OrgMember[]);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Card className="p-5">
      <div className="mb-1 font-heading font-semibold text-slate-900">Anëtarët e organizatës</div>
      <div className="mb-3 text-sm text-slate-400">{members.length} anëtar{members.length === 1 ? "" : "ë"}</div>
      <p className="mb-4 text-xs text-slate-400">
        Kjo listë vjen nga identiteti i vërtetë (Better Auth). Ftimi i anëtarëve të rinj do të aktivizohet kur të konfigurohet dërgimi i email-eve.
      </p>
      {loading ? (
        <p className="text-sm text-slate-400">Duke ngarkuar anëtarët…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase"><th className="py-3 pr-4">Emri</th><th className="py-3 pr-4">Email</th><th className="py-3">Roli</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-200">
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-2">{m.user.name}{m.userId === user.id && <Badge tone="emerald">Ju</Badge>}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{m.user.email}</td>
                  <td className="py-3"><Badge tone="indigo">{ROLE_LABELS[m.role] ?? m.role}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AbonimiPanel() {
  const { effectiveCommercialAccess, trialDaysRemaining, trialEndsAt } = useAuth();
  const accessText =
    effectiveCommercialAccess === "trial"
      ? `Trial · ${trialDaysRemaining} ditë të mbetura`
      : "Klient aktiv";

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="violet">PLANI AKTUAL</Badge>
            <div className="mt-2 font-heading text-2xl font-bold text-slate-900">{STANDARD_PLAN_NAME}</div>
            <div className="text-sm text-slate-400">Rrjedha e plotë aktuale për kompanitë e dritareve dhe dyerve.</div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div className="font-semibold text-slate-900">{accessText}</div>
            {effectiveCommercialAccess === "trial" && (
              <div>Skadon më {trialEndsAt ? trialEndsAt.toISOString().slice(0, 10) : "—"}</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-heading font-semibold text-slate-900">Përfshirë në Standard</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {STANDARD_FEATURES.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm text-slate-500">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400">
        Menaxhimi i pagesave dhe faturimi automatik nuk janë aktivizuar ende. Për vazhdim të trial, aktivizim klienti ose çdo pyetje për llogarinë, na shkruani te info@arios.systems.
      </p>
      <p className="text-xs text-slate-400">
        Kornizo po rritet. Plane shtesë dhe mjete të avancuara për madhësi e rrjedha të ndryshme kompanish do të prezantohen me kohë.
      </p>
    </div>
  );
}

function BackupPanel() {
  const { toast } = useApp();
  const exportData = useStore((s) => s.exportData);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const doExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kornizo-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastExport(new Date().toLocaleString("sq"));
    toast("Eksporti u shkarkua.");
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="font-heading font-semibold text-slate-900">Eksporto të dhënat</div>
        <p className="mt-1 mb-4 max-w-lg text-sm text-slate-400">
          Shkarkoni një kopje (snapshot) të të dhënave aktuale të organizatës suaj — klientët, projektet, faturat, pagesat, shënimet dhe çmimet — në një skedar JSON.
        </p>
        <Button onClick={doExport}><Download className="size-4" /> Shkarko eksportin (JSON)</Button>
        {lastExport && <p className="mt-2 text-xs text-slate-400">Eksporti i fundit: {lastExport}</p>}
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <div className="font-heading font-semibold text-slate-900">Rikthimi &amp; kopjet rezervë</div>
          <Badge tone="amber">Automatik</Badge>
        </div>
        <p className="mt-1 max-w-lg text-sm text-slate-400">
          Të dhënat tuaja ruhen në mënyrë të sigurt në bazën e të dhënave (PostgreSQL), me kopje rezervë automatike në nivel infrastrukture. Eksporti JSON më lart është një kopje për arkivin tuaj, jo një pikë rikthimi — nuk ka ngarkim/restore manual që mund të mbishkruajë të dhënat e serverit.
        </p>
      </Card>
    </div>
  );
}
