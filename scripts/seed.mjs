// Development-only tenant fixtures: two independent organizations, each with a
// user, an owner membership, and an organization_profiles row. Idempotent.
// Run as the owner:  npm run db:seed  (node --env-file=.env.local scripts/seed.mjs)
//
// These are INFRASTRUCTURE fixtures for inspecting tenant isolation — they are
// NOT the app's fake frontend users and are never promoted to real accounts.
import pg from "pg";

const SLUGS = ["dev-org-a", "dev-org-b"];
const EMAILS = ["dev-a@example.test", "dev-b@example.test"];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
try {
  await pool.query(`delete from organization where slug = any($1)`, [SLUGS]);
  await pool.query(`delete from "user" where email = any($1)`, [EMAILS]);

  const orgs = [];
  for (let i = 0; i < 2; i++) {
    const u = (await pool.query(`insert into "user"(name,email) values($1,$2) returning id`, [`Dev User ${i === 0 ? "A" : "B"}`, EMAILS[i]])).rows[0].id;
    const org = (await pool.query(`insert into organization(name,slug,created_at) values($1,$2,now()) returning id`, [`Dev Org ${i === 0 ? "A" : "B"}`, SLUGS[i]])).rows[0].id;
    await pool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,'owner',now())`, [org, u]);
    // Owner bypasses RLS, so no tenant context needed here.
    await pool.query(`insert into organization_profiles(organization_id,nui,city) values($1,$2,$3)`, [org, `NUI-${i === 0 ? "A" : "B"}`, i === 0 ? "Prishtinë" : "Ferizaj"]);
    await pool.query(
      `insert into organization_accounts(organization_id,plan,commercial_access,trial_started_at,trial_ends_at)
       values($1,'STANDARD','trial',now(),now() + interval '14 days')`,
      [org],
    );
    orgs.push(org);
  }
  console.log("seeded organizations:", orgs.join(", "));
} catch (e) {
  console.error("seed failed:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
