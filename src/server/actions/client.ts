// Client CRUD action cores. Each composes the Phase 3 spine (createAction):
//   Zod validation -> auth -> trusted active org -> canonical permission
//   -> withOrg RLS transaction -> typed result -> revalidate("/clients").
//
// The tenant is ALWAYS ctx.organizationId (session-derived); any organization id
// in the input is ignored, and RLS is the backstop. These follow the exact
// template proven by updateOrganizationProfile in Phase 3.
//
// Permissions (canonical, from src/auth/permissions.ts): create/update require
// client:write (owner/admin/sales/operator); delete requires client:delete
// (owner/admin only). accounting is read-only for clients.
//
// TRANSITIONAL (Phase 4): projects/invoices/payments/notes are still local. This
// delete removes only the DB client row — it deliberately performs NO
// cross-source cascade into localStorage. Local records that referenced the
// deleted client become inert and disappear naturally as those domains migrate.

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { clients } from "@/db/schema/business";
import { clientCreateSchema, clientUpdateSchema } from "@/domain/validation/client";
import { createAction, fail } from "@/server/action";

const clientDeleteSchema = z.object({ id: z.string().uuid("ID e pavlefshme.") });

export const createClientAction = createAction({
  input: clientCreateSchema,
  permission: { client: ["write"] },
  revalidate: ["/clients"],
  handler: async ({ input, ctx, tx }) => {
    // organization_id comes ONLY from the trusted session context. RLS WITH CHECK
    // additionally rejects any row whose org != app.current_org.
    const rows = await tx
      .insert(clients)
      .values({
        organizationId: ctx.organizationId,
        name: input.name,
        type: input.type,
        // Empty optional fields ("" or omitted) persist as NULL, not "".
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        nui: input.nui || null,
      })
      .returning({ id: clients.id });
    return { id: rows[0].id };
  },
});

export const updateClientAction = createAction({
  input: clientUpdateSchema,
  permission: { client: ["write"] },
  revalidate: ["/clients"],
  handler: async ({ input, ctx, tx }) => {
    // The explicit org predicate is defense-in-depth on top of RLS. Optional
    // fields that were cleared arrive as undefined and are written back as NULL.
    const rows = await tx
      .update(clients)
      .set({
        name: input.name,
        type: input.type,
        // Cleared optional fields ("" or omitted) are written back as NULL.
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        city: input.city || null,
        nui: input.nui || null,
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, input.id), eq(clients.organizationId, ctx.organizationId)))
      .returning({ id: clients.id });

    // 0 rows = nonexistent OR another tenant's row (hidden by RLS). Either way we
    // return NOT_FOUND and disclose nothing about other tenants.
    if (rows.length === 0) throw fail("NOT_FOUND", "Klienti nuk u gjet.");
    return { id: rows[0].id };
  },
});

export const deleteClientAction = createAction({
  input: clientDeleteSchema,
  permission: { client: ["delete"] },
  revalidate: ["/clients"],
  handler: async ({ input, ctx, tx }) => {
    const rows = await tx
      .delete(clients)
      .where(and(eq(clients.id, input.id), eq(clients.organizationId, ctx.organizationId)))
      .returning({ id: clients.id });
    if (rows.length === 0) throw fail("NOT_FOUND", "Klienti nuk u gjet.");
    return { id: rows[0].id };
  },
});
