import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CheckCircle2, Clock3, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { RequestPageShell } from "@/components/public/request-page-shell";
import { StartUsingKornizo } from "@/components/public/start-using-kornizo";
import { getCurrentTrialApplication } from "@/server/acquisition";
import { getAccountState } from "@/server/platform/accounts";
import type { PublicLocale } from "@/lib/public-routing";
import { isoDay } from "@/lib/format";
import { configuredSupportEmail, contactPath } from "@/lib/support-contact";
import { daysRemaining } from "@/lib/trial-copy";

const text = {
  sq: {
    signIn: "Hyr",
    noApplication: "/request-trial",
    noApplicationLabel: "Dërgo kërkesë",
    title: "Statusi i aplikimit",
    pendingTitle: "Kërkesa juaj është duke u shqyrtuar.",
    pendingBody: "Ekipi ynë po e shqyrton aplikimin e kompanisë. Mund të ktheheni këtu pas kyçjes për të parë statusin.",
    approvedTitle: "Kërkesa juaj për Trial është aprovuar.",
    approvedBody: "Po e përgatisim qasjen tuaj në Kornizo. Prova 14-ditore nuk ka filluar ende. Kjo faqe përditësohet vetë sapo llogaria të bëhet gati.",
    stalledTitle: "Kërkesa juaj është aprovuar — po e rregullojmë qasjen.",
    stalledBody: "Aprovimi ka kaluar, por përgatitja e llogarisë nuk përfundoi. Ekipi i Kornizo e ka pamjen e problemit dhe e rimerr nga fillimi; nuk keni nevojë të dërgoni kërkesë të re. Prova 14-ditore nis vetëm kur llogaria bëhet gati.",
    rejectedTitle: "Kërkesa juaj për Trial nuk u aprovua.",
    rejectedBody: "Nëse dëshironi më shumë informacion, na kontaktoni:",
    readyTitle: "Prova juaj në Kornizo është gati.",
    readyBody: "Keni 14 ditë qasje të plotë në Kornizo Standard.",
    startCta: "Filloni me Kornizo",
    startError: "Nuk u aktivizua. Provoni përsëri.",
    company: "Kompania",
    submitted: "Dërguar më",
    status: "Statusi",
    trialEnds: "Prova përfundon",
    dashboard: "Kjo llogari ka qasje në Kornizo.",
    dashboardBody: "Vazhdoni punën direkt në aplikacion.",
    openApp: "Hap aplikacionin",
    contact: "Kontakto Kornizo",
    badge: { pending: "NË SHQYRTIM", approved: "APROVUAR", rejected: "NUK U APROVUA", preparing: "NË PËRGATITJE" },
  },
  en: {
    signIn: "Sign in",
    noApplication: "/en/request-trial",
    noApplicationLabel: "Submit request",
    title: "Application status",
    pendingTitle: "Your application is under review.",
    pendingBody: "Our team is reviewing your company application. You can return here after signing in to see the status.",
    approvedTitle: "Your Trial request has been approved.",
    approvedBody: "We are preparing your Kornizo access. The 14-day trial has not started yet. This page updates itself as soon as the account is ready.",
    stalledTitle: "Your request is approved — we are still setting up access.",
    stalledBody: "The approval went through, but preparing the account did not finish. The Kornizo team can see the problem and is picking it up again; you do not need to submit another request. The 14-day trial only starts once the account is ready.",
    rejectedTitle: "Your Trial request was not approved.",
    rejectedBody: "For more information, contact us:",
    readyTitle: "Your Kornizo trial is ready.",
    readyBody: "You have 14 days of full access to Kornizo Standard.",
    startCta: "Start using Kornizo",
    startError: "Could not activate. Please try again.",
    company: "Company",
    submitted: "Submitted",
    status: "Status",
    trialEnds: "Trial ends",
    dashboard: "This account has Kornizo access.",
    dashboardBody: "Continue straight into the app.",
    openApp: "Open app",
    contact: "Contact Kornizo",
    badge: { pending: "UNDER REVIEW", approved: "APPROVED", rejected: "NOT APPROVED", preparing: "PREPARING" },
  },
} as const;

export async function ApplicationStatusPage({ locale }: { locale: PublicLocale }) {
  const copy = text[locale];
  const state = await getCurrentTrialApplication(await headers());
  if (!state.session) redirect("/sign-in");

  // Approved AND provisioned: the applicant's tenant exists and their 14-day
  // Standard trial is already running. They activate it in their OWN session.
  const app0 = state.application;
  if (app0 && app0.status === "approved" && app0.provisioningStatus === "provisioned" && app0.organizationId) {
    const account = await getAccountState(app0.organizationId);
    const alreadyActive = state.session.session.activeOrganizationId === app0.organizationId;
    return (
      <RequestPageShell locale={locale} logoHref={locale === "en" ? "/en" : "/"} signInLabel={copy.signIn}>
        <section className="grid min-h-[70vh] place-items-center py-12">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">{copy.title}</p>
            <div className="mt-5 flex items-start gap-4">
              <CheckCircle2 className="mt-1 size-7 shrink-0 text-emerald-500" />
              <div>
                <h1 className="font-heading text-3xl font-bold text-slate-950">{copy.readyTitle}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">{copy.readyBody}</p>
              </div>
            </div>
            <dl className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-slate-400">{copy.company}</dt>
                <dd className="mt-1 font-semibold text-slate-900">{app0.companyName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400">{copy.trialEnds}</dt>
                <dd className="mt-1 font-semibold text-slate-900">{isoDay(account.trialEndsAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400">{copy.status}</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {daysRemaining(account.trialDaysRemaining, locale)}
                </dd>
              </div>
            </dl>
            {alreadyActive ? (
              <Link
                href="/dashboard"
                className="public-primary-action mt-8 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold"
              >
                {copy.openApp}
              </Link>
            ) : (
              <StartUsingKornizo label={copy.startCta} errorLabel={copy.startError} />
            )}
          </div>
        </section>
      </RequestPageShell>
    );
  }

  if (state.hasTenantAccess) {
    return (
      <RequestPageShell locale={locale} logoHref={locale === "en" ? "/en" : "/"} signInLabel={copy.signIn}>
        <section className="grid min-h-[70vh] place-items-center py-12">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">{copy.title}</p>
            <h1 className="mt-5 font-heading text-3xl font-bold text-slate-950">{copy.dashboard}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{copy.dashboardBody}</p>
            <Link href="/dashboard" className="public-primary-action mt-6 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold">
              {copy.openApp}
            </Link>
          </div>
        </section>
      </RequestPageShell>
    );
  }
  if (!state.application) redirect(copy.noApplication);

  const app = state.application;
  // Rejected and stalled applicants must still be able to reach Kornizo. Email
  // when one is configured, otherwise the contact page — never a placeholder
  // address and never the vendor's own mailbox as "Kornizo support".
  const email = configuredSupportEmail();
  const contactHref = contactPath(locale);

  // An APPROVED application that is not provisioned has two very different
  // meanings, and Milestone 3 copy conflated them:
  //
  //   in_progress / not_started -> genuinely being prepared. "We are preparing
  //     your access" is true.
  //   failed                    -> provisioning broke. Telling the applicant we
  //     are preparing their access would be false, and it would leave them
  //     waiting on something that will not happen without operator action. This
  //     state says so plainly, tells them not to re-apply (a second application
  //     would be blocked by the per-user uniqueness rule anyway) and offers the
  //     support contact.
  //
  // No internal error code, organization id, slug or attempt count is exposed —
  // the operator sees those on the platform detail page; the applicant does not
  // need them and they are not their data to read.
  const provisioningFailed = app.status === "approved" && app.provisioningStatus === "failed";

  const statusCopy = provisioningFailed
    ? {
        title: copy.stalledTitle,
        body: copy.stalledBody,
        icon: TriangleAlert,
        cls: "text-amber-500",
        badge: copy.badge.preparing,
        showContact: true,
      }
    : app.status === "approved"
      ? {
          title: copy.approvedTitle,
          body: copy.approvedBody,
          icon: Loader2,
          cls: "text-emerald-500",
          badge: copy.badge.preparing,
          showContact: false,
        }
      : app.status === "rejected"
        ? {
            title: copy.rejectedTitle,
            body: copy.rejectedBody,
            icon: XCircle,
            cls: "text-rose-500",
            badge: copy.badge.rejected,
            showContact: true,
          }
        : {
            title: copy.pendingTitle,
            body: copy.pendingBody,
            icon: Clock3,
            cls: "text-amber-500",
            badge: copy.badge.pending,
            showContact: false,
          };
  const Icon = statusCopy.icon;

  return (
    <RequestPageShell locale={locale} logoHref={locale === "en" ? "/en" : "/"} signInLabel={copy.signIn}>
      <section className="grid min-h-[70vh] place-items-center py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">{copy.title}</p>
          <div className="mt-5 flex items-start gap-4">
            <Icon className={`mt-1 size-7 shrink-0 ${statusCopy.cls}`} />
            <div>
              <h1 className="font-heading text-3xl font-bold text-slate-950">{statusCopy.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {statusCopy.body}
                {statusCopy.showContact ? (
                  <>
                    {" "}
                    <a
                      className="font-semibold text-slate-900 underline"
                      href={email ? `mailto:${email}` : contactHref}
                    >
                      {email ?? copy.contact}
                    </a>
                    .
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <dl className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-400">{copy.company}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{app.companyName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-400">{copy.submitted}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{isoDay(app.createdAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-400">{copy.status}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{statusCopy.badge}</dd>
            </div>
          </dl>
        </div>
      </section>
    </RequestPageShell>
  );
}
