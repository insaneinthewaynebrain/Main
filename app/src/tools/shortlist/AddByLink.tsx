/**
 * "Add by link": paste an advert link (Auto Trader or any site), add the
 * registration by hand, and create a shortlist card.
 * Accepts `initialUrl` so a future iOS share-sheet target can open it pre-filled.
 */
import { useEffect, useId, useState } from 'react';
import { useLinkPreview, looksLikeUrl } from '../../hooks/useLinkPreview';
import { priceFromText, recordPrice, siteFromUrl } from '../../domain/shortlist/priceHistory';
import { todayISO } from '../../domain/dates';
import Sheet from '../../components/Sheet';
import PlateInput from '../../components/PlateInput';
import { lookupProblem, lookupRegistration } from '../../api/client';
import { isValidRegistration, normaliseRegistration } from '../../domain/vehicle/registration';
import { financeRules } from '../../config/financeRules';
import { parseMoney } from '../../lib/format';
import { newShortlistItem, saveShortlistItem, type ShortlistItem } from '../../storage/shortlist';
import LinkPreviewBox from './LinkPreviewBox';

interface Props {
  initialUrl?: string;
  onClose: () => void;
  /** `note` explains anything that didn't work (e.g. lookup failed). */
  onAdded: (item: ShortlistItem, note?: string) => void;
}


export default function AddByLink({ initialUrl = '', onClose, onAdded }: Props) {
  const ids = { url: useId(), price: useId() };
  const [url, setUrl] = useState(initialUrl);
  const [plate, setPlate] = useState('');
  const [priceText, setPriceText] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = url.trim();
  const { preview, loading: loadingPreview } = useLinkPreview(trimmed);
  // Fill the asking price from the advert title when it has one.
  const titlePrice = priceFromText(preview?.title);
  useEffect(() => {
    if (titlePrice && !priceText) setPriceText(String(titlePrice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titlePrice]);

  const reg = normaliseRegistration(plate);
  const canSave = looksLikeUrl(trimmed) || isValidRegistration(reg);

  async function add() {
    setSaving(true);
    let note: string | undefined;
    let item = newShortlistItem({
      advertUrl: looksLikeUrl(trimmed) ? trimmed : undefined,
      advertTitle: preview?.title,
      advertImageUrl: preview?.imageUrl,
      advertSite: preview?.siteName ?? siteFromUrl(trimmed),
      askingPrice: parseMoney(priceText) > 0 ? parseMoney(priceText) : undefined,
      priceHistory:
        parseMoney(priceText) > 0
          ? recordPrice([], { date: todayISO(), price: parseMoney(priceText), site: preview?.siteName ?? siteFromUrl(trimmed), url: looksLikeUrl(trimmed) ? trimmed : undefined })
          : undefined,
      deposit: financeRules.deposit.default,
      reg: isValidRegistration(reg) ? reg : undefined,
    });
    if (item.reg) {
      const result = await lookupRegistration(item.reg);
      const issue = lookupProblem(result);
      if (!issue) {
        item = {
          ...item,
          vehicle: result.vehicle,
          mot: result.mot,
          lookupAt: result.at,
          mock: result.mock,
          make: result.mot?.make ?? result.vehicle?.make,
          model: result.mot?.model,
        };
      } else {
        note = `Added without vehicle details: ${issue.message}`;
      }
    }
    const saved = await saveShortlistItem(item);
    setSaving(false);
    onAdded(saved, note);
  }

  return (
    <Sheet
      title="Add by link"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" disabled={!canSave || saving} onClick={add}>
          {saving ? 'Adding…' : 'Add to shortlist'}
        </button>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor={ids.url}>Advert link</label>
          <input
            id={ids.url}
            type="url"
            inputMode="url"
            placeholder="Paste from Auto Trader or any site"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>
        {looksLikeUrl(trimmed) && <LinkPreviewBox url={trimmed} preview={preview} loading={loadingPreview} />}

        <div className="field">
          <span className="field-label">Registration (from the advert)</span>
          <PlateInput value={plate} onChange={setPlate} showButton={false} />
          <p className="muted small">Type it in — we'll look up the DVLA and MOT details when you add the car.</p>
        </div>

        <div className="field">
          <label htmlFor={ids.price}>Asking price</label>
          <div className="money-input">
            <span aria-hidden="true">£</span>
            <input id={ids.price} inputMode="decimal" placeholder="Optional" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ''))} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
