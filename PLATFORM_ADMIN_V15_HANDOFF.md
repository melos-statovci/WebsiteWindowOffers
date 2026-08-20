# Kornizo Platform Admin V1.5 — Operations UX + Auditability — Handoff

Status: **V1.5 COMPLETE.** Sidebar shell, dashboard/list/detail UX, an append-only
platform audit trail wired into every mutation, an Activity page, and a read-only
Platform Admins page — unit/DB/lint/typecheck/build/drizzle-kit all green and
browser-validated. Branch `clone/proferto`. Written for a NEW chat.

- Starting HEAD (V1 complete): `fa0d0c5`.
- V1.5 feature commit: `079f339` — `feat(platform): V1.5 ops UX + audit trail`.
- (+ this handoff commit.)

Continuation of Platform Admin V1 (do NOT redo V1). V1 handoff:
`PLATFORM_ADMIN_HANDOFF.md`.

---

## 1. Sidebar / layout
- `src/app/platform/shell.tsx` (client) — persistent sidebar: Përmbledhje /
  Organizatat / Platform Admins / Aktiviteti, active-route highlight, "Hap
  aplikacionin e tenantit" (→ /dashboard), admin email + Dilni. Fixed on `lg+`,
  off-canvas drawer with a top bar below. Violet "PLATFORM" identity; theme-aware
  (semantic slate tokens). `layout.tsx` keeps the server auth gate
  (`requirePlatformAdmin`) and renders the shell. Old `sign-out.tsx` removed.
- **The sidebar grants no authority** — every route re-checks platform auth on the
  server; a tenant user learning the URLs still gets a 404.

## 2. Dashboard
- `src/app/platform/page.tsx` — metrics (orgs/active/suspended/users/memberships)
  + plan distribution + NEW "Organizatat e fundit" (5 most-recent orgs; cheap
  non-RLS read via `getPlatformOverview().recentOrganizations`).

## 3. Organizations list
- `src/app/platform/organizations/page.tsx` — existing search + status/plan
  filters PLUS a **sort** control (newest / oldest / name A–Z / most-members),
  carried in the URL (GET form). Sort implemented in `listPlatformOrganizations`
  (`OrgSort`).

## 4. Organization detail
- `src/app/platform/organizations/[id]/page.tsx` + `tabs.tsx` (client) —
  restructured into tabs: **Overview / Members / Usage / Account**. Overview adds
  a truthful "Aktiviteti i fundit i biznesit" timestamp. Account holds plan
  change, suspend/reactivate, internal note, and a per-org **recent admin activity**
  feed (last 8 audit events). Counts/metadata only — never customer business content.

## 5–7. Platform Audit / Activity
- **Schema:** `platform_audit_events` (`src/db/schema/platform.ts`), migration
  **0014**. Columns: id, actor_user_id (bare), actor_email (snapshot), action
  (CHECK-constrained), organization_id (bare, nullable), organization_name
  (snapshot), metadata jsonb, created_at. **No RLS.** Runtime role grant =
  **SELECT + INSERT only** (no UPDATE/DELETE) → append-only/immutable even to the app.
- **Actions audited:** `PLAN_CHANGED` {oldPlan,newPlan}, `ORGANIZATION_SUSPENDED`
  {reason?}, `ORGANIZATION_REACTIVATED` {}, `INTERNAL_NOTE_UPDATED` {cleared,hadNote}.
- **Consistency:** each mutation handler (`src/server/platform/actions/organization.ts`)
  now runs inside `db.transaction`, reads the before-state, performs the change, and
  `recordAuditEvent(tx, …)` in the SAME transaction. A failed mutation (e.g.
  NOT_FOUND) rolls back → no orphan event; a blocked (unauthorized) mutation never
  reaches the handler → no event. **Actor is always ctx.userId/email from the
  authenticated platform context — never from client input.** Note TEXT is never
  written to the audit metadata.
- **Read + page:** `src/server/platform/audit.ts` (`recordAuditEvent`,
  `listAuditEvents` with action/org filter + pagination); `src/app/platform/activity/page.tsx`
  (table: time / action / org / details / actor; action+org filters; simple pager).
- **Authorization:** the Activity page sits under the platform layout gate, so a
  tenant user gets a 404 and never reaches it. `listAuditEvents` is only called
  from platform-gated code.

## 8. Platform Admins page
- `src/app/platform/admins/page.tsx` — READ-ONLY list (name/email/note/granted date)
  from `listPlatformAdmins()`.
- **Deliberately read-only in V1.5.** In-app grant/revoke is NOT added: provisioning
  stays out of band (`scripts/seed-platform-admin.mjs`, owner creds), which is what
  makes it safe — the running app has no path to escalate platform authority, so
  there is no self-promotion, privilege-escalation, or last-admin-lockout surface to
  defend. In-dashboard management is flagged as a **V2** decision (would need
  confirmation + audit + last-admin protection).

## 10. Last-activity decision
- Implemented ONLY on the detail view as "last business activity" = max(updated_at
  across clients/projects/invoices) + max(created_at across payments/notes), computed
  cheaply inside the existing single-org `withOrg` read. NOT login telemetry, NOT on
  the list (that would need per-org loops). Truthfully labelled.

## Security invariants (unchanged from V1, regression-tested)
- Platform authority separate from tenant roles (owner/admin/sales/operator/
  accounting all denied). `kornizo_app` stays **NOBYPASSRLS**; FORCE RLS intact; no
  tenant policy changed; audit/admins/accounts tables are non-RLS control-plane data.
- No impersonation, no org hard-delete, no password-admin, no Stripe, no new infra.

## Tests
- Unit `npm test`: **48**. DB `npm run test:db`: **190** (14 files; +7 platform:
  audit-on-success, no-event-on-failed/unauthorized mutation, suspend/reactivate
  audited, note text never logged, actor from context, admins list truthful).
- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ · `npm run check` ✓ ·
  `drizzle-kit check` ✓. Migration 0014 applied to Neon DEV (idempotent).
- **Do NOT `drizzle-kit generate` over 0014** — the append-only grant is hand-appended.

## Browser E2E (LOCAL / Neon DEV — performed live via the existing platform-admin session)
Verified: login state; sidebar (desktop fixed + mobile top bar) with active
highlight; dashboard (metrics + plan dist + recent orgs); organizations list with
search/filter/**sort** (members-desc ordering confirmed); org detail **tabs**;
**suspend via UI → ORGANIZATION_SUSPENDED audit event (reason + actor) → tenant
`/dashboard` redirected to `/suspended`**; **Activity page shows the entry**;
**reactivate via UI → ORGANIZATION_REACTIVATED event → tenant access restored**;
per-org activity feed; Platform Admins page; **light AND dark themes** both legible.
E2E audit test-rows were cleaned up afterward.

### NOT performed by the agent — HUMAN TODO (password entry is prohibited for the agent)
Entering a password into a form is disallowed for the agent even with the DEV
credentials provided, so these were not executed (reported, not faked):
- **A. Logout → login** (login form needs the password). Sign out, sign back in as
  the platform admin, confirm `/platform` loads.
- **B. Password change** (`/security`): change password, confirm other sessions drop,
  then RESTORE the password to the original DEV value and confirm login works.
- **C. Second-session revocation**: open a 2nd session, verify both appear on
  `/security`, revoke the other, confirm it loses access.
- **D. Org-switch isolation**: DB-proven by the RLS suite (Org A vs Org B isolation
  across clients/projects/pricing/invoices/payments/notes); the browser org-switch
  UI check is optional.
The plan-change UI button uses the SAME useTransition+server-action plumbing proven
live via suspend/reactivate; the native `<select>` is fussy in the automated pane
(not a product bug), and the plan-change action + its PLAN_CHANGED audit event are
covered by the DB suite.

## DEV note
- `test@gmail.com` and `testadmin@gmail.com` are platform admins in DEV (see the
  Platform Admins page). Revoke with
  `PLATFORM_ADMIN_EMAIL=<email> node --env-file=.env.local scripts/seed-platform-admin.mjs --revoke`.

## Next exact step
1. Human runs auth flows A/B/C above (password-gated) and reports pass/fail.
2. Decide V2: in-dashboard platform-admin management (with confirmation + audit +
   last-admin protection), and whether platform-wide business aggregates are worth
   the per-org cost.

## Do NOT redo / repeat
- Do NOT redo Platform Admin V1 or V1.5.
- Do NOT `drizzle-kit generate` over 0013/0014 (hand-appended grants/backfill).
- Do NOT add in-app platform-admin grant/revoke without the V2 safeguards above.
- Do NOT make kornizo_app BYPASSRLS or weaken tenant RLS. Do NOT add impersonation,
  org hard-delete, password-admin, Stripe, or external infra.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check` · `node --env-file=.env.local scripts/seed-platform-admin.mjs [--list|--revoke]`
