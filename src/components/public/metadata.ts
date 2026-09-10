import type { Metadata } from "next";
import { publicMarketing } from "@/lib/public-marketing";
import { localizedPath, type PublicLocale } from "@/lib/public-routing";
import { legalContent, type LegalDocumentId } from "@/lib/legal-content";

export function publicPageMetadata(locale: PublicLocale): Metadata {
  const content = publicMarketing[locale];
  return {
    title: content.metadata.title,
    description: content.metadata.description,
    openGraph: {
      title: content.metadata.ogTitle,
      description: content.metadata.ogDescription,
      type: "website",
      locale: locale === "sq" ? "sq_AL" : "en_US",
    },
    alternates: {
      languages: {
        sq: localizedPath("sq", content.basePath),
        en: localizedPath("en", content.basePath),
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function temporaryPageMetadata(
  locale: PublicLocale,
  kind: "trial" | "demo",
): Metadata {
  const content = publicMarketing[locale].temporaryCtaPages[kind];
  return {
    title: `${content.title} | Kornizo`,
    description: content.description,
    alternates: {
      languages: {
        sq: localizedPath("sq", locale === "sq" ? `/${kind === "trial" ? "request-trial" : "request-demo"}` : `/en/${kind === "trial" ? "request-trial" : "request-demo"}`),
        en: localizedPath("en", locale === "sq" ? `/${kind === "trial" ? "request-trial" : "request-demo"}` : `/en/${kind === "trial" ? "request-trial" : "request-demo"}`),
      },
    },
    robots: { index: false, follow: true },
  };
}

/**
 * Metadata for the public legal pages.
 *
 * `index: false` is deliberate: these are pre-legal-review DRAFTS (see
 * src/lib/legal-content.ts). They must be reachable and readable by a visitor
 * who follows the footer link, but they should not be indexed and surfaced as
 * Kornizo's authoritative legal position until a human has reviewed them. Flip
 * this to true as part of the legal sign-off.
 */
export function legalPageMetadata(
  locale: PublicLocale,
  doc: LegalDocumentId,
): Metadata {
  const copy = legalContent[locale][doc];
  const path = locale === "en" ? `/en/${doc}` : `/${doc}`;
  return {
    title: `${copy.title} | Kornizo`,
    description: copy.intro,
    alternates: {
      languages: {
        sq: localizedPath("sq", path),
        en: localizedPath("en", path),
      },
    },
    robots: { index: false, follow: true },
  };
}
