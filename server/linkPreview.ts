/**
 * Reads an advert page's standard preview tags (Open Graph / Twitter) to get
 * its title and main photo. Only public http(s) pages; private and local
 * addresses are refused so this can't be used to probe internal networks.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { LinkPreview } from '../app/src/domain/vehicle/types';
import { ApiFailure } from './http';

const MAX_BYTES = 600_000;
const TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 4;

type Fetch = typeof fetch;
type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) => (await lookup(host, { all: true })).map((a) => a.address);

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb');
}

/** Throws unless the URL is a public http(s) address on a normal port. */
export async function assertPublicUrl(raw: string, resolve: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiFailure('BAD_REQUEST', "That doesn't look like a web link.");
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ApiFailure('BAD_REQUEST', 'Only web links (http/https) are supported.');
  if (url.username || url.password) throw new ApiFailure('BAD_REQUEST', 'Links with passwords are not supported.');
  if (url.port && url.port !== '80' && url.port !== '443') throw new ApiFailure('BAD_REQUEST', 'That link uses an unusual port.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new ApiFailure('BAD_REQUEST', 'That link is not a public website.');
  const addresses = isIP(host) ? [host] : await resolve(host).catch(() => []);
  if (addresses.length === 0) throw new ApiFailure('BAD_REQUEST', "Couldn't find that website.");
  if (addresses.some(isPrivateAddress)) throw new ApiFailure('BAD_REQUEST', 'That link is not a public website.');
  return url;
}

export async function fetchLinkPreview(rawUrl: string, fetchImpl: Fetch = fetch, resolve: Resolver = defaultResolver): Promise<LinkPreview> {
  let url = await assertPublicUrl(rawUrl, resolve);
  const blocked: LinkPreview = { url: url.toString(), blocked: true };

  let res: Response | undefined;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    try {
      res = await fetchImpl(url, {
        redirect: 'manual',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'en-GB,en;q=0.8',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return blocked;
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        url = await assertPublicUrl(new URL(location, url).toString(), resolve);
      } catch {
        return blocked; // redirect to somewhere unsafe or invalid
      }
      res = undefined;
      continue;
    }
    break;
  }
  if (!res || !res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return { ...blocked, url: url.toString() };

  const html = await readLimited(res, MAX_BYTES);
  const meta = parsePreviewTags(html, url);
  if (!meta.title && !meta.imageUrl) return { ...blocked, url: url.toString() };
  return { url: url.toString(), ...meta };
}

async function readLimited(res: Response, max: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks).subarray(0, max));
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ', pound: '£' };

function decodeEntities(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pulls og:/twitter: title, image and site name (or <title>) from HTML. */
export function parsePreviewTags(html: string, base: URL): Omit<LinkPreview, 'url'> {
  const tags: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const a of m[0].matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? '';
    }
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase();
    if (key && attrs.content && !(key in tags)) tags[key] = decodeEntities(attrs.content);
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  const title = tags['og:title'] ?? tags['twitter:title'] ?? (titleTag ? decodeEntities(titleTag) : undefined);
  const rawImage = tags['og:image:secure_url'] ?? tags['og:image'] ?? tags['og:image:url'] ?? tags['twitter:image'] ?? tags['twitter:image:src'];
  let imageUrl: string | undefined;
  if (rawImage) {
    try {
      const u = new URL(rawImage, base);
      if (u.protocol === 'http:') u.protocol = 'https:';
      if (u.protocol === 'https:') imageUrl = u.toString();
    } catch {
      /* ignore bad image URLs */
    }
  }
  return {
    title: title?.slice(0, 200) || undefined,
    imageUrl,
    siteName: tags['og:site_name']?.slice(0, 80) || base.hostname.replace(/^www\./, ''),
  };
}
