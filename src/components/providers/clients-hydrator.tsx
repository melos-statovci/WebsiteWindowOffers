"use client";

// Pushes the server-fetched clients of the active organization into the store's
// read-only mirror. This is what lets the still-local domains that only REFERENCE
// clients (project/invoice pickers, global search, dashboard counts) keep reading
// `useStore(s => s.clients)` unchanged while the source of truth is Postgres.
//
// Renders nothing. The mirror is refreshed whenever the server re-renders the
// layout (e.g. after a mutation calls router.refresh()).

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { Client } from "@/domain/types";

export function ClientsHydrator({ clients }: { clients: Client[] }) {
  const setClients = useStore((s) => s.setClients);
  useEffect(() => {
    setClients(clients);
  }, [clients, setClients]);
  return null;
}
