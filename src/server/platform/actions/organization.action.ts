"use server";

// Public "use server" entry points for the platform mutations. Headers (and thus
// the session + platform-admin check) are read server-side and can never be
// supplied by the client. Each re-runs the full platform authorization spine.
// Revalidation of the affected platform paths happens here (needs request scope).

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  setPlanAction,
  setStatusAction,
  setInternalNoteAction,
} from "@/server/platform/actions/organization";
import type {
  SetPlanInput,
  SetStatusInput,
  SetInternalNoteInput,
} from "@/domain/validation/platform";

function revalidateOrg(orgId: string) {
  try {
    revalidatePath("/platform");
    revalidatePath("/platform/organizations");
    revalidatePath(`/platform/organizations/${orgId}`);
  } catch {
    /* not in a request scope */
  }
}

export async function setOrganizationPlan(input: SetPlanInput) {
  const res = await setPlanAction(input, await headers());
  if (res.ok) revalidateOrg(input.organizationId);
  return res;
}

export async function setOrganizationStatus(input: SetStatusInput) {
  const res = await setStatusAction(input, await headers());
  if (res.ok) revalidateOrg(input.organizationId);
  return res;
}

export async function setOrganizationInternalNote(input: SetInternalNoteInput) {
  const res = await setInternalNoteAction(input, await headers());
  if (res.ok) revalidateOrg(input.organizationId);
  return res;
}
