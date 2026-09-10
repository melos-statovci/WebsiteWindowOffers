import { describe, it, expect } from "vitest";
import { organizationSlugBase, stableProvisioningSlug } from "@/lib/provisioning-slug";

const APP_A = "3f1c7a90-2b44-4e11-9c8d-5a6b7c8d9e01";
const APP_B = "9d2e8b01-4c55-4f22-8a7b-1b2c3d4e5f60";

describe("stableProvisioningSlug", () => {
  it("is deterministic for the same application — the exactly-once key", () => {
    const first = stableProvisioningSlug("Dritare Prishtina", APP_A);
    const second = stableProvisioningSlug("Dritare Prishtina", APP_A);
    expect(first).toBe(second);
  });

  it("differs between applications even with an identical company name", () => {
    expect(stableProvisioningSlug("Dritare Prishtina", APP_A)).not.toBe(
      stableProvisioningSlug("Dritare Prishtina", APP_B),
    );
  });

  it("embeds the application id so a retry cannot drift onto a new slug", () => {
    expect(stableProvisioningSlug("Dritare Prishtina", APP_A)).toBe("dritare-prishtina-3f1c7a90");
  });

  it("stays a valid, bounded slug for awkward company names", () => {
    const slug = stableProvisioningSlug("  Çelësi & Dritaret sh.p.k.  ", APP_A);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-3f1c7a90")).toBe(true);
  });

  it("never produces an empty base", () => {
    expect(stableProvisioningSlug("!!!", APP_A)).toBe("org-3f1c7a90");
    expect(organizationSlugBase("!!!")).toBe("");
  });
});
