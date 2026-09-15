# Pass 1 decisions

## RC-06/07 provisioning design — approved and implemented

Preserve Better Auth as the organization/membership provider, existing Platform Admin approval and restricted runtime/RLS. Add nullable organization columns `provisioning_application_id` (unique) and `provisioning_owner_id`. They are provider schema fields with client input disabled, and are set at initial organization insertion by the supported beforeCreateOrganization hook only after verifying the approved application belongs to the server-supplied user. Public organization creation remains disabled. Display slug/metadata edits cannot change these dedicated fields.

Retry first validates an existing application.organization_id against both immutable columns. Without a link, it searches by the unique application reference, never adopts by display slug, and creates through the trusted provider only if absent. A slug collision with unrelated data fails safely. The unique reference makes parallel creation converge even before application linkage. Completion repairs a missing intended-owner membership only when the immutable reference/owner match the approved application; a conflicting existing role/owner fails rather than transferring ownership. Add unique member(organization_id,user_id) after checking existing duplicates; do not silently delete/deduplicate existing memberships.

Forward migration 0022 backfills only already-linked approved applications, adds the nullable columns, partial unique application-reference index and unique membership index; no historical migration edits, role changes, BYPASSRLS or SECURITY DEFINER. Preflight found zero duplicate membership pairs and zero unlinked legacy crash rows in guarded DEVELOPMENT. The reviewed SQL was applied only to guarded Neon DEVELOPMENT. Tests cover all requested failure windows and direct attempts to forge/update immutable fields.

Better Auth 1.6.27 `additionalFields` declare both identities with `input:false` and `returned:false`. A trusted `AsyncLocalStorage` context supplies them only inside the installed provider's `beforeCreateOrganization` hook, which verifies the server-selected creator matches the intended owner and places them in the initial organization INSERT. The provider's server-only `addMember` path performs repair. The installed Drizzle adapter supports `transaction:true`, but the installed organization-create route does not wrap its complete org/member sequence in that transaction primitive, so adapter transaction mode remains unchanged; durable identity/recovery provides the guarantee.

## RC-11 launch pricing contract — option A approved and implemented

Reviewed current engine/editor/defaults, history commits 570d5f9/7d82565/cb26939 and repository reference `docs/research/kornizo/PRODUCT_CONFIGURATOR.md`. The reference explicitly states exact production coefficients were not observable and the calculator was approximated. No authoritative manufacturing/pricing formula is documented for the unused controls.

| Editable area | Current values/examples | Actual calculation |
|---|---|---|
| Systems | name/brand/material/category; PVC/ALU | Selected system material controls PVC armoring; name/brand/category are descriptive/selection metadata |
| Profile rows/colors | Ram/Krah/T first matched rows, plus additional rows | Only first matching Ram, Krah, T row/color values used; other editable row prices unused |
| Metals/arming | Metal catalog 3.2/3.8/4.5; arming rows 3.2/3.6/4.1/1.9 | Only first Armim Ram price used; other entries unused |
| Mechanisms | editable hardware parameter keys `_hw*` | Fixed 15 + perimeter*8 and handle 8; edited parameters ignored |
| Glass | 34/58.5 per m² | Selected glass used for glass products and applicable glass-door contribution |
| Panels | 120/165 per m² | Fixed 90/m² instead; ignored |
| Expansion catalog | 20/40mm, 2.4/3.6 per metre | Fixed area/edge coefficients 350/20; catalog ignored |
| Accessories | window handle4.5, beads0.8/1.2, T connector2.1, threshold18, handle12.5, lock22, hinges3.4 | Only named bead parameters used; others ignored |
| Production | welding3%, profile6.5m, metal6m, edge3mm, saw4mm, trim10mm, waste300mm, labor12/h,25min, overhead8% | Entire map ignored; fixed labor5.145 per metre |
| Roller shutters | first white45/m², second anthracite52/m² | Only first row used, plus fixed65 and width14 for standalone; later rows ignored |
| Door models | FIKS620/540; TABELË780 | Model table ignored; fixed door base60/40 plus panel/geometry contributions |

Plausible alternatives: (A) retain only existing supported controls, disable/remove unused editors and explain their unsupported status, without changing calculation/version/history; (B) provide an approved full mapping/formula, units, selection rules, margins/labor/rounding and examples, then implement/version it in a separate authorized decision. Do not guess that FIKS means add vs replace total, how panel selection maps to doorModel, which waste factors combine, or how roleta colors are selected.

Option A was approved for launch. The tenant editor now exposes only the controls below; no inferred formula was implemented and calculation contract version 1 is unchanged.

| UI category | Persisted data | Calculation consumer / applicable path | Launch status and evidence |
|---|---|---|---|
| Systems | `systems[]` | `systemId` selects a catalog system; `material` controls PVC ram armoring. `category` controls which systems are offered for window/door/sliding configurations. | **SUPPORTED EDITABLE.** System catalog metadata remains editable because it identifies and routes selectable systems; material sensitivity is covered on an applicable window. |
| Profile rows / colors | `profilePriceRows[]` | First matching `Ram`, `Krah`, and `T-` rows; `white`, `whiteColor`, `colorColor` selected by profile color. | **PARTIALLY SUPPORTED.** Only those three consumed rows are shown. Sensitivity covers all nine visible price cells on fixed, opening-sash, and divided-window paths. Additional rows remain stored and hidden. |
| Armoring | `metals[]`, `armingRows[]` | First matching `Armim Ram` price, only for a selected PVC system. | **PARTIALLY SUPPORTED.** Only `Armim Ram.price` is editable and sensitivity-tested. The unused metal catalog and other armoring rows remain stored and hidden. |
| Mechanisms | legacy `_hw*` keys in `accessoryParams`; mechanism matrices are UI-only | Current engine uses fixed `MECH_BASE`, `MECH_PER_M`, and `HANDLE_PRICE`; `mechanismId` does not select a price table. | **REMOVED.** No active editor or navigation entry; legacy values are preserved and server saves reject their replacement by merging the current stored values. No formula invented. |
| Glass | `glass[]` (`id`, name/brand/description, `price`) | Selected `glassId`; glazed window/sliding area and the applicable glass-door contribution. | **SUPPORTED EDITABLE.** Every catalog row can be selected; each current row has sensitivity coverage on a glazed window. |
| Panels | `panels[]` | No consumer; engine uses fixed `PANEL_PRICE`. | **REMOVED.** Data preserved, direct submitted replacements ignored, no formula invented. |
| Expansion catalog | `expansions[]` | No catalog consumer; configured bands use fixed area/edge constants. | **REMOVED.** Data preserved, direct submitted replacements ignored, no formula invented. |
| Glass beads | `accessoryParams["Llajsne bardhë (€/m)"]`, `accessoryParams["Llajsne color (€/m)"]` | Bead perimeter on white vs colored applicable glazed/door paths. | **PARTIALLY SUPPORTED.** Only these two keys are editable and sensitivity-tested. All other accessory keys remain stored and hidden. |
| Production | `productionParams` | No consumer; labor remains the existing fixed coefficient. | **REMOVED.** Data preserved, direct submitted replacements ignored, no formula invented. |
| Roller shutters | `roletaVersions[]` | First row `pricePerM2` for standalone and attached shutter paths. | **PARTIALLY SUPPORTED.** Only the first rate is editable and sensitivity-tested. Later rows remain stored and hidden. |
| Door models | `doorModels[]` | No consumer; engine uses existing fixed door bases and geometry/panel contributions. | **REMOVED.** Data preserved, direct submitted replacements ignored, no formula invented. |

The server action validates the complete compatibility schema, then overlays only the launch-supported fields on the current active catalog. Consequently a bypass request cannot mutate hidden unsupported pricing values, while ordinary supported saves do not erase them. Existing versions, accepted offers, invoice snapshots, project prices, default stored compatibility data, and historical calculations are not rewritten. No migration is required.

## RC-12 payment operation design — approved and implemented

Migration 0023 adds `payment_operations` with organization ID, operation-key UUID, operation type, SHA-256 request hash, bare payment ID, minimal optional invoice replay fields and `created_at timestamptz`; unique `(organization_id,operation_key)`, organization FK cascade, ENABLE/FORCE RLS using the existing transaction-local `app.current_org` pattern. Runtime receives only SELECT/INSERT. The payment ID deliberately has no payment FK, so later payment deletion leaves the receipt intact. No raw payload or customer PII is stored.

After server validation, invoice fingerprints are the SHA-256 of an ordered tuple `(INVOICE_PAYMENT, lower-case invoice UUID, cent-normalized amount, date, trimmed method, normalized note-or-null, allowCredit-or-false)`. Advance fingerprints use `(ADVANCE_PAYMENT, lower-case client UUID, cent-normalized amount, date, trimmed method, normalized note-or-null)`. This stable representation excludes arbitrary client JSON and includes the command kind.

Within the existing RLS transaction, `pg_advisory_xact_lock(hashtext(organization_id),hashtext(operation_key))` serializes matching requests, while the tenant/key unique constraint remains the durable backstop. A matching receipt replays the original minimal result if the payment exists; a mismatched hash/type returns `CONFLICT`. A missing payment returns the explicit `PAYMENT_REMOVED` tombstone and never reruns the command. Payment and receipt commit or roll back together. Distinct keys preserve two legitimate equal payments. No balance, credit, rounding, authorization or invoice-lock rule changed.

Partial and advance payment inputs require the key. The browser generates it once when a new payment modal interaction opens, retains it across repeated handlers and ambiguous network failures, and discards it only when that interaction closes. Full settlement remains on its existing invoice-row lock and settle-the-current-remainder behavior: it already converges repeated/concurrent clicks and adding a client key would not improve its accounting invariant. The 25-test focused suite and 334-test full DB gate prove the requested retry, conflict, concurrency, cross-tenant, rollback, deletion and RLS cases. Migration 0023 was reviewed, guarded by the approved Neon DEVELOPMENT fingerprint, applied there only, and verified live. Production was untouched.


## RC-02 additional raw-provider lifecycle control — awaiting approval

Automatic approval review separately rejected adding the existing missing/suspended/expired account gate to Better Auth `beforeUpdateOrganization`, `beforeRemoveMember`, `beforeUpdateMemberRole`, `beforeCreateInvitation`, `beforeAcceptInvitation`, `beforeRejectInvitation`, and `beforeCancelInvitation` hooks. The `/organization/leave` route skips the remove-member hook in 1.6.27, so it needs a path-specific supported auth `before` middleware gate. Provider role/membership/last-owner checks remain in place. The server-only add-member and trusted creation paths remain available to provisioning; no browser-supplied owner override is introduced.

Deletion refusal is already applied using `disableOrganizationDeletion:true` and tested through HTTP. The additional lifecycle hooks above are NOT applied. The installed Drizzle adapter supports `transaction:true`, but it defaults false and is not a substitute for durable provisioning recovery. No transaction/trust/schema change has been silently applied.

RC-06/07, RC-11, and RC-12 received explicit approval and are implemented. RC-02 broader lifecycle hooks remain unapplied.
