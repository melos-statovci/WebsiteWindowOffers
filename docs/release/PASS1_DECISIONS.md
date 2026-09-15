# Pass 1 decisions

## RC-06/07 provisioning design — approved and implemented

Preserve Better Auth as the organization/membership provider, existing Platform Admin approval and restricted runtime/RLS. Add nullable organization columns `provisioning_application_id` (unique) and `provisioning_owner_id`. They are provider schema fields with client input disabled, and are set at initial organization insertion by the supported beforeCreateOrganization hook only after verifying the approved application belongs to the server-supplied user. Public organization creation remains disabled. Display slug/metadata edits cannot change these dedicated fields.

Retry first validates an existing application.organization_id against both immutable columns. Without a link, it searches by the unique application reference, never adopts by display slug, and creates through the trusted provider only if absent. A slug collision with unrelated data fails safely. The unique reference makes parallel creation converge even before application linkage. Completion repairs a missing intended-owner membership only when the immutable reference/owner match the approved application; a conflicting existing role/owner fails rather than transferring ownership. Add unique member(organization_id,user_id) after checking existing duplicates; do not silently delete/deduplicate existing memberships.

Forward migration 0022 backfills only already-linked approved applications, adds the nullable columns, partial unique application-reference index and unique membership index; no historical migration edits, role changes, BYPASSRLS or SECURITY DEFINER. Preflight found zero duplicate membership pairs and zero unlinked legacy crash rows in guarded DEVELOPMENT. The reviewed SQL was applied only to guarded Neon DEVELOPMENT. Tests cover all requested failure windows and direct attempts to forge/update immutable fields.

Better Auth 1.6.27 `additionalFields` declare both identities with `input:false` and `returned:false`. A trusted `AsyncLocalStorage` context supplies them only inside the installed provider's `beforeCreateOrganization` hook, which verifies the server-selected creator matches the intended owner and places them in the initial organization INSERT. The provider's server-only `addMember` path performs repair. The installed Drizzle adapter supports `transaction:true`, but the installed organization-create route does not wrap its complete org/member sequence in that transaction primitive, so adapter transaction mode remains unchanged; durable identity/recovery provides the guarantee.

## RC-11 evidence and product choice

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

Exact product decision requested: approve option A for this pass, or leave RC-11 OPEN until an authoritative formula is supplied. No inferred formula will be implemented.

## RC-12 payment operation design proposed for approval

Add `payment_operations` with organization_id, operation_key UUID, request_hash, result JSON and created_at timestamptz; unique (organization_id,operation_key), organization FK cascade, FORCE RLS using the existing transaction-local app.current_org pattern. Runtime receives only SELECT/INSERT on receipts. No stored raw payment payload/customer values: hash the validated normalized operation payload including its kind.

Within the same existing RLS payment transaction, serialize by organization/key, read any receipt, return its original result for the same hash or return CONFLICT for different input. Without a receipt, execute the existing payment rules unchanged and insert its successful result atomically. Rollback leaves neither payment nor receipt. Receipts remain after explicit payment deletion so retry cannot resurrect a reversed receipt. Distinct keys preserve two legitimate equal payments. No balance/credit/rounding/permission policy is changed by this wrapper.

Require keys for partial and advance payments; generate once per new modal operation and preserve across retries. Full settlement keeps its existing balance-lock/idempotent behavior. Add forward migration (0022+), apply only to guarded DEV after reviewing SQL, and test duplicate/retry/conflicting/parallel/cross-tenant behavior. This is the implementation of the user's requested durable idempotency, not a new accounting model, but automatic approval review has separately requested explicit design approval under the financial-semantics stop rule.


## RC-02 additional raw-provider lifecycle control — awaiting approval

Automatic approval review separately rejected adding the existing missing/suspended/expired account gate to Better Auth `beforeUpdateOrganization`, `beforeRemoveMember`, `beforeUpdateMemberRole`, `beforeCreateInvitation`, `beforeAcceptInvitation`, `beforeRejectInvitation`, and `beforeCancelInvitation` hooks. The `/organization/leave` route skips the remove-member hook in 1.6.27, so it needs a path-specific supported auth `before` middleware gate. Provider role/membership/last-owner checks remain in place. The server-only add-member and trusted creation paths remain available to provisioning; no browser-supplied owner override is introduced.

Deletion refusal is already applied using `disableOrganizationDeletion:true` and tested through HTTP. The additional lifecycle hooks above are NOT applied. The installed Drizzle adapter supports `transaction:true`, but it defaults false and is not a substitute for durable provisioning recovery. No transaction/trust/schema change has been silently applied.

RC-06/07 received explicit approval and are implemented. RC-02 broader lifecycle hooks and RC-12 payment receipts remain unapplied decisions. RC-11 separately needs the product choice to disable unsupported editors or supply authoritative pricing semantics.
