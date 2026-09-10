# Kornizo Launch Handoff

Status: **Milestones 1-5 complete. Milestone 6 (production deployment) is next.**

## Starting State

- Branch: `clone/proferto`
- Milestone 2 starting HEAD: `ac7c65a`
- Milestone 2 bilingual follow-up starting HEAD: `ca7aa70`
- Milestone 2B public visual polish starting HEAD: `159d288c9bc1b66d45a4517f8b26302da8b8a8dc`
- Milestone 4 starting HEAD: `ca10dcb9271c1e08759b74342f846b0af8262cff`
- Milestone 5 starting HEAD: `fa799434be22c2a11edeecd2f7343b8e25d0b18a`
- Tracking remote: `melos/clone/proferto`
- Repository: `/Users/solution25/Website/WebsiteWindowOffers`
- Milestone 2 final HEAD: see final report / `git rev-parse HEAD` after this
  handoff update is committed and pushed.
- Milestone 3 final HEAD: see final report / `git rev-parse HEAD` after this
  handoff update is committed and pushed.
- Milestone 4 final HEAD: see final report / `git rev-parse HEAD` after this
  handoff update is committed and pushed.

## Completed Milestones

Milestone 1 established Kornizo Standard and the customer access lifecycle.
Milestone 2 added the public Kornizo homepage, truthful temporary public CTA
pages, the Albanian-default / English-secondary public language pass, and the
final public visual polish pass. Milestone 3 replaced the temporary public CTA
pages with real trial/demo application persistence and Platform Admin review
flows, while preserving the hard stop before tenant provisioning.

## Milestone 2 Public Homepage

- `/` is now a public static App Router page instead of redirecting to
  `/dashboard`.
- Albanian is the default public marketing language. A logged-out visitor who
  opens `/` sees Albanian, without browser-language detection or automatic
  redirect to English.
- English is available at stable public routes: `/en`, `/en/request-trial` and
  `/en/request-demo`.
- The public language switcher is compact (`SQ | EN`), visible on desktop,
  available inside mobile navigation, marks the active language, is keyboard
  reachable, and maps to the equivalent localized route while preserving the
  current hash in the browser when possible.
- The homepage is a shared Server Component backed by typed locale/content
  dictionaries in `src/lib/public-marketing.ts`. The only new public client
  component is the small route-aware `LanguageSwitcher` needed to preserve hash
  anchors during locale changes.
- Mobile navigation and FAQ disclosure use native `details`/`summary`.
- Page metadata now describes Kornizo as a window/door configuration, offer,
  invoice and payment product in Albanian and English. Language alternates use
  relative route metadata; no production canonical URL was hardcoded because no
  final production domain is configured.
- Navigation is localized. Albanian: Produkti, Si funksionon, Funksionet,
  Standard, FAQ, Hyr, Kërko provë falas. English: Product, How it works,
  Features, Standard, FAQ, Sign in, Request free trial.
- Hero positioning is localized. Albanian: "Nga konfigurimi i dritareve deri
  te pagesa, në një vend." English: "From window configuration to payment,
  all in one place." The supporting copy explicitly names window and door
  companies.
- Product visual strategy: no screenshots were committed. The hero uses a
  safe, composed product-window preview based on real tenant surfaces:
  Dashboard, Projects, Clients, Invoices, Pricing, configurator, offer status,
  invoice and payment visibility. The final polish made this preview richer and
  more product-proving with a window/door configuration area, compact localized
  stage labels, offer-state cards, invoice/payment progress, and stronger
  desktop framing. It contains no DEV customer data, emails, credentials or real
  screenshots.
- Workflow section presents the real path in both languages: customer ->
  configure windows/doors -> calculate price -> create/track offer/project ->
  invoice -> payment. The final polish changed the section into a connected
  six-step sequence with tighter cards and hover states while preserving the
  same product truth.
- Features are grouped by business value: Configure and calculate, Sell and
  organize, Invoice and get paid, Work as a company.
- Standard section presents exactly one launch plan: `Kornizo Standard`.
  It states a 14-day full trial and does not invent a public price. The final
  polish presents Standard as one stronger plan panel instead of fake tier
  cards.
- Future-plan teaser is localized and limited to a careful note that Kornizo is
  growing and additional plans/tools may be introduced over time. No names,
  prices, dates or specific future features are promised.
- FAQ covers what Kornizo is, who it is for, company pricing, team access, trial
  contents/end state, browser access, invoices/payments and future plans in both
  Albanian and English.
- Footer includes localized Product, Sign in, Trial and Demo links.
  Privacy/Terms placeholders were not added because legal pages are not part of
  this milestone.

## Milestone 3 Acquisition Behavior

- `/request-trial` and `/en/request-trial` are real localized trial
  application flows. Signed-out applicants create a Better Auth user account
  first; signed-in users submit company/application fields directly.
- Trial applications are stored in `trial_applications` with
  `pending|approved|rejected` status, normalized email uniqueness, user
  ownership, reviewer metadata, and internal notes that are never shown to the
  applicant.
- `/application-status` and `/en/application-status` are signed-in status pages
  for the current user's own trial application. Approved status explicitly says
  access is being prepared and that the trial has not started yet.
- `/request-demo` and `/en/request-demo` collect accountless demo requests in
  `demo_requests`; demo submission does not create a Better Auth user or
  tenant organization.
- Duplicate trial/demo submissions are suppressed by user/email identity instead
  of creating duplicate rows.
- Honeypot and minimum-form-time checks mark likely bot submissions without
  trusting client-provided status, user, reviewer, or lifecycle fields.

## Milestone 3 Public/Auth Routing

- `src/proxy.ts` now allows logged-out access to `/`, `/en`, `/request-trial`,
  `/request-demo`, `/en/request-trial`, `/en/request-demo`, `/sign-in` and
  `/sign-up`.
- `/sign-up` now redirects to `/request-trial`; public self-service
  organization creation is disabled.
- `/application-status` and `/en/application-status` remain protected, then show
  only the signed-in user's application state.
- Protected tenant and platform routes remain protected by the proxy for
  logged-out GET navigation, and still rely on their server-authoritative
  layout gates (`requireAuthContext`, `requirePlatformAdmin`) for real
  enforcement.
- Sign in still points to `/sign-in`, which keeps its existing server-session
  redirect to `/dashboard` for genuinely signed-in users.

## Milestone 2 Theme And Responsive Notes

- Final public visual polish tightened hero spacing, reduced the desktop H1
  scale slightly, moved the full navigation breakpoint to `lg` to prevent
  tablet wrapping, improved feature-card hierarchy, and kept CTA widths stable
  across Albanian and English.
- The public pages use the existing class-based theme model from
  `src/app/layout.tsx` and avoid changing tenant theme plumbing.
- Dark-mode public CTA contrast was verified against the app's slate-token
  remapping and uses neutral tokens with explicit dark text colors where needed.
- Desktop and mobile visual validation used local headless Chrome screenshots.
  The final Milestone 2B pass also checked laptop and tablet homepage viewports,
  plus all six public localized routes in desktop/mobile and light/dark. The
  final screenshots and DOM metrics showed no horizontal overflow or clipped
  visible text in the measured viewports.

## Milestone 2 Files Added/Changed

- `src/app/page.tsx` - public homepage.
- `src/app/en/page.tsx` - English public homepage.
- `src/app/request-trial/page.tsx` - temporary non-persisting trial page.
- `src/app/request-demo/page.tsx` - temporary non-persisting demo page.
- `src/app/en/request-trial/page.tsx` - English temporary trial page.
- `src/app/en/request-demo/page.tsx` - English temporary demo page.
- `src/components/public/marketing-page.tsx` - shared localized public homepage
  component.
- `src/components/public/language-switcher.tsx` - compact public locale
  switcher.
- `src/components/public/metadata.ts` - localized public metadata helpers.
- `src/components/public/temporary-request-page.tsx` - shared temporary CTA
  page component.
- `src/lib/public-marketing.ts` - typed marketing content/constants.
- `src/lib/public-routing.ts` - locale and equivalent-route helpers.
- `src/lib/public-marketing.test.ts` - launch constraint tests for Standard,
  no fake prices/tiers, temporary CTA wording, Albanian default and language
  switch targets.
- `src/proxy.test.ts` - public/protected route proxy tests.
- `src/proxy.ts` - public-route allowlist.
- `KORNIZO_LAUNCH_ROADMAP.md` and `KORNIZO_LAUNCH_HANDOFF.md` - milestone
  state updates, including the final public visual polish pass.

## Milestone 2 Verification

- Baseline before edits:
  - `npm test` green: 54 unit tests.
  - `npm run check` green.
- After original homepage edits:
  - `npm test` green: 62 unit tests.
  - `npm run lint` green.
  - `npm run typecheck` green.
  - `npm run build` green.
  - Local HTTP checks: `/`, `/request-trial`, `/request-demo`, `/sign-in` all
    returned 200 while logged out; `/dashboard` and `/platform` redirected to
    `/sign-in`.
  - Local headless Chrome visual checks: desktop dark, mobile dark, desktop
    light, mobile light and mobile trial placeholder captured; DOM metrics
    reported no clipped text and no horizontal overflow.
- After bilingual public-site follow-up:
  - `npm test` green: 62 unit tests.
  - `npm run lint` green.
  - `npm run typecheck` green.
  - `npm run build` green.
  - Local HTTP checks: `/`, `/en`, `/request-trial`, `/request-demo`,
    `/en/request-trial`, and `/en/request-demo` returned 200 while logged out;
    `/dashboard` and `/platform` redirected to `/sign-in`.
  - Local headless Chrome visual checks covered Albanian and English public
    routes in desktop/mobile and light/dark. DOM metrics reported no horizontal
    overflow and no clipped visible text.
- After Milestone 2B public visual polish:
  - `npm run typecheck` green after the visual/component edits.
  - Local homepage visual audit covered Albanian and English at 1440x1100,
    1280x900, 820x1100 and 390x1100 in light/dark; no horizontal overflow and
    no clipped visible text were reported.
  - Local public-route visual audit covered `/`, `/en`, `/request-trial`,
    `/request-demo`, `/en/request-trial` and `/en/request-demo` in
    desktop/mobile and light/dark; no horizontal overflow and no clipped visible
    text were reported.
  - Local HTTP checks: `/`, `/en`, `/request-trial`, `/request-demo`,
    `/en/request-trial`, and `/en/request-demo` returned 200 while logged out;
    `/dashboard` and `/platform` redirected to `/sign-in`.
- Final full gate after edits:
  - `npm test` green: 60 unit tests.
  - `npm run test:db` green: 197 DB/integration tests.
  - `npm run lint` green.
  - `npm run typecheck` green.
  - `npm run build` green.
  - `npm run check` green.
  - `npx drizzle-kit check` green.

## Milestone 2 Known Issues

- Browser connector providers were unavailable in this environment, so browser
  validation used local headless Chrome/CDP from the terminal instead.
- Headless Chrome reported a 500px effective minimum width during CDP mobile
  checks even when launched with a 390px window. The earlier 390px CLI screenshot
  exposed and drove the mobile overflow fix; final CDP metrics confirmed no
  overflow after the fix.
- No authenticated browser session was used for homepage validation. The public
  homepage is intentionally auth-independent, and protected-route behavior was
  verified logged out via HTTP and unit tests.

## Milestone 3 Files Added/Changed

- `src/app/request-trial/page.tsx`, `src/app/en/request-trial/page.tsx`,
  `src/components/public/request-trial-form.tsx` - localized trial application
  flow.
- `src/app/request-demo/page.tsx`, `src/app/en/request-demo/page.tsx`,
  `src/components/public/request-demo-form.tsx` - localized accountless demo
  request flow.
- `src/app/application-status/page.tsx`,
  `src/app/en/application-status/page.tsx`,
  `src/components/public/application-status-page.tsx` - applicant status pages.
- `src/app/platform/applications/page.tsx`,
  `src/app/platform/applications/trial/[id]/page.tsx`, and platform
  application action components - Platform Admin inbox and review controls.
- `src/server/acquisition.ts`, `src/server/acquisition.action.ts`,
  `src/domain/validation/acquisition.ts` - public acquisition persistence,
  validation, duplicate suppression, and listing helpers.
- `src/server/platform/actions/applications.ts` and `.action.ts` - platform
  review/status actions with audit.
- `src/server/provisioning.ts` - trusted server-side provisioning primitive for
  Milestone 4 and tests; it is not exposed to public sign-up or application
  approval.
- `src/db/migrations/0016_nervous_quicksilver.sql` and Drizzle metadata -
  trial/demo application tables and audit action expansion.
- `src/app/account-not-ready/page.tsx`, `src/auth/session.ts`,
  `src/server/platform/accounts.ts`, and platform organization views - missing
  `organization_accounts` metadata now fails closed as `account_not_ready`.
- Removed the obsolete `src/components/public/temporary-request-page.tsx`
  placeholder component.

## Milestone 3 Security Decisions

- A Better Auth user account alone is not tenant access.
- Public self-service organization creation is disabled in the Better Auth
  organization plugin.
- `/onboarding` no longer creates organizations. Users without tenant access
  are routed to their application status or the trial request flow.
- Platform trial approval/rejection only updates the application row and writes
  audit. It does not create an organization, membership, profile, account,
  pricing row, trial window, active organization, or tenant access.
- Missing `organization_accounts` rows fail closed via `/account-not-ready`.
- Existing DEV organizations were checked after migration 0016; zero
  organizations were missing `organization_accounts` rows.

## Milestone 4 Approval -> Organization + Trial Provisioning

### Locked policy

A Trial Application provisions exactly **one NEW organization**. Attach to an
existing organization, organization chooser during approval, merge and owner
transfer were explicitly NOT built. Joining an existing Kornizo company remains
the Better Auth organization/member/invitation flow.

Flow: `TRIAL APPLICATION -> APPROVE & START TRIAL -> NEW ORGANIZATION ->
applicant = OWNER -> Kornizo Standard -> 14-day trial`.

### Schema (migration `0017_trial_application_provisioning`)

Added to `trial_applications`:

- `organization_id uuid` -> `organization(id)` **ON DELETE RESTRICT**. The
  canonical application -> organization link. Never client-supplied. RESTRICT
  (not CASCADE/SET NULL) because a provisioned application is historical
  acquisition evidence; the organization must not vanish beneath it. Test/DEV
  teardown unlinks explicitly first (`TestCleanup.run()`).
- `provisioning_status text not null default 'not_started'` -
  `not_started | in_progress | provisioned | failed`.
- `provisioning_slug text` - the stable, application-derived organization slug.
  Persisted on the FIRST claim and never rewritten. **This is the exactly-once
  key.**
- `provisioning_started_at`, `provisioned_at`, `provisioning_attempts`,
  `provisioning_error_code` (sanitized category only).

Constraints/indexes:

- `trial_applications_organization_uidx` - partial UNIQUE on `organization_id`:
  one organization belongs to at most one application, and vice versa.
- `trial_applications_provisioning_slug_uidx` - partial UNIQUE on the slug.
- `trial_applications_provisioned_shape_chk` - `provisioned` implies
  `organization_id is not null and provisioned_at is not null`.
- `trial_applications_link_requires_approval_chk` - `organization_id is null or
  status = 'approved'`, so a pending/rejected row can never carry tenant access.
- Audit CHECK extended with `TRIAL_APPLICATION_PROVISIONED` and
  `TRIAL_APPLICATION_PROVISIONING_FAILED`.

The migration is additive only; no destructive statement.

### Trusted provisioning architecture

`src/server/provisioning.ts` was split into RESUMABLE PHASES (still no
`"use server"`, still not imported by any public route/action):

- `stableProvisioningSlug(name, recordId)` - pure, re-exported from
  `src/lib/provisioning-slug.ts` so it is unit-testable offline.
- `createOrAdoptOrganization({userId, name, slug})` - **look up by slug first**,
  then create via Better Auth's server-only `userId` path, then look up **once
  more** if creation threw. Returns `created: false` when adopting.
- `completeOrganizationProvisioning({organizationId, ownerUserId})` - idempotent
  `ensureOrganizationProfile` + `ensureOrganizationAccount` + `ensureDefaultPricing`,
  then verification.
- `verifyOrganizationProvisioning()` - reads `member`/`organization_accounts` on
  the pool and `organization_profiles`/`price_lists` **inside `withOrg`**, so the
  check proves visibility under the tenant's own RLS rather than bypassing it.
- `createTrustedProvisionedOrganization()` still composes both phases for
  DEV/test fixtures.

`src/server/platform/provisioning.ts` owns the application-level lifecycle:
claim -> create/adopt -> link -> complete -> verify -> mark provisioned + audit.

### Exact idempotency mechanism

The claim transaction persists `provisioning_slug` (derived from the application
id) and commits **before** Better Auth is called. `organization.slug` is UNIQUE.
Therefore, for a given application:

- first attempt creates the organization;
- an attempt after a crash finds the slug taken and **adopts** that
  organization;
- a concurrent attempt that loses the unique-slug race also adopts it.

No input produces two organizations for one application. The
`organization_id` linkage is written immediately after create/adopt (belt and
braces; the slug alone would already find it).

### Exact concurrency mechanism

`SELECT ... FOR UPDATE` on the application row inside the claim transaction
serializes concurrent approvals. The loser sees `in_progress` and is refused
with `PROVISIONING_IN_PROGRESS` rather than racing. A claim older than
`STALE_CLAIM_MS` (2 minutes) may be taken over so a crashed attempt is
recoverable; correctness never depends on that window — the slug key does.

### Retry and partial-failure semantics

- Retry is allowed from `failed` and from a stale `in_progress`.
- Retrying a `provisioned` application is an idempotent no-op reporting success.
- Every completion step is `INSERT ... ON CONFLICT DO NOTHING`, so retry
  converges to exactly one owner membership, one profile, one account, one
  active price list.
- On failure the application stays **approved** with
  `provisioning_status='failed'` and a sanitized `provisioning_error_code`.
  Nothing auto-retries; a page refresh does not re-provision.

### Trial start semantics

The 14-day trial starts when `ensureOrganizationAccount()` first inserts the
`organization_accounts` row — i.e. at successful provisioning, not at
submission or approval. It remains the SINGLE writer of `trial_started_at` /
`trial_ends_at`; the platform approval path computes no dates of its own.

### Applicant owner membership, profile, account, pricing

The applicant becomes `owner` through Better Auth's own organization-creation
path. No parallel owner table exists. Profile, account and default pricing come
from the existing canonical helpers, unchanged.

### Applicant own-session activation

`activateProvisionedOrganizationAction(headers)` runs in the APPLICANT'S session
and **takes no input at all**: it derives the user from the session, loads their
own application, requires `approved` + `provisioned`, re-verifies the `member`
row, then calls `setActiveOrganization` for the current session. A platform
admin never mutates another user's session. `resolveContext()` also still
auto-activates a sole organization, so a returning applicant cannot get stuck.

### Platform UX

- Approve button is now **"Aprovo & nis provën 14-ditore"**.
- The detail page gains a **Provizionimi** panel: status, provisioned-at,
  attempts, sanitized failure reason, and a link to the created organization
  with plan / commercial access / trial dates / days remaining / operational
  status (canonical data — no second platform representation).
- Failure shows **DËSHTOI** + a human reason + **"Provo provizionimin përsëri"**.
  No stack traces or raw errors reach the operator.
- The Applications list shows a provisioning badge next to APPROVED, so
  "approved but not actually provisioned" can never read as success.

### Applicant UX

- Provisioned: "Prova juaj në Kornizo është gati." / "Keni 14 ditë qasje të plotë
  në Kornizo Standard." + **Filloni me Kornizo** (EN: "Your Kornizo trial is
  ready." / "You have 14 days of full access to Kornizo Standard." / "Start
  using Kornizo"). Once the session already has the org active, the CTA becomes
  "Hap aplikacionin" / "Open app".
- Approved but not yet provisioned keeps the truthful "access is being prepared,
  the trial has not started yet" wording.

### Audit

`TRIAL_APPLICATION_APPROVED` remains the human decision event;
`TRIAL_APPLICATION_PROVISIONED` records the resulting organization, slug, plan,
commercial access and trial end; `TRIAL_APPLICATION_PROVISIONING_FAILED` records
a sanitized `errorCode` + attempt. Actor always comes from the authenticated
platform context. No note text, secrets or raw errors are logged.

## Milestone 4 Files Added/Changed

- `src/db/schema/platform.ts` - provisioning columns, constraints, audit actions.
- `src/db/migrations/0017_trial_application_provisioning.sql` (+ snapshot/journal).
- `src/server/provisioning.ts` - resumable phases (create/adopt, complete, verify).
- `src/lib/provisioning-slug.ts` - pure slug + sanitized failure text (shared by
  server and client components).
- `src/server/platform/provisioning.ts` - application-level provisioning
  lifecycle + `getProvisionedOrganizationSummary`.
- `src/server/platform/actions/applications.ts` / `.action.ts` - approval now
  provisions; `retryTrialApplicationProvisioningAction` added.
- `src/domain/validation/acquisition.ts` - retry schema; **fixed** the
  `offersPerMonth` preprocess (see Known Issues).
- `src/server/acquisition.ts` / `.action.ts` - provisioning fields on
  `TrialApplicationRow`; `activateProvisionedOrganizationAction`.
- `src/components/public/start-using-kornizo.tsx` - applicant activation button.
- `src/components/public/application-status-page.tsx` - trial-ready state.
- `src/app/platform/applications/*` - approve/retry controls, provisioning panel,
  list badge.
- `src/app/platform/ui.tsx` - audit badges for the two new actions.
- `src/app/request-trial/page.tsx`, `src/app/en/request-trial/page.tsx` - copy now
  says approval creates the company and starts the trial.
- `src/db/testing/fixtures.ts` - unlink acquisition rows before dropping orgs.
- Tests: `src/server/platform/provisioning.dbtest.ts` (26),
  `src/lib/provisioning-slug.test.ts` (5),
  `src/domain/validation/acquisition.test.ts` (7),
  updated `src/server/acquisition.dbtest.ts`.

## Milestone 4 Verification

- `npm test` green: **78** unit tests.
- `npm run test:db` green: **237** DB/integration tests (was 211).
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check` green.
- `npx drizzle-kit check` green.
- `npm run db:migrate` applied 0017 to Neon **DEVELOPMENT** and re-ran
  idempotently. Live schema query confirmed all columns, both partial unique
  indexes, all CHECKs, the RESTRICT FK, and the extended audit CHECK.
- Browser E2E (local dev + Neon DEV, real Better Auth sessions): logged-out
  `/request-trial`; applicant submits through the real UI; PENDING status; no
  tenant access; platform inbox; **Aprovo & nis provën** -> I PROVIZIONUAR;
  organization link; STANDARD / TRIAL / correct dates / 14 days / ACTIVE;
  organization appears in Platform Organizations; both audit events on Activity;
  applicant sees "Prova juaj në Kornizo është gati"; **Filloni me Kornizo** ->
  `/dashboard` with "Kornizo Standard · Trial · 14 ditë" and role Owner;
  `/clients` and `/pricing` load; EN status page correct; approve/retry controls
  correctly absent once provisioned.
- Browser failure/retry E2E: forced a partial failure, confirmed **DËSHTOI** +
  sanitized reason + no internals leaked, refresh did NOT auto-provision, Retry
  recovered to I PROVIZIONUAR with **no second organization** and exactly one
  `organization_accounts` row.
- All E2E rows (application, organization, applicant user, audit events) were
  cleaned up afterwards; a DEV query confirmed zero remaining.

## Milestone 4 Known Issues

- **Pre-existing bug found and fixed:** the public trial form failed with an
  internal error whenever the optional "Oferta në muaj" field was left blank. A
  server action drops `undefined` values, so the key arrived MISSING; the Zod
  preprocess only handled `""`/`null`, so `Number(undefined)` produced `NaN`,
  which slipped past the optional inner schema and reached the integer column.
  Fixed in `src/domain/validation/acquisition.ts` with regression tests. This was
  a Milestone 3 defect that the DB tests missed because they always passed a
  value.
- `timestamp without time zone` columns are parsed by node-postgres as LOCAL
  time, while `now()` (timestamptz) is not, so `AccountState.trialStartedAt`
  appears shifted by the machine's UTC offset relative to `serverNow` on a
  non-UTC developer machine. SQL itself reports zero skew and production runs
  UTC, so there is no production impact; it is a pre-existing schema-wide
  modelling quirk, not introduced here. Assertions about trial timing are done
  in SQL for this reason. Worth a deliberate decision if timestamps are ever
  revisited.
- Browser validation again used local headless Chrome/CDP carrying real Better
  Auth session cookies minted through the server API (the same path
  `scripts/e2e-fixtures.ts` uses). No password was typed into any form, no seed
  route, query-string login or auth bypass was added.
- The pg SSL warning from previous phases remains unchanged.

## Milestone 5 Trial UX + Launch Hardening

Milestone 5 was a hardening pass, not a feature milestone. No new commercial
system was added: conversion is still a manual Platform Admin action.

### Timestamp semantics audit — the decision and the proof

**The defect.** `timestamp without time zone` values come back from Postgres as
a bare string with NO offset (`2026-09-24 13:26:38`). Drizzle overrides pg's
type parsers to return those raw strings, and the reading code does
`new Date(str)` — which interprets an offset-less string in the **process**
timezone. `now()` is `timestamptz` and DOES carry `+00`, so it parsed
correctly. `getAccountState()` therefore compared a correctly-parsed `now`
against a `trial_ends_at` shifted by the server's UTC offset: a trial expired
hours early or late purely because of where the process ran (-4h in New York,
+14h at UTC+14). Production happening to run UTC is luck, not a fix.

Writes were inconsistent too, in the SAME column:

| write path | stored | semantic |
|---|---|---|
| SQL `now()` (defaults, `ensureOrganizationAccount`, `activated_at`, `suspended_at`, `reviewed_at`, provisioning, audit) | `16:33:10` | UTC |
| Drizzle typed insert (`mapToDriverValue` = `toISOString()`) — all of Better Auth | `16:00:00` | UTC |
| JS `Date` bound into a raw `sql` template (pg serializes in the PROCESS timezone; Postgres then DISCARDS the offset) | `18:00:00` | process-LOCAL wall clock |

**Why `AT TIME ZONE 'UTC'` is proven, not assumed.** The only local-wall-clock
writer was `extendTrialAction`. A live DEV audit proved no row was ever written
by it: zero `TRIAL_EXTENDED` audit events, and the single trial row carried the
`now()` / `now() + interval '14 days'` signature — identical microseconds,
`trial_started_at = created_at`, window exactly 14 days. A separate scan
confirmed `max(col) <= UTC now()` for every past-event column, and `> now()`
only for the two legitimately-future columns (`trial_ends_at`,
`session.expires_at`). DEV data was therefore uniformly UTC and the
reinterpretation was unambiguous.

**Classification.**

- **A. ABSOLUTE INSTANT -> `timestamptz`.** 46 columns converted: all
  `created_at`/`updated_at`, the trial window, `activated_at`, `suspended_at`,
  `reviewed_at`, the provisioning timestamps, audit `created_at`, and every
  Better Auth timestamp including `session.expires_at`.
- **B. BUSINESS CALENDAR DATE -> stays `date`.** `invoices.issued_at`,
  `invoices.due_at`, `payments.date`. Giving a calendar day a timezone would
  make an invoice issued on the 10th render as the 9th for any viewer west of
  UTC.
- **C. TRUE LOCAL WALL CLOCK.** None exists in this schema.

### Migration 0018_timestamptz_instants

Generated with `drizzle-kit generate`, then hand-edited: drizzle-kit emits a
bare `SET DATA TYPE timestamptz`, which casts using whatever TimeZone the
migrating session happens to have — the exact implicit dependency being
removed. Every one of the 46 statements now carries an explicit
`USING "<col>" AT TIME ZONE 'UTC'`. Additive/typed only: no row deleted, no
column dropped.

**The Drizzle schema moved to `{ withTimezone: true }` in the same commit, and
this is mandatory rather than cosmetic:** `PgTimestamp.mapFromDriverValue`
appends `"+0000"` when `withTimezone` is false, so a `timestamptz` column read
through a `withTimezone: false` column yields `"…+00+0000"` => **Invalid Date**.
Never convert one without the other.

Applied to Neon **DEVELOPMENT** only (`npm run db:migrate`), re-ran
idempotently, `drizzle-kit check` green. Production does not exist yet.

### Timestamp validation

`src/db/timestamp-semantics.dbtest.ts` (10 tests): the schema classification
(including "no `timestamp without time zone` column exists anywhere", which
catches a future migration or a Drizzle column declared without
`withTimezone`), the driver round-trip, the trial-window instants cross-checked
against SQL epochs, and — the decisive one — identical results under **UTC,
Europe/Zurich, America/New_York and Pacific/Kiritimati**. Each zone runs in a
CHILD PROCESS because Node reads `TZ` once at startup and V8 caches the zone;
reassigning `process.env.TZ` mid-test does not reliably change date parsing. A
same-timezone test cannot see this class of bug at all. Business `date` values
are asserted byte-identical across zones. The system clock is never modified.

Live cross-zone check before committing: the same stored instant read as
`2026-09-10T13:26:38.470Z` in all four zones, with SQL and JS agreeing to the
microsecond. Before the migration, the +14 zone was off by 14 hours.

`extendTrialAction` now binds ISO-8601 UTC strings rather than `Date` objects,
so the written instant cannot depend on where the server runs.

`shortDate()` was also fixed: it pushed a business `date` string through
`new Date()` and then read LOCAL calendar fields, landing on the previous day
for any viewer west of UTC. Date-only strings are now parsed textually. Added
`isoDay()` for lifecycle instants so operator and customer see the same day.

### 5A Trial indicator

Sidebar shows `Kornizo Standard` + `Trial · 11 ditë`, from
`trialDaysRemaining`, which `getAccountState()` derives from database `now()`
vs `trial_ends_at`. The client never computes it. Near expiry (<= 3 days) the
same truthful line turns amber and semibold; it never becomes a sales banner
and no functionality is reduced before the trial actually ends.

Albanian grammar now lives in `src/lib/trial-copy.ts`, because it is not a
template-literal problem:

- the counting form does not inflect — `1 ditë` and `11 ditë` are both correct;
- after `pas` the noun DOES inflect, so plural `pas 11 ditësh` must become
  singular `pas 1 dite`. **The old banner said `pas 1 ditësh`, which is wrong.**
- `trialDaysRemaining` is a `ceil()`, so 0 means "hours left, not days".
  `pas 0 ditësh` is ungrammatical and untrue, so that case says
  `përfundon brenda ditës`.

The near-expiry notice also now points at the configured support address
instead of opening an in-app Help Center overlay, which cannot continue a
trial.

### 5B /trial-expired

Two defects: it was entirely in **English** inside an otherwise Albanian tenant
app, and it used `bg-white`, which is not part of the dark-mode slate remapping
— so the card stayed white-on-dark. Rewritten in Albanian on remapped slate
tokens (verified live: card `rgb(23,23,23)` on `rgb(15,15,15)`).

Content rules, all verifiable in the code: data is KEPT, not deleted (expiry
blocks access only), so the page says so and says nothing about deletion,
retention windows or grace periods, because no such policy exists; no payment,
checkout or self-service upgrade is offered because none exists; the only
actions are the two that work — **Kontakto Kornizo** (company name pre-filled
in the subject) and **Dilni**. Company and account identity are shown, which is
safe because the viewer is an authenticated member of that organization.

### 5C Active conversion

`activateCustomerAction` was already correct; the UX was not. An activated
customer's platform detail page still showed live-looking "Fillimi i trial" /
"Fundi i trial" rows. Once activated the trial window is HISTORY: it no longer
governs access. The panel now shows plan, "Klient aktiv prej", and the previous
trial explicitly labelled "Trial i mëparshëm", and drops the days-remaining row
entirely. Driven by the DERIVED effective access, so a customer activated after
their trial lapsed reads as active, not expired.

Verified live in both directions: an ACTIVE org with `trial_ends_at` three days
in the PAST shows `Klient aktiv` in the tenant sidebar, no near-expiry banner,
and on the platform detail page shows the historical label and NO lifecycle
buttons; a TRIAL org still shows the live trial rows, days remaining, and the
`Aktivizo klientin` / `+7 ditë` / `+14 ditë` controls.

### 5D Extend trial

Already platform-admin only, server-authoritative, audited, no cron. Confirmed
that `LifecycleControl` correctly hides Extend Trial for an active customer and
that `extendTrialAction` refuses with `RULE_VIOLATION`. Extension arithmetic is
now asserted in SQL (exactly 7 days) so it cannot be a local-time artefact.

### 5E Applicant post-approval UX

Milestone 3 copy conflated two very different meanings of "approved but not
provisioned":

- `in_progress` / `not_started` — genuinely being prepared; "we are preparing
  your access" is true;
- `failed` — provisioning broke. Saying we are preparing their access is FALSE
  and leaves the applicant waiting on something that will not happen without
  operator action.

`failed` now has its own state: it says the setup did not finish, tells them not
to re-apply (a second application would be blocked by the per-user uniqueness
rule anyway), and offers the support contact. **No internal error code,
organization id, provisioning slug or attempt count is exposed** — verified
live. Status badges were bare English enum values (PENDING/APPROVED/REJECTED) on
an Albanian page and are now localized. The already-has-access branch was a bare
heading and now has explanatory copy.

### 5F Platform acquisition UX

The one operator question the platform could not answer was **"did provisioning
fail?"** — a failed provisioning keeps decision status `approved`, so it is
invisible to every status count and every status filter. Added a
`failedProvisioning` metric, a "Kërkon veprim" panel that appears only when the
count is non-zero and links to the filtered list, and a provisioning filter on
the applications list that is independent of the decision filter. No Platform
Admin redesign.

### 5G Support / contact

**Audited before writing any new contact UI.** There IS a real address already
in use: `info@arios.systems`, hard-coded in five places (`/suspended`,
`/account-not-ready`, the tenant account panel, and both locales of the
application-status page). The public site had no contact at all.

`src/lib/support-contact.ts` is now the single source. Nothing was invented:
that same address is the DEFAULT, so behaviour is unchanged when nothing is
configured, and `KORNIZO_SUPPORT_EMAIL` overrides it with no code change. The
value is read at call time, not module load. Client components receive it
through `SupportContactProvider`, fed by the server layout, rather than a
`NEXT_PUBLIC_` variable frozen at build time.

**REMAINING LAUNCH DECISION:** whether `info@arios.systems` is the final
customer-facing support address, or Kornizo gets its own support mailbox on the
production domain. This repository cannot decide it. Setting the environment
variable is the whole switch.

Caveat verified against the build output: the public homepage and the four legal
routes are statically prerendered, so for those pages the address is baked into
the prerendered HTML at build time. Acceptable — changing a deployment
environment variable requires a redeploy anyway — but it cannot be changed on a
live deployment without rebuilding.

Deliberately NOT added: phone number, postal address, company registration
number, response-time promise. None is configured anywhere in this project.

### 5H Privacy / Terms

`/privacy`, `/terms`, `/en/privacy`, `/en/terms`, sharing one renderer and one
content module (`src/lib/legal-content.ts`).

> **⚠ THESE ARE DRAFTS AND REQUIRE HUMAN/LEGAL REVIEW BEFORE PRODUCTION
> LAUNCH.** They are engineering drafts describing what the software actually
> does. They are not legal advice and have not been reviewed by a lawyer. A
> qualified reviewer must check them against the law of the jurisdiction Kornizo
> operates and sells in (Kosovo/Albania, plus EU GDPR where applicable). This is
> flagged in the source header, on the pages themselves, and here.

Each page carries a visible draft notice, and metadata sets `robots: index:
false` so a pre-review draft is not indexed as Kornizo's authoritative legal
position. **Flip that to `index: true` as part of legal sign-off.**

What the drafts deliberately do NOT contain, because each would be a lie a
customer or regulator could rely on: no GDPR / ISO 27001 / SOC 2 / PCI DSS /
HIPAA claim, no penetration-test claim, no invented legal entity, registration
number, VAT number, postal address or phone, no invented retention period or
deletion SLA, no uptime/availability/response-time promise, no price, payment
term or refund policy. Where a decision genuinely has not been made (account
deletion on request, retention after closure, governing law, the operating legal
entity), the text says so plainly.

What they DO state is checkable against the code: RLS-backed separation between
companies; the platform area shows account data and usage counts but not
business content; there is no impersonation feature; the audit trail is
append-only; expiry and suspension keep data; data is not sold and not used to
train AI models; the 14-day trial starts when the account becomes ready rather
than at submission; an account alone is not access.

41 tests enforce this. They scan CLAIM text with explicit denials excluded and
then separately assert the denials are present — otherwise the honest "we claim
no certification" sentence would be the thing failing the honesty test.

### 5I Public content audit

Result: **the existing Albanian and English copy was already truthful.** No fake
price, no fake testimonial, no fake customer count, no fake certification, no
"opening soon" placeholder; Request Trial and Request Demo are real; trial
requires approval; 14 days is accurate; Standard is the single plan; the
future-plan teaser stays restrained; the language switch is correct.

Rather than change copy that was correct, that outcome is now locked by tests.
Two apparent hits were false positives — a "Dëshmi produkti" (product proof)
capability heading, and two sentences that DENY inventing testimonials — so the
guard excludes denials and asserts them separately.

The only public change was additive: the footer now carries privacy/terms links
and a contact address, which it previously lacked entirely.

### 5J Signup / onboarding / no-org routing audit

Re-run after Milestone 4. **ACCOUNT ALONE != TENANT ACCESS holds.**

- `/sign-up` redirects to `/request-trial`.
- `/onboarding` creates nothing; it routes to application status or the trial
  request flow.
- Better Auth has `allowUserToCreateOrganization: false`.
- Both `setActiveOrganization` paths re-verify membership server-side:
  `switchOrganization` checks `listOrganizations`, and
  `activateProvisionedOrganizationAction` takes NO input, derives the user from
  the session, requires their own approved+provisioned application, and
  re-reads the `member` row.
- `src/server/provisioning.ts` (which uses Better Auth's server-only `userId`
  path and so bypasses `allowUserToCreateOrganization: false`) is imported ONLY
  by the platform provisioning flow, `src/db/testing/fixtures.ts` and
  `scripts/e2e-fixtures.ts`. It has no `"use server"` directive — the only match
  for that string is a comment asserting the invariant.
- Covered by tests: signup alone creates no organization/membership/account/
  pricing/active-org; a signed-in ordinary user cannot call Better Auth
  organization creation; an account-only applicant cannot resolve tenant
  context; a tenant user cannot create a second application; and the journey
  test opens with `NO_ORGANIZATION`.

### 5K DEV E2E fixture production safety

The runtime guard (`scripts/e2e-guard.ts`) requires the explicit allow flag,
refuses `VERCEL_ENV=production`, matches a DB fingerprint, permits only
`.neon.tech` hosts, requires owner/runtime URLs to name the same database, and
requires distinct synthetic `.test` identities containing `e2e`.

That only protects a fixture script someone runs. The real production risk is
the fixture machinery becoming REACHABLE from the deployed app, which is a
structural property — so 7 new tests assert it instead of trusting review:

- no application module imports fixture/seed/E2E code (import specifiers only,
  so a mention in a comment is not a link);
- no application module reads a `KORNIZO_E2E_*` variable;
- Better Auth's catch-all is the ONLY API route — no seed endpoint;
- no query-parameter login / impersonation shortcut exists;
- no `"use server"` module imports the trusted provisioning primitive;
- `.env.local` and `.env.e2e.local` stay gitignored, and the tracked
  `.env.example` holds NAMES ONLY (asserted line by line).

Scanning the actual production output (`.next/server` + `.next/static`) found
ZERO occurrences of the fixture helpers, `KORNIZO_E2E_*`, or the synthetic
`.test` identities. Neither the real `BETTER_AUTH_SECRET` value nor any database
URL appears in a client bundle (the one textual `BETTER_AUTH_SECRET` match in a
client chunk is an identifier name inside Better Auth's own code, not a value).

### 5L Error / empty / recovery states

Three real gaps, now fixed. No raw SQL, stack trace, Next.js digest, internal
id or Better Auth internal reaches any of them.

1. **Silent submit failure.** The trial form, the demo form, "Start using
   Kornizo", and the platform approve/retry/demo-status controls all handled
   `!res.ok` but not a REJECTED action promise (offline, action transport
   failure, server restarting mid-submit). The rejection landed unhandled inside
   `startTransition` and the user saw NOTHING happen — on the very forms that
   start and complete the acquisition funnel. All six are now wrapped, and the
   thrown value is never surfaced.

   The two platform controls get deliberately different wording: a lost response
   does NOT mean the mutation failed — approval may well have committed before
   the response was lost — so they say the response was not received and to
   refresh for the true state. Claiming a failed approval that actually
   succeeded would make an operator approve twice.

2. **Public dead end in the root boundaries.** `error.tsx` and `not-found.tsx`
   are ROOT boundaries, so they also catch public routes. Both offered only
   "back to Dashboard", which the proxy redirects to `/sign-in` for a logged-out
   visitor. The homepage is now the primary action.

3. **Low-contrast primary buttons.** Both used `bg-slate-300` with white text —
   fine under the dark remapping, but white-on-light-grey in LIGHT mode. Now the
   `slate-900`/`slate-50` pair, which inverts correctly in both themes.

Verified live: `/account-not-ready` (with the account row deleted, both
`/dashboard` and `/clients` fail closed to it), `/suspended` with reason,
`/trial-expired`, and the applicant provisioning-failure state — none leaking
internals.

### 5M Mobile / theme / language pass

Local dev + Neon DEV, measured programmatically (horizontal overflow and
per-element clipping) rather than eyeballed, plus screenshots.

Public SQ+EN — `/`, `/en`, `/request-trial`, `/request-demo`, `/privacy`,
`/terms`, `/en/privacy`, `/en/terms` — at 1440x1000 and 390x844, in dark and
light: **zero horizontal overflow, zero clipped visible text.** The single
"clipped" hit was the `sr-only` mobile-nav label (1x1, `clip: inset(50%)`), an
intentional screen-reader element, confirmed rather than assumed.

Tenant states with a real session: `/dashboard` trial indicator (fresh and
near-expiry), `/trial-expired`, `/suspended`, `/account-not-ready`, and the
platform detail panels — desktop and mobile, dark and light.

Note: the app's theme is a `.dark` CLASS driven by `localStorage`, not
`prefers-color-scheme`, so light mode must be exercised by setting
`localStorage.theme = 'light'`. Emulating `prefers-color-scheme` alone proves
nothing here.

### 5N Full customer journey E2E

`src/server/launch-journey.dbtest.ts` (26 tests) runs the whole journey as ONE
continuous story on ONE organization carrying REAL business data, because that
ordering is where the interesting bugs live:

account alone -> `NO_ORGANIZATION`; pending application grants no membership;
approval provisions exactly one organization/member/account; applicant activates
their OWN session; owner on Kornizo Standard with a trial indicator cross-checked
against SQL; real client + linked project created; default pricing present;
platform extends by exactly 7 days (asserted in SQL); extend refused for an
active customer; expiry blocks a VALID business mutation server-side with
nothing written; **data intact**; activation restores access and ignores the
past `trial_ends_at`; **data intact**; suspension blocks; **data intact**;
reactivation restores ACTIVE (not a new trial); sign out/in stays coherent;
audit events in the right order with the right actor.

Expiry is simulated by moving `trial_ends_at` into the past through the owner
pool — the DEV equivalent of waiting 14 days. **The system clock is never
touched** and `now()` always comes from the database. No real customer data.

Browser E2E covered the same lifecycle interactively with real Better Auth
sessions minted through the server API (the path `scripts/e2e-fixtures.ts` uses;
no password was typed into any form, no seed route, no query-string login, no
auth bypass), plus representative English post-approval routing at
`/en/application-status`. All fixtures were torn down; a DEV query confirmed
zero leftover users/organizations/applications/platform-admin grants and the
original 15 organizations, all with account rows.

Two things the journey test got wrong at first, worth recording:

- the action spine VALIDATES before it authenticates, so an invalid payload
  returns `VALIDATION` and proves nothing about the access gate;
- the suspension REASON is deliberately recorded in the audit trail; only the
  INTERNAL REVIEW NOTE must never be. Reusing one string for both made the
  assertion look like a leak. They are now distinct strings.

### 5O Security / RLS regression

All green, with the pre-existing Milestone 1-4 coverage re-run after the
timestamptz migration (this mattered: Better Auth reads every one of those
columns):

applicant cannot access another application (`getCurrentTrialApplication` is
session-derived and takes no id; `getTrialApplication(id)` is only reachable
behind the platform gate); a tenant user (including a tenant OWNER) is not a
platform admin; a tenant cannot provision or retry provisioning; Org A cannot
see Org B across clients/projects/pricing/invoices/payments/notes; a new trial
tenant is isolated from an existing tenant and vice versa; platform authority is
separate from tenant roles; missing `organization_accounts` fails closed
(`account_not_ready`, proven live in the browser); expired trial is blocked
SERVER-SIDE, not only by a UI redirect; suspended trial and suspended active are
both blocked; and ACTIVE correctly ignores historical expired-trial timestamps.
`kornizo_app` remains NOBYPASSRLS; no tenant policy was changed.

### Milestone 5 files added

- `src/db/migrations/0018_timestamptz_instants.sql` (+ snapshot/journal).
- `src/lib/support-contact.ts`, `src/components/providers/support-contact.tsx`.
- `src/lib/trial-copy.ts`.
- `src/lib/legal-content.ts`, `src/components/public/legal-page.tsx`,
  `src/app/{privacy,terms}/page.tsx`, `src/app/en/{privacy,terms}/page.tsx`.
- Tests: `src/db/timestamp-semantics.dbtest.ts` (10),
  `src/server/launch-journey.dbtest.ts` (26), `src/lib/trial-copy.test.ts` (10),
  `src/lib/legal-content.test.ts` (41), `src/lib/support-contact.test.ts` (6),
  plus additions to `src/dev/e2e-fixtures.test.ts`, `src/proxy.test.ts` and
  `src/lib/public-marketing.test.ts`.

### Milestone 5 files changed

- `src/db/auth-schema.ts`, `src/db/schema/{business,platform}.ts` —
  `{ withTimezone: true }` on all 46 instant columns.
- `src/server/platform/actions/organization.ts` — UTC ISO binding in
  `extendTrialAction`.
- `src/lib/format.ts` — timezone-safe `shortDate`, new `isoDay`.
- `src/app/trial-expired/page.tsx` — rewritten.
- `src/app/{suspended,account-not-ready}/page.tsx`,
  `src/app/(app)/settings/page.tsx` — support config.
- `src/components/shell/{sidebar,floating,app-shell}.tsx`,
  `src/app/(app)/layout.tsx` — trial indicator + support threading.
- `src/components/public/application-status-page.tsx` — provisioning-failure
  state, localized badges.
- `src/app/platform/organizations/[id]/page.tsx` — truthful active-customer
  panel.
- `src/app/platform/page.tsx`, `src/app/platform/ui.tsx`,
  `src/app/platform/applications/page.tsx`, `src/server/acquisition.ts` —
  failed-provisioning visibility and filter.
- `src/components/public/{request-trial-form,request-demo-form,start-using-kornizo}.tsx`,
  `src/app/platform/applications/actions.tsx` — guarded submissions.
- `src/app/{error,not-found}.tsx` — public-safe recovery, contrast.
- `src/components/public/marketing-page.tsx`, `src/lib/public-marketing.ts`,
  `src/app/page.tsx`, `src/app/en/page.tsx` — footer legal + contact.
- `src/components/public/metadata.ts`, `src/proxy.ts` — legal routes.
- `.env.example` — `KORNIZO_SUPPORT_EMAIL`.

### Milestone 5 verification

- `npm test` green: **149** unit tests (was 78).
- `npm run test:db` green: **273** DB/integration tests (was 237).
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check` green.
- `npx drizzle-kit check` green.
- `npm run db:migrate` applied 0018 to Neon **DEVELOPMENT**; live schema query
  confirmed 46 `timestamptz` columns, the 3 business `date` columns untouched,
  and instants preserved to the microsecond.
- Cross-timezone verification under UTC, Europe/Zurich, America/New_York and
  Pacific/Kiritimati.
- Browser E2E on local dev + Neon DEV, all fixtures torn down.

### Milestone 5 known issues

- One typecheck error slipped into the first timestamp-test commit because
  vitest uses esbuild and does not typecheck. Fixed in a later commit. Worth
  running `npm run typecheck` after adding a test file, not just the test.
- Reading a streaming Next.js page with `document.body.innerText` can return
  only the `loading.tsx` fallback while content is still hidden; `textContent`
  is the reliable read during a browser pass. Not a product defect — the server
  returned 200 in under a second.
- The pg SSL warning from previous phases remains unchanged.
- Human-only password-entry flows (login form, password change, second-session
  revocation) were again NOT performed by the agent; entering a password into a
  form is prohibited. They remain the human TODO recorded in
  `PLATFORM_ADMIN_V15_HANDOFF.md`.

### Milestone 6 starting state

- Everything above is on `clone/proferto`, pushed to `melos/clone/proferto`.
- Neon **DEVELOPMENT** is at migration 0018. **Production has never been
  migrated and does not exist.** Milestone 6 starts from an empty production
  environment, so 0000-0018 apply in order — there is no timestamp
  reinterpretation to perform on production data.
- Note for Milestone 6: migrations 0013/0014 carry hand-appended grants and the
  append-only audit grant. Do NOT `drizzle-kit generate` over them.

### Remaining decisions / blockers before production deployment

1. **Support address** — is `info@arios.systems` the final customer-facing
   contact, or does Kornizo get its own mailbox on the production domain? Set
   `KORNIZO_SUPPORT_EMAIL`. (No code change needed.)
2. **Legal review of `/privacy` and `/terms`** — required before the public site
   goes live, then flip `robots: index` to `true` in
   `src/components/public/metadata.ts`.
3. **Operating legal entity** — name, registered address and business
   registration number are placeholders-by-omission in the legal drafts and must
   be filled in by a human.
4. **Data retention / account deletion policy** — genuinely undecided. The
   drafts say so rather than inventing one. Needs a decision, and then either a
   documented manual process or a deliberate offboarding workflow (which is
   explicitly NOT the casual hard-delete that the `ON DELETE RESTRICT` link
   prevents).
5. **Production domain** — no canonical URL is hardcoded anywhere; metadata uses
   relative alternates. `BETTER_AUTH_URL` must be the real public origin.
6. **Production secrets** — a fresh `BETTER_AUTH_SECRET`, production
   `DATABASE_URL` (restricted role) and `DATABASE_MIGRATION_URL` (owner). The
   restricted role must be created with `scripts/setup-app-role.mjs` and must
   stay NOBYPASSRLS.
7. **Platform admin bootstrap** — the first production platform admin is granted
   out of band via `scripts/seed-platform-admin.mjs` with owner credentials.
   There is deliberately no in-app grant path.
8. **Production server timezone** — no longer a correctness requirement after
   0018, but setting it to UTC remains good hygiene.
9. **Human-only auth flows** — the password-gated checks in
   `PLATFORM_ADMIN_V15_HANDOFF.md` should be run by a person against production
   before launch.


## Milestone 3 Replaced/Extended

- Replaced `/request-trial` and `/en/request-trial` with the real localized
  public trial request/application flow.
- Replaced `/request-demo` and `/en/request-demo` with the real localized public
  demo request flow if demo requests should be collected.
- Added only the explicitly planned application persistence, review status,
  Platform Applications page, approval/rejection audit and
  approval/status lifecycle. Organization/trial provisioning remains Milestone
  4.
- Preserved Albanian as the default public locale, English as the `/en`
  secondary locale, the equivalent-route language switcher, localized metadata,
  public homepage positioning, one-plan launch model and truthful
  no-fake-pricing stance unless the product/commercial decision changes through
  a later milestone.

## Schema And Migration

- Added migration `0015_standard_lifecycle`.
- `organization_accounts.plan` now defaults to and CHECKs only `STANDARD`.
- Existing account rows are migrated to active Standard so development orgs are
  not accidentally locked out.
- New account rows default to a full 14-day Standard trial:
  `commercial_access='trial'`, `trial_started_at=now()`,
  `trial_ends_at=now() + interval '14 days'`.
- `commercial_access` stores only `trial` or `active`.
- `trial_expired` is derived from server/database time and `trial_ends_at`; it
  is not stored and needs no cron.
- `activated_at` records manual customer activation.
- Suspension remains `status='active'|'suspended'` plus
  `suspended_at/suspended_reason`.
- Audit CHECK now includes `CUSTOMER_ACTIVATED` and `TRIAL_EXTENDED`.
- Added migration `0016_nervous_quicksilver`.
- `trial_applications` stores user-owned pending/approved/rejected trial
  applications with normalized-email uniqueness and reviewer metadata.
- `demo_requests` stores accountless new/contacted/closed demo requests with
  normalized-email uniqueness.
- Audit CHECK now also includes `TRIAL_APPLICATION_APPROVED`,
  `TRIAL_APPLICATION_REJECTED`, and `DEMO_REQUEST_STATUS_CHANGED`.

## Runtime Design

- `src/server/platform/accounts.ts` is the low-level control-plane resolver.
- `getAccountState()` reads database `now()` and derives:
  `effectiveCommercialAccess` and `trialDaysRemaining`.
- Missing `organization_accounts` rows fail closed as `account_not_ready` and
  route tenant users to `/account-not-ready`.
- `ensureOrganizationAccount()` creates a 14-day full Standard trial for new
  organizations.
- `src/auth/session.ts` remains the tenant enforcement chokepoint:
  suspended accounts redirect/fail first; expired trials redirect to
  `/trial-expired` and business server actions return `FORBIDDEN`.
- Tenant RLS tables and policies were not changed.

## Platform Admin

- Organization detail shows product plan, commercial access, trial dates,
  days remaining, activation timestamp, and operational suspension separately.
- Platform actions added:
  `activateCustomerAction` and `extendTrialAction`.
- Extend Trial supports `+7` and `+14` days. Expired trials extend from server
  now; valid trials extend from the current end date.
- Activate Customer converts trial/expired trial to active commercial access.
- Lifecycle mutations are platform-admin only, validated, transactional, and
  audited.
- Platform Applications inbox lists trial applications and demo requests.
  Pending trial applications can be approved or rejected; demo requests can move
  through `new`, `contacted`, and `closed`.
- Trial application approval/rejection is intentionally non-provisioning in
  Milestone 3.
- Platform Dashboard now includes active trials, trials expiring within 3 days,
  expired trials, active customers, active operational accounts, and suspended
  organizations, plus acquisition counts for pending trial applications and new
  demo requests.
- Activity page filters include lifecycle audit actions.

## Tenant UX

> Historical: this records the Milestone 1 state. The current trial indicator,
> `/trial-expired` and support-contact behaviour are described under
> "Milestone 5 Trial UX + Launch Hardening" above.

- Tenant sidebar shows `Kornizo Standard` and either Trial days remaining or
  active customer status.
- A small near-expiry banner appears only when a valid trial has 3 or fewer days
  remaining.
- `/trial-expired` tells the customer the trial ended, data is safe, and Kornizo
  must be contacted to continue.
- `/account-not-ready` handles the fail-closed case where membership exists but
  required account metadata is missing.
- Subscription settings no longer show simulated multi-plan pricing.
- Offer design settings no longer show locked fake paid designs.
- Unfinished modules now say they are coming later instead of advertising paid
  upgrades.

## Verification

- `npm test` green: 62 unit tests.
- `npm run test:db` green: 211 DB/integration tests.
- `npm run lint` green.
- `npm run typecheck` green.
- `npm run build` green.
- `npm run check` green.
- `npm run db:migrate` applied migration 0015 to Neon DEVELOPMENT and reran
  idempotently.
- `npm run db:migrate` also applied migration 0016 to Neon DEVELOPMENT.
- `npx drizzle-kit check` green.
- `node --env-file=.env.local ...` DEV schema query confirmed zero
  organizations missing `organization_accounts` rows.
- Live DEV schema query confirmed Standard/default/check constraints and new
  audit actions.
- Milestone 3 HTTP smoke confirmed `/request-demo`, `/request-trial`, and
  `/en/request-trial` render while logged out; `/application-status` and
  `/en/application-status` redirect to `/sign-in` while logged out; `/sign-up`
  redirects to `/request-trial`.
- Local headless Chrome screenshots covered the request-trial desktop page and
  request-demo mobile page after the responsive header/form fixes.
- Browser smoke through local dev + headless Chrome passed:
  Platform detail, tenant Trial dashboard, expired Trial redirect/page, Extend
  Trial, Activate Customer, Suspend, Reactivate, and Activity audit entries.

## Known Issues

- Browser validation used a temporary programmatic Better Auth session and a
  temporary DEV organization; it cleaned up its test user/org/audit rows.
- The pg SSL warning from previous phases remains unchanged.
- Human-only password entry flows were not repeated in this milestone.

## Next Milestone

Milestone 6: production deployment.

Do not start Stripe, billing, onboarding tokens, fake higher plans, or a cheaper
Starter plan unless explicitly requested in the next milestone prompt.

## Do Not Redo

- Do not reintroduce `SOLO`, `BIZNES`, or `FABRIKA` as launch plans.
- Do not store `trialDaysLeft`.
- Do not add a cron dependency for trial expiry.
- Do not weaken tenant RLS or make `kornizo_app` BYPASSRLS.
- Do not put SaaS lifecycle state in the tenant `clients` table.
- Do not add attach-to-existing-organization, an organization chooser during
  approval, merge, or owner transfer.
- Do not compute trial start/end anywhere except `ensureOrganizationAccount()`.
- Do not let a platform admin set another user's active organization.
- Do not expose `src/server/provisioning.ts` to a public route or server action.
- Do not rewrite `provisioning_slug` once set — it is the exactly-once key.
- Do not reintroduce `timestamp without time zone` for an absolute instant, and
  never convert a column to `timestamptz` without setting `{ withTimezone: true }`
  on the matching Drizzle column in the same change.
- Do not convert `invoices.issued_at`, `invoices.due_at` or `payments.date` to a
  timestamp — they are business calendar dates.
- Do not hard-code a support address; use `src/lib/support-contact.ts`.
- Do not mark `/privacy` or `/terms` indexable, or remove their draft notice,
  before a human legal review.
- Do not add a phone number, postal address, company registration number, SLA,
  certification claim or retention period to the legal pages without a human
  decision behind it.
