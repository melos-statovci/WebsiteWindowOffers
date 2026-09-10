// Presentational primitives for the platform area. They reuse the tenant design
// tokens (the semantic, theme-aware `slate` scale) so the control plane is
// legible in BOTH light and dark themes. Visual DISTINCTION from the tenant app
// comes from the violet accent + "PLATFORM" chrome in layout.tsx — never from an
// inverted, theme-fragile background.

import Link from "next/link";
import { Card } from "@/components/ui/kit";
import { STANDARD_PLAN_NAME, type PlanTier } from "@/lib/plan";
import type { AccountStatus } from "@/server/platform/accounts";
import type { EffectiveCommercialAccess } from "@/lib/account-lifecycle";
import type { AuditEventRow, PlatformAuditAction } from "@/server/platform/audit";

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
  STANDARD: "bg-violet-500/15 text-violet-500",
};

export function PlanBadge({ plan }: { plan: PlanTier }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_STYLES[plan]}`}>{STANDARD_PLAN_NAME}</span>;
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

export function CommercialAccessBadge({ access }: { access: EffectiveCommercialAccess }) {
  if (access === "active") {
    return <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-500">Active</span>;
  }
  if (access === "trial") {
    return <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">Trial</span>;
  }
  if (access === "account_not_ready") {
    return <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">Account Not Ready</span>;
  }
  return <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">Trial Expired</span>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-slate-400 hover:text-slate-900">
      ← {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Audit / Activity rendering (shared by the Activity page + org detail)
// ---------------------------------------------------------------------------
const ACTION_META: Record<PlatformAuditAction, { label: string; cls: string }> = {
  PLAN_CHANGED: { label: "Plan i ndryshuar", cls: "bg-slate-200 text-slate-900" },
  ORGANIZATION_SUSPENDED: { label: "Pezulluar", cls: "bg-amber-50 text-amber-500" },
  ORGANIZATION_REACTIVATED: { label: "Riaktivizuar", cls: "bg-emerald-50 text-emerald-500" },
  INTERNAL_NOTE_UPDATED: { label: "Shënim i përditësuar", cls: "bg-violet-500/15 text-violet-500" },
  CUSTOMER_ACTIVATED: { label: "Klient aktiv", cls: "bg-emerald-50 text-emerald-500" },
  TRIAL_EXTENDED: { label: "Trial i zgjatur", cls: "bg-blue-50 text-blue-600" },
  TRIAL_APPLICATION_APPROVED: { label: "Trial i aprovuar", cls: "bg-emerald-50 text-emerald-500" },
  TRIAL_APPLICATION_REJECTED: { label: "Trial i refuzuar", cls: "bg-rose-50 text-rose-500" },
  DEMO_REQUEST_STATUS_CHANGED: { label: "Demo status", cls: "bg-violet-500/15 text-violet-500" },
};

export function ActionBadge({ action }: { action: PlatformAuditAction }) {
  const meta = ACTION_META[action] ?? { label: action, cls: "bg-slate-200 text-slate-600" };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>;
}

/** A short, safe human summary of an audit event's change. Never exposes note text. */
export function auditSummary(event: AuditEventRow): string {
  const m = event.metadata ?? {};
  switch (event.action) {
    case "PLAN_CHANGED":
      return m.oldPlan && m.newPlan ? `${m.oldPlan} → ${m.newPlan}` : "";
    case "ORGANIZATION_SUSPENDED":
      return typeof m.reason === "string" && m.reason ? `Arsyeja: ${m.reason}` : "";
    case "ORGANIZATION_REACTIVATED":
      return "";
    case "INTERNAL_NOTE_UPDATED":
      return m.cleared ? "Shënimi u pastrua" : "Shënimi u përditësua";
    case "CUSTOMER_ACTIVATED":
      return `${String(m.oldAccess ?? "")} → ${String(m.newAccess ?? "active")}`;
    case "TRIAL_EXTENDED":
      return `${String(m.oldTrialEndsAt ?? "—")} → ${String(m.newTrialEndsAt ?? "—")}`;
    case "TRIAL_APPLICATION_APPROVED":
    case "TRIAL_APPLICATION_REJECTED":
      return `${String(m.oldStatus ?? "")} → ${String(m.newStatus ?? "")}`;
    case "DEMO_REQUEST_STATUS_CHANGED":
      return `${String(m.oldStatus ?? "")} → ${String(m.newStatus ?? "")}`;
    default:
      return "";
  }
}
