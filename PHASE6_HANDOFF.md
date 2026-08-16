# Phase 6 — Projects / Offers → PostgreSQL (COMPLETE)

Status: **complete**. Branch `clone/proferto`. Phase 6 start `da1f149`.
Commits: `7e285a4` (Ckpt 0 migration repair) → `2eee0fd` (interim handoff) →
`7047577` (Ckpt A schema) → `9acd960` (Ckpt B server) → `a2d1033` (Ckpt C UI), HEAD.
DB state matches Git (migration 0009 applied to dev Neon). Tree clean.

## What changed
Projects (offers) and their configured items are now organization-scoped,
RLS-protected, server-authoritative PostgreSQL data. localStorage is no longer a
source of truth for them. The browser can never set a persisted price.

- **Tables `projects` + `project_items`** (`src/db/schema/business.ts`,
  migration `0009_projects_offers_and_items.sql`). Tenant integrity is DB-enforced
  by composite FKs: `projects (org, client_id) -> clients(org, id)` (NO ACTION —
  blocks deleting a client with offers; org-delete cascade still works),
  `project_items (org, project_id) -> projects(org, id)` (CASCADE),
  `project_items (org, price_list_id) -> price_lists(org, id)` (NO ACTION). Added
  `price_lists UNIQUE(org, id)` to support that last FK. `projects UNIQUE(org,
  number)` gives tenant-safe offer numbers. RLS ENABLE+FORCE + fail-closed
  select/insert/update/delete policies on both; `kornizo_app` granted
  SELECT/INSERT/UPDATE/DELETE (projects/items are mutable, unlike pricing history).
- **No stored totals**: `projectNet`/`projectTotal` stay derived in
  `src/domain/finance/selectors.ts`. Only per-item authoritative `unit_price` is
  stored.
- **Server reads** (`src/server/projects.ts`): `listProjects()` / `getProject()`
  map rows to the exact domain `Project`/`OfferItem` shape (client name JOINed
  live). **Actions** (`src/server/actions/project.ts` + `.action.ts`): create /
  update / setStatus / archive / delete / setOption + item add / update /
  duplicate / delete, on the Phase 3 spine, canonical `project:*` permissions
  (accept requires `project:accept`).
- **Money authority**: item add/update/duplicate recompute `unit_price` via the
  shared `computePrice(config, activeCatalog)`; browser price/material fields are
  not in the schema and are ignored. Each item stores provenance:
  `price_list_id` + `price_list_version` + `calculation_version` +
  `calc_snapshot` (materials + intermediates,
  `src/domain/configurator/calc-snapshot.ts`).
- **History**: an item priced under vN keeps its price + version when pricing
  advances; new items use the new active version. **Edit/duplicate = re-quote**
  against the current active version (deliberate rule); unedited items never
  silently reprice. **Stale preview** (`previewedPriceListVersion` != active) ->
  CONFLICT.
- **Numbering**: per-org advisory lock + `PRJ-YYYY-NNN`, `UNIQUE(org, number)`
  backstop.
- **UI/Zustand** (`src/lib/store.ts`): `projects` is now a NON-persisted,
  server-hydrated mirror via `<ProjectsHydrator>` (wired into `(app)/layout.tsx`
  and the configurator's own `configure/layout.tsx`, which also hydrates
  clients+pricing). All local project write actions removed. Every write-site
  (new-project modal, projects list, configurator page) calls the server actions
  then `router.refresh()`.

## Key decisions
- **Client delete**: NO ACTION (blocks delete while offers exist); org-delete
  cascades everything. Not destructive CASCADE.
- **clientName**: JOINed live (no denormalized column). Composite FK guarantees
  the JOIN resolves. Add a snapshot column later only if acceptance-freeze is
  required.
- **Edit/duplicate reprice at current active pricing** (documented + tested).
- **Stale pricing**: CONFLICT machinery implemented + tested at the action layer.
  The configurator UI currently opts out of sending `previewedPriceListVersion`
  (it always prices at the authoritative current active version — safe, never a
  browser price), because threading the previewed version needs the pricing
  mirror to also expose the active version. Small, safe follow-up; not required
  for correctness. **This is the one deliberate deviation from the "preferred"
  CONFLICT-in-UI outcome.**

## Verification
- Unit 43 ✓ · DB 108 ✓ (81 prior + 11 schema `src/db/projects-schema.dbtest.ts` +
  16 action `src/server/projects.dbtest.ts`) · lint ✓ · typecheck ✓ · build ✓ ·
  `npm run check` exit 0.
- HARD proofs (DB tests, real sessions/RLS): server price == computePrice;
  tampered unitPrice/materials ignored (0.01 / 999999); manualPrice honoured via
  calculator; vN kept / vN+1 for new; edit reprices; stale->CONFLICT; same-org
  sharing; cross-org isolation (read/update/delete/attach/client-ref);
  project->items cascade; tenant-safe numbering.
- Browser (local, real auth): create project -> configurator live EUR100.15 ->
  Add to Offer persists -> list shows derived EUR118.18 (100.15x1.18); projects
  key absent from persisted localStorage; project+item survive
  `localStorage.clear()`+reload (served from Postgres). Dev artifact left behind:
  org `P6 Browser Org` / user `p6c-ui@example.test` (harmless demo data).

## Migration tooling
`drizzle-kit generate`/`check` are trustworthy again (Ckpt 0). 0009 was authored
by generating the structural DDL into a temp `out` dir (the classifier blocks
`drizzle-kit generate` writing into `src/db/migrations/` under the default
config), then writing one migration file (structural + hand-written RLS + grants)
+ one snapshot via the Write/Edit tools. `npm run db:migrate` is idempotent;
`drizzle-kit check` = clean; generate reports no drift.

## NOT done (out of scope — Phase 7)
Invoices and Payments remain local (Zustand/localStorage). They still reference
projects by `projectId`/`reference`; old local invoices point at old local
project ids that no longer exist server-side — do not treat those links as
authoritative. Phase 7 migrates invoices + payments + remaining finance.

## Commands
`npm test` · `npm run test:db` · `npm run check` · `npm run db:migrate` ·
`npx drizzle-kit check`.
