import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { isUuid } from "@/auth/organization";
import { getAuthContext } from "@/auth/session";
import { submitDemoRequestAction, submitTrialApplicationAction } from "@/server/acquisition";
import { getAccountState } from "@/server/platform/accounts";
import { listAuditEvents } from "@/server/platform/audit";
import {
  reviewTrialApplicationAction,
  setDemoRequestStatusAction,
} from "@/server/platform/actions/applications";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const H = (cookie: string) => new Headers({ cookie });
const email = (who: string) => `acq-${suffix}-${who}@example.test`;

function cookieHeader(res: Response): string {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function signUp(who: string): Promise<{ cookie: string; userId: string; email: string }> {
  const address = cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: address, password: PW, name: `Acq ${who}` },
    asResponse: true,
  });
  const cookie = cookieHeader(res);
  const session = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: session!.user.id, email: address };
}

async function grantPlatformAdmin(userId: string, address: string) {
  await ownerPool.query(
    `insert into platform_admins(user_id, email, note) values($1,$2,'acquisition test') on conflict (user_id) do nothing`,
    [userId, address],
  );
}

const trialInput = {
  companyName: `Acq Trial ${suffix}`,
  phone: "+38344111222",
  country: "Kosovë",
  companySize: "6-15" as const,
  offersPerMonth: 42,
  message: "Synthetic trial application",
  formStartedAt: Date.now() - 5000,
};

let applicantCookie = "";
let applicantUserId = "";
let applicantEmail = "";
let platformCookie = "";
let platformUserId = "";
let platformEmail = "";
let tenantCookie = "";
let tenantOrgId = "";
let trialApplicationId = "";
let demoRequestId = "";

beforeAll(async () => {
  const applicant = await signUp("applicant");
  applicantCookie = applicant.cookie;
  applicantUserId = applicant.userId;
  applicantEmail = applicant.email;

  const platform = await signUp("platform");
  platformCookie = platform.cookie;
  platformUserId = platform.userId;
  platformEmail = platform.email;
  await grantPlatformAdmin(platformUserId, platformEmail);

  const tenant = await signUp("tenant");
  tenantCookie = tenant.cookie;
  tenantOrgId = await createProvisionedTestOrganization(auth, cleanup, H(tenantCookie), "Acq Tenant", `acq-tenant-${suffix}`);
}, 60000);

afterAll(async () => {
  if (trialApplicationId) {
    await ownerPool.query(
      `delete from platform_audit_events where metadata->>'trialApplicationId' = $1`,
      [trialApplicationId],
    );
    // Unlink before TestCleanup drops the organization (FK is ON DELETE RESTRICT).
    await ownerPool.query(`delete from trial_applications where id = $1`, [trialApplicationId]);
  }
  if (demoRequestId) {
    await ownerPool.query(
      `delete from platform_audit_events where metadata->>'demoRequestId' = $1`,
      [demoRequestId],
    );
  }
  await ownerPool.query(`delete from demo_requests where normalized_email like $1`, [`acq-${suffix}-%`]);
  await cleanup.run();
  await ownerPool.end();
});

describe("trial acquisition creates identity, not tenancy", () => {
  it("Better Auth signup alone creates no organization, membership, account, pricing or active organization", async () => {
    const orgs = await auth.api.listOrganizations({ headers: H(applicantCookie) });
    const session = await auth.api.getSession({ headers: H(applicantCookie) });
    expect(orgs).toHaveLength(0);
    expect(session?.session.activeOrganizationId).toBeFalsy();

    const counts = await ownerPool.query(
      `
        select
          (select count(*)::int from member where user_id=$1) as memberships,
          (select count(*)::int from organization_accounts a join member m on m.organization_id=a.organization_id where m.user_id=$1) as accounts,
          (select count(*)::int from price_lists p join member m on m.organization_id=p.organization_id where m.user_id=$1) as pricing
      `,
      [applicantUserId],
    );
    expect(counts.rows[0].memberships).toBe(0);
    expect(counts.rows[0].accounts).toBe(0);
    expect(counts.rows[0].pricing).toBe(0);
  });

  it("a signed-in ordinary user cannot call Better Auth organization creation directly", async () => {
    await expect(
      auth.api.createOrganization({
        headers: H(applicantCookie),
        body: { name: "Blocked Direct Org", slug: `blocked-direct-${suffix}` },
      }),
    ).rejects.toThrow();

    const orgs = await auth.api.listOrganizations({ headers: H(applicantCookie) });
    expect(orgs).toHaveLength(0);
  });

  it("stores one Trial Application linked to the canonical Better Auth user", async () => {
    const res = await submitTrialApplicationAction(
      { ...trialInput, status: "approved", userId: "00000000-0000-4000-8000-000000000000" },
      H(applicantCookie),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.application).toBeTruthy();
    trialApplicationId = res.data.application!.id;
    expect(isUuid(trialApplicationId)).toBe(true);
    expect(res.data.application!.userId).toBe(applicantUserId);
    expect(res.data.application!.email).toBe(applicantEmail);
    expect(res.data.application!.status).toBe("pending");
  });

  it("duplicate submissions are suppressed by current user/email", async () => {
    const res = await submitTrialApplicationAction(trialInput, H(applicantCookie));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.duplicate).toBe(true);
    expect(res.data.application?.id).toBe(trialApplicationId);

    const count = await ownerPool.query(`select count(*)::int as n from trial_applications where user_id=$1`, [applicantUserId]);
    expect(count.rows[0].n).toBe(1);
  });

  it("an account-only applicant cannot resolve tenant context before provisioning", async () => {
    const ctx = await getAuthContext(H(applicantCookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("NO_ORGANIZATION");
  });

  it("a signed-in user with an existing tenant cannot create another Trial Application", async () => {
    const res = await submitTrialApplicationAction(trialInput, H(tenantCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });
});

describe("demo acquisition remains accountless", () => {
  it("stores a Demo Request without creating a Better Auth user", async () => {
    const demoEmail = `acq-${suffix}-demo@example.test`;
    const before = await ownerPool.query(`select count(*)::int as n from "user" where email=$1`, [demoEmail]);
    const res = await submitDemoRequestAction({
      name: "Demo Person",
      companyName: `Acq Demo ${suffix}`,
      email: demoEmail,
      phone: "+38344111333",
      country: "Kosovë",
      message: "Synthetic demo",
      formStartedAt: Date.now() - 5000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    demoRequestId = res.data.request!.id;

    const after = await ownerPool.query(`select count(*)::int as n from "user" where email=$1`, [demoEmail]);
    expect(before.rows[0].n).toBe(0);
    expect(after.rows[0].n).toBe(0);
  });

  it("suppresses duplicate Demo Requests by normalized email", async () => {
    const res = await submitDemoRequestAction({
      name: "Demo Person Again",
      companyName: `Acq Demo ${suffix}`,
      email: `ACQ-${suffix}-DEMO@EXAMPLE.TEST`,
      phone: "+38344111333",
      country: "Kosovë",
      formStartedAt: Date.now() - 5000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.duplicate).toBe(true);
    expect(res.data.request?.id).toBe(demoRequestId);
  });
});

describe("platform application review", () => {
  it("tenant users cannot approve Trial Applications", async () => {
    const res = await reviewTrialApplicationAction({ id: trialApplicationId, decision: "approved", internalReviewNote: "" }, H(tenantCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });

  it("Platform Admin approval records the decision, provisions a tenant, and never logs the internal note", async () => {
    const before = (await listAuditEvents({ action: "TRIAL_APPLICATION_APPROVED" })).total;
    const res = await reviewTrialApplicationAction(
      { id: trialApplicationId, decision: "approved", internalReviewNote: "internal only" },
      H(platformCookie),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.provisioning?.state).toBe("provisioned");

    const row = await ownerPool.query(
      `select status, reviewed_by_user_id, reviewed_by_email, organization_id, provisioning_status
       from trial_applications where id=$1`,
      [trialApplicationId],
    );
    expect(row.rows[0].status).toBe("approved");
    expect(row.rows[0].reviewed_by_user_id).toBe(platformUserId);
    expect(row.rows[0].reviewed_by_email).toBe(platformEmail);
    expect(row.rows[0].provisioning_status).toBe("provisioned");
    expect(isUuid(row.rows[0].organization_id)).toBe(true);
    // Track for teardown: approval created a real organization.
    cleanup.org(row.rows[0].organization_id);

    const after = await listAuditEvents({ action: "TRIAL_APPLICATION_APPROVED" });
    expect(after.total).toBe(before + 1);
    expect(JSON.stringify(after.events[0].metadata)).not.toContain("internal only");
  });

  it("a reviewed Trial Application cannot be reviewed again", async () => {
    const res = await reviewTrialApplicationAction({ id: trialApplicationId, decision: "rejected", internalReviewNote: "" }, H(platformCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("CONFLICT");
  });

  it("Platform Admin changes demo status and writes audit", async () => {
    const before = (await listAuditEvents({ action: "DEMO_REQUEST_STATUS_CHANGED" })).total;
    const res = await setDemoRequestStatusAction({ id: demoRequestId, status: "contacted" }, H(platformCookie));
    expect(res.ok).toBe(true);
    const after = await listAuditEvents({ action: "DEMO_REQUEST_STATUS_CHANGED" });
    expect(after.total).toBe(before + 1);
    expect(after.events[0].metadata.newStatus).toBe("contacted");
  });
});

describe("missing organization account fails closed", () => {
  it("a tenant with a missing organization_accounts row does not receive active Standard access", async () => {
    await ownerPool.query(`delete from organization_accounts where organization_id=$1`, [tenantOrgId]);
    const account = await getAccountState(tenantOrgId);
    expect(account.accountReady).toBe(false);
    expect(account.effectiveCommercialAccess).toBe("account_not_ready");

    const ctx = await getAuthContext(H(tenantCookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("ACCOUNT_NOT_READY");
  });
});
