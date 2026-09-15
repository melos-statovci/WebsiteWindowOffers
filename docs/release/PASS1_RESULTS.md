# Release Audit Remediation Pass 1 — execution checkpoint

Status: **NO-GO for production; Pass 1 remains open at the remaining architecture/product decisions.** RC-06/07 and RC-12 are fixed. No Pass 2, Milestone 6, deployment or production data change was started.

Authoritative checkout: `/Users/solution25/Website/WebsiteWindowOffers`; branch `clone/proferto`; starting HEAD `19692f7033890d86738d92f387ceb2859fdcc208`. Application checkpoint commit: `36ad0a3bb79dd94bdc20fdb3147bc51f95a74834`. Final documentation commit/push identities are in the execution report; this document is committed with the checkpoint so it does not attempt to contain its own commit hash.

RC-12 remediation started from `9c33b73b56ff5008b5a4cd24cabe1365162f8335`, after verifying it matched `melos/clone/proferto` and the worktree was clean.

## Executed gates

| Gate | Result |
|---|---|
| `npm test` | PASS — 195 tests / 16 files |
| targeted `src/server/payments.dbtest.ts` | PASS — 25 tests, including all RC-12 concurrency/adversarial cases |
| `npm run test:db` | PASS — 334 tests / 18 files |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run check` | PASS — lint, typecheck, production webpack build |
| `npx drizzle-kit check` | PASS |
| `npm run test:browser` | PASS — 14 real Chromium/HTTP tests (57.9 seconds) |
| `git diff --check` | PASS |

The RC-12 implementation changed only payment-operation identity, its tenant table/policies/grants, the payment-entry UUID lifecycle and focused tests/docs. It did not change pricing, payment amount/credit rules, invoice balance calculation, authorization, or full-settlement semantics. No package version changed in this task.

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
- RC-12: validated partial and advance commands hash an explicit ordered tuple including operation kind. A transaction-local advisory lock on organization/key serializes retries; unique `(organization_id,operation_key)` is the durable backstop. Same key/same fingerprint replays one payment, changed amount/date/method or cross-command reuse returns `CONFLICT`, and different keys preserve equal legitimate payments. Receipts and payments commit/roll back together. After payment deletion the bare payment ID receipt survives and returns `PAYMENT_REMOVED`, never recreating money. Same UUIDs remain independent across tenants. The existing concurrent remaining-balance full settlement still creates one payment.
- RC-13: missing account returns ACCOUNT_NOT_READY, persists no fake repair and leaves tenant access unavailable.
- RC-15/19: endpoint/role/pooled variant guards, impossible/leap dates, fractional cents, catalog identifiers/compatibility, duplicate catalog IDs, extreme prices/parameters and nonfinite/overflow totals tested. Real actions return VALIDATION for invalid commercial input.
- RC-18: real authorized tenant action failures and the configured provider sink preserve static operation/safe code while dropping nested ORM, password, cookie, token, URL and customer markers.
- RC-20/23/24: browser tests use accessible names, inspect English language ancestry, verify form error/success live regions and payment labels/described errors. Real signup succeeds, an intercepted request is sent to real server validation with an invalid application field, correction without reload reaches PENDING with exactly one signup request. Platform-only/dual-role/tenant-only users sign in to their intended fixed destinations.
- The expanded 38-test provisioning suite, RLS/FORCE RLS and runtime-role tests, Auth, financial schema/actions/closeout, accepted-offer, timestamp, acquisition and launch-journey tests are green. The 25-test payment suite closes RC-12 with invoice and advance sequential/parallel retry, conflict, distinct-key, cross-tenant, rollback and post-delete proofs.

## Migrations and handling of test data

Migration `0022_provisioning_identity.sql` adds nullable UUID `organization.provisioning_application_id` / `provisioning_owner_id`, a partial unique application-reference index, and unique `member(organization_id,user_id)`. Its reviewed backfill updates only approved applications already linked by `organization_id`; it never infers an unlinked organization by slug. Before migration, guarded Neon DEVELOPMENT had zero duplicate member pairs, zero linked approved applications requiring backfill, and zero unlinked legacy slug matches. Migration 0022 was applied only to guarded Neon DEVELOPMENT; live verification found both UUID columns/indexes, zero duplicate pairs, and zero linked identity mismatches. Production untouched.

Migration `0023_payment_operation_idempotency.sql` creates `payment_operations` with UUID operation key, operation kind, SHA-256 request hash, bare payment ID, optional invoice outcome fields and `timestamptz` creation time. It adds organization cascade, unique tenant/key, kind/hash/credit checks, ENABLE/FORCE RLS, tenant SELECT/INSERT policies and exactly SELECT/INSERT for `kornizo_app`. Generated SQL was reviewed and augmented manually for RLS/grants. The repository's ignored fingerprint configuration verified the Neon DEVELOPMENT endpoint and distinct restricted role immediately before migration; live readback confirmed all columns/constraints, FORCE RLS, two policies and only the two grants. Production was untouched and no historical payment was backfilled.

All write probes use disposable `.test` identities and tracked synthetic DEV organization/application/client/invoice data. The browser setup verifies the approved DEV fingerprint and distinct restricted runtime role, and honors Better Auth Retry-After. Teardown deletes only tracked fixture records, including synthetic audit/contact records. Secrets, cookies and passwords remain in environment/process memory and are not committed. Browser traces/screenshots are disabled; generated local test artifacts are ignored by Git. Final read-only cleanup verification found zero synthetic browser users, organizations, contact requests and audit events. Runtime role checks confirm `rolbypassrls=false` and `rolsuper=false`. The local test server stopped when the browser suite finished.

The RC-06/07 run used the same tracked `.test` cleanup discipline. Its final guarded read found zero `prov-*` synthetic users, organizations, applications or audit events; no credential, session cookie or connection string was printed or committed.

The RC-12 suite registered only disposable `.test` users and exact organization IDs; organization teardown cascaded its clients, invoices, payments and operation receipts. Final inspection found two older, pre-0023 interrupted `p7c-*` fixture sets; the repository's scoped cleanup helper removed only their four resolved organization IDs and ten exact `.test` emails. Readback then showed zero `p7c-*` users, organizations or receipts. No operation key, request hash, cookie, password or database URL was logged or committed.

## Remaining decision gates

See [PASS1_DECISIONS.md](PASS1_DECISIONS.md): RC-06/07 immutable provisioning identity and RC-12 durable payment-operation receipts are approved and implemented. RC-02 additional provider lifecycle hooks and RC-11 unsupported pricing editors remain separate open decisions.

See [PASSWORD_RECOVERY_CONTRACT.md](PASSWORD_RECOVERY_CONTRACT.md): RC-05 remains OPEN until real selected-domain/sender delivery and reset/session tests work.

RC-14/16/17/21/22 remain DEFERRED, alongside production domain/sender, legal operator/review and retention-policy decisions. Complete the specific Pass 1 approvals before advancing the release sequence.
