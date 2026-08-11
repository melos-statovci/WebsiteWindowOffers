// Better Auth configuration.
//
// PHASE 1 SCOPE: this instance exists so the Better Auth CLI can GENERATE the
// canonical auth Drizzle schema (user/session/account/verification +
// organization/member/invitation). It is NOT yet wired to any route, session,
// or UI — that is Phase 2. Teams OFF, 2FA OFF.
//
// IDs: advanced.database.generateId = "uuid" makes Better Auth emit native
// Postgres `uuid` primary keys / FKs (verified against better-auth 1.6.27), so
// our organization_profiles.organization_id can be a real uuid FK.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "../db/client";

export const auth = betterAuth({
  // Placeholder secret for schema generation only; real secret is supplied via
  // BETTER_AUTH_SECRET in Phase 2 runtime wiring.
  secret: process.env.BETTER_AUTH_SECRET ?? "phase1-schema-generation-placeholder",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [organization()],
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
