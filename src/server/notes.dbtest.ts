// Phase 8 notes vertical-slice integration tests. Two layers, both against the
// Neon dev DB as the restricted role kornizo_app (NOBYPASSRLS):
//
//   1. RLS layer  — raw tenant isolation via runWithOrg: a note is never visible,
//      updatable or deletable across orgs; a note can never attach to another
//      org's client (composite FK) or be inserted for another org (WITH CHECK).
//   2. Action layer — the real create/delete action cores driven with explicit
//      session headers: canonical permissions (client:write), author snapshot,
//      NOT_FOUND non-disclosure, and ON DELETE CASCADE when the client is removed.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { notes } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createNoteAction, deleteNoteAction } from "@/server/actions/note";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p8n-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string, name: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name }, asResponse: true });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function addMember(orgId: string, userId: string, role: string) {
  await ownerPool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,$3,now())`, [orgId, userId, role]);
}
async function seedClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(`insert into clients(organization_id,name,type) values($1,$2,'Privat') returning id`, [orgId, name]);
  return r.rows[0].id;
}
async function seedNote(orgId: string, clientId: string, text: string): Promise<string> {
  const r = await ownerPool.query(`insert into notes(organization_id,client_id,text) values($1,$2,$3) returning id`, [orgId, clientId, text]);
  return r.rows[0].id;
}
async function visibleTexts(orgId: string): Promise<string[]> {
  return runWithOrg(appDb, orgId, async (tx) => {
    const rows = await tx.select({ text: notes.text }).from(notes).orderBy(notes.text);
    return rows.map((r) => r.text);
  });
}

let ownerACookie = "";
let orgA = "";
let orgB = "";
let salesCookie = "";
let accountingCookie = "";
let clientA = "";
let clientB = "";
let noteB = "";

beforeAll(async () => {
  const ownerA = await signUp("ownera", "Owner A");
  ownerACookie = ownerA.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerACookie), "Org A", `p8na-${suffix}`);

  const ownerB = await signUp("ownerb", "Owner B");
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerB.cookie), "Org B", `p8nb-${suffix}`);

  const sales = await signUp("sales", "Sales Person");
  salesCookie = sales.cookie;
  await addMember(orgA, sales.userId, "sales");

  const accounting = await signUp("acct", "Acct Person");
  accountingCookie = accounting.cookie;
  await addMember(orgA, accounting.userId, "accounting");

  clientA = await seedClient(orgA, `CA-${suffix}`);
  clientB = await seedClient(orgB, `CB-${suffix}`);
  noteB = await seedNote(orgB, clientB, `B-NOTE-${suffix}`);
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

// ---------------------------------------------------------------------------
// 1. RLS layer — restricted role, raw isolation
// ---------------------------------------------------------------------------
describe("RLS tenant isolation (restricted role)", () => {
  it("A never sees B's note", async () => {
    await seedNote(orgA, clientA, `A-NOTE-${suffix}`);
    const a = await visibleTexts(orgA);
    expect(a).toContain(`A-NOTE-${suffix}`);
    expect(a).not.toContain(`B-NOTE-${suffix}`);
    expect(await visibleTexts(orgB)).toEqual([`B-NOTE-${suffix}`]);
  });

  it("A cannot DELETE B's note (0 rows; B's note survives)", async () => {
    const affected = await runWithOrg(appDb, orgA, async (tx) => {
      const r = await tx.execute(sql`delete from notes where id=${noteB}`);
      return r.rowCount;
    });
    expect(affected).toBe(0);
    const b = await ownerPool.query(`select count(*)::int n from notes where id=$1`, [noteB]);
    expect(b.rows[0].n).toBe(1);
  });

  it("A cannot INSERT a note for another org (WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, (tx) =>
        tx.execute(sql`insert into notes(organization_id,client_id,text) values(${orgB},${clientB},'INJECT')`),
      ),
    ).rejects.toThrow();
  });

  it("cannot attach a note to another org's client (composite FK)", async () => {
    // org A context, A's own org id, but B's client id -> (orgA, clientB) not in clients.
    await expect(
      runWithOrg(appDb, orgA, (tx) =>
        tx.execute(sql`insert into notes(organization_id,client_id,text) values(${orgA},${clientB},'CROSS')`),
      ),
    ).rejects.toThrow();
  });

  it("no tenant context = no rows", async () => {
    const none = await appPool.query("select text from notes");
    expect(none.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Action layer — real cores, canonical permissions
// ---------------------------------------------------------------------------
describe("createNote action", () => {
  it("owner can create; note lands in the org with the author snapshot", async () => {
    const r = await createNoteAction({ clientId: clientA, text: `Owner note ${suffix}` }, H(ownerACookie));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const row = await ownerPool.query(`select author_name, organization_id from notes where id=$1`, [r.data.id]);
      expect(row.rows[0].author_name).toBe("Owner A");
      expect(row.rows[0].organization_id).toBe(orgA);
    }
  });

  it("sales (client:write) can create", async () => {
    const r = await createNoteAction({ clientId: clientA, text: `Sales note ${suffix}` }, H(salesCookie));
    expect(r.ok).toBe(true);
  });

  it("accounting (read-only for clients) is forbidden", async () => {
    const r = await createNoteAction({ clientId: clientA, text: "nope" }, H(accountingCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("rejects an empty note with a field error", async () => {
    const r = await createNoteAction({ clientId: clientA, text: "   " }, H(ownerACookie));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
      expect(r.error.fieldErrors?.text?.length).toBeGreaterThan(0);
    }
  });

  it("ignores a smuggled organizationId (tenant comes from session)", async () => {
    const r = await createNoteAction(
      { clientId: clientA, text: `Smuggle ${suffix}`, organizationId: orgB } as unknown as { clientId: string; text: string },
      H(ownerACookie),
    );
    expect(r.ok).toBe(true);
    expect(await visibleTexts(orgA)).toContain(`Smuggle ${suffix}`);
    expect(await visibleTexts(orgB)).not.toContain(`Smuggle ${suffix}`);
  });
});

describe("deleteNote action", () => {
  it("owner deletes own note", async () => {
    const created = await createNoteAction({ clientId: clientA, text: `Del ${suffix}` }, H(ownerACookie));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const r = await deleteNoteAction({ id: created.data.id }, H(ownerACookie));
    expect(r.ok).toBe(true);
    const gone = await ownerPool.query(`select count(*)::int n from notes where id=$1`, [created.data.id]);
    expect(gone.rows[0].n).toBe(0);
  });

  it("deleting another tenant's note returns NOT_FOUND (no disclosure)", async () => {
    const r = await deleteNoteAction({ id: noteB }, H(ownerACookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    const b = await ownerPool.query(`select count(*)::int n from notes where id=$1`, [noteB]);
    expect(b.rows[0].n).toBe(1);
  });
});

describe("client delete cascades its notes", () => {
  it("removing a client removes its notes (ON DELETE CASCADE)", async () => {
    const c = await seedClient(orgA, `Casc-${suffix}`);
    await seedNote(orgA, c, `casc-note-${suffix}`);
    await ownerPool.query(`delete from clients where id=$1`, [c]);
    const n = await ownerPool.query(`select count(*)::int n from notes where client_id=$1`, [c]);
    expect(n.rows[0].n).toBe(0);
  });
});
