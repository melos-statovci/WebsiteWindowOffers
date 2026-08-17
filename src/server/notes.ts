// Server-side note READS. The active organization is resolved from the Better
// Auth session (requireAuthContext) — never from client input — and the query
// runs inside a withOrg() RLS-scoped transaction as the restricted role, so a
// caller can only ever see its own tenant's notes. Rows are mapped to the shared
// domain Note shape so the existing client-detail UI is unchanged by the migration
// off localStorage.

import { desc, eq } from "drizzle-orm";
import { notes } from "@/db/schema/business";
import { withOrg } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import type { Note } from "@/domain/types";

type NoteRow = typeof notes.$inferSelect;

/** DB row -> shared domain Note (empty author collapses to undefined). */
function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    clientId: row.clientId,
    text: row.text,
    at: row.createdAt.toISOString().slice(0, 10),
    authorName: row.authorName || undefined,
  };
}

/** All notes of the caller's active organization, newest first. */
export async function listNotes(): Promise<Note[]> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select()
      .from(notes)
      .where(eq(notes.organizationId, activeOrg.id))
      .orderBy(desc(notes.createdAt));
    return rows.map(toNote);
  });
}
