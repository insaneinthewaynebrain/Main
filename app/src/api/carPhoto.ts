/**
 * A generic photo of the make/model from Wikipedia (free, no key).
 * Wikipedia photos won't match the exact colour; the app shows a
 * colour-matched illustration whenever there's no photo.
 * Called straight from the phone (Wikipedia allows this with origin=*).
 */
import { modelFamily } from '../domain/repairs/repairs';

export interface CarPhoto {
  imageUrl: string;
  /** Wikipedia article, for attribution. */
  pageUrl: string;
  title: string;
}

const API = 'https://en.wikipedia.org/w/api.php';
const CACHE_PREFIX = 'carfin:photo:';
const MISS_TTL_MS = 7 * 86_400_000;

export function photoSearchTerm(make?: string, model?: string): string | undefined {
  const family = modelFamily(model);
  if (!make || !family) return undefined;
  return `${make.charAt(0).toUpperCase()}${make.slice(1).toLowerCase()} ${family}`;
}

export function photoSearchUrl(term: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${term} car`,
    gsrlimit: '5',
    prop: 'pageimages|info',
    piprop: 'thumbnail',
    pithumbsize: '800',
    inprop: 'url',
  });
  return `${API}?${params}`;
}

interface WikiPage {
  title?: string;
  index?: number;
  fullurl?: string;
  thumbnail?: { source?: string };
}

/** Picks the best search result: one whose title mentions the model, with a photo. */
export function pickPhoto(json: unknown, term: string): CarPhoto | undefined {
  const pages = Object.values(((json as { query?: { pages?: Record<string, WikiPage> } })?.query?.pages ?? {}) as Record<string, WikiPage>)
    .filter((p) => p.thumbnail?.source && p.title && p.fullurl)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const words = term.toLowerCase().split(' ');
  const family = words.slice(1).join(' ');
  const best = pages.find((p) => p.title!.toLowerCase().includes(family)) ?? pages.find((p) => p.title!.toLowerCase().includes(words[0]));
  return best ? { imageUrl: best.thumbnail!.source!, pageUrl: best.fullurl!, title: best.title! } : undefined;
}

export async function fetchCarPhoto(make?: string, model?: string): Promise<CarPhoto | undefined> {
  const term = photoSearchTerm(make, model);
  if (!term) return undefined;
  const key = CACHE_PREFIX + term.toLowerCase();
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? 'null') as { photo?: CarPhoto; missAt?: number } | null;
    if (cached?.photo) return cached.photo;
    if (cached?.missAt && Date.now() - cached.missAt < MISS_TTL_MS) return undefined;
  } catch {
    /* no cache */
  }
  try {
    const res = await fetch(photoSearchUrl(term));
    if (!res.ok) return undefined; // rate limited etc. — try again another time
    const photo = pickPhoto(await res.json(), term);
    try {
      localStorage.setItem(key, JSON.stringify(photo ? { photo } : { missAt: Date.now() }));
    } catch {
      /* ignore */
    }
    return photo;
  } catch {
    return undefined;
  }
}
