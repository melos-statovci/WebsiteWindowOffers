# Release Audit Remediation Pass 1 — execution checkpoint

Status: **NO-GO for production; Pass 1 remains open at the remaining architecture/product decisions.** RC-06/07 are fixed. No Pass 2, Milestone 6, deployment or production data change was started.

Authoritative checkout: `/Users/solution25/Website/WebsiteWindowOffers`; branch `clone/proferto`; starting HEAD `19692f7033890d86738d92f387ceb2859fdcc208`. Application checkpoint commit: `36ad0a3bb79dd94bdc20fdb3147bc51f95a74834`. Final documentation commit/push identities are in the execution report; this document is committed with the checkpoint so it does not attempt to contain its own commit hash.

## Executed gates

| Gate | Result |
|---|---|
| `npm test` | PASS — 195 tests / 16 files |
| `npm run test:db` | PASS — 319 tests / 18 files |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run check` | PASS — lint, typecheck, production webpack build |
| `npx drizzle-kit check` | PASS |
| `npm run test:browser` | PASS — 14 real Chromium/HTTP tests (57.9 seconds) |
| `git diff --check` | PASS |

The provider logger was finalized during the full DB run; its new regression was then run separately against the real configured auth instance. The production check/build was rerun after that source change. No pricing formula/version, RLS policy, role grant or database schema was changed. No existing package version changed; only `@playwright/test`, `playwright`, and `playwright-core` were added for the requested permanent browser coverage.

## Adversarial and regression evidence

- RC-01: actual Next Server Action HTTP replies for new/duplicate/concurrent Contact and Demo submissions equal `{ok:true,data:{accepted:true}}`; stored IDs and private markers are absent. The database still deduplicates each concurrent pair to one record.
- RC-02: actual HTTP `/api/auth/organization/delete` refuses deletion; complete organization/member/invitation row snapshots are unchanged. Broader raw-provider lifecycle policy remains OPEN pending approval.
- RC-03: generated offer/invoice HTML is parsed in Chromium with script/closing-tag/event-handler/entity payloads. No payload executes or becomes active markup, title/body preserve inert text, and opener is null. A stored hostile client/reference/line is also retrieved through the real invoice UI and printed in a real popup. Fixed warranty and 50/50 commitments are absent.
- RC-04: private review-note/reviewer markers and property names are absent from duplicate applicant actions and both applicant-page serialized HTTP responses.
- RC-06: deleting only the synthetic intended owner's canonical Better Auth membership and retrying repairs exactly that owner on the same organization. Parallel repairs converge to one `(organization_id,user_id)` row; incompatible roles or unrelated owners fail explicitly without promotion or transfer.
- RC-07: renaming the synthetic organization's display slug through Better Auth, forcing a recoverable failure, and retrying uses the linked organization and creates no second organization. Unlinked retry adopts only by immutable `provisioning_application_id`; an unrelated organization holding the old slug is not adopted.
- RC-08: actual PostgreSQL wait barriers force activate-before-extend and extend-before-extend; activation stays active, two extensions add both increments, and audit predecessor dates match the committed transitions. Existing suspend/reactivate tests also pass. Browser Account-tab extension/activation and later refusal are covered.
- RC-09: PostgreSQL barriers prove stale commercial, item and option edits fail after acceptance; invoice snapshot reads wait for the same project lock and capture the committed item price. Serialized HTTP edit of an accepted offer is also refused. Existing accepted/reopen regressions pass.
- RC-10: owner/sales/operator/accounting × Draft/accepted creation matrix verifies server capabilities.
- RC-13: missing account returns ACCOUNT_NOT_READY, persists no fake repair and leaves tenant access unavailable.
- RC-15/19: endpoint/role/pooled variant guards, impossible/leap dates, fractional cents, catalog identifiers/compatibility, duplicate catalog IDs, extreme prices/parameters and nonfinite/overflow totals tested. Real actions return VALIDATION for invalid commercial input.
- RC-18: real authorized tenant action failures and the configured provider sink preserve static operation/safe code while dropping nested ORM, password, cookie, token, URL and customer markers.
- RC-20/23/24: browser tests use accessible names, inspect English language ancestry, verify form error/success live regions and payment labels/described errors. Real signup succeeds, an intercepted request is sent to real server validation with an invalid application field, correction without reload reaches PENDING with exactly one signup request. Platform-only/dual-role/tenant-only users sign in to their intended fixed destinations.
- The expanded 38-test provisioning suite, RLS/FORCE RLS and runtime-role tests, Auth, financial schema/actions/closeout, accepted-offer, timestamp, acquisition and launch-journey tests are green. Existing payment tests still do **not** close RC-12 retry idempotency.

## Migrations and handling of test data

Migration `0022_provisioning_identity.sql` adds nullable UUID `organization.provisioning_application_id` / `provisioning_owner_id`, a partial unique application-reference index, and unique `member(organization_id,user_id)`. Its reviewed backfill updates only approved applications already linked by `organization_id`; it never infers an unlinked organization by slug. Before migration, guarded Neon DEVELOPMENT had zero duplicate member pairs, zero linked approved applications requiring backfill, and zero unlinked legacy slug matches. Migration 0022 was applied only to guarded Neon DEVELOPMENT; live verification found both UUID columns/indexes, zero duplicate pairs, and zero linked identity mismatches. Production untouched.

All write probes use disposable `.test` identities and tracked synthetic DEV organization/application/client/invoice data. The browser setup verifies the approved DEV fingerprint and distinct restricted runtime role, and honors Better Auth Retry-After. Teardown deletes only tracked fixture records, including synthetic audit/contact records. Secrets, cookies and passwords remain in environment/process memory and are not committed. Browser traces/screenshots are disabled; generated local test artifacts are ignored by Git. Final read-only cleanup verification found zero synthetic browser users, organizations, contact requests and audit events. Runtime role checks confirm `rolbypassrls=false` and `rolsuper=false`. The local test server stopped when the browser suite finished.

The RC-06/07 run used the same tracked `.test` cleanup discipline. Its final guarded read found zero `prov-*` synthetic users, organizations, applications or audit events; no credential, session cookie or connection string was printed or committed.

## Remaining decision gates

See [PASS1_DECISIONS.md](PASS1_DECISIONS.md): RC-06/07's approved immutable provisioning identity and safe owner repair are implemented. RC-02 additional provider lifecycle hooks, RC-11 unsupported pricing editors, and RC-12 durable operation receipts remain separate open decisions.

See [PASSWORD_RECOVERY_CONTRACT.md](PASSWORD_RECOVERY_CONTRACT.md): RC-05 remains OPEN until real selected-domain/sender delivery and reset/session tests work.

RC-14/16/17/21/22 remain DEFERRED, alongside production domain/sender, legal operator/review and retention-policy decisions. Complete the specific Pass 1 approvals before advancing the release sequence.
