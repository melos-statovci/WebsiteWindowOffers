// Albanian/Kosovo-style formatting helpers.

export function eur(value: number, opts?: { symbolAfter?: boolean }): string {
  const n = value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return opts?.symbolAfter ? `${n} €` : `€${value.toFixed(2)}`;
}

// "1.234,00 €" style used on invoices/offers
export function eurAfter(value: number): string {
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/** Matches a bare business calendar date, e.g. an invoice `issued_at`. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Render a date for display.
 *
 * Two kinds of value reach this helper and they must NOT be treated alike:
 *
 *   - A BUSINESS CALENDAR DATE ("2026-09-10", from a Postgres `date` column
 *     such as invoices.issued_at / due_at / payments.date). It has no timezone
 *     and must be shown exactly as stored. Passing it through `new Date()`
 *     yields UTC midnight, and reading local calendar fields off that lands on
 *     the PREVIOUS day for any viewer west of UTC — an invoice dated the 10th
 *     would read as the 9th in New York. So it is parsed textually instead.
 *
 *   - An ABSOLUTE INSTANT (a full ISO timestamp, from a `timestamptz` column).
 *     Here the viewer's local calendar day IS the right answer, so local
 *     getters are correct.
 */
export function shortDate(iso: string): string {
  const dateOnly = DATE_ONLY.exec(iso);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${Number(m)}/${Number(d)}/${Number(y)}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * An instant rendered as a stable calendar day in UTC (`YYYY-MM-DD`).
 *
 * Used for lifecycle dates (trial start/end, activation, submission) on
 * server-rendered launch pages. UTC keeps the operator's view and the
 * customer's view of the same instant identical, and matches how the database
 * stores it — see the timestamp audit in KORNIZO_LAUNCH_HANDOFF.md.
 */
export function isoDay(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
