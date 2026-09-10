// Platform detail view for ONE contact request (demo or general).
//
// This exists because the list cannot usefully show a free-text message, and
// the message is the whole point of a general contact. Authorization comes from
// the platform layout gate — a tenant user who learns this URL gets a 404, the
// same as every other /platform route.
//
// Shows the contact's own submitted details and the operational lifecycle.
// Nothing here is tenant business data: a contact request has no organization.

import { notFound } from "next/navigation";
import { getContactRequest } from "@/server/acquisition";
import { BackLink, IntentBadge, PanelCard } from "@/app/platform/ui";
import { ContactStatusControl } from "../../actions";

export const dynamic = "force-dynamic";

function fmtDateTime(d: Date | null): string {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—";
}

const STATUS_LABEL: Record<string, string> = {
  new: "E RE",
  contacted: "KONTAKTUAR",
  closed: "MBYLLUR",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default async function ContactRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getContactRequest(id);
  if (!request) notFound();

  // The customer-facing intent, spelled out. "Demo Request" and "General
  // Contact" are what the operator needs to act on, not the stored enum.
  const intentTitle = request.intent === "demo" ? "Demo Request" : "Kontakt i përgjithshëm";
  const intentHelp =
    request.intent === "demo"
      ? "Vizitori kërkon një demonstrim të Kornizo. Kontaktoni për t'u marrë vesh për takimin."
      : "Vizitori ka një pyetje të përgjithshme për Kornizo. Kontaktoni me përgjigjen.";

  return (
    <div className="space-y-6">
      <BackLink href="/platform/applications?tab=contact">Të gjitha kërkesat e kontaktit</BackLink>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">{request.name}</h1>
        <IntentBadge intent={request.intent} />
        <span className="inline-flex rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 uppercase">
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title={intentTitle}>
          <p className="mb-4 text-sm text-slate-500">{intentHelp}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Emri">{request.name}</Row>
            {/* Company, phone and country are optional for a general question. */}
            <Row label="Kompania">{request.companyName ?? "—"}</Row>
            <Row label="Email">
              <a className="underline hover:text-violet-500" href={`mailto:${request.email}`}>
                {request.email}
              </a>
            </Row>
            <Row label="Telefoni">
              {request.phone ? (
                <a className="underline hover:text-violet-500" href={`tel:${request.phone}`}>
                  {request.phone}
                </a>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Shteti">{request.country ?? "—"}</Row>
            <Row label="Dërguar">{fmtDateTime(request.createdAt)}</Row>
          </dl>
        </PanelCard>

        <PanelCard title="Lifecycle">
          <dl className="mb-4 grid gap-4 sm:grid-cols-2">
            <Row label="Statusi">{STATUS_LABEL[request.status] ?? request.status}</Row>
            <Row label="Ndryshuar më">{fmtDateTime(request.statusChangedAt)}</Row>
            <Row label="Ndryshuar nga">{request.statusChangedByEmail ?? "—"}</Row>
          </dl>
          <ContactStatusControl id={request.id} status={request.status} />
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Mbyllja e kërkesës e liron email-in për një kërkesë të re të njëjtë
            më vonë. Statusi regjistrohet në auditim; përmbajtja e mesazhit nuk
            regjistrohet.
          </p>
        </PanelCard>
      </div>

      <PanelCard title="Mesazhi">
        {request.message ? (
          // Visitor-authored text. Rendered as plain text by React (never as
          // HTML), and `whitespace-pre-line` keeps their line breaks without
          // letting the content affect layout.
          <p className="max-w-3xl text-sm leading-6 whitespace-pre-line text-slate-600 wrap-anywhere">
            {request.message}
          </p>
        ) : (
          <p className="py-2 text-sm text-slate-400">Asnjë mesazh.</p>
        )}
      </PanelCard>
    </div>
  );
}
