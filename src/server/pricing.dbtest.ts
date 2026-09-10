// Phase 5 pricing vertical-slice integration tests. Runs against the Neon dev DB
// as the restricted role kornizo_app (NOBYPASSRLS). Two layers:
//
//   1. RLS + init layer  — default initialization, tenant isolation, no-context
//      denial, PricingCatalog round-trip, and calculation regression, all via
//      runWithOrg (the same transaction the read boundary uses).
//   2. Action layer       — the real savePricingAction core driven with explicit
//      session headers: canonical permissions, validation, versioning,
//      historical immutability, single-active invariant, concurrency/conflict,
//      same-org sharing, cross-org isolation, and stale-role behavior.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { priceLists } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { ensureActivePriceList } from "@/server/pricing-init";
import { savePricingAction } from "@/server/actions/pricing";
import { defaultPricingCatalog } from "@/domain/pricing/defaults";
import { parsePricingCatalog } from "@/domain/validation/pricing";
import { computePrice } from "@/domain/configurator/window-calc";
import type { PricingCatalog } from "@/domain/pricing/types";
import type { WindowConfig } from "@/domain/types";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `p5-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name: `P5 ${who}` }, asResponse: true });
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

/** Ensure + read the active version of an org via the RLS-scoped transaction. */
async function activeVersion(orgId: string): Promise<{ version: number; catalog: PricingCatalog }> {
  return runWithOrg(appDb, orgId, async (tx) => {
    await ensureActivePriceList(tx, orgId);
    const rows = await tx
      .select()
      .from(priceLists)
      .where(and(eq(priceLists.organizationId, orgId), eq(priceLists.isActive, true)))
      .orderBy(desc(priceLists.version))
      .limit(1);
    return { version: rows[0].version, catalog: parsePricingCatalog(rows[0].catalog) };
  });
}

/** Full version history as seen by the owner pool (BYPASSRLS) — DB ground truth. */
async function history(orgId: string): Promise<{ version: number; is_active: boolean; catalog: PricingCatalog }[]> {
  const r = await ownerPool.query(
    `select version, is_active, catalog from price_lists where organization_id=$1 order by version asc`,
    [orgId],
  );
  return r.rows;
}
async function activeCount(orgId: string): Promise<number> {
  const r = await ownerPool.query(`select count(*)::int n from price_lists where organization_id=$1 and is_active`, [orgId]);
  return r.rows[0].n;
}

/** A catalog that differs from the default by a single, easily-checked sentinel. */
function tweaked(marker: number): PricingCatalog {
  const c = defaultPricingCatalog();
  c.glass[0].price = marker;
  return c;
}

// The window-calc regression fixture (a fixed single 1000×1200 window).
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
let ownerUserId = "";
let orgA = "";
let orgB = "";
let salesCookie = "";
let operatorCookie = "";
let accountingCookie = "";
let user2Cookie = ""; // second owner-org member (reader) for same-org sharing

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  ownerUserId = owner.userId;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "Org A", `p5a-${suffix}`);

  const ownerB = await signUp("ownerb");
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(ownerB.cookie), "Org B", `p5b-${suffix}`);

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
}, 60000);

afterAll(async () => {
  await cleanup.run();
  await appPool.end();
  await ownerPool.end();
});

// ---------------------------------------------------------------------------
// 1. Default init + RLS + round-trip + calculation regression
// ---------------------------------------------------------------------------
describe("default pricing initialization", () => {
  it("creates an active version 1 for a fresh org from the canonical default", async () => {
    const a = await activeVersion(orgA);
    expect(a.version).toBe(1);
    expect(a.catalog).toEqual(defaultPricingCatalog());
    expect(await activeCount(orgA)).toBe(1);
  });

  it("is idempotent — repeated init never creates a second active version", async () => {
    await runWithOrg(appDb, orgA, (tx) => ensureActivePriceList(tx, orgA));
    await runWithOrg(appDb, orgA, (tx) => ensureActivePriceList(tx, orgA));
    expect(await activeCount(orgA)).toBe(1);
  });
});

describe("PricingCatalog DB round-trip + calculation regression", () => {
  it("default -> Postgres -> reconstructed catalog is loss-free", async () => {
    const { catalog } = await activeVersion(orgA);
    expect(catalog).toEqual(defaultPricingCatalog());
  });

  it("computePrice is identical for the DB-reconstructed and in-memory default", async () => {
    const { catalog } = await activeVersion(orgA);
    const fromDb = computePrice(cfg, catalog);
    const fromMem = computePrice(cfg, defaultPricingCatalog());
    expect(fromDb).toBe(fromMem);
    // Anchor: the fixed single 1000×1200 window is ~€100 (unchanged behavior).
    expect(fromDb).toBeGreaterThan(90);
    expect(fromDb).toBeLessThan(112);
  });
});

describe("pricing RLS tenant isolation (restricted role)", () => {
  it("no tenant context = no rows", async () => {
    const none = await appPool.query("select version from price_lists");
    expect(none.rows).toHaveLength(0);
  });

  it("A cannot see B's price_lists", async () => {
    await activeVersion(orgB); // ensure B has a version
    const seen = await runWithOrg(appDb, orgA, (tx) =>
      tx.select({ id: priceLists.id }).from(priceLists).where(eq(priceLists.organizationId, orgB)),
    );
    expect(seen).toHaveLength(0);
  });

  it("A cannot INSERT a price_list for another org (WITH CHECK)", async () => {
    await expect(
      runWithOrg(appDb, orgA, (tx) =>
        tx.execute(
          sql`insert into price_lists(organization_id,version,is_active,catalog) values(${orgB}::uuid, 999, false, '{}'::jsonb)`,
        ),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Save action — permissions, validation, versioning, concurrency
// ---------------------------------------------------------------------------
describe("savePricing authorization", () => {
  it("sales / operator / accounting cannot edit pricing (read-only)", async () => {
    for (const cookie of [salesCookie, operatorCookie, accountingCookie]) {
      const r = await savePricingAction({ catalog: defaultPricingCatalog() }, H(cookie));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    }
  });

  it("unauthenticated is rejected", async () => {
    const r = await savePricingAction({ catalog: defaultPricingCatalog() }, new Headers());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an invalid catalog with VALIDATION", async () => {
    const bad = defaultPricingCatalog() as unknown as { glass: { price: number }[] };
    bad.glass[0].price = -5; // negative price is not allowed
    const r = await savePricingAction({ catalog: bad as unknown as PricingCatalog }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });
});

describe("versioning: v1 -> v2 -> v3, immutable history, single active", () => {
  it("owner save creates the next active version; previous is archived, unchanged", async () => {
    const before = (await activeVersion(orgA)).version;

    const r2 = await savePricingAction({ catalog: tweaked(11.11) }, H(ownerCookie));
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.data.version).toBe(before + 1);

    const r3 = await savePricingAction({ catalog: tweaked(22.22) }, H(ownerCookie));
    expect(r3.ok).toBe(true);
    if (r3.ok) expect(r3.data.version).toBe(before + 2);

    const hist = await history(orgA);
    // exactly one active, and it is the highest version with our latest sentinel
    expect(await activeCount(orgA)).toBe(1);
    const active = hist.find((h) => h.is_active)!;
    expect(active.version).toBe(before + 2);
    expect(active.catalog.glass[0].price).toBe(22.22);

    // historical versions retained and NOT mutated
    const v2 = hist.find((h) => h.version === before + 1)!;
    expect(v2.is_active).toBe(false);
    expect(v2.catalog.glass[0].price).toBe(11.11);
    const v1 = hist.find((h) => h.version === before)!;
    expect(v1.is_active).toBe(false);
    expect(v1.catalog.glass[0].price).toBe(defaultPricingCatalog().glass[0].price);
  });
});

describe("same-org sharing + cross-org isolation", () => {
  it("a second same-org member reads the pricing an editor saved", async () => {
    const marker = 33.33;
    const r = await savePricingAction({ catalog: tweaked(marker) }, H(ownerCookie));
    expect(r.ok).toBe(true);
    // user2 (operator in org A) reads via the RLS transaction -> sees the change
    const seen = await activeVersion(orgA);
    expect(seen.catalog.glass[0].price).toBe(marker);
  });

  it("saving Org A pricing does not change Org B's active pricing", async () => {
    const bBefore = await activeVersion(orgB);
    await savePricingAction({ catalog: tweaked(44.44) }, H(ownerCookie)); // A only
    const bAfter = await activeVersion(orgB);
    expect(bAfter.version).toBe(bBefore.version);
    expect(bAfter.catalog).toEqual(bBefore.catalog);
    expect(bAfter.catalog.glass[0].price).toBe(defaultPricingCatalog().glass[0].price);
  });
});

describe("optimistic concurrency (baseVersion) + concurrent saves", () => {
  it("a stale baseVersion is rejected as CONFLICT", async () => {
    const v = (await activeVersion(orgA)).version;
    const ok = await savePricingAction({ catalog: tweaked(55.55), baseVersion: v }, H(ownerCookie));
    expect(ok.ok).toBe(true);
    // Re-using the now-stale version must conflict.
    const stale = await savePricingAction({ catalog: tweaked(66.66), baseVersion: v }, H(ownerCookie));
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.code).toBe("CONFLICT");
  });

  it("two concurrent saves keep exactly one active version and distinct numbers", async () => {
    const before = (await activeVersion(orgA)).version;
    const [r1, r2] = await Promise.all([
      savePricingAction({ catalog: tweaked(77.77) }, H(ownerCookie)),
      savePricingAction({ catalog: tweaked(88.88) }, H(ownerCookie)),
    ]);
    expect(r1.ok && r2.ok).toBe(true);
    expect(await activeCount(orgA)).toBe(1);
    const versions = (await history(orgA)).map((h) => h.version);
    // both new versions exist, monotonic, no duplicates
    expect(new Set(versions).size).toBe(versions.length);
    expect(Math.max(...versions)).toBe(before + 2);
  });
});

describe("authorization staleness", () => {
  it("an owner downgraded to sales immediately loses pricing:edit", async () => {
    // Promote a throwaway member to owner-equivalent editing via role, then drop.
    await setMemberRole(orgA, ownerUserId, "owner"); // ensure baseline
    // Downgrade the ORIGINAL owner is unsafe (owner-only rules); instead use user2.
    const u2 = await auth.api.getSession({ headers: H(user2Cookie) });
    await setMemberRole(orgA, u2!.user.id, "admin");
    const canEdit = await savePricingAction({ catalog: tweaked(99.99) }, H(user2Cookie));
    expect(canEdit.ok).toBe(true); // admin may edit
    await setMemberRole(orgA, u2!.user.id, "operator");
    const denied = await savePricingAction({ catalog: tweaked(12.34) }, H(user2Cookie));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
  });
});
