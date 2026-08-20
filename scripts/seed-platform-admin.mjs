// Bootstrap / manage PLATFORM ADMINS. This is the ONLY sanctioned way to grant
// platform-operator authority — deliberately out-of-band, requiring DB OWNER
// credentials, so it can never be triggered from the running app or a browser.
// The dashboard does NOT grant platform admins in V1 (see PLATFORM_ADMIN_HANDOFF).
//
// Usage (owner connection):
//   PLATFORM_ADMIN_EMAIL=you@example.com node --env-file=.env.local scripts/seed-platform-admin.mjs
//   node --env-file=.env.local scripts/seed-platform-admin.mjs --list
//   PLATFORM_ADMIN_EMAIL=you@example.com node --env-file=.env.local scripts/seed-platform-admin.mjs --revoke
//
// The target user must already exist (a normal Better Auth sign-up). Granting
// platform admin does NOT change their org roles or their tenant access.

import pg from "pg";

const ownerUrl = process.env.DATABASE_MIGRATION_URL;
if (!ownerUrl) {
  console.error("DATABASE_MIGRATION_URL not set (owner connection required).");
  process.exit(1);
}

const args = process.argv.slice(2);
const list = args.includes("--list");
const revoke = args.includes("--revoke");
const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();

const c = new pg.Client({ connectionString: ownerUrl, connectionTimeoutMillis: 30000 });
await c.connect();

if (list) {
  const r = await c.query(
    `select pa.user_id, pa.email, pa.note, pa.created_at
     from platform_admins pa order by pa.created_at asc`,
  );
  console.log(`platform_admins (${r.rowCount}):`);
  for (const row of r.rows) console.log(`  - ${row.email || "(no email)"}  [${row.user_id}]  ${row.note ?? ""}`);
  await c.end();
  process.exit(0);
}

if (!email) {
  console.error("Set PLATFORM_ADMIN_EMAIL=<user email> (or pass --list).");
  await c.end();
  process.exit(1);
}

const u = await c.query(`select id, email from "user" where lower(email) = $1 limit 1`, [email]);
if (u.rowCount === 0) {
  console.error(`No user found with email ${email}. They must sign up first.`);
  await c.end();
  process.exit(1);
}
const userId = u.rows[0].id;

if (revoke) {
  const r = await c.query(`delete from platform_admins where user_id = $1`, [userId]);
  console.log(r.rowCount ? `Revoked platform admin: ${email}` : `${email} was not a platform admin.`);
  await c.end();
  process.exit(0);
}

await c.query(
  `insert into platform_admins (user_id, email, note)
   values ($1, $2, 'bootstrap seed')
   on conflict (user_id) do update set email = excluded.email`,
  [userId, u.rows[0].email],
);
console.log(`Granted platform admin: ${email} [${userId}]`);
await c.end();
