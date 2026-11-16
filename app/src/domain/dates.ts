/**
 * Calendar-date helpers working on ISO date strings ("YYYY-MM-DD").
 * Plain strings avoid time-zone bugs: a registration date is a calendar day,
 * not a moment in time. ISO strings also compare correctly with < and >.
 */
export type ISODate = string;

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number; // 1–31
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(iso: ISODate): YMD {
  const match = ISO_RE.exec(iso);
  if (!match) throw new RangeError(`Not an ISO date: ${iso}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function isValidISODate(iso: unknown): iso is ISODate {
  if (typeof iso !== 'string' || !ISO_RE.test(iso)) return false;
  const { y, m, d } = parseISODate(iso);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function toISODate(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Today's date on the device, as an ISO date. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Takes the date part of an ISO date-time ("2023-02-17T09:17:46.000Z" → "2023-02-17"). */
export function datePart(value: string): ISODate {
  return value.slice(0, 10);
}

function toUTC(iso: ISODate): number {
  const { y, m, d } = parseISODate(iso);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from a to b (negative if b is earlier). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const t = new Date(toUTC(iso) + days * 86_400_000);
  return toISODate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Adds whole years; 29 Feb becomes 28 Feb in non-leap years. */
export function addYears(iso: ISODate, years: number): ISODate {
  const { y, m, d } = parseISODate(iso);
  const ny = y + years;
  return toISODate(ny, m, Math.min(d, daysInMonth(ny, m)));
}

/**
 * Whole calendar months from `from` to `to`.
 * 14 Jul 2022 → 13 Nov 2026 is 51; → 14 Nov 2026 is 52.
 * Negative when `to` is before `from`.
 */
export function wholeMonthsBetween(from: ISODate, to: ISODate): number {
  if (to < from) return -wholeMonthsBetween(to, from);
  const a = parseISODate(from);
  const b = parseISODate(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  // Not a full month yet if the day hasn't been reached — but the last day of a
  // shorter month counts (31 Jan → 28 Feb is one month).
  const lastDayOfB = daysInMonth(b.y, b.m);
  if (b.d < a.d && b.d < lastDayOfB) months -= 1;
  return months;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 Jul 2022" */
export function formatISODate(iso: ISODate): string {
  const { y, m, d } = parseISODate(iso);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "Jul 2022" */
export function formatMonthYear(iso: ISODate): string {
  const { y, m } = parseISODate(iso);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}
