// Platform Admin / control-plane security integration tests. Run against the Neon
// dev DB as the restricted role kornizo_app (NOBYPASSRLS), exactly like the
// tenant dbtests. They exercise the REAL authorization spine, the control-plane
// mutations, suspension enforcement, and cross-tenant reads — proving the new
// trust boundary end to end without weakening tenant RLS.
//
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { auth } from "@/auth";
import * as schema from "@/db/schema";
import { clients } from "@/db/schema/business";
import { runWithOrg, type AppDatabase } from "@/db/tenant";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { getAuthContext } from "@/auth/session";
import { getAccountState } from "@/server/platform/accounts";
import { createClientAction } from "@/server/actions/client";
import { getPlatformAdminContext, isPlatformAdmin } from "@/server/platform/auth";
import {
  activateCustomerAction,
  extendTrialAction,
  setPlanAction,
  setStatusAction,
  setInternalNoteAction,
} from "@/server/platform/actions/organization";
import {
  getPlatformOrganization,
  listPlatformOrganizations,
  getPlatformOverview,
  listPlatformAdmins,
} from "@/server/platform/organizations";
import { listAuditEvents } from "@/server/platform/audit";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const appPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const appDb = drizzle(appPool, { schema }) as unknown as AppDatabase;
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const PW = "password-12345";
const email = (who: string) => `plat-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name: `Plat ${who}` }, asResponse: true });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const s = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: s!.user.id };
}
async function createOrg(cookie: string, name: string, slug: string): Promise<string> {
  return createProvisionedTestOrganization(auth, cleanup, H(cookie), name, slug);
}
async function grantPlatformAdmin(userId: string, who: string) {
  await ownerPool.query(
    `insert into platform_admins(user_id, email, note) values($1,$2,'test') on conflict (user_id) do nothing`,
    [userId, email(who)],
  );
}
async function seedClientAsOwner(orgId: string, name: string): Promise<string> {
  const r = await ownerPool.query(`insert into clients(organization_id,name,type) values($1,$2,'Privat') returning id`, [orgId, name]);
  return r.rows[0].id;
}
async function planOf(orgId: string) {
  return (await getAccountState(orgId)).plan;
}
async function accountOf(orgId: string) {
  return getAccountState(orgId);
}
async function setTrial(orgId: string, endsAtSql: string) {
  await ownerPool.query(
    `
      insert into organization_accounts(organization_id, plan, status, commercial_access, trial_started_at, trial_ends_at)
      values($1, 'STANDARD', 'active', 'trial', (${endsAtSql}) - interval '14 days', ${endsAtSql})
      on conflict (organization_id) do update
        set plan = 'STANDARD',
            status = 'active',
            suspended_at = null,
            suspended_reason = null,
            commercial_access = 'trial',
            trial_started_at = least(coalesce(organization_accounts.trial_started_at, (${endsAtSql}) - interval '14 days'), (${endsAtSql}) - interval '14 days'),
            trial_ends_at = ${endsAtSql},
            activated_at = null,
            updated_at = now()
    `,
    [orgId],
  );
}
async function setActiveCustomer(orgId: string) {
  await ownerPool.query(
    `
      insert into organization_accounts(organization_id, plan, status, commercial_access, activated_at)
      values($1, 'STANDARD', 'active', 'active', now())
      on conflict (organization_id) do update
        set plan = 'STANDARD',
            status = 'active',
            suspended_at = null,
            suspended_reason = null,
            commercial_access = 'active',
            activated_at = now(),
            updated_at = now()
    `,
    [orgId],
  );
}

// Shared fixtures: an admin user (platform admin, member of Org A), a plain owner
// of Org B (NOT a platform admin), and a plain member of Org A.
let adminCookie = "", adminUserId = "";
let ownerBCookie = "", ownerBUserId = "";
let memberACookie = "";
let orgA = "", orgB = "";

beforeAll(async () => {
  const admin = await signUp("admin");
  adminCookie = admin.cookie; adminUserId = admin.userId;
  orgA = await createOrg(adminCookie, "Platform Org A", `plat-a-${suffix}`);

  const ob = await signUp("ownerB");
  ownerBCookie = ob.cookie; ownerBUserId = ob.userId;
  orgB = await createOrg(ownerBCookie, "Platform Org B", `plat-b-${suffix}`);

  // A second member of Org A (plain member), for suspension-on-member tests.
  const mA = await signUp("memberA");
  memberACookie = mA.cookie;
  await ownerPool.query(`insert into member(organization_id,user_id,role,created_at) values($1,$2,'sales',now())`, [orgA, mA.userId]);
  // Set memberA's active org to A explicitly.
  await auth.api.setActiveOrganization({ headers: H(memberACookie), body: { organizationId: orgA } });

  // Grant platform admin to the admin user ONLY.
  await grantPlatformAdmin(adminUserId, "admin");
  await setTrial(orgA, `now() + interval '14 days'`);
  await setTrial(orgB, `now() + interval '14 days'`);
}, 60000);

afterAll(async () => {
  // Audit events reference the org by BARE id (no FK, so history survives an org
  // delete), so the org-cascade cleanup does NOT remove them — and the runtime
  // role has no DELETE on the append-only table. Remove this run's audit rows via
  // the owner pool so tests leave nothing behind.
  await ownerPool.query(`delete from platform_audit_events where organization_id = any($1::uuid[])`, [[orgA, orgB]]);
  await cleanup.run();
  await ownerPool.end();
  await appPool.end();
});

describe("platform authorization boundary", () => {
  it("unauthenticated request is UNAUTHENTICATED", async () => {
    const r = await getPlatformAdminContext(new Headers());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("UNAUTHENTICATED");
  });

  it("an ordinary signed-in user is NOT a platform admin (FORBIDDEN)", async () => {
    const r = await getPlatformAdminContext(H(ownerBCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("FORBIDDEN");
  });

  it("a TENANT OWNER is not a platform admin — owner role grants ZERO platform access", async () => {
    // ownerB is the owner of Org B, yet has no platform authority.
    expect(await isPlatformAdmin(ownerBUserId)).toBe(false);
    const r = await getPlatformAdminContext(H(ownerBCookie));
    expect(r.ok).toBe(false);
  });

  it("a seeded platform admin is authorized", async () => {
    expect(await isPlatformAdmin(adminUserId)).toBe(true);
    const r = await getPlatformAdminContext(H(adminCookie));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ctx.userId).toBe(adminUserId);
  });
});

describe("platform mutations require platform authorization", () => {
  it("a non-admin (tenant owner) cannot change the canonical plan (FORBIDDEN)", async () => {
    const res = await setPlanAction({ organizationId: orgA, plan: "STANDARD" }, H(ownerBCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
    expect(await planOf(orgA)).toBe("STANDARD"); // unchanged
  });

  it("a non-admin cannot activate or extend commercial access", async () => {
    const activate = await activateCustomerAction({ organizationId: orgA }, H(ownerBCookie));
    expect(activate.ok).toBe(false);
    if (!activate.ok) expect(activate.error.code).toBe("FORBIDDEN");

    const extend = await extendTrialAction({ organizationId: orgA, days: 7 }, H(ownerBCookie));
    expect(extend.ok).toBe(false);
    if (!extend.ok) expect(extend.error.code).toBe("FORBIDDEN");

    expect((await accountOf(orgA)).effectiveCommercialAccess).toBe("trial");
  });

  it("a non-admin cannot suspend an org (FORBIDDEN), even with valid input", async () => {
    const res = await setStatusAction({ organizationId: orgB, status: "suspended" }, H(memberACookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
    expect((await getAccountState(orgB)).status).toBe("active");
  });

  it("an unauthenticated caller cannot mutate (UNAUTHENTICATED)", async () => {
    const res = await setInternalNoteAction({ organizationId: orgA, note: "x" }, new Headers());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("Standard launch plan", () => {
  it("Standard is canonical and tenant auth observes Standard", async () => {
    const res = await setPlanAction({ organizationId: orgA, plan: "STANDARD" }, H(adminCookie));
    expect(res.ok).toBe(true);
    expect(await planOf(orgA)).toBe("STANDARD");

    const ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.ctx.plan).toBe("STANDARD");
      expect(ctx.ctx.effectiveCommercialAccess).toBe("trial");
    }
  });
});

describe("trial lifecycle", () => {
  it("valid Trial can use normal tenant functionality", async () => {
    await setTrial(orgA, `now() + interval '14 days'`);
    const account = await accountOf(orgA);
    expect(account.plan).toBe("STANDARD");
    expect(account.effectiveCommercialAccess).toBe("trial");
    expect(account.trialDaysRemaining).toBeGreaterThan(0);

    const created = await createClientAction({ name: `trial-client-${suffix}`, type: "Privat" }, H(adminCookie));
    expect(created.ok).toBe(true);
    if (created.ok) await ownerPool.query(`delete from clients where id=$1`, [created.data.id]);
  });

  it("expired Trial blocks tenant actions without deleting data, and Platform Admin can still inspect it", async () => {
    const clientId = await seedClientAsOwner(orgA, `expired-keep-${suffix}`);
    await setTrial(orgA, `now() - interval '1 hour'`);

    const ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("TRIAL_EXPIRED");

    const blockedCreate = await createClientAction({ name: `blocked-${suffix}`, type: "Privat" }, H(adminCookie));
    expect(blockedCreate.ok).toBe(false);
    if (!blockedCreate.ok) expect(blockedCreate.error.code).toBe("FORBIDDEN");

    const detail = await getPlatformOrganization(orgA);
    expect(detail?.effectiveCommercialAccess).toBe("trial_expired");

    const namesDuring = await runWithOrg(appDb, orgA, async (tx) =>
      (await tx.select({ name: clients.name }).from(clients)).map((r) => r.name),
    );
    expect(namesDuring).toContain(`expired-keep-${suffix}`);

    await ownerPool.query(`delete from clients where id=$1`, [clientId]);
  });

  it("Platform Admin extends Trial and access returns immediately with an audit event", async () => {
    await setTrial(orgA, `now() - interval '1 hour'`);
    const beforeAudit = (await listAuditEvents({ organizationId: orgA, action: "TRIAL_EXTENDED" })).total;

    const res = await extendTrialAction({ organizationId: orgA, days: 7 }, H(adminCookie));
    expect(res.ok).toBe(true);

    const account = await accountOf(orgA);
    expect(account.effectiveCommercialAccess).toBe("trial");
    expect(account.trialDaysRemaining).toBeGreaterThan(0);

    const ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);

    const afterAudit = await listAuditEvents({ organizationId: orgA, action: "TRIAL_EXTENDED" });
    expect(afterAudit.total).toBe(beforeAudit + 1);
    expect(afterAudit.events[0].metadata.days).toBe(7);
    expect(afterAudit.events[0].metadata.oldAccess).toBe("trial_expired");
    expect(afterAudit.events[0].metadata.newAccess).toBe("trial");
  });

  it("Platform Admin activates a customer; old trial end no longer restricts access and action is audited", async () => {
    await setTrial(orgA, `now() - interval '1 hour'`);
    const beforeAudit = (await listAuditEvents({ organizationId: orgA, action: "CUSTOMER_ACTIVATED" })).total;

    const res = await activateCustomerAction({ organizationId: orgA }, H(adminCookie));
    expect(res.ok).toBe(true);

    const account = await accountOf(orgA);
    expect(account.commercialAccess).toBe("active");
    expect(account.effectiveCommercialAccess).toBe("active");
    expect(account.activatedAt).toBeInstanceOf(Date);

    const ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(ctx.ctx.effectiveCommercialAccess).toBe("active");

    const afterAudit = await listAuditEvents({ organizationId: orgA, action: "CUSTOMER_ACTIVATED" });
    expect(afterAudit.total).toBe(beforeAudit + 1);
    expect(afterAudit.events[0].metadata.oldAccess).toBe("trial_expired");
    expect(afterAudit.events[0].metadata.newAccess).toBe("active");
  });
});

describe("suspension is actually enforced", () => {
  it("active org works; suspended org blocks its members; other org unaffected; reactivation restores; no data deleted", async () => {
    await setActiveCustomer(orgA);
    await setTrial(orgB, `now() + interval '14 days'`);
    // Seed real business data in Org A to prove suspension never deletes it.
    const clientId = await seedClientAsOwner(orgA, `keep-${suffix}`);

    // Baseline: memberA can resolve tenant context while active.
    let ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);

    // Suspend Org A (platform admin).
    const sus = await setStatusAction({ organizationId: orgA, status: "suspended", reason: "test suspend" }, H(adminCookie));
    expect(sus.ok).toBe(true);

    // memberA is now blocked (the spine maps SUSPENDED -> refuse).
    ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("SUSPENDED");

    // Org B (a different tenant) is UNAFFECTED.
    const ctxB = await getAuthContext(H(ownerBCookie));
    expect(ctxB.ok).toBe(true);

    // Platform admin can STILL inspect the suspended org.
    const detail = await getPlatformOrganization(orgA);
    expect(detail?.status).toBe("suspended");
    expect(detail?.suspendedReason).toBe("test suspend");

    // Business data is intact under suspension (still visible via RLS-scoped read).
    const namesDuring = await runWithOrg(appDb, orgA, async (tx) =>
      (await tx.select({ name: clients.name }).from(clients)).map((r) => r.name),
    );
    expect(namesDuring).toContain(`keep-${suffix}`);

    // Reactivate -> access restored.
    const re = await setStatusAction({ organizationId: orgA, status: "active" }, H(adminCookie));
    expect(re.ok).toBe(true);
    ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(ctx.ctx.effectiveCommercialAccess).toBe("active");

    // Data still present after the whole cycle.
    const namesAfter = await runWithOrg(appDb, orgA, async (tx) =>
      (await tx.select({ name: clients.name }).from(clients)).map((r) => r.name),
    );
    expect(namesAfter).toContain(`keep-${suffix}`);

    await ownerPool.query(`delete from clients where id=$1`, [clientId]);
  });

  it("suspended Trial is blocked and reactivation restores the underlying Trial state", async () => {
    await setTrial(orgA, `now() + interval '14 days'`);
    const sus = await setStatusAction({ organizationId: orgA, status: "suspended", reason: "trial suspend" }, H(adminCookie));
    expect(sus.ok).toBe(true);

    let ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("SUSPENDED");

    const re = await setStatusAction({ organizationId: orgA, status: "active" }, H(adminCookie));
    expect(re.ok).toBe(true);
    ctx = await getAuthContext(H(memberACookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(ctx.ctx.effectiveCommercialAccess).toBe("trial");
  });
});

describe("cross-tenant platform reads (via platform auth, not membership)", () => {
  it("platform admin can read a foreign org's members metadata WITHOUT being a member", async () => {
    // admin is a member of Org A only, never Org B.
    const detail = await getPlatformOrganization(orgB);
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("Platform Org B");
    expect(detail!.members.some((m) => m.role === "owner")).toBe(true);
    // usage counts are present (numbers), not customer contents.
    expect(typeof detail!.usage.clients).toBe("number");
  });

  it("the org list + overview aggregate across tenants", async () => {
    const list = await listPlatformOrganizations({ q: `plat-` });
    const ids = list.map((o) => o.id);
    expect(ids).toContain(orgA);
    expect(ids).toContain(orgB);

    const filteredA = await listPlatformOrganizations({ q: "Platform Org B" });
    expect(filteredA.every((o) => o.name.includes("Platform Org B"))).toBe(true);

    const overview = await getPlatformOverview();
    expect(overview.totalOrganizations).toBeGreaterThanOrEqual(2);
    expect(overview.activeAccounts + overview.suspendedOrganizations).toBe(overview.totalOrganizations);
    expect(overview.planDistribution.STANDARD).toBe(overview.totalOrganizations);
  });
});

describe("hostile / malformed input fails safely", () => {
  it("malformed org id is rejected as VALIDATION (before any DB write)", async () => {
    const res = await setPlanAction({ organizationId: "not-a-uuid", plan: "STANDARD" }, H(adminCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("a well-formed but unknown org id is NOT_FOUND (after auth passes)", async () => {
    const res = await setPlanAction(
      { organizationId: "00000000-0000-4000-8000-000000000000", plan: "STANDARD" },
      H(adminCookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NOT_FOUND");
  });

  it("old fake launch plan values are rejected as VALIDATION", async () => {
    const res = await setPlanAction(
      { organizationId: orgA, plan: "BIZNES" } as unknown as { organizationId: string; plan: "STANDARD" },
      H(adminCookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("invalid trial extension values are rejected as VALIDATION", async () => {
    const res = await extendTrialAction(
      { organizationId: orgA, days: 30 } as unknown as { organizationId: string; days: 7 },
      H(adminCookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("an invalid status value is rejected as VALIDATION", async () => {
    const res = await setStatusAction(
      { organizationId: orgA, status: "deleted" } as unknown as { organizationId: string; status: "active" },
      H(adminCookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("getPlatformOrganization returns null for an unknown org (no leak)", async () => {
    const d = await getPlatformOrganization("00000000-0000-4000-8000-000000000000");
    expect(d).toBeNull();
  });
});

describe("tenant RLS regression (unchanged by platform admin)", () => {
  it("an Org A context still cannot see Org B clients", async () => {
    const bClient = await seedClientAsOwner(orgB, `bsecret-${suffix}`);
    const aVisible = await runWithOrg(appDb, orgA, async (tx) =>
      (await tx.select({ name: clients.name }).from(clients)).map((r) => r.name),
    );
    expect(aVisible).not.toContain(`bsecret-${suffix}`);
    await ownerPool.query(`delete from clients where id=$1`, [bClient]);
  });
});

describe("platform audit trail", () => {
  it("a FAILED lifecycle mutation (unknown org) writes NO audit event (transactional)", async () => {
    const ghost = "00000000-0000-4000-8000-000000000000";
    const before = (await listAuditEvents({ organizationId: ghost })).total;
    const res = await activateCustomerAction({ organizationId: ghost }, H(adminCookie));
    expect(res.ok).toBe(false);
    const after = (await listAuditEvents({ organizationId: ghost })).total;
    expect(after).toBe(before); // rolled back with the mutation
  });

  it("a non-admin lifecycle attempt writes NO audit event", async () => {
    const before = (await listAuditEvents({ organizationId: orgA, action: "CUSTOMER_ACTIVATED" })).total;
    const res = await activateCustomerAction({ organizationId: orgA }, H(ownerBCookie));
    expect(res.ok).toBe(false);
    const after = (await listAuditEvents({ organizationId: orgA, action: "CUSTOMER_ACTIVATED" })).total;
    expect(after).toBe(before);
  });

  it("suspend + reactivate each write their audit event", async () => {
    const sBefore = (await listAuditEvents({ organizationId: orgB, action: "ORGANIZATION_SUSPENDED" })).total;
    await setStatusAction({ organizationId: orgB, status: "suspended", reason: "audit-test" }, H(adminCookie));
    const sAfter = await listAuditEvents({ organizationId: orgB, action: "ORGANIZATION_SUSPENDED" });
    expect(sAfter.total).toBe(sBefore + 1);
    expect(sAfter.events[0].metadata.reason).toBe("audit-test");

    const rBefore = (await listAuditEvents({ organizationId: orgB, action: "ORGANIZATION_REACTIVATED" })).total;
    await setStatusAction({ organizationId: orgB, status: "active" }, H(adminCookie));
    const rAfter = (await listAuditEvents({ organizationId: orgB, action: "ORGANIZATION_REACTIVATED" })).total;
    expect(rAfter).toBe(rBefore + 1);
  });

  it("internal-note change is audited WITHOUT storing the note text", async () => {
    const res = await setInternalNoteAction({ organizationId: orgB, note: "secret ops note do-not-log" }, H(adminCookie));
    expect(res.ok).toBe(true);
    const ev = (await listAuditEvents({ organizationId: orgB, action: "INTERNAL_NOTE_UPDATED" })).events[0];
    expect(ev).toBeTruthy();
    // The metadata must never carry the note text.
    expect(JSON.stringify(ev.metadata)).not.toContain("secret ops note");
    expect(ev.metadata.cleared).toBe(false);
  });
});

describe("platform admins page data", () => {
  it("lists the seeded platform admin with email + created date", async () => {
    const admins = await listPlatformAdmins();
    const mine = admins.find((a) => a.userId === adminUserId);
    expect(mine).toBeTruthy();
    expect(mine!.email).toContain("plat-");
    expect(mine!.createdAt).toBeInstanceOf(Date);
  });

  it("the ownerB tenant user is NOT among platform admins", async () => {
    const admins = await listPlatformAdmins();
    expect(admins.some((a) => a.userId === ownerBUserId)).toBe(false);
  });
});
