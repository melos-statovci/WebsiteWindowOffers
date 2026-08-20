// Organization detail (Checkpoint B) — a concise operational view for one tenant.
// Account administration, NOT customer surveillance: it shows identity, plan,
// status, company profile, member metadata and USAGE COUNTS — never invoice
// lines, addresses of the tenant's customers, project configurations or payment
// details. Authorization: platform layout gate + this page is force-dynamic.

import { notFound } from "next/navigation";
import { getPlatformOrganization } from "@/server/platform/organizations";
import { BackLink, PanelCard, PlanBadge, StatusBadge } from "../../ui";
import { PlanControl, StatusControl, InternalNoteControl } from "./controls";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
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

  const usage: [string, number][] = [
    ["Klientë", org.usage.clients],
    ["Oferta", org.usage.projects],
    ["Artikuj ofertash", org.usage.projectItems],
    ["Fatura", org.usage.invoices],
    ["Pagesa", org.usage.payments],
  ];

  return (
    <div className="space-y-6">
      <BackLink href="/platform/organizations">Të gjitha organizatat</BackLink>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">{org.name}</h1>
        <PlanBadge plan={org.plan} />
        <StatusBadge status={org.status} />
      </div>

      {org.status === "suspended" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-600">
          Kjo organizatë është e pezulluar që nga {fmt(org.suspendedAt)}. Anëtarët nuk kanë qasje në aplikacion.
          {org.suspendedReason ? <div className="mt-1 text-amber-500">Arsyeja: {org.suspendedReason}</div> : null}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="Përmbledhje">
          <Row label="ID">
            <code className="text-xs text-slate-400">{org.id}</code>
          </Row>
          <Row label="Slug">{org.slug}</Row>
          <Row label="Krijuar">{fmt(org.createdAt)}</Row>
          <Row label="Plani"><PlanBadge plan={org.plan} /></Row>
          <Row label="Statusi"><StatusBadge status={org.status} /></Row>
        </PanelCard>

        <PanelCard title="Profili i kompanisë">
          <Row label="NUI">{org.profile.nui || "—"}</Row>
          <Row label="Nr. TVSH">{org.profile.vatNo || "—"}</Row>
          <Row label="Adresa">{org.profile.address || "—"}</Row>
          <Row label="Qyteti">{org.profile.city || "—"}</Row>
          <Row label="Telefoni">{org.profile.phone || "—"}</Row>
          <Row label="Email biznesi">{org.profile.businessEmail || "—"}</Row>
        </PanelCard>

        <PanelCard title="Plani">
          <p className="mb-3 text-sm text-slate-400">
            Ndryshimi i planit respektohet menjëherë nga kufizimet e tenantit në ngarkesën e radhës.
          </p>
          <PlanControl organizationId={org.id} plan={org.plan} />
        </PanelCard>

        <PanelCard title="Statusi i llogarisë">
          <p className="mb-3 text-sm text-slate-400">
            Pezullimi bllokon qasjen e tenantit pa fshirë asnjë të dhënë.
          </p>
          <StatusControl organizationId={org.id} status={org.status} orgName={org.name} />
        </PanelCard>
      </div>

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
                    <td className="py-2 pr-4 text-slate-400">{m.joinedAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Përdorimi">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {usage.map(([label, n]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="font-heading text-2xl font-semibold text-slate-900">{n}</div>
              <div className="mt-1 text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Shënim i brendshëm (privat)">
        <InternalNoteControl organizationId={org.id} note={org.internalNote} />
      </PanelCard>
    </div>
  );
}
