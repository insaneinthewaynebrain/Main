import { TrafficLight } from '../../components/TrafficLight';
import type { MotAssessment } from '../../domain/mot/trafficLight';
import type { ApiError, MotVehicle } from '../../domain/vehicle/types';
import FixList from './FixList';
import MotHistory from './MotHistory';

interface Props {
  mot?: MotVehicle;
  make?: string;
  assessment?: MotAssessment;
  motError?: ApiError;
}

export default function MotPanel({ mot, make, assessment, motError }: Props) {
  return (
    <div className="panel">
      {assessment && (
        <section className={`card mot-card mot-light--${assessment.light}`}>
          <div className="mot-light-row">
            <TrafficLight light={assessment.light} />
            <div>
              <p className="mot-light-title">MOT {assessment.light === 'none' ? '' : assessment.light.toUpperCase()}</p>
              <p className="mot-light-reason">{assessment.reason}</p>
            </div>
          </div>
          {assessment.reasons.length > 1 && (
            <ul className="reason-list">
              {assessment.reasons.slice(1).map((r) => (
                <li key={r.text} className={`reason reason--${r.light}`}>{r.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {mot?.hasOutstandingRecall === 'Yes' && (
        <p className="note note--warn">Outstanding safety recall — ask the seller for proof it has been fixed.</p>
      )}
      {motError && motError.code !== 'NOT_FOUND' && <p className="note">MOT history: {motError.message}</p>}
      {motError?.code === 'NOT_FOUND' && !mot && <p className="note">No MOT record found for this car.</p>}
      <FixList latest={mot?.tests[0]} make={mot?.make ?? make} model={mot?.model} />
      {mot && mot.tests.length > 0 && (
        <section className="card">
          <MotHistory tests={mot.tests} milesPerYear={assessment?.milesPerYear} />
        </section>
      )}
    </div>
  );
}
