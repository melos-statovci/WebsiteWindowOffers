// Pure helpers shared by trial-application provisioning.
//
// Dependency-free and NOT a client module, so both Server Components and
// "use client" components can import from here. stableProvisioningSlug() is the
// exactly-once key for tenant creation (organization.slug is UNIQUE), so it is
// worth being able to test its determinism offline, without a database.

export function organizationSlugBase(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * A STABLE organization slug for one acquisition record. Deterministic in the
 * record's id, so recomputing it after a crash yields the same value and the
 * UNIQUE constraint on organization.slug makes double-creation impossible.
 */
export function stableProvisioningSlug(name: string, recordId: string): string {
  const suffix = recordId.replace(/-/g, "").slice(0, 8);
  return `${organizationSlugBase(name) || "org"}-${suffix}`.slice(0, 48);
}

/**
 * Operator-facing wording for the sanitized provisioning failure CATEGORIES.
 * The operator never sees a raw Better Auth/Postgres error — only these.
 */
const FAILURE_TEXT: Record<string, string> = {
  ORGANIZATION_CREATE_FAILED: "Organizata nuk u krijua.",
  LINK_CONFLICT: "Aplikimi është tashmë i lidhur me një organizatë tjetër.",
  OWNER_MEMBERSHIP_MISSING: "Pronari nuk u shtua në organizatë.",
  PROFILE_MISSING: "Profili i kompanisë nuk u krijua.",
  ACCOUNT_MISSING: "Llogaria e Kornizo Standard nuk u krijua.",
  PRICING_MISSING: "Çmimorja fillestare nuk u krijua.",
  UNEXPECTED: "Provizionimi dështoi.",
};

export function provisioningFailureText(code: string | null | undefined): string {
  if (!code) return FAILURE_TEXT.UNEXPECTED;
  return FAILURE_TEXT[code] ?? FAILURE_TEXT.UNEXPECTED;
}
