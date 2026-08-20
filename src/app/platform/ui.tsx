// Presentational primitives for the dark platform chrome. Kept local to the
// /platform area so they never mix with the tenant kit (which is light-themed).

import Link from "next/link";
import type { PlanTier } from "@/lib/plan";
import type { AccountStatus } from "@/server/platform/accounts";

export function PanelCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-heading text-sm font-semibold text-slate-200">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "emerald" | "amber" }) {
  const valueColor = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-white";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 font-heading text-3xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

const PLAN_STYLES: Record<PlanTier, string> = {
  SOLO: "bg-slate-700 text-slate-100",
  BIZNES: "bg-indigo-500/20 text-indigo-300",
  FABRIKA: "bg-violet-500/20 text-violet-300",
};

export function PlanBadge({ plan }: { plan: PlanTier }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_STYLES[plan]}`}>{plan}</span>;
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return status === "suspended" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
      ● Pezulluar
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      ● Aktive
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-slate-400 hover:text-slate-200">
      ← {children}
    </Link>
  );
}
