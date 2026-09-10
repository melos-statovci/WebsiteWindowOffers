import type { Metadata } from "next";
import { headers } from "next/headers";
import { RequestPageShell } from "@/components/public/request-page-shell";
import { RequestTrialForm } from "@/components/public/request-trial-form";
import { getCurrentTrialApplication } from "@/server/acquisition";

export const metadata: Metadata = {
  title: "Request free trial | Kornizo",
  description: "Request access to the 14-day Kornizo Standard trial.",
  alternates: { languages: { sq: "/request-trial", en: "/en/request-trial" } },
};

export const dynamic = "force-dynamic";

export default async function EnglishRequestTrialPage() {
  const state = await getCurrentTrialApplication(await headers());
  return (
    <RequestPageShell locale="en" logoHref="/en" signInLabel="Sign in">
      <section className="grid min-w-0 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            Full 14-day trial
          </p>
          <h1 className="mt-6 max-w-2xl text-wrap break-words font-heading text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
            Request the Kornizo Standard trial
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
            Submit your company application. Kornizo access opens only after approval
            and preparation by our team.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-600">
            <span className="rounded-lg bg-slate-100 px-3 py-2">The application is saved as PENDING.</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2">If approved, access is prepared by the Kornizo team.</span>
            <span className="rounded-lg bg-slate-100 px-3 py-2">No payment details are required.</span>
          </div>
        </div>
        <RequestTrialForm
          locale="en"
          signedInUser={state.session ? { name: state.session.user.name, email: state.session.user.email } : null}
          application={state.application}
          hasTenantAccess={state.hasTenantAccess}
        />
      </section>
    </RequestPageShell>
  );
}
