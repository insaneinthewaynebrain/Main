import { useId } from 'react';
import { vedRates } from '../../config/vedRates';
import { directDebitMonthly, type VedEstimate } from '../../domain/tax/ved';
import { formatISODate } from '../../domain/dates';
import { formatGBP, formatGBPWhole } from '../../lib/format';

interface Props {
  ved?: VedEstimate;
  listPriceText: string;
  overThreshold: boolean;
  onListPrice: (text: string) => void;
  onOverThreshold: (value: boolean) => void;
  /** For cars without lookup data. */
  manual?: {
    co2Text: string;
    engineText: string;
    onCo2: (t: string) => void;
    onEngine: (t: string) => void;
  };
}

export default function TaxCard({ ved, listPriceText, overThreshold, onListPrice, onOverThreshold, manual }: Props) {
  const ids = { list: useId(), over: useId(), co2: useId(), engine: useId() };
  if (!ved) return null;

  return (
    <section className="card tax" aria-label="Road tax">
      <h2 className="card-title">Road tax (VED)</h2>
      {ved.status === 'needs-input' ? (
        <>
          <p className="muted">{ved.rule}.</p>
          {manual && ved.missing === 'co2' && (
            <div className="field">
              <label htmlFor={ids.co2}>CO2 emissions (g/km, from the V5C)</label>
              <input id={ids.co2} inputMode="numeric" value={manual.co2Text} onChange={(e) => manual.onCo2(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
          {manual && ved.missing === 'engine' && (
            <div className="field">
              <label htmlFor={ids.engine}>Engine size (cc)</label>
              <input id={ids.engine} inputMode="numeric" value={manual.engineText} onChange={(e) => manual.onEngine(e.target.value.replace(/\D/g, ''))} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="tax-amount">
            approx <strong>{formatGBPWhole(ved.annual)}</strong> a year
            <span className="muted"> · {formatGBP(ved.monthly)}/month</span>
          </p>
          <p className="tax-rule">{ved.rule}</p>
          <p className="muted small">
            Paying by 12 monthly Direct Debits costs {Math.round(vedRates.directDebitMonthlySurcharge * 100)}% more (
            {formatGBP(directDebitMonthly(ved.annual))}/month).
          </p>

          {ved.likelyExpensive && !overThreshold && (
            <div className="note note--warn">
              <p>{ved.likelyExpensive}.</p>
              <button type="button" className="btn btn-small" onClick={() => onOverThreshold(true)}>
                Include the supplement
              </button>
            </div>
          )}

          {ved.supplementRelevant && (
            <div className="ecs">
              <label className="checkbox" htmlFor={ids.over}>
                <input id={ids.over} type="checkbox" checked={overThreshold} onChange={(e) => onOverThreshold(e.target.checked)} />
                <span>
                  List price was over {formatGBPWhole(ved.threshold ?? vedRates.expensiveCarSupplement.threshold)} when new
                </span>
              </label>
              <div className="field">
                <label htmlFor={ids.list}>…or enter the list price when new</label>
                <div className="money-input">
                  <span aria-hidden="true">£</span>
                  <input
                    id={ids.list}
                    inputMode="numeric"
                    placeholder="Optional"
                    value={listPriceText}
                    onChange={(e) => onListPrice(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
              </div>
              {ved.supplement && ved.supplement.yearsRemaining > 0 && (
                <p className="muted small">
                  Supplement of £{vedRates.expensiveCarSupplement.amount}/yr: {ved.supplement.yearsRemaining}{' '}
                  {ved.supplement.yearsRemaining === 1 ? 'year' : 'years'} remaining, ends {formatISODate(ved.supplement.endsOn)}.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <p className="muted small">
        Rates from {formatISODate(vedRates.ratesFrom)} (checked {formatISODate(vedRates.checkedOn)}).{' '}
        <a href={vedRates.sources.rateTables} target="_blank" rel="noopener noreferrer">GOV.UK rates</a>
      </p>
    </section>
  );
}
