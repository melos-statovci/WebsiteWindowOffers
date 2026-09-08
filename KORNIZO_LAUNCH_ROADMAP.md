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
   - No fake pricing tiers.

3. **Trial/demo applications** — NEXT
   - Public trial request/application flow.
   - No onboarding-token workflow unless a later technical review proves it is
     necessary.

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
- Trial is 14 days and includes the full Standard product.
- Trial expiry is derived from timestamps, not a mutable days-left field.
- No cron is required for expiry correctness.
- No Stripe, billing portal, payment method, subscription webhook, fake Starter
  plan, or fake higher plan is part of launch Milestone 1.
