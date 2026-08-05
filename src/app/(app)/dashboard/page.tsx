"use client";

import Link from "next/link";
import {
  FileText,
  Wrench,
  Wallet,
  LayoutGrid,
  Bell,
  Clock,
  ArrowRight,
  Rocket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/kit";
import { FlowChart } from "@/components/dashboard/flow-chart";
import { useApp } from "@/components/providers/providers";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <span className={cn("mb-8 inline-grid size-11 place-items-center rounded-xl", tone)}>
        <Icon className="size-5" />
      </span>
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </div>
      <div className="mt-1 font-heading text-3xl font-bold text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-slate-400">{sub}</div>}
    </Card>
  );
}

function LockedStatCard() {
  return (
    <Card className="flex flex-col items-center justify-center p-5 text-center">
      <LayoutGrid className="mb-2 size-6 text-slate-400" />
      <div className="font-heading text-base font-semibold text-slate-700">
        Fitimi
      </div>
      <div className="text-sm text-slate-400">Përditëso në PRO</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { setOverlay } = useApp();

  return (
    <div className="space-y-6">
      {/* Onboarding banner */}
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-400">
            <Rocket className="size-7" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Konfigurimi i Proferto-s
              </h2>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-400">
                12/12 hapa
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Hapi i radhës:{" "}
              <span className="font-semibold text-slate-700">
                Siguria e llogarisë
              </span>{" "}
              — Në llogarinë tuaj rrinë çmimet, klientët dhe financat — një hap i
              dytë verifikimi ia vlen.
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-full bg-gradient-to-r from-violet-500 to-indigo-500" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setOverlay("config")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Vazhdo
            </button>
            <button
              onClick={() => setOverlay("config")}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/50"
            >
              Hapma faqen <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard icon={FileText} tone="bg-cyan-50 text-cyan-400" label="Ofertat këtë muaj" value="1" />
        <StatCard icon={Wrench} tone="bg-cyan-50 text-cyan-400" label="Punë në prodhim" value="1" sub="0 përfunduar" />
        <StatCard icon={Wallet} tone="bg-emerald-50 text-emerald-500" label="Të hyra (pranuar)" value="€398.25" />
        <LockedStatCard />
        <StatCard icon={FileText} tone="bg-blue-50 text-blue-400" label="Të pranuara" value="1" sub="€398.25" />
        <StatCard icon={Clock} tone="bg-amber-50 text-amber-500" label="Në pritje" value="0" sub="€0.00" />
        <StatCard icon={Users} tone="bg-rose-50 text-rose-400" label="Borxhi i klientëve" value="€0.00" sub="0 oferta" />
        <StatCard icon={Wallet} tone="bg-slate-200 text-slate-500" label="Shpenzime" value="€0.00" />
      </div>

      {/* Chart */}
      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">
          Rrjedha financiare (6 muajt e fundit)
        </h3>
        <FlowChart />
      </Card>

      {/* Two panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold text-slate-900">
            <Bell className="size-4 text-amber-500" /> Oferta për ndjekje
          </h3>
          <p className="py-8 text-center text-sm text-slate-400">
            Asnjë ofertë në ndjekje.
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold text-slate-900">
            <Clock className="size-4 text-rose-400" /> Borxhe të hapura
          </h3>
          <p className="py-8 text-center text-sm text-slate-400">
            Nuk ka borxhe të hapura.
          </p>
        </Card>
      </div>

      {/* Recent offers + CRM teaser */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">
            Ofertat e fundit
          </h3>
          <Link
            href="/projects/9534f079-0572-4339-93d1-f9f0693ef26e/configure"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-200/40"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">test</div>
              <div className="text-xs text-slate-400">
                OFERTA-2024001 · 8/2/2026
              </div>
            </div>
            <div className="font-heading font-semibold text-slate-900">
              €398.25
            </div>
          </Link>
        </Card>
        <Card className="flex flex-col items-start justify-center gap-2 p-5 sm:p-6">
          <h3 className="font-heading text-base font-semibold text-slate-900">
            CRM & Klientët
          </h3>
          <p className="text-sm text-slate-400">
            Kaloni në PRO për menaxhim klientësh.
          </p>
        </Card>
      </div>
    </div>
  );
}
