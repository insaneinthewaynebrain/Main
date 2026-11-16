import { formatRegistration } from '../../domain/vehicle/registration';
import { formatGBP, formatGBPWhole } from '../../lib/format';
import { useBlobUrl } from '../../hooks/useShortlist';
import type { ShortlistItem } from '../../storage/shortlist';
import { saveShortlistItem } from '../../storage/shortlist';
import { LightDot, lightLabel } from '../../components/TrafficLight';
import { CarIcon, StarIcon } from '../../components/icons';
import { evaluateItem, itemName } from './mapping';

interface Props {
  item: ShortlistItem;
  onOpen: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function ShortlistCard({ item, onOpen, selectable, selected, onToggleSelect }: Props) {
  const photoUrl = useBlobUrl(item.photo);
  const image = photoUrl ?? item.advertImageUrl;
  const ev = evaluateItem(item);
  const q = ev.quote;

  return (
    <article className={`sl-card${item.ruledOut ? ' sl-card--out' : ''}${selected ? ' sl-card--selected' : ''}`}>
      <button type="button" className="sl-card-main" onClick={selectable ? onToggleSelect : onOpen} aria-pressed={selectable ? selected : undefined}>
        <div className="sl-thumb">
          {image ? <img src={image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <CarIcon />}
          {selectable && <span className={`sl-check${selected ? ' sl-check--on' : ''}`} aria-hidden="true">{selected ? '✓' : ''}</span>}
        </div>
        <div className="sl-info">
          <div className="sl-top">
            {item.reg && <span className="plate-badge plate-badge--sm">{formatRegistration(item.reg)}</span>}
            {item.ruledOut && <span className="chip">Ruled out</span>}
          </div>
          <h3 className="sl-name">{itemName(item)}</h3>
          <p className="sl-price">
            {item.askingPrice ? formatGBPWhole(item.askingPrice) : 'No price'}
            {q?.status === 'ok' && (
              <>
                {' · '}
                <strong>{formatGBP(q.monthlyPayment)}</strong>/mo × {q.termMonths}
              </>
            )}
            {q?.status === 'not-eligible' && <span className="warn-text"> · Not eligible</span>}
          </p>
          <p className="sl-meta">
            {ev.mot && (
              <span className="sl-mot">
                <LightDot light={ev.mot.light} /> {lightLabel(ev.mot.light)}
              </span>
            )}
            {ev.ved?.status === 'ok' && <span>Tax ~{formatGBPWhole(ev.ved.annual)}/yr</span>}
          </p>
        </div>
      </button>
      {!selectable && (
        <button
          type="button"
          className={`icon-btn star${item.favourite ? ' star--on' : ''}`}
          aria-label={item.favourite ? 'Remove favourite' : 'Mark as favourite'}
          aria-pressed={item.favourite}
          onClick={() => saveShortlistItem({ ...item, favourite: !item.favourite })}
        >
          <StarIcon filled={item.favourite} />
        </button>
      )}
    </article>
  );
}
