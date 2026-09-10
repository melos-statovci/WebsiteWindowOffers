// Phase 3 server-action / authorization / validation spine tests. Runs the REAL
// spine against the Neon dev DB as the restricted role kornizo_app. Drives the
// action CORE directly (headers explicit) so no Next request context is needed.
// Run via `npm run test:db`.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { runWithOrg } from "@/db/tenant";
import { ensureOrganizationProfile } from "@/auth/organization";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";
import { createAction, type ActionResult } from "@/server/action";
import { updateOrganizationProfileAction } from "@/server/actions/organization-profile";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const email = (who: string) => `p3-${suffix}-${who}@example.test`;
const H = (cookie: string) => new Headers({ cookie });

async function signUp(who: string): Promise<{ cookie: string; userId: string }> {
  cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({ body: { email: email(who), password: PW, name: `P3 ${who}` }, asResponse: true });
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
async function profileNui(orgId: string): Promise<string | null> {
  const r = await ownerPool.query(`select nui from organization_profiles where organization_id=$1`, [orgId]);
  return r.rows[0]?.nui ?? null;
}
async function profileEmail(orgId: string): Promise<string | null> {
  const r = await ownerPool.query(`select business_email from organization_profiles where organization_id=$1`, [orgId]);
  return r.rows[0]?.business_email ?? null;
}

let ownerCookie = "";
let orgA = "";
let orgB = "";
let adminCookie = "";
let adminUserId = "";
let roleCookie = "";
let roleUserId = "";

beforeAll(async () => {
  const owner = await signUp("owner");
  ownerCookie = owner.cookie;
  orgA = await createProvisionedTestOrganization(auth, cleanup, H(ownerCookie), "Org A", `p3a-${suffix}`);
  await ensureOrganizationProfile(orgA);

  const b = await signUp("ownerb");
  orgB = await createProvisionedTestOrganization(auth, cleanup, H(b.cookie), "Org B", `p3b-${suffix}`);
  await ensureOrganizationProfile(orgB);

  const admin = await signUp("admin");
  adminCookie = admin.cookie;
  adminUserId = admin.userId;
  await addMember(orgA, adminUserId, "admin");

  const role = await signUp("role");
  roleCookie = role.cookie;
  roleUserId = role.userId;
  await addMember(orgA, roleUserId, "sales");
}, 60000);

afterAll(async () => {
  // Remove only the orgs (cascades) and users this test created (Phase 5 hygiene).
  await cleanup.run();
  await ownerPool.end();
});

describe("authentication", () => {
  it("rejects an unauthenticated request", async () => {
    const r = await updateOrganizationProfileAction({ nui: "x" }, new Headers());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("authorized roles (owner/admin) can update the org profile", () => {
  it("owner updates and the change persists", async () => {
    const r = await updateOrganizationProfileAction({ nui: `OWN-${suffix}`, city: "Prishtinë", marginDefault: 22 }, H(ownerCookie));
    expect(r.ok).toBe(true);
    expect(await profileNui(orgA)).toBe(`OWN-${suffix}`);
  });
  it("admin updates the same org", async () => {
    const r = await updateOrganizationProfileAction({ nui: `ADM-${suffix}` }, H(adminCookie));
    expect(r.ok).toBe(true);
    expect(await profileNui(orgA)).toBe(`ADM-${suffix}`);
  });
});

describe("role denial (sales/operator/accounting cannot update)", () => {
  for (const role of ["sales", "operator", "accounting"] as const) {
    it(`${role} is forbidden`, async () => {
      await setMemberRole(orgA, roleUserId, role);
      const r = await updateOrganizationProfileAction({ nui: "SHOULD-NOT-APPLY" }, H(roleCookie));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    });
  }
  it("the denied writes never touched the profile", async () => {
    expect(await profileNui(orgA)).toBe(`ADM-${suffix}`);
  });
});

describe("validation", () => {
  it("rejects out-of-range percentage with safe field errors", async () => {
    const r = await updateOrganizationProfileAction({ marginDefault: 999 }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
      expect(r.error.fieldErrors?.marginDefault?.length).toBeGreaterThan(0);
    }
  });
  it("rejects an invalid email", async () => {
    const r = await updateOrganizationProfileAction({ businessEmail: "not-an-email" }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
      expect(r.error.fieldErrors?.businessEmail?.length).toBeGreaterThan(0);
    }
  });
  it("accepts a valid partial update", async () => {
    const r = await updateOrganizationProfileAction({ businessEmail: `hi-${suffix}@example.com` }, H(ownerCookie));
    expect(r.ok).toBe(true);
    expect(await profileEmail(orgA)).toBe(`hi-${suffix}@example.com`);
  });
  it("accepts an empty businessEmail so the field can be cleared", async () => {
    const r = await updateOrganizationProfileAction({ businessEmail: "" }, H(ownerCookie));
    expect(r.ok).toBe(true);
    expect(await profileEmail(orgA)).toBe("");
  });
});

describe("tenancy", () => {
  it("uses the session active org, not a submitted organization id", async () => {
    // ownerCookie's active org is A. Try to smuggle org B's id in the payload.
    const r = await updateOrganizationProfileAction({ nui: `XT-${suffix}`, organizationId: orgB } as unknown as { nui: string }, H(ownerCookie));
    expect(r.ok).toBe(true);
    expect(await profileNui(orgA)).toBe(`XT-${suffix}`); // A changed
    expect(await profileNui(orgB)).toBeNull(); // B untouched
  });

  it("RLS is the backstop: an update targeting another org under org-A context affects 0 rows", async () => {
    const affected = await runWithOrg(db, orgA, async (tx) => {
      const res = await tx.execute(sql`update organization_profiles set nui='RLS-BYPASS' where organization_id=${orgB}`);
      return res.rowCount;
    });
    expect(affected).toBe(0);
    expect(await profileNui(orgB)).toBeNull();
  });

  it("returns NOT_FOUND (no cross-tenant disclosure) when the profile row is absent", async () => {
    await ownerPool.query(`delete from organization_profiles where organization_id=$1`, [orgA]);
    const r = await updateOrganizationProfileAction({ nui: "X" }, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    await ensureOrganizationProfile(orgA); // restore
  });
});

describe("authorization staleness", () => {
  it("a downgraded role is denied immediately (role read fresh, not from session)", async () => {
    await setMemberRole(orgA, adminUserId, "admin");
    expect((await updateOrganizationProfileAction({ nui: `A2-${suffix}` }, H(adminCookie))).ok).toBe(true);
    await setMemberRole(orgA, adminUserId, "sales"); // downgrade
    const r = await updateOrganizationProfileAction({ nui: "STALE" }, H(adminCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("a removed member can no longer act on the org", async () => {
    await ownerPool.query(`delete from member where organization_id=$1 and user_id=$2`, [orgA, adminUserId]);
    const r = await updateOrganizationProfileAction({ nui: "REMOVED" }, H(adminCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["FORBIDDEN", "UNAUTHENTICATED"]).toContain(r.error.code);
  });
});

describe("internal error sanitization", () => {
  it("maps an unexpected DB failure to a generic INTERNAL result (no SQL/stack leak)", async () => {
    const broken = createAction({
      input: z.object({}),
      handler: async ({ tx }) => {
        await tx.execute(sql`select 1 from a_table_that_does_not_exist_zzz`);
        return {};
      },
    });
    const r: ActionResult<unknown> = await broken({}, H(ownerCookie));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("INTERNAL");
      expect(r.error.message).not.toMatch(/a_table_that_does_not_exist_zzz|relation|syntax|select/i);
      expect(JSON.stringify(r.error)).not.toMatch(/postgres|password|npg_|neon\.tech|stack/i);
    }
  });
});
