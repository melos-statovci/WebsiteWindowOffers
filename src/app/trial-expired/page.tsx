import { requireTrialExpiredContext } from "@/auth/session";
import { STANDARD_PLAN_NAME } from "@/lib/plan";
import { SuspendedSignOut } from "@/app/suspended/sign-out";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "—";
}

export default async function TrialExpiredPage() {
  const ctx = await requireTrialExpiredContext();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-5 inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
          Trial ended
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Your Kornizo trial has ended.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your company data is safe. Clients, pricing, projects, offers,
          invoices, payments, and notes remain in your account.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <span className="text-slate-400">Company</span>
            <span className="text-right font-medium text-slate-900">{ctx.activeOrg.name}</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-slate-400">Plan</span>
            <span className="text-right font-medium text-slate-900">{STANDARD_PLAN_NAME}</span>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <span className="text-slate-400">Trial ended</span>
            <span className="text-right font-medium text-slate-900">{fmtDate(ctx.trialEndsAt)}</span>
          </div>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Contact Kornizo to continue using your account.
        </p>
        <div className="mt-6">
          <SuspendedSignOut />
        </div>
      </section>
    </main>
  );
}
