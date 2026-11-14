/**
 * Pure finance maths. No React, no DOM — safe to unit test and reuse.
 */
import { financeRules, type FinanceRules } from '../config/financeRules';

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

/** Monthly rate equivalent to an annual APR: (1 + APR)^(1/12) − 1. */
export function monthlyRateFromApr(apr: number): number {
  return Math.pow(1 + apr, 1 / 12) - 1;
}

/**
 * Whole months between the 1st of the registration month and `today`.
 * Negative if the registration date is in the future.
 */
export function carAgeInWholeMonths(registration: YearMonth, today: Date): number {
  const months =
    (today.getFullYear() - registration.year) * 12 + (today.getMonth() + 1 - registration.month);
  // Registration is the 1st, so a partial month only "doesn't count" if today is before the 1st,
  // which can't happen — but keep the general rule for clarity.
  return today.getDate() >= 1 ? months : months - 1;
}

/** Term available: min(maxTerm, maxAgeAtEnd − current age). May be ≤ 0. */
export function availableTermMonths(ageMonths: number, rules: FinanceRules = financeRules): number {
  return Math.min(rules.maxTermMonths, rules.maxCarAgeAtEndMonths - ageMonths);
}

/** Standard amortising payment. Handles a zero rate. */
export function monthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (termMonths <= 0) throw new RangeError('termMonths must be positive');
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export interface QuoteInput {
  price: number;
  deposit: number;
  registration: YearMonth;
  today: Date;
}

export type Quote =
  | {
      status: 'ok';
      termMonths: number;
      /** True when the car's age forced a term below the maximum. */
      termShortened: boolean;
      carAgeMonths: number;
      amountFinanced: number;
      monthlyPayment: number;
      totalInterest: number;
      /** Deposit plus all monthly payments. */
      totalPayable: number;
      apr: number;
    }
  | { status: 'no-price' }
  | { status: 'future-registration' }
  | { status: 'nothing-to-finance' }
  | { status: 'not-eligible'; carAgeMonths: number; termMonths: number };

export function calculateQuote(input: QuoteInput, rules: FinanceRules = financeRules): Quote {
  const { price, deposit, registration, today } = input;

  const carAgeMonths = carAgeInWholeMonths(registration, today);
  if (carAgeMonths < 0) return { status: 'future-registration' };

  const termMonths = availableTermMonths(carAgeMonths, rules);
  if (termMonths < rules.minTermMonths) {
    return { status: 'not-eligible', carAgeMonths, termMonths: Math.max(0, termMonths) };
  }

  if (!Number.isFinite(price) || price <= 0) return { status: 'no-price' };

  const amountFinanced = price - deposit;
  if (amountFinanced <= 0) return { status: 'nothing-to-finance' };

  const rate = monthlyRateFromApr(rules.apr);
  const payment = monthlyPayment(amountFinanced, rate, termMonths);
  const totalRepaid = payment * termMonths;

  return {
    status: 'ok',
    termMonths,
    termShortened: termMonths < rules.maxTermMonths,
    carAgeMonths,
    amountFinanced,
    monthlyPayment: payment,
    totalInterest: totalRepaid - amountFinanced,
    totalPayable: totalRepaid + deposit,
    apr: rules.apr,
  };
}

/** Deposit options from the rules, e.g. [0, 500, …, 10000]. */
export function depositOptions(rules: FinanceRules = financeRules): number[] {
  const { min, max, step } = rules.deposit;
  const out: number[] = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}
