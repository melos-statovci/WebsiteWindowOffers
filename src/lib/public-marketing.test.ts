import { describe, expect, it } from "vitest";
import {
  publicMarketing,
} from "./public-marketing";
import { localizedPath } from "./public-routing";

const serializedMarketing = JSON.stringify({
  publicMarketing,
});

/** Every string value in the marketing dictionaries. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}

/**
 * Sentences that explicitly DENY inventing something. They must be excluded
 * from the fake-claim scans below, or the honest disclaimer becomes the thing
 * that fails the honesty test. Their presence is asserted separately.
 */
const DENIAL = /\b(nuk shpikim|are invented|nuk publikojmë)\b/i;

/** All marketing copy except the explicit denials. */
const claimStrings = collectStrings(publicMarketing)
  .filter((line) => !DENIAL.test(line))
  .join("\n");

describe("public marketing launch constraints", () => {
  it("links to privacy and terms in the footer of both languages", () => {
    // A launch-ready public site needs reachable legal pages; before
    // Milestone 5 the footer carried neither, and neither did any other page.
    expect(publicMarketing.sq.footer.privacy).toBe("Privatësia");
    expect(publicMarketing.sq.footer.terms).toBe("Kushtet");
    expect(publicMarketing.en.footer.privacy).toBe("Privacy");
    expect(publicMarketing.en.footer.terms).toBe("Terms");
  });

  it("labels a footer contact in both languages", () => {
    // The address itself is injected from src/lib/support-contact.ts at render
    // time, so it is deliberately NOT part of the content dictionary.
    expect(publicMarketing.sq.footer.contactLabel).toBe("Kontakt");
    expect(publicMarketing.en.footer.contactLabel).toBe("Contact");
    expect(serializedMarketing).not.toContain("@");
  });

  it("makes no fake social proof or certification claim", () => {
    // Launch has no customers to count, no testimonials and no certification.
    //
    // Scanned over CLAIM strings only. The dictionary deliberately contains two
    // sentences that DENY inventing testimonials/pricing ("Nuk shpikim ..." /
    // "... are invented"), and a "Dëshmi produkti" (product proof) heading that
    // introduces product capabilities, not customer praise. A blunt substring
    // scan would fail on exactly the honest copy this test wants to protect.
    expect(claimStrings).not.toMatch(/ISO\s?27001|SOC\s?2|GDPR[\s-]?compliant/i);
    expect(claimStrings).not.toMatch(/\d[\d.,]*\+?\s*(companies|kompani të|customers|klientë|users|përdorues)\b/i);
    expect(claimStrings).not.toMatch(/trusted by|besuar nga/i);
    expect(claimStrings).not.toMatch(/dëshmi (klient|e klient)/i);
    expect(claimStrings).not.toMatch(/\d\s*\/\s*5|★|⭐/);
  });

  it("keeps the explicit no-invented-proof statement in both languages", () => {
    // The counterpart to the scan above.
    expect(publicMarketing.sq.faq.description).toContain("Nuk shpikim");
    expect(publicMarketing.en.faq.description).toContain("are invented");
  });

  it("keeps the acquisition promise accurate: approval-gated 14-day trial", () => {
    // These are the three facts the acquisition flow actually implements.
    expect(serializedMarketing).toMatch(/14/);
    expect(serializedMarketing).not.toMatch(/instant access|qasje e menjëhershme|no approval|pa aprovim/i);
    expect(serializedMarketing).not.toMatch(/coming soon|së shpejti|opening soon|hapet së shpejti/i);
    expect(serializedMarketing).not.toMatch(/credit card|kartë krediti/i);
  });

  it("presents Kornizo Standard as the only plan in both public languages", () => {
    expect(publicMarketing.sq.standard.plan.name).toBe("Kornizo Standard");
    expect(publicMarketing.en.standard.plan.name).toBe("Kornizo Standard");
    expect(serializedMarketing).not.toMatch(/\b(SOLO|BIZNES|FABRIKA|Starter|Pro|Enterprise)\b/);
  });

  it("does not publish invented pricing", () => {
    expect(serializedMarketing).not.toMatch(/\$|€|per month|monthly|annual|discount|setup fee|save \d+/i);
  });

  it("uses Albanian as the default public locale and keeps English available", () => {
    expect(publicMarketing.sq.basePath).toBe("/");
    expect(publicMarketing.sq.hero.title).toContain("Nga konfigurimi");
    expect(publicMarketing.en.basePath).toBe("/en");
    expect(publicMarketing.en.hero.title).toContain("From window configuration");
  });

  it("keeps both workflows centered on the same customer-to-payment journey", () => {
    expect(publicMarketing.en.workflow.steps.map((step) => step.title)).toEqual([
      "Add the customer",
      "Configure windows and doors",
      "Calculate the price",
      "Create and track the offer",
      "Invoice the customer",
      "Track payment",
    ]);
    expect(publicMarketing.sq.workflow.steps.map((step) => step.title)).toEqual([
      "Shto klientin",
      "Konfiguro dritaret dhe dyert",
      "Llogarit çmimin",
      "Krijo dhe ndiq ofertën",
      "Lësho faturën",
      "Ndiq pagesën",
    ]);
  });

  it("keeps localized request pages truthful about review and demo boundaries", () => {
    expect(publicMarketing.en.temporaryCtaPages.trial.description).toContain("Submit a company application");
    expect(publicMarketing.en.temporaryCtaPages.demo.noFormNotice).toContain("does not create a Kornizo account");
    expect(publicMarketing.sq.temporaryCtaPages.trial.noFormNotice).toContain("ruan një Trial Application");
    expect(publicMarketing.sq.temporaryCtaPages.demo.description).toContain("ndjekje të brendshme");
  });

  it("maps language switch targets to equivalent public pages", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("sq", "/en")).toBe("/");
    expect(localizedPath("en", "/request-trial")).toBe("/en/request-trial");
    expect(localizedPath("sq", "/en/request-demo")).toBe("/request-demo");
    expect(localizedPath("en", "/application-status")).toBe("/en/application-status");
    expect(localizedPath("sq", "/en/application-status")).toBe("/application-status");
  });
});
