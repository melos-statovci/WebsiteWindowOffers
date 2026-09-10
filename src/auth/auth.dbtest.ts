// Phase 2 authentication integration tests — exercise the REAL Better Auth
// instance against the Neon dev DB (runtime role kornizo_app). Run via
// `npm run test:db`. nextCookies() no-ops outside a request context, so we drive
// auth.api directly and carry the session via Set-Cookie -> Cookie.

import { describe, it, expect, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { ensureOrganizationProfile, isUuid } from "@/auth/organization";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);

const suffix = testRunId();
const emailA = `p2-a-${suffix}@example.test`;
const emailB = `p2-b-${suffix}@example.test`;
const PW = `test-pw-${suffix}`;

function cookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}
const H = (cookie: string) => new Headers({ cookie });

async function signUp(email: string, name: string): Promise<string> {
  cleanup.userEmail(email);
  const res = await auth.api.signUpEmail({ body: { email, password: PW, name }, asResponse: true });
  return cookieHeader(res);
}
async function signIn(email: string): Promise<string> {
  const res = await auth.api.signInEmail({ body: { email, password: PW }, asResponse: true });
  return cookieHeader(res);
}

let cookieA = "";
let cookieB = "";
let userAId = "";
let userBId = "";
let orgAId = "";
let orgBId = "";

afterAll(async () => {
  // Delete the organizations these tests created (cascades to member/invitation/
  // organization_profiles) and the users. Scoped strictly to this run's fixtures.
  await cleanup.run();
  await ownerPool.end();
});

describe("sign-up creates identity + session", () => {
  it("A signs up and gets a valid session", async () => {
    cookieA = await signUp(emailA, "User A");
    expect(cookieA.length).toBeGreaterThan(0);
    const s = await auth.api.getSession({ headers: H(cookieA) });
    expect(s?.user.email).toBe(emailA);
    userAId = s!.user.id;
    expect(isUuid(userAId)).toBe(true);
  });

  it("missing session cannot be read", async () => {
    const s = await auth.api.getSession({ headers: new Headers() });
    expect(s).toBeNull();
  });
});

describe("organization trust boundary + ownership + profile", () => {
  it("A cannot create an organization through the public session API", async () => {
    await expect(
      auth.api.createOrganization({
        headers: H(cookieA),
        body: { name: "Blocked Org A", slug: `org-a-blocked-${suffix}` },
      }),
    ).rejects.toThrow();

    const orgs = await auth.api.listOrganizations({ headers: H(cookieA) });
    expect(orgs).toHaveLength(0);
  });

  it("trusted provisioning creates an organization and makes A owner", async () => {
    orgAId = await createProvisionedTestOrganization(
      auth,
      cleanup,
      H(cookieA),
      "Org A",
      `org-a-${suffix}`,
    );
    expect(isUuid(orgAId)).toBe(true);
    const m = await ownerPool.query(`select role from member where organization_id=$1 and user_id=$2`, [orgAId, userAId]);
    expect(m.rows[0]?.role).toBe("owner");
  });

  it("active organization can be set and is reflected in the session", async () => {
    await auth.api.setActiveOrganization({ headers: H(cookieA), body: { organizationId: orgAId } });
    const s = await auth.api.getSession({ headers: H(cookieA) });
    expect(s?.session.activeOrganizationId).toBe(orgAId);
  });

  it("organization_profiles row exists for the org (created via withOrg/RLS)", async () => {
    await ensureOrganizationProfile(orgAId);
    const p = await ownerPool.query(`select count(*)::int n from organization_profiles where organization_id=$1`, [orgAId]);
    expect(p.rows[0].n).toBe(1);
  });
});

describe("sign-out and sign-in again", () => {
  it("sign-out invalidates the session", async () => {
    await auth.api.signOut({ headers: H(cookieA) });
    const s = await auth.api.getSession({ headers: H(cookieA) });
    expect(s).toBeNull();
  });

  it("A can sign in again and reach the session", async () => {
    cookieA = await signIn(emailA);
    const s = await auth.api.getSession({ headers: H(cookieA) });
    expect(s?.user.email).toBe(emailA);
  });
});

describe("cross-organization membership is enforced", () => {
  it("B signs up and is provisioned Org B through the trusted boundary", async () => {
    cookieB = await signUp(emailB, "User B");
    const sB = await auth.api.getSession({ headers: H(cookieB) });
    userBId = sB!.user.id;
    orgBId = await createProvisionedTestOrganization(auth, cleanup, H(cookieB), "Org B", `org-b-${suffix}`);
    expect(isUuid(orgBId)).toBe(true);
  });

  it("A cannot activate Org B (not a member)", async () => {
    await expect(
      auth.api.setActiveOrganization({ headers: H(cookieA), body: { organizationId: orgBId } }),
    ).rejects.toThrow();
  });

  it("malformed activeOrganizationId is rejected", async () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    await expect(
      auth.api.setActiveOrganization({ headers: H(cookieA), body: { organizationId: "not-a-uuid" } }),
    ).rejects.toThrow();
  });
});

describe("invitations grant membership with the correct role", () => {
  let invitationId = "";
  it("A (owner) invites B as operator", async () => {
    await auth.api.setActiveOrganization({ headers: H(cookieA), body: { organizationId: orgAId } });
    const inv = await auth.api.createInvitation({
      headers: H(cookieA),
      body: { email: emailB, role: "operator", organizationId: orgAId },
    });
    invitationId = inv!.id;
    expect(isUuid(invitationId)).toBe(true);
  });

  it("B accepts and becomes an operator member of Org A", async () => {
    await auth.api.acceptInvitation({ headers: H(cookieB), body: { invitationId } });
    const m = await ownerPool.query(`select role from member where organization_id=$1 and user_id=$2`, [orgAId, userBId]);
    expect(m.rows[0]?.role).toBe("operator");
  });

  it("B can now activate Org A", async () => {
    await auth.api.setActiveOrganization({ headers: H(cookieB), body: { organizationId: orgAId } });
    const s = await auth.api.getSession({ headers: H(cookieB) });
    expect(s?.session.activeOrganizationId).toBe(orgAId);
  });
});

describe("revoked membership can no longer authorize the organization", () => {
  it("after B is removed from Org A, B cannot re-activate it", async () => {
    await ownerPool.query(`delete from member where organization_id=$1 and user_id=$2`, [orgAId, userBId]);
    const orgs = await auth.api.listOrganizations({ headers: H(cookieB) });
    expect(orgs.some((o) => o.id === orgAId)).toBe(false);
    await expect(
      auth.api.setActiveOrganization({ headers: H(cookieB), body: { organizationId: orgAId } }),
    ).rejects.toThrow();
  });
});
