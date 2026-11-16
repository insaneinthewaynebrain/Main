/**
 * Pure hire purchase maths. No React, no DOM — safe to unit test and reuse
 * (including in a future native app).
 */
import { financeRules, type FinanceRules } from '../../config/financeRules';
import { wholeMonthsBetween, type ISODate } from '../dates';

/** Monthly rate equivalent to an annual APR: (1 + APR)^(1/12) − 1. */
export function monthlyRateFromApr(apr: number): number {
  return Math.pow(1 + apr, 1 / 12) - 1;
}

/** Car's age in whole months at the agreement start. Negative if registered after it. */
export function carAgeInWholeMonths(registrationDate: ISODate, agreementStart: ISODate): number {
  return wholeMonthsBetween(registrationDate, agreementStart);
}

/** Longest term allowed: min(maxTerm, maxAgeAtEnd − age). May be ≤ 0. */
export function maxTermForAge(ageMonths: number, rules: FinanceRules = financeRules): number {
  return Math.min(rules.maxTermMonths, rules.maxCarAgeAtEndMonths - ageMonths);
}

/** Standard amortising payment. Handles a zero rate. */
export function monthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (termMonths <= 0) throw new RangeError('termMonths must be positive');
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export interface TermWorking {
  status: 'ok' | 'not-eligible' | 'future-registration';
  carAgeMonths: number;
  /** Longest term allowed by the rules (0 if not eligible). */
  maxTermMonths: number;
  /** True when the car's age forced the max term below the product maximum. */
  shortenedByAge: boolean;
}

/** The term rule on its own — used for the "working" line and the term picker. */
export function termWorking(
  registrationDate: ISODate,
  agreementStart: ISODate,
  rules: FinanceRules = financeRules,
): TermWorking {
  const carAgeMonths = carAgeInWholeMonths(registrationDate, agreementStart);
  if (registrationDate > agreementStart) {
    return { status: 'future-registration', carAgeMonths, maxTermMonths: 0, shortenedByAge: false };
  }
  const max = maxTermForAge(carAgeMonths, rules);
  if (max < rules.minTermMonths) {
    return { status: 'not-eligible', carAgeMonths, maxTermMonths: Math.max(0, max), shortenedByAge: true };
  }
  return { status: 'ok', carAgeMonths, maxTermMonths: max, shortenedByAge: max < rules.maxTermMonths };
}

/** Clamp a requested term into [minTerm, maxTerm]. No request → the maximum. */
export function chooseTerm(requested: number | undefined, maxTerm: number, rules: FinanceRules = financeRules): number {
  if (requested === undefined || !Number.isFinite(requested)) return maxTerm;
  return Math.max(rules.minTermMonths, Math.min(Math.round(requested), maxTerm));
}

export interface QuoteInput {
  price: number;
  deposit: number;
  registrationDate: ISODate;
  /** Defaults to today in the UI; editable. */
  agreementStart: ISODate;
  /** The term the user picked. Can be shorter than the maximum, never longer. */
  requestedTermMonths?: number;
}

export type Quote =
  | {
      status: 'ok';
      termMonths: number;
      maxTermMonths: number;
      /** True when the car's age forced the max term below the product maximum. */
      termShortened: boolean;
      carAgeMonths: number;
      amountFinanced: number;
      monthlyPayment: number;
      totalInterest: number;
      /** Deposit plus all monthly payments (no fees). */
      totalPayable: number;
      apr: number;
    }
  | { status: 'no-price'; working: TermWorking }
  | { status: 'future-registration' }
  | { status: 'nothing-to-finance'; working: TermWorking }
  | { status: 'not-eligible'; carAgeMonths: number; termMonths: number };

export function calculateQuote(input: QuoteInput, rules: FinanceRules = financeRules): Quote {
  const { price, deposit, registrationDate, agreementStart, requestedTermMonths } = input;

  const working = termWorking(registrationDate, agreementStart, rules);
  if (working.status === 'future-registration') return { status: 'future-registration' };
  if (working.status === 'not-eligible') {
    return { status: 'not-eligible', carAgeMonths: working.carAgeMonths, termMonths: working.maxTermMonths };
  }

  if (!Number.isFinite(price) || price <= 0) return { status: 'no-price', working };

  const amountFinanced = price - deposit;
  if (amountFinanced <= 0) return { status: 'nothing-to-finance', working };

  const termMonths = chooseTerm(requestedTermMonths, working.maxTermMonths, rules);
  const payment = monthlyPayment(amountFinanced, monthlyRateFromApr(rules.apr), termMonths);
  const totalRepaid = payment * termMonths;

  return {
    status: 'ok',
    termMonths,
    maxTermMonths: working.maxTermMonths,
    termShortened: working.shortenedByAge,
    carAgeMonths: working.carAgeMonths,
    amountFinanced,
    monthlyPayment: payment,
    totalInterest: totalRepaid - amountFinanced,
    totalPayable: totalRepaid + deposit + rules.fees,
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
