"use client";

import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  Monitor,
  CheckCircle2,
  XCircle,
  LockKeyhole,
} from "lucide-react";
import { PageHeader, Button, Badge, SectionCard } from "@/components/ui/kit";
import { devices, loginHistory } from "@/lib/mock/data";
import { useApp } from "@/components/providers/providers";

export default function SecurityPage() {
  const { toast } = useApp();

  return (
    <div>
      <PageHeader
        title="Siguria"
        subtitle="Kush kyçet, nga cilat pajisje, dhe çdo qasje e support-it — transparencë e plotë."
      />

      <div className="space-y-5">
        {/* Support access */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-indigo-400" /> Qasja e support-it
            </span>
          }
        >
          <p className="mb-4 text-sm text-slate-400">
            Të dhënat tuaja i sheh vetëm kompania juaj. Stafi i Proferto-s i
            qaset VETËM brenda një dritareje të përkohshme që e hapni ju.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">
              E mbyllur — të dhënat i shihni vetëm ju
            </span>
            <Button variant="outline" onClick={() => toast("Qasja u hap për 24 orë (demo lokale).")}>
              Hape për 24 orë
            </Button>
          </div>
        </SectionCard>

        {/* 2FA */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Smartphone className="size-5 text-indigo-400" /> Verifikimi në dy hapa (2FA)
            </span>
          }
          action={<Badge tone="amber">Joaktiv</Badge>}
        >
          <p className="mb-4 text-sm text-slate-400">
            Një kod 6-shifror nga aplikacioni Authenticator kërkohet në çdo
            kyçje — edhe nëse dikush e di fjalëkalimin, s&apos;hyn dot pa
            telefonin tuaj.
          </p>
          <Button onClick={() => toast("Aktivizimi i 2FA — demo lokale.")}>
            Aktivizo 2FA
          </Button>
        </SectionCard>

        {/* Password */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <KeyRound className="size-5 text-indigo-400" /> Fjalëkalimi
            </span>
          }
        >
          <p className="mb-4 text-sm text-slate-400">
            Ndryshoni fjalëkalimin tuaj rregullisht për siguri.
          </p>
          <Button variant="outline" onClick={() => toast("Ndryshimi i fjalëkalimit — demo lokale.")}>
            Ndrysho fjalëkalimin
          </Button>
        </SectionCard>

        {/* Devices */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Monitor className="size-5 text-indigo-400" /> Pajisjet e kyçura ({devices.length})
            </span>
          }
          action={
            <Button variant="danger" size="sm" onClick={() => toast("Dolët nga të gjitha pajisjet e tjera (demo lokale).")}>
              Dil nga të gjitha të tjerat
            </Button>
          }
        >
          <ul className="space-y-3">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {d.owner}
                    {d.current && <Badge tone="emerald">Kjo pajisje</Badge>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {d.browser} · {d.os} · {d.ip}
                  </div>
                  <div className="text-xs text-slate-400">
                    aktive: {d.lastActive} · kyçur: {d.loggedInAt}
                  </div>
                </div>
                {!d.current && (
                  <Button size="sm" variant="ghost" onClick={() => toast("Dolët nga pajisja (demo lokale).")}>
                    Dil
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Login history */}
        <SectionCard title="Historiku i kyçjeve">
          <ul className="space-y-2">
            {loginHistory.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                {e.kind === "success" ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="size-5 shrink-0 text-rose-400" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {e.kind === "success" ? "Kyçje e suksesshme" : "Kyçje e dështuar"} — {e.who}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {e.device} · {e.ip} · {e.at}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Transparency */}
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-500" /> Transparenca e support-it
            </span>
          }
        >
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-500">
            <CheckCircle2 className="size-4" />
            Asnjë qasje e support-it deri më sot — të dhënat tuaja i shihni vetëm ju.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
