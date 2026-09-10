# DEV E2E Fixtures

This fixture path is for local DEVELOPMENT browser tests only. It uses real
Better Auth signup/sign-in APIs, real cookies/sessions, the existing
`platform_admins` out-of-band grant, and the trusted server-side tenant
provisioning helper.

## Local Environment

Create `.env.e2e.local` locally. It is gitignored and must not be committed.

Required variables:

- `KORNIZO_E2E_ALLOW_DEV_FIXTURES=true`
- `KORNIZO_E2E_DATABASE_FINGERPRINT`
- `KORNIZO_E2E_PASSWORD`
- `KORNIZO_E2E_PLATFORM_EMAIL`
- `KORNIZO_E2E_TENANT_EMAIL`
- `KORNIZO_E2E_APPLICANT_EMAIL`

Optional variables:

- `KORNIZO_E2E_DEMO_EMAIL`
- `KORNIZO_E2E_TENANT_ORG_NAME`
- `KORNIZO_E2E_TENANT_ORG_SLUG`

All fixture emails must be distinct, include `e2e`, and use a `.test` domain.

## Commands

- `npm run e2e:seed`
  Ensures the platform admin identity, tenant identity, and synthetic tenant
  organization exist. It does not provision the trial applicant.

- `npm run e2e:reset-applicant`
  Removes only the configured dedicated applicant identity and application when
  it is safe. If the applicant application is already referenced by platform
  audit history, the reset refuses to delete it; use a unique synthetic
  applicant email for that browser run instead.

## Safety

The scripts fail closed unless the explicit allow flag is present and the owner
database URL matches the local database fingerprint. The guard does not rely on
`NODE_ENV`, because local production builds can still target DEV.

Do not add browser-accessible seed routes, impersonation, query-string login,
or any app-level auth bypass.
