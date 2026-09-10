// Milestone 4 — approved trial application -> ONE new organization + 14-day
// Kornizo Standard trial.
//
// These tests prove the properties that make provisioning safe to expose to an
// operator: exactly-once organization creation (including across a simulated
// crash window), safe concurrency, convergent retry after partial failure,
// platform-only authorization, and applicant-driven session activation.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { runWithOrg } from "@/db/tenant";
import { isUuid } from "@/auth/organization";
import { getAuthContext } from "@/auth/session";
import {
  activateProvisionedOrganizationAction,
  submitTrialApplicationAction,
} from "@/server/acquisition";
import { getAccountState } from "@/server/platform/accounts";
import { listAuditEvents } from "@/server/platform/audit";
import {
  retryTrialApplicationProvisioningAction,
  reviewTrialApplicationAction,
} from "@/server/platform/actions/applications";
import { provisionApprovedTrialApplication } from "@/server/platform/provisioning";
import { findOrganizationBySlug, stableProvisioningSlug } from "@/server/provisioning";
import { createProvisionedTestOrganization, TestCleanup, testRunId } from "@/db/testing/fixtures";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const H = (cookie: string) => new Headers({ cookie });
const email = (who: string) => `prov-${suffix}-${who}@example.test`;

function cookieHeader(res: Response): string {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function signUp(who: string): Promise<{ cookie: string; userId: string; email: string }> {
  const address = cleanup.userEmail(email(who));
  const res = await auth.api.signUpEmail({
    body: { email: address, password: PW, name: `Prov ${who}` },
    asResponse: true,
  });
  const cookie = cookieHeader(res);
  const session = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: session!.user.id, email: address };
}

function trialInput(company: string) {
  return {
    companyName: company,
    phone: "+38344222333",
    country: "Kosovë",
    companySize: "6-15" as const,
    offersPerMonth: 12,
    formStartedAt: Date.now() - 5000,
  };
}

/** Submit a fresh application for a brand-new applicant and return both ids. */
async function newApplicant(who: string, company: string) {
  const applicant = await signUp(who);
  const res = await submitTrialApplicationAction(trialInput(company), H(applicant.cookie));
  if (!res.ok || !res.data.application) throw new Error(`could not submit application for ${who}`);
  applicationIds.push(res.data.application.id);
  return { ...applicant, applicationId: res.data.application.id };
}

const applicationIds: string[] = [];
let platform = { cookie: "", userId: "", email: "" };
let outsider = { cookie: "", userId: "", email: "" };
let tenantCookie = "";
let tenantOrgId = "";

beforeAll(async () => {
  platform = await signUp("platform");
  await ownerPool.query(
    `insert into platform_admins(user_id, email, note) values($1,$2,'provisioning test') on conflict (user_id) do nothing`,
    [platform.userId, platform.email],
  );

  outsider = await signUp("outsider");

  const tenant = await signUp("tenant");
  tenantCookie = tenant.cookie;
  tenantOrgId = await createProvisionedTestOrganization(
    auth,
    cleanup,
    H(tenantCookie),
    "Prov Tenant",
    `prov-tenant-${suffix}`,
  );
}, 90000);

afterAll(async () => {
  if (applicationIds.length > 0) {
    await ownerPool.query(
      `delete from platform_audit_events where metadata->>'trialApplicationId' = any($1::text[])`,
      [applicationIds],
    );
    // Track every organization provisioning created, then drop the acquisition
    // rows before TestCleanup deletes the orgs (FK is ON DELETE RESTRICT).
    const orgs = await ownerPool.query<{ organization_id: string }>(
      `select organization_id from trial_applications where id = any($1::uuid[]) and organization_id is not null`,
      [applicationIds],
    );
    for (const row of orgs.rows) cleanup.org(row.organization_id);
    await ownerPool.query(`delete from trial_applications where id = any($1::uuid[])`, [applicationIds]);
  }
  await cleanup.run();
  await ownerPool.end();
});

describe("approval provisions exactly one new organization", () => {
  let applicant: Awaited<ReturnType<typeof newApplicant>>;
  let organizationId = "";

  it("approves and provisions a complete tenant", async () => {
    applicant = await newApplicant("success", `Prov Success ${suffix}`);
    const beforeAudit = (await listAuditEvents({ action: "TRIAL_APPLICATION_PROVISIONED" })).total;

    const res = await reviewTrialApplicationAction(
      { id: applicant.applicationId, decision: "approved", internalReviewNote: "ok" },
      H(platform.cookie),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("approved");
    expect(res.data.provisioning?.state).toBe("provisioned");

    const app = await ownerPool.query(
      `select organization_id, provisioning_status, provisioned_at, provisioning_attempts, provisioning_error_code
       from trial_applications where id=$1`,
      [applicant.applicationId],
    );
    organizationId = app.rows[0].organization_id;
    expect(isUuid(organizationId)).toBe(true);
    expect(app.rows[0].provisioning_status).toBe("provisioned");
    expect(app.rows[0].provisioned_at).toBeTruthy();
    expect(app.rows[0].provisioning_attempts).toBe(1);
    expect(app.rows[0].provisioning_error_code).toBeNull();

    const audit = await listAuditEvents({ action: "TRIAL_APPLICATION_PROVISIONED" });
    expect(audit.total).toBe(beforeAudit + 1);
    expect(audit.events[0].organizationId).toBe(organizationId);
    expect(audit.events[0].metadata.trialApplicationId).toBe(applicant.applicationId);
    expect(JSON.stringify(audit.events[0].metadata)).not.toContain("ok");
  });

  it("makes the applicant the Better Auth owner — no parallel owner table", async () => {
    const members = await ownerPool.query(
      `select user_id, role from member where organization_id=$1`,
      [organizationId],
    );
    expect(members.rowCount).toBe(1);
    expect(members.rows[0].user_id).toBe(applicant.userId);
    expect(members.rows[0].role).toBe("owner");
  });

  it("creates exactly one organization profile", async () => {
    const profile = await runWithOrg(db, organizationId, (tx) =>
      tx.execute(sql`select count(*)::int as n from organization_profiles where organization_id = ${organizationId}`),
    );
    expect(Number((profile.rows[0] as { n: number }).n)).toBe(1);
  });

  it("creates one Kornizo Standard account on a 14-day trial starting at provisioning", async () => {
    const account = await getAccountState(organizationId);
    expect(account.accountReady).toBe(true);
    expect(account.plan).toBe("STANDARD");
    expect(account.commercialAccess).toBe("trial");
    expect(account.effectiveCommercialAccess).toBe("trial");
    expect(account.status).toBe("active");
    expect(account.activatedAt).toBeNull();

    expect(account.trialDaysRemaining).toBe(14);

    // Compare in SQL: these columns are `timestamp without time zone`, so the
    // node-postgres driver parses them as LOCAL time while now() comes back as
    // timestamptz. Doing the arithmetic in the database keeps the assertion
    // about the data rather than about the test machine's timezone.
    const rows = await ownerPool.query(
      `select count(*)::int as n,
              max(extract(epoch from (now()::timestamp - trial_started_at)))::int as started_skew_s,
              max(extract(epoch from (trial_ends_at - trial_started_at)))::int as window_s
       from organization_accounts where organization_id=$1`,
      [organizationId],
    );
    expect(rows.rows[0].n).toBe(1);
    // Trial begins at PROVISIONING time, not at submission or approval time.
    expect(Math.abs(rows.rows[0].started_skew_s)).toBeLessThan(120);
    expect(rows.rows[0].window_s).toBe(14 * 24 * 60 * 60);

    // ...and the application's provisioned_at agrees with the trial start.
    const app = await ownerPool.query(
      `select extract(epoch from (a.trial_started_at - t.provisioned_at))::int as delta_s
       from trial_applications t join organization_accounts a on a.organization_id = t.organization_id
       where t.id=$1`,
      [applicant.applicationId],
    );
    expect(Math.abs(app.rows[0].delta_s)).toBeLessThan(120);
  });

  it("creates exactly one active default price list", async () => {
    const pricing = await runWithOrg(db, organizationId, (tx) =>
      tx.execute(sql`
        select count(*)::int as total, count(*) filter (where is_active)::int as active
        from price_lists where organization_id = ${organizationId}
      `),
    );
    const row = pricing.rows[0] as { total: number; active: number };
    expect(Number(row.total)).toBe(1);
    expect(Number(row.active)).toBe(1);
  });

  it("shows the organization through canonical platform account data", async () => {
    const org = await ownerPool.query(`select name, slug from organization where id=$1`, [organizationId]);
    expect(org.rows[0].name).toBe(`Prov Success ${suffix}`);
    expect(org.rows[0].slug).toBe(stableProvisioningSlug(`Prov Success ${suffix}`, applicant.applicationId));
  });

  it("re-approving a provisioned application is refused", async () => {
    const res = await reviewTrialApplicationAction(
      { id: applicant.applicationId, decision: "rejected", internalReviewNote: "" },
      H(platform.cookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("CONFLICT");
  });

  it("retrying a provisioned application is an idempotent no-op", async () => {
    const orgCountBefore = await ownerPool.query(`select count(*)::int as n from organization`);
    const res = await retryTrialApplicationProvisioningAction(
      { id: applicant.applicationId },
      H(platform.cookie),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.provisioning.state).toBe("provisioned");

    const orgCountAfter = await ownerPool.query(`select count(*)::int as n from organization`);
    expect(orgCountAfter.rows[0].n).toBe(orgCountBefore.rows[0].n);

    const app = await ownerPool.query(`select organization_id from trial_applications where id=$1`, [
      applicant.applicationId,
    ]);
    expect(app.rows[0].organization_id).toBe(organizationId);
  });

  it("isolates the new tenant from an existing tenant under RLS", async () => {
    await runWithOrg(db, tenantOrgId, (tx) =>
      tx.execute(sql`insert into clients (organization_id, name, type) values (${tenantOrgId}, 'Prov Other Client', 'Privat')`),
    );
    await runWithOrg(db, organizationId, (tx) =>
      tx.execute(sql`insert into clients (organization_id, name, type) values (${organizationId}, 'Prov New Client', 'Privat')`),
    );

    const fromNew = await runWithOrg(db, organizationId, (tx) =>
      tx.execute(sql`select name from clients`),
    );
    expect(fromNew.rows.map((r) => (r as { name: string }).name)).toEqual(["Prov New Client"]);

    const fromExisting = await runWithOrg(db, tenantOrgId, (tx) =>
      tx.execute(sql`select name from clients`),
    );
    expect(fromExisting.rows.map((r) => (r as { name: string }).name)).toEqual(["Prov Other Client"]);
  });

  it("lets the applicant activate their own organization in their own session", async () => {
    // Platform approval must NOT have touched the applicant's session.
    const before = await auth.api.getSession({ headers: H(applicant.cookie) });
    expect(before?.session.activeOrganizationId).toBeFalsy();

    const activated = await activateProvisionedOrganizationAction(H(applicant.cookie));
    expect(activated.ok).toBe(true);
    if (activated.ok) expect(activated.data.organizationId).toBe(organizationId);

    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.ctx.organizationId).toBe(organizationId);
      expect(ctx.ctx.role).toBe("owner");
      expect(ctx.ctx.plan).toBe("STANDARD");
      expect(ctx.ctx.effectiveCommercialAccess).toBe("trial");
    }
  });

  it("keeps tenant access coherent after signing out and back in", async () => {
    const res = await auth.api.signInEmail({
      body: { email: applicant.email, password: PW },
      asResponse: true,
    });
    const freshCookie = cookieHeader(res);
    const ctx = await getAuthContext(H(freshCookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(ctx.ctx.organizationId).toBe(organizationId);
  });

  it("does not let another signed-in user activate someone else's organization", async () => {
    const res = await activateProvisionedOrganizationAction(H(outsider.cookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
    const session = await auth.api.getSession({ headers: H(outsider.cookie) });
    expect(session?.session.activeOrganizationId).toBeFalsy();
  });
});

describe("exactly-once organization under crash and concurrency", () => {
  it("adopts the organization an interrupted attempt already created instead of creating a second", async () => {
    const applicant = await newApplicant("crash", `Prov Crash ${suffix}`);
    const approve = await reviewTrialApplicationAction(
      { id: applicant.applicationId, decision: "approved", internalReviewNote: "" },
      H(platform.cookie),
    );
    expect(approve.ok).toBe(true);
    const firstOrg = (
      await ownerPool.query(`select organization_id from trial_applications where id=$1`, [applicant.applicationId])
    ).rows[0].organization_id as string;

    // Simulate the dangerous window: Better Auth committed the organization, but
    // the process died before the linkage/completion was recorded. The slug row
    // is deliberately left in place — that is the recovery key.
    await ownerPool.query(
      `update trial_applications
       set organization_id = null, provisioning_status = 'failed',
           provisioned_at = null, provisioning_error_code = 'UNEXPECTED'
       where id = $1`,
      [applicant.applicationId],
    );

    const orgsBefore = (await ownerPool.query(`select count(*)::int as n from organization`)).rows[0].n;
    const retry = await retryTrialApplicationProvisioningAction({ id: applicant.applicationId }, H(platform.cookie));
    expect(retry.ok).toBe(true);
    const orgsAfter = (await ownerPool.query(`select count(*)::int as n from organization`)).rows[0].n;

    // No second organization, and the SAME one is re-adopted.
    expect(orgsAfter).toBe(orgsBefore);
    const app = await ownerPool.query(
      `select organization_id, provisioning_status from trial_applications where id=$1`,
      [applicant.applicationId],
    );
    expect(app.rows[0].organization_id).toBe(firstOrg);
    expect(app.rows[0].provisioning_status).toBe("provisioned");

    const bySlug = await findOrganizationBySlug(
      stableProvisioningSlug(`Prov Crash ${suffix}`, applicant.applicationId),
    );
    expect(bySlug?.id).toBe(firstOrg);
  });

  it("converges to one valid tenant when provisioning is retried after a partial failure", async () => {
    const applicant = await newApplicant("partial", `Prov Partial ${suffix}`);
    const approve = await reviewTrialApplicationAction(
      { id: applicant.applicationId, decision: "approved", internalReviewNote: "" },
      H(platform.cookie),
    );
    expect(approve.ok).toBe(true);
    const orgId = (
      await ownerPool.query(`select organization_id from trial_applications where id=$1`, [applicant.applicationId])
    ).rows[0].organization_id as string;

    // Roll the tenant back to "organization exists, account + pricing missing"
    // and mark the application failed, exactly as a mid-flight crash would.
    await ownerPool.query(`delete from organization_accounts where organization_id=$1`, [orgId]);
    await ownerPool.query(`delete from price_lists where organization_id=$1`, [orgId]);
    await ownerPool.query(
      `update trial_applications set provisioning_status='failed', provisioned_at=null,
       provisioning_error_code='ACCOUNT_MISSING' where id=$1`,
      [applicant.applicationId],
    );
    expect((await getAccountState(orgId)).accountReady).toBe(false);

    const retry = await retryTrialApplicationProvisioningAction({ id: applicant.applicationId }, H(platform.cookie));
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.data.provisioning.state).toBe("provisioned");

    const account = await getAccountState(orgId);
    expect(account.accountReady).toBe(true);
    expect(account.plan).toBe("STANDARD");
    expect(account.commercialAccess).toBe("trial");

    const counts = await ownerPool.query(
      `select (select count(*)::int from organization_accounts where organization_id=$1) as accounts,
              (select count(*)::int from member where organization_id=$1) as members`,
      [orgId],
    );
    expect(counts.rows[0].accounts).toBe(1);
    expect(counts.rows[0].members).toBe(1);
    const pricing = await runWithOrg(db, orgId, (tx) =>
      tx.execute(sql`select count(*) filter (where is_active)::int as active from price_lists where organization_id = ${orgId}`),
    );
    expect(Number((pricing.rows[0] as { active: number }).active)).toBe(1);
  });

  it("two concurrent provisioning attempts produce exactly one tenant", async () => {
    const applicant = await newApplicant("race", `Prov Race ${suffix}`);
    // Approve WITHOUT provisioning by driving the decision directly, so both
    // racers start from a clean not_started state.
    await ownerPool.query(
      `update trial_applications set status='approved', reviewed_at=now(),
       reviewed_by_user_id=$2, reviewed_by_email=$3 where id=$1`,
      [applicant.applicationId, platform.userId, platform.email],
    );

    const orgsBefore = (await ownerPool.query(`select count(*)::int as n from organization`)).rows[0].n;
    const actor = { userId: platform.userId, email: platform.email };
    const [a, b] = await Promise.all([
      provisionApprovedTrialApplication(applicant.applicationId, actor),
      provisionApprovedTrialApplication(applicant.applicationId, actor),
    ]);
    const orgsAfter = (await ownerPool.query(`select count(*)::int as n from organization`)).rows[0].n;

    // Exactly one organization, whichever attempt won the claim.
    expect(orgsAfter - orgsBefore).toBe(1);
    const succeeded = [a, b].filter((r) => r.ok);
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    const orgId = (
      await ownerPool.query(`select organization_id from trial_applications where id=$1`, [applicant.applicationId])
    ).rows[0].organization_id as string;
    expect(isUuid(orgId)).toBe(true);

    const counts = await ownerPool.query(
      `select (select count(*)::int from member where organization_id=$1) as members,
              (select count(*)::int from organization_accounts where organization_id=$1) as accounts,
              (select count(*)::int from trial_applications where organization_id=$1) as links`,
      [orgId],
    );
    expect(counts.rows[0].members).toBe(1);
    expect(counts.rows[0].accounts).toBe(1);
    expect(counts.rows[0].links).toBe(1);
    const pricing = await runWithOrg(db, orgId, (tx) =>
      tx.execute(sql`select count(*) filter (where is_active)::int as active from price_lists where organization_id = ${orgId}`),
    );
    expect(Number((pricing.rows[0] as { active: number }).active)).toBe(1);
  });
});

describe("provisioning authorization and refusals", () => {
  it("a rejected application can never be provisioned", async () => {
    const applicant = await newApplicant("rejected", `Prov Rejected ${suffix}`);
    const res = await reviewTrialApplicationAction(
      { id: applicant.applicationId, decision: "rejected", internalReviewNote: "" },
      H(platform.cookie),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.provisioning).toBeNull();

    const retry = await retryTrialApplicationProvisioningAction({ id: applicant.applicationId }, H(platform.cookie));
    expect(retry.ok).toBe(false);
    if (!retry.ok) expect(retry.error.code).toBe("CONFLICT");

    const direct = await provisionApprovedTrialApplication(applicant.applicationId, {
      userId: platform.userId,
      email: platform.email,
    });
    expect(direct.ok).toBe(false);
    if (!direct.ok && direct.kind === "rejected") expect(direct.reason).toBe("NOT_APPROVED");

    const app = await ownerPool.query(
      `select organization_id, provisioning_status from trial_applications where id=$1`,
      [applicant.applicationId],
    );
    expect(app.rows[0].organization_id).toBeNull();
    expect(app.rows[0].provisioning_status).toBe("not_started");
    const members = await ownerPool.query(`select count(*)::int as n from member where user_id=$1`, [applicant.userId]);
    expect(members.rows[0].n).toBe(0);
  });

  it("a tenant user cannot retry provisioning", async () => {
    const res = await retryTrialApplicationProvisioningAction(
      { id: applicationIds[0] },
      H(tenantCookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });

  it("a signed-in non-platform user cannot retry provisioning", async () => {
    const res = await retryTrialApplicationProvisioningAction({ id: applicationIds[0] }, H(outsider.cookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });

  it("an unauthenticated caller cannot retry provisioning", async () => {
    const res = await retryTrialApplicationProvisioningAction({ id: applicationIds[0] }, new Headers());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
  });

  it("an unknown application id fails safely", async () => {
    const res = await retryTrialApplicationProvisioningAction(
      { id: "00000000-0000-4000-8000-000000000000" },
      H(platform.cookie),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NOT_FOUND");
  });

  it("a malformed application id fails validation", async () => {
    const res = await retryTrialApplicationProvisioningAction({ id: "not-a-uuid" }, H(platform.cookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("an applicant cannot activate before their application is provisioned", async () => {
    const applicant = await newApplicant("pending", `Prov Pending ${suffix}`);
    const res = await activateProvisionedOrganizationAction(H(applicant.cookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");

    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("NO_ORGANIZATION");
  });

  it("an unauthenticated caller cannot activate an organization", async () => {
    const res = await activateProvisionedOrganizationAction(new Headers());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("database invariants", () => {
  it("refuses to link an organization to a non-approved application", async () => {
    const applicant = await newApplicant("invariant", `Prov Invariant ${suffix}`);
    await expect(
      ownerPool.query(`update trial_applications set organization_id=$2 where id=$1`, [
        applicant.applicationId,
        tenantOrgId,
      ]),
    ).rejects.toThrow(/trial_applications_link_requires_approval_chk/);
  });

  it("refuses to mark an application provisioned without an organization", async () => {
    const applicant = await newApplicant("shape", `Prov Shape ${suffix}`);
    await ownerPool.query(`update trial_applications set status='approved' where id=$1`, [applicant.applicationId]);
    await expect(
      ownerPool.query(`update trial_applications set provisioning_status='provisioned' where id=$1`, [
        applicant.applicationId,
      ]),
    ).rejects.toThrow(/trial_applications_provisioned_shape_chk/);
  });

  it("refuses to link one organization to two applications", async () => {
    const first = await newApplicant("dup-a", `Prov Dup A ${suffix}`);
    const second = await newApplicant("dup-b", `Prov Dup B ${suffix}`);
    const approved = await reviewTrialApplicationAction(
      { id: first.applicationId, decision: "approved", internalReviewNote: "" },
      H(platform.cookie),
    );
    expect(approved.ok).toBe(true);
    const orgId = (
      await ownerPool.query(`select organization_id from trial_applications where id=$1`, [first.applicationId])
    ).rows[0].organization_id as string;

    await ownerPool.query(`update trial_applications set status='approved' where id=$1`, [second.applicationId]);
    await expect(
      ownerPool.query(`update trial_applications set organization_id=$2 where id=$1`, [second.applicationId, orgId]),
    ).rejects.toThrow(/trial_applications_organization_uidx/);
  });
});
