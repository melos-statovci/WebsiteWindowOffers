# Kornizo Platform Admin / SaaS Control Plane — V1 Handoff

Status: **V1 COMPLETE.** Platform authorization, control-plane data model, org
management, dashboard, and suspension enforcement are implemented, unit/DB/lint/
typecheck/build green, and validated live in the browser. Branch `clone/proferto`.
Written for a COMPLETELY NEW chat.

- Starting HEAD: `36cb6dc` (Phase 9 closeout).
- Feature commit: `7be9da3` — `feat(platform): Kornizo Platform Admin / SaaS control plane V1`.
- UI/observation fix: `e11e456` — `fix(platform): theme-aware chrome + real plan in tenant sidebar`.
- (+ this handoff commit.)

This is **KORNIZO PLATFORM ADMIN V1**, not a migration phase. Do not call it "Phase 10".

---

## 1. Architecture decision (the short version)

Platform Admin is a **separate authority** from every tenant/org role. Being an
org `owner` grants ZERO platform access. Two new NON-RLS control-plane tables
(modelled like Better Auth's own identity/tenancy tables), a dedicated auth +
action spine, and a single suspension chokepoint. **No existing tenant RLS policy
was changed; the runtime role stays NOBYPASSRLS.** The HARD STOP rule was not
tripped because cross-tenant reads reuse the *existing* RLS machinery rather than
weakening it.

## 2. Platform-admin identity — `platform_admins`
- New table (`src/db/schema/platform.ts`): `user_id` PK/FK→`user.id` (cascade),
  `email` snapshot, `note`, `created_at`.
- Presence of a row === platform operator. **Not** the Better Auth admin plugin
  (that would drag in impersonation/ban/set-password surfaces the spec forbids).
- Runtime role `kornizo_app` has **SELECT-ONLY** on it → a compromised app runtime
  can authorize but can NEVER escalate a platform admin.
- Granting is **out-of-band** via `scripts/seed-platform-admin.mjs` (owner creds):
  - `PLATFORM_ADMIN_EMAIL=you@example.com node --env-file=.env.local scripts/seed-platform-admin.mjs`
  - `... --list`  ·  `PLATFORM_ADMIN_EMAIL=... ... --revoke`
  - The dashboard does NOT grant/revoke platform admins in V1 (deliberate).

## 3. Platform authorization boundary (`src/server/platform/auth.ts`)
- `requirePlatformAdmin()` — layout gate. No session → `/sign-in`; signed-in
  non-admin → `notFound()` (a tenant owner/admin sees a plain 404, no leak).
- `getPlatformAdminContext(headers)` — action gate; typed result.
- Both resolve the Better Auth **server session**, then `SELECT platform_admins`.
  Independent of org membership (a platform admin need not belong to any org — so
  this deliberately does NOT reuse `requireAuthContext`, which forces an active org).
- **Two levels enforced:** the `/platform` layout AND every platform action re-check.

## 4. Platform action spine (`src/server/platform/action.ts`)
- `createPlatformAction` = validate (Zod) → authenticate → verify platform admin →
  handler → safe typed result (reuses the tenant `ActionResult`/`ActionError`/
  `ActionFailure` shapes; no raw DB error leaks). Accepting a TARGET org id from the
  request is safe here (platform admin is authorized over every org) and is still
  UUID-validated + existence-checked (`assertOrganizationExists`).
- Actions: `setPlanAction`, `setStatusAction`, `setInternalNoteAction`
  (`src/server/platform/actions/organization.ts`); "use server" wrappers +
  revalidation in `organization.action.ts`.

## 5. Control-plane data model — `organization_accounts`
- New table (`src/db/schema/platform.ts`): PK `organization_id`→`organization.id`
  (cascade), `plan` (`SOLO|BIZNES|FABRIKA`, CHECK), `status` (`active|suspended`,
  CHECK), `suspended_at`, `suspended_reason`, `internal_note`, timestamps.
- **NO tenant RLS** — SaaS operational state, not tenant business data. `kornizo_app`
  grants: **SELECT/INSERT/UPDATE (no DELETE)** — suspension never deletes.
- **Plan source of truth.** The previously-DEAD `organization_profiles.plan` column
  (nothing read it; gates were unconditional; plan-change was a demo toast) is
  **RETIRED** — migration 0013 backfills `organization_accounts` from it first, then
  drops it. There is now exactly ONE plan source.
- A missing account row degrades everywhere to `{plan:'SOLO', status:'active'}` (via
  COALESCE / a default in `getAccountState`), so an org can never be locked out for
  lack of a row; new orgs get one from the org-creation hook.

## 6. Cross-tenant access design (why RLS stays safe)
- `organization` / `member` / `user` / `invitation` / `organization_accounts` carry
  NO RLS (the existing design for identity/tenancy). The org **list**, **dashboard**
  aggregates and **member** metadata are plain cross-tenant SELECTs the restricted
  role can already run — no loop, no bypass.
- The ONLY tenant-RLS data a platform admin reads is the **company profile** + **per-
  org usage COUNTS**, and only on the single-org **detail** view. That reuses the
  EXISTING `withOrg(targetOrg)` transaction — same RLS enforcement, one org scoped at
  a time, gated by platform auth instead of membership. Counts only — never customer
  business CONTENTS (no invoice lines, customer addresses, configs, payment details).
- **DB roles unchanged:** `kornizo_app` LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  **NOBYPASSRLS**; owner only for migrations. No SECURITY DEFINER, no new role.

## 7. Suspension — storage & enforcement
- Stored in `organization_accounts.status` (+ `suspended_at`/`suspended_reason`).
- **Enforced in `resolveContext()`** (`src/auth/session.ts`), feeding BOTH:
  - `requireAuthContext` (tenant app-shell layout) → suspended members `redirect("/suspended")`.
  - `getAuthContext` (action spine) → returns `SUSPENDED` → spine maps to FORBIDDEN.
- No business data is touched; reactivation restores access on next load. Platform
  routes bypass this gate, so admins still manage a suspended org. `/suspended` lives
  OUTSIDE the `(app)` group so it never loops.

## 8. Plan gating "respected"
- The real plan is threaded into the auth context (`AuthContext.plan`,
  `ActionAuthContext.plan`) and surfaced truthfully: tenant **sidebar** ("Plani X")
  and **Settings → Abonimi** now show the real current plan. `src/lib/plan.ts` gains
  `PLAN_TIERS` + `planIncludes()` + `asPlanTier()` (the gating source of truth).
- The deferred feature modules (finance/jobs/...) remain honestly unbuilt — a plan
  change is *observably* respected (labels flip) WITHOUT fabricating functionality.

## 9. UI
- `/platform` dashboard (orgs / active / suspended / users / memberships + plan
  distribution). `/platform/organizations` (searchable + status/plan filters, GET
  form). `/platform/organizations/[id]` (overview, company profile, members, usage
  counts, manual plan change, suspend/reactivate w/ confirmation, private internal
  note). Theme-aware, distinguished by a violet accent + "PLATFORM" wordmark.

## 10. Migration
- **0013_platform_control_plane.sql** — creates both tables, FKs, indexes, CHECKs,
  the backfill, the `organization_profiles.plan` DROP, and hand-appended grants
  (admins SELECT-only; accounts SELECT/INSERT/UPDATE). Applied to Neon **DEV**;
  `drizzle-kit check` clean; `db:migrate` idempotent. **Do NOT `drizzle-kit generate`
  over 0013 — grants + backfill are hand-appended** (drizzle can't express them).
- `scripts/setup-app-role.mjs` extended with the two new grants (guarded for pre-0013 DBs).

## 11. Tests (all green)
- Unit `npm test`: **48**.
- DB `npm run test:db`: **183** (13 files → 14). New: `src/server/platform/platform.dbtest.ts`
  (**16**): authz boundary (unauth/ordinary/tenant-owner denied, admin allowed),
  mutation authz (non-admin FORBIDDEN, unauth UNAUTHENTICATED), plan change reflected
  in `getAuthContext.plan`, suspension enforcement + Org B unaffected + admin still
  inspects + reactivation + NO data deleted, cross-tenant reads via platform auth,
  hostile input (malformed→VALIDATION, unknown→NOT_FOUND, invalid status→VALIDATION,
  unknown org→null), tenant RLS regression (A still cannot see B).
- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ · `npm run check` ✓ ·
  `drizzle-kit check` ✓.

## 12. Browser E2E (LOCAL / Neon DEV — performed live)
Platform-admin session obtained WITHOUT typing a password: `test@gmail.com` (the
dev's own already-signed-in account) was granted platform admin via the seed script.
Verified live: platform dashboard renders (13 orgs); org list + search/filter;
org detail; signed-in NON-admin → 404 (deny path); **suspend → tenant `/dashboard`
redirects to `/suspended` → platform admin still opens the suspended org's detail →
reactivate → tenant `/dashboard` restored**; **plan change observed by the tenant**
(sidebar "Plani FABRIKA" + Abonimi "PLANI AKTUAL FABRIKA" with the AKTUAL badge).
Test org plan reverted to SOLO afterward.

- **`test@gmail.com` is currently a platform admin** (left granted for your
  convenience). Revoke with:
  `PLATFORM_ADMIN_EMAIL=test@gmail.com node --env-file=.env.local scripts/seed-platform-admin.mjs --revoke`
- NOT done by the agent (password-gated, human-only): a full sign-OUT/sign-IN as a
  platform admin through the form. The already-authenticated session proved the
  positive path; the sign-in form itself is the standard Better Auth flow.

## 13. Carried over from Phase 9 (still human-only — DO NOT expand)
1. password change  2. second-session revocation  3. logout/login + org-switch
isolation. The platform E2E naturally exercised org-scoped session behavior
(suspension redirect + plan observation) but did not perform these three.

## 14. Do NOT redo / watch out for
- Do NOT `drizzle-kit generate` over migration 0013 (hand-appended grants/backfill).
- Do NOT reintroduce `organization_profiles.plan` — the canonical plan is
  `organization_accounts.plan`.
- Do NOT make `kornizo_app` BYPASSRLS or add platform bypass to tenant RLS policies.
- Do NOT grant platform admin via `if (email === ...)` — use `platform_admins`.
- Do NOT add impersonation, org hard-delete, password-admin, Stripe, object storage,
  or email infra (all explicitly out of scope).
- Leftover dbtest users/orgs (`plat-*`, `p7c-*`, etc.) exist in DEV from prior test
  runs — a pre-existing test-hygiene matter, not part of this feature.

## 15. Next exact step
1. (Optional) Human signs OUT and back IN via the form as a platform admin to
   confirm the standard sign-in path, then walks `/platform`.
2. (Optional) Revoke `test@gmail.com` platform admin if not wanted (§12).
3. Decide whether platform-admin management (grant/revoke in-dashboard) and safe
   platform-wide business aggregates are worth a V2 — both were deliberately deferred.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check` · `node --env-file=.env.local scripts/seed-platform-admin.mjs [--list|--revoke]`
