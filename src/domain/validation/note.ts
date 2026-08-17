// Shared validation for client notes. Pure and client-safe: the same schema
// powers instant form UX in the browser AND authoritative re-validation on the
// server (via the action spine). No DB / Next / React / Zustand imports (enforced
// by the domain ESLint boundary).
//
// The tenant (organization_id) and the author are NEVER part of the input — they
// come only from the server session.

import { z } from "zod";

export const noteCreateSchema = z.object({
  clientId: z.string().uuid("ID e pavlefshme."),
  text: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Shënimi nuk mund të jetë bosh.").max(2000),
  ),
});

export const noteDeleteSchema = z.object({ id: z.string().uuid("ID e pavlefshme.") });

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
