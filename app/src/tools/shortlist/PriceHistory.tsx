import { formatISODate } from '../../domain/dates';
import { withChanges, type PricePoint } from '../../domain/shortlist/priceHistory';
import { formatGBPWhole } from '../../lib/format';

/** "16 Nov 2026 — £13,995 · autotrader.co.uk  ▼ £500" */
export default function PriceHistory({ history }: { history?: PricePoint[] }) {
  const rows = withChanges(history);
  if (rows.length === 0) return <p className="muted small">Prices you enter are recorded here with the date and website.</p>;
  return (
    <ol className="price-history">
      {rows.map((p) => (
        <li key={`${p.date}-${p.price}`}>
          <span className="ph-date">{formatISODate(p.date)}</span>
          <strong>{formatGBPWhole(p.price)}</strong>
          {p.change !== undefined && p.change !== 0 && (
            <span className={p.change < 0 ? 'ph-down' : 'ph-up'}>
              {p.change < 0 ? '▼' : '▲'} {formatGBPWhole(Math.abs(p.change))}
            </span>
          )}
          {p.site &&
            (p.url ? (
              <a className="ph-site" href={p.url} target="_blank" rel="noopener noreferrer">{p.site} ↗</a>
            ) : (
              <span className="ph-site">{p.site}</span>
            ))}
        </li>
      ))}
    </ol>
  );
}
