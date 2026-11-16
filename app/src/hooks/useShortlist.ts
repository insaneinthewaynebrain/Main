import { useEffect, useState } from 'react';
import { listShortlist, onShortlistChange, type ShortlistItem } from '../storage/shortlist';

/** All shortlist items, kept up to date when anything changes. */
export function useShortlist() {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    const load = () =>
      listShortlist()
        .then((list) => alive && (setItems(list), setLoaded(true)))
        .catch(() => alive && (setError("Couldn't open the shortlist storage on this device."), setLoaded(true)));
    load();
    const off = onShortlistChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  return { items, loaded, error };
}

/** An object URL for a stored photo blob, revoked automatically. */
export function useBlobUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
