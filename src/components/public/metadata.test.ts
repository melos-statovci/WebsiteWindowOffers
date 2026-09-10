// Indexability is a launch-safety property, not a preference.
//
// The legal pages are PRE-REVIEW DRAFTS: they must stay reachable for a visitor
// who follows a footer link, but must not be indexed and surfaced as Kornizo's
// authoritative legal position until a human has reviewed them. The acquisition
// and contact pages are the opposite — they are real and should be findable.

import { describe, expect, it } from "vitest";
import { legalPageMetadata, publicPageMetadata } from "./metadata";

describe("legal pages stay noindex until legal review", () => {
  it.each(["privacy", "terms"] as const)("sq/%s is noindex, follow", (doc) => {
    const meta = legalPageMetadata("sq", doc);
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it.each(["privacy", "terms"] as const)("en/%s is noindex, follow", (doc) => {
    const meta = legalPageMetadata("en", doc);
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("still points each legal page at both locale alternates", () => {
    // Noindex must not break the SQ|EN pairing.
    expect(legalPageMetadata("sq", "privacy").alternates?.languages).toEqual({
      sq: "/privacy",
      en: "/en/privacy",
    });
    expect(legalPageMetadata("en", "terms").alternates?.languages).toEqual({
      sq: "/terms",
      en: "/en/terms",
    });
  });
});

describe("the homepage remains indexable", () => {
  it("indexes both locales", () => {
    expect(publicPageMetadata("sq").robots).toEqual({ index: true, follow: true });
    expect(publicPageMetadata("en").robots).toEqual({ index: true, follow: true });
  });
});
