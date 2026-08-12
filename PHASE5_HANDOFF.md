# Phase 5 — Pricing → PostgreSQL (COMPLETE)

Status: **complete**. Branch `clone/proferto`. Phase 5 start `687291d`.
Commits: `7d82565` (5A/B foundation) → `570d5f9` (5C UI cutover, HEAD).
DB state matches Git (migrations 0006–0008 applied to dev Neon). Tree clean.

## What changed
Pricing is now an organization-scoped, versioned, RLS-protected PostgreSQL
source of truth. Browser localStorage is no longer authoritative for pricing.

- **Table `price_lists`** (tenant-owned). One row = one immutable version holding
  the complete domain `PricingCatalog` as a `catalog` JSONB snapshot. Chosen over
  child tables because the catalog is always read/written whole; snapshots make
  per-version immutability trivial and remove the cross-tenant child-attach bug
  class. `calculation_version` records the window-calc contract for Phase 6.
- **Invariants (DB-enforced):** `UNIQUE(org, version)` (monotonic); partial
  unique index `price_lists_one_active_uidx` over `organization_id WHERE
  is_active` (exactly one active). RLS ENABLE+FORCE, fail-closed policies
  (`app.current_org`). Runtime role `kornizo_app` granted SELECT/INSERT/UPDATE
  only (no DELETE → history retained; org delete cascades run as owner).
- **Default init:** canonical `src/domain/pricing/defaults.ts`; `mock/data.ts`
  re-exports it (one source → calc unit tests validate the DB default).
  `ensureActivePriceList` is idempotent (`ON CONFLICT (org) WHERE is_active`),
  called lazily by the read boundary AND best-effort by the org-creation hook.
- **Server read:** `getActivePricingCatalog()` / `getActivePriceList()` (session
  → withOrg RLS → active version → validated `PricingCatalog`).
- **Save:** `savePricingAction` on the Phase 3 spine. Per-org
  `pg_advisory_xact_lock` serializes saves; deactivate-then-append new version;
  optional `baseVersion` → CONFLICT on stale edits. Validated by shared
  `pricingCatalogSchema`. Permission `pricing:edit` (owner/admin).
- **UI/Zustand:** pricing removed from `partialize`; server-hydrated non-persisted
  mirror via `PricingHydrator` in `(app)/layout.tsx`. Pricing page is
  props-driven, saves through the server action, read-only for non-editors.
- **Permissions deviation:** added `pricing:["read"]` to `sales`/`operator` in
  the canonical `src/auth/permissions.ts` (configurator needs to read pricing).
- **Test hygiene:** `src/db/testing/fixtures.ts` `TestCleanup` deletes only the
  orgs/users a test created (org delete cascades). Retrofitted into all dbtests.

## Key files
- Schema/migrations: `src/db/schema/business.ts`, `src/db/migrations/0006–0008`.
- Domain: `src/domain/pricing/defaults.ts`, `src/domain/validation/pricing.ts`,
  `PRICING_CALCULATION_VERSION` in `src/domain/configurator/window-calc.ts`.
- Server: `src/server/pricing.ts`, `src/server/pricing-init.ts`,
  `src/server/actions/pricing.ts`, `.../pricing.action.ts`.
- UI: `src/components/providers/pricing-hydrator.tsx`,
  `src/components/pricing/pricing-client.tsx`, `src/app/(app)/pricing/page.tsx`,
  `src/app/(app)/layout.tsx`, `src/lib/store.ts`.
- Tests: `src/server/pricing.dbtest.ts` (16).

## Verification
- Unit 43 ✓ · DB 81 ✓ (was 65; +16 pricing) · lint ✓ · typecheck ✓ · build ✓ ·
  `npm run check` exit 0.
- Browser (local): new org auto-seeds default v1; owner edit → active v2 (v1
  retained, one active); change survives `localStorage.clear()`+reload (served
  from Postgres); no console errors. Dev artifact left behind: organization
  `phase5-demo-org-*` / user `phase5-demo@example.test` (harmless demo data).

## Phase 6 notes (NOT started — do not migrate projects here)
- Persist project items server-side; compute authoritative `unit_price` on the
  server via `computePrice(config, catalog)` using the org's active
  `getActivePricingCatalog()` — never trust browser-calculated money.
- Store `calculation_version` + a reference to the pricing version used, so a
  stored price is reproducible from the exact historical `price_lists` row.
- Commands: `npm test`, `npm run test:db`, `npm run check`, `npm run db:migrate`.
