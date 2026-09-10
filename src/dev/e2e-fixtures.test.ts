import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
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

// ─────────────────────────────────────────────────────────────────────────────
// Milestone 5K — the DEV fixture path must not be able to become a PRODUCTION
// auth bypass.
//
// The runtime guard above is necessary but not sufficient: it only protects a
// fixture script that someone actually runs. The real production risk is the
// fixture machinery becoming REACHABLE from the deployed application — an app
// route importing a seeding helper, an API route that provisions, or a
// credential env var read inside the bundle. Those are structural properties,
// so they are asserted structurally here rather than trusted to review.
// ─────────────────────────────────────────────────────────────────────────────

const REPO = path.resolve(__dirname, "..", "..");

/** Every .ts/.tsx file under `dir`, excluding test files. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      if (/\.dbtest\.tsx?$|\.test\.tsx?$/.test(entry)) continue;
      out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** Application source: everything the Next.js build can pull in. */
const APPLICATION_DIRS = ["app", "components", "server", "auth", "lib", "hooks", "domain"].map((d) =>
  path.join(REPO, "src", d),
);

const applicationSources = APPLICATION_DIRS.flatMap((dir) => sourceFiles(dir)).map((file) => ({
  file: path.relative(REPO, file),
  text: readFileSync(file, "utf8"),
}));

/** Import/require specifiers only — a mention inside a comment is not a link. */
function importedModules(text: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

describe("DEV E2E fixtures cannot reach production", () => {
  it("has application source to scan", () => {
    // Guards the guard: a broken path glob would make every test below vacuous.
    expect(applicationSources.length).toBeGreaterThan(50);
  });

  it("no application module imports fixture, seed or E2E code", () => {
    const offenders: string[] = [];
    for (const { file, text } of applicationSources) {
      for (const specifier of importedModules(text)) {
        if (/e2e|db\/testing\/fixtures|testing\/fixtures|scripts\//i.test(specifier)) {
          offenders.push(`${file} imports ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no application module reads a KORNIZO_E2E_* environment variable", () => {
    // If the bundle never reads them, a misconfigured production environment
    // cannot activate fixture behaviour, and no fixture password can be
    // inlined into client JavaScript.
    const offenders = applicationSources
      .filter(({ text }) => /KORNIZO_E2E_/.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("exposes no seeding, fixture, impersonation or login-by-query route", () => {
    const routes = sourceFiles(path.join(REPO, "src", "app", "api")).map((f) => path.relative(REPO, f));
    // Better Auth's own catch-all handler is the ONLY API route in the app.
    expect(routes).toEqual(["src/app/api/auth/[...all]/route.ts"]);
  });

  it("never grants a session from a query parameter", () => {
    // A "?loginAs=" / "?asUser=" style shortcut is the classic way a DEV
    // convenience becomes a production authentication bypass.
    const offenders: string[] = [];
    for (const { file, text } of applicationSources) {
      if (/searchParams[^\n]*\b(loginAs|asUser|impersonate|actAs|su)\b/i.test(text)) {
        offenders.push(file);
      }
      if (/\b(impersonateUser|signInAs|loginAs)\s*\(/i.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the trusted provisioning primitive out of every server action", () => {
    // src/server/provisioning.ts uses Better Auth's server-only `userId` path,
    // which bypasses allowUserToCreateOrganization:false. Any "use server"
    // module importing it would hand self-provisioning to ordinary users.
    const offenders: string[] = [];
    for (const { file, text } of applicationSources) {
      const isServerAction = /^\s*["']use server["']/m.test(text);
      if (!isServerAction) continue;
      if (importedModules(text).some((s) => /(^|\/)server\/provisioning$|^\.\/provisioning$/.test(s))) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps fixture credentials out of version control", () => {
    const gitignore = readFileSync(path.join(REPO, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env\.e2e\.local$/m);
    expect(gitignore).toMatch(/^\.env\.local$/m);
    // The tracked contract file declares NAMES only, never a value.
    const example = readFileSync(path.join(REPO, ".env.example"), "utf8");
    for (const line of example.split("\n")) {
      if (!line.includes("=") || line.trimStart().startsWith("#")) continue;
      expect(line.split("=").slice(1).join("=").trim()).toBe("");
    }
  });
});
