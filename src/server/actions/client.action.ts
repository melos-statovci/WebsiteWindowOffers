"use server";

// Public "use server" entry points for client CRUD — the client-callable Next.js
// server actions. They accept only the validated input shape; request headers
// (and therefore the session / active organization) are read server-side and can
// never be supplied by the caller. Mirrors the Phase 3 wrapper template.

import { headers } from "next/headers";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/server/actions/client";
import type { ClientCreateInput, ClientUpdateInput } from "@/domain/validation/client";

export async function createClient(input: ClientCreateInput) {
  return createClientAction(input, await headers());
}

export async function updateClient(input: ClientUpdateInput) {
  return updateClientAction(input, await headers());
}

export async function deleteClient(input: { id: string }) {
  return deleteClientAction(input, await headers());
}
