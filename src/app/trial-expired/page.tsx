// Trial-expired landing for a signed-in tenant member whose 14-day Kornizo
// Standard trial has ended.
//
// It lives OUTSIDE the (app) route group so it never re-triggers the tenant
// trial-expired redirect. requireTrialExpiredContext() re-derives the state on
// the server and bounces anyone who does not actually belong here: no session
// -> /sign-in, suspended -> /suspended, missing account row ->
// /account-not-ready, still-valid trial or activated customer -> /dashboard.
//
// TRUTHFULNESS RULES FOR THIS PAGE
//   * Business data is NOT deleted when a trial ends. Expiry blocks access
//     only, so this page says the data is kept and says nothing about deletion,
//     retention windows or grace periods — no such policy exists in the code.
//   * No payment, checkout or self-service upgrade is offered, because none
//     exists. Conversion is manual: a platform admin runs "Activate customer".
//   * The only actions offered are the two that genuinely work: contact
//     Kornizo, and sign out.
//   * Albanian, matching the rest of the tenant application.

import { requireTrialExpiredContext } from "@/auth/session";
import { STANDARD_PLAN_NAME } from "@/lib/plan";
import { isoDay } from "@/lib/format";
import { supportEmail } from "@/lib/support-contact";
import { SuspendedSignOut } from "@/app/suspended/sign-out";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

export default async function TrialExpiredPage() {
  const ctx = await requireTrialExpiredContext();
  const email = supportEmail();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:p-8">
        <div className="mb-5 inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
          Trial i përfunduar
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Prova juaj në Kornizo ka përfunduar.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Të dhënat e kompanisë tuaj janë të ruajtura. Klientët, çmimet,
          projektet, ofertat, faturat, pagesat dhe shënimet vazhdojnë të
          qëndrojnë në llogarinë tuaj — asgjë nuk është fshirë.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Qasja e përditshme në aplikacion është ndalur përkohësisht derisa
          llogaria të aktivizohet ose prova të zgjatet. Kur llogaria aktivizohet,
          i gjeni të gjitha të dhënat tuaja pikërisht ashtu si i lanë.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <Row label="Kompania">{ctx.activeOrg.name}</Row>
          <Row label="Llogaria">{ctx.user.email}</Row>
          <Row label="Plani">{STANDARD_PLAN_NAME}</Row>
          <Row label="Prova përfundoi">{isoDay(ctx.trialEndsAt)}</Row>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          Për të vazhduar me Kornizo, na kontaktoni te{" "}
          <a className="font-semibold text-slate-900 underline" href={`mailto:${email}`}>
            {email}
          </a>
          .
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(
              `Vazhdimi i Kornizo — ${ctx.activeOrg.name}`,
            )}`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-slate-50 hover:bg-slate-800"
          >
            Kontakto Kornizo
          </a>
          <SuspendedSignOut />
        </div>
      </section>
    </main>
  );
}
