# Release Audit Remediation Pass 1 — execution checkpoint

Status: **NO-GO for production; Pass 1 remains open at RC-05 password recovery.** RC-02, RC-06/07, RC-11, and RC-12 are fixed. No Pass 2, Milestone 6, deployment or production data change was started.

Authoritative checkout: `/Users/solution25/Website/WebsiteWindowOffers`; branch `clone/proferto`; starting HEAD `19692f7033890d86738d92f387ceb2859fdcc208`. Application checkpoint commit: `36ad0a3bb79dd94bdc20fdb3147bc51f95a74834`. Final documentation commit/push identities are in the execution report; this document is committed with the checkpoint so it does not attempt to contain its own commit hash.

RC-12 remediation started from `9c33b73b56ff5008b5a4cd24cabe1365162f8335`, after verifying it matched `melos/clone/proferto` and the worktree was clean.

RC-11 remediation started from clean `3a44a86bf7ceda12538d7d826e27ffa3ca6f104d`, after fetching and verifying it exactly matched `melos/clone/proferto`.

RC-02 remediation started from clean `1a93515f860250338484c67ce33c86632ac49c97`, after fetching and verifying it exactly matched `melos/clone/proferto`.

## Executed gates

| Gate | Result |
|---|---|
| `npm test` | PASS — 216 tests / 17 files |
| targeted `src/auth/organization-lifecycle.dbtest.ts` | PASS — 7 tests covering five lifecycle states, provider authority and zero partial writes |
| targeted `src/server/payments.dbtest.ts` | PASS — 25 tests, including all RC-12 concurrency/adversarial cases |
| `npm run test:db` | PASS — 342 tests / 19 files |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run check` | PASS — lint, typecheck, production webpack build |
| `npx drizzle-kit check` | PASS |
| `npm run test:browser` | PASS — 15 real Chromium/HTTP tests, including RC-11 desktop/mobile light/dark pricing validation |
| `git diff --check` | PASS |

The RC-12 implementation changed only payment-operation identity, its tenant table/policies/grants, the payment-entry UUID lifecycle and focused tests/docs. It did not change pricing, payment amount/credit rules, invoice balance calculation, authorization, or full-settlement semantics. No package version changed in this task.

The RC-11 implementation changes only which existing catalog controls are actively editable and which submitted fields the pricing save action accepts. Unsupported legacy data is preserved in storage and ignored from bypass submissions. Existing calculation outputs, calculation version 1, historical pricing versions, accepted offers, project prices, and invoice snapshots are unchanged. No migration or dependency change was made.

The RC-02 implementation changes only provider integration and the shared lifecycle classifier. It adds no organization capability, does not replace Better Auth authorization, and does not change tenant data, provisioning identity, pricing, finance, or schemas. No migration or dependency change was made.

## Adversarial and regression evidence

- RC-01: actual Next Server Action HTTP replies for new/duplicate/concurrent Contact and Demo submissions equal `{ok:true,data:{accepted:true}}`; stored IDs and private markers are absent. The database still deduplicates each concurrent pair to one record.
- RC-02: real Better Auth HTTP/session tests cover every configured organization mutation across ACTIVE, TRIAL, TRIAL_EXPIRED, SUSPENDED and ACCOUNT_NOT_READY. Update organization, member role, administrative removal, invitation creation/resend and acceptance are denied before writes for unavailable tenants; reject, provider-authorized cancel, leave and set-active remain usable. Setting an unavailable organization active still fails the canonical tenant context. Deletion remains disabled with complete organization/member/invitation snapshots unchanged, and public creation remains disabled while trusted provisioning passes.
- RC-03: generated offer/invoice HTML is parsed in Chromium with script/closing-tag/event-handler/entity payloads. No payload executes or becomes active markup, title/body preserve inert text, and opener is null. A stored hostile client/reference/line is also retrieved through the real invoice UI and printed in a real popup. Fixed warranty and 50/50 commitments are absent.
- RC-04: private review-note/reviewer markers and property names are absent from duplicate applicant actions and both applicant-page serialized HTTP responses.
- RC-06: deleting only the synthetic intended owner's canonical Better Auth membership and retrying repairs exactly that owner on the same organization. Parallel repairs converge to one `(organization_id,user_id)` row; incompatible roles or unrelated owners fail explicitly without promotion or transfer.
- RC-07: renaming the synthetic organization's display slug through Better Auth, forcing a recoverable failure, and retrying uses the linked organization and creates no second organization. Unlinked retry adopts only by immutable `provisioning_application_id`; an unrelated organization holding the old slug is not adopted.
- RC-08: actual PostgreSQL wait barriers force activate-before-extend and extend-before-extend; activation stays active, two extensions add both increments, and audit predecessor dates match the committed transitions. Existing suspend/reactivate tests also pass. Browser Account-tab extension/activation and later refusal are covered.
- RC-09: PostgreSQL barriers prove stale commercial, item and option edits fail after acceptance; invoice snapshot reads wait for the same project lock and capture the committed item price. Serialized HTTP edit of an accepted offer is also refused. Existing accepted/reopen regressions pass.
- RC-10: owner/sales/operator/accounting × Draft/accepted creation matrix verifies server capabilities.
- RC-11: unit sensitivity tests prove every visible price category changes an applicable calculation: all Ram/Krah/T color cells, PVC Armim Ram, every selected glass row, white/color llajsne, and the first roleta rate. Unit and DB policy tests prove mechanisms, panels, expansions, production, door models, unused profile/arming/accessory/roleta values remain stored and immutable through the public save boundary. A guarded real-tenant Chromium journey verifies supported-only navigation, saves glass pricing, observes a €9.70 change for the same new 1000×1200 configuration, and covers desktop/mobile at 1440×1000 and 390×844 in both light and dark modes.
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

The RC-02 suite used four disposable `.test` identities and five exact organization IDs. Scoped teardown removed those organizations and users; final readback found zero `rc02-*` users, organizations or invitations. Cookies, passwords and database URLs remained in process memory and were not printed or committed.

## Remaining decision gates

See [PASS1_DECISIONS.md](PASS1_DECISIONS.md): RC-02's installed-provider mutation matrix, RC-06/07 immutable provisioning identity, RC-11 truthful active pricing controls, and RC-12 durable payment-operation receipts are approved and implemented.

See [PASSWORD_RECOVERY_CONTRACT.md](PASSWORD_RECOVERY_CONTRACT.md): RC-05 remains OPEN until real selected-domain/sender delivery and reset/session tests work.

RC-14/16/17/21/22 remain DEFERRED, alongside production domain/sender, legal operator/review and retention-policy decisions. Complete the specific Pass 1 approvals before advancing the release sequence.
