const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const gbpWhole = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

export const formatGBP = (n: number) => gbp.format(n);
export const formatGBPWhole = (n: number) => gbpWhole.format(n);
export const formatPercent = (decimal: number) => `${(decimal * 100).toFixed(1)}%`;

/** Parse user-typed money like "£12,500.50". Returns NaN for empty/invalid. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[£,\s]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatAge(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`);
  if (m || !y) parts.push(`${m} month${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export const formatMiles = (n: number) => `${Math.round(n).toLocaleString('en-GB')} mi`;

/** "TOYOTA" → "Toyota", "YARIS DESIGN" → "Yaris Design" (keeps short codes like "BMW", "ST"). */
export function titleCase(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/^(bmw|vw|mg|ds|gt|st|rs|tdi|tsi|gti|ev|amg|suv|se|xdrive|m)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}
