// Transaction-scoped tenant context for RLS.
//
// withOrg(orgId, cb) opens ONE transaction, sets app.current_org LOCAL to that
// transaction via set_config(..., true) — parameterized, so injection-safe —
// then runs the callback with the same transaction handle. The GUC clears
// automatically at COMMIT or ROLLBACK, so it can never leak onto a pooled
// connection between requests. There is no persistent SET and no global.
//
// Phase 1 supplies orgId from trusted integration-test fixtures. Phase 2 will
// supply it from the Better Auth session's active organization — the signature
// does not change, so no rewrite is needed.

import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db as sharedDb } from "./client";
import type * as schema from "./schema";

export type AppDatabase = NodePgDatabase<typeof schema>;
export type TenantTx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/** Core implementation, parameterized by the drizzle instance (for tests). */
export async function runWithOrg<T>(
  database: AppDatabase,
  orgId: string,
  callback: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  // Fail closed: no active organization -> never touch tenant data.
  if (!orgId || typeof orgId !== "string") {
    throw new Error("withOrg: missing/invalid organization context");
  }
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org', ${orgId}, true)`);
    return callback(tx);
  });
}

/** Run `callback` inside a transaction scoped to `orgId` on the shared pool. */
export function withOrg<T>(orgId: string, callback: (tx: TenantTx) => Promise<T>): Promise<T> {
  return runWithOrg(sharedDb, orgId, callback);
}
