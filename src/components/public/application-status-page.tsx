import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { RequestPageShell } from "@/components/public/request-page-shell";
import { StartUsingKornizo } from "@/components/public/start-using-kornizo";
import { getCurrentTrialApplication } from "@/server/acquisition";
import { getAccountState } from "@/server/platform/accounts";
import type { PublicLocale } from "@/lib/public-routing";

const text = {
  sq: {
    signIn: "Hyr",
    noApplication: "/request-trial",
    noApplicationLabel: "Dërgo kërkesë",
    title: "Statusi i aplikimit",
    pendingTitle: "Kërkesa juaj është duke u shqyrtuar.",
    pendingBody: "Ekipi ynë po e shqyrton aplikimin e kompanisë. Mund të ktheheni këtu pas kyçjes për të parë statusin.",
    approvedTitle: "Kërkesa juaj për Trial është aprovuar.",
    approvedBody: "Po e përgatisim qasjen tuaj në Kornizo. Prova 14-ditore nuk ka filluar ende.",
    rejectedTitle: "Kërkesa juaj për Trial nuk u aprovua.",
    rejectedBody: "Nëse dëshironi më shumë informacion, na kontaktoni te info@arios.systems.",
    readyTitle: "Prova juaj në Kornizo është gati.",
    readyBody: "Keni 14 ditë qasje të plotë në Kornizo Standard.",
    startCta: "Filloni me Kornizo",
    startError: "Nuk u aktivizua. Provoni përsëri.",
    company: "Kompania",
    submitted: "Dërguar më",
    status: "Statusi",
    dashboard: "Kjo llogari ka qasje në Kornizo.",
    openApp: "Hap aplikacionin",
  },
  en: {
    signIn: "Sign in",
    noApplication: "/en/request-trial",
    noApplicationLabel: "Submit request",
    title: "Application status",
    pendingTitle: "Your application is under review.",
    pendingBody: "Our team is reviewing your company application. You can return here after signing in to see the status.",
    approvedTitle: "Your Trial request has been approved.",
    approvedBody: "We are preparing your Kornizo access. The 14-day trial has not started yet.",
    rejectedTitle: "Your Trial request was not approved.",
    rejectedBody: "For more information, contact us at info@arios.systems.",
    readyTitle: "Your Kornizo trial is ready.",
    readyBody: "You have 14 days of full access to Kornizo Standard.",
    startCta: "Start using Kornizo",
    startError: "Could not activate. Please try again.",
    company: "Company",
    submitted: "Submitted",
    status: "Status",
    dashboard: "This account has Kornizo access.",
    openApp: "Open app",
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
                <dt className="font-semibold text-slate-400">Kornizo Standard</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {account.trialEndsAt ? account.trialEndsAt.toISOString().slice(0, 10) : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400">{copy.status}</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {account.trialDaysRemaining} {locale === "en" ? "days left" : "ditë të mbetura"}
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
            <h1 className="font-heading text-3xl font-bold text-slate-950">{copy.dashboard}</h1>
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
  const statusCopy =
    app.status === "approved"
      ? { title: copy.approvedTitle, body: copy.approvedBody, icon: CheckCircle2, cls: "text-emerald-500", badge: "APPROVED" }
      : app.status === "rejected"
        ? { title: copy.rejectedTitle, body: copy.rejectedBody, icon: XCircle, cls: "text-rose-500", badge: "REJECTED" }
        : { title: copy.pendingTitle, body: copy.pendingBody, icon: Clock3, cls: "text-amber-500", badge: "PENDING" };
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
              <p className="mt-3 text-sm leading-6 text-slate-500">{statusCopy.body}</p>
            </div>
          </div>
          <dl className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-400">{copy.company}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{app.companyName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-400">{copy.submitted}</dt>
              <dd className="mt-1 font-semibold text-slate-900">{app.createdAt.toISOString().slice(0, 10)}</dd>
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
