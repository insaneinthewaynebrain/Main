import { formatISODate, formatMonthYear, todayISO } from '../../domain/dates';
import type { MotAssessment } from '../../domain/mot/trafficLight';
import { formatRegistration } from '../../domain/vehicle/registration';
import type { ResolvedRegistrationDate } from '../../domain/vehicle/registrationDate';
import type { ApiError, DvlaVehicle, MotVehicle } from '../../domain/vehicle/types';
import { formatMiles, titleCase } from '../../lib/format';
import { TrafficLight } from '../../components/TrafficLight';
import MotHistory from './MotHistory';

interface Props {
  reg: string;
  vehicle?: DvlaVehicle;
  mot?: MotVehicle;
  motError?: ApiError;
  vehicleError?: ApiError;
  registration?: ResolvedRegistrationDate;
  assessment?: MotAssessment;
  mock?: boolean;
}

export default function VehicleCard({ reg, vehicle, mot, motError, vehicleError, registration, assessment, mock }: Props) {
  const make = titleCase(mot?.make ?? vehicle?.make);
  const model = titleCase(mot?.model);
  const engine = vehicle?.engineCapacity ?? mot?.engineSize;
  const today = todayISO();
  const motValidTo = assessment?.light !== 'none'
    ? mot?.tests.filter((t) => t.result === 'PASSED' && t.expiryDate).map((t) => t.expiryDate!).sort().at(-1) ?? vehicle?.motExpiry
    : undefined;

  const rows: [string, string | undefined][] = [
    ['Colour', titleCase(vehicle?.colour ?? mot?.primaryColour)],
    ['Fuel', titleCase(vehicle?.fuelType ?? mot?.fuelType)],
    ['Engine', engine ? `${engine.toLocaleString('en-GB')} cc` : undefined],
    [
      'Registered',
      registration
        ? registration.approx
          ? `${formatMonthYear(registration.date)} (approx)`
          : formatISODate(registration.date)
        : undefined,
    ],
    ['Tax', vehicle?.taxStatus ? `${vehicle.taxStatus}${vehicle.taxDueDate ? ` · due ${formatISODate(vehicle.taxDueDate)}` : ''}` : undefined],
    [
      'MOT',
      assessment?.light === 'none'
        ? 'Not due yet'
        : motValidTo
          ? `${motValidTo >= today ? 'Valid to' : 'Expired'} ${formatISODate(motValidTo)}`
          : vehicle?.motStatus,
    ],
    ['Euro status', vehicle?.euroStatus],
    ['CO2', vehicle?.co2Emissions !== undefined ? `${vehicle.co2Emissions} g/km` : undefined],
  ];

  return (
    <section className="card vehicle" aria-label="Vehicle">
      <div className="vehicle-head">
        <span className="plate-badge">{formatRegistration(reg)}</span>
        {mock && <span className="chip chip--mock">Sample data</span>}
      </div>
      <h2 className="vehicle-title">{[make, model].filter(Boolean).join(' ') || 'Unknown vehicle'}</h2>

      {assessment && (
        <div className={`mot-light mot-light--${assessment.light}`}>
          <TrafficLight light={assessment.light} />
          <div>
            <p className="mot-light-title">MOT {assessment.light === 'none' ? '' : assessment.light.toUpperCase()}</p>
            <p className="mot-light-reason">{assessment.reason}</p>
          </div>
        </div>
      )}
      {assessment && assessment.reasons.length > 1 && (
        <ul className="reason-list">
          {assessment.reasons.slice(1).map((r) => (
            <li key={r.text} className={`reason reason--${r.light}`}>{r.text}</li>
          ))}
        </ul>
      )}

      {mot?.hasOutstandingRecall === 'Yes' && (
        <p className="note note--warn">Outstanding safety recall — ask the seller for proof it has been fixed.</p>
      )}

      <dl className="breakdown">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        {assessment?.milesPerYear !== undefined && (
          <div>
            <dt>Average mileage</dt>
            <dd>{formatMiles(assessment.milesPerYear)} / yr</dd>
          </div>
        )}
      </dl>

      {vehicleError && <p className="note">DVLA: {vehicleError.message}</p>}
      {motError && motError.code !== 'NOT_FOUND' && <p className="note">MOT history: {motError.message}</p>}
      {motError?.code === 'NOT_FOUND' && !mot && <p className="note">No MOT record found for this car.</p>}

      {mot && mot.tests.length > 0 && <MotHistory tests={mot.tests} milesPerYear={assessment?.milesPerYear} />}
    </section>
  );
}
