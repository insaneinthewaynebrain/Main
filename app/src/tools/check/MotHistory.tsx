import { formatISODate } from '../../domain/dates';
import type { MotTest } from '../../domain/vehicle/types';
import { formatMiles } from '../../lib/format';

const ORDER = ['DANGEROUS', 'MAJOR', 'FAIL', 'PRS', 'MINOR', 'ADVISORY'];
const LABEL: Record<string, string> = {
  DANGEROUS: 'Dangerous', MAJOR: 'Major', FAIL: 'Fail', PRS: 'Fixed during test', MINOR: 'Minor', ADVISORY: 'Advisory',
  'USER ENTERED': 'Note', 'SYSTEM GENERATED': 'Note', 'NON SPECIFIC': 'Note',
};

export default function MotHistory({ tests, milesPerYear }: { tests: MotTest[]; milesPerYear?: number }) {
  return (
    <details className="mot-history">
      <summary>
        <span>MOT history · {tests.length} {tests.length === 1 ? 'test' : 'tests'}</span>
        {milesPerYear !== undefined && <span className="muted">avg {formatMiles(milesPerYear)}/yr</span>}
      </summary>
      <ol className="mot-tests">
        {tests.map((t, i) => {
          const defects = [...t.defects].sort((a, b) => rank(a.type, a.dangerous) - rank(b.type, b.dangerous));
          return (
            <li key={`${t.date}-${t.testNumber ?? i}`} className="mot-test">
              <div className="mot-test-head">
                <span className={`badge badge--${t.result === 'PASSED' ? 'pass' : 'fail'}`}>{t.result === 'PASSED' ? 'Pass' : 'Fail'}</span>
                <strong>{formatISODate(t.date)}</strong>
                <span className="muted">{t.odometer ? `${t.odometer.value.toLocaleString('en-GB')} ${t.odometer.unit}` : 'Mileage not read'}</span>
              </div>
              {t.expiryDate && <p className="muted small">Expiry {formatISODate(t.expiryDate)}</p>}
              {defects.length === 0 ? (
                <p className="muted small">No defects or advisories</p>
              ) : (
                <ul className="defects">
                  {defects.map((d, j) => {
                    const type = d.dangerous ? 'DANGEROUS' : d.type.toUpperCase();
                    return (
                      <li key={j} className={`defect defect--${type.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="defect-type">{LABEL[type] ?? type}</span> {d.text}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function rank(type: string, dangerous: boolean) {
  const i = ORDER.indexOf(dangerous ? 'DANGEROUS' : type.toUpperCase());
  return i === -1 ? 99 : i;
}
