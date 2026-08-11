// HARD GATE: proves tenant isolation is enforced by Postgres RLS, executed as
// the RESTRICTED application role (kornizo_app, NOBYPASSRLS). A pass here using
// the owner role would be meaningless, so this suite never uses the owner for
// assertions — only for hermetic fixture setup/teardown.
//
// Run: npm run test:db   (node --env-file=.env.local vitest --config vitest.db.config.ts)

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import * as schema from "@/db/schema";

const { Pool } = pg;

// Owner pool (BYPASSRLS) — fixtures only.
const ownerPool = new Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
// Restricted app pool, max:1 so every statement reuses ONE physical connection
// (makes the leak proof unambiguous). All assertions run through this.
const appPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;

const SLUGS = ["rlsproof-a", "rlsproof-b", "rlsproof-c"];
const EMAILS = ["rlsproof-a@example.test", "rlsproof-b@example.test"];
let orgA = "";
let orgB = "";
let orgC = ""; // has NO profile — used to prove INSERT WITH CHECK in isolation

async function cleanup() {
  await ownerPool.query(`delete from organization where slug = any($1)`, [SLUGS]);
  await ownerPool.query(`delete from "user" where email = any($1)`, [EMAILS]);
}

/** Rows visible to a given org context, as the restricted role. */
async function visibleNuis(orgId: string): Promise<string[]> {
  return runWithOrg(appDb, orgId, async (tx) => {
    const r = await tx.execute(sql`select nui from organization_profiles order by nui`);
    return (r.rows as { nui: string }[]).map((x) => x.nui);
  });
}

beforeAll(async () => {
  await cleanup();
  const uA = (await ownerPool.query(`insert into "user"(name,email) values('RLS A',$1) returning id`, [EMAILS[0]])).rows[0].id;
  const uB = (await ownerPool.query(`insert into "user"(name,email) values('RLS B',$1) returning id`, [EMAILS[1]])).rows[0].id;
  orgA = (await ownerPool.query(`insert into organization(name,slug,created_at) values('Org A',$1,now()) returning id`, [SLUGS[0]])).rows[0].id;
  orgB = (await ownerPool.query(`insert into organization(name,slug,created_at) values('Org B',$1,now()) returning id`, [SLUGS[1]])).rows[0].id;
  orgC = (await ownerPool.query(`insert into organization(name,slug,created_at) values('Org C',$1,now()) returning id`, [SLUGS[2]])).rows[0].id;
  await ownerPool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,'owner',now())`, [orgA, uA]);
  await ownerPool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,'owner',now())`, [orgB, uB]);
  // Owner bypasses RLS, so these inserts need no tenant context.
  await ownerPool.query(`insert into organization_profiles(organization_id,nui) values($1,'A-NUI')`, [orgA]);
  await ownerPool.query(`insert into organization_profiles(organization_id,nui) values($1,'B-NUI')`, [orgB]);
});

afterAll(async () => {
  await cleanup();
  await appPool.end();
  await ownerPool.end();
});

describe("restricted role sanity", () => {
  it("assertions run as kornizo_app with NOBYPASSRLS", async () => {
    const r = await appPool.query("select current_user, (select rolbypassrls from pg_roles where rolname=current_user) as bypass");
    expect(r.rows[0].current_user).toBe("kornizo_app");
    expect(r.rows[0].bypass).toBe(false);
  });
});

describe("cross-tenant reads", () => {
  it("A sees only A", async () => {
    expect(await visibleNuis(orgA)).toEqual(["A-NUI"]);
  });
  it("B sees only B", async () => {
    expect(await visibleNuis(orgB)).toEqual(["B-NUI"]);
  });
  it("A cannot see B and vice versa", async () => {
    expect(await visibleNuis(orgA)).not.toContain("B-NUI");
    expect(await visibleNuis(orgB)).not.toContain("A-NUI");
  });
});

describe("cross-tenant writes are denied", () => {
  it("A cannot UPDATE B's row (0 rows affected; B unchanged)", async () => {
    const affected = await runWithOrg(appDb, orgA, async (tx) => {
      const r = await tx.execute(sql`update organization_profiles set nui='HACKED' where organization_id=${orgB}`);
      return r.rowCount;
    });
    expect(affected).toBe(0);
    const b = await ownerPool.query(`select nui from organization_profiles where organization_id=$1`, [orgB]);
    expect(b.rows[0].nui).toBe("B-NUI");
  });

  it("A cannot DELETE B's row (0 rows affected; B still exists)", async () => {
    const affected = await runWithOrg(appDb, orgA, async (tx) => {
      const r = await tx.execute(sql`delete from organization_profiles where organization_id=${orgB}`);
      return r.rowCount;
    });
    expect(affected).toBe(0);
    const b = await ownerPool.query(`select count(*)::int as n from organization_profiles where organization_id=$1`, [orgB]);
    expect(b.rows[0].n).toBe(1);
  });

  it("A cannot INSERT a profile for another org (WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, async (tx) => {
        await tx.execute(sql`insert into organization_profiles(organization_id,nui) values(${orgC},'C-INJECT')`);
      }),
    ).rejects.toThrow();
    const c = await ownerPool.query(`select count(*)::int as n from organization_profiles where organization_id=$1`, [orgC]);
    expect(c.rows[0].n).toBe(0);
  });

  it("the same INSERT succeeds under the row's own org context (proves RLS is the cause)", async () => {
    await runWithOrg(appDb, orgC, async (tx) => {
      await tx.execute(sql`insert into organization_profiles(organization_id,nui) values(${orgC},'C-NUI')`);
    });
    const c = await ownerPool.query(`select nui from organization_profiles where organization_id=$1`, [orgC]);
    expect(c.rows[0].nui).toBe("C-NUI");
    await ownerPool.query(`delete from organization_profiles where organization_id=$1`, [orgC]);
  });

  it("A cannot move its own row to another org (UPDATE WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, async (tx) => {
        await tx.execute(sql`update organization_profiles set organization_id=${orgB} where organization_id=${orgA}`);
      }),
    ).rejects.toThrow();
    const a = await ownerPool.query(`select organization_id from organization_profiles where nui='A-NUI'`);
    expect(a.rows[0].organization_id).toBe(orgA);
  });
});

describe("no tenant context = fail closed", () => {
  it("SELECT returns no rows", async () => {
    const r = await appPool.query("select nui from organization_profiles");
    expect(r.rows).toHaveLength(0);
  });
  it("INSERT is rejected", async () => {
    await expect(
      appPool.query("insert into organization_profiles(organization_id,nui) values($1,$2)", [orgA, "NOCTX"]),
    ).rejects.toThrow();
  });
  it("UPDATE affects nothing", async () => {
    const r = await appPool.query("update organization_profiles set nui='x'");
    expect(r.rowCount).toBe(0);
  });
  it("DELETE affects nothing", async () => {
    const r = await appPool.query("delete from organization_profiles");
    expect(r.rowCount).toBe(0);
  });
});

describe("pooled connection does not leak tenant context (HARD GATE)", () => {
  it("A then B then no-context, on a reused single connection", async () => {
    expect(await visibleNuis(orgA)).toEqual(["A-NUI"]);
    expect(await visibleNuis(orgB)).toEqual(["B-NUI"]);
    // Same physical connection (max:1), now without context -> must see nothing.
    const none = await appPool.query("select nui from organization_profiles");
    expect(none.rows).toHaveLength(0);
  });
});

describe("context clears on ROLLBACK", () => {
  it("after a rolled-back withOrg(A), no context remains", async () => {
    await expect(
      runWithOrg(appDb, orgA, async (tx) => {
        const r = await tx.execute(sql`select nui from organization_profiles`);
        expect((r.rows as { nui: string }[]).map((x) => x.nui)).toEqual(["A-NUI"]);
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    const none = await appPool.query("select nui from organization_profiles");
    expect(none.rows).toHaveLength(0);
    // And a fresh B context still works.
    expect(await visibleNuis(orgB)).toEqual(["B-NUI"]);
  });
});
