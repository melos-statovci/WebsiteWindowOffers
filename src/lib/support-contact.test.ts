import { afterEach, describe, expect, it } from "vitest";
import {
  configuredSupportEmail,
  contactPath,
  supportContactHref,
  usesContactPageFallback,
} from "./support-contact";

const ORIGINAL = process.env.KORNIZO_SUPPORT_EMAIL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.KORNIZO_SUPPORT_EMAIL;
  else process.env.KORNIZO_SUPPORT_EMAIL = ORIGINAL;
});

describe("support contact — no invented or borrowed identity", () => {
  it("has NO default address at all", () => {
    // Milestone 5.5 removed `info@arios.systems`: that is the vendor's own
    // mailbox, not a Kornizo support identity, and Kornizo must not present it
    // publicly as one. Nothing replaced it, because Kornizo's domain has not
    // been chosen and inventing support@kornizo.* would be an address we do not
    // own.
    delete process.env.KORNIZO_SUPPORT_EMAIL;
    expect(configuredSupportEmail()).toBeNull();
    expect(usesContactPageFallback()).toBe(true);
  });

  it("never returns an arios.systems address", () => {
    delete process.env.KORNIZO_SUPPORT_EMAIL;
    expect(configuredSupportEmail() ?? "").not.toMatch(/arios/i);
    expect(supportContactHref()).not.toMatch(/arios/i);
  });

  it("never invents a kornizo.* address", () => {
    delete process.env.KORNIZO_SUPPORT_EMAIL;
    expect(supportContactHref()).not.toMatch(/@kornizo\./i);
  });
});

describe("support contact — configured address", () => {
  it("uses KORNIZO_SUPPORT_EMAIL when set", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "support@example.test";
    expect(configuredSupportEmail()).toBe("support@example.test");
    expect(usesContactPageFallback()).toBe(false);
    expect(supportContactHref()).toBe("mailto:support@example.test");
  });

  it("trims surrounding whitespace", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "  ops@example.test\n";
    expect(configuredSupportEmail()).toBe("ops@example.test");
  });

  it("reads the environment at call time, not at module load", () => {
    // The module is imported by Server Components; a value captured at import
    // time would bake the build machine's environment into the bundle.
    process.env.KORNIZO_SUPPORT_EMAIL = "first@example.test";
    expect(configuredSupportEmail()).toBe("first@example.test");
    process.env.KORNIZO_SUPPORT_EMAIL = "second@example.test";
    expect(configuredSupportEmail()).toBe("second@example.test");
  });
});

describe("support contact — safe fallback to /contact", () => {
  it("falls back to the localized contact page when unset", () => {
    delete process.env.KORNIZO_SUPPORT_EMAIL;
    expect(supportContactHref("sq")).toBe("/contact");
    expect(supportContactHref("en")).toBe("/en/contact");
    // Albanian is the default public locale.
    expect(supportContactHref()).toBe("/contact");
  });

  it("treats a blank value as unset rather than rendering an empty mailto", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "   ";
    expect(configuredSupportEmail()).toBeNull();
    expect(supportContactHref()).toBe("/contact");
  });

  it("treats a malformed value as unset rather than a broken mailto", () => {
    // A typo in a deployment variable must not produce `mailto:not-an-email`.
    for (const bad of ["not-an-email", "@example.test", "user@", "user @example.test"]) {
      process.env.KORNIZO_SUPPORT_EMAIL = bad;
      expect(configuredSupportEmail()).toBeNull();
      expect(supportContactHref()).toBe("/contact");
    }
  });

  it("never produces an empty or undefined mailto in any configuration", () => {
    for (const value of [undefined, "", "  ", "broken", "real@example.test"]) {
      if (value === undefined) delete process.env.KORNIZO_SUPPORT_EMAIL;
      else process.env.KORNIZO_SUPPORT_EMAIL = value;
      const href = supportContactHref();
      expect(href).not.toBe("mailto:");
      expect(href).not.toMatch(/undefined|null/);
      expect(href.length).toBeGreaterThan(0);
    }
  });

  it("exposes the contact paths Albanian-first", () => {
    expect(contactPath("sq")).toBe("/contact");
    expect(contactPath("en")).toBe("/en/contact");
    expect(contactPath()).toBe("/contact");
  });
});
