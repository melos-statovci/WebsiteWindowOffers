# Phase 8 — Productization, Remaining-State Audit & Production Hardening

Status: **Checkpoint A audit complete; MUST/SHOULD items implemented; browser-verified.**
Branch `clone/proferto`. Written for a COMPLETELY NEW Claude Code chat.

## Commits (Phase 8, on top of Phase 7 `a08cf8b`)
- `a3dca3c` — Company profile → PostgreSQL (organization_profiles + Better Auth org name).
- `18398ba` — Client notes → PostgreSQL (new `notes` tenant table, migration 0012).
- `4cae878` — Security page → real Better Auth (password + sessions); fake theatre removed.
- `7d917ce` — Real members list + honest notifications + de-risked backup; fake `users` slice dropped.
- `42a20e5` — Hardening: SCHEMA_VERSION 2→3 (wipe stale persisted slices) + neutral company seed.
- (+ this handoff commit; graphify-out refreshed.)

Phase 8 starting commit: `a08cf8b`.

## Git ↔ Neon synchronization
- Migration **0012_notes.sql** created, hand-augmented with RLS + grants, applied to Neon **DEV**.
- `drizzle-kit check`: **Everything's fine** (clean). `npm run db:migrate` idempotent.
- Production DB **not touched**.

---

## CHECKPOINT A — Remaining-state audit (what was found)

Persisted browser-authoritative business state at Phase 8 start (store `partialize`):
`company`, `notes`, `users`, `notifications` (+ legit UI prefs: selectedDesignId, guideDone, uiDismissals).

Classification & disposition:
- **company** — MUST MIGRATE. `organization_profiles` table + `updateOrganizationProfileAction`
  already existed but the Settings form wrote only to Zustand. → **DONE** (server read + hydrator +
  action; org name via Better Auth).
- **notes** — MUST MIGRATE (real shared per-client records). → **DONE** (new `notes` table).
- **users** — fake local users. → **REPLACED** with a real read-only Better Auth member list; slice removed.
- **notifications** — 3 hardcoded fakes. → **REMOVED** (honest empty bell); slice kept empty for future.
- **Security page** — fully simulated ("Demo lokale"). → **REPLACED** with real password change +
  session list/revoke (Better Auth); 2FA honestly deferred.
- **Backup/Restore** — import did nothing durable (wrote non-persisted mirrors). → **REMOVED** import/reset;
  export relabeled as a read-only JSON snapshot.
- **7 gated routes** (finance/jobs/stock/monitoring/workers/assets/documents) — honest plan-gated
  "not in your plan" walls, absent from nav. → **LEFT AS-IS** (already truthful).
- **Subscription/Abonimi** — honestly labeled demo, no real payment. → **LEFT AS-IS** (billing deferred).
- **Global search** — already searches server-hydrated mirrors. → no change.

### Infra decisions DEFERRED (hard-scope: NOT built, flagged for a human decision)
- **Object storage** (S3/R2/Vercel Blob) — blocks real Documents module AND company logo upload.
- **Billing provider** (Stripe) — subscription stays honestly-labeled demo.
- **Full 2FA** (Better Auth twoFactor plugin + migration) — deferred; fake 2FA control removed.
- **Email provider** — member invitations / notification emails deferred.

---

## What changed (per domain)

### Company profile (org settings) → PostgreSQL
- `src/server/organization-profile.ts` — `getOrganizationProfile()` (RLS-scoped withOrg; maps
  organization_profiles row + Better Auth `activeOrg.name` → CompanyProfile).
- `src/components/providers/company-hydrator.tsx` + wired into `(app)/layout.tsx`.
- Store: `company` is now a NON-persisted server-hydrated mirror (`setCompany`), seeded NEUTRAL
  (EMPTY_COMPANY — never the mock), excluded from partialize, wiped in migrate. `updateCompany` removed.
- `settings/page.tsx` ProfiliPanel: saves via `updateOrganizationProfile` (profile fields) +
  `authClient.organization.update` (org name); gated to owner/admin; logo card = "Së shpejti".
- `domain/validation/organization-profile.ts`: businessEmail may be "" (clearable).
- All existing consumers (invoice/print issuer fallback, new-project & manual-invoice VAT/margin
  defaults) keep reading `useStore(s => s.company)`.

### Notes → PostgreSQL (new tenant table)
- Schema `notes` in `src/db/schema/business.ts`: direct org ownership (RLS key) + composite FK
  `(organization_id, client_id) -> clients ON DELETE CASCADE`; author snapshot (`author_name`,
  `author_user_id` bare). Migration **0012_notes.sql** (table + ENABLE/FORCE RLS + 4 policies +
  GRANT CRUD to kornizo_app).
- `src/server/notes.ts` (`listNotes`), `src/server/actions/note.ts` + `note.action.ts`
  (`createNote`/`deleteNote`, permission `client:write`, author from session).
- `NotesHydrator` wired into layout; store `notes` is now a server-hydrated mirror (`setNotes`),
  local add/delete removed. `client-detail.tsx` notes tab cut to server actions + router.refresh(),
  shows author, delete confirms (shared across team).

### Security → real Better Auth
- `security/page.tsx` rewritten: real password change (`authClient.changePassword`, revokes other
  sessions), real active-sessions list + revoke (`listSessions`/`revokeSession`/`revokeOtherSessions`),
  2FA "Së shpejti". Removed fake devices/login-history/support-access + mock `devices`/`loginHistory`
  fixtures and `Device`/`LoginEvent` types.

### Members / notifications / backup
- Settings PerdoruesitPanel → real read-only member list (`authClient.organization.listMembers`),
  "you" badge, honest invite note. Fake `users`/`addUser`/`removeUser` slice + mock `users`/`currentUser`
  removed; `users` dropped from backup schema.
- Notifications: no fake seed; honest empty bell. Stale fakes wiped on migrate.
- BackupPanel: export-only (read-only JSON snapshot); import/Restore + reset-demo removed.
  Store `importData`/`resetDemo` removed.

---

## Production-hardening audit (findings)
- **Env/secrets**: only `.env.example` (names only) tracked; `.env.local` gitignored. No secrets committed. ✓
- **RLS coverage**: ALL 9 tenant tables now ENABLE + FORCE + policies + restricted-role grants:
  organization_profiles, clients, price_lists, projects, project_items, invoices, invoice_lines,
  payments, **notes**. Verified live on `notes` (relrowsecurity+force true, 4 policies, CRUD grant). ✓
- **Runtime role**: kornizo_app restricted (NOBYPASSRLS, no DDL/ownership); notes grant is row-CRUD only. ✓
- **Authorization**: new note actions + company action go through the Phase-3 spine (validation → auth →
  fresh role → withOrg RLS → safe errors). Company edit gated owner/admin (settings:edit); notes
  client:write; both re-check membership fresh. ✓
- **Validation**: notes (`domain/validation/note.ts`) + company (org-profile schema) re-validated
  server-side; browser payloads can't inject org/author. ✓
- **Error handling / logging**: action spine still maps internal errors to generic INTERNAL (no SQL/stack
  leak) — covered by action.dbtest sanitization test. Only server log is the benign pg `sslmode` warning. ✓
- **Backup/recovery**: real durability = Neon (PostgreSQL) + its branch/backup infra; the app no longer
  pretends a local JSON export is a backup.

---

## Verification (rerun these)
- `npm test` → 48 unit ✓
- `npm run test:db` → <FILL: run in progress at handoff; prior full run exit 0; expected 153 prior + 13
  new notes = ~166; action.dbtest +2 (clearable/empty businessEmail)>
- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ · `npm run check` (rerun)
- `npx drizzle-kit check` → Everything's fine ✓
- New tests: `src/server/notes.dbtest.ts` (13: RLS isolation, composite-FK cross-client rejection,
  smuggled-org immunity, author snapshot, NOT_FOUND, client-delete cascade); `action.dbtest.ts` +2.

### Browser validation (LOCAL, real signed-in dev session — org `hasanigmbh`)
Done in a fresh tab (the in-app pane corrupts on repeated HMR — open a NEW tab for a clean load):
- Company profile form shows the REAL server profile (name="hasanigmbh" from Better Auth, vat/margin=0,
  email empty from the DB row) — the fictional mock company is GONE; logo shows "Së shpejti".
- Members panel: real Better Auth list ("1 anëtar", real email), "Demo lokale" badge gone, honest invite note.
- Security: `GET /security 200`, no console/server errors (code verified; the pane paints this SPA route
  slowly but the server renders it fine).
- Clean boot: no console/server errors except the benign pg `sslmode` deprecation warning.
- Auth gate intact (protected routes require the session).
NOT re-run in the browser (proven by DB tests / heavy to set up): cross-org isolation for notes, the
password-change and session-revoke round-trips, notes sharing between two same-org users.

---

## Known issues / notes for next session
- **In-app browser pane is flaky**: editing `store.ts` (exports non-component values) triggers Fast-Refresh
  full reloads that corrupt the running tab, and reused tabs serve stale bundles. Always open a NEW tab
  (`tabs_create`) for a clean load; production `npm run build` is the source of truth.
- Company logo upload is deferred (needs object storage) — shown as "Së shpejti", not fake.
- The mock fixtures in `src/lib/mock/data.ts` (clients/projects/invoices/payments/pricing/company/account/
  sampleOffer) remain as DEV/TEST fixtures only; the runtime store no longer seeds business data from them
  (all server-hydrated / empty). `company` mock is now unused by the store (kept only as a fixture).

## Do NOT redo
- Do NOT re-generate migration 0012 with `drizzle-kit generate` — RLS + grants are HAND-APPENDED after the
  generated table DDL (drizzle can't express them); regenerating would drop them.
- Do NOT reintroduce local write authority for company/notes/users/notifications in the store.
- Do NOT rebuild the Graphify graph — `graphify update .` already ran (incremental).
- Do NOT add Stripe / object storage / 2FA / email infra without an explicit decision (see DEFERRED above).

## Next exact step
1. Confirm `npm run test:db` green (final count) + `npm run check`.
2. (Optional) human browser round-trips: company save persists across reload; password change; revoke a
   session; add a note as user A and see it as same-org user B.
3. Decide the deferred infra items (object storage / billing / 2FA / email) before real customers.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` · `npx drizzle-kit check`
