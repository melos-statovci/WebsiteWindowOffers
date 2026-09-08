# Kornizo Launch Handoff

Status: **Milestone 1 complete. Milestone 2 is next.**

## Starting State

- Branch: `clone/proferto`
- Starting HEAD: `0e90d0e`
- Tracking remote: `melos/clone/proferto`
- Repository: `/Users/solution25/Website/WebsiteWindowOffers`
- Final HEAD: see final report / `git rev-parse HEAD` after the launch
  documentation commit is pushed.

## Completed Milestone

Milestone 1 established Kornizo Standard and the customer access lifecycle.
Do not redo Milestone 1 in the next session.

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
