/**
 * Side-by-side comparison of shortlisted cars.
 */
import Sheet from '../../components/Sheet';
import { LightDot, lightLabel } from '../../components/TrafficLight';
import { formatISODate, formatMonthYear } from '../../domain/dates';
import { formatRegistration } from '../../domain/vehicle/registration';
import { formatGBP, formatGBPWhole, formatMiles, titleCase } from '../../lib/format';
import { useBlobUrl } from '../../hooks/useShortlist';
import type { ShortlistItem } from '../../storage/shortlist';
import { CarIcon, StarIcon } from '../../components/icons';
import { evaluateItem, itemName } from './mapping';
import type { ReactNode } from 'react';

function Thumb({ item }: { item: ShortlistItem }) {
  const url = useBlobUrl(item.photo) ?? item.advertImageUrl;
  return <div className="cmp-thumb">{url ? <img src={url} alt="" /> : <CarIcon />}</div>;
}

export default function CompareView({ items, onClose }: { items: ShortlistItem[]; onClose: () => void }) {
  const evs = items.map((i) => evaluateItem(i));
  const rows: [string, (i: ShortlistItem, idx: number) => ReactNode][] = [
    ['', (i) => <Thumb item={i} />],
    ['Car', (i) => (
      <>
        {i.favourite && <span className="star--on"><StarIcon filled size={14} /> </span>}
        <strong>{itemName(i)}</strong>
        {i.reg && <div className="muted small">{formatRegistration(i.reg)}</div>}
        {i.ruledOut && <div className="chip">Ruled out</div>}
      </>
    )],
    ['Asking price', (i) => (i.askingPrice ? formatGBPWhole(i.askingPrice) : '—')],
    ['Deposit', (i) => formatGBPWhole(i.deposit)],
    ['Monthly', (_, k) => { const q = evs[k].quote; return q?.status === 'ok' ? <strong>{formatGBP(q.monthlyPayment)}</strong> : q?.status === 'not-eligible' ? 'Not eligible' : '—'; }],
    ['Term', (_, k) => { const q = evs[k].quote; return q?.status === 'ok' ? `${q.termMonths} mo (max ${q.maxTermMonths})` : '—'; }],
    ['Total payable', (_, k) => { const q = evs[k].quote; return q?.status === 'ok' ? formatGBP(q.totalPayable) : '—'; }],
    ['Road tax', (_, k) => { const v = evs[k].ved; return v?.status === 'ok' ? `${formatGBPWhole(v.annual)}/yr` : '—'; }],
    ['Monthly incl. tax', (_, k) => (evs[k].trueMonthly !== undefined ? formatGBP(evs[k].trueMonthly!) : '—')],
    ['MOT', (_, k) => { const m = evs[k].mot; return m ? <><LightDot light={m.light} /> {lightLabel(m.light)}<div className="muted small">{m.reason}</div></> : '—'; }],
    ['Mileage', (i, k) => { const t = i.mot?.tests.find((x) => x.odometer); const avg = evs[k].mot?.milesPerYear; return t?.odometer ? <>{t.odometer.value.toLocaleString('en-GB')} {t.odometer.unit}{avg !== undefined && <div className="muted small">{formatMiles(avg)}/yr</div>}</> : '—'; }],
    ['Registered', (_, k) => { const r = evs[k].registration; return r ? (r.approx ? `${formatMonthYear(r.date)} (approx)` : formatISODate(r.date)) : '—'; }],
    ['Fuel', (_, k) => titleCase(evs[k].fuelType) || '—'],
    ['Clean air', (_, k) => evs[k].cleanAir.status.replace(/-/g, ' ')],
    ['Notes', (i) => i.notes || '—'],
  ];

  return (
    <Sheet title={`Compare ${items.length} cars`} onClose={onClose}>
      <div className="cmp-scroll">
        <table className="cmp">
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label || 'photo'}>
                <th scope="row">{label}</th>
                {items.map((i, k) => (
                  <td key={i.id} className={i.ruledOut ? 'cmp-out' : undefined}>{cell(i, k)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
