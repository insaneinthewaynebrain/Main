/**
 * Top card for a looked-up car: picture, plate, name, key facts and actions.
 */
import CarPicture from '../../components/CarPicture';
import { LightDot } from '../../components/TrafficLight';
import { StarIcon, ExternalIcon } from '../../components/icons';
import { formatISODate, formatMonthYear, todayISO } from '../../domain/dates';
import type { CarEvaluation } from '../../domain/evaluate';
import { formatRegistration } from '../../domain/vehicle/registration';
import type { DvlaVehicle, MotVehicle } from '../../domain/vehicle/types';
import { formatMiles, titleCase } from '../../lib/format';

interface Props {
  reg: string;
  vehicle?: DvlaVehicle;
  mot?: MotVehicle;
  ev: CarEvaluation;
  mock?: boolean;
  advertUrl?: string;
  advertSite?: string;
  ownImageUrl?: string;
  onShortlist: boolean;
  onSave: () => void;
  onViewCard: () => void;
  onAddAdvert: () => void;
  onClear: () => void;
}

export default function CarHero(p: Props) {
  const { vehicle, mot, ev } = p;
  const name = [titleCase(mot?.make ?? vehicle?.make), titleCase(mot?.model)].filter(Boolean).join(' ') || 'Unknown vehicle';
  const colour = vehicle?.colour ?? mot?.primaryColour;
  const engine = vehicle?.engineCapacity ?? mot?.engineSize;
  const reg = ev.registration;
  const today = todayISO();
  const motExpiry = mot?.tests.filter((t) => t.result === 'PASSED' && t.expiryDate).map((t) => t.expiryDate!).sort().at(-1) ?? vehicle?.motExpiry;

  const chips = [reg ? reg.date.slice(0, 4) : undefined, titleCase(vehicle?.fuelType ?? mot?.fuelType), titleCase(colour), engine ? `${(engine / 1000).toFixed(1)}L` : undefined].filter(Boolean);

  return (
    <section className="card hero" aria-label="Car">
      <CarPicture make={mot?.make ?? vehicle?.make} model={mot?.model} colour={colour} ownImageUrl={p.ownImageUrl} />
      <div className="hero-body">
        <div className="hero-top">
          <span className="plate-badge">{formatRegistration(p.reg)}</span>
          {p.mock && <span className="chip chip--mock">Sample data</span>}
        </div>
        <h2 className="hero-name">{name}</h2>
        <div className="chip-row">
          {chips.map((c) => (
            <span key={c} className="chip">{c}</span>
          ))}
        </div>

        <dl className="facts">
          <div>
            <dt>Registered</dt>
            <dd>{reg ? (reg.approx ? `${formatMonthYear(reg.date)} (approx)` : formatISODate(reg.date)) : '—'}</dd>
          </div>
          <div>
            <dt>MOT</dt>
            <dd>
              {ev.mot && <LightDot light={ev.mot.light} />}{' '}
              {ev.mot?.light === 'none' ? 'Not due yet' : motExpiry ? `${motExpiry >= today ? 'to' : 'expired'} ${formatISODate(motExpiry)}` : (vehicle?.motStatus ?? '—')}
            </dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd>{vehicle?.taxStatus ? `${vehicle.taxStatus}${vehicle.taxDueDate ? ` · ${formatISODate(vehicle.taxDueDate)}` : ''}` : '—'}</dd>
          </div>
          <div>
            <dt>Mileage</dt>
            <dd>{ev.mot?.milesPerYear !== undefined ? `${formatMiles(ev.mot.milesPerYear)}/yr` : '—'}</dd>
          </div>
        </dl>

        <div className="hero-actions">
          {p.onShortlist ? (
            <button type="button" className="btn btn-small btn-saved" onClick={p.onViewCard}>
              <StarIcon filled size={18} /> On shortlist
            </button>
          ) : (
            <button type="button" className="btn btn-small btn-primary" onClick={p.onSave}>
              <StarIcon size={18} /> Shortlist
            </button>
          )}
          {p.advertUrl ? (
            <a className="btn btn-small btn-ghost" href={p.advertUrl} target="_blank" rel="noopener noreferrer">
              <ExternalIcon /> {p.advertSite ?? 'Advert'}
            </a>
          ) : (
            <button type="button" className="btn btn-small btn-ghost" onClick={p.onAddAdvert}>
              + Advert link
            </button>
          )}
          <button type="button" className="btn btn-small btn-ghost" onClick={p.onClear}>
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
