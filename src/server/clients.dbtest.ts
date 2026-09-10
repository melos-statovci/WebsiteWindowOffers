// Phase 4 client vertical-slice integration tests. Two layers, both against the
// Neon dev DB as the restricted role kornizo_app (NOBYPASSRLS):
//
//   1. RLS layer  — raw tenant isolation via runWithOrg (mirrors rls.dbtest):
//      list/get/insert/update/delete can never cross the active org.
//   2. Action layer — the real create/update/delete action cores driven with
//      explicit session headers (mirrors action.dbtest): canonical permissions,
//      validation, org-smuggle immunity, NOT_FOUND non-disclosure, stale roles.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { clients } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/server/actions/client";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p4-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name: `P4 ${who}` }, asResponse: true });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function addMember(orgId: string, userId: string, role: string) {
  await ownerPool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,$3,now())`, [orgId, userId, role]);
}
async function setMemberRole(orgId: string, userId: string, role: string) {
  await ownerPool.query(`update member set role=$3 where organization_id=$1 and user_id=$2`, [orgId, userId, role]);
}
/** Seed a client directly as owner (BYPASSRLS) — RLS-layer fixtures only. */
async function seedClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(`insert into clients(organization_id,name,type) values($1,$2,'Privat') returning id`, [orgId, name]);
  return r.rows[0].id;
}
/** Names visible to a given org context, as the restricted role. */
async function visibleNames(orgId: string): Promise<string[]> {
  return runWithOrg(appDb, orgId, async (tx) => {
    const rows = await tx.select({ name: clients.name }).from(clients).orderBy(clients.name);
    return rows.map((r) => r.name);
  });
}

let ownerACookie = "";
let orgA = "";
let orgB = "";
let salesUserId = "";
let salesCookie = "";
let accountingCookie = "";
let adminUserId = "";
let adminCookie = "";
let a1 = "";
let b1 = "";

beforeAll(async () => {
  const ownerA = await signUp("ownera");
  ownerACookie = ownerA.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerACookie), "Org A", `p4a-${suffix}`);

  const ownerB = await signUp("ownerb");
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerB.cookie), "Org B", `p4b-${suffix}`);

  const sales = await signUp("sales");
  salesUserId = sales.userId;
  salesCookie = sales.cookie;
  await addMember(orgA, salesUserId, "sales");

  const accounting = await signUp("acct");
  accountingCookie = accounting.cookie;
  await addMember(orgA, accounting.userId, "accounting");

  const admin = await signUp("admin");
  adminUserId = admin.userId;
  adminCookie = admin.cookie;
  await addMember(orgA, adminUserId, "admin");

  // RLS-layer fixtures: two clients in A, one in B.
  a1 = await seedClient(orgA, `A1-${suffix}`);
  await seedClient(orgA, `A2-${suffix}`);
  b1 = await seedClient(orgB, `B1-${suffix}`);
}, 60000);

afterAll(async () => {
  // Delete only the orgs (cascades to member/profiles/clients) and users this
  // test created — no memberless test orgs left behind (Phase 5 hygiene fix).
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

// ---------------------------------------------------------------------------
// 1. RLS layer — restricted role, raw isolation
// ---------------------------------------------------------------------------
describe("RLS tenant isolation (restricted role)", () => {
  it("A sees only A's clients, B sees only B's", async () => {
    const a = await visibleNames(orgA);
    expect(a).toEqual(expect.arrayContaining([`A1-${suffix}`, `A2-${suffix}`]));
    expect(a).not.toContain(`B1-${suffix}`);
    expect(await visibleNames(orgB)).toEqual([`B1-${suffix}`]);
  });

  it("A cannot GET B's client by id (returns nothing)", async () => {
    const rows = await runWithOrg(appDb, orgA, (tx) =>
      tx.select({ id: clients.id }).from(clients).where(eq(clients.id, b1)),
    );
    expect(rows).toHaveLength(0);
  });

  it("A cannot UPDATE B's client (0 rows; B unchanged)", async () => {
    const affected = await runWithOrg(appDb, orgA, async (tx) => {
      const r = await tx.execute(sql`update clients set name='HACKED' where id=${b1}`);
      return r.rowCount;
    });
    expect(affected).toBe(0);
    const b = await ownerPool.query(`select name from clients where id=$1`, [b1]);
    expect(b.rows[0].name).toBe(`B1-${suffix}`);
  });

  it("A cannot DELETE B's client (0 rows; B still exists)", async () => {
    const affected = await runWithOrg(appDb, orgA, async (tx) => {
      const r = await tx.execute(sql`delete from clients where id=${b1}`);
      return r.rowCount;
    });
    expect(affected).toBe(0);
    const b = await ownerPool.query(`select count(*)::int n from clients where id=$1`, [b1]);
    expect(b.rows[0].n).toBe(1);
  });

  it("A cannot INSERT a client for another org (WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, (tx) =>
        tx.execute(sql`insert into clients(organization_id,name,type) values(${orgB},'INJECT','Privat')`),
      ),
    ).rejects.toThrow();
  });

  it("A cannot move its own client to another org (UPDATE WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, (tx) =>
        tx.execute(sql`update clients set organization_id=${orgB} where id=${a1}`),
      ),
    ).rejects.toThrow();
    const a = await ownerPool.query(`select organization_id from clients where id=$1`, [a1]);
    expect(a.rows[0].organization_id).toBe(orgA);
  });

  it("no tenant context = no rows", async () => {
    const none = await appPool.query("select name from clients");
    expect(none.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Action layer — real cores, canonical permissions
// ---------------------------------------------------------------------------
describe("createClient action", () => {
  it("owner can create; the row lands in the owner's org", async () => {
    const r = await createClientAction({ name: `New-${suffix}`, type: "Privat" }, H(ownerACookie));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const names = await visibleNames(orgA);
      expect(names).toContain(`New-${suffix}`);
      // Not visible to org B.
      expect(await visibleNames(orgB)).not.toContain(`New-${suffix}`);
    }
  });

  it("sales (client:write) can create", async () => {
    const r = await createClientAction({ name: `Sales-${suffix}`, type: "Biznes" }, H(salesCookie));
    expect(r.ok).toBe(true);
  });

  it("accounting (read-only) is forbidden", async () => {
    const r = await createClientAction({ name: `Acct-${suffix}`, type: "Privat" }, H(accountingCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("unauthenticated is rejected", async () => {
    const r = await createClientAction({ name: "X", type: "Privat" }, new Headers());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects invalid input (empty name, bad email) with field errors", async () => {
    const r1 = await createClientAction({ name: "   ", type: "Privat" }, H(ownerACookie));
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.error.code).toBe("VALIDATION");
      expect(r1.error.fieldErrors?.name?.length).toBeGreaterThan(0);
    }
    const r2 = await createClientAction({ name: "Ok", type: "Privat", email: "not-an-email" }, H(ownerACookie));
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("VALIDATION");
  });

  it("ignores a smuggled organizationId (tenant comes from session only)", async () => {
    const r = await createClientAction(
      { name: `Smuggle-${suffix}`, type: "Privat", organizationId: orgB } as unknown as { name: string; type: "Privat" },
      H(ownerACookie),
    );
    expect(r.ok).toBe(true);
    // Landed in A (session org), NOT the smuggled B.
    expect(await visibleNames(orgA)).toContain(`Smuggle-${suffix}`);
    expect(await visibleNames(orgB)).not.toContain(`Smuggle-${suffix}`);
  });
});

describe("updateClient action", () => {
  it("owner updates own client", async () => {
    const r = await updateClientAction({ id: a1, name: `A1-renamed-${suffix}`, type: "Biznes" }, H(ownerACookie));
    expect(r.ok).toBe(true);
    const row = await ownerPool.query(`select name,type from clients where id=$1`, [a1]);
    expect(row.rows[0]).toEqual({ name: `A1-renamed-${suffix}`, type: "Biznes" });
  });

  it("updating another tenant's client returns NOT_FOUND (no disclosure)", async () => {
    const r = await updateClientAction({ id: b1, name: "HACK", type: "Privat" }, H(ownerACookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    const b = await ownerPool.query(`select name from clients where id=$1`, [b1]);
    expect(b.rows[0].name).toBe(`B1-${suffix}`);
  });

  it("rejects a malformed id", async () => {
    const r = await updateClientAction({ id: "not-a-uuid", name: "X", type: "Privat" }, H(ownerACookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
});

describe("deleteClient action", () => {
  it("admin (client:delete) can delete; sales cannot", async () => {
    const created = await createClientAction({ name: `Del-${suffix}`, type: "Privat" }, H(ownerACookie));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.data.id;

    const denied = await deleteClientAction({ id }, H(salesCookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");

    const ok = await deleteClientAction({ id }, H(adminCookie));
    expect(ok.ok).toBe(true);
    const gone = await ownerPool.query(`select count(*)::int n from clients where id=$1`, [id]);
    expect(gone.rows[0].n).toBe(0);
  });

  it("deleting another tenant's client returns NOT_FOUND", async () => {
    const r = await deleteClientAction({ id: b1 }, H(ownerACookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });
});

describe("authorization staleness", () => {
  it("a member downgraded admin->sales immediately loses delete", async () => {
    const created = await createClientAction({ name: `Stale-${suffix}`, type: "Privat" }, H(ownerACookie));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.data.id;

    await setMemberRole(orgA, adminUserId, "admin");
    // Role is read fresh each call — no re-login needed to see the change.
    await setMemberRole(orgA, adminUserId, "sales");
    const r = await deleteClientAction({ id }, H(adminCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("a removed member can no longer create clients", async () => {
    await ownerPool.query(`delete from member where organization_id=$1 and user_id=$2`, [orgA, salesUserId]);
    const r = await createClientAction({ name: "Nope", type: "Privat" }, H(salesCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["FORBIDDEN", "UNAUTHENTICATED"]).toContain(r.error.code);
  });
});
