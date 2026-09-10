// PLATFORM audit trail — write helper + read layer for platform_audit_events.
//
// Writes happen ONLY from the trusted platform mutation path, inside the SAME
// transaction as the mutation (see actions/organization.ts), so an event is
// never recorded for a change that did not persist. The actor is taken from the
// authenticated platform context — never from client input. The table is
// append-only (runtime role has no UPDATE/DELETE). Reads are gated by platform
// authorization at every call site (the Activity page + its layout).

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { platformAuditEvents } from "@/db/schema/platform";

export type PlatformAuditAction =
  | "PLAN_CHANGED"
  | "ORGANIZATION_SUSPENDED"
  | "ORGANIZATION_REACTIVATED"
  | "INTERNAL_NOTE_UPDATED"
  | "CUSTOMER_ACTIVATED"
  | "TRIAL_EXTENDED"
  | "TRIAL_APPLICATION_APPROVED"
  | "TRIAL_APPLICATION_REJECTED"
  | "DEMO_REQUEST_STATUS_CHANGED";

// Minimal executor shape shared by the pool db and a transaction handle — so the
// helper can be called inside db.transaction(tx => ...) for atomicity.
type Inserter = {
  insert: (typeof db)["insert"];
};

export interface RecordAuditInput {
  actorUserId: string;
  actorEmail: string;
  action: PlatformAuditAction;
  organizationId?: string | null;
  organizationName?: string | null;
  metadata?: Record<string, unknown>;
}

/** Insert one audit event. Pass a transaction handle to bind it atomically to a mutation. */
export async function recordAuditEvent(exec: Inserter, input: RecordAuditInput): Promise<void> {
  await exec.insert(platformAuditEvents).values({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    action: input.action,
    organizationId: input.organizationId ?? null,
    organizationName: input.organizationName ?? null,
    metadata: input.metadata ?? {},
  });
}

export interface AuditEventRow {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: PlatformAuditAction;
  organizationId: string | null;
  organizationName: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditQuery {
  organizationId?: string;
  action?: PlatformAuditAction;
  limit?: number;
  offset?: number;
}

export interface AuditPage {
  events: AuditEventRow[];
  total: number;
}

/** Recent platform audit events, newest first, filterable + paginated. */
export async function listAuditEvents(q: AuditQuery = {}): Promise<AuditPage> {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);

  const filters = [];
  if (q.organizationId) filters.push(eq(platformAuditEvents.organizationId, q.organizationId));
  if (q.action) filters.push(eq(platformAuditEvents.action, q.action));
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select()
    .from(platformAuditEvents)
    .where(where)
    .orderBy(desc(platformAuditEvents.createdAt))
    .limit(limit)
    .offset(offset);

  const totalRes = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(platformAuditEvents)
    .where(where);
  const total = Number(totalRes[0]?.n ?? 0);

  return {
    events: rows.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      actorEmail: r.actorEmail,
      action: r.action as PlatformAuditAction,
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      createdAt: r.createdAt,
    })),
    total,
  };
}
