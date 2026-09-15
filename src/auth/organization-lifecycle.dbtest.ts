import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { auth } from "@/auth";
import { getAuthContext, type ContextReason } from "@/auth/session";
import {
  createProvisionedTestOrganization,
  TestCleanup,
  testRunId,
} from "@/db/testing/fixtures";

type LifecycleName =
  | "ACTIVE"
  | "TRIAL"
  | "TRIAL_EXPIRED"
  | "SUSPENDED"
  | "ACCOUNT_NOT_READY";

interface FixtureUser {
  cookie: string;
  email: string;
  userId: string;
}

interface LifecycleFixture {
  name: LifecycleName;
  organizationId: string;
  originalOrganizationName: string;
  targetMemberId: string;
  acceptInvitationId: string;
  rejectInvitationId: string;
  cancelInvitationId: string;
  resendInvitationId: string;
  expectedReason: ContextReason | null;
}

const ownerPool = new pg.Pool({ connectionString: process.env.DATABASE_MIGRATION_URL });
const cleanup = new TestCleanup(ownerPool);
const suffix = testRunId();
const password = `rc02-pw-${suffix}`;
const fixtures: LifecycleFixture[] = [];
const lifecycleStates: Array<{
  name: LifecycleName;
  reason: ContextReason | null;
}> = [
  { name: "ACTIVE", reason: null },
  { name: "TRIAL", reason: null },
  { name: "TRIAL_EXPIRED", reason: "TRIAL_EXPIRED" },
  { name: "SUSPENDED", reason: "SUSPENDED" },
  { name: "ACCOUNT_NOT_READY", reason: "ACCOUNT_NOT_READY" },
];
let owner: FixtureUser;
let target: FixtureUser;
let recipient: FixtureUser;
let leaver: FixtureUser;

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

const sessionHeaders = (cookie: string) => new Headers({ cookie });

async function signUp(label: string): Promise<FixtureUser> {
  const email = cleanup.userEmail(`rc02-${suffix}-${label}@example.test`);
  const response = await auth.api.signUpEmail({
    body: { email, password, name: `RC02 ${label}` },
    asResponse: true,
  });
  const cookie = cookieHeader(response);
  const session = await auth.api.getSession({ headers: sessionHeaders(cookie) });
  if (!session) throw new Error(`RC-02 fixture ${label} has no session`);
  return { cookie, email, userId: session.user.id };
}

async function providerPost(path: string, cookie: string, body: object): Promise<Response> {
  const baseUrl = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
  const url = new URL(`/api/auth${path}`, baseUrl);
  return auth.handler(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: baseUrl.origin,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function seedInvitation(input: {
  organizationId: string;
  email: string;
  inviterId: string;
}): Promise<string> {
  const id = randomUUID();
  await ownerPool.query(
    `insert into invitation(id, organization_id, email, role, status, expires_at, created_at, inviter_id)
     values($1,$2,$3,'operator','pending',now() + interval '1 day',now(),$4)`,
    [id, input.organizationId, input.email, input.inviterId],
  );
  return id;
}

async function setLifecycle(organizationId: string, state: LifecycleName): Promise<void> {
  if (state === "ACCOUNT_NOT_READY") {
    await ownerPool.query(`delete from organization_accounts where organization_id=$1`, [organizationId]);
    return;
  }
  if (state === "ACTIVE") {
    await ownerPool.query(
      `update organization_accounts
       set status='active', commercial_access='active', activated_at=now()
       where organization_id=$1`,
      [organizationId],
    );
    return;
  }
  if (state === "TRIAL") {
    await ownerPool.query(
      `update organization_accounts
       set status='active', commercial_access='trial', trial_started_at=now() - interval '1 day',
           trial_ends_at=now() + interval '7 days', activated_at=null
       where organization_id=$1`,
      [organizationId],
    );
    return;
  }
  if (state === "TRIAL_EXPIRED") {
    await ownerPool.query(
      `update organization_accounts
       set status='active', commercial_access='trial', trial_started_at=now() - interval '2 days',
           trial_ends_at=now() - interval '1 day', activated_at=null
       where organization_id=$1`,
      [organizationId],
    );
    return;
  }
  await ownerPool.query(
    `update organization_accounts
     set status='suspended', commercial_access='active', activated_at=now()
     where organization_id=$1`,
    [organizationId],
  );
}

async function invitationState(id: string) {
  const result = await ownerPool.query(
    `select status, expires_at from invitation where id=$1`,
    [id],
  );
  return result.rows[0] as { status: string; expires_at: Date } | undefined;
}

async function deletionSnapshot(organizationId: string) {
  const [organization, members, invitations] = await Promise.all([
    ownerPool.query(
      `select id, name, slug, logo, metadata from organization where id=$1`,
      [organizationId],
    ),
    ownerPool.query(
      `select id, user_id, role from member where organization_id=$1 order by id`,
      [organizationId],
    ),
    ownerPool.query(
      `select id, email, role, status, expires_at, inviter_id
       from invitation where organization_id=$1 order by id`,
      [organizationId],
    ),
  ]);
  return {
    organization: organization.rows,
    members: members.rows,
    invitations: invitations.rows,
  };
}

beforeAll(async () => {
  owner = await signUp("owner");
  target = await signUp("target");
  recipient = await signUp("recipient");
  leaver = await signUp("leaver");

  for (const state of lifecycleStates) {
    const originalOrganizationName = `RC02 ${state.name} ${suffix}`;
    const organizationId = await createProvisionedTestOrganization(
      auth,
      cleanup,
      sessionHeaders(owner.cookie),
      originalOrganizationName,
      `rc02-${state.name.toLowerCase().replaceAll("_", "-")}-${suffix}`,
    );
    const targetMemberId = randomUUID();
    await ownerPool.query(
      `insert into member(id, organization_id, user_id, role, created_at)
       values($1,$2,$3,'member',now()),(gen_random_uuid(),$2,$4,'member',now())`,
      [targetMemberId, organizationId, target.userId, leaver.userId],
    );
    const acceptInvitationId = await seedInvitation({
      organizationId,
      email: recipient.email,
      inviterId: owner.userId,
    });
    const rejectInvitationId = await seedInvitation({
      organizationId,
      email: recipient.email,
      inviterId: owner.userId,
    });
    const cancelInvitationId = await seedInvitation({
      organizationId,
      email: `rc02-${suffix}-${state.name.toLowerCase()}-cancel@example.test`,
      inviterId: owner.userId,
    });
    const resendInvitationId = await seedInvitation({
      organizationId,
      email: `rc02-${suffix}-${state.name.toLowerCase()}-resend@example.test`,
      inviterId: owner.userId,
    });
    await setLifecycle(organizationId, state.name);
    fixtures.push({
      name: state.name,
      organizationId,
      originalOrganizationName,
      targetMemberId,
      acceptInvitationId,
      rejectInvitationId,
      cancelInvitationId,
      resendInvitationId,
      expectedReason: state.reason,
    });
  }
}, 90_000);

afterAll(async () => {
  await cleanup.run();
  await ownerPool.end();
});

describe("RC-02 raw Better Auth organization lifecycle policy", () => {
  it("keeps browser organization creation disabled while trusted provisioning remains available", async () => {
    const slug = `rc02-public-create-${suffix}`;
    const response = await providerPost("/organization/create", owner.cookie, {
      name: "Blocked public organization",
      slug,
    });
    expect(response.status).toBe(403);
    const stored = await ownerPool.query(`select count(*)::int as n from organization where slug=$1`, [slug]);
    expect(stored.rows[0].n).toBe(0);
  });

  it.each(lifecycleStates)("enforces the complete direct HTTP matrix for $name", async (state) => {
    const fixture = fixtures.find((candidate) => candidate.name === state.name);
    if (!fixture) throw new Error(`Missing RC-02 fixture for ${state.name}`);
    const usable = fixture.expectedReason === null;
    const changedName = `${fixture.originalOrganizationName} changed`;

    const updateResponse = await providerPost("/organization/update", owner.cookie, {
      organizationId: fixture.organizationId,
      data: { name: changedName },
    });
    expect(updateResponse.status).toBe(usable ? 200 : 403);
    const organizationAfterUpdate = await ownerPool.query(
      `select name from organization where id=$1`,
      [fixture.organizationId],
    );
    expect(organizationAfterUpdate.rows[0].name).toBe(
      usable ? changedName : fixture.originalOrganizationName,
    );

    const roleResponse = await providerPost("/organization/update-member-role", owner.cookie, {
      organizationId: fixture.organizationId,
      memberId: fixture.targetMemberId,
      role: "admin",
    });
    expect(roleResponse.status).toBe(usable ? 200 : 403);
    const roleAfter = await ownerPool.query(`select role from member where id=$1`, [fixture.targetMemberId]);
    expect(roleAfter.rows[0].role).toBe(usable ? "admin" : "member");

    const removeResponse = await providerPost("/organization/remove-member", owner.cookie, {
      organizationId: fixture.organizationId,
      memberIdOrEmail: fixture.targetMemberId,
    });
    expect(removeResponse.status).toBe(usable ? 200 : 403);
    const targetMembership = await ownerPool.query(`select count(*)::int as n from member where id=$1`, [
      fixture.targetMemberId,
    ]);
    expect(targetMembership.rows[0].n).toBe(usable ? 0 : 1);

    const createdEmail = `rc02-${suffix}-${fixture.name.toLowerCase()}-created@example.test`;
    const createInvitationResponse = await providerPost("/organization/invite-member", owner.cookie, {
      organizationId: fixture.organizationId,
      email: createdEmail,
      role: "operator",
    });
    expect(createInvitationResponse.status).toBe(usable ? 200 : 403);
    const createdInvitations = await ownerPool.query(
      `select count(*)::int as n from invitation where organization_id=$1 and email=$2`,
      [fixture.organizationId, createdEmail],
    );
    expect(createdInvitations.rows[0].n).toBe(usable ? 1 : 0);

    if (!usable) {
      const resendBefore = await invitationState(fixture.resendInvitationId);
      const resendResponse = await providerPost("/organization/invite-member", owner.cookie, {
        organizationId: fixture.organizationId,
        email: `rc02-${suffix}-${fixture.name.toLowerCase()}-resend@example.test`,
        role: "operator",
        resend: true,
      });
      expect(resendResponse.status).toBe(403);
      expect(await invitationState(fixture.resendInvitationId)).toEqual(resendBefore);
    }

    const acceptResponse = await providerPost(
      "/organization/accept-invitation",
      recipient.cookie,
      { invitationId: fixture.acceptInvitationId },
    );
    expect(acceptResponse.status).toBe(usable ? 200 : 403);
    expect((await invitationState(fixture.acceptInvitationId))?.status).toBe(
      usable ? "accepted" : "pending",
    );
    const acceptedMembership = await ownerPool.query(
      `select count(*)::int as n from member where organization_id=$1 and user_id=$2`,
      [fixture.organizationId, recipient.userId],
    );
    expect(acceptedMembership.rows[0].n).toBe(usable ? 1 : 0);

    const rejectResponse = await providerPost(
      "/organization/reject-invitation",
      recipient.cookie,
      { invitationId: fixture.rejectInvitationId },
    );
    expect(rejectResponse.status).toBe(200);
    expect((await invitationState(fixture.rejectInvitationId))?.status).toBe("rejected");

    const cancelResponse = await providerPost("/organization/cancel-invitation", owner.cookie, {
      invitationId: fixture.cancelInvitationId,
    });
    expect(cancelResponse.status).toBe(200);
    expect((await invitationState(fixture.cancelInvitationId))?.status).toBe("canceled");

    const setLeaverActiveResponse = await providerPost("/organization/set-active", leaver.cookie, {
      organizationId: fixture.organizationId,
    });
    expect(setLeaverActiveResponse.status).toBe(200);
    const leaveResponse = await providerPost("/organization/leave", leaver.cookie, {
      organizationId: fixture.organizationId,
    });
    expect(leaveResponse.status).toBe(200);
    const leavingMembership = await ownerPool.query(
      `select count(*)::int as n from member where organization_id=$1 and user_id=$2`,
      [fixture.organizationId, leaver.userId],
    );
    expect(leavingMembership.rows[0].n).toBe(0);

    const setActiveResponse = await providerPost("/organization/set-active", owner.cookie, {
      organizationId: fixture.organizationId,
    });
    expect(setActiveResponse.status).toBe(200);
    const context = await getAuthContext(sessionHeaders(owner.cookie));
    if (fixture.expectedReason) {
      expect(context).toEqual({ ok: false, reason: fixture.expectedReason });
    } else {
      expect(context.ok).toBe(true);
      if (context.ok) expect(context.ctx.organizationId).toBe(fixture.organizationId);
    }

    const beforeDelete = await deletionSnapshot(fixture.organizationId);
    const deleteResponse = await providerPost("/organization/delete", owner.cookie, {
      organizationId: fixture.organizationId,
    });
    expect(deleteResponse.status).toBe(404);
    expect(await deletionSnapshot(fixture.organizationId)).toEqual(beforeDelete);
  }, 45_000);

  it("continues to let Better Auth deny an insufficient member role for usable organizations", async () => {
    const fixture = fixtures.find((candidate) => candidate.name === "ACTIVE");
    if (!fixture) throw new Error("Missing RC-02 ACTIVE fixture");
    const before = await ownerPool.query(`select name from organization where id=$1`, [
      fixture.organizationId,
    ]);
    const updateResponse = await providerPost("/organization/update", recipient.cookie, {
      organizationId: fixture.organizationId,
      data: { name: "Must not be applied" },
    });
    expect(updateResponse.status).toBe(403);
    const after = await ownerPool.query(`select name from organization where id=$1`, [
      fixture.organizationId,
    ]);
    expect(after.rows[0].name).toBe(before.rows[0].name);

    const email = `rc02-${suffix}-operator-denied@example.test`;
    const invitationResponse = await providerPost("/organization/invite-member", recipient.cookie, {
      organizationId: fixture.organizationId,
      email,
      role: "operator",
    });
    expect(invitationResponse.status).toBe(403);
    const invitation = await ownerPool.query(
      `select count(*)::int as n from invitation where organization_id=$1 and email=$2`,
      [fixture.organizationId, email],
    );
    expect(invitation.rows[0].n).toBe(0);
  });
});
