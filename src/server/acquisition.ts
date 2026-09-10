import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { demoRequests, member, trialApplications } from "@/db/schema";
import {
  demoRequestSubmitSchema,
  trialApplicationSubmitSchema,
  type DemoRequestSubmitInput,
  type TrialApplicationSubmitInput,
} from "@/domain/validation/acquisition";
import type { PublicLocale } from "@/lib/public-routing";

export type TrialApplicationStatus = "pending" | "approved" | "rejected";
export type DemoRequestStatus = "new" | "contacted" | "closed";
export type TrialProvisioningStatus = "not_started" | "in_progress" | "provisioned" | "failed";

export interface TrialApplicationRow {
  id: string;
  userId: string;
  applicantName: string;
  email: string;
  normalizedEmail: string;
  companyName: string;
  phone: string;
  country: string;
  companySize: string;
  offersPerMonth: number | null;
  message: string | null;
  status: TrialApplicationStatus;
  reviewedAt: Date | null;
  reviewedByEmail: string | null;
  internalReviewNote: string | null;
  // Milestone 4 provisioning linkage/state. Platform-written only; a public
  // submission can never set any of these.
  organizationId: string | null;
  provisioningStatus: TrialProvisioningStatus;
  provisionedAt: Date | null;
  provisioningAttempts: number;
  provisioningErrorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoRequestRow {
  id: string;
  name: string;
  companyName: string;
  email: string;
  normalizedEmail: string;
  phone: string;
  country: string;
  message: string | null;
  status: DemoRequestStatus;
  statusChangedAt: Date | null;
  statusChangedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type PublicErrorCode = "UNAUTHENTICATED" | "VALIDATION" | "FORBIDDEN" | "INTERNAL";
export type PublicActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: PublicErrorCode; message: string; fieldErrors?: Record<string, string[]> } };

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isLikelyBot(input: { website?: string; formStartedAt?: number }): boolean {
  if (input.website) return true;
  if (!input.formStartedAt) return false;
  return Date.now() - input.formStartedAt < 700;
}

function asTrialStatus(value: string): TrialApplicationStatus {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

function asDemoStatus(value: string): DemoRequestStatus {
  if (value === "contacted" || value === "closed") return value;
  return "new";
}

function asProvisioningStatus(value: string): TrialProvisioningStatus {
  if (value === "in_progress" || value === "provisioned" || value === "failed") return value;
  return "not_started";
}

function trialRow(row: typeof trialApplications.$inferSelect): TrialApplicationRow {
  return {
    id: row.id,
    userId: row.userId,
    applicantName: row.applicantName,
    email: row.email,
    normalizedEmail: row.normalizedEmail,
    companyName: row.companyName,
    phone: row.phone,
    country: row.country,
    companySize: row.companySize,
    offersPerMonth: row.offersPerMonth,
    message: row.message,
    status: asTrialStatus(row.status),
    reviewedAt: row.reviewedAt,
    reviewedByEmail: row.reviewedByEmail,
    internalReviewNote: row.internalReviewNote,
    organizationId: row.organizationId,
    provisioningStatus: asProvisioningStatus(row.provisioningStatus),
    provisionedAt: row.provisionedAt,
    provisioningAttempts: row.provisioningAttempts,
    provisioningErrorCode: row.provisioningErrorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function demoRow(row: typeof demoRequests.$inferSelect): DemoRequestRow {
  return {
    id: row.id,
    name: row.name,
    companyName: row.companyName,
    email: row.email,
    normalizedEmail: row.normalizedEmail,
    phone: row.phone,
    country: row.country,
    message: row.message,
    status: asDemoStatus(row.status),
    statusChangedAt: row.statusChangedAt,
    statusChangedByEmail: row.statusChangedByEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function userHasTenantMembership(userId: string): Promise<boolean> {
  const rows = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId)).limit(1);
  return rows.length > 0;
}

export async function getTrialApplicationByUserId(userId: string): Promise<TrialApplicationRow | null> {
  const rows = await db.select().from(trialApplications).where(eq(trialApplications.userId, userId)).limit(1);
  return rows[0] ? trialRow(rows[0]) : null;
}

export async function getTrialApplicationByNormalizedEmail(normalizedEmail: string): Promise<TrialApplicationRow | null> {
  const rows = await db
    .select()
    .from(trialApplications)
    .where(eq(trialApplications.normalizedEmail, normalizedEmail))
    .limit(1);
  return rows[0] ? trialRow(rows[0]) : null;
}

export async function getCurrentTrialApplication(reqHeaders: Headers): Promise<{
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  application: TrialApplicationRow | null;
  hasTenantAccess: boolean;
}> {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return { session: null, application: null, hasTenantAccess: false };
  const [application, hasTenantAccess] = await Promise.all([
    getTrialApplicationByUserId(session.user.id),
    userHasTenantMembership(session.user.id),
  ]);
  return { session, application, hasTenantAccess };
}

/**
 * APPLICANT-SIDE activation. Runs in the APPLICANT'S OWN authenticated session.
 *
 * A platform admin must never mutate another user's session, so activation of a
 * newly provisioned organization is deliberately pulled by the applicant rather
 * than pushed by the reviewer. Every input is derived server-side from the
 * caller's session — the caller supplies nothing at all, so it cannot choose an
 * organization, an owner, a plan or a trial window.
 */
export async function activateProvisionedOrganizationAction(
  reqHeaders: Headers,
): Promise<PublicActionResult<{ organizationId: string }>> {
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return { ok: false, error: { code: "UNAUTHENTICATED", message: "Kyçuni për të vazhduar." } };

  const application = await getTrialApplicationByUserId(session.user.id);
  if (!application || application.status !== "approved" || application.provisioningStatus !== "provisioned") {
    return { ok: false, error: { code: "FORBIDDEN", message: "Qasja juaj nuk është ende gati." } };
  }
  const organizationId = application.organizationId;
  if (!organizationId) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Qasja juaj nuk është ende gati." } };
  }

  // Re-verify membership from the authoritative table; never trust the link
  // alone to grant this session an active organization.
  const membership = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)))
    .limit(1);
  if (membership.length === 0) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Qasja juaj nuk është ende gati." } };
  }

  try {
    await auth.api.setActiveOrganization({ headers: reqHeaders, body: { organizationId } });
  } catch (e) {
    console.error("[acquisition] active organization activation failed:", e);
    return { ok: false, error: { code: "INTERNAL", message: "Nuk u aktivizua. Provoni përsëri." } };
  }
  return { ok: true, data: { organizationId } };
}

export async function noOrganizationDestination(userId: string, locale: PublicLocale = "sq"): Promise<string> {
  const application = await getTrialApplicationByUserId(userId);
  if (application) return locale === "en" ? "/en/application-status" : "/application-status";
  return locale === "en" ? "/en/request-trial" : "/request-trial";
}

export async function submitTrialApplicationAction(
  rawInput: unknown,
  reqHeaders: Headers,
): Promise<PublicActionResult<{ application: TrialApplicationRow | null; duplicate: boolean; ignored?: boolean }>> {
  const parsed = trialApplicationSubmitSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }
  const input: TrialApplicationSubmitInput = parsed.data;
  if (isLikelyBot(input)) return { ok: true, data: { application: null, duplicate: false, ignored: true } };

  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return { ok: false, error: { code: "UNAUTHENTICATED", message: "Kyçuni ose krijoni llogari për të dërguar kërkesën." } };
  }

  if (await userHasTenantMembership(session.user.id)) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Kjo llogari ka tashmë qasje në Kornizo." } };
  }

  const normalizedEmail = normalizeEmail(session.user.email);
  const existing = (await getTrialApplicationByUserId(session.user.id)) ?? (await getTrialApplicationByNormalizedEmail(normalizedEmail));
  if (existing) return { ok: true, data: { application: existing, duplicate: true } };

  try {
    const rows = await db
      .insert(trialApplications)
      .values({
        userId: session.user.id,
        applicantName: session.user.name,
        email: session.user.email,
        normalizedEmail,
        companyName: input.companyName,
        phone: input.phone,
        country: input.country,
        companySize: input.companySize,
        offersPerMonth: input.offersPerMonth ?? null,
        message: input.message ?? null,
      })
      .returning();
    return { ok: true, data: { application: trialRow(rows[0]), duplicate: false } };
  } catch (e) {
    const duplicate = await getTrialApplicationByUserId(session.user.id);
    if (duplicate) return { ok: true, data: { application: duplicate, duplicate: true } };
    console.error("[acquisition] trial application submit failed:", e);
    return { ok: false, error: { code: "INTERNAL", message: "Kërkesa nuk u ruajt. Provoni përsëri." } };
  }
}

export async function submitDemoRequestAction(
  rawInput: unknown,
): Promise<PublicActionResult<{ request: DemoRequestRow | null; duplicate: boolean; ignored?: boolean }>> {
  const parsed = demoRequestSubmitSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }
  const input: DemoRequestSubmitInput = parsed.data;
  if (isLikelyBot(input)) return { ok: true, data: { request: null, duplicate: false, ignored: true } };

  const normalizedEmail = normalizeEmail(input.email);
  const existingRows = await db.select().from(demoRequests).where(eq(demoRequests.normalizedEmail, normalizedEmail)).limit(1);
  if (existingRows[0]) return { ok: true, data: { request: demoRow(existingRows[0]), duplicate: true } };

  try {
    const rows = await db
      .insert(demoRequests)
      .values({
        name: input.name,
        companyName: input.companyName,
        email: input.email.trim(),
        normalizedEmail,
        phone: input.phone,
        country: input.country,
        message: input.message ?? null,
      })
      .returning();
    return { ok: true, data: { request: demoRow(rows[0]), duplicate: false } };
  } catch (e) {
    const duplicateRows = await db.select().from(demoRequests).where(eq(demoRequests.normalizedEmail, normalizedEmail)).limit(1);
    if (duplicateRows[0]) return { ok: true, data: { request: demoRow(duplicateRows[0]), duplicate: true } };
    console.error("[acquisition] demo request submit failed:", e);
    return { ok: false, error: { code: "INTERNAL", message: "Kërkesa nuk u ruajt. Provoni përsëri." } };
  }
}

export type ApplicationSort = "created_desc" | "created_asc" | "company_asc";

export async function listTrialApplications(input: {
  q?: string;
  status?: TrialApplicationStatus | "all";
  /**
   * Provisioning filter, independent of the decision status. Needed because an
   * application whose provisioning failed still has status `approved`, so no
   * decision filter can isolate it.
   */
  provisioning?: TrialProvisioningStatus | "all";
  sort?: ApplicationSort;
} = {}): Promise<TrialApplicationRow[]> {
  const filters = [];
  if (input.status && input.status !== "all") filters.push(eq(trialApplications.status, input.status));
  if (input.provisioning && input.provisioning !== "all") {
    filters.push(eq(trialApplications.provisioningStatus, input.provisioning));
  }
  const q = input.q?.trim();
  if (q) {
    filters.push(
      or(
        ilike(trialApplications.companyName, `%${q}%`),
        ilike(trialApplications.applicantName, `%${q}%`),
        ilike(trialApplications.email, `%${q}%`),
        ilike(trialApplications.country, `%${q}%`),
      ),
    );
  }
  const orderBy =
    input.sort === "created_asc"
      ? sql`${trialApplications.createdAt} asc`
      : input.sort === "company_asc"
        ? sql`lower(${trialApplications.companyName}) asc`
        : desc(trialApplications.createdAt);
  const rows = await db
    .select()
    .from(trialApplications)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy);
  return rows.map(trialRow);
}

export async function getTrialApplication(id: string): Promise<TrialApplicationRow | null> {
  const rows = await db.select().from(trialApplications).where(eq(trialApplications.id, id)).limit(1);
  return rows[0] ? trialRow(rows[0]) : null;
}

export async function listDemoRequests(input: {
  q?: string;
  status?: DemoRequestStatus | "all";
  sort?: ApplicationSort;
} = {}): Promise<DemoRequestRow[]> {
  const filters = [];
  if (input.status && input.status !== "all") filters.push(eq(demoRequests.status, input.status));
  const q = input.q?.trim();
  if (q) {
    filters.push(
      or(
        ilike(demoRequests.companyName, `%${q}%`),
        ilike(demoRequests.name, `%${q}%`),
        ilike(demoRequests.email, `%${q}%`),
        ilike(demoRequests.country, `%${q}%`),
      ),
    );
  }
  const orderBy =
    input.sort === "created_asc"
      ? sql`${demoRequests.createdAt} asc`
      : input.sort === "company_asc"
        ? sql`lower(${demoRequests.companyName}) asc`
        : desc(demoRequests.createdAt);
  const rows = await db
    .select()
    .from(demoRequests)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy);
  return rows.map(demoRow);
}

export async function getDemoRequest(id: string): Promise<DemoRequestRow | null> {
  const rows = await db.select().from(demoRequests).where(eq(demoRequests.id, id)).limit(1);
  return rows[0] ? demoRow(rows[0]) : null;
}

export async function getAcquisitionOverview(): Promise<{
  pendingTrialApplications: number;
  newDemoRequests: number;
  failedProvisioning: number;
}> {
  // `failedProvisioning` answers the one operator question the dashboard could
  // not previously answer: "did provisioning fail?". An application approved by
  // a human whose tenant never got created is an APPLICANT WAITING ON US with
  // nothing on screen to say so — it is not visible in any status count,
  // because its decision status is a perfectly healthy `approved`.
  const [trial, demo, failed] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(trialApplications).where(eq(trialApplications.status, "pending")),
    db.select({ n: sql<number>`count(*)::int` }).from(demoRequests).where(eq(demoRequests.status, "new")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trialApplications)
      .where(eq(trialApplications.provisioningStatus, "failed")),
  ]);
  return {
    pendingTrialApplications: Number(trial[0]?.n ?? 0),
    newDemoRequests: Number(demo[0]?.n ?? 0),
    failedProvisioning: Number(failed[0]?.n ?? 0),
  };
}
