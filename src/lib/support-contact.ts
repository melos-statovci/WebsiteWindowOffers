// Single source of truth for how a customer reaches Kornizo.
//
// ── WHY THERE IS NO DEFAULT ADDRESS ─────────────────────────────────────────
// Until Milestone 5.5 this module defaulted to `info@arios.systems`, the
// address the application had shipped with. That is the vendor's own mailbox,
// not a Kornizo support identity, and Kornizo must not present it publicly as
// one. It has been removed.
//
// Nothing replaced it, because Kornizo's final domain has NOT been chosen, and
// inventing `support@kornizo.com` / `hello@kornizo.app` / anything similar
// would put an address we do not own in front of customers.
//
// So the contract is:
//
//   KORNIZO_SUPPORT_EMAIL set    -> use it (mailto links, "write to us at …")
//   KORNIZO_SUPPORT_EMAIL unset  -> use /contact, the real, working contact page
//
// Callers pick the shape they need:
//   * configuredSupportEmail() -> string | null. Use when the UI must decide
//     whether to render an address AT ALL. Never renders "undefined", an empty
//     mailto, or a fake address.
//   * supportContactHref()     -> always a working href: a mailto: when
//     configured, otherwise the locale-correct /contact path.
//
// ── REMAINING LAUNCH DECISION (see KORNIZO_LAUNCH_HANDOFF.md) ───────────────
// Whether Kornizo gets its own support mailbox on the production domain, and
// what that address is, is a BUSINESS decision no code can make. Setting the
// environment variable is the whole switch; /contact works either way.
//
// Deliberately NOT here: a phone number, postal address, company registration
// number or response-time promise. None is configured anywhere in this project,
// and inventing them on a customer-facing or legal page would be a lie.

function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The configured support address, or null when none is configured.
 *
 * Read at call time rather than captured at module load, so a dynamically
 * rendered page picks up the deployed environment on every request.
 *
 * CAVEAT, verified against the build output: the public homepage and the legal
 * routes are STATICALLY PRERENDERED, so for those pages "call time" is build
 * time and the result is baked into the prerendered HTML. That is acceptable —
 * changing a deployment environment variable requires a redeploy anyway — but
 * it does mean the value cannot change on a live deployment without a rebuild.
 */
export function configuredSupportEmail(): string | null {
  const value = readEnv("KORNIZO_SUPPORT_EMAIL");
  if (!value) return null;
  // A malformed value must not become a broken mailto link. Deliberately a
  // shape check, not RFC-5322 validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

/** The public contact page for a locale. Albanian is the default locale. */
export function contactPath(locale: "sq" | "en" = "sq"): string {
  return locale === "en" ? "/en/contact" : "/contact";
}

/**
 * A href that always works: `mailto:` when an address is configured, otherwise
 * the contact page. Use this wherever a customer must be able to reach Kornizo
 * and the UI does not care which channel it is.
 */
export function supportContactHref(locale: "sq" | "en" = "sq"): string {
  const email = configuredSupportEmail();
  return email ? `mailto:${email}` : contactPath(locale);
}

/** True when no support address is configured and /contact is the channel. */
export function usesContactPageFallback(): boolean {
  return configuredSupportEmail() === null;
}
