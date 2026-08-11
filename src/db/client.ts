// Runtime application database client (node-postgres driver).
//
// Driver choice: node-postgres (`pg`) Pool + drizzle-orm/node-postgres. The
// tenant model (see tenant.ts) requires an INTERACTIVE transaction — BEGIN,
// set_config('app.current_org', …, true), then queries, then COMMIT — all on
// the *same* physical connection. node-postgres pooled clients guarantee that
// affinity for the life of a transaction; a one-shot HTTP driver cannot.
//
// In Phase 1 this pool is exercised only by the RLS integration tests, running
// as the restricted application role. Phase 2 wires it to server actions.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

/** Shared runtime pool (restricted app role, pooled Neon endpoint). */
export const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
