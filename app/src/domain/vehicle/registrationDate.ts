/**
 * Works out which registration date to use for the car's age, and how sure we are.
 */
import { isValidISODate, toISODate, type ISODate } from '../dates';
import type { DvlaVehicle, MotVehicle } from './types';

export interface ResolvedRegistrationDate {
  date: ISODate;
  /** True when only the month is known and the 1st is assumed. */
  approx: boolean;
  source: 'mot' | 'dvla' | 'manual';
}

export interface ManualRegistrationDate {
  year: number;
  month: number;
  /** Leave out if unknown — the 1st is assumed and the date is labelled approx. */
  day?: number;
}

/**
 * Priority: exact date from MOT data → DVLA month (assume the 1st, approx) → manual entry.
 * A manual date, when given, overrides the lookup.
 */
export function resolveRegistrationDate(input: {
  mot?: MotVehicle;
  dvla?: DvlaVehicle;
  manual?: ManualRegistrationDate;
}): ResolvedRegistrationDate | undefined {
  const { mot, dvla, manual } = input;
  if (manual) {
    return {
      date: toISODate(manual.year, manual.month, manual.day ?? 1),
      approx: manual.day === undefined,
      source: 'manual',
    };
  }
  const exact = mot?.registrationDate ?? mot?.firstUsedDate;
  if (exact && isValidISODate(exact)) return { date: exact, approx: false, source: 'mot' };
  if (dvla?.yearOfFirstRegistration && dvla.monthOfFirstRegistration) {
    return {
      date: toISODate(dvla.yearOfFirstRegistration, dvla.monthOfFirstRegistration, 1),
      approx: true,
      source: 'dvla',
    };
  }
  return undefined;
}
