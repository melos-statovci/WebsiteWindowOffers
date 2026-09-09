import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import type { PublicLocale } from "@/lib/public-routing";
import { cn } from "@/lib/utils";

interface TemporaryRequestPageProps {
  locale: PublicLocale;
  logoHref: string;
  signInLabel: string;
  noFormNotice: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export function TemporaryRequestPage({
  locale,
  logoHref,
  signInLabel,
  noFormNotice,
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: TemporaryRequestPageProps) {
  return (
    <main lang={locale} className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-700 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link
            href={logoHref}
            className="flex items-center gap-3 rounded-lg text-sm font-semibold text-slate-900 outline-none transition-colors hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 font-heading text-base font-bold text-slate-50">
              K
            </span>
            Kornizo
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
            >
              <LogIn className="size-4" />
              {signInLabel}
            </Link>
          </div>
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
              {noFormNotice}
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
          ? "public-primary-action shadow-sm shadow-slate-950/10"
          : "border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-200/60",
        className,
      )}
    >
      {children}
    </Link>
  );
}
