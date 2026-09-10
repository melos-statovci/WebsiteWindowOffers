// Albanian/English wording for the trial lifecycle, in one place so the
// sidebar, the near-expiry notice, the tenant settings panel and the applicant
// status page cannot drift apart.
//
// ALBANIAN GRAMMAR — the reason this file exists rather than template literals
// at each call site:
//
//   * Counting form: "ditë" does not inflect after a numeral, so "1 ditë" and
//     "11 ditë" are both correct. Nothing to special-case.
//   * Ablative form: after "pas" (= "after / in") the noun DOES inflect, and
//     the plural "pas 11 ditësh" must become the singular "pas 1 dite". The
//     pre-Milestone-5 banner said "pas 1 ditësh", which is wrong.
//   * Zero: a valid trial with 0 whole days left has hours, not days, left.
//     "pas 0 ditësh" is both ungrammatical and untrue, so that case gets its
//     own wording ("përfundon brenda ditës" = "ends within the day").
//
// trialDaysRemaining() is a server-authoritative ceil() over
// (trial_ends_at - database now()), so 1 means "less than one day left", not
// "one full day left". The wording below is chosen to stay truthful under that
// definition.

export type TrialLocale = "sq" | "en";

/** "11 ditë" / "1 ditë" / "11 days" / "1 day" — the counting form. */
export function daysCount(days: number, locale: TrialLocale = "sq"): string {
  const n = Math.max(0, Math.trunc(days));
  if (locale === "en") return `${n} ${n === 1 ? "day" : "days"}`;
  return `${n} ditë`;
}

/** "5 ditë të mbetura" / "5 days left" — used where "remaining" is explicit. */
export function daysRemaining(days: number, locale: TrialLocale = "sq"): string {
  const n = Math.max(0, Math.trunc(days));
  if (locale === "en") return `${n} ${n === 1 ? "day" : "days"} left`;
  return `${n} ditë të mbetura`;
}

/**
 * The near-expiry sentence, correctly inflected.
 *
 * sq: 0 -> "Trial i Kornizo Standard përfundon brenda ditës."
 *     1 -> "Trial i Kornizo Standard përfundon pas 1 dite."
 *     n -> "Trial i Kornizo Standard përfundon pas 3 ditësh."
 */
export function trialEndsIn(days: number, locale: TrialLocale = "sq"): string {
  const n = Math.max(0, Math.trunc(days));
  if (locale === "en") {
    if (n === 0) return "Your Kornizo Standard trial ends today.";
    return `Your Kornizo Standard trial ends in ${n === 1 ? "1 day" : `${n} days`}.`;
  }
  if (n === 0) return "Trial i Kornizo Standard përfundon brenda ditës.";
  // Ablative: singular "dite", plural "ditësh".
  return `Trial i Kornizo Standard përfundon pas ${n === 1 ? "1 dite" : `${n} ditësh`}.`;
}

/**
 * The compact sidebar access line: "Trial · 11 ditë" while the trial is valid,
 * "Klient aktiv" once the customer has been activated.
 *
 * `nearExpiry` is exposed so the caller can make the same text more prominent
 * near the end of the trial WITHOUT changing what it says — the trial keeps
 * full functionality until it actually expires.
 */
export function accessLine(input: {
  effectiveCommercialAccess: string;
  trialDaysRemaining: number;
  locale?: TrialLocale;
}): { text: string; nearExpiry: boolean } {
  const locale = input.locale ?? "sq";
  if (input.effectiveCommercialAccess !== "trial") {
    return { text: locale === "en" ? "Active customer" : "Klient aktiv", nearExpiry: false };
  }
  return {
    text: `Trial · ${daysCount(input.trialDaysRemaining, locale)}`,
    nearExpiry: input.trialDaysRemaining <= NEAR_EXPIRY_DAYS,
  };
}

/** A trial is "near expiry" at 3 or fewer whole days left. */
export const NEAR_EXPIRY_DAYS = 3;
