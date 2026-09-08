import { describe, expect, it } from "vitest";
import { PLAN_TIERS, STANDARD_PLAN, STANDARD_PLAN_NAME, asPlanTier, gatedRoutes, plans } from "./plan";

describe("launch plan model", () => {
  it("exposes only Kornizo Standard as the launch product plan", () => {
    expect(PLAN_TIERS).toEqual(["STANDARD"]);
    expect(plans).toHaveLength(1);
    expect(plans[0].tier).toBe(STANDARD_PLAN);
    expect(plans[0].name).toBe(STANDARD_PLAN_NAME);
  });

  it("normalizes old fake tier values to Standard", () => {
    expect(asPlanTier("SOLO")).toBe("STANDARD");
    expect(asPlanTier("BIZNES")).toBe("STANDARD");
    expect(asPlanTier("FABRIKA")).toBe("STANDARD");
  });

  it("unfinished modules are coming-later placeholders, not paid upgrade gates", () => {
    expect(gatedRoutes["/jobs"].description).toContain("nuk është ende i disponueshëm");
    expect(Object.values(gatedRoutes).every((route) => !("plan" in route))).toBe(true);
  });
});
