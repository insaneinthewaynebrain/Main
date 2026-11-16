import { useEffect, useState } from 'react';
import { fetchLinkPreview } from '../api/client';
import type { LinkPreview } from '../domain/vehicle/types';

export const looksLikeUrl = (s: string) => /^https?:\/\/\S+\.\S+/i.test(s.trim());

/** Fetches an advert's title/photo shortly after a link is pasted. */
export function useLinkPreview(url: string, known?: LinkPreview) {
  const trimmed = url.trim();
  const [preview, setPreview] = useState<LinkPreview | undefined>(known);
  const [loading, setLoading] = useState(false);
  const [fetchedFor, setFetchedFor] = useState(known ? trimmed : '');

  useEffect(() => {
    if (!looksLikeUrl(trimmed) || trimmed === fetchedFor) return;
    const t = setTimeout(async () => {
      setLoading(true);
      setFetchedFor(trimmed);
      const r = await fetchLinkPreview(trimmed);
      setLoading(false);
      setPreview(r.ok ? r.data : { url: trimmed, blocked: true });
    }, 400);
    return () => clearTimeout(t);
  }, [trimmed, fetchedFor]);

  return { preview: looksLikeUrl(trimmed) ? preview : undefined, loading };
}
