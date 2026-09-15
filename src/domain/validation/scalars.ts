import { z } from "zod";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
export const isoDate = z.string().refine(isCalendarDate, "Datë e pavlefshme.");
export const hasCentScale = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
export const monetaryValue = z.number().finite().min(0).max(1_000_000).refine(hasCentScale, "Përdorni më së shumti dy shifra dhjetore.");
