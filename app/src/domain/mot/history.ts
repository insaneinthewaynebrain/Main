/**
 * MOT history analysis: mileage in miles, averages and roll-backs.
 */
import { daysBetween, type ISODate } from '../dates';
import type { MotTest } from '../vehicle/types';

const KM_PER_MILE = 1.609344;

/** Odometer reading in miles, or undefined if not read. */
export function readingInMiles(test: MotTest): number | undefined {
  if (!test.odometer) return undefined;
  return test.odometer.unit === 'km' ? test.odometer.value / KM_PER_MILE : test.odometer.value;
}

/** Tests sorted oldest first. */
export function chronological(tests: MotTest[]): MotTest[] {
  return [...tests].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Tests sorted newest first. */
export function newestFirst(tests: MotTest[]): MotTest[] {
  return chronological(tests).reverse();
}

export interface MileageDrop {
  from: { date: ISODate; miles: number };
  to: { date: ISODate; miles: number };
}

/** Every place a later reading is lower than the highest earlier reading. */
export function findMileageDrops(tests: MotTest[]): MileageDrop[] {
  const drops: MileageDrop[] = [];
  let highest: { date: ISODate; miles: number } | undefined;
  for (const t of chronological(tests)) {
    const miles = readingInMiles(t);
    if (miles === undefined) continue;
    if (highest && miles < highest.miles - 0.5) {
      drops.push({ from: highest, to: { date: t.date, miles } });
    }
    if (!highest || miles > highest.miles) highest = { date: t.date, miles };
  }
  return drops;
}

/**
 * Average miles per year: latest reading ÷ years since registration.
 * Falls back to the spread between first and last readings if the
 * registration date is unknown.
 */
export function averageMilesPerYear(tests: MotTest[], registrationDate?: ISODate): number | undefined {
  const read = chronological(tests).filter((t) => readingInMiles(t) !== undefined);
  if (read.length === 0) return undefined;
  const last = read[read.length - 1];
  const lastMiles = readingInMiles(last)!;
  if (registrationDate) {
    const years = daysBetween(registrationDate, last.date) / 365.25;
    return years > 0.25 ? lastMiles / years : undefined;
  }
  if (read.length < 2) return undefined;
  const first = read[0];
  const years = daysBetween(first.date, last.date) / 365.25;
  return years > 0.25 ? (lastMiles - readingInMiles(first)!) / years : undefined;
}

export function isAdvisory(type: string): boolean {
  return type.toUpperCase() === 'ADVISORY';
}

/** Major, dangerous, or an old-style (pre-May 2018) failure item. */
export function isSerious(defect: { type: string; dangerous: boolean }): boolean {
  const t = defect.type.toUpperCase();
  return defect.dangerous || t === 'DANGEROUS' || t === 'MAJOR' || t === 'FAIL' || t === 'PRS';
}

/** Normalise defect text so the same advisory matches across years. */
export function normaliseDefectText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // inspection-manual references like (5.3.4 (a) (i))
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
