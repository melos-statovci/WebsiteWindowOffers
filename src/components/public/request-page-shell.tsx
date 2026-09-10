import Link from "next/link";
import { LogIn } from "lucide-react";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import type { PublicLocale } from "@/lib/public-routing";

export function RequestPageShell({
  locale,
  logoHref,
  signInLabel,
  children,
}: {
  locale: PublicLocale;
  logoHref: string;
  signInLabel: string;
  children: React.ReactNode;
}) {
  return (
    <main lang={locale} className="min-h-screen overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-700 sm:px-6">
      <div className="mx-auto w-[calc(100vw-2rem)] max-w-[22rem] min-w-0 sm:w-full sm:max-w-6xl">
        <header className="flex min-w-0 items-center justify-between gap-2 py-3 sm:gap-3">
          <Link
            href={logoHref}
            className="flex min-w-0 items-center gap-3 rounded-lg text-sm font-semibold text-slate-900 outline-none transition-colors hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-neutral-500/60"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 font-heading text-base font-bold text-slate-50">
              K
            </span>
            <span className="truncate">Kornizo</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher locale={locale} className="h-8 text-[11px] sm:h-9 sm:text-xs" />
            <Link
              href="/sign-in"
              className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-neutral-500/60 sm:inline-flex"
            >
              <LogIn className="size-4" />
              {signInLabel}
            </Link>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
