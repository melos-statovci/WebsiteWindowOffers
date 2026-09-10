// Shared renderer for the public Privacy / Terms pages, in both locales.
//
// Reuses RequestPageShell so the header, logo, sign-in link and the SQ|EN
// language switcher behave exactly as on the other public routes — the switcher
// maps /privacy <-> /en/privacy through localizedPath() without needing a route
// allowlist.
//
// The visible draft notice is NOT optional chrome: this text has not been
// legally reviewed (see src/lib/legal-content.ts), and a public legal page that
// hides that fact would be the very thing this milestone is meant to avoid.

import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { RequestPageShell } from "@/components/public/request-page-shell";
import { legalContent, LEGAL_LAST_UPDATED, type LegalDocumentId } from "@/lib/legal-content";
import { configuredSupportEmail, contactPath } from "@/lib/support-contact";
import type { PublicLocale } from "@/lib/public-routing";

export function LegalPage({ locale, doc }: { locale: PublicLocale; doc: LegalDocumentId }) {
  const copy = legalContent[locale][doc];
  // A legal page must give a real way to reach the operator. An address is
  // shown only when configured; otherwise the contact page is the channel.
  const email = configuredSupportEmail();
  const home = locale === "en" ? "/en" : "/";
  const signIn = locale === "en" ? "Sign in" : "Hyr";

  return (
    <RequestPageShell locale={locale} logoHref={home} signInLabel={signIn}>
      <article className="mx-auto w-full max-w-3xl py-10 sm:py-14">
        <h1 className="font-heading text-3xl font-bold text-slate-950 sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{copy.intro}</p>
        <p className="mt-2 text-xs text-slate-400">
          {copy.updatedLabel}: {LEGAL_LAST_UPDATED}
        </p>

        <aside className="mt-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-50 p-4">
          <FileWarning className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p className="text-sm leading-6 text-amber-700">{copy.draftNotice}</p>
        </aside>

        <div className="mt-10 space-y-8">
          {copy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-lg font-semibold text-slate-900">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-6 text-slate-500">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5 text-sm leading-6 text-slate-500">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section>
            <h2 className="font-heading text-lg font-semibold text-slate-900">{copy.contactHeading}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {copy.contactBody}{" "}
              {email ? (
                <a className="font-semibold text-slate-900 underline" href={`mailto:${email}`}>
                  {email}
                </a>
              ) : (
                <Link className="font-semibold text-slate-900 underline" href={contactPath(locale)}>
                  {copy.contactFallback}
                </Link>
              )}
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link
            href={home}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            {copy.backLabel}
          </Link>
        </div>
      </article>
    </RequestPageShell>
  );
}
