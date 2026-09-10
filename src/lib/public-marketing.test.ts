import { describe, expect, it } from "vitest";
import {
  publicMarketing,
} from "./public-marketing";
import { localizedPath } from "./public-routing";

const serializedMarketing = JSON.stringify({
  publicMarketing,
});

describe("public marketing launch constraints", () => {
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
