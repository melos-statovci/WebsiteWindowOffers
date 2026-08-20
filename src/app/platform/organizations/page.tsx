// Tenant-organization list (Checkpoint B) — searchable + filterable. Filters are
// carried in the URL (a plain GET form), so the server component re-queries with
// no client JS. Authorization: the platform layout gate + force-dynamic reads.

import Link from "next/link";
import { listPlatformOrganizations } from "@/server/platform/organizations";
import { PLAN_TIERS, asPlanTier, type PlanTier } from "@/lib/plan";
import type { AccountStatus } from "@/server/platform/accounts";
import { PanelCard, PlanBadge, StatusBadge } from "../ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function OrganizationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status: AccountStatus | "all" =
    sp.status === "active" || sp.status === "suspended" ? sp.status : "all";
  const plan: PlanTier | "all" = sp.plan && (PLAN_TIERS as string[]).includes(sp.plan) ? asPlanTier(sp.plan) : "all";

  const orgs = await listPlatformOrganizations({ q, status, plan });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-white">Organizatat</h1>
        <p className="mt-1 text-sm text-slate-400">{orgs.length} organizata</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Kërko</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Emri ose slug…"
            className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Statusi</label>
          <select name="status" defaultValue={status} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none">
            <option value="all">Të gjitha</option>
            <option value="active">Aktive</option>
            <option value="suspended">Pezulluar</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Plani</label>
          <select name="plan" defaultValue={plan} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none">
            <option value="all">Të gjithë</option>
            {PLAN_TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-400">
          Filtro
        </button>
        {(q || status !== "all" || plan !== "all") && (
          <Link href="/platform/organizations" className="h-9 rounded-md border border-slate-700 px-4 text-sm leading-9 text-slate-300 hover:bg-slate-800">
            Pastro
          </Link>
        )}
      </form>

      <PanelCard>
        {orgs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Asnjë organizatë nuk përputhet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Organizata</th>
                  <th className="py-2 pr-4 font-medium">Plani</th>
                  <th className="py-2 pr-4 font-medium">Statusi</th>
                  <th className="py-2 pr-4 font-medium">Anëtarë</th>
                  <th className="py-2 pr-4 font-medium">Pronari</th>
                  <th className="py-2 pr-4 font-medium">Krijuar</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40">
                    <td className="py-3 pr-4">
                      <Link href={`/platform/organizations/${o.id}`} className="font-medium text-slate-100 hover:text-white">
                        {o.name}
                      </Link>
                      <div className="text-xs text-slate-500">{o.slug}</div>
                    </td>
                    <td className="py-3 pr-4"><PlanBadge plan={o.plan} /></td>
                    <td className="py-3 pr-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 pr-4 text-slate-300">{o.memberCount}</td>
                    <td className="py-3 pr-4">
                      {o.ownerEmail ? (
                        <div>
                          <div className="text-slate-200">{o.ownerName}</div>
                          <div className="text-xs text-slate-500">{o.ownerEmail}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
