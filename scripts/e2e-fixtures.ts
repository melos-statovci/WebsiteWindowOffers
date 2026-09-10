import pg from "pg";
import { auth } from "@/auth";
import { ensureOrganizationProfile } from "@/auth/organization";
import { ensureDefaultPricing } from "@/server/pricing-init";
import { ensureOrganizationAccount } from "@/server/platform/accounts";
import { createTrustedProvisionedOrganization } from "@/server/provisioning";
import { readE2eFixtureConfig, type E2eFixtureConfig } from "./e2e-guard";

export { databaseFingerprint, readE2eFixtureConfig } from "./e2e-guard";

interface E2eUser {
  id: string;
  email: string;
  cookie: string;
}

function cookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function signIn(email: string, password: string): Promise<E2eUser> {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) {
    throw new Error(`Could not sign in synthetic user ${email}. Check the local E2E password.`);
  }
  const cookie = cookieHeader(response);
  const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
  if (!session) throw new Error(`Synthetic user ${email} did not receive a Better Auth session.`);
  return { id: session.user.id, email: session.user.email, cookie };
}

async function ensureBetterAuthUser(
  pool: pg.Pool,
  email: string,
  name: string,
  password: string,
): Promise<E2eUser> {
  const existing = await pool.query<{ id: string }>(`select id from "user" where lower(email) = $1 limit 1`, [
    email,
  ]);
  if (existing.rowCount === 0) {
    const response = await auth.api.signUpEmail({
      body: { email, password, name },
      asResponse: true,
    });
    if (!response.ok) throw new Error(`Could not create synthetic user ${email}.`);
    const cookie = cookieHeader(response);
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    if (!session) throw new Error(`Synthetic user ${email} was created without a session.`);
    return { id: session.user.id, email: session.user.email, cookie };
  }
  return signIn(email, password);
}

async function ensurePlatformAdmin(pool: pg.Pool, user: E2eUser): Promise<void> {
  await pool.query(
    `insert into platform_admins (user_id, email, note)
     values ($1, $2, 'development e2e fixture')
     on conflict (user_id) do update set email = excluded.email`,
    [user.id, user.email],
  );
}

async function ensureTenantOrganization(pool: pg.Pool, user: E2eUser, config: E2eFixtureConfig): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    `select id from organization where slug = $1 limit 1`,
    [config.tenantOrganizationSlug],
  );
  if (existing.rowCount === 0) {
    const organization = await createTrustedProvisionedOrganization({
      userId: user.id,
      name: config.tenantOrganizationName,
      slug: config.tenantOrganizationSlug,
    });
    const orgId = (organization as { id: string }).id;
    await auth.api.setActiveOrganization({ headers: new Headers({ cookie: user.cookie }), body: { organizationId: orgId } });
    return orgId;
  }

  const orgId = existing.rows[0].id;
  const membership = await pool.query(
    `select 1 from member where organization_id = $1 and user_id = $2 limit 1`,
    [orgId, user.id],
  );
  if (membership.rowCount === 0) {
    throw new Error(
      `Synthetic tenant organization slug already exists but is not owned by ${config.tenantEmail}. Refusing to modify it.`,
    );
  }
  await ensureOrganizationProfile(orgId);
  await ensureOrganizationAccount(orgId);
  await ensureDefaultPricing(orgId, user.id);
  await auth.api.setActiveOrganization({ headers: new Headers({ cookie: user.cookie }), body: { organizationId: orgId } });
  return orgId;
}

export async function seedE2eFixtures(config = readE2eFixtureConfig()): Promise<{
  platformUserId: string;
  tenantUserId: string;
  tenantOrganizationId: string;
}> {
  const pool = new pg.Pool({ connectionString: config.ownerDatabaseUrl, connectionTimeoutMillis: 30000 });
  try {
    const platform = await ensureBetterAuthUser(pool, config.platformEmail, "Kornizo E2E Platform Admin", config.password);
    await ensurePlatformAdmin(pool, platform);

    const tenant = await ensureBetterAuthUser(pool, config.tenantEmail, "Kornizo E2E Tenant User", config.password);
    const tenantOrganizationId = await ensureTenantOrganization(pool, tenant, config);

    return {
      platformUserId: platform.id,
      tenantUserId: tenant.id,
      tenantOrganizationId,
    };
  } finally {
    await pool.end();
  }
}

export async function resetE2eApplicant(config = readE2eFixtureConfig()): Promise<{
  removedUser: boolean;
  removedApplications: number;
}> {
  const pool = new pg.Pool({ connectionString: config.ownerDatabaseUrl, connectionTimeoutMillis: 30000 });
  try {
    const user = await pool.query<{ id: string }>(`select id from "user" where lower(email) = $1 limit 1`, [
      config.applicantEmail,
    ]);
    if (user.rowCount === 0) {
      await pool.query(`delete from verification where lower(identifier) = $1`, [config.applicantEmail]);
      return { removedUser: false, removedApplications: 0 };
    }

    const userId = user.rows[0].id;
    const memberships = await pool.query(`select 1 from member where user_id = $1 limit 1`, [userId]);
    if ((memberships.rowCount ?? 0) > 0) {
      throw new Error("Refusing to reset the E2E applicant because it has tenant membership.");
    }

    const applications = await pool.query<{ id: string }>(
      `select id from trial_applications where user_id = $1 or normalized_email = $2`,
      [userId, config.applicantEmail],
    );
    const applicationIds = applications.rows.map((row) => row.id);
    if (applicationIds.length > 0) {
      const audited = await pool.query(
        `select 1
         from platform_audit_events
         where metadata->>'trialApplicationId' = any($1::text[])
         limit 1`,
        [applicationIds],
      );
      if ((audited.rowCount ?? 0) > 0) {
        throw new Error(
          "Refusing to delete the E2E applicant because its application is referenced by platform audit history. Use a unique applicant email for this browser run.",
        );
      }
    }

    await pool.query("begin");
    try {
      await pool.query(`delete from verification where lower(identifier) = $1`, [config.applicantEmail]);
      const deletedApplications = await pool.query(
        `delete from trial_applications where user_id = $1 or normalized_email = $2`,
        [userId, config.applicantEmail],
      );
      await pool.query(`delete from "user" where id = $1 and lower(email) = $2`, [userId, config.applicantEmail]);
      await pool.query("commit");
      return { removedUser: true, removedApplications: deletedApplications.rowCount ?? 0 };
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  } finally {
    await pool.end();
  }
}
