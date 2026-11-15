import { useId, type CSSProperties } from 'react';
import { financeRules } from '../../config/financeRules';
import { calculateQuote, depositOptions, type Quote } from '../../finance/calculator';
import { formatAge, formatGBP, formatGBPWhole, formatPercent, MONTH_NAMES, parseMoney } from '../../finance/format';
import { usePersistentState } from '../../hooks/usePersistentState';

const DEPOSITS = depositOptions();

export default function CarFinanceCalculator() {
  const ids = { price: useId(), deposit: useId(), month: useId(), year: useId() };
  const [priceText, setPriceText] = usePersistentState('price', '');
  const [deposit, setDeposit] = usePersistentState<number>('deposit', financeRules.deposit.default);
  const [regMonth, setRegMonth] = usePersistentState<number>('regMonth', financeRules.defaultRegistration.month);
  const [regYear, setRegYear] = usePersistentState<number>('regYear', financeRules.defaultRegistration.year);

  // Agreement starts today — re-read on every render so it never goes stale.
  const today = new Date();
  const thisYear = today.getFullYear();
  const years = Array.from({ length: financeRules.registrationYearsBack + 1 }, (_, i) => thisYear - i);
  if (!years.includes(regYear)) years.push(regYear);

  const quote = calculateQuote({
    price: parseMoney(priceText),
    deposit,
    registration: { year: regYear, month: regMonth },
    today,
  });

  return (
    <div className="calc">
      <ResultCard quote={quote} />

      <section className="card inputs" aria-label="Car details">
        <div className="field">
          <label htmlFor={ids.price}>Car price</label>
          <div className="money-input">
            <span aria-hidden="true">£</span>
            <input
              id={ids.price}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="0"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor={ids.deposit}>Deposit</label>
          <select id={ids.deposit} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))}>
            {DEPOSITS.map((d) => (
              <option key={d} value={d}>{formatGBPWhole(d)}</option>
            ))}
          </select>
        </div>

        <fieldset className="field">
          <legend>Registration date</legend>
          <div className="row">
            <label htmlFor={ids.month} className="sr-only">Month</label>
            <select id={ids.month} value={regMonth} onChange={(e) => setRegMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
            <label htmlFor={ids.year} className="sr-only">Year</label>
            <select id={ids.year} value={regYear} onChange={(e) => setRegYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <div className="fixed-rate">
          <span>APR (fixed)</span>
          <strong>{formatPercent(financeRules.apr)}</strong>
        </div>
      </section>

      <p className="footnote">
        {financeRules.productName}, starting today. Maximum term {financeRules.maxTermMonths} months; the car
        must be no more than {financeRules.maxCarAgeAtEndMonths / 12} years old at the end of the agreement.
        Figures are estimates.
      </p>
    </div>
  );
}

function ResultCard({ quote }: { quote: Quote }) {
  if (quote.status !== 'ok') {
    const messages: Record<Exclude<Quote['status'], 'ok'>, { title: string; body: string; warn?: boolean }> = {
      'no-price': { title: 'Enter the car price', body: 'Your monthly payment will appear here.' },
      'nothing-to-finance': {
        title: 'Nothing to finance',
        body: 'The deposit covers the full price of the car.',
      },
      'future-registration': {
        title: 'Check the registration date',
        body: 'The registration date is in the future.',
        warn: true,
      },
      'not-eligible': {
        title: 'Not eligible',
        body:
          quote.status === 'not-eligible'
            ? `This car is ${formatAge(quote.carAgeMonths)} old. It must be no more than ${
                financeRules.maxCarAgeAtEndMonths / 12
              } years old when the agreement ends, which leaves ${
                quote.termMonths === 1 ? '1 month' : `${quote.termMonths} months`
              } — the minimum term is ${financeRules.minTermMonths} months.`
            : '',
        warn: true,
      },
    };
    const m = messages[quote.status];
    return (
      <section className={`card result result--empty${m.warn ? ' result--warn' : ''}`} aria-live="polite">
        <p className="result-title">{m.title}</p>
        <p className="result-body">{m.body}</p>
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
      <dl className="breakdown">
        <div>
          <dt>Term</dt>
          <dd>{quote.termMonths} months</dd>
        </div>
        {quote.termShortened && (
          <p className="note">
            Shortened from {financeRules.maxTermMonths} months because the car is {formatAge(quote.carAgeMonths)} old
            and must be no more than {financeRules.maxCarAgeAtEndMonths / 12} years old at the end.
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
      <p className="result-hint">Total payable includes your deposit.</p>
    </section>
  );
}
