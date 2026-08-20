// Platform dashboard (Checkpoint C) — restrained, high-level operational metrics.
// Every number is a cheap aggregate over non-RLS tables; no customer business
// content is read here. Authorization is enforced by the platform layout gate.

import Link from "next/link";
import { getPlatformOverview } from "@/server/platform/organizations";
import { PLAN_TIERS } from "@/lib/plan";
import { Metric, PanelCard, PlanBadge } from "./ui";

export const dynamic = "force-dynamic";

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

      <p className="text-xs text-slate-400">
        Numërat e përmbajtjes së tenantëve (klientë, oferta, fatura) shfaqen për çdo
        organizatë veç e veç në faqen e detajeve — jo si agregate globale.
      </p>
    </div>
  );
}
