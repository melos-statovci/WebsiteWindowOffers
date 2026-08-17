// Server-side organization (company) profile READ. The active organization is
// resolved from the Better Auth session (requireAuthContext) — never from client
// input — and the query runs inside a withOrg() RLS-scoped transaction as the
// restricted role, so a caller can only ever read its own tenant's profile row.
//
// The row is mapped to the shared CompanyProfile domain shape so the existing
// settings form, the invoice/print issuer fallback and the configurator's
// VAT/margin defaults keep reading `useStore(s => s.company)` unchanged after the
// migration off localStorage. The organization NAME stays canonical in Better
// Auth (organization.name) and is layered on here from the session — it is never
// duplicated into organization_profiles.

import { eq } from "drizzle-orm";
import { organizationProfiles } from "@/db/schema/business";
import { withOrg } from "@/db/tenant";
import { requireAuthContext } from "@/auth/session";
import type { CompanyProfile } from "@/domain/types";

type ProfileRow = typeof organizationProfiles.$inferSelect;

/** DB profile row (+ the org's canonical name) -> shared CompanyProfile. */
function toCompanyProfile(name: string, row: ProfileRow | undefined): CompanyProfile {
  return {
    name,
    address: row?.address ?? "",
    phone: row?.phone ?? "",
    email: row?.businessEmail ?? "",
    nui: row?.nui ?? "",
    vatNo: row?.vatNo ?? "",
    postalCode: row?.postalCode ?? "",
    city: row?.city ?? "",
    bank: row?.bank ?? "",
    swift: row?.swift ?? "",
    iban: row?.iban ?? "",
    // numeric columns come back as strings from drizzle.
    marginDefault: row ? Number(row.marginDefault) : 0,
    vatDefault: row ? Number(row.vatDefault) : 0,
  };
}

/**
 * The active organization's company profile, RLS-scoped. Returns a fully-formed
 * CompanyProfile (empty strings / zeros for unset fields) even before the user
 * has filled anything in — the profile row is guaranteed to exist by
 * requireAuthContext()'s ensureOrganizationProfile().
 */
export async function getOrganizationProfile(): Promise<CompanyProfile> {
  const { activeOrg } = await requireAuthContext();
  return withOrg(activeOrg.id, async (tx) => {
    const rows = await tx
      .select()
      .from(organizationProfiles)
      .where(eq(organizationProfiles.organizationId, activeOrg.id))
      .limit(1);
    return toCompanyProfile(activeOrg.name, rows[0]);
  });
}
