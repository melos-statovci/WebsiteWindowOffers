import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { databaseFingerprint, readE2eFixtureConfig } from "../../scripts/e2e-guard";

const ownerUrl = "postgresql://owner@ep-dev-fixture.neon.tech/kornizo_dev?sslmode=require";
const runtimeUrl = "postgresql://kornizo_app@ep-dev-fixture.neon.tech/kornizo_dev?sslmode=require";

function env(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    KORNIZO_E2E_ALLOW_DEV_FIXTURES: "true",
    DATABASE_MIGRATION_URL: ownerUrl,
    DATABASE_URL: runtimeUrl,
    KORNIZO_E2E_DATABASE_FINGERPRINT: databaseFingerprint(ownerUrl),
    KORNIZO_E2E_PASSWORD: randomUUID(),
    KORNIZO_E2E_PLATFORM_EMAIL: "kornizo-e2e-platform@example.test",
    KORNIZO_E2E_TENANT_EMAIL: "kornizo-e2e-tenant@example.test",
    KORNIZO_E2E_APPLICANT_EMAIL: "kornizo-e2e-applicant@example.test",
    KORNIZO_E2E_DEMO_EMAIL: "kornizo-e2e-demo@example.test",
    ...overrides,
  };
}

describe("DEV E2E fixture guard", () => {
  it("requires the explicit fixture allow flag", () => {
    expect(() => readE2eFixtureConfig(env({ KORNIZO_E2E_ALLOW_DEV_FIXTURES: undefined }))).toThrow(
      /ALLOW_DEV_FIXTURES/,
    );
  });

  it("refuses a mismatched database fingerprint", () => {
    expect(() => readE2eFixtureConfig(env({ KORNIZO_E2E_DATABASE_FINGERPRINT: "wrong" }))).toThrow(
      /fingerprint mismatch/i,
    );
  });

  it("requires synthetic .test fixture emails", () => {
    expect(() => readE2eFixtureConfig(env({ KORNIZO_E2E_PLATFORM_EMAIL: "admin@example.com" }))).toThrow(
      /\.test/,
    );
  });

  it("accepts the configured synthetic DEV fixture shape", () => {
    const config = readE2eFixtureConfig(env());
    expect(config.platformEmail).toBe("kornizo-e2e-platform@example.test");
    expect(config.tenantOrganizationSlug).toBe("kornizo-e2e-tenant");
  });
});
