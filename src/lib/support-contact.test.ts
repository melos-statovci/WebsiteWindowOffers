import { afterEach, describe, expect, it } from "vitest";
import { supportEmail, supportEmailIsDefault, supportMailto } from "./support-contact";

const ORIGINAL = process.env.KORNIZO_SUPPORT_EMAIL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.KORNIZO_SUPPORT_EMAIL;
  else process.env.KORNIZO_SUPPORT_EMAIL = ORIGINAL;
});

describe("support contact configuration", () => {
  it("falls back to the address the application already shipped with", () => {
    // Not an invented address: this is what /suspended, /account-not-ready, the
    // tenant account panel and the rejected-application page showed before
    // Milestone 5. The fallback keeps behaviour identical when the variable is
    // unset.
    delete process.env.KORNIZO_SUPPORT_EMAIL;
    expect(supportEmail()).toBe("info@arios.systems");
    expect(supportEmailIsDefault()).toBe(true);
  });

  it("is overridden by KORNIZO_SUPPORT_EMAIL", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "support@example.test";
    expect(supportEmail()).toBe("support@example.test");
    expect(supportEmailIsDefault()).toBe(false);
  });

  it("treats a blank or whitespace value as unset", () => {
    // A deployment that defines the variable but leaves it empty must not show
    // customers an empty mailto link.
    process.env.KORNIZO_SUPPORT_EMAIL = "   ";
    expect(supportEmail()).toBe("info@arios.systems");
    expect(supportEmailIsDefault()).toBe(true);
  });

  it("trims surrounding whitespace from a configured value", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "  ops@example.test\n";
    expect(supportEmail()).toBe("ops@example.test");
  });

  it("reads the environment at call time, not at module load", () => {
    // The module is imported by Server Components; a value captured at import
    // time would bake the build machine's environment into the bundle.
    process.env.KORNIZO_SUPPORT_EMAIL = "first@example.test";
    expect(supportEmail()).toBe("first@example.test");
    process.env.KORNIZO_SUPPORT_EMAIL = "second@example.test";
    expect(supportEmail()).toBe("second@example.test");
  });

  it("builds a mailto href from the resolved address", () => {
    process.env.KORNIZO_SUPPORT_EMAIL = "help@example.test";
    expect(supportMailto()).toBe("mailto:help@example.test");
  });
});
