import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { contactRequests, member, trialApplications } from "@/db/schema";
import {
  demoContactRequestSchema,
  generalContactRequestSchema,
  trialApplicationSubmitSchema,
  type DemoContactRequestInput,
  type GeneralContactRequestInput,
  type TrialApplicationSubmitInput,
} from "@/domain/validation/acquisition";
import type { PublicLocale } from "@/lib/public-routing";

export type TrialApplicationStatus = "pending" | "approved" | "rejected";
export type ContactRequestStatus = "new" | "contacted" | "closed";
/**
 * Why the visitor got in touch.
 *
 * "Request a demo" is still a real, distinct public action with its own funnel
 * and its own page — this is only how it is PERSISTED, so a future contact
 * reason does not need another table.
 */
export type ContactRequestIntent = "demo" | "general";
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

export interface ContactRequestRow {
  id: string;
  intent: ContactRequestIntent;
  name: string;
  /** Null is legitimate for a general question. */
  companyName: string | null;
  email: string;
  normalizedEmail: string;
  phone: string | null;
  country: string | null;
  message: string | null;
  status: ContactRequestStatus;
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

function asContactStatus(value: string): ContactRequestStatus {
  if (value === "contacted" || value === "closed") return value;
  return "new";
}

function asContactIntent(value: string): ContactRequestIntent {
  return value === "general" ? "general" : "demo";
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

function contactRow(row: typeof contactRequests.$inferSelect): ContactRequestRow {
  return {
    id: row.id,
    intent: asContactIntent(row.intent),
    name: row.name,
    companyName: row.companyName,
    email: row.email,
    normalizedEmail: row.normalizedEmail,
    phone: row.phone,
    country: row.country,
    message: row.message,
    status: asContactStatus(row.status),
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

export type ContactRequestSubmitResult = PublicActionResult<{
  request: ContactRequestRow | null;
  duplicate: boolean;
  ignored?: boolean;
}>;

/** An OPEN request from the same email with the same intent, if one exists. */
async function findOpenContactRequest(
  normalizedEmail: string,
  intent: ContactRequestIntent,
): Promise<ContactRequestRow | null> {
  const rows = await db
    .select()
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.normalizedEmail, normalizedEmail),
        eq(contactRequests.intent, intent),
        sql`${contactRequests.status} <> 'closed'`,
      ),
    )
    .limit(1);
  return rows[0] ? contactRow(rows[0]) : null;
}

/**
 * THE single writer of contact_requests.
 *
 * Creates NO Better Auth user, NO organization, NO membership, NO
 * organization_accounts row, NO pricing and NO trial. A contact request is a
 * message, not tenancy — that is the whole distinction from a trial
 * application.
 *
 * Duplicate suppression matches the partial unique index: it looks for an OPEN
 * request with the SAME intent. So a visitor may ask for a demo and separately
 * ask a general question, and may start a new conversation once the previous
 * one has been closed by an operator — but cannot spam the same funnel.
 * Suppression reports success (`duplicate: true`) rather than an error, because
 * "we already have your request" is the truth and is not the visitor's problem.
 */
async function createContactRequest(input: {
  intent: ContactRequestIntent;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  message: string | null;
}): Promise<ContactRequestSubmitResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const existing = await findOpenContactRequest(normalizedEmail, input.intent);
  if (existing) return { ok: true, data: { request: existing, duplicate: true } };

  try {
    const rows = await db
      .insert(contactRequests)
      .values({
        intent: input.intent,
        name: input.name,
        companyName: input.companyName,
        email: input.email.trim(),
        normalizedEmail,
        phone: input.phone,
        country: input.country,
        message: input.message,
      })
      .returning();
    return { ok: true, data: { request: contactRow(rows[0]), duplicate: false } };
  } catch (e) {
    // Lost the race against a concurrent identical submission: the partial
    // unique index rejected it, so the visitor's request IS on file.
    const raced = await findOpenContactRequest(normalizedEmail, input.intent);
    if (raced) return { ok: true, data: { request: raced, duplicate: true } };
    console.error("[acquisition] contact request submit failed:", e);
    return { ok: false, error: { code: "INTERNAL", message: "Kërkesa nuk u ruajt. Provoni përsëri." } };
  }
}

/** Public "Request a demo" submission -> contact request with intent 'demo'. */
export async function submitDemoContactRequestAction(rawInput: unknown): Promise<ContactRequestSubmitResult> {
  const parsed = demoContactRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }
  const input: DemoContactRequestInput = parsed.data;
  if (isLikelyBot(input)) return { ok: true, data: { request: null, duplicate: false, ignored: true } };

  return createContactRequest({
    intent: "demo",
    name: input.name,
    companyName: input.companyName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    message: input.message ?? null,
  });
}

/** Public "Contact Kornizo" submission -> contact request with intent 'general'. */
export async function submitGeneralContactRequestAction(rawInput: unknown): Promise<ContactRequestSubmitResult> {
  const parsed = generalContactRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Të dhëna të pavlefshme.", fieldErrors: fieldErrorsFrom(parsed.error) },
    };
  }
  const input: GeneralContactRequestInput = parsed.data;
  if (isLikelyBot(input)) return { ok: true, data: { request: null, duplicate: false, ignored: true } };

  return createContactRequest({
    intent: "general",
    name: input.name,
    companyName: input.companyName ?? null,
    email: input.email,
    phone: input.phone ?? null,
    country: null,
    message: input.message,
  });
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

export async function listContactRequests(input: {
  q?: string;
  status?: ContactRequestStatus | "all";
  /** Operator filter: demo leads, general questions, or everything. */
  intent?: ContactRequestIntent | "all";
  sort?: ApplicationSort;
} = {}): Promise<ContactRequestRow[]> {
  const filters = [];
  if (input.status && input.status !== "all") filters.push(eq(contactRequests.status, input.status));
  if (input.intent && input.intent !== "all") filters.push(eq(contactRequests.intent, input.intent));
  const q = input.q?.trim();
  if (q) {
    filters.push(
      or(
        ilike(contactRequests.companyName, `%${q}%`),
        ilike(contactRequests.name, `%${q}%`),
        ilike(contactRequests.email, `%${q}%`),
        ilike(contactRequests.country, `%${q}%`),
      ),
    );
  }
  const orderBy =
    input.sort === "created_asc"
      ? sql`${contactRequests.createdAt} asc`
      : input.sort === "company_asc"
        // company_name is nullable now (a general question may have none), and
        // NULLs would otherwise sort to the end of an ascending list; fall back
        // to the person's name so every row still lands somewhere sensible.
        ? sql`lower(coalesce(${contactRequests.companyName}, ${contactRequests.name})) asc`
        : desc(contactRequests.createdAt);
  const rows = await db
    .select()
    .from(contactRequests)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy);
  return rows.map(contactRow);
}

export async function getContactRequest(id: string): Promise<ContactRequestRow | null> {
  const rows = await db.select().from(contactRequests).where(eq(contactRequests.id, id)).limit(1);
  return rows[0] ? contactRow(rows[0]) : null;
}

export async function getAcquisitionOverview(): Promise<{
  pendingTrialApplications: number;
  /** All NEW contact requests, whatever the intent — the operational number. */
  newContactRequests: number;
  /** The demo/general split, so "who wants a sales call" stays visible. */
  newDemoRequests: number;
  newGeneralRequests: number;
  failedProvisioning: number;
}> {
  // `failedProvisioning` answers the one operator question the dashboard could
  // not previously answer: "did provisioning fail?". An application approved by
  // a human whose tenant never got created is an APPLICANT WAITING ON US with
  // nothing on screen to say so — it is not visible in any status count,
  // because its decision status is a perfectly healthy `approved`.
  const [trial, contact, failed] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(trialApplications).where(eq(trialApplications.status, "pending")),
    // One grouped scan rather than three counts over the same small table.
    db
      .select({ intent: contactRequests.intent, n: sql<number>`count(*)::int` })
      .from(contactRequests)
      .where(eq(contactRequests.status, "new"))
      .groupBy(contactRequests.intent),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trialApplications)
      .where(eq(trialApplications.provisioningStatus, "failed")),
  ]);
  const byIntent = new Map(contact.map((row) => [row.intent, Number(row.n)]));
  const newDemoRequests = byIntent.get("demo") ?? 0;
  const newGeneralRequests = byIntent.get("general") ?? 0;
  return {
    pendingTrialApplications: Number(trial[0]?.n ?? 0),
    newContactRequests: newDemoRequests + newGeneralRequests,
    newDemoRequests,
    newGeneralRequests,
    failedProvisioning: Number(failed[0]?.n ?? 0),
  };
}
