/**
 * The asking prices you've seen for a car, with date and website.
 * (Other people's past sale prices need a paid data provider — see README.)
 */
import type { ISODate } from '../dates';

export interface PricePoint {
  date: ISODate;
  price: number;
  /** e.g. "autotrader.co.uk" */
  site?: string;
  url?: string;
}

/** Adds a sighting. Same price as last time → unchanged; same day → replaces. */
export function recordPrice(history: PricePoint[] | undefined, point: PricePoint): PricePoint[] {
  const list = [...(history ?? [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!(point.price > 0)) return list;
  const last = list.at(-1);
  if (last && last.price === point.price) {
    if (!last.site && point.site) list[list.length - 1] = { ...last, site: point.site, url: point.url };
    return list;
  }
  if (last && last.date === point.date) list[list.length - 1] = point;
  else list.push(point);
  return list;
}

export interface PriceChange extends PricePoint {
  /** Difference from the previous sighting (negative = price drop). */
  change?: number;
}

/** Newest first, each with the change from the one before. */
export function withChanges(history: PricePoint[] | undefined): PriceChange[] {
  const list = [...(history ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  return list.map((p, i) => ({ ...p, change: i > 0 ? p.price - list[i - 1].price : undefined })).reverse();
}

export function siteFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** Finds a £ price in an advert title, e.g. "2021 Ford Focus | £13,995" → 13995. */
export function priceFromText(text?: string): number | undefined {
  if (!text) return undefined;
  const m = /£\s?(\d{1,3}(?:,\d{3})+|\d{3,7})(?:\.\d{2})?(?!\s*(?:p\/?m|per month|\/mo|a month|pcm))/i.exec(text);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ''));
  return n >= 500 && n <= 2_000_000 ? n : undefined;
}
