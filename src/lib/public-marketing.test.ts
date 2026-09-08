import { describe, expect, it } from "vitest";
import {
  faqItems,
  featureGroups,
  standardPlan,
  temporaryCtaPages,
  workflowSteps,
} from "./public-marketing";

const serializedMarketing = JSON.stringify({
  faqItems,
  featureGroups,
  standardPlan,
  temporaryCtaPages,
  workflowSteps,
});

describe("public marketing launch constraints", () => {
  it("presents Kornizo Standard as the only plan without old or fake tiers", () => {
    expect(standardPlan.name).toBe("Kornizo Standard");
    expect(serializedMarketing).not.toMatch(/\b(SOLO|BIZNES|FABRIKA|Starter|Pro|Enterprise)\b/);
  });

  it("does not publish invented pricing", () => {
    expect(serializedMarketing).not.toMatch(/\$|€|per month|monthly|annual|discount|setup fee|save \d+/i);
  });

  it("keeps the workflow centered on window and door businesses", () => {
    expect(workflowSteps.map((step) => step.title)).toEqual([
      "Add the customer",
      "Configure windows and doors",
      "Calculate the price",
      "Create and track the offer",
      "Invoice the customer",
      "Track payment",
    ]);
  });

  it("keeps temporary trial and demo pages non-persisting", () => {
    expect(temporaryCtaPages.trial.description).toContain("application flow is not open yet");
    expect(temporaryCtaPages.demo.description).toContain("intentionally non-persisting");
  });
});
