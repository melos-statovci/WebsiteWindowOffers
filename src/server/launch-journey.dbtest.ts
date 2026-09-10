// Milestone 5N/5O — THE COMPLETE LAUNCH JOURNEY, as one continuous story.
//
// Milestones 1-4 already test each transition in isolation (platform.dbtest
// covers expiry/activation/suspension; provisioning.dbtest covers exactly-once
// provisioning and its authorization). What none of them proves is the thing a
// real customer actually experiences: ONE organization carrying REAL business
// data through the whole commercial lifecycle, in order, on one session.
//
// That ordering is where the interesting bugs live. "Activate" must ignore a
// trial_ends_at already in the past. "Reactivate" must restore the underlying
// commercial state rather than inventing a new trial. And every transition must
// leave the customer's clients, projects, invoices and payments exactly where
// they were — because expiry and suspension are ACCESS states, not data
// operations, and a customer who is told their data is safe has to actually
// find it there.
//
// Expiry is simulated by moving trial_ends_at into the past through the OWNER
// pool — the DEV-database equivalent of waiting 14 days. The system clock is
// never touched, and `now()` always comes from the database.
//
// Every row this test creates is registered with TestCleanup and removed in
// afterAll. No real customer data is used anywhere.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { getAuthContext } from "@/auth/session";
import { getAccountState } from "@/server/platform/accounts";
import { listAuditEvents } from "@/server/platform/audit";
import { submitTrialApplicationAction, activateProvisionedOrganizationAction } from "@/server/acquisition";
import { reviewTrialApplicationAction } from "@/server/platform/actions/applications";
import {
  activateCustomerAction,
  extendTrialAction,
  setStatusAction,
} from "@/server/platform/actions/organization";
import { createClientAction } from "@/server/actions/client";
import { createProjectAction } from "@/server/actions/project";
import { TestCleanup, testRunId } from "@/db/testing/fixtures";

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const PW = `test-pw-${suffix}`;
const H = (cookie: string) => new Headers({ cookie });

/** Operator-private text that must NEVER appear in the audit trail. */
const INTERNAL_NOTE = `internal-only-review-note-${suffix}`;
/** Suspension reason, which IS deliberately recorded in the audit trail. */
const SUSPENSION_REASON = `journey suspension ${suffix}`;

function cookieHeader(res: Response): string {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function signUp(who: string, name: string) {
  const address = cleanup.userEmail(`journey-${suffix}-${who}@example.test`);
  const res = await auth.api.signUpEmail({
    body: { email: address, password: PW, name },
    asResponse: true,
  });
  const cookie = cookieHeader(res);
  const session = await auth.api.getSession({ headers: H(cookie) });
  return { cookie, userId: session!.user.id, email: address };
}

async function signIn(email: string) {
  const res = await auth.api.signInEmail({ body: { email, password: PW }, asResponse: true });
  return cookieHeader(res);
}

/** The organization's business data, counted through the OWNER pool. */
async function businessDataCounts(orgId: string) {
  const res = await ownerPool.query<{ clients: string; projects: string; price_lists: string }>(
    `select
       (select count(*) from clients     where organization_id = $1) as clients,
       (select count(*) from projects    where organization_id = $1) as projects,
       (select count(*) from price_lists where organization_id = $1) as price_lists`,
    [orgId],
  );
  const row = res.rows[0];
  return {
    clients: Number(row.clients),
    projects: Number(row.projects),
    priceLists: Number(row.price_lists),
  };
}

/** Move the trial window into the past — the DEV stand-in for waiting 14 days. */
async function expireTrial(orgId: string): Promise<void> {
  await ownerPool.query(
    `update organization_accounts
        set trial_started_at = now() - interval '20 days',
            trial_ends_at    = now() - interval '6 days'
      where organization_id = $1`,
    [orgId],
  );
}

let applicant: { cookie: string; userId: string; email: string };
let platform: { cookie: string; userId: string; email: string };
let applicationId: string;
let orgId: string;
let clientId: string;
let projectId: string;
/** Counts captured while the trial was healthy — the survival baseline. */
let baseline: { clients: number; projects: number; priceLists: number };

beforeAll(async () => {
  applicant = await signUp("applicant", `Journey Applicant ${suffix}`);
  platform = await signUp("platform", `Journey Platform ${suffix}`);
  await ownerPool.query(
    `insert into platform_admins (user_id, email, note)
     values ($1, $2, 'launch journey dbtest')
     on conflict (user_id) do update set email = excluded.email`,
    [platform.userId, platform.email],
  );
}, 120000);

afterAll(async () => {
  // Audit events are append-only for the APPLICATION (the runtime role has no
  // DELETE grant). Teardown runs as the owner and removes only the synthetic
  // rows this journey created, so a DEV database is not left with fixture
  // history — the same approach the Milestone 4 browser run used.
  await ownerPool.query(`delete from platform_audit_events where actor_user_id = $1`, [platform.userId]);
  await ownerPool.query(`delete from platform_admins where user_id = $1`, [platform.userId]);
  await cleanup.run();
  await ownerPool.end();
});

describe("journey 1-6: request a trial, and get no tenant access for it", () => {
  it("an account alone resolves to NO_ORGANIZATION", async () => {
    // The launch trust boundary: signing up is identity, not tenancy.
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("NO_ORGANIZATION");
  });

  it("submits a trial application that is PENDING and unprovisioned", async () => {
    const res = await submitTrialApplicationAction(
      {
        companyName: `Journey Dritare ${suffix}`,
        phone: "+38344000000",
        country: "Kosovë",
        companySize: "6-15",
        // Left undefined on purpose: this is the field whose blank value
        // reached the database as NaN before the Milestone 4 fix.
        offersPerMonth: undefined,
        website: "",
        formStartedAt: Date.now() - 20_000,
      },
      H(applicant.cookie),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    applicationId = res.data.application!.id;
    expect(res.data.application!.status).toBe("pending");
    expect(res.data.application!.provisioningStatus).toBe("not_started");
    expect(res.data.application!.organizationId).toBeNull();
  });

  it("still has no tenant access while the application is pending", async () => {
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(false);
    const orgs = await ownerPool.query(`select 1 from member where user_id = $1`, [applicant.userId]);
    expect(orgs.rowCount).toBe(0);
  });
});

describe("journey 7-12: approval provisions exactly one tenant on a 14-day trial", () => {
  it("approves and provisions", async () => {
    const res = await reviewTrialApplicationAction(
      { id: applicationId, decision: "approved", internalReviewNote: INTERNAL_NOTE },
      H(platform.cookie),
    );
    expect(res.ok).toBe(true);
  });

  it("created exactly ONE organization for the application", async () => {
    const row = await ownerPool.query<{ organization_id: string; provisioning_status: string }>(
      `select organization_id, provisioning_status from trial_applications where id = $1`,
      [applicationId],
    );
    expect(row.rows[0].provisioning_status).toBe("provisioned");
    orgId = row.rows[0].organization_id;
    expect(orgId).toBeTruthy();
    cleanup.org(orgId);

    // One membership, one account, one active price list — and only one org.
    const counts = await ownerPool.query<{ orgs: string; members: string; accounts: string }>(
      `select
         (select count(*) from member where user_id = $1) as orgs,
         (select count(*) from member where organization_id = $2) as members,
         (select count(*) from organization_accounts where organization_id = $2) as accounts`,
      [applicant.userId, orgId],
    );
    expect(Number(counts.rows[0].orgs)).toBe(1);
    expect(Number(counts.rows[0].members)).toBe(1);
    expect(Number(counts.rows[0].accounts)).toBe(1);
  });

  it("the applicant activates their OWN organization in their OWN session", async () => {
    const res = await activateProvisionedOrganizationAction(H(applicant.cookie));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.organizationId).toBe(orgId);
  });

  it("resolves a working tenant context on Kornizo Standard as owner", async () => {
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(true);
    if (!ctx.ok) return;
    expect(ctx.ctx.organizationId).toBe(orgId);
    expect(ctx.ctx.role).toBe("owner");
    expect(ctx.ctx.plan).toBe("STANDARD");
    expect(ctx.ctx.effectiveCommercialAccess).toBe("trial");
  });

  it("shows a trial indicator backed by the database, not the client", async () => {
    const account = await getAccountState(orgId);
    // 14 whole days at provisioning; the ceil() can read 14 for a fresh window.
    expect(account.trialDaysRemaining).toBeGreaterThanOrEqual(13);
    expect(account.trialDaysRemaining).toBeLessThanOrEqual(14);

    // Cross-check against SQL so the number cannot be a timezone artefact.
    const sqlDays = await db.execute(sql`
      select ceil(extract(epoch from (trial_ends_at - now())) / 86400.0) as d
      from organization_accounts where organization_id = ${orgId}
    `);
    expect(account.trialDaysRemaining).toBe(Number((sqlDays.rows[0] as { d: string }).d));
  });
});

describe("journey 13-16: real business work during the trial", () => {
  it("creates a client", async () => {
    const res = await createClientAction(
      { name: `Journey Klient ${suffix}`, type: "Privat" },
      H(applicant.cookie),
    );
    expect(res.ok).toBe(true);
    if (res.ok) clientId = res.data.id;
  });

  it("creates a project for that client", async () => {
    const res = await createProjectAction(
      { clientId, title: `Journey Projekt ${suffix}`, vatRate: 0.18 },
      H(applicant.cookie),
    );
    expect(res.ok).toBe(true);
    if (res.ok) projectId = res.data.id;

    // The project is linked to the client that was just created, so the
    // survival counts below cover a real two-table relationship rather than
    // two unrelated rows.
    const row = await ownerPool.query<{ client_id: string }>(
      `select client_id from projects where id = $1`,
      [projectId],
    );
    expect(row.rows[0].client_id).toBe(clientId);
  });

  it("has default pricing available to configure and price with", async () => {
    // Provisioning seeds exactly one active price list; without it the
    // configurator and every offer total would be unusable on day one.
    const counts = await businessDataCounts(orgId);
    expect(counts.priceLists).toBeGreaterThanOrEqual(1);
    expect(counts.clients).toBe(1);
    expect(counts.projects).toBe(1);
    baseline = counts;
  });
});

describe("journey 17-18: platform extends the trial", () => {
  it("extends by 7 days from the current end date", async () => {
    const before = await getAccountState(orgId);
    const res = await extendTrialAction({ organizationId: orgId, days: 7 }, H(platform.cookie));
    expect(res.ok).toBe(true);

    const after = await getAccountState(orgId);
    expect(after.trialEndsAt!.getTime()).toBeGreaterThan(before.trialEndsAt!.getTime());
    // Exactly 7 days, asserted in SQL so the arithmetic cannot be a local-time
    // artefact of the read path.
    const delta = await db.execute(sql`
      select round(extract(epoch from (trial_ends_at - ${before.trialEndsAt!.toISOString()}::timestamptz)) / 86400.0) as d
      from organization_accounts where organization_id = ${orgId}
    `);
    expect(Number((delta.rows[0] as { d: string }).d)).toBe(7);
    expect(after.trialDaysRemaining).toBeGreaterThan(before.trialDaysRemaining);
    expect(after.effectiveCommercialAccess).toBe("trial");
  });

  it("refuses to extend a trial for an already-active customer", async () => {
    // Guards the Extend Trial control being meaningless for active customers.
    // Proven here on a throwaway org so the journey org keeps its trial.
    const org = await ownerPool.query<{ id: string }>(
      `insert into organization (id, name, slug, created_at)
       values (gen_random_uuid(), $1, $2, now()) returning id`,
      [`Journey Active ${suffix}`, `journey-active-${suffix}`],
    );
    const activeOrgId = cleanup.org(org.rows[0].id);
    await ownerPool.query(
      `insert into organization_accounts (organization_id, plan, commercial_access, activated_at)
       values ($1, 'STANDARD', 'active', now())`,
      [activeOrgId],
    );
    const res = await extendTrialAction({ organizationId: activeOrgId, days: 7 }, H(platform.cookie));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("RULE_VIOLATION");
  });
});

describe("journey 19-21: the trial expires and the data survives", () => {
  it("blocks tenant actions server-side once the window has passed", async () => {
    await expireTrial(orgId);

    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("TRIAL_EXPIRED");

    // Server-side, not merely a UI redirect: a business MUTATION is refused.
    // The payload is deliberately VALID — the action spine validates before it
    // authenticates, so an invalid one would return VALIDATION and prove
    // nothing about the access gate.
    const write = await createClientAction(
      { name: `Should Not Exist ${suffix}`, type: "Privat" },
      H(applicant.cookie),
    );
    expect(write.ok).toBe(false);
    if (!write.ok) expect(write.error.code).toBe("FORBIDDEN");

    // And nothing was written.
    const leaked = await ownerPool.query(`select 1 from clients where name = $1`, [
      `Should Not Exist ${suffix}`,
    ]);
    expect(leaked.rowCount).toBe(0);
  });

  it("derives trial_expired without storing it", async () => {
    const account = await getAccountState(orgId);
    expect(account.commercialAccess).toBe("trial");
    expect(account.effectiveCommercialAccess).toBe("trial_expired");
    expect(account.trialDaysRemaining).toBe(0);
  });

  it("keeps every row of business data", async () => {
    // The promise /trial-expired makes to the customer, checked literally.
    expect(await businessDataCounts(orgId)).toEqual(baseline);
  });
});

describe("journey 22-24: activation restores access and finds the data intact", () => {
  it("activates the customer", async () => {
    const res = await activateCustomerAction({ organizationId: orgId }, H(platform.cookie));
    expect(res.ok).toBe(true);
  });

  it("ignores the historical expired trial timestamps", async () => {
    // The key ordering invariant: trial_ends_at is still in the PAST, and must
    // no longer restrict an active customer.
    const account = await getAccountState(orgId);
    expect(account.commercialAccess).toBe("active");
    expect(account.effectiveCommercialAccess).toBe("active");
    expect(account.activatedAt).not.toBeNull();
    expect(account.trialEndsAt!.getTime()).toBeLessThan(account.serverNow.getTime());
  });

  it("restores normal tenant access immediately", async () => {
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(true);
    if (ctx.ok) expect(ctx.ctx.effectiveCommercialAccess).toBe("active");
  });

  it("still shows the same business data", async () => {
    expect(await businessDataCounts(orgId)).toEqual(baseline);
  });
});

describe("journey 25-28: suspension blocks access without touching data", () => {
  it("suspends the organization", async () => {
    const res = await setStatusAction(
      { organizationId: orgId, status: "suspended", reason: SUSPENSION_REASON },
      H(platform.cookie),
    );
    expect(res.ok).toBe(true);
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(false);
    if (!ctx.ok) expect(ctx.reason).toBe("SUSPENDED");
  });

  it("keeps the data while suspended", async () => {
    expect(await businessDataCounts(orgId)).toEqual(baseline);
  });

  it("reactivates and restores the ACTIVE customer state, not a new trial", async () => {
    const res = await setStatusAction({ organizationId: orgId, status: "active" }, H(platform.cookie));
    expect(res.ok).toBe(true);
    const account = await getAccountState(orgId);
    expect(account.status).toBe("active");
    // Reactivation is an operational flag only: it must not resurrect a trial.
    expect(account.effectiveCommercialAccess).toBe("active");
    const ctx = await getAuthContext(H(applicant.cookie));
    expect(ctx.ok).toBe(true);
  });
});

describe("journey 29-31: a returning session stays coherent, and the audit is right", () => {
  it("signs in again and resolves the same organization and data", async () => {
    const freshCookie = await signIn(applicant.email);
    const ctx = await getAuthContext(H(freshCookie));
    expect(ctx.ok).toBe(true);
    if (!ctx.ok) return;
    // resolveContext() auto-activates a sole organization, so a returning user
    // never has to re-run the activation step.
    expect(ctx.ctx.organizationId).toBe(orgId);
    expect(ctx.ctx.effectiveCommercialAccess).toBe("active");
    expect(await businessDataCounts(orgId)).toEqual(baseline);
  });

  it("recorded the whole lifecycle in the audit trail, in order", async () => {
    const events = await listAuditEvents({ organizationId: orgId, limit: 50 });
    const actions = events.events.map((e) => e.action);
    // listAuditEvents returns newest-first; compare against the order the
    // journey actually performed.
    expect([...actions].reverse()).toEqual([
      "TRIAL_APPLICATION_PROVISIONED",
      "TRIAL_EXTENDED",
      "CUSTOMER_ACTIVATED",
      "ORGANIZATION_SUSPENDED",
      "ORGANIZATION_REACTIVATED",
    ]);
    // The human decision event is recorded against the application, not the
    // organization, so it is not in this org-scoped list.
    for (const event of events.events) {
      expect(event.actorEmail).toBe(platform.email);
      // The INTERNAL REVIEW NOTE must never reach audit metadata. (The
      // suspension REASON is a different thing and is deliberately recorded —
      // that is why the two use distinct strings here.)
      expect(JSON.stringify(event.metadata ?? {})).not.toContain(INTERNAL_NOTE);
    }
  });

  it("recorded the approval decision against the application", async () => {
    const all = await listAuditEvents({ limit: 200 });
    const approval = all.events.find(
      (e) => e.action === "TRIAL_APPLICATION_APPROVED" && e.metadata?.trialApplicationId === applicationId,
    );
    expect(approval).toBeTruthy();
    expect(approval!.actorEmail).toBe(platform.email);
  });
});
