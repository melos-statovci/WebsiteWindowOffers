# Phase 9 — Final Verification & Release Readiness

Status: **Verification complete; small truthfulness/robustness fixes landed. Two
authenticated E2E steps require the human (password entry is out-of-bounds for
the agent).** Branch `clone/proferto`. Written for a COMPLETELY NEW chat.

- Phase 9 starting HEAD: `b1b4395`.
- Code-fix commit: `a8e5249` — `fix(truthfulness): honest offer-design, billing & save flow (Phase 9)`.
- (+ this handoff commit; graphify-out refreshed via `graphify update .`.)

---

## Baseline re-verified (all GREEN, from scratch this phase)
- `npm test` → **48** unit ✓
- `npm run test:db` → **167** DB/integration (13 files) ✓ (~235 s against Neon DEV)
- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ (exit 0)
- `npx drizzle-kit check` → **Everything's fine** ✓
- `npm run db:migrate` on DEV → **idempotent** ("migrations applied ✓", no new changes)
- Live DEV RLS/grants queried directly (see §RLS below) — matches migrations exactly ✓
- Only server log is the benign pg `sslmode` deprecation warning.

Numbers match the Phase 8 handoff. Nothing regressed.

---

## Fixes made this phase (4 files, no schema/migration change)

1. **Company Settings save — partial-failure honesty** (`settings/page.tsx` ProfiliPanel).
   The org **name** (Better Auth) and **profile fields** (`organization_profiles`)
   are two separate stores and cannot be one transaction. Reordered so the
   **validation-prone profile write runs FIRST** (a rejected email etc. aborts with
   nothing persisted). If the profile saves but the name write then fails, the UI
   now reports the **partial** save honestly and `router.refresh()`es — it never
   shows "Ndryshimet u ruajtën" unless BOTH succeeded. (Previously name-first: a
   name success followed by a profile failure left the name silently persisted with
   no refresh.)

2. **Offer designs trimmed 6 → 3** (`plan.ts`) — one per plan tier (Klasik/SOLO,
   Minimal/BIZNES, Rrjeti Teknik/FABRIKA). Per product decision: keep it small now,
   add more when templates actually ship. DizajniPanel copy updated ("nga gjithsej 3").

3. **DizajniPanel honest note** (`settings/page.tsx`) — amber note: generated offers
   currently use the standard **Klasik** template; additional designs and applying
   the selection to the PDF are coming; the choice is saved as a preference. (See
   selectedDesignId decision below.)

4. **Subscription + global trial banner de-faked**:
   - `AbonimiPanel` (`settings/page.tsx`): removed the fabricated/stale trial date
     (`account.trialEndsAt="2026-08-16"` + "11 ditë" — already contradictory) →
     honest "billing not activated yet (demo lokale)" note. Dropped the now-unused
     `account` mock import.
   - `TrialBanner` (`shell/floating.tsx`): removed the hardcoded "Prova falas: edhe
     11 ditë" fake countdown; kept the honest launch-phase notice. (Icon Clock→Rocket.)

5. **`.env.example`**: `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` documented as
   **REQUIRED in production** (were stale-commented "not required in Phase 1"), with
   generation + origin guidance. Names only, no secrets.

---

## §1 selectedDesignId — FINAL DECISION: browser-local UI preference (Option A)
Traced every consumer (grep + graphify): `settings/page.tsx` (set + show AKTIV),
`store.ts` (persist), `backup.ts` (export key). **`printOffer()` in `src/lib/print.ts`
never reads it — there is a single hardcoded print template.** So the design
selector controls **no server output**; only "klasik" is `active:true` and even the
6 card previews rendered identical placeholders.

Therefore it is **not** business authority (nothing is produced to be authoritative
over). Migrating a field that drives nothing to Postgres would falsely imply it is
real org config. It stays a **local UI preference**, and the DizajniPanel now says so
honestly. **If/when multiple real templates ship AND selection drives the PDF, it
becomes an org business setting and must move to `organization_profiles.settings`**
(so same-org users share one design, Org A ≠ Org B). Not today.

## §2 Company save flow — see fix #1. Partial-failure path is now honest; no false
atomic "success". A single-transaction merge is impossible without bypassing Better
Auth's `organization` table (rejected) or wrapping `auth.api.updateOrganization` in a
server action (larger change, deferred — current behavior is safe and truthful).

## §3 Security E2E — **NOT PERFORMED (human required).**
Password change + session revoke need a real signed-in session, and **entering a
password is prohibited for the agent**. A live authenticated session (org
`hasanigmbh`, owner) *did* render `/settings` with real server data before the dev
server restarted (company name "hasanigmbh" from Better Auth, profile from DB) —
proving the auth shell + hydration work live — but the password/session round-trips
were not exercised. **Exact steps for the human are in §"E2E TODO" below.**

## §4 Backup/export — already truthful (Phase 8), **no change needed.** Export is a
read-only JSON snapshot; the second card explicitly says real durability is
PostgreSQL + infra backups and there is no manual import/restore. Verified wording.

## §5 kornizo-demo-store persisted fields — FINAL inventory (`partialize`):
`notifications`, `selectedDesignId`, `guideDone`, `uiDismissals`. **No category-D
(business authority) data persists.** All DB-backed slices (clients, projects,
invoices, payments, notes, company, pricing) are excluded from `partialize` AND
wiped in `migrate()` so stale localStorage can never re-become a source of truth.
Reasons each remaining field may stay local:
- `notifications` — always seeded `[]` (no fake seed; no server source yet); a
  harmless empty mirror + mark-read stubs kept for future. Ephemeral (B/C).
- `selectedDesignId` — cosmetic UI preference; controls no server output (§1).
- `guideDone` — onboarding checklist completion; pure UI preference (A).
- `uiDismissals` — dismissed banners/hints with expiry; pure UI preference (A).

## §6 Mock/demo audit — every visible surface is REAL or CLEARLY DEFERRED:
- Subscription/billing → honest "Demo lokale"/"simulim lokal" (fixed the stale trial).
- Global trial banner → fake countdown removed; honest launch notice kept.
- Offer designs → honest note; only Klasik applied.
- Logo upload → "Së shpejti" (needs object storage). 2FA → "Së shpejti".
- Members/invitations → real read-only Better Auth list + honest invite note.
- Notifications bell → honest empty. Documents + 6 gated routes → honest plan walls.
- Dead-but-harmless: `validateBackup()`/`migrate()` in `domain/backup/backup.ts` are
  now used only by their own unit tests (import/restore was removed in Phase 8). Not
  user-visible; left in place (removing would delete 8 passing tests for no user
  benefit). Optional future cleanup. Mock fixtures in `lib/mock/data.ts` remain
  DEV/TEST-only; the `account` mock is now unreferenced by runtime.

## §7 Production env / secrets preflight
- Runtime `src/db/client.ts` → `DATABASE_URL` (restricted `kornizo_app`). Migrations
  `scripts/migrate.mjs` → `DATABASE_MIGRATION_URL` (owner). Cleanly separated. ✓
- `kornizo_app` role: LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE **NOBYPASSRLS**
  (from `scripts/setup-app-role.mjs`) — no DDL/ownership, cannot bypass RLS. ✓
- Only `.env.example` tracked (names only). `.env*` gitignored. No secrets committed. ✓
- Better Auth `secret`/`baseURL` come from env; now documented as prod-required. ✓
- DEV vs PROD: production must set its OWN DATABASE_URL (kornizo_app on the prod
  branch), DATABASE_MIGRATION_URL (owner, migrations only), BETTER_AUTH_SECRET
  (fresh strong random), BETTER_AUTH_URL (canonical origin). Do NOT reuse dev values.

## §8 Migration reproducibility
- `drizzle-kit check` clean; `db:migrate` idempotent on DEV (standard drizzle
  migrator tracks `__drizzle_migrations`). 13 migrations 0000–0012.
- **Fresh-DB rehearsal from zero: NOT performed** — needs a disposable Neon branch,
  a provider action. **To do it manually:** create a throwaway Neon branch; set its
  owner URL as `DATABASE_MIGRATION_URL`; run `npm run db:migrate`; run
  `node scripts/setup-app-role.mjs` to create `kornizo_app` + grants; then re-run the
  live RLS query (below) and confirm 9 tables × RLS/FORCE/4-policies + grants. Do NOT
  point this at the existing DEV/PROD data. (RLS + grants are HAND-APPENDED in the
  migration SQL — the migrator applies whole files, so a from-zero run reproduces them.)

## §9 RLS / grants — live DEV inventory (queried this phase, matches migrations)
All 9 tenant tables: **RLS=true, FORCE=true, 4 policies each**:
organization_profiles, clients, price_lists, projects, project_items, invoices,
invoice_lines, payments, notes. `kornizo_app` grants = SELECT/INSERT/UPDATE/DELETE on
all **except `price_lists` = SELECT/INSERT/UPDATE (no DELETE)** — correct for
immutable/versioned pricing. No Phase-8 table missed (notes covered). Better Auth
tables (user/session/account/organization/member/invitation/verification) get CRUD
grants, scoped by Better Auth at the app layer (standard). Server mutations still go
through the Phase-3 spine (validation → auth → fresh role → withOrg/RLS) — no bypass
found.

## §10 Integrated E2E — **NOT fully performed (human required).** Same password
boundary. The DB suite already proves the vertical slices (accepted-offer freeze,
finance debt/credit, RLS isolation, notes cross-client/cross-org). What still needs a
human click-through is the *integrated* UI round-trip + persistence-across-reload +
clear-localStorage + org-switch leak check. Steps in §E2E TODO.

---

## E2E TODO (human — the agent cannot type passwords)
Run `npm run dev`, sign in at http://localhost:3000 with a DEV account.
**A. Security** (`/security`): change password via the form → expect success + other
sessions revoked; confirm you stay authenticated; open the sessions list → revoke one
/ revoke-others and confirm it disappears. Do NOT paste real passwords into logs.
**B. Visual** (`/settings` → Dizajni i Ofertës): confirm exactly **3** design cards
and the amber "Klasik" honest note. (Abonimi: no fake trial date; top banner has no
"11 ditë".)
**C. Integrated**: Client → Pricing → Project → Configurator item → Accept (verify
freeze) → Invoice → partial Payment → settle → Dashboard/Client finance. Then hard
refresh + logout/login (records persist) + clear localStorage (server data remains) +
org-switch if a 2nd test org exists (no cross-org leak). Watch console/server logs.

## Next exact step
1. Human runs the E2E TODO (A/B/C) against DEV and reports pass/fail.
2. If all green → this is deployment-ready for private/staging (see below).
3. Optional: fresh-DB migration rehearsal (§8) before real customers.

## Do NOT redo / repeat
- Do NOT re-migrate business slices to localStorage. Do NOT re-add fake trial
  countdowns, fake notifications, or import/restore.
- Do NOT regenerate migration 0012 (RLS/grants are hand-appended).
- Do NOT migrate `selectedDesignId` to Postgres until real templates drive the PDF.
- Do NOT add Stripe / object storage / 2FA / email infra without an explicit decision.
- Do NOT invent a Phase 10 for deferred *product features* — architecture is complete.

## Release verdict
- **READY FOR PRIVATE/STAGING DEPLOYMENT** pending the human E2E TODO (A/B/C).
- **Blockers before real paying users** (product, not architecture): real billing
  (Stripe), object storage (logo + Documents), email (invitations/notifications),
  full 2FA — all intentionally deferred and honestly labeled in the UI.
- Core architecture (auth, tenancy, RLS, server-authoritative business data) is
  complete and coherent. Stop architecture migration; move to deployment/use/testing.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check` · `node scripts/setup-app-role.mjs`
