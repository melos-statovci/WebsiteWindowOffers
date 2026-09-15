import { describe, expect, it } from "vitest";
import {
  accountUnavailableReason,
  effectiveCommercialAccess,
  trialDaysRemaining,
} from "./account-lifecycle";

describe("account lifecycle derivation", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");

  it("derives trial days remaining from timestamps", () => {
    expect(trialDaysRemaining({ now, trialEndsAt: new Date("2026-09-09T11:59:59.000Z") })).toBe(1);
    expect(trialDaysRemaining({ now, trialEndsAt: new Date("2026-09-11T12:00:00.000Z") })).toBe(3);
    expect(trialDaysRemaining({ now, trialEndsAt: new Date("2026-09-08T11:59:59.000Z") })).toBe(0);
  });

  it("derives trial expiration without mutating stored access", () => {
    expect(effectiveCommercialAccess({ commercialAccess: "trial", trialEndsAt: new Date("2026-09-09T12:00:00.000Z"), now })).toBe("trial");
    expect(effectiveCommercialAccess({ commercialAccess: "trial", trialEndsAt: new Date("2026-09-08T12:00:00.000Z"), now })).toBe("trial_expired");
  });

  it("active commercial access ignores old trial dates", () => {
    expect(effectiveCommercialAccess({ commercialAccess: "active", trialEndsAt: new Date("2026-01-01T00:00:00.000Z"), now })).toBe("active");
  });

  it("uses one fail-closed availability classification for tenant access and provider mutations", () => {
    expect(
      accountUnavailableReason({
        accountReady: true,
        status: "active",
        effectiveCommercialAccess: "trial",
      }),
    ).toBeNull();
    expect(
      accountUnavailableReason({
        accountReady: true,
        status: "active",
        effectiveCommercialAccess: "active",
      }),
    ).toBeNull();
    expect(
      accountUnavailableReason({
        accountReady: true,
        status: "active",
        effectiveCommercialAccess: "trial_expired",
      }),
    ).toBe("TRIAL_EXPIRED");
    expect(
      accountUnavailableReason({
        accountReady: true,
        status: "suspended",
        effectiveCommercialAccess: "active",
      }),
    ).toBe("SUSPENDED");
    expect(
      accountUnavailableReason({
        accountReady: false,
        status: "active",
        effectiveCommercialAccess: "account_not_ready",
      }),
    ).toBe("ACCOUNT_NOT_READY");
  });
});
