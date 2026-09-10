import { describe, it, expect } from "vitest";
import {
  retryTrialApplicationProvisioningSchema,
  trialApplicationSubmitSchema,
} from "@/domain/validation/acquisition";

const base = {
  companyName: "Acme Dritare",
  phone: "+38344555666",
  country: "Kosovë",
  companySize: "6-15" as const,
  formStartedAt: Date.now() - 5000,
};

describe("trialApplicationSubmitSchema — optional offersPerMonth", () => {
  // Regression: a server action drops `undefined` values, so the real browser
  // submission arrives with the key MISSING. Coercing that with Number() used to
  // produce NaN, which reached the integer column and failed the insert.
  it("treats a missing key as absent, not NaN", () => {
    const parsed = trialApplicationSubmitSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.offersPerMonth).toBeUndefined();
  });

  it("treats an explicit undefined as absent", () => {
    const parsed = trialApplicationSubmitSchema.safeParse({ ...base, offersPerMonth: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.offersPerMonth).toBeUndefined();
  });

  it("treats an empty string and null as absent", () => {
    for (const value of ["", null]) {
      const parsed = trialApplicationSubmitSchema.safeParse({ ...base, offersPerMonth: value });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.offersPerMonth).toBeUndefined();
    }
  });

  it("still accepts and coerces a real value", () => {
    const parsed = trialApplicationSubmitSchema.safeParse({ ...base, offersPerMonth: "42" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.offersPerMonth).toBe(42);
  });

  it("still rejects an out-of-range value", () => {
    expect(trialApplicationSubmitSchema.safeParse({ ...base, offersPerMonth: 100001 }).success).toBe(false);
    expect(trialApplicationSubmitSchema.safeParse({ ...base, offersPerMonth: -1 }).success).toBe(false);
  });
});

describe("retryTrialApplicationProvisioningSchema", () => {
  it("accepts only a uuid application id and nothing else", () => {
    const parsed = retryTrialApplicationProvisioningSchema.safeParse({
      id: "3f1c7a90-2b44-4e11-9c8d-5a6b7c8d9e01",
      organizationId: "attacker-supplied",
      status: "provisioned",
    });
    expect(parsed.success).toBe(true);
    // The operator payload can never carry an organization/owner/plan choice.
    if (parsed.success) expect(Object.keys(parsed.data)).toEqual(["id"]);
  });

  it("rejects a malformed id", () => {
    expect(retryTrialApplicationProvisioningSchema.safeParse({ id: "nope" }).success).toBe(false);
  });
});
