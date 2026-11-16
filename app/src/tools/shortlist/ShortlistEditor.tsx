/**
 * Open / edit a shortlist card.
 */
import { useId, useRef, useState } from 'react';
import Sheet from '../../components/Sheet';
import PlateInput from '../../components/PlateInput';
import { TrafficLight } from '../../components/TrafficLight';
import { CameraIcon, StarIcon } from '../../components/icons';
import { fetchLinkPreview, lookupProblem, lookupRegistration } from '../../api/client';
import { useAppNav } from '../../appNav';
import { depositOptions } from '../../domain/finance/calculator';
import { formatISODate, formatMonthYear } from '../../domain/dates';
import { formatRegistration, isValidRegistration, normaliseRegistration } from '../../domain/vehicle/registration';
import { financeRules } from '../../config/financeRules';
import { formatGBP, formatGBPWhole, parseMoney } from '../../lib/format';
import { resizePhoto } from '../../lib/image';
import { useBlobUrl } from '../../hooks/useShortlist';
import { deleteShortlistItem, saveShortlistItem, type ShortlistItem } from '../../storage/shortlist';
import LinkPreviewBox from './LinkPreviewBox';
import { evaluateItem, itemName } from './mapping';

const DEPOSITS = depositOptions();

interface Props {
  item: ShortlistItem;
  onClose: () => void;
}

export default function ShortlistEditor({ item: initial, onClose }: Props) {
  const nav = useAppNav();
  const ids = { price: useId(), deposit: useId(), term: useId(), url: useId(), notes: useId(), list: useId() };
  const [item, setItem] = useState(initial);
  const [plate, setPlate] = useState(initial.reg ? formatRegistration(initial.reg) : '');
  const [priceText, setPriceText] = useState(initial.askingPrice ? String(initial.askingPrice) : '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoUrl = useBlobUrl(item.photo);

  const update = (patch: Partial<ShortlistItem>) => {
    const next = { ...item, ...patch };
    setItem(next);
    saveShortlistItem(next);
  };

  const ev = evaluateItem(item);
  const q = ev.quote;
  const maxTerm = ev.working?.status === 'ok' ? ev.working.maxTermMonths : 0;
  const terms = Array.from({ length: Math.max(0, maxTerm - financeRules.minTermMonths + 1) }, (_, i) => maxTerm - i);
  const term = item.requestedTermMonths && item.requestedTermMonths <= maxTerm ? item.requestedTermMonths : maxTerm;

  async function relookup() {
    const reg = normaliseRegistration(plate);
    if (!isValidRegistration(reg)) return;
    setBusy(true);
    setNote(undefined);
    const r = await lookupRegistration(reg);
    setBusy(false);
    const issue = lookupProblem(r);
    if (issue) return setNote(issue.message);
    update({ reg, vehicle: r.vehicle, mot: r.mot, lookupAt: r.at, mock: r.mock, make: r.mot?.make ?? r.vehicle?.make, model: r.mot?.model });
  }

  async function refreshPreview(url: string) {
    const r = await fetchLinkPreview(url);
    if (r.ok) update({ advertUrl: url, advertTitle: r.data.title, advertImageUrl: r.data.imageUrl, advertSite: r.data.siteName });
    else update({ advertUrl: url });
  }

  return (
    <Sheet
      title={itemName(item)}
      onClose={onClose}
      footer={
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={() => nav.openInCheck(item)}>
            Open in calculator
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="stack">
        {(photoUrl || item.advertImageUrl) && (
          <img className="editor-photo" src={photoUrl ?? item.advertImageUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        )}

        <div className="toggle-row">
          <button type="button" className={`chip-btn${item.favourite ? ' chip-btn--on' : ''}`} aria-pressed={item.favourite} onClick={() => update({ favourite: !item.favourite })}>
            <StarIcon filled={item.favourite} size={18} /> Favourite
          </button>
          <button type="button" className={`chip-btn${item.ruledOut ? ' chip-btn--out' : ''}`} aria-pressed={item.ruledOut} onClick={() => update({ ruledOut: !item.ruledOut })}>
            {item.ruledOut ? 'Ruled out' : 'Rule out'}
          </button>
        </div>

        <section className="card summary">
          {q?.status === 'ok' ? (
            <>
              <p className="summary-payment">
                <strong>{formatGBP(q.monthlyPayment)}</strong>/mo × {q.termMonths}
              </p>
              {ev.trueMonthly !== undefined && <p className="muted small">With road tax: {formatGBP(ev.trueMonthly)} a month</p>}
            </>
          ) : (
            <p className="muted">
              {q?.status === 'not-eligible'
                ? 'Not eligible — the car is too old for the minimum 12-month term.'
                : !ev.registration
                  ? 'Add a registration to work out the term.'
                  : 'Add an asking price to see the monthly payment.'}
            </p>
          )}
          {ev.registration && (
            <p className="muted small">
              Registered {ev.registration.approx ? `${formatMonthYear(ev.registration.date)} (approx)` : formatISODate(ev.registration.date)}
              {ev.working?.status === 'ok' && ` · max term ${ev.working.maxTermMonths} months`}
            </p>
          )}
          {ev.mot && (
            <div className={`mot-light mot-light--${ev.mot.light} mot-light--compact`}>
              <TrafficLight light={ev.mot.light} size="sm" />
              <p className="mot-light-reason">{ev.mot.reason}</p>
            </div>
          )}
          {ev.ved?.status === 'ok' && (
            <p className="small">
              Road tax approx {formatGBPWhole(ev.ved.annual)}/yr <span className="muted">— {ev.ved.rule}</span>
            </p>
          )}
          {ev.fuelType && <p className="small">Clean air: {ev.cleanAir.headline}</p>}
        </section>

        <div className="field">
          <span className="field-label">Registration</span>
          <PlateInput value={plate} onChange={setPlate} onSubmit={relookup} busy={busy} buttonLabel={item.vehicle || item.mot ? 'Refresh' : 'Look up'} />
          {note && <p className="note">{note}</p>}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor={ids.price}>Asking price</label>
            <div className="money-input">
              <span aria-hidden="true">£</span>
              <input
                id={ids.price}
                inputMode="decimal"
                value={priceText}
                onChange={(e) => {
                  const t = e.target.value.replace(/[^\d.,]/g, '');
                  setPriceText(t);
                  const n = parseMoney(t);
                  update({ askingPrice: Number.isFinite(n) && n > 0 ? n : undefined });
                }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor={ids.deposit}>Deposit</label>
            <select id={ids.deposit} value={item.deposit} onChange={(e) => update({ deposit: Number(e.target.value) })}>
              {DEPOSITS.map((d) => (
                <option key={d} value={d}>{formatGBPWhole(d)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor={ids.term}>Term</label>
          <select
            id={ids.term}
            value={term || ''}
            disabled={terms.length === 0}
            onChange={(e) => update({ requestedTermMonths: Number(e.target.value) === maxTerm ? undefined : Number(e.target.value) })}
          >
            {terms.length === 0 && <option value="">—</option>}
            {terms.map((t) => (
              <option key={t} value={t}>{t === maxTerm ? `${t} months (max)` : `${t} months`}</option>
            ))}
          </select>
        </div>

        {ev.ved?.status === 'ok' && ev.ved.supplementRelevant && (
          <div className="field">
            <label className="checkbox">
              <input type="checkbox" checked={!!item.overThresholdWhenNew} onChange={(e) => update({ overThresholdWhenNew: e.target.checked })} />
              <span>List price over {formatGBPWhole(ev.ved.threshold ?? 40000)} when new (expensive car supplement)</span>
            </label>
            {ev.ved.likelyExpensive && !item.overThresholdWhenNew && <p className="note note--warn">{ev.ved.likelyExpensive}.</p>}
          </div>
        )}

        <div className="field">
          <label htmlFor={ids.url}>Advert link</label>
          <input
            id={ids.url}
            type="url"
            inputMode="url"
            placeholder="https://…"
            defaultValue={item.advertUrl}
            autoCapitalize="off"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== item.advertUrl) refreshPreview(v);
              else if (!v && item.advertUrl) update({ advertUrl: undefined, advertTitle: undefined, advertImageUrl: undefined });
            }}
          />
          {item.advertUrl && (
            <LinkPreviewBox url={item.advertUrl} preview={{ url: item.advertUrl, title: item.advertTitle, siteName: item.advertSite, blocked: !item.advertTitle }} />
          )}
        </div>

        <div className="field">
          <span className="field-label">Photo</span>
          <div className="link-row">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()}>
              <CameraIcon /> {item.photo ? 'Change photo' : 'Add photo'}
            </button>
            {item.photo && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => update({ photo: undefined })}>
                Remove photo
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                update({ photo: await resizePhoto(file) });
              } catch {
                setNote("Couldn't use that photo.");
              }
            }}
          />
        </div>

        <div className="field">
          <label htmlFor={ids.notes}>Notes</label>
          <textarea id={ids.notes} rows={4} defaultValue={item.notes} onBlur={(e) => e.target.value !== item.notes && update({ notes: e.target.value })} />
        </div>

        {confirmDelete ? (
          <div className="note note--warn">
            <p>Delete this card? This can't be undone.</p>
            <div className="link-row">
              <button type="button" className="btn btn-danger btn-small" onClick={() => deleteShortlistItem(item.id).then(onClose)}>
                Delete
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-danger-text btn-block" onClick={() => setConfirmDelete(true)}>
            Delete card
          </button>
        )}
        {item.mock && <p className="muted small">This card uses sample data from mock mode.</p>}
      </div>
    </Sheet>
  );
}
