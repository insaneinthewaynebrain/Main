import { describe, expect, it } from 'vitest';
import {
  availableTermMonths,
  calculateQuote,
  carAgeInWholeMonths,
  depositOptions,
  monthlyPayment,
  monthlyRateFromApr,
} from './calculator';
import { financeRules } from '../config/financeRules';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

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

describe('carAgeInWholeMonths', () => {
  it('counts whole months from the 1st of the registration month', () => {
    expect(carAgeInWholeMonths({ year: 2023, month: 10 }, d(2026, 11, 14))).toBe(37);
    expect(carAgeInWholeMonths({ year: 2023, month: 10 }, d(2023, 10, 1))).toBe(0);
    expect(carAgeInWholeMonths({ year: 2023, month: 10 }, d(2023, 10, 31))).toBe(0);
    expect(carAgeInWholeMonths({ year: 2023, month: 10 }, d(2023, 11, 1))).toBe(1);
  });
  it('crosses year boundaries', () => {
    expect(carAgeInWholeMonths({ year: 2025, month: 12 }, d(2026, 1, 5))).toBe(1);
  });
  it('is negative for a future registration', () => {
    expect(carAgeInWholeMonths({ year: 2027, month: 1 }, d(2026, 11, 14))).toBeLessThan(0);
  });
});

describe('availableTermMonths', () => {
  it('caps at the maximum term for young cars', () => {
    expect(availableTermMonths(0)).toBe(60);
    expect(availableTermMonths(36)).toBe(60);
  });
  it('shortens for older cars', () => {
    expect(availableTermMonths(37)).toBe(59);
    expect(availableTermMonths(84)).toBe(12);
    expect(availableTermMonths(85)).toBe(11);
    expect(availableTermMonths(100)).toBe(-4);
  });
});

describe('monthlyPayment', () => {
  it('matches the standard amortisation formula', () => {
    const r = monthlyRateFromApr(0.099);
    // £10,000 over 60 months at 9.9% APR
    expect(monthlyPayment(10_000, r, 60)).toBeCloseTo(209.91, 2);
  });
  it('fully repays the loan', () => {
    const r = monthlyRateFromApr(0.099);
    const p = monthlyPayment(15_000, r, 48);
    let balance = 15_000;
    for (let i = 0; i < 48; i++) balance = balance * (1 + r) - p;
    expect(balance).toBeCloseTo(0, 6);
  });
  it('handles a zero rate', () => {
    expect(monthlyPayment(1200, 0, 12)).toBe(100);
  });
  it('rejects a non-positive term', () => {
    expect(() => monthlyPayment(1000, 0.01, 0)).toThrow(RangeError);
  });
});

describe('calculateQuote', () => {
  const today = d(2026, 11, 14);
  const base = { price: 15_000, deposit: 1_000, registration: { year: 2023, month: 10 }, today };

  it('produces a full quote with the term shortened by age', () => {
    const q = calculateQuote(base);
    expect(q.status).toBe('ok');
    if (q.status !== 'ok') return;
    expect(q.carAgeMonths).toBe(37);
    expect(q.termMonths).toBe(59);
    expect(q.termShortened).toBe(true);
    expect(q.amountFinanced).toBe(14_000);
    expect(q.monthlyPayment).toBeCloseTo(monthlyPayment(14_000, monthlyRateFromApr(0.099), 59), 10);
    expect(q.totalInterest).toBeCloseTo(q.monthlyPayment * 59 - 14_000, 8);
    expect(q.totalPayable).toBeCloseTo(q.monthlyPayment * 59 + 1_000, 8);
  });

  it('uses the full term for a young car', () => {
    const q = calculateQuote({ ...base, registration: { year: 2025, month: 6 } });
    expect(q.status === 'ok' && q.termMonths).toBe(60);
    expect(q.status === 'ok' && q.termShortened).toBe(false);
  });

  it('is eligible at exactly 12 months available', () => {
    const q = calculateQuote({ ...base, registration: { year: 2019, month: 11 } }); // 84 months old
    expect(q.status === 'ok' && q.termMonths).toBe(12);
  });

  it('is not eligible below 12 months', () => {
    const q = calculateQuote({ ...base, registration: { year: 2019, month: 10 } }); // 85 months old
    expect(q).toEqual({ status: 'not-eligible', carAgeMonths: 85, termMonths: 11 });
  });

  it('reports not eligible even before a price is entered', () => {
    expect(calculateQuote({ ...base, price: NaN, registration: { year: 2015, month: 1 } }).status).toBe(
      'not-eligible',
    );
  });

  it('asks for a price when missing or zero', () => {
    expect(calculateQuote({ ...base, price: NaN }).status).toBe('no-price');
    expect(calculateQuote({ ...base, price: 0 }).status).toBe('no-price');
  });

  it('flags when the deposit covers the price', () => {
    expect(calculateQuote({ ...base, price: 1_000 }).status).toBe('nothing-to-finance');
  });

  it('rejects a future registration', () => {
    expect(calculateQuote({ ...base, registration: { year: 2026, month: 12 } }).status).toBe(
      'future-registration',
    );
  });

  it('respects custom rules', () => {
    const rules = { ...financeRules, maxTermMonths: 36, apr: 0 };
    const q = calculateQuote({ ...base, registration: { year: 2026, month: 1 } }, rules);
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
