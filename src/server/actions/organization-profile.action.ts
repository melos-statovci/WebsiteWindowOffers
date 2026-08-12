"use server";

// Public "use server" entry point for the reference action — the client-callable
// Next.js server action. It only accepts the validated input shape; request
// headers (and therefore the session/active-org) are read server-side and can
// never be supplied by the client. This is the exact wrapper Phase 4 business
// actions will replicate.

import { headers } from "next/headers";
import { updateOrganizationProfileAction } from "@/server/actions/organization-profile";
import type { OrganizationProfileUpdate } from "@/domain/validation/organization-profile";

export async function updateOrganizationProfile(input: OrganizationProfileUpdate) {
  return updateOrganizationProfileAction(input, await headers());
}
