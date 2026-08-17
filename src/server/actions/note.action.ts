"use server";

// Public "use server" entry points for client-note CRUD — the client-callable
// Next.js server actions. They accept only the validated input shape; request
// headers (and therefore the session / active organization / author) are read
// server-side and can never be supplied by the caller.

import { headers } from "next/headers";
import { createNoteAction, deleteNoteAction } from "@/server/actions/note";
import type { NoteCreateInput } from "@/domain/validation/note";

export async function createNote(input: NoteCreateInput) {
  return createNoteAction(input, await headers());
}

export async function deleteNote(input: { id: string }) {
  return deleteNoteAction(input, await headers());
}
