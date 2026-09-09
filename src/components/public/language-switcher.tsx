"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { alternateLocale, localizedPath, type PublicLocale } from "@/lib/public-routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: PublicLocale;
  className?: string;
}) {
  const pathname = usePathname();
  const otherLocale = alternateLocale(locale);
  const target = localizedPath(otherLocale, pathname);

  const preserveHash = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!window.location.hash) return;
    event.preventDefault();
    window.location.href = `${target}${window.location.hash}`;
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-bold",
        className,
      )}
      aria-label="Language switcher"
    >
      <LocalePill locale="sq" active={locale === "sq"} href={localizedPath("sq", pathname)} onClick={locale === "sq" ? undefined : preserveHash} />
      <LocalePill locale="en" active={locale === "en"} href={localizedPath("en", pathname)} onClick={locale === "en" ? undefined : preserveHash} />
    </div>
  );
}

function LocalePill({
  locale,
  active,
  href,
  onClick,
}: {
  locale: PublicLocale;
  active: boolean;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-500/60",
        active ? "bg-slate-950 text-slate-50" : "text-slate-500 hover:text-slate-950",
      )}
    >
      {locale}
    </Link>
  );
}
