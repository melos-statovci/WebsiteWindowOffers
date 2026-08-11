import { defineConfig } from "drizzle-kit";

// Migrations run against the DIRECT / UNPOOLED endpoint with the privileged
// (owner) role — DDL over PgBouncer transaction pooling is unreliable, and the
// restricted runtime role intentionally cannot create tables / policies.
//
// DATABASE_MIGRATION_URL = direct + owner (admin). Never the pooled runtime URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL!,
  },
  // Keep Better Auth's tables in the diff but never let drizzle-kit rewrite
  // their internals; we only ever add our own tables/policies alongside them.
  strict: true,
  verbose: true,
});
