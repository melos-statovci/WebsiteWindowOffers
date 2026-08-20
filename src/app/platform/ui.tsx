// Presentational primitives for the platform area. They reuse the tenant design
// tokens (the semantic, theme-aware `slate` scale) so the control plane is
// legible in BOTH light and dark themes. Visual DISTINCTION from the tenant app
// comes from the violet accent + "PLATFORM" chrome in layout.tsx — never from an
// inverted, theme-fragile background.

import Link from "next/link";
import { Card } from "@/components/ui/kit";
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
    <Card className={`p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-heading text-base font-semibold text-slate-900">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "emerald" | "amber" }) {
  const valueColor = tone === "emerald" ? "text-emerald-500" : tone === "amber" ? "text-amber-500" : "text-slate-900";
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 font-heading text-3xl font-semibold ${valueColor}`}>{value}</div>
    </Card>
  );
}

const PLAN_STYLES: Record<PlanTier, string> = {
  SOLO: "bg-slate-200 text-slate-600",
  BIZNES: "bg-slate-200 text-slate-900",
  FABRIKA: "bg-violet-500/15 text-violet-500",
};

export function PlanBadge({ plan }: { plan: PlanTier }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_STYLES[plan]}`}>{plan}</span>;
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  return status === "suspended" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-500">
      ● Pezulluar
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-500">
      ● Aktive
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-slate-400 hover:text-slate-900">
      ← {children}
    </Link>
  );
}
