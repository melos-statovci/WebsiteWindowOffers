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

## §3 Security E2E — **PARTIALLY DONE (in a human-provided session).**
The human logged the agent in; against DEV the `/security` page was verified live:
the **real active session list loads** (Better Auth — "Sesionet aktive (1)",
Chrome·Mac, "Kjo pajisje", real login/expiry timestamps), the change-password control
+ its "changing the password closes all other sessions" note render, 2FA is honest
"Së shpejti", and the "passwords are hashed, never shown/logged" note is present.
**Not exercised:** the actual password *change* (entering a password is prohibited for
the agent) and *revoke* (only one session existed, so revoke-others had nothing to
act on). Those two remain human-only — see §E2E TODO A.

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

## §10 Integrated E2E — **PERFORMED live (human-provided session), PASSED.**
Full UI round-trip against DEV (org shown as "test"): created client "Phase9 Test
Client" → created project "Phase9 E2E Project" (PRJ-2026-001) with a server-hydrated
profile system → added a window in the configurator (1000×1200mm, live calc materials
+ **€100.15**) → **accepted** the offer (status Draft→Pranuar, option toggles froze) →
created invoice **FAT-2026-001** from the accepted offer (UI states the lines/prices
are *"të garantuara nga serveri dhe nuk mund të ndryshohen"* — frozen) → recorded a
**partial €50 payment** → finance recomputed server-side: PAGUAR €50, balance label
flipped BORXHI→**KREDI €50** (paid > billed, since the invoice was still Draft) →
Dashboard aggregated **KREDI KLIENTËSH €50.00**.
**Server-authority proof:** after the client was created, clearing localStorage
entirely (`kornizo-demo-store` was the only key) + hard reload → the client (and all
data) survived, confirming PostgreSQL authority, not browser state.
**Not done (human-only):** logout→login (needs a password), and org-switch cross-leak
(no second test org). Test data (1 client/project/offer/invoice/payment) was left in
DEV — delete if unwanted. The DB suite still covers the freeze + debt/credit math with
an *issued* (non-draft) invoice.

---

## E2E TODO (human — only the password-gated bits remain)
**B. Visual — DONE by the agent** (live): exactly **3** design cards
(Klasik/SOLO·AKTIV, Minimal/BIZNES, Rrjeti Teknik/FABRIKA) + the amber "Klasik" honest
note; Abonimi shows no fake trial date; the top banner has no "11 ditë".
**C. Integrated — DONE by the agent** (see §10) — PASSED.
**A. Security change/revoke — STILL HUMAN-ONLY.** Sign in at http://localhost:3000,
then on `/security`: change the password via the form → expect success + other
sessions revoked; confirm you stay authenticated. To test revoke, first open a 2nd
session (another browser/incognito), then revoke it / revoke-others and confirm it
disappears. Do NOT paste real passwords into logs.
**Optional:** logout→login (records persist) and org-switch cross-leak check (needs a
2nd test org).

## Next exact step
1. Agent already ran the visual (B) + integrated (C) E2E live — PASSED.
2. Human runs the password-gated Security bits (§E2E TODO A) and reports pass/fail.
3. Optional: fresh-DB migration rehearsal (§8) before real customers.

## Do NOT redo / repeat
- Do NOT re-migrate business slices to localStorage. Do NOT re-add fake trial
  countdowns, fake notifications, or import/restore.
- Do NOT regenerate migration 0012 (RLS/grants are hand-appended).
- Do NOT migrate `selectedDesignId` to Postgres until real templates drive the PDF.
- Do NOT add Stripe / object storage / 2FA / email infra without an explicit decision.
- Do NOT invent a Phase 10 for deferred *product features* — architecture is complete.

## Release verdict
- **READY FOR PRIVATE/STAGING DEPLOYMENT.** Visual + integrated E2E passed live; only
  the password-gated Security change/revoke round-trip (§E2E TODO A) is left, and it is
  a standard Better Auth flow whose UI + session list already verified.
- **Blockers before real paying users** (product, not architecture): real billing
  (Stripe), object storage (logo + Documents), email (invitations/notifications),
  full 2FA — all intentionally deferred and honestly labeled in the UI.
- Core architecture (auth, tenancy, RLS, server-authoritative business data) is
  complete and coherent. Stop architecture migration; move to deployment/use/testing.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check` · `node scripts/setup-app-role.mjs`
