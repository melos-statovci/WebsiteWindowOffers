import { createHash } from "node:crypto";

export interface E2eFixtureConfig {
  ownerDatabaseUrl: string;
  runtimeDatabaseUrl: string;
  databaseFingerprint: string;
  password: string;
  platformEmail: string;
  tenantEmail: string;
  applicantEmail: string;
  demoEmail: string;
  tenantOrganizationName: string;
  tenantOrganizationSlug: string;
}

interface DatabaseIdentity {
  protocol: string;
  username: string;
  hostname: string;
  port: string;
  database: string;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for DEV E2E fixtures.`);
  return value;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function databaseIdentity(rawUrl: string): DatabaseIdentity {
  const url = new URL(rawUrl);
  return {
    protocol: url.protocol,
    username: decodeURIComponent(url.username),
    hostname: url.hostname,
    port: url.port,
    database: url.pathname.replace(/^\//, ""),
  };
}

export function databaseFingerprint(rawUrl: string): string {
  const identity = databaseIdentity(rawUrl);
  return createHash("sha256")
    .update(
      [
        identity.protocol,
        identity.username,
        identity.hostname,
        identity.port,
        identity.database,
      ].join("|"),
    )
    .digest("hex");
}

function assertSyntheticEmail(name: string, email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${name} must be a valid email address.`);
  }
  if (!email.endsWith(".test")) {
    throw new Error(`${name} must use a .test domain so fixture scripts cannot target real users.`);
  }
  if (!email.includes("e2e")) {
    throw new Error(`${name} must include "e2e" so fixture intent is obvious.`);
  }
}

export function readE2eFixtureConfig(env: NodeJS.ProcessEnv = process.env): E2eFixtureConfig {
  if (env.KORNIZO_E2E_ALLOW_DEV_FIXTURES !== "true") {
    throw new Error("KORNIZO_E2E_ALLOW_DEV_FIXTURES=true is required.");
  }
  if (env.VERCEL_ENV === "production") {
    throw new Error("Refusing to run DEV E2E fixtures with VERCEL_ENV=production.");
  }

  const ownerDatabaseUrl = requiredEnv(env, "DATABASE_MIGRATION_URL");
  const runtimeDatabaseUrl = requiredEnv(env, "DATABASE_URL");
  const expectedFingerprint = requiredEnv(env, "KORNIZO_E2E_DATABASE_FINGERPRINT");
  const actualFingerprint = databaseFingerprint(ownerDatabaseUrl);
  if (actualFingerprint !== expectedFingerprint) {
    throw new Error("Database fingerprint mismatch. Refusing to touch E2E fixture data.");
  }

  const ownerIdentity = databaseIdentity(ownerDatabaseUrl);
  const runtimeIdentity = databaseIdentity(runtimeDatabaseUrl);
  if (!ownerIdentity.hostname.endsWith(".neon.tech") || !runtimeIdentity.hostname.endsWith(".neon.tech")) {
    throw new Error("DEV E2E fixtures are guarded for Neon development databases only.");
  }
  if (ownerIdentity.database !== runtimeIdentity.database) {
    throw new Error("DATABASE_MIGRATION_URL and DATABASE_URL point at different database names.");
  }

  const platformEmail = normalizeEmail(requiredEnv(env, "KORNIZO_E2E_PLATFORM_EMAIL"));
  const tenantEmail = normalizeEmail(requiredEnv(env, "KORNIZO_E2E_TENANT_EMAIL"));
  const applicantEmail = normalizeEmail(requiredEnv(env, "KORNIZO_E2E_APPLICANT_EMAIL"));
  const demoEmail = normalizeEmail(env.KORNIZO_E2E_DEMO_EMAIL?.trim() || "kornizo-e2e-demo@example.test");
  for (const [name, email] of [
    ["KORNIZO_E2E_PLATFORM_EMAIL", platformEmail],
    ["KORNIZO_E2E_TENANT_EMAIL", tenantEmail],
    ["KORNIZO_E2E_APPLICANT_EMAIL", applicantEmail],
    ["KORNIZO_E2E_DEMO_EMAIL", demoEmail],
  ] as const) {
    assertSyntheticEmail(name, email);
  }

  const uniqueEmails = new Set([platformEmail, tenantEmail, applicantEmail, demoEmail]);
  if (uniqueEmails.size !== 4) throw new Error("E2E fixture emails must be distinct.");

  const tenantOrganizationSlug = (env.KORNIZO_E2E_TENANT_ORG_SLUG?.trim() || "kornizo-e2e-tenant")
    .toLowerCase();
  if (!/^[-a-z0-9]+$/.test(tenantOrganizationSlug) || !tenantOrganizationSlug.includes("e2e")) {
    throw new Error("KORNIZO_E2E_TENANT_ORG_SLUG must be a synthetic slug containing e2e.");
  }

  return {
    ownerDatabaseUrl,
    runtimeDatabaseUrl,
    databaseFingerprint: expectedFingerprint,
    password: requiredEnv(env, "KORNIZO_E2E_PASSWORD"),
    platformEmail,
    tenantEmail,
    applicantEmail,
    demoEmail,
    tenantOrganizationName: env.KORNIZO_E2E_TENANT_ORG_NAME?.trim() || "Kornizo E2E Tenant",
    tenantOrganizationSlug,
  };
}
