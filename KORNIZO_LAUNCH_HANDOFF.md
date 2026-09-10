# Kornizo Launch Handoff

Status: **Milestone 1 complete. Milestone 2 complete, including bilingual public-site follow-up and final public visual polish. Milestone 3 complete. Milestone 4 is next.**

## Starting State

- Branch: `clone/proferto`
- Milestone 2 starting HEAD: `ac7c65a`
- Milestone 2 bilingual follow-up starting HEAD: `ca7aa70`
- Milestone 2B public visual polish starting HEAD: `159d288c9bc1b66d45a4517f8b26302da8b8a8dc`
- Tracking remote: `melos/clone/proferto`
- Repository: `/Users/solution25/Website/WebsiteWindowOffers`
- Milestone 2 final HEAD: see final report / `git rev-parse HEAD` after this
  handoff update is committed and pushed.
- Milestone 3 final HEAD: see final report / `git rev-parse HEAD` after this
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

## Milestone 4 Must Add

- Convert approved trial applications into tenant access through a trusted
  Platform Admin provisioning flow.
- Decide whether provisioning creates a new organization only, can attach to an
  existing organization, or supports both with explicit operator choice.
- Start the 14-day Standard trial only during Milestone 4 provisioning.
- Reuse the trusted provisioning primitive and keep public routes unable to
  call it.

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

Milestone 4: approved application -> organization/trial provisioning.

Do not start Stripe, billing, onboarding tokens, fake higher plans, or a cheaper
Starter plan unless explicitly requested in the next milestone prompt.

## Do Not Redo

- Do not reintroduce `SOLO`, `BIZNES`, or `FABRIKA` as launch plans.
- Do not store `trialDaysLeft`.
- Do not add a cron dependency for trial expiry.
- Do not weaken tenant RLS or make `kornizo_app` BYPASSRLS.
- Do not put SaaS lifecycle state in the tenant `clients` table.
