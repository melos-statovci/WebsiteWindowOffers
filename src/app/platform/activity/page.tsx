// Platform Activity — the human-readable view of the append-only audit trail.
// READ authorization is enforced by the platform layout gate (a tenant user
// gets a 404 at /platform and never reaches this page). Shows recent
// administrative actions with lightweight action/organization filtering and
// simple pagination — deliberately NOT a log-search platform.

import Link from "next/link";
import { listAuditEvents, type PlatformAuditAction } from "@/server/platform/audit";
import { PanelCard, ActionBadge, auditSummary } from "../ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTIONS: { value: PlatformAuditAction; label: string }[] = [
  { value: "PLAN_CHANGED", label: "Plan i ndryshuar" },
  { value: "CUSTOMER_ACTIVATED", label: "Klient aktiv" },
  { value: "TRIAL_EXTENDED", label: "Trial i zgjatur" },
  { value: "ORGANIZATION_SUSPENDED", label: "Pezulluar" },
  { value: "ORGANIZATION_REACTIVATED", label: "Riaktivizuar" },
  { value: "INTERNAL_NOTE_UPDATED", label: "Shënim i përditësuar" },
  { value: "CONTACT_REQUEST_STATUS_CHANGED", label: "Kontakt status" },
];
const ACTION_VALUES = ACTIONS.map((a) => a.value);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmt(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

const inputCls =
  "h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; org?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const action = sp.action && (ACTION_VALUES as string[]).includes(sp.action) ? (sp.action as PlatformAuditAction) : undefined;
  const organizationId = sp.org && UUID_RE.test(sp.org) ? sp.org : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { events, total } = await listAuditEvents({ action, organizationId, limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filteredOrgName = organizationId ? events.find((e) => e.organizationId === organizationId)?.organizationName : null;

  const qp = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (organizationId) params.set("org", organizationId);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `/platform/activity?${s}` : "/platform/activity";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">Aktiviteti</h1>
        <p className="mt-1 text-sm text-slate-400">{total} veprime administrative të regjistruara</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Veprimi</label>
          <select name="action" defaultValue={action ?? ""} className={inputCls}>
            <option value="">Të gjitha</option>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        {organizationId && <input type="hidden" name="org" value={organizationId} />}
        <button type="submit" className="h-9 rounded-md bg-violet-500 px-4 text-sm font-medium text-white hover:bg-violet-600">
          Filtro
        </button>
        {(action || organizationId) && (
          <Link href="/platform/activity" className="h-9 rounded-md border border-slate-200 px-4 text-sm leading-9 text-slate-500 hover:bg-slate-200">
            Pastro
          </Link>
        )}
        {organizationId && (
          <span className="ml-auto self-center text-xs text-slate-400">
            Filtruar sipas organizatës{filteredOrgName ? `: ${filteredOrgName}` : ""}
          </span>
        )}
      </form>

      <PanelCard>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Asnjë veprim nuk përputhet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Koha</th>
                  <th className="py-2 pr-4 font-medium">Veprimi</th>
                  <th className="py-2 pr-4 font-medium">Organizata</th>
                  <th className="py-2 pr-4 font-medium">Detaje</th>
                  <th className="py-2 pr-4 font-medium">Aktori</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-slate-200/70 last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-slate-400">{fmt(e.createdAt)}</td>
                    <td className="py-2.5 pr-4"><ActionBadge action={e.action} /></td>
                    <td className="py-2.5 pr-4">
                      {e.organizationId ? (
                        <Link href={`/platform/organizations/${e.organizationId}`} className="text-slate-900 hover:text-violet-600">
                          {e.organizationName ?? e.organizationId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{auditSummary(e) || "—"}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{e.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Faqja {page} nga {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={qp({ page: page - 1 })} className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-200/60">
                ← E mëparshme
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-300">← E mëparshme</span>
            )}
            {page < totalPages ? (
              <Link href={qp({ page: page + 1 })} className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-200/60">
                Tjetra →
              </Link>
            ) : (
              <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-300">Tjetra →</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
