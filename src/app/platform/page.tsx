// Platform dashboard (Checkpoint C) — restrained, high-level operational metrics.
// Every number is a cheap aggregate over non-RLS tables; no customer business
// content is read here. Authorization is enforced by the platform layout gate.

import Link from "next/link";
import { getPlatformOverview } from "@/server/platform/organizations";
import { getAcquisitionOverview } from "@/server/acquisition";
import { PLAN_TIERS } from "@/lib/plan";
import { CommercialAccessBadge, Metric, PanelCard, PlanBadge, StatusBadge } from "./ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PlatformDashboardPage() {
  const [o, acquisition] = await Promise.all([getPlatformOverview(), getAcquisitionOverview()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Përmbledhje</h1>
        <p className="mt-1 text-sm text-slate-400">Gjendja operacionale e platformës Kornizo.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Organizata" value={o.totalOrganizations} />
        <Metric label="Trial aktiv" value={o.activeTrials} tone="emerald" />
        <Metric label="Skadon së shpejti" value={o.trialsExpiringSoon} tone={o.trialsExpiringSoon ? "amber" : "default"} />
        <Metric label="Trial skaduar" value={o.trialExpired} tone={o.trialExpired ? "amber" : "default"} />
        <Metric label="Klientë aktivë" value={o.activeCustomers} tone="emerald" />
        <Metric label="Llogari aktive" value={o.activeAccounts} />
        <Metric label="Pezulluar" value={o.suspendedOrganizations} tone={o.suspendedOrganizations ? "amber" : "default"} />
        <Metric label="Përdorues" value={o.totalUsers} />
        <Metric label="Trial aplikime" value={acquisition.pendingTrialApplications} tone={acquisition.pendingTrialApplications ? "amber" : "default"} />
        <Metric label="Demo të reja" value={acquisition.newDemoRequests} tone={acquisition.newDemoRequests ? "amber" : "default"} />
      </div>

      <PanelCard
        title="Plani i produktit"
        action={
          <Link href="/platform/organizations" className="text-sm text-violet-500 hover:text-violet-600">
            Shiko organizatat →
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {PLAN_TIERS.map((tier) => (
            <div key={tier} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <PlanBadge plan={tier} />
              <div className="mt-2 font-heading text-2xl font-semibold text-slate-900">{o.planDistribution[tier]}</div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        title="Organizatat e fundit"
        action={
          <Link href="/platform/organizations?sort=created_desc" className="text-sm text-violet-500 hover:text-violet-600">
            Të gjitha →
          </Link>
        }
      >
        {o.recentOrganizations.length === 0 ? (
          <p className="py-4 text-sm text-slate-400">Ende asnjë organizatë.</p>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {o.recentOrganizations.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/platform/organizations/${org.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:text-violet-600"
                >
                  <span className="min-w-0 truncate font-medium text-slate-900">{org.name}</span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                    <PlanBadge plan={org.plan} />
                    <CommercialAccessBadge access={org.effectiveCommercialAccess} />
                    <StatusBadge status={org.status} />
                    <span className="w-20 text-right text-xs text-slate-400">{fmtDate(org.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <p className="text-xs text-slate-400">
        Numërat e përmbajtjes së tenantëve (klientë, oferta, fatura) shfaqen për çdo
        organizatë veç e veç në faqen e detajeve — jo si agregate globale.
      </p>
    </div>
  );
}
