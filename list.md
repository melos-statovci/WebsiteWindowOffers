# Proferto Application URL Map

- **Starting URL:** `https://app.proferto.io/dashboard`
- **Allowed origin:** `https://app.proferto.io`
- **Exploration date:** 2026-08-05
- **Account or role observed:** Signed-in user "Milaim Hasani" — role **PRONAR (Owner)** per Settings → Users (sidebar avatar cosmetically labels it "Operator"). Plan: **SOLO**.
- **Total confirmed concrete routes:** 23 (14 distinct paths + 9 `/pricing?tab=` query variants). Root `/` additionally confirmed to redirect to `/dashboard`.
- **Total route patterns:** 2 observed (`/projects/:projectId/configure`, `/clients/:clientId`) + 1 inferred-but-unobservable (`/invoices/:invoiceId`).
- **Redirects found:** 1 (`/` → `/dashboard`).
- **Inaccessible destinations:** 0 hard-blocked. 8 routes are **plan-gated** (load successfully but render an upgrade wall instead of functional content).
- **Important limitations:** The app is a button-driven SPA with **zero `<a href>` anchors** — every route was discovered by observed navigation, never by guessing. Application data is nearly empty (1 project, 1 client, 0 invoices), so some detail/child routes could not be exercised. Banner warns the app is in active launch phase ("Prova falas … Proferto është në fazë lansimi") and may change.

## Executive Summary

Proferto is an Albanian-language SaaS for windows/doors quoting, configuration, and light ERP (a "Konfigurator & Oferta për Dritare e Dyer"). The current account is on the **SOLO** plan, which unlocks a core set of areas — **Dashboard, Projektet (projects/offers), Klientët (clients), Faturat (invoices), Çmimet & Sistemet (pricing/systems catalog), Siguria (security), Cilësimet (settings)** — while the OPERACIONET and BURIMET modules (**Financat, Prodhimi, Stoku, Monitorimi, Punëtorët, Asetet, Dokumentet**) are visibly padlocked and route to an upgrade wall for the BIZNES / FABRIKA plans.

Navigation is a single fixed left sidebar (three functional groups + a SISTEMET group), a slim top bar (Help drawer, global search palette, notifications dropdown), and in-page tabs. Most "tabs" (configurator steps, client-detail tabs, settings sub-pages) are **internal component state and do not change the URL**; the one exception is the Çmimet & Sistemet page, whose ten catalog tabs are genuine `?tab=` query routes. Coverage of the reachable route surface is believed to be essentially complete for this account; the main gaps are dynamic detail routes that require more seed data (invoices) to observe.

---

## Primary Navigation

### KRYESORE (Main)

#### Dashboard
- **URL:** `https://app.proferto.io/dashboard`
- **Path:** `/dashboard`
- **Status:** Confirmed
- **Page title:** Proferto - Konfigurator & Oferta për Dritare e Dyer
- **Primary heading:** Dashboard
- **How discovered:** Starting URL / Main sidebar → Dashboard
- **Purpose:** Home overview with onboarding progress banner, KPI stat cards (offers this month, jobs in production, revenue, receivables, expenses) and a 6-month financial-flow chart.
- **Parent section:** KRYESORE
- **Access notes:** Available to current account.
- **Redirect:** `/` redirects here.
- **Related routes:** Stat cards are display-only (not links).

#### Projektet (Projects)
- **URL:** `https://app.proferto.io/projects`
- **Path:** `/projects`
- **Status:** Confirmed
- **Primary heading:** Projektet
- **How discovered:** Main sidebar → Projektet
- **Purpose:** List of projects/offers with search; each row opens the offer configurator. Includes an inline **Arkivi** (archive) toggle that filters to archived projects **without changing the URL** (not a distinct route).
- **Parent section:** KRYESORE
- **Access notes:** Available. "Projekt i ri" (New project) button skipped — creates data.
- **Related routes:** `/projects/:projectId/configure`

#### Klientët (Clients)
- **URL:** `https://app.proferto.io/clients`
- **Path:** `/clients`
- **Status:** Confirmed
- **Primary heading:** Klientët
- **How discovered:** Main sidebar → Klientët
- **Purpose:** Client list with search + sort ("Të gjithë" / "Emri A-Z"); each row's "Hap kartelën" opens a client card.
- **Parent section:** KRYESORE
- **Access notes:** Available. "Shto Klient" (Add client) skipped — creates data.
- **Related routes:** `/clients/:clientId`

### FINANCA (Finance)

#### Faturat (Invoices)
- **URL:** `https://app.proferto.io/invoices`
- **Path:** `/invoices`
- **Status:** Confirmed
- **Primary heading:** Faturat
- **How discovered:** Main sidebar → Faturat
- **Purpose:** Invoice management with status tiles (unpaid/paid/overdue), search, and a status filter. Currently empty ("Asnjë faturë ende").
- **Parent section:** FINANCA
- **Access notes:** Available. "Faturë e re" (New invoice) skipped — creates data.
- **Related routes:** `/invoices/:invoiceId` (pattern inferred; not observable while list is empty).

#### Financat (Finances)
- **URL:** `https://app.proferto.io/finance`
- **Path:** `/finance`
- **Status:** Confirmed (loads) — **plan-gated (BIZNES)**
- **Primary heading:** "Ky modul nuk është i përfshirë në planin tuaj" (upgrade wall)
- **How discovered:** Main sidebar → Financat (padlock icon)
- **Purpose:** Real profit & expense financial module; gated behind the BIZNES plan.
- **Parent section:** FINANCA
- **Access notes:** Route resolves but renders an upgrade wall; no functional content on SOLO.

### OPERACIONET (Operations)

#### Prodhimi (Production)
- **URL:** `https://app.proferto.io/jobs`
- **Path:** `/jobs`
- **Status:** Confirmed (loads) — **plan-gated (BIZNES)**
- **Primary heading:** Prodhimi → upgrade wall
- **How discovered:** Main sidebar → Prodhimi (padlock)
- **Purpose:** Production/job management. Gated behind BIZNES.
- **Parent section:** OPERACIONET
- **Access notes:** Upgrade wall on SOLO.

#### Stoku (Stock)
- **URL:** `https://app.proferto.io/stock`
- **Path:** `/stock`
- **Status:** Confirmed (loads) — **plan-gated (BIZNES)**
- **How discovered:** Main sidebar → Stoku (padlock)
- **Purpose:** Inventory / stock with automatic optimization. Gated behind BIZNES.
- **Parent section:** OPERACIONET
- **Access notes:** Upgrade wall on SOLO (inferred from identical gating pattern).

#### Monitorimi (Monitoring)
- **URL:** `https://app.proferto.io/monitoring`
- **Path:** `/monitoring`
- **Status:** Confirmed (loads) — **plan-gated (BIZNES)**
- **How discovered:** Main sidebar → Monitorimi (padlock)
- **Purpose:** Monitoring module. Gated behind BIZNES.
- **Parent section:** OPERACIONET
- **Access notes:** Upgrade wall on SOLO (inferred).

### BURIMET (Resources)

#### Punëtorët (Workers)
- **URL:** `https://app.proferto.io/workers`
- **Path:** `/workers`
- **Status:** Confirmed (loads) — **plan-gated (FABRIKA)**
- **How discovered:** Main sidebar → Punëtorët (padlock)
- **Purpose:** Worker/staff management. Listed under the FABRIKA plan features.
- **Parent section:** BURIMET
- **Access notes:** Upgrade wall on SOLO (inferred).

#### Asetet (Assets)
- **URL:** `https://app.proferto.io/assets`
- **Path:** `/assets`
- **Status:** Confirmed (loads) — **plan-gated (FABRIKA)**
- **How discovered:** Main sidebar → Asetet (padlock)
- **Purpose:** Asset management (incl. GPS fleet tracking add-on per FABRIKA feature list).
- **Parent section:** BURIMET
- **Access notes:** Upgrade wall on SOLO (inferred).

#### Dokumentet (Documents)
- **URL:** `https://app.proferto.io/documents`
- **Path:** `/documents`
- **Status:** Confirmed (loads) — **plan-gated (FABRIKA)**
- **Primary heading:** Dokumentet → upgrade wall
- **How discovered:** Main sidebar → Dokumentet (padlock)
- **Purpose:** Document management. Gated behind FABRIKA.
- **Parent section:** BURIMET
- **Access notes:** Upgrade wall on SOLO (confirmed directly).

### SISTEMET (Systems)

#### Çmimet & Sistemet (Pricing & Systems)
- **URL:** `https://app.proferto.io/pricing`
- **Path:** `/pricing`
- **Status:** Confirmed
- **Primary heading:** Çmimet & Sistemet
- **How discovered:** Main sidebar → Çmimet & Sistemet
- **Purpose:** Central catalog for profile systems, materials, products and pricing parameters. Ten catalog tabs implemented as real `?tab=` query routes (see Nested Tabs).
- **Parent section:** SISTEMET
- **Access notes:** Available. "Ruaj Ndryshimet" (Save changes) skipped — mutates data.
- **Related routes:** `/pricing?tab=…` (9 variants).

#### Siguria (Security)
- **URL:** `https://app.proferto.io/security`
- **Path:** `/security`
- **Status:** Confirmed
- **Primary heading:** Siguria
- **How discovered:** Main sidebar → Siguria
- **Purpose:** Account security — support-access transparency window, two-factor auth (2FA), password change, and list of logged-in devices. Single page (sections, not routed sub-tabs).
- **Parent section:** SISTEMET
- **Access notes:** Available. Consequential controls (Aktivizo 2FA, Ndrysho fjalëkalimin, Dil nga të gjitha pajisjet) skipped.

#### Cilësimet (Settings)
- **URL:** `https://app.proferto.io/settings`
- **Path:** `/settings`
- **Status:** Confirmed
- **Primary heading:** Cilësimet
- **How discovered:** Main sidebar → Cilësimet
- **Purpose:** Settings hub with a secondary left menu (see Settings and Administration). All sub-pages are internal state — the URL stays `/settings`.
- **Parent section:** SISTEMET
- **Access notes:** Available.

---

## Dashboard Destinations

The dashboard's KPI cards (Ofertat këtë muaj, Punë në prodhim, Të hyra, Fitimi, Të pranuara, Në pritje, Borxhi i klientëve, Shpenzime) are **display-only tiles, not navigable links**. The only interactive dashboard elements are the onboarding banner buttons "Vazhdo" and "Hapma faqen", which open/advance the configuration-guide drawer (see Skipped/State-only), and the floating "Konfigurimi 12/12" button (same guide drawer). No distinct dashboard-linked routes exist.

## Reports and Analytics

No dedicated Reports/Analytics route exists on this account. Analytics-style content is the dashboard's "Rrjedha financiare (6 muaj e fundit)" chart (on `/dashboard`) and the plan-gated **Financat** (`/finance`) and **Monitorimi** (`/monitoring`) modules.

## Operational Sections

- `/jobs` — Prodhimi (gated, BIZNES)
- `/stock` — Stoku (gated, BIZNES)
- `/monitoring` — Monitorimi (gated, BIZNES)
- `/workers` — Punëtorët (gated, FABRIKA)
- `/assets` — Asetet (gated, FABRIKA)
- `/documents` — Dokumentet (gated, FABRIKA)

## Contacts, Customers, or Records

- `/clients` — Klientët (client list).
- `/clients/:clientId` — client card (route pattern). Detail tabs are internal state (see Nested Tabs).
- `/projects` — Projektet (projects/offers list).
- `/projects/:projectId/configure` — offer configurator for a project (route pattern).

## Settings and Administration

`/settings` (Cilësimet) contains a secondary sidebar under the "KOMPANIA" group. **All of the following are internal panels — the URL remains `/settings`; they are not separate routes:**

- **Profili i Kompanisë** — company profile (logo, profile/system logos, company name, address). Default panel.
- **Dizajni i Ofertës** — offer/PDF design.
- **Përdoruesit** — user/team management (shows "1 / 1 ulëse · Plani SOLO"; current user role **PRONAR/Owner**; "Shto Përdorues" disabled by SOLO seat limit).
- **Abonimi** — subscription/plan management (billing area; purchase/upgrade controls not exercised).
- **Backup & Eksport** — backup and data export (export not initiated).

Administration beyond company/user settings is not exposed to this account. Security administration lives separately at `/security`.

## Profile and Account

There is **no** avatar dropdown / dedicated profile route. The top-left user block ("Milaim Hasani / Operator") is a static label. Profile-type functions are reached through `/settings` (Profili i Kompanisë, Përdoruesit) and `/security`.

## Nested Tabs and Subpages

### Routed sub-pages (distinct URLs) — Çmimet & Sistemet catalog tabs
The `/pricing` page's ten tabs each set a `?tab=` query value:

| Tab label (Albanian) | URL |
| --- | --- |
| Sistemet (default) | `https://app.proferto.io/pricing` |
| Metalet | `https://app.proferto.io/pricing?tab=metals` |
| Mekanizmat | `https://app.proferto.io/pricing?tab=mechanisms` |
| Xhamat | `https://app.proferto.io/pricing?tab=glass` |
| Panelet | `https://app.proferto.io/pricing?tab=door-panels` |
| Shtesat | `https://app.proferto.io/pricing?tab=expansion-profiles` |
| Aksesorët | `https://app.proferto.io/pricing?tab=accessories` |
| Parametrat | `https://app.proferto.io/pricing?tab=production` |
| Roletat | `https://app.proferto.io/pricing?tab=roleta` |
| Dyer të Hyrjes | `https://app.proferto.io/pricing?tab=doors` |

### State-only tabs (NO URL change) — recorded for completeness
- **Offer configurator** (`/projects/:projectId/configure`): tabs **Detajet · Produkti · Përmbledhje** — internal step state, URL unchanged.
- **Client card** (`/clients/:clientId`): tabs **Përmbledhje · Projektet · Ofertat · Pagesat · Prodhimi · Dokumentet · Shënime** — internal state, URL unchanged.
- **Settings** (`/settings`): the five KOMPANIA panels above — internal state, URL unchanged.

## Dynamic Route Patterns

Real identifiers deliberately replaced with safe placeholders.

| Route pattern | Example purpose | How discovered | Verification |
| --- | --- | --- | --- |
| `/projects/:projectId/configure` | Offer configurator for a project | Projektet table → row click | Confirmed (pattern observed via one live navigation) |
| `/clients/:clientId` | Client detail card | Klientët table → "Hap kartelën" | Confirmed (pattern observed via one live navigation) |
| `/invoices/:invoiceId` | Invoice detail | Inferred from `/invoices` list structure | Pattern only — not observable (invoice list is empty; not guessed/opened) |

## Redirects and Canonical Routes

| Original URL | Final URL | Notes |
| --- | --- | --- |
| `https://app.proferto.io/` | `https://app.proferto.io/dashboard` | Root redirects to dashboard for authenticated user. |

## Inaccessible or Permission-Limited Destinations

No route returned an outright 403/404. The following resolve but are **plan-gated** (upgrade wall shown instead of functional content on the SOLO plan):

| Label | Observed URL | Result | How discovered |
| --- | --- | --- | --- |
| Financat | `https://app.proferto.io/finance` | Plan-gated (BIZNES) — upgrade wall confirmed directly | Sidebar (padlock) |
| Prodhimi | `https://app.proferto.io/jobs` | Plan-gated (BIZNES) — upgrade wall confirmed directly | Sidebar (padlock) |
| Stoku | `https://app.proferto.io/stock` | Plan-gated (BIZNES) — inferred (URL confirmed to load) | Sidebar (padlock) |
| Monitorimi | `https://app.proferto.io/monitoring` | Plan-gated (BIZNES) — inferred (URL confirmed to load) | Sidebar (padlock) |
| Punëtorët | `https://app.proferto.io/workers` | Plan-gated (FABRIKA) — inferred (URL confirmed to load) | Sidebar (padlock) |
| Asetet | `https://app.proferto.io/assets` | Plan-gated (FABRIKA) — inferred (URL confirmed to load) | Sidebar (padlock) |
| Dokumentet | `https://app.proferto.io/documents` | Plan-gated (FABRIKA) — upgrade wall confirmed directly | Sidebar (padlock) |

## Discovered External Links

None observed. The page contains **no `<a href>` anchors at all** (verified via DOM query — 0 same-origin and 0 external anchors). Help/upgrade actions ("Na kontaktoni", "Kërko përmirësim") are in-app drawer/button interactions rather than external hyperlinks; no external domains were surfaced or opened.

## Skipped Unsafe Actions

Deliberately **not** clicked/submitted (could modify state or leave scope):

- **Shkyçu** (Logout) — sidebar.
- **Projekt i ri**, **Shto Klient**, **Faturë e re**, **Shto Përdorues**, **Shto pagesë** — creation actions.
- **Ruaj Ofertën** (Save offer), **Ruaj Ndryshimet** (Save changes) — save/mutations.
- Offer PDF/generation actions: **Oferta finale (PDF)**, **Udhëzimi i punës (PDF)**, **Shpenzimet totale (PDF)**, **Shiko ofertën** — downloads/generation.
- **Aktivizo 2FA**, **Ndrysho fjalëkalimin**, **Dil nga të gjitha të tjerat**, **Hape për 24 orë** (support access) — security-changing.
- **FSHIJ LOGON** (delete logo), delete/edit (✎/🗑) icons on client rows — destructive/edit.
- **Vazhdo / Hapma faqen / Aktivizo** in onboarding — advance/mutate onboarding.
- Global **search palette** — opened but **no text typed** (per no-input-into-site rule).
- **Kërko përmirësim** (Request upgrade) — potential support/purchase flow.

## Coverage Checklist

- [x] Logo/home destination (`/dashboard`; `/` → `/dashboard`)
- [x] Dashboard
- [x] Primary sidebar (all groups: KRYESORE, FINANCA, OPERACIONET, BURIMET, SISTEMET)
- [x] Secondary sidebar (Settings KOMPANIA menu)
- [x] Top navigation (Help, search, notifications)
- [ ] Workspace/organization selector — none present (single-company SOLO account)
- [x] User/avatar menu — inspected; static label, no dropdown
- [x] Profile — via `/settings` (no standalone route)
- [x] Account — via `/settings` / `/security`
- [x] Preferences — theme toggle (Ditë/Natë), state-only
- [x] Settings (`/settings`)
- [x] Administration — company/user admin via `/settings`; security via `/security`
- [x] Users and team management (`/settings` → Përdoruesit)
- [~] Roles and permissions — role visible (PRONAR/Owner) but no dedicated roles route on SOLO
- [x] Billing/subscription navigation (`/settings` → Abonimi; purchase not opened)
- [x] Notifications (top-bar dropdown; empty; no route)
- [x] Help and documentation (Help drawer "Qendra e Ndihmës"; no route)
- [~] Reports — none dedicated (dashboard chart only)
- [~] Analytics — gated (`/finance`, `/monitoring`)
- [x] Projects (`/projects`)
- [x] Tasks/workflows — via gated `/jobs` (production)
- [x] Contacts/customers (`/clients`)
- [x] Templates — offer/PDF design under `/settings` → Dizajni i Ofertës (state-only)
- [~] Integrations — none surfaced on this account
- [x] Imports/exports (`/settings` → Backup & Eksport; not initiated)
- [x] Archived/inactive sections (Projektet → Arkivi toggle, URL-less)
- [x] Tabs inside detail pages (client card, configurator — all state-only)
- [x] "View all" links — none present (small dataset)
- [~] Breadcrumbs — minimal ("Kthehu te Klientët" back-link only)
- [x] Footer links — none present
- [x] Empty-state links — inspected (invoices/archive empty states have no navigation)
- [x] Safe contextual menus — no right-click nav menus present
- [~] Mobile/collapsed navigation — sidebar has a collapse button ("Fshih menynë"/"Hap menynë"); not toggled to avoid layout-state changes, but it exposes no new routes

## Limitations and Possible Missing Routes

- **Account permissions / plan:** 8 modules are plan-gated (BIZNES/FABRIKA). Their internal routes/tabs cannot be seen on SOLO; only their top-level route + upgrade wall were confirmed. Stock/monitoring/workers/assets upgrade walls are inferred from the identical pattern seen directly on finance/jobs/documents.
- **Empty application state:** Only 1 project, 1 client, and 0 invoices exist. `/invoices/:invoiceId` and any offer/payment detail sub-routes could not be exercised. Additional list "filter" query routes may appear once data grows.
- **Unsafe controls:** All create/save/delete/export/security controls were skipped, so any routes reachable *only* after such an action (e.g., a post-save confirmation page) are unmapped.
- **SPA / no anchors:** Because there are no `href`s, routes exist only as JS navigations; any route not linked from the visible UI for this role/plan is not discoverable without guessing (explicitly avoided).
- **Drawers/modals:** Help center, notifications, global search, and the configuration guide are overlays without their own URLs, so their internal items are not routes.

## Deduplicated URL Index

Sorted by application section, alphabetical within section.

**Core**
- `https://app.proferto.io/dashboard`  *(also target of `/` redirect)*

**Sales / Records**
- `https://app.proferto.io/clients`
- `https://app.proferto.io/clients/:clientId`  *(route pattern)*
- `https://app.proferto.io/projects`
- `https://app.proferto.io/projects/:projectId/configure`  *(route pattern)*

**Finance**
- `https://app.proferto.io/finance`  *(plan-gated)*
- `https://app.proferto.io/invoices`
- `https://app.proferto.io/invoices/:invoiceId`  *(route pattern — unverified)*

**Operations (plan-gated)**
- `https://app.proferto.io/jobs`
- `https://app.proferto.io/monitoring`
- `https://app.proferto.io/stock`

**Resources (plan-gated)**
- `https://app.proferto.io/assets`
- `https://app.proferto.io/documents`
- `https://app.proferto.io/workers`

**Systems / Catalog**
- `https://app.proferto.io/pricing`
- `https://app.proferto.io/pricing?tab=accessories`
- `https://app.proferto.io/pricing?tab=door-panels`
- `https://app.proferto.io/pricing?tab=doors`
- `https://app.proferto.io/pricing?tab=expansion-profiles`
- `https://app.proferto.io/pricing?tab=glass`
- `https://app.proferto.io/pricing?tab=mechanisms`
- `https://app.proferto.io/pricing?tab=metals`
- `https://app.proferto.io/pricing?tab=production`
- `https://app.proferto.io/pricing?tab=roleta`

**Settings & Security**
- `https://app.proferto.io/security`
- `https://app.proferto.io/settings`
