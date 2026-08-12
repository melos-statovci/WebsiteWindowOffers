// Pricing save action core. Composes the Phase 3 spine (createAction):
//   Zod validation (authoritative) -> auth -> trusted active org -> canonical
//   pricing:edit permission -> withOrg RLS transaction -> typed result ->
//   revalidate("/pricing").
//
// A save NEVER mutates an existing version. It appends a NEW immutable version
// and flips which one is active, all in one transaction, so historical pricing
// is retained unchanged and Phase 6 can reproduce any past price.
//
// Concurrency: a per-organization transaction-scoped advisory lock serializes
// concurrent saves for the same org, so version numbering and the single-active
// invariant can never be corrupted by a race. The DB constraints
// (UNIQUE(org,version) + the partial-unique active index) are the hard backstop.
// An optional `baseVersion` gives the editor optimistic-concurrency: if the
// active version moved on since it was loaded, the save is rejected as CONFLICT
// instead of silently clobbering a newer edit.

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { priceLists } from "@/db/schema/business";
import { pricingCatalogSchema } from "@/domain/validation/pricing";
import { PRICING_CALCULATION_VERSION } from "@/domain/configurator/window-calc";
import { ensureActivePriceList } from "@/server/pricing-init";
import { createAction, fail } from "@/server/action";

const savePricingSchema = z.object({
  catalog: pricingCatalogSchema,
  /** Optional optimistic-concurrency token: the version the editor loaded. */
  baseVersion: z.number().int().positive().optional(),
});

export type SavePricingInput = z.infer<typeof savePricingSchema>;

export const savePricingAction = createAction({
  input: savePricingSchema,
  permission: { pricing: ["edit"] },
  revalidate: ["/pricing"],
  handler: async ({ input, ctx, tx }) => {
    const orgId = ctx.organizationId;

    // Serialize saves per organization: a concurrent save for the same org waits
    // here until this transaction commits/rolls back, so the read-modify-append
    // below is race-free. Transaction-scoped => auto-released, never leaks.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('price_lists'), hashtext(${orgId}))`,
    );

    // Make sure a baseline version exists (a fresh org may never have read
    // pricing yet), then read the current active version under the lock.
    await ensureActivePriceList(tx, orgId, ctx.userId);
    const activeRows = await tx
      .select({ version: priceLists.version })
      .from(priceLists)
      .where(and(eq(priceLists.organizationId, orgId), eq(priceLists.isActive, true)))
      .orderBy(desc(priceLists.version))
      .limit(1);
    const currentVersion = activeRows[0]?.version ?? 0;

    // Optimistic concurrency: reject a stale edit rather than overwrite a newer
    // one. Omitting baseVersion opts out (last-write-wins).
    if (input.baseVersion !== undefined && input.baseVersion !== currentVersion) {
      throw fail(
        "CONFLICT",
        "Çmimet u ndryshuan nga dikush tjetër. Rifreskoni dhe provoni sërish.",
      );
    }

    const nextVersion = currentVersion + 1;

    // 1) Archive the currently-active version. Must happen BEFORE the insert, or
    //    the new active row would collide with the partial-unique active index.
    await tx
      .update(priceLists)
      .set({ isActive: false })
      .where(and(eq(priceLists.organizationId, orgId), eq(priceLists.isActive, true)));

    // 2) Append the new active version. organization_id comes ONLY from the
    //    trusted session; RLS WITH CHECK rejects anything else.
    const inserted = await tx
      .insert(priceLists)
      .values({
        organizationId: orgId,
        version: nextVersion,
        isActive: true,
        catalog: input.catalog,
        calculationVersion: PRICING_CALCULATION_VERSION,
        createdByUserId: ctx.userId,
      })
      .returning({ id: priceLists.id, version: priceLists.version });

    return { priceListId: inserted[0].id, version: inserted[0].version };
  },
});
