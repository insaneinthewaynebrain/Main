import { formatRegistration } from '../../domain/vehicle/registration';
import { formatGBP, formatGBPWhole } from '../../lib/format';
import { useBlobUrl } from '../../hooks/useShortlist';
import type { ShortlistItem } from '../../storage/shortlist';
import { saveShortlistItem } from '../../storage/shortlist';
import { LightDot, lightLabel } from '../../components/TrafficLight';
import { ExternalIcon, StarIcon } from '../../components/icons';
import CarIllustration from '../../components/CarIllustration';
import { withChanges } from '../../domain/shortlist/priceHistory';
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
  const change = withChanges(item.priceHistory)[0]?.change;

  return (
    <article className={`sl-card${item.ruledOut ? ' sl-card--out' : ''}${selected ? ' sl-card--selected' : ''}`}>
      <button type="button" className="sl-card-main" onClick={selectable ? onToggleSelect : onOpen} aria-pressed={selectable ? selected : undefined}>
        <div className="sl-thumb">
          {image ? <img src={image} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <CarIllustration colour={item.vehicle?.colour ?? item.mot?.primaryColour} />}
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
            {change !== undefined && change !== 0 && (
              <span className={change < 0 ? 'ph-down' : 'ph-up'}>
                {change < 0 ? '▼' : '▲'} {formatGBPWhole(Math.abs(change))}
              </span>
            )}
          </p>
        </div>
      </button>
      {!selectable && (
        <div className="sl-side">
        <button
          type="button"
          className={`icon-btn star${item.favourite ? ' star--on' : ''}`}
          aria-label={item.favourite ? 'Remove favourite' : 'Mark as favourite'}
          aria-pressed={item.favourite}
          onClick={() => saveShortlistItem({ ...item, favourite: !item.favourite })}
        >
          <StarIcon filled={item.favourite} />
        </button>
        {item.advertUrl && (
          <a className="icon-btn advert-btn" href={item.advertUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open advert on ${item.advertSite ?? 'website'}`}>
            <ExternalIcon />
          </a>
        )}
        </div>
      )}
    </article>
  );
}
