import { useEffect, useId } from 'react';
import { useLinkPreview, looksLikeUrl } from '../../hooks/useLinkPreview';
import { priceFromText, siteFromUrl } from '../../domain/shortlist/priceHistory';
import type { LinkPreview } from '../../domain/vehicle/types';
import { formatGBPWhole, parseMoney } from '../../lib/format';
import type { ShortlistItem } from '../../storage/shortlist';
import LinkPreviewBox from '../shortlist/LinkPreviewBox';
import PriceHistory from '../shortlist/PriceHistory';

interface Props {
  advertUrl: string;
  known?: LinkPreview;
  priceText: string;
  linked?: ShortlistItem;
  onUrl: (url: string) => void;
  onPreview: (p: LinkPreview) => void;
  onUsePrice: (price: number) => void;
  onSave: () => void;
  onViewCard: () => void;
  canSave: boolean;
}

export default function AdvertPanel(p: Props) {
  const id = useId();
  const { preview, loading } = useLinkPreview(p.advertUrl, p.known);
  const advertPrice = priceFromText(preview?.title);

  useEffect(() => {
    if (preview && preview.url === p.advertUrl.trim() && preview.title !== p.known?.title) p.onPreview(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <div className="panel">
      <section className="card stack">
        <div className="field">
          <label htmlFor={id}>Advert link</label>
          <input
            id={id}
            type="url"
            inputMode="url"
            placeholder="Paste the Auto Trader (or any) advert link"
            value={p.advertUrl}
            autoCapitalize="off"
            autoComplete="off"
            onChange={(e) => p.onUrl(e.target.value)}
          />
          <p className="muted small">Saved with the car so you can always get back to the advert.</p>
        </div>
        {looksLikeUrl(p.advertUrl) && <LinkPreviewBox url={p.advertUrl.trim()} preview={preview} loading={loading} />}
        {advertPrice && advertPrice !== parseMoney(p.priceText) && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => p.onUsePrice(advertPrice)}>
            Use advert price {formatGBPWhole(advertPrice)}
          </button>
        )}
        {p.linked ? (
          <button type="button" className="btn btn-ghost btn-block" onClick={p.onViewCard}>
            ★ On your shortlist — open card
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled={!p.canSave} onClick={p.onSave}>
            Save car + advert to shortlist
          </button>
        )}
      </section>
      <section className="card">
        <h3 className="card-title">Price history</h3>
        <PriceHistory history={p.linked?.priceHistory} />
        {!p.linked && looksLikeUrl(p.advertUrl) && (
          <p className="muted small">Shortlist the car to start recording its price on {siteFromUrl(p.advertUrl)}.</p>
        )}
      </section>
    </div>
  );
}
