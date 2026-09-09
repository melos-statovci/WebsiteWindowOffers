import type { Metadata } from "next";
import { publicMarketing } from "@/lib/public-marketing";
import { localizedPath, type PublicLocale } from "@/lib/public-routing";

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
