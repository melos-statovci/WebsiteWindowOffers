# Kornizo Launch Roadmap

Durable launch plan for Kornizo / WebsiteWindowOffers. Repository history,
migrations, tests, and source code remain authoritative.

**Current gate: Release Remediation Pass 1, pending explicit decisions. Production NO-GO; do not start Pass 2 or Milestone 6.**

## Milestones

1. **Standard + account lifecycle** — COMPLETE
   - One launch product plan: Kornizo Standard.
   - Commercial access lifecycle: Trial, Active, derived Trial Expired.
   - Operational suspension remains separate.
   - Platform Admin controls activation, trial extension, suspension, and audit.
   - Tenant access is server-authoritative; expired trials keep data but lose
     normal app access.

2. **Public homepage** — COMPLETE
   - Public product positioning and launch copy.
   - Albanian is the default public language at `/`.
   - English is the secondary public language at `/en`.
   - Public trial/demo placeholders are localized at `/request-trial`,
     `/request-demo`, `/en/request-trial`, and `/en/request-demo`.
   - Public content uses shared locale dictionaries and a compact language
     switcher instead of duplicated independent page implementations.
   - Final visual polish tightened the hero, product preview, workflow sequence,
     feature cards, Standard plan panel, and responsive header behavior.
   - No fake pricing tiers.

3. **Trial/demo applications** — COMPLETE
   - `/request-trial` and `/en/request-trial` are real localized trial
     application flows.
   - Trial requests require a Better Auth user account but do not create tenant
     access.
   - `/request-demo` and `/en/request-demo` collect accountless demo requests.
   - `/application-status` and `/en/application-status` show only the signed-in
     user's trial application state.
   - Platform Admin has an Applications inbox, trial approval/rejection, demo
     request lifecycle updates, and audit events.
   - Approval only changes the application status; it does not provision an
     organization, member, account, trial, pricing, profile, or tenant access.

4. **Approval -> organization/trial provisioning** — COMPLETE
   - Platform approval creates ONE NEW organization for the applicant. There is
     no attach-to-existing-organization flow; joining an existing company stays
     with the Better Auth invitation flow.
   - The applicant becomes the Better Auth `owner` of the new organization.
   - The approved account receives a 14-day full Kornizo Standard trial, which
     starts at successful provisioning.
   - `trial_applications` carries the canonical application -> organization
     link plus an explicit provisioning lifecycle
     (`not_started | in_progress | provisioned | failed`).
   - Provisioning is exactly-once, concurrency-safe and retryable: a stable
     application-derived organization slug is persisted before Better Auth is
     called, and `organization.slug` is UNIQUE, so a crash or a concurrent
     approval can never create a second organization.
   - Provisioning failure is visible and operator-retryable; it never silently
     reports success and never auto-retries on refresh.
   - The applicant activates their own organization in their OWN session; a
     platform admin never mutates another user's session.

5. **Trial UX + launch hardening** — COMPLETE
   - Timestamp semantics deliberately resolved: every absolute-instant column
     is `timestamptz` (migration 0018), business calendar dates stay `date`.
     The conversion was proven, not assumed. Instant behaviour is identical
     under UTC, Europe/Zurich, America/New_York and Pacific/Kiritimati.
   - Trial indicator is subtle, server-authoritative and grammatically correct
     in Albanian; near expiry it becomes more noticeable without reducing any
     functionality.
   - `/trial-expired` is Albanian, theme-correct, truthful about data being
     kept, and offers only actions that actually work.
   - Active conversion, trial extension and suspension/reactivation are
     coherent end to end; an activated customer is never described in trial
     language and never sees meaningless Extend Trial controls.
   - Applicant post-approval states are honest, including a distinct
     provisioning-failure state that no longer claims access is being prepared.
   - Platform operators can now see failed provisioning, which was previously
     invisible because such an application still reads as `approved`.
   - One configured support contact replaces five hard-coded copies; the public
     site has a contact and legal links for the first time.
   - `/privacy` and `/terms` exist in both locales as clearly-flagged drafts.
   - Launch-critical failure states are safe; no raw SQL, stack trace, digest,
     internal id or auth internal reaches any customer-facing surface.
   - The full customer journey passes as one continuous test, and business data
     provably survives expiry, activation, suspension and re-login.

5.5. **Pre-production Contact/Demo consolidation** — COMPLETE
   - Request Free Trial remains the PRIMARY public CTA; Request a Demo remains
     the SECONDARY one. Both were kept because they mean different things, and
     Demo was NOT replaced by Contact.
   - General Contact added at `/contact` and `/en/contact`, reachable from
     navigation and the footer — never as a third hero CTA.
   - `demo_requests` became one generic `contact_requests` table discriminated
     by `intent` ('demo' | 'general'), preserving existing DEV rows and the
     immutable audit history (migrations 0019-0021).
   - Platform Applications' second tab is Contact Requests, with an intent
     filter and a detail view that shows the visitor's message.
   - `info@arios.systems` removed as Kornizo's public support identity. No
     replacement address was invented; when `KORNIZO_SUPPORT_EMAIL` is unset,
     `/contact` is the support channel.
   - Kosovo remains the initial launch market as positioning only; nothing in
     the architecture is hard-locked to it.

6. **Production deployment** — BLOCKED by release remediation
   - Production environment, migrations, secrets, and deployment validation.

## Locked Launch Decisions

- Kornizo Standard is the only real launch plan.
- Albanian is the default public marketing locale; English remains available
  through stable `/en` routes.
- Trial is 14 days and includes the full Standard product.
- Trial expiry is derived from timestamps, not a mutable days-left field.
- No cron is required for expiry correctness.
- No Stripe, billing portal, payment method, subscription webhook, fake Starter
  plan, or fake higher plan is part of launch Milestone 1.
- Public self-service organization creation is disabled.
- A Better Auth user account alone is not tenant access.
- Missing `organization_accounts` metadata fails closed with
  `account_not_ready`.
- A Trial Application provisions exactly ONE new organization. Attaching an
  applicant to an existing organization, organization chooser, merge and owner
  transfer are explicitly out of scope.
- `ensureOrganizationAccount()` is the single writer of the trial window; no
  other code computes trial start/end dates.
- Absolute instants are `timestamptz`. Business calendar dates (invoice issue
  and due dates, payment date) stay `date`. Drizzle columns for instants must
  carry `{ withTimezone: true }`, or the read path produces an Invalid Date.
- Public legal pages are pre-review DRAFTS, marked `robots: index: false`
  until a human legal review signs them off.
- `KORNIZO_SUPPORT_EMAIL` is the single switch for the customer-facing contact.
  There is NO default address: unset means `/contact` is the channel. Never
  invent a Kornizo address, and never present the vendor's own mailbox as
  Kornizo support.
- Request Free Trial is the primary public CTA and Request a Demo the
  secondary one. Keep both; they mean different things. General Contact lives
  in navigation and the footer.
- One `contact_requests` table serves every inbound message, discriminated by
  `intent`. Add a new intent only when a real contact reason needs one.
- Never say "book a demo" while no scheduling system exists, and promise no
  response time or meeting duration.
- The initial commercial launch market is Kosovo. This is market positioning,
  not a tenancy restriction.
- No automatic deletion of any data. Account/data deletion remains a future
  deliberate workflow.


## Release Audit Remediation Pass 1

**Implementation checkpoint; production NO-GO. Pass 1 is not complete while the specific decisions below remain open. Do not start Pass 2, Milestone 6 or deployment.**

Authorized repository `/Users/solution25/Website/WebsiteWindowOffers`, branch `clone/proferto`, starting HEAD `19692f7033890d86738d92f387ceb2859fdcc208`. The accepted release audit remains authoritative; this is remediation, not a replacement audit. Normal checkpoint commits/push are recorded in the final execution report.

| Finding | Status | Implementation / evidence |
|---|---|---|
| RC-01 | FIXED | Contact/Demo create, duplicate and unique-race responses are the same minimal acknowledgement; real serialized HTTP probes preserve deduplication and expose no stored row. |
| RC-02 | OPEN | Hard deletion disabled with the provider option; HTTP regression proves organization, members and invitations unchanged. Broader raw-provider lifecycle hooks await explicit approval after automatic review rejected them under the auth stop rule. |
| RC-03 | FIXED | Every print text boundary escapes hostile stored values; opener disconnected. Browser parser probes and stored-invoice popup prove no script/event execution. Unapproved fixed warranties and 50/50 terms removed. |
| RC-04 | FIXED | Explicit applicant DTO excludes review fields; duplicate action, Request Trial and Application Status serialized HTTP responses tested with private markers. |
| RC-05 | OPEN | No selected production sender/domain or working delivery. Exact installed-provider integration and release proof documented in PASSWORD_RECOVERY_CONTRACT.md. |
| RC-06 | FIXED | Retry validates the authoritative immutable application/owner identity, then repairs only the missing intended Better Auth owner through the provider's server-only path. Unique membership plus parallel/adversarial DB tests prove one owner row; conflicts fail without promotion/transfer. |
| RC-07 | FIXED | Migration 0022 adds hidden immutable application/owner UUIDs and a unique application reference. Linked retry ignores display-slug changes; unlinked retry adopts only by immutable reference. The original rename/retry attack creates no second organization. |
| RC-08 | FIXED | Organization/account row locks serialize lifecycle reads and writes. Deterministic activate/extend and extend/extend barriers verify final state and audit predecessors. Existing suspension/reactivation regressions retained. |
| RC-09 | FIXED | Shared project row lock covers commercial edits, items, options, acceptance and invoice snapshot reads. Deterministic DB barriers and serialized accepted-edit rejection pass. |
| RC-10 | FIXED | Initial accepted creation requires project:accept. Owner/sales/operator/accounting × Draft/accepted DB matrix tests actual permission outcomes. |
| RC-11 | FIXED | Option A exposes only calculation-backed editors: systems/material, consumed Ram/Krah/T color prices, Armim Ram, selected glass, two llajsne rates, and the first roleta rate. Unsupported data remains stored but hidden and server-preserved. Sensitivity, direct-save, DB, and browser tests prove the contract; no formula/version/migration change. |
| RC-12 | FIXED | Migration 0023 adds tenant-scoped durable operation receipts. Server-normalized kind-specific fingerprints, transaction-local organization/key advisory locks and unique tenant/key identity make partial and advance retries converge without deduplicating legitimate equal payments. |
| RC-13 | FIXED | Missing account returns ACCOUNT_NOT_READY instead of false success; DB absence and actual tenant unusability proved. No implicit ACTIVE repair. |
| RC-14 | DEFERRED | Distributed public-write budget remains Pass 2 preparation work. |
| RC-15 | FIXED | Fixture guard accepts same-endpoint direct/pooled variants and rejects different endpoints, ports or unexpected runtime roles. Pure regression tests. |
| RC-16 | DEFERRED | Fresh-environment role/grant bootstrap remains Pass 2 preparation work. |
| RC-17 | DEFERRED | Unbounded hydration/scaling remains Pass 2 preparation work. |
| RC-18 | FIXED | Application and provider logs emit static operation + safe error category/code, without ORM params/messages/credentials. Synthetic-marker tests exercise the real authorized action boundary and provider sink. |
| RC-19 | FIXED | Real calendar/leap-year validation, cent-scale money, bounded catalogs/parameters, unique IDs, explicit selection compatibility and finite DB-representable aggregate totals; invalid actions return VALIDATION. Historical stored snapshots and formula v1 remain unchanged. |
| RC-20 | FIXED | Shared field labels, signin/payment associations and described errors, form live regions, platform control labels/status and English subtree language semantics. Browser accessible-name and English error checks. |
| RC-21 | DEFERRED | Production fail-closed DB/origin validation remains Pass 2 preparation work. |
| RC-22 | DEFERRED | Dependency upgrades remain separate. Playwright added only for requested browser regressions; no existing dependency version changed. |
| RC-23 | FIXED | Application fields prevalidated; successful signup/session retained for retry without reload or company-data loss. Browser injects real server rejection after successful signup, corrects field and verifies one account attempt/PENDING. |
| RC-24 | FIXED | Server resolves fixed signin destination from fresh Platform authority; platform-only and dual-role → Platform, tenant-only → Dashboard. DB + actual browser signin tests. |

### RC-11 truthful launch pricing controls

Option A is complete. Normal tenant editing is limited to Systems, the consumed Ram/Krah/T color cells, first `Armim Ram`, selectable glass catalog, the two llajsne rates, and first roleta rate. Unsupported mechanism, panel, expansion, production, door-model, metals and later-row data remains stored for compatibility but is hidden and server-preserved. No formula, calculation-version, migration, historical version, accepted-offer, invoice-snapshot or stored-project output changed. The exact launch matrix is in `docs/release/PASS1_DECISIONS.md` and the sensitivity/direct-save/browser evidence is in `docs/release/PASS1_RESULTS.md`.

### RC-12 payment-operation checkpoint

Partial and advance payments now carry one browser-generated UUID per modal interaction. The key remains stable through repeated submits and ambiguous network failures; a deliberately new interaction gets a new key. The server hashes only an ordered, validated, kind-specific tuple of business fields. Same tenant/key/hash safely replays, a semantic mismatch returns `CONFLICT`, and different keys keep equal payments independent.

Migration 0023 stores only operation kind/hash, bare payment ID, minimal invoice outcome fields and creation time. The receipt and payment share the existing `app.current_org` transaction; a transaction-local organization/key advisory lock serializes concurrency and unique `(organization_id,operation_key)` backs it durably. Receipts survive payment deletion, producing `PAYMENT_REMOVED` instead of resurrecting money. ENABLE/FORCE RLS, tenant SELECT/INSERT policies and SELECT/INSERT-only runtime grants were verified live on fingerprint-guarded Neon DEVELOPMENT. Production was untouched; no historical payment keys were invented. Existing full-settlement locking remains unchanged and green.

### Decision gates and recovery contract

[Decisions and pricing evidence](docs/release/PASS1_DECISIONS.md): RC-06/07 immutable provisioning identity, RC-11 truthful active pricing controls, and RC-12 durable payment-operation receipts are approved and implemented. RC-02 broader provider lifecycle hooks remain open and unapplied.

[Password recovery implementation contract](docs/release/PASSWORD_RECOVERY_CONTRACT.md) records the installed Better Auth API, sender/domain inputs, token/session behavior, localized UI contract and required delivery-to-login proof. RC-05 remains OPEN.

### Verification and data handling

- Unit suite: 195 passing tests. Full DB suite: 334 passing tests / 18 files, including 25 payment tests and 38 provisioning tests. Browser/HTTP suite remains 14 passing tests from the prior checkpoint. Detailed outcomes are in `docs/release/PASS1_RESULTS.md`.
- `npm test` passes 215 tests / 17 files; `npm run test:db` passes 335 / 18 files; `npm run test:browser` passes 15 real Chromium/HTTP tests including RC-11 desktop/mobile light/dark pricing validation. `npm run check` covers lint, typecheck and production build; `npx drizzle-kit check` verifies migrations through 0023 and the snapshot/journal. Migration 0023 was applied only to fingerprint-guarded Neon DEVELOPMENT after manual SQL review and verified live. Production untouched.
- Permanent database tests use explicit synthetic IDs/emails and teardown; deterministic races wait for actual PostgreSQL blocked transactions. Existing RLS/FORCE RLS, restricted runtime role, Platform separation, provisioning and financial tests are retained.
- `npm run test:browser` requires `.env.local` and the explicitly approved `.env.e2e.local` fingerprint/role guard, a local production build, and Chromium (`npx playwright install chromium`). It starts a local server, exercises real serialized actions and browser journeys, honors provider signup Retry-After, and removes only tracked synthetic records. No credentials, cookies, DB URLs, test passwords or trace artifacts are committed. Runtime role is still `kornizo_app`; owner connection is limited to approved DEV fixture setup/cleanup.
- No existing dependency version upgraded. The only added packages are the Playwright test runner and its browser tooling. Existing RC-22 dependency risks remain.

### STILL OPEN BEFORE PRODUCTION

RC-02 remaining lifecycle policy, RC-05 secure recovery delivery, RC-14, RC-16, RC-17, RC-21 and RC-22; production domain and sender, legal operator/legal review, and retention policy. No production release approval is implied by passing tests or checkpoint push.
