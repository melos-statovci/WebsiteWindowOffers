import { describe, expect, it } from "vitest";
import { accessLine, daysCount, daysRemaining, trialEndsIn, NEAR_EXPIRY_DAYS } from "./trial-copy";

describe("trial copy — Albanian grammar", () => {
  it("does not inflect 'ditë' after a numeral", () => {
    // Albanian keeps the counting form invariant: "1 ditë", "2 ditë", "11 ditë".
    expect(daysCount(1)).toBe("1 ditë");
    expect(daysCount(2)).toBe("2 ditë");
    expect(daysCount(11)).toBe("11 ditë");
    expect(daysCount(14)).toBe("14 ditë");
  });

  it("uses the singular ablative 'dite' for one day and 'ditësh' for more", () => {
    // This is the bug being fixed: the pre-Milestone-5 banner said
    // "pas 1 ditësh", using the plural ablative with a singular count.
    expect(trialEndsIn(1)).toContain("pas 1 dite.");
    expect(trialEndsIn(1)).not.toContain("ditësh");
    expect(trialEndsIn(2)).toContain("pas 2 ditësh.");
    expect(trialEndsIn(3)).toContain("pas 3 ditësh.");
  });

  it("never says 'pas 0 ditësh' for a trial with hours left", () => {
    // trialDaysRemaining is a ceil(), so 0 means the trial is valid but has
    // less than a day left. "after 0 days" is both ungrammatical and untrue.
    const text = trialEndsIn(0);
    expect(text).toBe("Trial i Kornizo Standard përfundon brenda ditës.");
    expect(text).not.toContain("0");
    expect(text).not.toContain("pas");
  });

  it("keeps the remaining-days phrasing consistent", () => {
    expect(daysRemaining(1)).toBe("1 ditë të mbetura");
    expect(daysRemaining(9)).toBe("9 ditë të mbetura");
  });

  it("clamps negative and fractional day counts", () => {
    // A stale client render must never produce "-1 ditë".
    expect(daysCount(-3)).toBe("0 ditë");
    expect(daysRemaining(-1)).toBe("0 ditë të mbetura");
    expect(daysCount(2.9)).toBe("2 ditë");
    expect(trialEndsIn(-5)).toBe("Trial i Kornizo Standard përfundon brenda ditës.");
  });
});

describe("trial copy — English", () => {
  it("pluralizes day/days correctly", () => {
    expect(daysCount(1, "en")).toBe("1 day");
    expect(daysCount(4, "en")).toBe("4 days");
    expect(daysRemaining(1, "en")).toBe("1 day left");
    expect(daysRemaining(4, "en")).toBe("4 days left");
    expect(trialEndsIn(1, "en")).toContain("in 1 day.");
    expect(trialEndsIn(4, "en")).toContain("in 4 days.");
    expect(trialEndsIn(0, "en")).toBe("Your Kornizo Standard trial ends today.");
  });
});

describe("trial copy — sidebar access line", () => {
  it("shows the trial with its remaining days", () => {
    expect(accessLine({ effectiveCommercialAccess: "trial", trialDaysRemaining: 11 })).toEqual({
      text: "Trial · 11 ditë",
      nearExpiry: false,
    });
  });

  it("flags near expiry at the threshold but not above it", () => {
    expect(
      accessLine({ effectiveCommercialAccess: "trial", trialDaysRemaining: NEAR_EXPIRY_DAYS }).nearExpiry,
    ).toBe(true);
    expect(
      accessLine({ effectiveCommercialAccess: "trial", trialDaysRemaining: NEAR_EXPIRY_DAYS + 1 }).nearExpiry,
    ).toBe(false);
  });

  it("says 'Klient aktiv' for an activated customer and never flags expiry", () => {
    // An ACTIVE customer must not be described in trial language, and a
    // historical trial_ends_at must not make their line turn amber.
    const line = accessLine({ effectiveCommercialAccess: "active", trialDaysRemaining: 0 });
    expect(line).toEqual({ text: "Klient aktiv", nearExpiry: false });
  });

  it("does not describe an expired trial as an active trial", () => {
    const line = accessLine({ effectiveCommercialAccess: "trial_expired", trialDaysRemaining: 0 });
    expect(line.text).not.toContain("Trial ·");
    expect(line.nearExpiry).toBe(false);
  });
});
