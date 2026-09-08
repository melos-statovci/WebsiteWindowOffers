# Kornizo Launch Handoff

Status: **Milestone 1 complete. Milestone 2 complete. Milestone 3 is next.**

## Starting State

- Branch: `clone/proferto`
- Milestone 2 starting HEAD: `ac7c65a`
- Tracking remote: `melos/clone/proferto`
- Repository: `/Users/solution25/Website/WebsiteWindowOffers`
- Milestone 2 final HEAD: see final report / `git rev-parse HEAD` after this
  handoff update is committed and pushed.

## Completed Milestones

Milestone 1 established Kornizo Standard and the customer access lifecycle.
Milestone 2 added the public Kornizo homepage and truthful temporary public CTA
pages. Do not redo Milestone 1 or Milestone 2 in the next session.

## Milestone 2 Public Homepage

- `/` is now a public static App Router page instead of redirecting to
  `/dashboard`.
- The homepage is a Server Component with no new client component dependency.
  Mobile navigation and FAQ disclosure use native `details`/`summary`.
- Page metadata now describes Kornizo as a window/door configuration, offer,
  invoice and payment product. No production canonical URL was hardcoded because
  no final production domain is configured.
- Navigation: Product, How it works, Features, Standard, FAQ, Sign in, Request
  free trial.
- Hero positioning: "From window configuration to payment - all in one place."
  The supporting copy explicitly names window and door companies.
- Product visual strategy: no screenshots were committed. The hero uses a
  safe, composed product-window preview based on real tenant surfaces:
  Dashboard, Projects, Clients, Invoices, Pricing, configurator, offer status,
  invoice and payment visibility. It contains no DEV customer data, emails,
  credentials or real screenshots.
- Workflow section presents the real path: customer -> configure windows/doors
  -> calculate price -> create/track offer -> invoice -> payment.
- Features are grouped by business value: Configure and calculate, Sell and
  organize, Invoice and get paid, Work as a company.
- Standard section presents exactly one launch plan: `Kornizo Standard`.
  It states a 14-day full trial and does not invent a public price.
- Future-plan teaser is limited to a careful note that Kornizo is growing and
  additional plans/tools may be introduced over time. No names, prices, dates or
  specific future features are promised.
- FAQ covers what Kornizo is, who it is for, company pricing, team access,
  trial contents/end state, browser access, invoices/payments and future plans.
- Footer includes Kornizo, Product, Sign in, Trial and Demo links. Privacy/Terms
  placeholders were not added because legal pages are not part of this milestone.

## Milestone 2 CTA Behavior

- `/request-trial` is a public static placeholder page. It truthfully says trial
  requests are opening soon, links back home and to sign-in, and states that no
  form is active and no lead data is collected or stored.
- `/request-demo` is a public static placeholder page with the same
  non-persisting behavior for demos.
- No application tables, lead tables, public application API, organization
  provisioning, Better Auth user creation, approval workflow or Platform
  Applications page was started.

## Milestone 2 Public/Auth Routing

- `src/proxy.ts` now allows logged-out access to `/`, `/request-trial`,
  `/request-demo`, `/sign-in` and `/sign-up`.
- Protected tenant and platform routes remain protected by the proxy for
  logged-out GET navigation, and still rely on their server-authoritative
  layout gates (`requireAuthContext`, `requirePlatformAdmin`) for real
  enforcement.
- Sign in still points to `/sign-in`, which keeps its existing server-session
  redirect to `/dashboard` for genuinely signed-in users.

## Milestone 2 Theme And Responsive Notes

- The public pages use the existing class-based theme model from
  `src/app/layout.tsx` and avoid changing tenant theme plumbing.
- Dark-mode public CTA contrast was verified against the app's slate-token
  remapping and uses neutral tokens with explicit dark text colors where needed.
- Desktop and mobile visual validation used local headless Chrome screenshots.
  The final screenshots showed no horizontal overflow or clipped text in the
  measured viewport.

## Milestone 2 Files Added/Changed

- `src/app/page.tsx` - public homepage.
- `src/app/request-trial/page.tsx` - temporary non-persisting trial page.
- `src/app/request-demo/page.tsx` - temporary non-persisting demo page.
- `src/components/public/temporary-request-page.tsx` - shared temporary CTA
  page component.
- `src/lib/public-marketing.ts` - typed marketing content/constants.
- `src/lib/public-marketing.test.ts` - launch constraint tests for Standard,
  no fake prices/tiers and temporary CTA wording.
- `src/proxy.test.ts` - public/protected route proxy tests.
- `src/proxy.ts` - public-route allowlist.
- `KORNIZO_LAUNCH_ROADMAP.md` and `KORNIZO_LAUNCH_HANDOFF.md` - milestone
  state updates.

## Milestone 2 Verification

- Baseline before edits:
  - `npm test` green: 54 unit tests.
  - `npm run check` green.
- After edits:
  - `npm test` green: 60 unit tests.
  - `npm run lint` green.
  - `npm run typecheck` green.
  - `npm run build` green.
  - Local HTTP checks: `/`, `/request-trial`, `/request-demo`, `/sign-in` all
    returned 200 while logged out; `/dashboard` and `/platform` redirected to
    `/sign-in`.
  - Local headless Chrome visual checks: desktop dark, mobile dark, desktop
    light, mobile light and mobile trial placeholder captured; DOM metrics
    reported no clipped text and no horizontal overflow.
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

## Milestone 3 Must Replace/Extend

- Replace `/request-trial` with the real public trial request/application flow.
- Replace `/request-demo` with the real public demo request flow if demo
  requests should be collected.
- Add only the explicitly planned application persistence, review status,
  Platform Applications page, approval/rejection audit and
  approval -> organization/trial provisioning in Milestones 3/4.
- Preserve the public homepage positioning, one-plan launch model and truthful
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

## Runtime Design

- `src/server/platform/accounts.ts` is the low-level control-plane resolver.
- `getAccountState()` reads database `now()` and derives:
  `effectiveCommercialAccess` and `trialDaysRemaining`.
- Missing `organization_accounts` rows degrade to active Standard to avoid a
  lockout caused only by missing control-plane metadata.
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
- Platform Dashboard now includes active trials, trials expiring within 3 days,
  expired trials, active customers, active operational accounts, and suspended
  organizations.
- Activity page filters include lifecycle audit actions.

## Tenant UX

- Tenant sidebar shows `Kornizo Standard` and either Trial days remaining or
  active customer status.
- A small near-expiry banner appears only when a valid trial has 3 or fewer days
  remaining.
- `/trial-expired` tells the customer the trial ended, data is safe, and Kornizo
  must be contacted to continue.
- Subscription settings no longer show simulated multi-plan pricing.
- Offer design settings no longer show locked fake paid designs.
- Unfinished modules now say they are coming later instead of advertising paid
  upgrades.

## Verification

- `npm test` green: 54 unit tests.
- `npm run test:db` green: 197 DB/integration tests.
- `npm run lint` green.
- `npm run typecheck` green.
- `npm run build` green.
- `npm run check` green.
- `npm run db:migrate` applied migration 0015 to Neon DEVELOPMENT and reran
  idempotently.
- `npx drizzle-kit check` green.
- Live DEV schema query confirmed Standard/default/check constraints and new
  audit actions.
- Browser smoke through local dev + headless Chrome passed:
  Platform detail, tenant Trial dashboard, expired Trial redirect/page, Extend
  Trial, Activate Customer, Suspend, Reactivate, and Activity audit entries.

## Known Issues

- Browser validation used a temporary programmatic Better Auth session and a
  temporary DEV organization; it cleaned up its test user/org/audit rows.
- The pg SSL warning from previous phases remains unchanged.
- Human-only password entry flows were not repeated in this milestone.

## Next Milestone

Milestone 2: public homepage.

Do not start applications, approval/provisioning, Stripe, billing, onboarding
tokens, fake higher plans, or a cheaper Starter plan unless explicitly requested
in the next milestone prompt.

## Do Not Redo

- Do not reintroduce `SOLO`, `BIZNES`, or `FABRIKA` as launch plans.
- Do not store `trialDaysLeft`.
- Do not add a cron dependency for trial expiry.
- Do not weaken tenant RLS or make `kornizo_app` BYPASSRLS.
- Do not put SaaS lifecycle state in the tenant `clients` table.
