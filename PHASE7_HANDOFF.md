# Phase 7 — Invoices / Invoice Lines / Payments → PostgreSQL

Status: **Checkpoints A–D + CLOSEOUT complete; authenticated browser E2E run.**
Branch `clone/proferto`.

## Authenticated browser E2E (concern 4) — DONE (local, real sign-in)
Driven in the in-app Browser against LOCAL after a human signed up a dev user +
org (the agent cannot create accounts / enter passwords). Verified end to end:
- Create DB **Client** (server action + hydration) → shows in list.
- **Manual invoice** create: server number **FAT-2026-001**, server-computed totals
  (2×100 → net 200 / VAT 18% 36 / **236**), client + **issuer snapshot** rendered
  (org name from snapshot, live fallback for unset profile fields), status select
  offers only Draft/Dërguar/Anuluar (**Vonesë/Paguar are derived — closeout live**).
- **Partial payment** 100 → badge "Pjesërisht e paguar", Paguar −100, **Mbetje 136**.
- **Mark paid** → settles remaining 136 → **Paguar**, Mbetje 0; pay/mark buttons
  disappear (no duplicate possible); dashboard shows **"2 pagesa"** (exactly one
  settling payment added).
- **Dashboard** KPIs DB-backed: Invoiced 236, Received 236, Unpaid 0, Debt 0.
- **Client detail** DB-backed: Invoiced 236, Paid 236, Debt 0, Pagesat 2, and the
  old "lokale" finance badge is gone.
- **localStorage cleared** (`kornizo-demo-store` removed) + reload → FAT-2026-001
  still present (served from Postgres).
NOT re-done in the browser (already rigorously DB-proven, and heavy to set up in a
flaky small pane): invoice-from-project (needs a configured project item), the
print pop-up window, and cross-org isolation (needs a 2nd org/session). All are
covered by the 40 finance DB tests.

## CLOSEOUT (commit `95ab2a8`, on top of A–D)
Three historical-integrity concerns + one UX follow-up, all server-authoritative:
- **Issuer/company historical snapshot.** Migration **0011** adds
  `invoices.company_snapshot` (jsonb, DEFAULT '{}'). At invoice CREATION the server
  freezes the issuer identity from the authoritative sources — `organization.name`
  + `organization_profiles` (address/city/postalCode/phone/businessEmail/nui/vatNo/
  bank/swift/iban). Lifecycle = **creation** (symmetric with the client snapshot;
  invoices print at any status incl. Draft and there is no separate issue event).
  `print.ts` + the invoice detail issuer block render the frozen snapshot, falling
  back to the live profile only for a legacy `{}` row. Proven: change org profile
  after issue → historical invoice snapshot unchanged.
- **Invoice deletion lifecycle.** Hard delete restricted (row-locked, server-side)
  to Draft/Cancelled invoices with **no payments**; issued invoices must be
  cancelled; an invoice with payments can never be deleted — so the payments
  `SET NULL` FK can never silently turn real payments into client credit. UI delete
  buttons gated to match.
- **Overdue derived.** New `isOverdue(inv, payments, now)` selector (issued +
  outstanding + due date passed; paid/cancelled/draft never overdue). **"Vonesë"
  removed from the settable statuses** (validation + modal + detail select); the
  list KPI / filter / badge derive overdue so it can never go stale.
- **Accepted-offer UI follow-up.** The configurator now hides/disables value
  controls for an accepted (`Pranuar`) offer and offers a **"Rihap ofertën"**
  (reopen → Dërguar) action, instead of only failing server-side.

Closeout tests: unit **48** (+5 `isOverdue`); new `src/server/invoice-closeout.dbtest.ts`
(4: issuer-snapshot stability, deletion lifecycle, payments-never-become-credit);
`invoices.dbtest.ts` updated (Vonesë no longer settable). Migration 0011 applied to
Neon dev, idempotent, `drizzle-kit check` clean.

## Commits
- Phase 6 application baseline: `775d181`.
- Phase 7 repository starting commit (Graphify/Claude tooling only, no app code):
  `2c2163f`.
- Phase 7 work:
  - `44b9269` — Ckpt A: finance schema + migration 0010 + RLS/FKs/grants +
    accepted-offer freeze.
  - `155cb9f` — Ckpt B: invoice services/actions (from-project/manual/status/delete).
  - `4aaa1e1` — Ckpt C: payment transactions (record/mark-paid/advance/delete).
  - Ckpt D (UI/localStorage cutover) — committed on top (see `git log`).

Git and Neon dev are synchronized: migration `0010_finance` applied,
`drizzle-kit check` clean, `npm run db:migrate` idempotent.

## What changed
Invoices, invoice lines and payments are now organization-scoped, RLS-protected,
server-authoritative PostgreSQL data. localStorage is no longer a source of truth
for them (excluded from `partialize`, wiped in `migrate`). The browser can never
set an authoritative invoice total or line price for an offer-based invoice.

### Schema (`src/db/schema/business.ts`, migration `0010_finance.sql`)
- **`invoices`** — direct org ownership. Composite FKs: `(org, client_id) ->
  clients(org, id)` NO ACTION (blocks deleting a client with invoices);
  `(org, project_id) -> projects(org, id)` **column-scoped `ON DELETE SET NULL
  (project_id)`** (deleting the offer NULLs the link, invoice survives). Snapshot
  columns: `client_name`, `client_snapshot` (jsonb: name/type/nui/address/city/
  email/phone frozen at issue), `reference` (offer number string). `issued_at`/
  `due_at` are `date`. `vat_rate` numeric(5,4). `UNIQUE(org, number)`,
  `UNIQUE(org, id)`. **No stored total** — derived from lines by the selectors.
- **`invoice_lines`** — `(org, invoice_id) -> invoices(org, id)` ON DELETE
  CASCADE. `description`, `qty` (int), `unit_price` numeric(12,2),
  `source_project_item_id` (bare uuid provenance, no FK), `sort_order`. Snapshots
  copied at creation; never re-derived.
- **`payments`** — `(org, client_id) -> clients(org, id)` NO ACTION;
  `(org, invoice_id) -> invoices(org, id)` **`ON DELETE SET NULL (invoice_id)`**
  (deleting an invoice unlinks payments → client credit). `amount` numeric(12,2)
  `CHECK (amount > 0)`. `date` (date), `method`, `note`.
- All three: RLS ENABLE + FORCE, fail-closed select/insert/update/delete policies,
  `kornizo_app` GRANT SELECT/INSERT/UPDATE/DELETE. Verified live (PG 18.4).

### Server layer
- Reads: `src/server/invoices.ts` (`listInvoices`/`getInvoice`), `src/server/
  payments.ts` (`listPayments`) — RLS-scoped, mapped to the exact domain
  `Invoice`/`Payment` shape. `clientName` comes from the invoice snapshot, NOT a
  live JOIN.
- Actions (Phase 3 spine): `src/server/actions/invoice.ts` (+ `.action.ts`):
  `createInvoiceFromProject`, `createManualInvoice`, `setInvoiceStatus`
  (Anuluar ⇒ `invoice:cancel`), `deleteInvoice`. FAT-YYYY-NNN numbering via
  per-org `pg_advisory_xact_lock` + `UNIQUE(org, number)` backstop.
  `src/server/actions/payment.ts` (+ `.action.ts`): `recordInvoicePayment`,
  `markInvoicePaid`, `recordAdvancePayment`, `deletePayment` — all take
  `SELECT … FOR UPDATE` on the invoice row before reading the balance.
- Validation: `src/domain/validation/invoice.ts`, `src/domain/validation/
  payment.ts`.
- Canonical permissions UNCHANGED (`src/auth/permissions.ts` already had
  `invoice:[read,create,update,cancel,delete]` and `payment:[read,record,delete]`;
  accounting/owner/admin full, sales/operator read-only). No new role map.

### UI / store cutover
- New hydrators `invoices-hydrator.tsx` / `payments-hydrator.tsx`, wired into
  `(app)/layout.tsx` (loads `listInvoices`/`listPayments` server-side).
- `src/lib/store.ts`: `invoices`/`payments` are now NON-persisted, server-hydrated
  mirrors (`setInvoices`/`setPayments`); all local write methods removed
  (`addInvoice`/`updateInvoice`/`setInvoiceStatus`/`deleteInvoice`/`addPayment`/
  `recordInvoicePayment` + `nextNumber`). Excluded from `partialize`; wiped in
  `migrate`.
- Cut over to server actions + `router.refresh()`: invoices list (delete), invoice
  detail (status/mark-paid/add-payment/delete), invoice form modal (from-project ⇒
  `createInvoiceFromProject` with read-only offer lines; manual ⇒
  `createManualInvoice`), client detail (advance payment). Removed the client
  detail "lokale" finance badge.
- `backup.ts` unchanged (invoices/payments stay in the export snapshot shape, like
  clients/projects — but never persisted authoritatively; consistent with Phase
  4/6).

## Key decisions
- **Accepted-offer freeze (hard precondition).** A `Pranuar` offer is FROZEN
  against value edits (item add/edit/duplicate/delete, `updateProject`,
  `setProjectOption` → `RULE_VIOLATION`); reopen (status change) to edit.
  Accepting/archiving/deleting stay allowed. Enforced in `src/server/actions/
  project.ts` via `assertEditable`. Rationale: the Phase 6 edit=reprice rule would
  otherwise let a later pricing change silently rewrite an accepted value, which is
  what invoices are generated from. **UI gating of the configurator edit controls
  when accepted is NOT yet added** — the server rejects the edit safely (toast),
  but a nicer UX would disable the controls + offer a "reopen" button. Small
  follow-up, documented; not required for correctness.
- **Invoice snapshot.** Client identity frozen (`client_name` + `client_snapshot`
  jsonb incl. NUI/address — what a legal/printed invoice needs). Company block on
  the printout stays LIVE from the org profile (issuer's own current details);
  snapshotting it is a possible future enhancement.
- **Invoice→Project delete = SET NULL (project_id)** (invoice survives, keeps
  `reference`). **Client delete = blocked** while invoices/payments exist (NO
  ACTION). **Invoice delete** cascades lines, SET NULLs payments (money → credit).
- **Totals derived** from stored lines + `vat_rate` via the existing selectors
  (single source of truth); not stored, cannot be browser-tampered.
- **VAT on from-project invoice = the project's own `vat_rate`** (authoritative),
  not `company.vatDefault` (which the old local modal used). Manual invoices take a
  validated `vatRate` input (UI passes `company.vatDefault/100` as before).
- **Money = NUMERIC in DB, number in JS**, rounded at cent boundaries with the
  selectors' EPS. No float DB money; no Decimal.js migration needed.

## Verification
- Unit: 43 ✓. Build ✓. Lint ✓. Typecheck ✓.
- New DB/integration tests: `src/db/finance-schema.dbtest.ts` (13), `src/server/
  accepted-offer.dbtest.ts` (1), `src/server/invoices.dbtest.ts` (16),
  `src/server/payments.dbtest.ts` (10) = **40 new**, on top of the prior 108.
  HARD proofs covered: RLS isolation, composite FK tenancy, delete semantics
  (SET NULL / CASCADE / NO ACTION), amount CHECK, numbering, invoice-from-project
  money authority + payload tampering ignored, HISTORICAL STABILITY (repricing
  source project never rewrites the invoice), manual totals recomputed server-side,
  partial 100→40→60→0, overpayment rejected-by-default + allowCredit credit-once +
  next-invoice debt offset, mark-paid idempotency, **two SIMULTANEOUS mark-paid →
  exactly one 250 payment (not 500)**, advance→credit, delete restores/reverts,
  same-org sharing, cross-org isolation, accepted-offer freeze+reopen.
- Full `test:db` run: **148 passed (11 files)** — 108 prior + 40 new finance; no
  regression from the accepted-offer guard.
- Browser smoke (no-auth): dev server boots, `/` serves, the new invoices/payments
  hydrators + finance layout load with NO server or console errors (only the
  benign pre-existing pg `sslmode` deprecation warning) and no hydration mismatch.
  Authenticated finance-flow browser validation was NOT run here — it needs sign-in
  (creating an account / entering a password), which the agent must not do in an
  unattended session; it is the one remaining manual verification (checklist below).

## Next exact step
1. Confirm full `npm run test:db` is green (all ~148 DB tests).
2. **Browser validation** (local, real auth) — the remaining item: create manual
   invoice; create invoice from an accepted offer (verify lines/prices come from
   the offer, read-only); record partial payment; mark paid (double-click safe);
   delete; verify dashboard + client-detail finance update; a second same-org user
   sees the change; `localStorage.clear()` + reload keeps finance (served from
   Postgres); other org cannot see it; Clients/Pricing/Projects/Configurator still
   work.
3. (Optional, documented) UI-gate the configurator edit controls for accepted
   offers; add a "reopen offer" button.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check`.

## Do NOT redo
- Do NOT rebuild the Graphify graph (`/graphify .`) — incremental `graphify update
  .` only if needed.
- Do NOT re-generate migration 0010 with `drizzle-kit generate` into
  `src/db/migrations` (blocked by the classifier); the SET NULL FKs are
  HAND-EDITED to column-scoped and drizzle cannot express them — regenerating would
  revert them to plain `SET NULL` (which would break project deletion).
- Do NOT reintroduce local invoice/payment write authority in the store.
- The P6 browser fixture (`P6 Browser Org` / `p6c-ui@example.test`) was already
  removed.
