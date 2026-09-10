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

4. **Approval -> organization/trial provisioning**
   - Platform approval creates or attaches an organization to the existing user.
   - Approved account receives a 14-day full Kornizo Standard trial.

5. **Trial UX + launch hardening**
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
