// Create/refresh the RESTRICTED runtime Postgres role (kornizo_app) and wire a
// restricted runtime connection URL into .env.local. Run as the owner:
//   node --env-file=.env.local scripts/setup-app-role.mjs
//
// The role is LOGIN, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE and is
// granted ONLY the privileges the app needs on our tenant table. It does NOT own
// any table, so the RLS proof cannot pass by privilege. The generated password
// is written straight into .env.local (git-ignored) and never printed/logged.
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const ROLE = "kornizo_app";
const ENV_FILE = ".env.local";

const ownerUrl = process.env.DATABASE_MIGRATION_URL;
if (!ownerUrl) { console.error("DATABASE_MIGRATION_URL not set"); process.exit(1); }

// Hex password: URL-safe and quote-safe for inline SQL.
const password = crypto.randomBytes(24).toString("hex");

const owner = new pg.Client({ connectionString: ownerUrl, connectionTimeoutMillis: 30000 });
await owner.connect();

const exists = (await owner.query("select 1 from pg_roles where rolname=$1", [ROLE])).rowCount > 0;
if (exists) {
  // Only rotate credentials. Changing SUPERUSER/BYPASSRLS attributes (even to
  // NO) requires SUPERUSER, which the owner is not; those were fixed at CREATE.
  await owner.query(`ALTER ROLE ${ROLE} WITH LOGIN PASSWORD '${password}'`);
} else {
  await owner.query(
    `CREATE ROLE ${ROLE} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'`,
  );
}
await owner.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
await owner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE organization_profiles TO ${ROLE}`);
// Platform control-plane tables (see migration 0013). platform_admins is
// SELECT-only so the runtime can authorize but never escalate a platform admin;
// organization_accounts gets SELECT/INSERT/UPDATE (no DELETE — suspension never
// deletes). Both are non-RLS operational-state tables (like Better Auth's own).
// Guarded so this script still works against a DB migrated before 0013.
for (const [table, grant] of [
  ["platform_admins", "SELECT"],
  ["organization_accounts", "SELECT, INSERT, UPDATE"],
  // Append-only audit trail: SELECT + INSERT only (no UPDATE/DELETE).
  ["platform_audit_events", "SELECT, INSERT"],
]) {
  const present = (await owner.query("select 1 from pg_tables where tablename=$1", [table])).rowCount > 0;
  if (present) await owner.query(`GRANT ${grant} ON TABLE ${table} TO ${ROLE}`);
}

const a = (await owner.query(
  "select rolsuper, rolbypassrls, rolcanlogin, rolcreatedb, rolcreaterole from pg_roles where rolname=$1",
  [ROLE],
)).rows[0];
// Hard guard: the runtime role must never be able to bypass RLS.
if (a.rolsuper || a.rolbypassrls) {
  console.error(`FATAL: ${ROLE} has SUPERUSER/BYPASSRLS — refusing to continue.`);
  process.exit(1);
}
const ownsProfiles = (await owner.query(
  "select tableowner from pg_tables where tablename='organization_profiles'",
)).rows[0].tableowner;
await owner.end();

console.log(`role ${ROLE} ${exists ? "updated" : "created"}:`, JSON.stringify(a));
console.log(`organization_profiles owner: ${ownsProfiles} (restricted role owns it: ${ownsProfiles === ROLE})`);

// Build restricted URLs by swapping credentials on the owner URLs.
const swap = (base) => {
  const u = new URL(base);
  u.username = ROLE;
  u.password = password;
  return u.toString();
};
const candidates = [];
if (process.env.DATABASE_URL) candidates.push(["pooled", swap(process.env.DATABASE_URL)]);
if (process.env.DATABASE_URL_UNPOOLED) candidates.push(["direct", swap(process.env.DATABASE_URL_UNPOOLED)]);

let chosen = null;
for (const [label, url] of candidates) {
  const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 });
  try {
    await c.connect();
    const r = await c.query("select current_user, (select rolbypassrls from pg_roles where rolname=current_user) as bypass");
    await c.end();
    console.log(`restricted connectivity via ${label}: OK (user=${r.rows[0].current_user}, bypassrls=${r.rows[0].bypass})`);
    if (!chosen) chosen = { label, url };
  } catch (e) {
    console.log(`restricted connectivity via ${label}: FAILED (${e.message})`);
  }
}

if (!chosen) { console.error("Restricted role cannot connect on any endpoint."); process.exit(1); }

// Write DATABASE_URL = restricted (prefer pooled). Never print the value.
let text = fs.readFileSync(ENV_FILE, "utf8");
const lines = text.split("\n");
let found = false;
for (let i = 0; i < lines.length; i++) {
  if (/^DATABASE_URL=/.test(lines[i])) { lines[i] = "DATABASE_URL=" + chosen.url; found = true; break; }
}
if (!found) lines.push("DATABASE_URL=" + chosen.url);
fs.writeFileSync(ENV_FILE, lines.join("\n"));
console.log(`DATABASE_URL set to restricted ${chosen.label} endpoint (value not shown).`);
