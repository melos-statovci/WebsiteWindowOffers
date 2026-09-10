import Link from "next/link";
import {
  listContactRequests,
  listTrialApplications,
  type ApplicationSort,
  type ContactRequestIntent,
  type ContactRequestStatus,
  type TrialApplicationStatus,
  type TrialProvisioningStatus,
} from "@/server/acquisition";
import { IntentBadge, PanelCard } from "../ui";
import { isoDay } from "@/lib/format";
import { ContactStatusControl } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none";


function TrialBadge({ status }: { status: TrialApplicationStatus }) {
  const cls =
    status === "approved"
      ? "bg-emerald-50 text-emerald-600"
      : status === "rejected"
        ? "bg-rose-50 text-rose-600"
        : "bg-amber-50 text-amber-600";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase ${cls}`}>{status}</span>;
}

/**
 * Provisioning state for an APPROVED application. Shown next to the decision
 * badge so "approved but not actually provisioned" can never look like success.
 */
function ProvisioningBadge({ status }: { status: TrialProvisioningStatus }) {
  const map: Record<TrialProvisioningStatus, { cls: string; label: string }> = {
    provisioned: { cls: "bg-emerald-50 text-emerald-600", label: "trial aktiv" },
    failed: { cls: "bg-rose-50 text-rose-600", label: "provizionimi dështoi" },
    in_progress: { cls: "bg-amber-50 text-amber-600", label: "në proces" },
    not_started: { cls: "bg-slate-200 text-slate-600", label: "pa provizionim" },
  };
  const { cls, label } = map[status];
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase ${cls}`}>{label}</span>;
}

function ContactStatusBadge({ status }: { status: ContactRequestStatus }) {
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
  searchParams: Promise<{ tab?: string; q?: string; trialStatus?: string; provisioning?: string; contactStatus?: string; intent?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "contact" ? "contact" : "trial";
  const q = sp.q?.trim() ?? "";
  const trialStatus: TrialApplicationStatus | "all" =
    sp.trialStatus === "pending" || sp.trialStatus === "approved" || sp.trialStatus === "rejected" ? sp.trialStatus : "all";
  // Provisioning is filtered separately from the decision: a failed
  // provisioning still reads as `approved`, so it cannot be found any other way.
  const provisioning: TrialProvisioningStatus | "all" =
    sp.provisioning === "provisioned" ||
    sp.provisioning === "failed" ||
    sp.provisioning === "in_progress" ||
    sp.provisioning === "not_started"
      ? sp.provisioning
      : "all";
  const contactStatus: ContactRequestStatus | "all" =
    sp.contactStatus === "new" || sp.contactStatus === "contacted" || sp.contactStatus === "closed"
      ? sp.contactStatus
      : "all";
  const intent: ContactRequestIntent | "all" =
    sp.intent === "demo" || sp.intent === "general" ? sp.intent : "all";
  const sort: ApplicationSort =
    sp.sort === "created_asc" || sp.sort === "company_asc" ? sp.sort : "created_desc";

  const [trials, contacts] = await Promise.all([
    listTrialApplications({ q, status: trialStatus, provisioning, sort }),
    listContactRequests({ q, status: contactStatus, intent, sort }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Applications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Trial Applications dhe Contact Requests (demo + kontakt i përgjithshëm)
          në një inbox operativ.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab href="/platform/applications?tab=trial" active={tab === "trial"}>Trial Applications</Tab>
        <Tab href="/platform/applications?tab=contact" active={tab === "contact"}>Contact Requests</Tab>
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
        ) : null}
        {tab === "trial" ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Provizionimi</label>
            <select name="provisioning" defaultValue={provisioning} className={inputCls}>
              <option value="all">Të gjitha</option>
              <option value="provisioned">Trial aktiv</option>
              <option value="failed">Dështoi</option>
              <option value="in_progress">Në proces</option>
              <option value="not_started">Pa provizionim</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Statusi</label>
            <select name="contactStatus" defaultValue={contactStatus} className={inputCls}>
              <option value="all">Të gjitha</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
        {tab === "contact" ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Arsyeja</label>
            <select name="intent" defaultValue={intent} className={inputCls}>
              <option value="all">Të gjitha</option>
              <option value="demo">Demo</option>
              <option value="general">Kontakt i përgjithshëm</option>
            </select>
          </div>
        ) : null}
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
        {(q || trialStatus !== "all" || provisioning !== "all" || contactStatus !== "all" || intent !== "all" || sort !== "created_desc") && (
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
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <TrialBadge status={app.status} />
                          {app.status === "approved" ? <ProvisioningBadge status={app.provisioningStatus} /> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{isoDay(app.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      ) : (
        <PanelCard title={`Contact Requests (${contacts.length})`}>
          {contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Asnjë kërkesë kontakti.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-400 uppercase">
                    <th className="py-2 pr-4 font-medium">Kontakti</th>
                    <th className="py-2 pr-4 font-medium">Kompania</th>
                    <th className="py-2 pr-4 font-medium">Arsyeja</th>
                    <th className="py-2 pr-4 font-medium">Statusi</th>
                    <th className="py-2 pr-4 font-medium">Dërguar</th>
                    <th className="py-2 pr-4 font-medium">Veprim</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((request) => (
                    <tr key={request.id} className="border-b border-slate-200/70 last:border-0 hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/platform/applications/contact/${request.id}`}
                          className="font-medium text-slate-900 hover:text-violet-500"
                        >
                          {request.name}
                        </Link>
                        <div className="text-xs text-slate-400">{request.email}</div>
                      </td>
                      {/* A general question may legitimately have no company. */}
                      <td className="py-3 pr-4 text-slate-600">{request.companyName ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <IntentBadge intent={request.intent} />
                      </td>
                      <td className="py-3 pr-4">
                        <ContactStatusBadge status={request.status} />
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{isoDay(request.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <ContactStatusControl id={request.id} status={request.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
