"use client";

// Pushes the server-fetched client notes of the active organization into the
// store's read-only mirror. This is what lets the client-detail "Shënime" tab
// keep reading `useStore(s => s.notes)` unchanged while the source of truth is
// Postgres. Notes are now shared across same-org members.
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout (e.g. after add/delete calls router.refresh()).

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Note } from "@/domain/types";

export function NotesHydrator({ notes }: { notes: Note[] }) {
  const setNotes = useStore((s) => s.setNotes);
  useEffect(() => {
    setNotes(notes);
  }, [notes, setNotes]);
  return null;
}
