"use client";

// Shared centered card shell for the public auth pages (sign-in / sign-up /
// onboarding). Minimal, matches the app's dark theme; correctness over polish.

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 font-heading text-lg font-bold text-white">
            K
          </span>
          <span className="font-heading text-xl font-bold text-slate-900">Kornizo</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6 shadow-xl">
          <h1 className="font-heading text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}
