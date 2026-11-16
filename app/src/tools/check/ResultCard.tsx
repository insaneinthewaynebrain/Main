import type { CSSProperties } from 'react';
import { financeRules } from '../../config/financeRules';
import type { Quote } from '../../domain/finance/calculator';
import { formatAge, formatGBP } from '../../lib/format';

interface Props {
  quote?: Quote;
  monthlyTax?: number;
  trueMonthly?: number;
  /** Shown when there's no registration date yet. */
  needsDate?: boolean;
}

const years = financeRules.maxCarAgeAtEndMonths / 12;

export default function ResultCard({ quote, monthlyTax, trueMonthly, needsDate }: Props) {
  if (!quote || quote.status !== 'ok') {
    let title = 'Enter the car price';
    let body = 'Your monthly payment will appear here.';
    let warn = false;
    if (needsDate || !quote) {
      title = 'Look up a car';
      body = 'Enter a registration above, or the registration date below.';
    } else if (quote.status === 'nothing-to-finance') {
      title = 'Nothing to finance';
      body = 'The deposit covers the full price of the car.';
    } else if (quote.status === 'future-registration') {
      title = 'Check the dates';
      body = 'The registration date is after the agreement start.';
      warn = true;
    } else if (quote.status === 'not-eligible') {
      title = 'Not eligible';
      body = `This car will be ${formatAge(quote.carAgeMonths)} old when the agreement starts. It must be no more than ${years} years old when the agreement ends, which leaves ${quote.termMonths === 1 ? '1 month' : `${quote.termMonths} months`} — the minimum term is ${financeRules.minTermMonths} months.`;
      warn = true;
    }
    return (
      <section className={`card result result--empty${warn ? ' result--warn' : ''}`} aria-live="polite">
        <p className="result-title">{title}</p>
        <p className="result-body">{body}</p>
      </section>
    );
  }

  const payment = formatGBP(quote.monthlyPayment);
  return (
    <section className="card result" aria-live="polite">
      <p className="result-label">Monthly payment</p>
      <p className="result-payment" style={{ '--chars': payment.length } as CSSProperties}>
        {payment}
      </p>
      {trueMonthly !== undefined && monthlyTax !== undefined && (
        <p className="true-cost">
          + {formatGBP(monthlyTax)} road tax = <strong>{formatGBP(trueMonthly)}</strong> a month
        </p>
      )}
      <dl className="breakdown">
        <div>
          <dt>Term</dt>
          <dd>
            {quote.termMonths} months{quote.termMonths < quote.maxTermMonths ? ` (max ${quote.maxTermMonths})` : ''}
          </dd>
        </div>
        {quote.termShortened && (
          <p className="note">
            Max term shortened from {financeRules.maxTermMonths} months because the car must be no more than {years} years
            old when the agreement ends.
          </p>
        )}
        <div>
          <dt>Amount financed</dt>
          <dd>{formatGBP(quote.amountFinanced)}</dd>
        </div>
        <div>
          <dt>Total interest</dt>
          <dd>{formatGBP(quote.totalInterest)}</dd>
        </div>
        <div>
          <dt>Total payable</dt>
          <dd>{formatGBP(quote.totalPayable)}</dd>
        </div>
      </dl>
      <p className="result-hint">Total payable includes your deposit. No fees.</p>
    </section>
  );
}
