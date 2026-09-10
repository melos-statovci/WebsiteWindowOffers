import Link from "next/link";
import {
  listDemoRequests,
  listTrialApplications,
  type ApplicationSort,
  type DemoRequestStatus,
  type TrialApplicationStatus,
} from "@/server/acquisition";
import { PanelCard } from "../ui";
import { DemoStatusControl } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function TrialBadge({ status }: { status: TrialApplicationStatus }) {
  const cls =
    status === "approved"
      ? "bg-emerald-50 text-emerald-600"
      : status === "rejected"
        ? "bg-rose-50 text-rose-600"
        : "bg-amber-50 text-amber-600";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase ${cls}`}>{status}</span>;
}

function DemoBadge({ status }: { status: DemoRequestStatus }) {
  const cls =
    status === "closed"
      ? "bg-slate-200 text-slate-600"
      : status === "contacted"
        ? "bg-blue-50 text-blue-600"
        : "bg-violet-500/15 text-violet-600";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase ${cls}`}>{status}</span>;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; trialStatus?: string; demoStatus?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "demo" ? "demo" : "trial";
  const q = sp.q?.trim() ?? "";
  const trialStatus: TrialApplicationStatus | "all" =
    sp.trialStatus === "pending" || sp.trialStatus === "approved" || sp.trialStatus === "rejected" ? sp.trialStatus : "all";
  const demoStatus: DemoRequestStatus | "all" =
    sp.demoStatus === "new" || sp.demoStatus === "contacted" || sp.demoStatus === "closed" ? sp.demoStatus : "all";
  const sort: ApplicationSort =
    sp.sort === "created_asc" || sp.sort === "company_asc" ? sp.sort : "created_desc";

  const [trials, demos] = await Promise.all([
    listTrialApplications({ q, status: trialStatus, sort }),
    listDemoRequests({ q, status: demoStatus, sort }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Applications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Trial Applications dhe Demo Requests në një inbox operativ.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab href="/platform/applications?tab=trial" active={tab === "trial"}>Trial Applications</Tab>
        <Tab href="/platform/applications?tab=demo" active={tab === "demo"}>Demo Requests</Tab>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <input type="hidden" name="tab" value={tab} />
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">Kërko</label>
          <input name="q" defaultValue={q} placeholder="Kompani, email, shtet..." className={inputCls} />
        </div>
        {tab === "trial" ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Statusi</label>
            <select name="trialStatus" defaultValue={trialStatus} className={inputCls}>
              <option value="all">Të gjitha</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Statusi</label>
            <select name="demoStatus" defaultValue={demoStatus} className={inputCls}>
              <option value="all">Të gjitha</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Rendit</label>
          <select name="sort" defaultValue={sort} className={inputCls}>
            <option value="created_desc">Më të reja</option>
            <option value="created_asc">Më të vjetra</option>
            <option value="company_asc">Kompania A-Z</option>
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-violet-500 px-4 text-sm font-medium text-white hover:bg-violet-600">
          Filtro
        </button>
        {(q || trialStatus !== "all" || demoStatus !== "all" || sort !== "created_desc") && (
          <Link href={`/platform/applications?tab=${tab}`} className="h-9 rounded-md border border-slate-200 px-4 text-sm leading-9 text-slate-500 hover:bg-slate-200">
            Pastro
          </Link>
        )}
      </form>

      {tab === "trial" ? (
        <PanelCard title={`Trial Applications (${trials.length})`}>
          {trials.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Asnjë Trial Application.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Kompania</th>
                    <th className="py-2 pr-4 font-medium">Aplikanti</th>
                    <th className="py-2 pr-4 font-medium">Shteti</th>
                    <th className="py-2 pr-4 font-medium">Madhësia</th>
                    <th className="py-2 pr-4 font-medium">Statusi</th>
                    <th className="py-2 pr-4 font-medium">Dërguar</th>
                  </tr>
                </thead>
                <tbody>
                  {trials.map((app) => (
                    <tr key={app.id} className="border-b border-slate-200/70 last:border-0 hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <Link href={`/platform/applications/trial/${app.id}`} className="font-medium text-slate-900 hover:text-violet-500">
                          {app.companyName}
                        </Link>
                        <div className="text-xs text-slate-400">{app.phone}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-slate-900">{app.applicantName}</div>
                        <div className="text-xs text-slate-400">{app.email}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{app.country}</td>
                      <td className="py-3 pr-4 text-slate-600">{app.companySize}</td>
                      <td className="py-3 pr-4"><TrialBadge status={app.status} /></td>
                      <td className="py-3 pr-4 text-slate-400">{fmtDate(app.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      ) : (
        <PanelCard title={`Demo Requests (${demos.length})`}>
          {demos.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Asnjë Demo Request.</p>
          ) : (
            <div className="space-y-3">
              {demos.map((demo) => (
                <div key={demo.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-base font-semibold text-slate-900">{demo.companyName}</h2>
                        <DemoBadge status={demo.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{demo.name} · {demo.email} · {demo.phone}</p>
                      <p className="mt-1 text-xs text-slate-400">{demo.country} · {fmtDate(demo.createdAt)}</p>
                      {demo.message ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{demo.message}</p> : null}
                    </div>
                    <DemoStatusControl id={demo.id} status={demo.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      )}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg bg-violet-500 px-4 py-2 text-sm font-bold text-white"
          : "rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
      }
    >
      {children}
    </Link>
  );
}
