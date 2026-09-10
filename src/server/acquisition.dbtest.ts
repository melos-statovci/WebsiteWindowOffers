import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { isUuid } from "@/auth/organization";
import { getAuthContext } from "@/auth/session";
import {
  submitDemoContactRequestAction,
  submitGeneralContactRequestAction,
  submitTrialApplicationAction,
} from "@/server/acquisition";
import { getAccountState } from "@/server/platform/accounts";
import { listAuditEvents } from "@/server/platform/audit";
import {
  reviewTrialApplicationAction,
  setContactRequestStatusAction,
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
let generalRequestId = "";

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
  // Every contact request this file created, and the audit rows they produced.
  // Scoped strictly to this run's synthetic .test addresses.
  const contactIds = await ownerPool.query<{ id: string }>(
    `select id from contact_requests where normalized_email like $1`,
    [`acq-${suffix}-%`],
  );
  if (contactIds.rowCount) {
    await ownerPool.query(
      `delete from platform_audit_events where metadata->>'contactRequestId' = any($1::text[])`,
      [contactIds.rows.map((r) => r.id)],
    );
  }
  await ownerPool.query(`delete from contact_requests where normalized_email like $1`, [`acq-${suffix}-%`]);
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

// Milestone 5.5 — both public contact entry points persist as ONE
// contact_requests row discriminated by `intent`. "Request a demo" is still a
// real, distinct public action; only the storage became generic.
describe("contact acquisition remains accountless", () => {
  const demoEmail = `acq-${suffix}-demo@example.test`;
  const generalEmail = `acq-${suffix}-general@example.test`;

  async function tenancyFootprint(address: string) {
    const res = await ownerPool.query<{ users: string; members: string; orgs: string; apps: string }>(
      `select
         (select count(*) from "user" where lower(email) = $1) as users,
         (select count(*) from member m join "user" u on u.id = m.user_id where lower(u.email) = $1) as members,
         (select count(*) from organization where lower(name) like '%' || $2 || '%') as orgs,
         (select count(*) from trial_applications where normalized_email = $1) as apps`,
      [address, suffix.toLowerCase()],
    );
    const row = res.rows[0];
    return {
      users: Number(row.users),
      members: Number(row.members),
      apps: Number(row.apps),
    };
  }

  it("stores a DEMO request with intent 'demo'", async () => {
    const before = await tenancyFootprint(demoEmail);
    const res = await submitDemoContactRequestAction({
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
    expect(res.data.request!.intent).toBe("demo");

    // No Better Auth user, no membership, no trial application.
    const after = await tenancyFootprint(demoEmail);
    expect(before.users).toBe(0);
    expect(after.users).toBe(0);
    expect(after.members).toBe(0);
    expect(after.apps).toBe(0);
  });

  it("stores a GENERAL contact with intent 'general' and no company or phone", async () => {
    const res = await submitGeneralContactRequestAction({
      name: "General Person",
      email: generalEmail,
      message: "A synthetic general question about Kornizo.",
      formStartedAt: Date.now() - 5000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    generalRequestId = res.data.request!.id;
    expect(res.data.request!.intent).toBe("general");
    // Company and phone are genuinely optional for a general question.
    expect(res.data.request!.companyName).toBeNull();
    expect(res.data.request!.phone).toBeNull();
    expect(res.data.request!.country).toBeNull();
    expect(res.data.request!.message).toContain("synthetic general question");

    const after = await tenancyFootprint(generalEmail);
    expect(after.users).toBe(0);
    expect(after.members).toBe(0);
    expect(after.apps).toBe(0);
  });

  it("requires a message on a general contact", async () => {
    // Enforced by Zod AND by contact_requests_general_shape_chk.
    const res = await submitGeneralContactRequestAction({
      name: "No Question",
      email: `acq-${suffix}-empty@example.test`,
      message: "",
      formStartedAt: Date.now() - 5000,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
  });

  it("rejects a filled honeypot without creating a row", async () => {
    const trapEmail = `acq-${suffix}-bot@example.test`;
    const res = await submitGeneralContactRequestAction({
      name: "Spam Bot",
      email: trapEmail,
      message: "buy cheap things now",
      website: "http://spam.example",
      formStartedAt: Date.now() - 5000,
    });
    // Inherited demo-form behaviour, asserted as it actually is: the honeypot
    // field is `z.string().max(0)`, so Zod rejects a filled one BEFORE
    // isLikelyBot() is reached, and the caller sees VALIDATION rather than the
    // silent `ignored: true`. The security property that matters is identical —
    // nothing is persisted. (Silently accepting would leak less to a bot; that
    // is a deliberate non-change here, since the milestone asked to reuse the
    // proven controls rather than redesign them.)
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION");
    const rows = await ownerPool.query(`select count(*)::int n from contact_requests where normalized_email=$1`, [
      trapEmail,
    ]);
    expect(rows.rows[0].n).toBe(0);
  });

  it("ignores a submission completed implausibly fast", async () => {
    const fastEmail = `acq-${suffix}-fast@example.test`;
    const res = await submitGeneralContactRequestAction({
      name: "Too Fast",
      email: fastEmail,
      message: "instant submission attempt",
      formStartedAt: Date.now(),
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.ignored).toBe(true);
    const rows = await ownerPool.query(`select count(*)::int n from contact_requests where normalized_email=$1`, [
      fastEmail,
    ]);
    expect(rows.rows[0].n).toBe(0);
  });

  it("suppresses a duplicate OPEN request of the same intent, case-insensitively", async () => {
    const res = await submitDemoContactRequestAction({
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

  it("lets the SAME person send a general question despite an open demo request", async () => {
    // The old table-wide UNIQUE on normalized_email made this impossible:
    // asking for a demo permanently blocked every later contact.
    const res = await submitGeneralContactRequestAction({
      name: "Demo Person",
      email: demoEmail,
      message: "Separate general question from the same address.",
      formStartedAt: Date.now() - 5000,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.duplicate).toBe(false);
    expect(res.data.request!.intent).toBe("general");
    expect(res.data.request!.id).not.toBe(demoRequestId);
  });

  it("lets a CLOSED conversation be reopened with a new request", async () => {
    // Otherwise the contact form would accept exactly one message per person
    // for all time.
    const closedEmail = `acq-${suffix}-closed@example.test`;
    const first = await submitGeneralContactRequestAction({
      name: "Returning Person",
      email: closedEmail,
      message: "First question, later closed.",
      formStartedAt: Date.now() - 5000,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstId = first.data.request!.id;

    // While OPEN, a repeat is suppressed.
    const blocked = await submitGeneralContactRequestAction({
      name: "Returning Person",
      email: closedEmail,
      message: "Second question while the first is open.",
      formStartedAt: Date.now() - 5000,
    });
    expect(blocked.ok).toBe(true);
    if (blocked.ok) expect(blocked.data.duplicate).toBe(true);

    await setContactRequestStatusAction({ id: firstId, status: "closed" }, H(platformCookie));

    const reopened = await submitGeneralContactRequestAction({
      name: "Returning Person",
      email: closedEmail,
      message: "New question after the previous one was closed.",
      formStartedAt: Date.now() - 5000,
    });
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.data.duplicate).toBe(false);
    expect(reopened.data.request!.id).not.toBe(firstId);
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

  it("Platform Admin changes a DEMO contact status and audits it with its intent", async () => {
    const before = (await listAuditEvents({ action: "CONTACT_REQUEST_STATUS_CHANGED" })).total;
    const res = await setContactRequestStatusAction({ id: demoRequestId, status: "contacted" }, H(platformCookie));
    expect(res.ok).toBe(true);
    const after = await listAuditEvents({ action: "CONTACT_REQUEST_STATUS_CHANGED" });
    expect(after.total).toBe(before + 1);
    expect(after.events[0].metadata.newStatus).toBe("contacted");
    expect(after.events[0].metadata.intent).toBe("demo");
  });

  it("Platform Admin changes a GENERAL contact status and never logs the message", async () => {
    const res = await setContactRequestStatusAction({ id: generalRequestId, status: "contacted" }, H(platformCookie));
    expect(res.ok).toBe(true);
    const after = await listAuditEvents({ action: "CONTACT_REQUEST_STATUS_CHANGED" });
    expect(after.events[0].metadata.intent).toBe("general");
    // The visitor's message is their content and must never reach the audit
    // trail, exactly like a trial application's internal review note.
    expect(JSON.stringify(after.events[0].metadata)).not.toContain("synthetic general question");
  });

  it("a tenant user cannot change a contact request status", async () => {
    const res = await setContactRequestStatusAction({ id: generalRequestId, status: "closed" }, H(tenantCookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });

  it("an unauthenticated caller cannot change a contact request status", async () => {
    const res = await setContactRequestStatusAction({ id: generalRequestId, status: "closed" }, new Headers());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
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
