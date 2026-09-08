import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemporaryRequestPageProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export function TemporaryRequestPage({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: TemporaryRequestPageProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-700 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg text-sm font-semibold text-slate-900 outline-none transition-colors hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-slate-900 font-heading text-base font-bold text-slate-50 dark:bg-slate-800">
              K
            </span>
            Kornizo
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 place-items-center py-16">
          <div className="w-full max-w-2xl min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm sm:p-10">
            <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-wrap font-heading text-3xl font-bold text-slate-950 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
              {description}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              No form is active here yet, and this page does not collect or store lead data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <RequestLink href={primaryHref} variant="primary">
                <ArrowLeft className="size-4" />
                {primaryLabel}
              </RequestLink>
              <RequestLink href={secondaryHref}>{secondaryLabel}</RequestLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RequestLink({
  href,
  variant = "outline",
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "outline";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500/60",
        variant === "primary"
          ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-200/60",
        className,
      )}
    >
      {children}
    </Link>
  );
}
