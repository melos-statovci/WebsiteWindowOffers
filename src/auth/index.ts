// Better Auth server instance (real runtime).
//
// Canonical for identity + tenancy: users, sessions, accounts, organizations,
// members, invitations, active organization, and member roles. Runs as the
// restricted role kornizo_app (via src/db/client) — never the owner. Teams OFF,
// 2FA OFF, social/passkeys/SSO OFF. IDs are uuid (matches Phase 1 schema).

import { betterAuth } from "better-auth";
import { logServerFailure } from "@/server/safe-log";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ac, roles } from "@/auth/permissions";
import { getTrustedProvisioningIdentity } from "@/auth/provisioning-identity";
import { ensureOrganizationProfile } from "@/auth/organization";
import { ensureDefaultPricing } from "@/server/pricing-init";
import { ensureOrganizationAccount } from "@/server/platform/accounts";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  logger: {
    // Provider messages/arguments can contain ORM parameters or credentials too.
    log: (level, _message, ...args: unknown[]) => {
      const error = args.find((arg) => arg !== null && typeof arg === "object");
      logServerFailure(`auth.provider.${level}`, error);
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      allowUserToCreateOrganization: false,
      disableOrganizationDeletion: true,
      schema: {
        organization: {
          additionalFields: {
            provisioningApplicationId: {
              type: "string",
              required: false,
              input: false,
              returned: false,
            },
            provisioningOwnerId: {
              type: "string",
              required: false,
              input: false,
              returned: false,
            },
          },
        },
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization: org, user }) => {
          const identity = getTrustedProvisioningIdentity();
          if (!identity) return;
          if (user.id !== identity.ownerUserId) {
            throw new Error("Trusted provisioning owner does not match organization creator.");
          }

          // Better Auth 1.6.27 passes this object directly to its organization
          // adapter. Mutating only these input-disabled fields keeps the
          // server-only userId control out of organization data while ensuring
          // the immutable identity is present in the initial INSERT.
          org.provisioningApplicationId = identity.applicationId;
          org.provisioningOwnerId = identity.ownerUserId;
        },
      },
      // New organizations get a business profile row. Best-effort here (the org
      // may not be visible to a separate tenant transaction yet); the app shell
      // re-ensures it authoritatively on first load.
      organizationCreation: {
        afterCreate: async ({ organization: org }: { organization: { id: string } }) => {
          try {
            await ensureOrganizationProfile(org.id);
            // Control-plane account row (default 14-day Standard trial).
            // Best-effort here; trusted provisioning re-ensures it after the
            // Better Auth organization transaction completes.
            await ensureOrganizationAccount(org.id);
            // Seed default pricing (version 1) so the new org can configure/price
            // immediately. Best-effort: the pricing read boundary re-ensures it
            // authoritatively on first read, so this never blocks org creation.
            await ensureDefaultPricing(org.id);
          } catch {
            // Recovered lazily by requireAuthContext()/getActivePriceList().
          }
        },
      },
    }),
    // Must be last: lets server actions/route handlers set auth cookies.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
