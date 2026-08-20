// Platform dashboard (Checkpoint C) — restrained, high-level operational metrics.
// Every number is a cheap aggregate over non-RLS tables; no customer business
// content is read here. Authorization is enforced by the platform layout gate.

import Link from "next/link";
import { getPlatformOverview } from "@/server/platform/organizations";
import { PLAN_TIERS } from "@/lib/plan";
import { Metric, PanelCard, PlanBadge, StatusBadge } from "./ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function PlatformDashboardPage() {
  const o = await getPlatformOverview();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Përmbledhje</h1>
        <p className="mt-1 text-sm text-slate-400">Gjendja operacionale e platformës Kornizo.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric label="Organizata" value={o.totalOrganizations} />
        <Metric label="Aktive" value={o.activeOrganizations} tone="emerald" />
        <Metric label="Pezulluar" value={o.suspendedOrganizations} tone={o.suspendedOrganizations ? "amber" : "default"} />
        <Metric label="Përdorues" value={o.totalUsers} />
        <Metric label="Anëtarësime" value={o.totalMemberships} />
      </div>

      <PanelCard
        title="Shpërndarja sipas planit"
        action={
          <Link href="/platform/organizations" className="text-sm text-violet-500 hover:text-violet-600">
            Shiko organizatat →
          </Link>
        }
      >
        <div className="grid grid-cols-3 gap-4">
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
                  <span className="flex shrink-0 items-center gap-3">
                    <PlanBadge plan={org.plan} />
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
