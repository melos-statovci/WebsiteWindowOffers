// Single Drizzle schema graph = Better Auth's generated tables (canonical) +
// our business tables. One migration history covers both.
//
// NOTE: user_preferences (proposed in the architecture sketch) is DEFERRED.
// A per-user preference row with a NULLABLE organization_id has ambiguous
// tenancy (global vs org-scoped) and cannot be cleanly RLS-protected by a single
// app.current_org policy. organization_profiles is the only business table in
// Phase 1; user_preferences will be revisited when its ownership model is
// unambiguous.

export * from "../auth-schema";
export * from "./business";
