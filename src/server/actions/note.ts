// Client-note action cores. Each composes the Phase 3 spine (createAction):
//   Zod validation -> auth -> trusted active org -> canonical permission
//   -> withOrg RLS transaction -> typed result -> revalidate("/clients").
//
// The tenant is ALWAYS ctx.organizationId (session-derived); any organization id
// in the input is ignored, and RLS is the backstop. The author is snapshotted
// from the trusted session (ctx.user) so the note keeps showing who wrote it.
//
// Permissions: create/delete require client:write (owner/admin/sales/operator) —
// the same people who manage clients manage their notes. accounting is read-only.

import { and, eq } from "drizzle-orm";
import { notes } from "@/db/schema/business";
import { noteCreateSchema, noteDeleteSchema } from "@/domain/validation/note";
import { createAction, fail } from "@/server/action";

export const createNoteAction = createAction({
  input: noteCreateSchema,
  permission: { client: ["write"] },
  revalidate: ["/clients"],
  handler: async ({ input, ctx, tx }) => {
    // organization_id + author come ONLY from the trusted session context. The
    // composite FK (organization_id, client_id) -> clients guarantees the note
    // attaches to a client of THIS org; a client_id from another tenant fails it.
    const rows = await tx
      .insert(notes)
      .values({
        organizationId: ctx.organizationId,
        clientId: input.clientId,
        text: input.text,
        authorUserId: ctx.userId,
        authorName: ctx.user.name,
      })
      .returning({ id: notes.id });
    return { id: rows[0].id };
  },
});

export const deleteNoteAction = createAction({
  input: noteDeleteSchema,
  permission: { client: ["write"] },
  revalidate: ["/clients"],
  handler: async ({ input, ctx, tx }) => {
    const rows = await tx
      .delete(notes)
      .where(and(eq(notes.id, input.id), eq(notes.organizationId, ctx.organizationId)))
      .returning({ id: notes.id });
    // 0 rows = nonexistent OR another tenant's row (hidden by RLS). Either way we
    // return NOT_FOUND and disclose nothing about other tenants.
    if (rows.length === 0) throw fail("NOT_FOUND", "Shënimi nuk u gjet.");
    return { id: rows[0].id };
  },
});
