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

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
