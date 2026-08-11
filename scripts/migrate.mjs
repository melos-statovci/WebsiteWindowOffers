// Apply Drizzle migrations to the target Neon branch using the PRIVILEGED,
// DIRECT connection (DATABASE_MIGRATION_URL). Run with:
//   node --env-file=.env.local scripts/migrate.mjs
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  console.error("DATABASE_MIGRATION_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.log("migrations applied ✓");
} catch (e) {
  console.error("migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
