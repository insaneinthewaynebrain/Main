import { describe, expect, it } from 'vitest';
import {
  calculateQuote,
  carAgeInWholeMonths,
  chooseTerm,
  depositOptions,
  maxTermForAge,
  monthlyPayment,
  monthlyRateFromApr,
  termWorking,
} from './calculator';
import { financeRules } from '../../config/financeRules';
import { wholeMonthsBetween } from '../dates';

describe('monthlyRateFromApr', () => {
  it('compounds back to the APR over 12 months', () => {
    const r = monthlyRateFromApr(0.099);
    expect(Math.pow(1 + r, 12) - 1).toBeCloseTo(0.099, 12);
    expect(r).toBeCloseTo(0.0078977, 6);
  });
  it('is zero for 0% APR', () => {
    expect(monthlyRateFromApr(0)).toBe(0);
  });
});

describe('car age from the exact registration date', () => {
  it('matches the worked example: 14 Jul 2022 → 16 Nov 2026 is 52 months', () => {
    expect(carAgeInWholeMonths('2022-07-14', '2026-11-16')).toBe(52);
  });
  it('only counts a month once the day is reached', () => {
    expect(carAgeInWholeMonths('2022-07-14', '2026-11-13')).toBe(51);
    expect(carAgeInWholeMonths('2022-07-14', '2026-11-14')).toBe(52);
  });
  it('treats the last day of a short month as a full month', () => {
    expect(wholeMonthsBetween('2024-01-31', '2024-02-29')).toBe(1);
    expect(wholeMonthsBetween('2023-01-31', '2023-02-28')).toBe(1);
    expect(wholeMonthsBetween('2023-01-31', '2023-02-27')).toBe(0);
  });
  it('crosses year boundaries and is negative for a future registration', () => {
    expect(carAgeInWholeMonths('2025-12-01', '2026-01-05')).toBe(1);
    expect(carAgeInWholeMonths('2027-01-01', '2026-11-16')).toBeLessThan(0);
  });
});

describe('maxTermForAge', () => {
  it('caps at 60 for young cars', () => {
    expect(maxTermForAge(0)).toBe(60);
    expect(maxTermForAge(36)).toBe(60);
  });
  it('shortens for older cars', () => {
    expect(maxTermForAge(37)).toBe(59);
    expect(maxTermForAge(52)).toBe(44);
    expect(maxTermForAge(84)).toBe(12);
    expect(maxTermForAge(85)).toBe(11);
  });
});

describe('termWorking', () => {
  it('gives the max term and flags shortening', () => {
    expect(termWorking('2022-07-14', '2026-11-16')).toEqual({
      status: 'ok', carAgeMonths: 52, maxTermMonths: 44, shortenedByAge: true,
    });
    expect(termWorking('2024-01-01', '2026-11-16').shortenedByAge).toBe(false);
  });
  it('uses the agreement start, not today', () => {
    // Starting the agreement a month later loses a month of term.
    expect(termWorking('2022-07-14', '2026-12-16').maxTermMonths).toBe(43);
  });
  it('is not eligible under 12 months', () => {
    expect(termWorking('2019-11-16', '2026-11-16')).toMatchObject({ status: 'ok', maxTermMonths: 12 });
    expect(termWorking('2019-11-17', '2026-11-16')).toMatchObject({ status: 'ok', maxTermMonths: 13 });
    expect(termWorking('2019-10-16', '2026-11-16')).toMatchObject({ status: 'not-eligible', maxTermMonths: 11 });
  });
  it('rejects a registration after the agreement start', () => {
    expect(termWorking('2026-12-01', '2026-11-16').status).toBe('future-registration');
  });
});

describe('chooseTerm', () => {
  it('defaults to the maximum', () => {
    expect(chooseTerm(undefined, 44)).toBe(44);
  });
  it('lets you go shorter but never longer, nor under the minimum', () => {
    expect(chooseTerm(36, 44)).toBe(36);
    expect(chooseTerm(60, 44)).toBe(44);
    expect(chooseTerm(6, 44)).toBe(12);
  });
});

describe('monthlyPayment', () => {
  it('matches the standard amortisation formula', () => {
    expect(monthlyPayment(10_000, monthlyRateFromApr(0.099), 60)).toBeCloseTo(209.91, 2);
  });
  it('fully repays the loan', () => {
    const r = monthlyRateFromApr(0.099);
    const p = monthlyPayment(15_000, r, 48);
    let balance = 15_000;
    for (let i = 0; i < 48; i++) balance = balance * (1 + r) - p;
    expect(balance).toBeCloseTo(0, 6);
  });
  it('handles a zero rate and rejects a non-positive term', () => {
    expect(monthlyPayment(1200, 0, 12)).toBe(100);
    expect(() => monthlyPayment(1000, 0.01, 0)).toThrow(RangeError);
  });
});

describe('calculateQuote', () => {
  const base = { price: 15_000, deposit: 1_000, registrationDate: '2022-07-14', agreementStart: '2026-11-16' };

  it('uses the max term from the car age by default', () => {
    const q = calculateQuote(base);
    expect(q.status).toBe('ok');
    if (q.status !== 'ok') return;
    expect(q.carAgeMonths).toBe(52);
    expect(q.termMonths).toBe(44);
    expect(q.maxTermMonths).toBe(44);
    expect(q.termShortened).toBe(true);
    expect(q.amountFinanced).toBe(14_000);
    expect(q.monthlyPayment).toBeCloseTo(monthlyPayment(14_000, monthlyRateFromApr(0.099), 44), 10);
    expect(q.totalInterest).toBeCloseTo(q.monthlyPayment * 44 - 14_000, 8);
    expect(q.totalPayable).toBeCloseTo(q.monthlyPayment * 44 + 1_000, 8);
  });

  it('accepts a shorter term but clamps a longer one', () => {
    const shorter = calculateQuote({ ...base, requestedTermMonths: 36 });
    expect(shorter.status === 'ok' && shorter.termMonths).toBe(36);
    const longer = calculateQuote({ ...base, requestedTermMonths: 60 });
    expect(longer.status === 'ok' && longer.termMonths).toBe(44);
  });

  it('uses the full 60 months for a young car', () => {
    const q = calculateQuote({ ...base, registrationDate: '2025-06-01' });
    expect(q.status === 'ok' && q.termMonths).toBe(60);
    expect(q.status === 'ok' && q.termShortened).toBe(false);
  });

  it('is not eligible below 12 months, even before a price is entered', () => {
    expect(calculateQuote({ ...base, registrationDate: '2019-10-16' })).toEqual({
      status: 'not-eligible', carAgeMonths: 85, termMonths: 11,
    });
    expect(calculateQuote({ ...base, price: NaN, registrationDate: '2015-01-01' }).status).toBe('not-eligible');
  });

  it('asks for a price, and flags when the deposit covers it', () => {
    expect(calculateQuote({ ...base, price: NaN }).status).toBe('no-price');
    expect(calculateQuote({ ...base, price: 0 }).status).toBe('no-price');
    expect(calculateQuote({ ...base, price: 1_000 }).status).toBe('nothing-to-finance');
  });

  it('rejects a future registration', () => {
    expect(calculateQuote({ ...base, registrationDate: '2026-12-01' }).status).toBe('future-registration');
  });

  it('respects custom rules', () => {
    const rules = { ...financeRules, maxTermMonths: 36, apr: 0 };
    const q = calculateQuote({ ...base, registrationDate: '2026-01-01' }, rules);
    expect(q.status === 'ok' && q.termMonths).toBe(36);
    expect(q.status === 'ok' && q.monthlyPayment).toBeCloseTo(14_000 / 36, 10);
  });
});

describe('depositOptions', () => {
  it('runs £0 to £10,000 in £500 steps', () => {
    const opts = depositOptions();
    expect(opts[0]).toBe(0);
    expect(opts.at(-1)).toBe(10_000);
    expect(opts).toHaveLength(21);
    expect(opts).toContain(financeRules.deposit.default);
  });
});
