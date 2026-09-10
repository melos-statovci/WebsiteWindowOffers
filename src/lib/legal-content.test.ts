// Launch guards for the public legal drafts.
//
// These are not style checks. Each one blocks a specific way a legal page can
// become a lie that a customer or a regulator could rely on: a certification
// that was never obtained, a retention period nobody decided, an availability
// promise with no service agreement behind it, or an invented company identity.
//
// They also assert the visible draft notice is present, so the pages cannot
// quietly start reading as Kornizo's final legal position.

import { describe, expect, it } from "vitest";
import { legalContent, LEGAL_LAST_UPDATED, type LegalDocument } from "./legal-content";

const documents: Array<[string, LegalDocument]> = [
  ["sq/privacy", legalContent.sq.privacy],
  ["sq/terms", legalContent.sq.terms],
  ["en/privacy", legalContent.en.privacy],
  ["en/terms", legalContent.en.terms],
];

function lines(doc: LegalDocument): string[] {
  return [
    doc.title,
    doc.intro,
    doc.draftNotice,
    doc.contactHeading,
    doc.contactBody,
    ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
  ];
}

function fullText(doc: LegalDocument): string {
  return lines(doc).join("\n");
}

/**
 * Sentences that explicitly DENY holding a certification.
 *
 * The privacy draft deliberately names ISO 27001 / SOC 2 / GDPR in order to say
 * Kornizo does NOT hold them. A naive substring guard cannot tell a claim from
 * a disclaimer, so those sentences are excluded from the claim scan and their
 * presence is asserted separately — otherwise the honest disclaimer would be
 * the thing that fails the honesty test.
 */
const DENIAL = /\b(claim no|we have not undergone|nuk pretendojmë|nuk kemi kaluar)\b/i;

/** Document text with the explicit disclaimers removed. */
function claimText(doc: LegalDocument): string {
  return lines(doc)
    .filter((line) => !DENIAL.test(line))
    .join("\n");
}

describe("legal drafts — structure", () => {
  it.each(documents)("%s has a title, intro, sections and a contact block", (_name, doc) => {
    expect(doc.title.length).toBeGreaterThan(0);
    expect(doc.intro.length).toBeGreaterThan(0);
    expect(doc.sections.length).toBeGreaterThanOrEqual(8);
    expect(doc.contactBody.length).toBeGreaterThan(0);
    for (const section of doc.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it.each(documents)("%s carries a visible draft notice", (_name, doc) => {
    expect(doc.draftNotice.length).toBeGreaterThan(20);
    expect(doc.draftNotice.toLowerCase()).toMatch(/draft/);
  });

  it("uses a plain calendar date for 'last updated', not a timestamp", () => {
    // A legal page's update date is a business fact about the document, and
    // must read the same for every visitor regardless of timezone.
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps both locales structurally parallel", () => {
    expect(legalContent.en.privacy.sections.length).toBe(legalContent.sq.privacy.sections.length);
    expect(legalContent.en.terms.sections.length).toBe(legalContent.sq.terms.sections.length);
  });
});

describe("legal drafts — no fabricated compliance claims", () => {
  it.each(documents)("%s claims no certification or audit", (_name, doc) => {
    // Scanned with the explicit disclaimers removed, so only an AFFIRMATIVE
    // mention can fail. Every one of these would be false about Kornizo today.
    const text = claimText(doc);
    expect(text).not.toMatch(/ISO\s?27001/i);
    expect(text).not.toMatch(/SOC\s?2/i);
    expect(text).not.toMatch(/PCI[\s-]?DSS/i);
    expect(text).not.toMatch(/HIPAA/i);
    expect(text).not.toMatch(/certifikuar|certified|certification/i);
    expect(text).not.toMatch(/penetration test|pentest/i);
  });

  it.each(documents)("%s makes no GDPR compliance assertion", (_name, doc) => {
    const text = claimText(doc);
    expect(text).not.toMatch(/GDPR[\s-]?(compliant|compliance|certified)/i);
    expect(text).not.toMatch(/në përputhje të plotë me GDPR/i);
  });

  it("keeps the explicit no-certification disclaimer in the privacy policy", () => {
    // The counterpart to the scan above: the disclaimer must actually be there,
    // not merely permitted.
    expect(fullText(legalContent.en.privacy)).toMatch(
      /We claim no GDPR certification, ISO 27001, SOC 2/i,
    );
    expect(fullText(legalContent.sq.privacy)).toMatch(/Nuk pretendojmë certifikim GDPR/);
  });

  it.each(documents)("%s invents no availability or response guarantee", (_name, doc) => {
    const text = fullText(doc);
    expect(text).not.toMatch(/99\.\d+\s?%/);
    expect(text).not.toMatch(/\bSLA\b/);
    expect(text).not.toMatch(/uptime guarantee|garanci.*disponueshm/i);
    expect(text).not.toMatch(/within \d+ (hours|days)/i);
    expect(text).not.toMatch(/brenda \d+ (orë|ditë(?:sh)?)\b/i);
  });

  it.each(documents)("%s invents no retention or deletion period", (_name, doc) => {
    const text = fullText(doc);
    expect(text).not.toMatch(/\b(30|60|90|180|365)[\s-]?(days|ditë)\b/i);
    expect(text).not.toMatch(/retention period of/i);
  });

  it.each(documents)("%s invents no legal identity or postal contact", (_name, doc) => {
    const text = fullText(doc);
    // No company registration / VAT number, no street address, no phone.
    expect(text).not.toMatch(/\b(L\.?L\.?C|Sh\.?p\.?k|GmbH|Ltd|Inc)\b\.?/);
    expect(text).not.toMatch(/\bVAT\b|\bNIPT\b|\bNUI\b/i);
    expect(text).not.toMatch(/\+\d{2,3}[\s-]?\d{2,}/); // phone number
    expect(text).not.toMatch(/\b(Rr\.|Street|Str\.|Bulevardi)\b/i);
    // The support address is injected at render time, never embedded in copy.
    expect(text).not.toMatch(/@/);
  });

  it.each(documents)("%s publishes no price or billing term", (_name, doc) => {
    const text = fullText(doc);
    // Launch has no self-service billing at all; a price here would be fiction.
    expect(text).not.toMatch(/[€$]\s?\d/);
    expect(text).not.toMatch(/\bper month\b|\bmonthly fee\b|\bnë muaj\b/i);
    expect(text).not.toMatch(/refund|rimbursim/i);
    expect(text).not.toMatch(/Stripe|PayPal/i);
  });
});

describe("legal drafts — Milestone 5.5 contact terminology", () => {
  it("describes contact-request data rather than a demo-only concept", () => {
    // The data flow changed: one contact_requests table with a demo/general
    // intent. The privacy draft must describe what is actually collected.
    expect(fullText(legalContent.en.privacy)).toMatch(/Contact request data/i);
    expect(fullText(legalContent.en.privacy)).toMatch(/both demo requests and general questions/i);
    expect(fullText(legalContent.sq.privacy)).toMatch(/kërkesës për kontakt/i);
  });

  it("still states a contact request creates no account", () => {
    expect(fullText(legalContent.en.privacy)).toMatch(/contact request does not create an account/i);
    expect(fullText(legalContent.sq.privacy)).toMatch(/Kërkesa për kontakt nuk krijon llogari/);
  });

  it("offers a contact route without embedding an address in the copy", () => {
    // The address is injected at render time only when configured; the copy
    // itself carries no address and no Arios identity.
    for (const [, doc] of documents) {
      expect(doc.contactFallback.length).toBeGreaterThan(0);
      expect(fullText(doc)).not.toMatch(/@/);
      expect(fullText(doc)).not.toMatch(/arios/i);
    }
  });
});

describe("legal drafts — matches what the product actually does", () => {
  it("states the trial is 14 days and starts when the account is ready", () => {
    expect(legalContent.en.terms.sections.some((s) => /14-day trial/i.test(s.heading))).toBe(true);
    const en = fullText(legalContent.en.terms);
    expect(en).toMatch(/starts when the account becomes ready/i);
    expect(en).toMatch(/not when the request is submitted/i);
    const sq = fullText(legalContent.sq.terms);
    expect(sq).toMatch(/14 ditë qasje të plotë/);
  });

  it("states an account alone is not tenant access", () => {
    expect(fullText(legalContent.en.terms)).toMatch(/account alone does not grant access/i);
    expect(fullText(legalContent.sq.terms)).toMatch(/Vetëm një llogari nuk jep qasje/);
  });

  it("states expiry and suspension keep data rather than deleting it", () => {
    for (const doc of [legalContent.en.terms, legalContent.en.privacy]) {
      expect(fullText(doc)).toMatch(/deletes? (nothing|no data)|is kept and is not deleted/i);
    }
    expect(fullText(legalContent.sq.terms)).toMatch(/ruhen dhe nuk fshihen|nuk fshin të dhëna/);
  });

  it("states data is not sold and not used to train AI models", () => {
    expect(fullText(legalContent.en.privacy)).toMatch(/do not sell your data/i);
    expect(fullText(legalContent.en.privacy)).toMatch(/do not use your business data to train/i);
    expect(fullText(legalContent.sq.privacy)).toMatch(/Nuk i shesim të dhënat tuaja/);
  });

  it("states there is no impersonation feature", () => {
    expect(fullText(legalContent.en.privacy)).toMatch(/no feature for signing in as you/i);
    expect(fullText(legalContent.sq.privacy)).toMatch(/impersonim/);
  });

  it("introduces no automatic deletion or retention schedule", () => {
    // No automatic deletion exists and none was added in Milestone 5.5.
    for (const [, doc] of documents) {
      const text = fullText(doc);
      expect(text).not.toMatch(/automatically delet|fshihen automatikisht|auto-delete/i);
      expect(text).not.toMatch(/after \d+ (days|months|years)/i);
    }
  });

  it("admits openly where a decision has not been made", () => {
    // The retention/deletion flow genuinely does not exist yet. Saying so is
    // the honest option; inventing a policy is not.
    expect(fullText(legalContent.en.privacy)).toMatch(/decision has not been made/i);
    expect(fullText(legalContent.en.terms)).toMatch(/after legal review/i);
  });
});
