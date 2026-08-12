// Server-side client READS. The active organization is always resolved from the
// Better Auth session (requireAuthContext) — never from client input — and every
// query runs inside a withOrg() RLS-scoped transaction as the restricted role,
// so Postgres itself guarantees a caller can only ever see its own tenant's
// rows. getClient() for another tenant's (or a nonexistent) id returns null with
// no disclosure that the row exists elsewhere.
//
// Rows are mapped to the shared domain Client shape so the existing UI/types are
// unchanged by the data-source migration.

import { eq, asc } from "drizzle-orm";
import { clients } from "@/db/schema/business";
import { withOrg } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import { isUuid } from "@/auth/organization";
import type { Client, ClientType } from "@/domain/types";

type ClientRow = typeof clients.$inferSelect;

/** DB row -> shared domain Client (null text columns collapse to undefined). */
function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ClientType,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    nui: row.nui ?? undefined,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

/** All clients of the caller's active organization, deterministically ordered. */
export async function listClients(): Promise<Client[]> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select()
      .from(clients)
      .orderBy(asc(clients.name), asc(clients.id));
    return rows.map(toClient);
  });
}

/**
 * One client by id, scoped to the active organization. Returns null when the id
 * is malformed, does not exist, or belongs to another tenant (RLS hides it) —
 * the caller cannot distinguish these cases, which is deliberate.
 */
export async function getClient(id: string): Promise<Client | null> {
  if (!isUuid(id)) return null;
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx.select().from(clients).where(eq(clients.id, id)).limit(1);
    return rows[0] ? toClient(rows[0]) : null;
  });
}
