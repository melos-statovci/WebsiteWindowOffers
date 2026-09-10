// Single source of truth for how a customer reaches Kornizo.
//
// WHY THIS FILE EXISTS
// The same address was hard-coded in five separate places (/suspended,
// /account-not-ready, tenant settings, and both locales of the application
// status page). A launch needs ONE contact that can be repointed without a code
// hunt, and the public site needed a contact at all — it previously had none.
//
// NOTHING HERE IS INVENTED. `info@arios.systems` is the address the application
// already showed to customers before Milestone 5; it is kept as the default so
// behaviour does not silently change. It is NOT asserted to be a dedicated
// customer-support mailbox.
//
// ── REMAINING LAUNCH DECISION (see KORNIZO_LAUNCH_HANDOFF.md) ────────────────
// Whether `info@arios.systems` is the final customer-facing support address, or
// whether Kornizo gets its own (e.g. a support@ mailbox on the production
// domain), is a BUSINESS decision that has not been made. Nothing in this
// repository can decide it. When it is decided, set KORNIZO_SUPPORT_EMAIL in
// the deployment environment — no code change is required.
//
// Deliberately NOT here: a phone number, a postal address, a company
// registration number and an SLA/response-time promise. None of those are
// configured anywhere in this project, and inventing them on a public contact
// or legal page would be a lie told to customers.

/** The address shipped before Milestone 5; kept so behaviour is unchanged. */
const DEFAULT_SUPPORT_EMAIL = "info@arios.systems";

function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The support address to show customers.
 *
 * Read at call time rather than at module load: this module is imported by
 * Server Components, and a build-time snapshot would bake the build machine's
 * environment into the bundle.
 */
export function supportEmail(): string {
  return readEnv("KORNIZO_SUPPORT_EMAIL") ?? DEFAULT_SUPPORT_EMAIL;
}

/** `mailto:` href for {@link supportEmail}. */
export function supportMailto(): string {
  return `mailto:${supportEmail()}`;
}

/**
 * True when the address is still the inherited default rather than a
 * deliberately configured one. Used only by docs/tests to keep the open launch
 * decision visible; never shown to a customer.
 */
export function supportEmailIsDefault(): boolean {
  return readEnv("KORNIZO_SUPPORT_EMAIL") === null;
}
