// Organization detail — an account-management console for one tenant, organized
// into tabs (Overview / Members / Usage / Account) rather than one dump.
// Account administration, NOT surveillance: identity, plan, status, company
// profile, member metadata, usage COUNTS, a derived last-business-activity
// timestamp, and the platform audit trail for this org — never invoice lines,
// customer addresses, project configs, or payment contents. Authorization: the
// platform layout gate + force-dynamic reads.

import { notFound } from "next/navigation";
import { getPlatformOrganization } from "@/server/platform/organizations";
import { listAuditEvents } from "@/server/platform/audit";
import { STANDARD_PLAN_NAME } from "@/lib/plan";
import { BackLink, PanelCard, PlanBadge, StatusBadge, ActionBadge, auditSummary, CommercialAccessBadge } from "../../ui";
import { LifecycleControl, StatusControl, InternalNoteControl } from "./controls";
import { DetailTabs } from "./tabs";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
}
function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Pronar",
  admin: "Administrator",
  sales: "Shitje",
  operator: "Operator",
  accounting: "Financa",
  member: "Anëtar",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200/70 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm text-slate-900">{children}</span>
    </div>
  );
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getPlatformOrganization(id);
  if (!org) notFound();

  const { events } = await listAuditEvents({ organizationId: id, limit: 8 });

  const usage: [string, number][] = [
    ["Klientë", org.usage.clients],
    ["Oferta", org.usage.projects],
    ["Artikuj ofertash", org.usage.projectItems],
    ["Fatura", org.usage.invoices],
    ["Pagesa", org.usage.payments],
  ];

  const overview = (
    <div className="grid gap-6 lg:grid-cols-2">
      <PanelCard title="Përmbledhje">
        <Row label="ID"><code className="text-xs text-slate-400">{org.id}</code></Row>
        <Row label="Slug">{org.slug}</Row>
        <Row label="Krijuar">{fmt(org.createdAt)}</Row>
        <Row label="Aktiviteti i fundit i biznesit">{org.lastBusinessActivity ? fmt(org.lastBusinessActivity) : "Asnjë ende"}</Row>
        <Row label="Plani"><PlanBadge plan={org.plan} /></Row>
        <Row label="Qasja komerciale"><CommercialAccessBadge access={org.effectiveCommercialAccess} /></Row>
        <Row label="Statusi operacional"><StatusBadge status={org.status} /></Row>
      </PanelCard>
      <PanelCard title="Profili i kompanisë">
        <Row label="NUI">{org.profile.nui || "—"}</Row>
        <Row label="Nr. TVSH">{org.profile.vatNo || "—"}</Row>
        <Row label="Adresa">{org.profile.address || "—"}</Row>
        <Row label="Qyteti">{org.profile.city || "—"}</Row>
        <Row label="Telefoni">{org.profile.phone || "—"}</Row>
        <Row label="Email biznesi">{org.profile.businessEmail || "—"}</Row>
      </PanelCard>
    </div>
  );

  const members = (
    <PanelCard title={`Anëtarët (${org.members.length})`}>
      {org.members.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">Asnjë anëtar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4 font-medium">Emri</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Roli</th>
                <th className="py-2 pr-4 font-medium">Anëtarësuar</th>
              </tr>
            </thead>
            <tbody>
              {org.members.map((m) => (
                <tr key={m.userId} className="border-b border-slate-200/70 last:border-0">
                  <td className="py-2 pr-4 text-slate-900">{m.name}</td>
                  <td className="py-2 pr-4 text-slate-400">{m.email}</td>
                  <td className="py-2 pr-4 text-slate-600">{ROLE_LABEL[m.role] ?? m.role}</td>
                  <td className="py-2 pr-4 text-slate-400">{fmtDate(m.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );

  const usagePanel = (
    <PanelCard title="Përdorimi" >
      <p className="mb-4 text-xs text-slate-400">Vetëm numra — asnjë përmbajtje biznesi e tenantit.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {usage.map(([label, n]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <div className="font-heading text-2xl font-semibold text-slate-900">{n}</div>
            <div className="mt-1 text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>
    </PanelCard>
  );

  const account = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Plani">
          <p className="text-sm text-slate-500">
            {STANDARD_PLAN_NAME} është plani i vetëm real në lansim. Të gjitha funksionet aktuale të tenantit përfshihen.
          </p>
        </PanelCard>
        <PanelCard title="Qasja komerciale">
          <div className="mb-3 space-y-2 text-sm text-slate-500">
            <div className="flex justify-between gap-4">
              <span>Gjendja</span>
              <CommercialAccessBadge access={org.effectiveCommercialAccess} />
            </div>
            <div className="flex justify-between gap-4">
              <span>Fillimi i trial</span>
              <span className="text-slate-900">{fmt(org.trialStartedAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Fundi i trial</span>
              <span className="text-slate-900">{fmt(org.trialEndsAt)}</span>
            </div>
            {org.effectiveCommercialAccess === "trial" && (
              <div className="flex justify-between gap-4">
                <span>Ditë të mbetura</span>
                <span className="text-slate-900">{org.trialDaysRemaining}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span>Aktivizuar</span>
              <span className="text-slate-900">{fmt(org.activatedAt)}</span>
            </div>
          </div>
          <LifecycleControl
            organizationId={org.id}
            access={org.effectiveCommercialAccess}
            trialDaysRemaining={org.trialDaysRemaining}
          />
        </PanelCard>
        <PanelCard title="Statusi operacional">
          <p className="mb-3 text-sm text-slate-400">Pezullimi bllokon qasjen e tenantit pa fshirë asnjë të dhënë.</p>
          <StatusControl organizationId={org.id} status={org.status} orgName={org.name} />
        </PanelCard>
      </div>
      <PanelCard title="Shënim i brendshëm (privat)">
        <InternalNoteControl organizationId={org.id} note={org.internalNote} />
      </PanelCard>
      <PanelCard title="Aktiviteti i fundit administrativ">
        {events.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">Asnjë veprim i regjistruar për këtë organizatë.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-32 shrink-0 text-xs text-slate-400">{fmt(e.createdAt)}</span>
                <ActionBadge action={e.action} />
                <span className="text-slate-600">{auditSummary(e)}</span>
                <span className="ml-auto text-xs text-slate-400">{e.actorEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );

  return (
    <div className="space-y-6">
      <BackLink href="/platform/organizations">Të gjitha organizatat</BackLink>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">{org.name}</h1>
        <PlanBadge plan={org.plan} />
        <CommercialAccessBadge access={org.effectiveCommercialAccess} />
        <StatusBadge status={org.status} />
      </div>

      {org.effectiveCommercialAccess === "trial_expired" && org.status !== "suspended" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-700">
          Trial i kësaj organizate ka skaduar. Të dhënat janë të paprekura dhe Platform Admin mund ta aktivizojë klientin ose ta zgjasë trial.
        </div>
      )}

      {org.status === "suspended" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-600">
          Kjo organizatë është e pezulluar që nga {fmt(org.suspendedAt)}. Anëtarët nuk kanë qasje në aplikacion.
          {org.suspendedReason ? <div className="mt-1 text-amber-500">Arsyeja: {org.suspendedReason}</div> : null}
        </div>
      )}

      <DetailTabs
        tabs={[
          { id: "overview", label: "Përmbledhje", content: overview },
          { id: "members", label: `Anëtarët (${org.members.length})`, content: members },
          { id: "usage", label: "Përdorimi", content: usagePanel },
          { id: "account", label: "Llogaria", content: account },
        ]}
      />
    </div>
  );
}
