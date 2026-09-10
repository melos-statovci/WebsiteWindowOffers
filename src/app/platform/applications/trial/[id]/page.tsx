import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrialApplication } from "@/server/acquisition";
import { getProvisionedOrganizationSummary } from "@/server/platform/provisioning";
import { provisioningFailureText } from "@/lib/provisioning-slug";
import { BackLink, PanelCard } from "@/app/platform/ui";
import { TrialProvisioningRetry, TrialReviewControls } from "../../actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
}

const PROVISIONING_LABEL: Record<string, string> = {
  not_started: "NUK KA FILLUAR",
  in_progress: "NË PROCES",
  provisioned: "I PROVIZIONUAR",
  failed: "DËSHTOI",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default async function TrialApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getTrialApplication(id);
  if (!app) notFound();
  const org = app.organizationId ? await getProvisionedOrganizationSummary(app.organizationId) : null;

  return (
    <div className="space-y-6">
      <BackLink href="/platform/applications">Applications</BackLink>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">{app.companyName}</h1>
          <p className="mt-1 text-sm text-slate-400">Trial Application · {app.status.toUpperCase()}</p>
        </div>
        <Link href={`/platform/applications?tab=trial&trialStatus=${app.status}`} className="text-sm text-violet-500 hover:text-violet-600">
          Kthehu te lista
        </Link>
      </div>

      <PanelCard title="Aplikanti">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Emri">{app.applicantName}</Row>
          <Row label="Email">{app.email}</Row>
          <Row label="Better Auth user">{app.userId}</Row>
          <Row label="Dërguar">{fmtDate(app.createdAt)}</Row>
        </dl>
      </PanelCard>

      <PanelCard title="Kompania">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Kompania">{app.companyName}</Row>
          <Row label="Telefoni">{app.phone}</Row>
          <Row label="Shteti">{app.country}</Row>
          <Row label="Madhësia">{app.companySize}</Row>
          <Row label="Oferta në muaj">{app.offersPerMonth ?? "—"}</Row>
          <Row label="Mesazhi">{app.message || "—"}</Row>
        </dl>
      </PanelCard>

      <PanelCard title="Shqyrtimi">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Row label="Statusi">{app.status.toUpperCase()}</Row>
          <Row label="Shqyrtuar më">{fmtDate(app.reviewedAt)}</Row>
          <Row label="Shqyrtuar nga">{app.reviewedByEmail || "—"}</Row>
          <Row label="Shënim i brendshëm">{app.internalReviewNote || "—"}</Row>
        </dl>
        {app.status === "pending" ? (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <TrialReviewControls id={app.id} />
          </div>
        ) : null}
      </PanelCard>

      {app.status === "approved" ? (
        <PanelCard title="Provizionimi">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Statusi i provizionimit">{PROVISIONING_LABEL[app.provisioningStatus] ?? "—"}</Row>
            <Row label="Provizionuar më">{fmtDate(app.provisionedAt)}</Row>
            <Row label="Tentativa">{app.provisioningAttempts}</Row>
            {app.provisioningStatus === "failed" ? (
              <Row label="Arsyeja">{provisioningFailureText(app.provisioningErrorCode)}</Row>
            ) : null}
          </dl>

          {org ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Organizata e krijuar</p>
              <Link
                href={`/platform/organizations/${org.id}`}
                className="mt-1 inline-block text-base font-bold text-violet-500 hover:text-violet-600"
              >
                {org.name}
              </Link>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Row label="Plani">{org.plan}</Row>
                <Row label="Qasja komerciale">{org.effectiveCommercialAccess.toUpperCase()}</Row>
                <Row label="Trial filloi">{fmtDate(org.trialStartedAt)}</Row>
                <Row label="Trial mbaron">{fmtDate(org.trialEndsAt)}</Row>
                <Row label="Ditë të mbetura">{org.trialDaysRemaining}</Row>
                <Row label="Statusi operacional">{org.status.toUpperCase()}</Row>
              </dl>
            </div>
          ) : null}

          {app.provisioningStatus === "failed" || app.provisioningStatus === "in_progress" ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <TrialProvisioningRetry id={app.id} />
            </div>
          ) : null}
        </PanelCard>
      ) : null}

      <p className="text-xs leading-5 text-slate-400">
        {app.status === "pending"
          ? "Aprovimi krijon një organizatë të re, e cakton aplikantin si pronar dhe nis provën 14-ditore. Nuk bashkëngjitet asnjë organizatë ekzistuese."
          : app.provisioningStatus === "provisioned"
            ? "Ky aplikim është evidencë historike. Organizata dhe prova janë krijuar tashmë dhe nuk mund të krijohen sërish."
            : "Aprovimi është regjistruar. Prova fillon vetëm kur provizionimi përfundon me sukses."}
      </p>
    </div>
  );
}
