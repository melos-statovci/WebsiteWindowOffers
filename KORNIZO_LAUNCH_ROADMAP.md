# Kornizo Launch Roadmap

Durable launch plan for Kornizo / WebsiteWindowOffers. Repository history,
migrations, tests, and source code remain authoritative.

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

5. **Trial UX + launch hardening** — NEXT
   - Polish trial messaging, expiration states, support handoff, and regression
     coverage.

6. **Production deployment**
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
