// Phase 6 Checkpoint B — project/item action-layer integration tests. Runs against
// the Neon dev DB as the restricted role kornizo_app via the real action cores
// (driven with explicit session headers) plus RLS-scoped reads that mirror the
// server read boundary. Covers the HARD Phase 6 proofs:
//   - canonical permissions (accounting read-only, operator no delete/accept, ...)
//   - tenant-safe sequential offer numbering
//   - SERVER-AUTHORITATIVE pricing (stored price == computePrice; browser price
//     fields are ignored / cannot lower or raise the stored price)
//   - historical pricing: an item created under vN keeps its price + version when
//     pricing advances to vN+1; a NEW item uses vN+1
//   - edit = reprice against current active pricing (deliberate rule)
//   - stale-preview CONFLICT
//   - same-org sharing + cross-org isolation (read/create/update/delete/attach)
//   - derived project totals
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { projects } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { ensureActivePriceList } from "@/server/pricing-init";
import { parsePricingCatalog } from "@/domain/validation/pricing";
import { savePricingAction } from "@/server/actions/pricing";
import {
  createProjectAction,
  updateProjectAction,
  setProjectStatusAction,
  deleteProjectAction,
  addProjectItemAction,
  updateProjectItemAction,
  deleteProjectItemAction,
} from "@/server/actions/project";
import { computePrice } from "@/domain/configurator/window-calc";
import { projectTotal } from "@/domain/finance/selectors";
import { defaultPricingCatalog } from "@/domain/pricing/defaults";
import type { PricingCatalog } from "@/domain/pricing/types";
import type { WindowConfig } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p6b-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: email(who), password: PW, name: `P6B ${who}` },
    asResponse: true,
  });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function addMember(orgId: string, userId: string, role: string) {
  await ownerPool.query(
    `insert into member(organization_id,user_id,role,created_at) values($1,$2,$3,now())`,
    [orgId, userId, role],
  );
}
async function createClient(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(
    `insert into clients(organization_id, name, type) values($1,$2,'Privat') returning id`,
    [orgId, name],
  );
  return r.rows[0].id as string;
}
async function activeCatalog(orgId: string): Promise<{ version: number; catalog: PricingCatalog }> {
  // Ensure (and COMMIT) the baseline version first, then read it on the owner
  // pool — the ensure runs in its own RLS transaction so the read sees it.
  await runWithOrg(appDb, orgId, (tx) => ensureActivePriceList(tx, orgId));
  const r = await ownerPool.query(
    `select version, catalog from price_lists where organization_id=$1 and is_active`,
    [orgId],
  );
  return { version: r.rows[0].version, catalog: parsePricingCatalog(r.rows[0].catalog) };
}
async function itemRow(id: string) {
  const r = await ownerPool.query(
    `select unit_price, price_list_version, calculation_version, calc_snapshot from project_items where id=$1`,
    [id],
  );
  return r.rows[0] as
    | { unit_price: string; price_list_version: number; calculation_version: number; calc_snapshot: Record<string, unknown> }
    | undefined;
}
/** RLS-scoped read that mirrors the server read boundary's tenant visibility. */
async function projectsVisibleTo(orgId: string): Promise<string[]> {
  return runWithOrg(appDb, orgId, async (tx) => {
    const rows = await tx.select({ id: projects.id }).from(projects);
    return rows.map((r) => r.id);
  });
}

// Fixed single 1000×1200 window (the calc regression fixture).
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
let ownerBCookie = "";
let salesCookie = "";
let operatorCookie = "";
let accountingCookie = "";
let user2Cookie = "";
let orgA = "";
let orgB = "";
let clientA = "";

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "P6B A", `p6b-a-${suffix}`);

  const ownerB = await signUp("ownerb");
  ownerBCookie = ownerB.cookie;
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerBCookie), "P6B B", `p6b-b-${suffix}`);

  const sales = await signUp("sales");
  salesCookie = sales.cookie;
  await addMember(orgA, sales.userId, "sales");
  const operator = await signUp("operator");
  operatorCookie = operator.cookie;
  await addMember(orgA, operator.userId, "operator");
  const accounting = await signUp("acct");
  accountingCookie = accounting.cookie;
  await addMember(orgA, accounting.userId, "accounting");
  const user2 = await signUp("user2");
  user2Cookie = user2.cookie;
  await addMember(orgA, user2.userId, "operator");

  clientA = await createClient(orgA, "Client A");
  await activeCatalog(orgA);
  await activeCatalog(orgB);
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

describe("project permissions", () => {
  it("accounting cannot create a project (read-only)", async () => {
    const r = await createProjectAction({ clientId: clientA, title: "X", vatRate: 0.18 }, H(accountingCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });
  it("unauthenticated is rejected", async () => {
    const r = await createProjectAction({ clientId: clientA, title: "X", vatRate: 0.18 }, new Headers());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHENTICATED");
  });
  it("operator cannot delete a project; owner can", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "ToDelete", vatRate: 0.18 }, H(ownerCookie));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const denied = await deleteProjectAction({ id: c.data.id }, H(operatorCookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
    const ok = await deleteProjectAction({ id: c.data.id }, H(ownerCookie));
    expect(ok.ok).toBe(true);
  });
  it("operator cannot accept an offer; sales can", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Accept?", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const denied = await setProjectStatusAction({ id: c.data.id, status: "Pranuar" }, H(operatorCookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
    const ok = await setProjectStatusAction({ id: c.data.id, status: "Pranuar" }, H(salesCookie));
    expect(ok.ok).toBe(true);
  });
});

describe("tenant-safe offer numbering", () => {
  it("creates sequential PRJ numbers and never collides", async () => {
    const r1 = await createProjectAction({ clientId: clientA, title: "N1", vatRate: 0.18 }, H(ownerCookie));
    const r2 = await createProjectAction({ clientId: clientA, title: "N2", vatRate: 0.18 }, H(ownerCookie));
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    const n1 = parseInt(r1.data.number.match(/(\d+)$/)![1], 10);
    const n2 = parseInt(r2.data.number.match(/(\d+)$/)![1], 10);
    expect(n2).toBe(n1 + 1);
    expect(r1.data.number).toMatch(/^PRJ-\d{4}-\d{3}$/);
  });
});

describe("server-authoritative item pricing (money invariant)", () => {
  it("stores computePrice(config, activeCatalog), NOT a browser price", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Priced", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const { catalog } = await activeCatalog(orgA);
    const expected = computePrice(cfg, catalog);
    const r = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 2 }, H(ownerCookie));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.unitPrice).toBe(expected);
    const row = await itemRow(r.data.id);
    expect(Number(row!.unit_price)).toBe(expected);
  });

  it("IGNORES a tampered unitPrice / material totals in the payload", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Tamper", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const { catalog } = await activeCatalog(orgA);
    const expected = computePrice(cfg, catalog);
    for (const fake of [0.01, 999999]) {
      // Extra monetary fields are not in the schema -> stripped; price recomputed.
      const payload = { projectId: c.data.id, config: cfg, qty: 1, unitPrice: fake, materials: { glassM2: 9999 } };
      const r = await addProjectItemAction(payload, H(ownerCookie));
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.data.unitPrice).toBe(expected);
      expect(r.data.unitPrice).not.toBe(fake);
      const row = await itemRow(r.data.id);
      expect(Number(row!.unit_price)).toBe(expected);
    }
  });

  it("a manualPrice override flows through the server calculator (legit)", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Manual", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const manual = { ...cfg, manualPrice: 250 };
    const r = await addProjectItemAction({ projectId: c.data.id, config: manual, qty: 1 }, H(ownerCookie));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.unitPrice).toBe(250);
    const row = await itemRow(r.data.id);
    expect((row!.calc_snapshot as { manualPriceUsed?: boolean }).manualPriceUsed).toBe(true);
  });
});

describe("historical pricing version integrity", () => {
  it("an item keeps its price + version when pricing advances; new items use the new version", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "History", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const before = await activeCatalog(orgA);
    const oldItem = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 1 }, H(ownerCookie));
    if (!oldItem.ok) throw new Error("setup");
    const oldPrice = oldItem.data.unitPrice;
    const oldVersion = oldItem.data.priceListVersion;
    expect(oldVersion).toBe(before.version);

    // Advance pricing: raise glass price sharply -> a new active version vN+1.
    const bumped = defaultPricingCatalog();
    bumped.glass[0].price = 500;
    const save = await savePricingAction({ catalog: bumped }, H(ownerCookie));
    expect(save.ok).toBe(true);

    // Existing item is unchanged (price + version frozen).
    const frozen = await itemRow(oldItem.data.id);
    expect(Number(frozen!.unit_price)).toBe(oldPrice);
    expect(frozen!.price_list_version).toBe(oldVersion);

    // A new item now prices against vN+1 and differs.
    const newItem = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 1 }, H(ownerCookie));
    if (!newItem.ok) throw new Error("new item");
    expect(newItem.data.priceListVersion).toBe(oldVersion + 1);
    expect(newItem.data.unitPrice).toBeGreaterThan(oldPrice);
  });

  it("editing an OLD item reprices it against the current active version", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Reprice", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const added = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 1 }, H(ownerCookie));
    if (!added.ok) throw new Error("setup");
    const startVersion = added.data.priceListVersion;

    // Advance pricing.
    const bumped = defaultPricingCatalog();
    bumped.glass[0].price = 777;
    await savePricingAction({ catalog: bumped }, H(ownerCookie));
    const current = await activeCatalog(orgA);
    expect(current.version).toBeGreaterThan(startVersion);

    const edited = await updateProjectItemAction(
      { projectId: c.data.id, itemId: added.data.id, config: { ...cfg, widthMm: 1100 }, qty: 3 },
      H(ownerCookie),
    );
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.data.priceListVersion).toBe(current.version);
    const row = await itemRow(added.data.id);
    expect(row!.price_list_version).toBe(current.version);
  });

  it("a stale previewed pricing version is rejected as CONFLICT", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Stale", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const r = await addProjectItemAction(
      { projectId: c.data.id, config: cfg, qty: 1, previewedPriceListVersion: 1 },
      H(ownerCookie),
    );
    // active version is well past 1 by now -> conflict
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
  });
});

describe("same-org sharing + cross-org isolation", () => {
  it("a project a member creates is visible to another same-org member (RLS)", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Shared", vatRate: 0.18 }, H(salesCookie));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const visibleToOrgA = await projectsVisibleTo(orgA);
    expect(visibleToOrgA).toContain(c.data.id);
    // user2 is an org-A operator; the same project is in org A's tenant scope.
    const upd = await updateProjectAction({ id: c.data.id, title: "Shared-edited", vatRate: 0.18 }, H(user2Cookie));
    expect(upd.ok).toBe(true);
  });

  it("org B cannot see / update / delete / attach to an org A project", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "A-private", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const pid = c.data.id;

    expect(await projectsVisibleTo(orgB)).not.toContain(pid);

    const upd = await updateProjectAction({ id: pid, title: "hijack", vatRate: 0.2 }, H(ownerBCookie));
    expect(upd.ok).toBe(false);
    if (!upd.ok) expect(upd.error.code).toBe("NOT_FOUND");

    const del = await deleteProjectAction({ id: pid }, H(ownerBCookie));
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.error.code).toBe("NOT_FOUND");

    const attach = await addProjectItemAction({ projectId: pid, config: cfg, qty: 1 }, H(ownerBCookie));
    expect(attach.ok).toBe(false);
    if (!attach.ok) expect(attach.error.code).toBe("NOT_FOUND");
  });

  it("a project cannot be created against another org's client", async () => {
    const r = await createProjectAction({ clientId: clientA, title: "cross", vatRate: 0.18 }, H(ownerBCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
});

describe("derived totals + item lifecycle", () => {
  it("project total derives from authoritative item prices", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "Totals", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const a = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 2 }, H(ownerCookie));
    if (!a.ok) throw new Error("setup");
    const items = [{ qty: 2, unitPrice: a.data.unitPrice }];
    const expectedTotal = projectTotal({ items: items as never, vatRate: 0.18 });
    // net = 2*unit, total = net*1.18
    expect(expectedTotal).toBeCloseTo(2 * a.data.unitPrice * 1.18, 2);

    // delete the item -> row gone
    const d = await deleteProjectItemAction({ projectId: c.data.id, itemId: a.data.id }, H(ownerCookie));
    expect(d.ok).toBe(true);
    expect(await itemRow(a.data.id)).toBeUndefined();
  });

  it("deleting a project cascades to its items via the action", async () => {
    const c = await createProjectAction({ clientId: clientA, title: "CascadeAct", vatRate: 0.18 }, H(ownerCookie));
    if (!c.ok) throw new Error("setup");
    const a = await addProjectItemAction({ projectId: c.data.id, config: cfg, qty: 1 }, H(ownerCookie));
    if (!a.ok) throw new Error("setup");
    await deleteProjectAction({ id: c.data.id }, H(ownerCookie));
    const items = await ownerPool.query(`select id from project_items where id=$1`, [a.data.id]);
    expect(items.rows).toHaveLength(0);
  });
});
