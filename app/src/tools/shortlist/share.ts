/**
 * Entry point for links shared INTO the app.
 *
 * Today: opening the app with ?share=<url> (or ?url=… / ?text=…) opens
 * "Add by link" with the link filled in.
 *
 * Native version later (Capacitor): add an iOS Share Extension that opens
 * the app with the shared URL, then call `readSharedLink` on that URL (or
 * pass the link straight to `AppNav.pendingShare`). Nothing else changes —
 * AddByLink already accepts an initial link.
 */
export interface SharedLink {
  url: string;
  text?: string;
}

const URL_RE = /https?:\/\/[^\s<>"']+/i;

/** Pulls a shared link out of a URL's query string, if there is one. */
export function readSharedLink(href: string): SharedLink | undefined {
  let params: URLSearchParams;
  try {
    params = new URL(href).searchParams;
  } catch {
    return undefined;
  }
  const text = params.get('text') ?? undefined;
  const candidate = params.get('share') ?? params.get('url') ?? text?.match(URL_RE)?.[0];
  if (!candidate || !URL_RE.test(candidate)) return undefined;
  return { url: candidate.match(URL_RE)![0], text };
}

/** Removes the share parameters so a refresh doesn't add the car twice. */
export function clearSharedLinkFromAddressBar(): void {
  try {
    const u = new URL(window.location.href);
    ['share', 'url', 'text', 'title'].forEach((p) => u.searchParams.delete(p));
    window.history.replaceState(null, '', u.toString());
  } catch {
    /* ignore */
  }
}
