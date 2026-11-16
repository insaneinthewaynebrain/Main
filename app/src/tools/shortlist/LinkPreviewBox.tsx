import type { LinkPreview } from '../../domain/vehicle/types';
import { ExternalIcon } from '../../components/icons';

/** Shows an advert's title and photo, or just the link if the site blocked previews. */
export default function LinkPreviewBox({ url, preview, loading }: { url: string; preview?: LinkPreview; loading?: boolean }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep as typed */
  }
  return (
    <a className="link-preview" href={url} target="_blank" rel="noopener noreferrer">
      {preview?.imageUrl && <img src={preview.imageUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
      <span className="link-preview-text">
        <span className="link-preview-title">
          {loading ? 'Fetching preview…' : preview?.title ?? (preview?.blocked ? 'Preview not available — tap to open the advert' : 'Open advert')}
        </span>
        <span className="muted small">
          {preview?.siteName ?? host} {preview?.sample && '· sample preview (mock mode)'}
        </span>
      </span>
      <ExternalIcon />
    </a>
  );
}
