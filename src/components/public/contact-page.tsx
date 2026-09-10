// Public "Contact Kornizo" page, shared by /contact and /en/contact.
//
// This is the GENERAL contact destination: a product question, a support
// question, anything that is not "show me a demo" and not "let me try it".
// The two acquisition actions stay separate and are linked from here, so a
// visitor who landed in the wrong place is one click from the right one.
//
// SUPPORT ADDRESS: shown ONLY when KORNIZO_SUPPORT_EMAIL is actually
// configured. When it is not, this page IS the contact channel and no address
// is displayed — no placeholder, no empty mailto, and no address on a domain
// Kornizo does not own.

import Link from "next/link";
import { RequestPageShell } from "@/components/public/request-page-shell";
import { ContactForm } from "@/components/public/contact-form";
import { configuredSupportEmail } from "@/lib/support-contact";
import type { PublicLocale } from "@/lib/public-routing";

const text = {
  sq: {
    signIn: "Hyr",
    eyebrow: "Kontakt",
    title: "Na kontaktoni",
    lead: "Keni pyetje për Kornizo? Shkruani dhe do t'ju kthejmë përgjigje.",
    emailIntro: "Mund të shkruani edhe direkt te",
    otherHeading: "Po kërkoni diçka tjetër?",
    demoLabel: "Kërko një demo",
    demoBody: "Dëshironi t'ju tregojmë Kornizo dhe t'ju shpjegojmë si funksionon.",
    trialLabel: "Kërko provën falas",
    trialBody: "Dëshironi ta provoni vetë Kornizo për 14 ditë.",
    noAccount: "Dërgimi i mesazhit nuk krijon llogari dhe nuk nis provën.",
  },
  en: {
    signIn: "Sign in",
    eyebrow: "Contact",
    title: "Contact us",
    lead: "Questions about Kornizo? Write to us and we will get back to you.",
    emailIntro: "You can also write directly to",
    otherHeading: "Looking for something else?",
    demoLabel: "Request a demo",
    demoBody: "You would like Kornizo shown and explained to you.",
    trialLabel: "Request the free trial",
    trialBody: "You would like to try Kornizo yourself for 14 days.",
    noAccount: "Sending a message does not create an account and does not start the trial.",
  },
} as const;

export function ContactPage({ locale }: { locale: PublicLocale }) {
  const copy = text[locale];
  const base = locale === "en" ? "/en" : "";
  const home = locale === "en" ? "/en" : "/";
  const email = configuredSupportEmail();

  return (
    <RequestPageShell locale={locale} logoHref={home} signInLabel={copy.signIn}>
      <section className="grid min-w-0 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold tracking-[0.18em] text-slate-500 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-6 max-w-2xl text-wrap break-words font-heading text-3xl leading-tight font-bold text-slate-950 sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">{copy.lead}</p>

          {/* Rendered only when a real address is configured. */}
          {email ? (
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              {copy.emailIntro}{" "}
              <a href={`mailto:${email}`} className="font-semibold text-slate-500 underline hover:text-slate-900">
                {email}
              </a>
              .
            </p>
          ) : null}

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">{copy.noAccount}</p>

          <div className="mt-8 max-w-xl">
            <h2 className="font-heading text-sm font-bold tracking-wide text-slate-500 uppercase">
              {copy.otherHeading}
            </h2>
            <ul className="mt-3 space-y-3">
              <li>
                <Link
                  href={`${base}/request-demo`}
                  className="font-semibold text-slate-900 underline hover:text-slate-500"
                >
                  {copy.demoLabel}
                </Link>
                <p className="text-sm text-slate-400">{copy.demoBody}</p>
              </li>
              <li>
                <Link
                  href={`${base}/request-trial`}
                  className="font-semibold text-slate-900 underline hover:text-slate-500"
                >
                  {copy.trialLabel}
                </Link>
                <p className="text-sm text-slate-400">{copy.trialBody}</p>
              </li>
            </ul>
          </div>
        </div>
        <ContactForm locale={locale} />
      </section>
    </RequestPageShell>
  );
}
