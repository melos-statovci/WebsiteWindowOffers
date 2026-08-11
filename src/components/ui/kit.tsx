"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant =
  | "primary"
  | "ghost"
  | "outline"
  | "danger"
  | "subtle"
  | "soft";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-slate-300 text-slate-950 hover:bg-slate-400",
  ghost: "text-slate-500 hover:bg-slate-200/60 hover:text-slate-900",
  outline:
    "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/60 hover:text-slate-900",
  danger:
    "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 dark:bg-rose-500/15",
  subtle: "bg-slate-200 text-slate-900 hover:bg-slate-300",
  soft: "bg-slate-200 text-slate-900 hover:bg-slate-300",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-11 px-5 text-sm [&_svg]:size-4",
  icon: "size-9 [&_svg]:size-[1.15rem]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

// ---------------------------------------------------------------------------
// Card / SectionCard
// ---------------------------------------------------------------------------
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="font-heading text-base font-semibold text-slate-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
type BadgeTone =
  | "neutral"
  | "blue"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-slate-200 text-slate-600",
  blue: "bg-slate-200 text-slate-900",
  indigo: "bg-slate-200 text-slate-900",
  emerald: "bg-emerald-50 text-emerald-500",
  amber: "bg-amber-50 text-amber-500",
  rose: "bg-rose-50 text-rose-400",
  violet: "bg-slate-200 text-slate-900",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar (square with initial)
// ---------------------------------------------------------------------------
export function Avatar({
  initial,
  className,
  circle,
}: {
  initial: string;
  className?: string;
  circle?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-slate-300 font-heading font-semibold text-white",
        circle ? "rounded-full" : "rounded-xl",
        className ?? "size-11 text-base",
      )}
    >
      {initial}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-200/70 text-slate-400">
        <Icon className="size-7" />
      </div>
      <p className="font-heading text-lg font-semibold text-slate-900">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle (switch)
// ---------------------------------------------------------------------------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/60",
        checked ? "bg-slate-300" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// SegmentedTabs (controlled)
// ---------------------------------------------------------------------------
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-slate-200/60 p-1",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
            value === t.value
              ? "bg-slate-50 text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-700",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field helpers (label + input) for settings/pricing forms
// ---------------------------------------------------------------------------
export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-semibold tracking-wide text-slate-400 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-500/30",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children ?? <Input />}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
