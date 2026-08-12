"use server";

// Auth-specific server actions (organization switch / create). These are NOT the
// Phase 3 business-CRUD action spine — they exist so the client can switch/create
// organizations through server-verified Better Auth membership logic, never by
// trusting a client-supplied organization id.

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { ensureOrganizationProfile, isUuid } from "@/auth/organization";
import type { OrgSummary } from "@/auth/types";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

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

/** Create a new organization (caller becomes owner), make it active, ensure profile. */
export async function createAndActivateOrganization(name: string): Promise<AuthActionResult> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { ok: false, error: "Nuk jeni i kyçur." };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "Emri i organizatës është shumë i shkurtër." };

  try {
    const org = await auth.api.createOrganization({
      headers: h,
      body: { name: trimmed, slug: slugify(trimmed) },
    });
    if (!org) return { ok: false, error: "Krijimi i organizatës dështoi." };
    await auth.api.setActiveOrganization({ headers: h, body: { organizationId: org.id } });
    await ensureOrganizationProfile(org.id).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Krijimi i organizatës dështoi." };
  }
}
