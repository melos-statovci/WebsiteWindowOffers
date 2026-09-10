"use server";

// Auth-specific server actions (organization switch / create). These are NOT the
// Phase 3 business-CRUD action spine — they exist so the client can switch/create
// organizations through server-verified Better Auth membership logic, never by
// trusting a client-supplied organization id.

import { headers } from "next/headers";
import { auth } from "@/auth";
import { isUuid } from "@/auth/organization";
import type { OrgSummary } from "@/auth/types";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

/** Switch active organization — only if the signed-in user is actually a member. */
export async function switchOrganization(organizationId: string): Promise<AuthActionResult> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { ok: false, error: "Nuk jeni i kyçur." };
  if (!isUuid(organizationId)) return { ok: false, error: "ID e organizatës e pavlefshme." };

  const orgs = (await auth.api.listOrganizations({ headers: h })) as OrgSummary[];
  if (!orgs.some((o) => o.id === organizationId)) {
    return { ok: false, error: "Nuk jeni anëtar i kësaj organizate." };
  }
  await auth.api.setActiveOrganization({ headers: h, body: { organizationId } });
  return { ok: true };
}
