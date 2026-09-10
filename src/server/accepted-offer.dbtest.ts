// Phase 7 Checkpoint A — ACCEPTED-OFFER FREEZE (hard precondition).
//
// Decision: an offer with status "Pranuar" (accepted) is a committed commercial
// document and is FROZEN against value-changing edits. Adding/editing/duplicating/
// deleting items, editing commercial fields (updateProject), and toggling options
// are all rejected with RULE_VIOLATION while accepted. Accepting, archiving and
// deleting stay allowed. To edit, the user must first REOPEN the offer (set its
// status back to a non-accepted value) — a deliberate action. This is what keeps
// the value an invoice is generated from stable, given the Phase 6 edit=reprice
// rule would otherwise let a later pricing change silently rewrite an accepted
// value.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import {
  createProjectAction,
  updateProjectAction,
  setProjectStatusAction,
  setProjectOptionAction,
  archiveProjectAction,
  addProjectItemAction,
  updateProjectItemAction,
  duplicateProjectItemAction,
  deleteProjectItemAction,
} from "@/server/actions/project";
import type { WindowConfig } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p7f-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P7F ${who}` },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function createClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into clients(organization_id, name, type) values($1,$2,'Privat') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}

const cfg: WindowConfig = {
  productType: "Dritare",
  modelType: "njeshe",
  widthMm: 1000,
  heightMm: 1200,
  systemId: "s1",
  color: "white",
  mechanismId: "Roto NX",
  glassId: "g1",
  roleta: false,
  shtesa: [],
  openings: {},
};

let ownerCookie = "";
let orgA = "";
let clientA = "";

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "P7F A", `p7f-a-${suffix}`);
  clientA = await createClient(orgA, "Client A");
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await ownerPool.end();
});

describe("accepted-offer freeze", () => {
  it("blocks value edits once accepted, and allows them again after reopen", async () => {
    // Create + add an item while still a draft.
    const c = await createProjectAction({ clientId: clientA, title: "Freeze", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup: create");
    const projectId = c.data.id;
    const add1 = await addProjectItemAction({ projectId, config: cfg, qty: 1 }, H(ownerCookie));
    if (!add1.ok) throw new Error("setup: add item");
    const itemId = add1.data.id;

    // Accept the offer.
    const accept = await setProjectStatusAction({ id: projectId, status: "Pranuar" }, H(ownerCookie));
    expect(accept.ok).toBe(true);

    // Every value-changing edit is now blocked with RULE_VIOLATION.
    const addBlocked = await addProjectItemAction({ projectId, config: cfg, qty: 1 }, H(ownerCookie));
    expect(addBlocked.ok).toBe(false);
    if (!addBlocked.ok) expect(addBlocked.error.code).toBe("RULE_VIOLATION");

    const updBlocked = await updateProjectItemAction(
      { projectId, itemId, config: { ...cfg, widthMm: 1100 }, qty: 2 },
      H(ownerCookie),
    );
    expect(updBlocked.ok).toBe(false);
    if (!updBlocked.ok) expect(updBlocked.error.code).toBe("RULE_VIOLATION");

    const dupBlocked = await duplicateProjectItemAction({ projectId, itemId }, H(ownerCookie));
    expect(dupBlocked.ok).toBe(false);
    if (!dupBlocked.ok) expect(dupBlocked.error.code).toBe("RULE_VIOLATION");

    const delBlocked = await deleteProjectItemAction({ projectId, itemId }, H(ownerCookie));
    expect(delBlocked.ok).toBe(false);
    if (!delBlocked.ok) expect(delBlocked.error.code).toBe("RULE_VIOLATION");

    const projUpdBlocked = await updateProjectAction(
      { id: projectId, title: "Freeze2", vatRate: 0.2 },
      H(ownerCookie),
    );
    expect(projUpdBlocked.ok).toBe(false);
    if (!projUpdBlocked.ok) expect(projUpdBlocked.error.code).toBe("RULE_VIOLATION");

    const optBlocked = await setProjectOptionAction(
      { id: projectId, key: "Zbritje", value: true },
      H(ownerCookie),
    );
    expect(optBlocked.ok).toBe(false);
    if (!optBlocked.ok) expect(optBlocked.error.code).toBe("RULE_VIOLATION");

    // Archiving an accepted offer stays allowed (not a value edit)...
    const arch = await archiveProjectAction({ id: projectId, archived: true }, H(ownerCookie));
    expect(arch.ok).toBe(true);
    await archiveProjectAction({ id: projectId, archived: false }, H(ownerCookie));

    // Reopen (deliberate) -> edits allowed again.
    const reopen = await setProjectStatusAction({ id: projectId, status: "Dërguar" }, H(ownerCookie));
    expect(reopen.ok).toBe(true);
    const updOk = await updateProjectItemAction(
      { projectId, itemId, config: { ...cfg, widthMm: 1100 }, qty: 2 },
      H(ownerCookie),
    );
    expect(updOk.ok).toBe(true);
  });
});
