import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { ensureOrganizationProfile } from "@/auth/organization";
import { ensureDefaultPricing } from "@/server/pricing-init";
import { ensureOrganizationAccount } from "@/server/platform/accounts";

export interface TrustedOrganizationProvisioningInput {
  userId: string;
  name: string;
  slug?: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

/**
 * Trusted server-only provisioning primitive for Milestone 4.
 *
 * This intentionally has no "use server" wrapper and is not imported by public
 * routes/actions. Better Auth rejects normal session-based organization creation;
 * this uses its server-only userId path so an authorized platform workflow can
 * later create the tenant, owner membership, profile, account and pricing.
 */
export async function createTrustedProvisionedOrganization(input: TrustedOrganizationProvisioningInput) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Provisioning requires an organization name.");
  const organization = await auth.api.createOrganization({
    body: {
      name,
      slug: input.slug ?? slugify(name),
      userId: input.userId,
    },
  });
  const org = organization as { id: string };
  await ensureOrganizationProfile(org.id);
  await ensureOrganizationAccount(org.id);
  await ensureDefaultPricing(org.id);
  return organization;
}
