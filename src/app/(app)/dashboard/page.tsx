"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FileText, Wrench, Wallet, Bell, Clock, Rocket, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/kit";
import { FlowChart } from "@/components/dashboard/flow-chart";
import { useApp } from "@/components/providers/providers";
import { isUiDismissed, useStore } from "@/lib/store";
import { dashboardStats, projectTotal } from "@/lib/selectors";
import { guideStepKeys } from "@/lib/plan";
import { eur, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, tone, label, value, sub }: { icon: LucideIcon; tone: string; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <span className={cn("mb-8 inline-grid size-11 place-items-center rounded-xl", tone)}><Icon className="size-5" /></span>
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="mt-1 font-heading text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-400">{sub}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const { setOverlay } = useApp();
  const projects = useStore((s) => s.projects);
  const payments = useStore((s) => s.payments);
  const clients = useStore((s) => s.clients);
  const guideDone = useStore((s) => s.guideDone);
  const uiDismissals = useStore((s) => s.uiDismissals);
  const dismissUi = useStore((s) => s.dismissUi);

  const stats = useMemo(() => dashboardStats(projects, payments, clients), [projects, payments, clients]);
  const recent = useMemo(
    () => [...projects].filter((p) => !p.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    [projects],
  );
  const doneCount = guideStepKeys.filter((k) => guideDone[k]).length;
  const total = guideStepKeys.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const configPromptHidden = doneCount === total || isUiDismissed(uiDismissals.configGuide);

  return (
    <div className="space-y-6">
      {/* Onboarding banner */}
      {!configPromptHidden && (
        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-400"><Rocket className="size-7" /></span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-lg font-bold text-slate-900">Konfigurimi i Kornizo-s</h2>
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-400">{doneCount}/{total} hapa</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Hapi i radhës: <span className="font-semibold text-slate-700">Siguria e llogarisë</span> — një hap i dytë verifikimi ia vlen.
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button onClick={() => setOverlay("config")} className="rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-400">Vazhdo</button>
              <button onClick={() => dismissUi("configGuide", "tomorrow")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/50">Deri nesër</button>
              <button onClick={() => dismissUi("configGuide", "forever")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-slate-900">Mos e shfaq më</button>
            </div>
          </div>
        </Card>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard icon={FileText} tone="bg-cyan-50 text-cyan-400" label="Ofertat këtë muaj" value={String(stats.offersThisMonth)} />
        <StatCard icon={Wrench} tone="bg-sky-50 text-sky-400" label="Punë në prodhim" value={String(stats.jobsInProduction)} sub={`${stats.jobsCompleted} përfunduar`} />
        <StatCard icon={Wallet} tone="bg-emerald-50 text-emerald-500" label="Të hyra (pranuar)" value={eur(stats.revenue)} />
        <StatCard icon={FileText} tone="bg-violet-50 text-violet-400" label="Të pranuara" value={String(stats.jobsInProduction)} sub={eur(stats.revenue)} />
        <StatCard icon={Clock} tone="bg-amber-50 text-amber-500" label="Në pritje" value={String(stats.pendingCount)} sub={eur(stats.pending)} />
        <StatCard icon={Users} tone="bg-rose-50 text-rose-400" label="Borxhi i klientëve" value={eur(stats.clientDebt)} />
        <StatCard icon={Wallet} tone="bg-slate-200 text-slate-700" label="Të pranuara (pagesa)" value={eur(stats.received)} sub={`${stats.receivedCount} pagesa`} />
      </div>

      {/* Chart */}
      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">Rrjedha financiare (6 muajt e fundit)</h3>
        <FlowChart />
      </Card>

      {/* Two panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold text-slate-900"><Bell className="size-4 text-amber-500" /> Oferta për ndjekje</h3>
          <p className="py-8 text-center text-sm text-slate-400">Asnjë ofertë në ndjekje.</p>
        </Card>
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold text-slate-900"><Clock className="size-4 text-rose-400" /> Borxhe të hapura</h3>
          {stats.clientDebt > 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{eur(stats.clientDebt)} borxh i papaguar nga klientët.</p>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Nuk ka borxhe të hapura.</p>
          )}
        </Card>
      </div>

      {/* Recent offers */}
      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">Ofertat e fundit</h3>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Asnjë ofertë.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}/configure`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-200/40">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                    <div className="text-xs text-slate-400">{p.number} · {shortDate(p.createdAt)}</div>
                  </div>
                  <div className="font-heading font-semibold text-slate-900">{eur(projectTotal(p))}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
