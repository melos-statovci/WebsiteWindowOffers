// Better Auth server instance (real runtime).
//
// Canonical for identity + tenancy: users, sessions, accounts, organizations,
// members, invitations, active organization, and member roles. Runs as the
// restricted role kornizo_app (via src/db/client) — never the owner. Teams OFF,
// 2FA OFF, social/passkeys/SSO OFF. IDs are uuid (matches Phase 1 schema).

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ac, roles } from "@/auth/permissions";
import { ensureOrganizationProfile } from "@/auth/organization";
import { ensureDefaultPricing } from "@/server/pricing-init";
import { ensureOrganizationAccount } from "@/server/platform/accounts";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
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
      // New organizations get a business profile row. Best-effort here (the org
      // may not be visible to a separate tenant transaction yet); the app shell
      // re-ensures it authoritatively on first load.
      organizationCreation: {
        afterCreate: async ({ organization: org }: { organization: { id: string } }) => {
          try {
            await ensureOrganizationProfile(org.id);
            // Control-plane account row (default 14-day Standard trial). Best-effort: reads
            // degrade to the same default if it is missing, so this never blocks.
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
