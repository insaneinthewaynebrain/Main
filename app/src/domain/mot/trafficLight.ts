/**
 * MOT traffic light: GREEN / AMBER / RED (or NONE for cars too new for an MOT),
 * each with a one-line reason.
 */
import { motRules, type MotRules } from '../../config/motRules';
import { daysBetween, formatISODate, wholeMonthsBetween, type ISODate } from '../dates';
import type { DvlaVehicle, MotVehicle } from '../vehicle/types';
import {
  averageMilesPerYear,
  findMileageDrops,
  isAdvisory,
  isSerious,
  newestFirst,
  normaliseDefectText,
} from './history';

export type Light = 'green' | 'amber' | 'red' | 'none';

export interface MotAssessment {
  light: Light;
  /** The most important reason, one line. */
  reason: string;
  /** Every reason found, most serious first. */
  reasons: { light: Light; text: string }[];
  milesPerYear?: number;
}

export interface MotAssessmentInput {
  mot?: MotVehicle;
  dvla?: DvlaVehicle;
  registrationDate?: ISODate;
  today: ISODate;
}

const fmtMiles = (n: number) => Math.round(n).toLocaleString('en-GB');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function assessMot(input: MotAssessmentInput, rules: MotRules = motRules): MotAssessment {
  const { mot, dvla, registrationDate, today } = input;
  const tests = newestFirst(mot?.tests ?? []);
  const red: string[] = [];
  const amber: string[] = [];
  const green: string[] = [];

  // ---- No tests at all ----
  if (tests.length === 0) {
    const ageMonths = registrationDate ? wholeMonthsBetween(registrationDate, today) : undefined;
    const dueDate = mot?.motTestDueDate ?? (dvla?.motStatus === 'Valid' ? dvla.motExpiry : undefined);
    const tooNew =
      (ageMonths !== undefined && ageMonths < rules.firstMotDueMonths) || (dueDate !== undefined && dueDate >= today);
    if (tooNew) {
      const when = dueDate ? ` — first MOT due ${formatISODate(dueDate)}` : '';
      return { light: 'none', reason: `No MOT due yet${when}`, reasons: [{ light: 'none', text: 'No MOT due yet' }] };
    }
    return {
      light: 'red',
      reason: 'No MOT test on record',
      reasons: [{ light: 'red', text: 'No MOT test on record' }],
    };
  }

  const latest = tests[0];

  // ---- Valid MOT? ----
  const bestExpiry = tests
    .filter((t) => t.result === 'PASSED' && t.expiryDate)
    .map((t) => t.expiryDate!)
    .sort()
    .at(-1);
  if (!bestExpiry || bestExpiry < today) {
    red.push(bestExpiry ? `No valid MOT — expired ${formatISODate(bestExpiry)}` : 'No valid MOT');
  } else {
    const daysLeft = daysBetween(today, bestExpiry);
    if (daysLeft <= rules.expiryWarningDays) {
      amber.push(`MOT expires in ${plural(daysLeft, 'day')} (${formatISODate(bestExpiry)})`);
    }
  }

  // ---- Latest test: serious defects ----
  const serious = latest.defects.filter(isSerious);
  if (serious.length > 0) {
    const dangerous = serious.some((d) => d.dangerous || d.type.toUpperCase() === 'DANGEROUS');
    red.push(
      `Latest test (${formatISODate(latest.date)}) found ${plural(serious.length, dangerous ? 'dangerous/major defect' : 'major defect')}`,
    );
  }

  // ---- Corrosion ----
  const corrosion = latest.defects.filter((d) => rules.corrosionPattern.test(d.text));
  const structural = corrosion.filter((d) => isSerious(d) || rules.structuralPattern.test(d.text));
  if (structural.length > 0) {
    red.push(`Structural corrosion: ${shorten(structural[0].text)}`);
  } else if (corrosion.length > 0) {
    amber.push(`Corrosion advisory: ${shorten(corrosion[0].text)}`);
  }

  // ---- Mileage going backwards ----
  const drops = findMileageDrops(tests);
  if (drops.length > 0) {
    const d = drops[0];
    red.push(
      `Mileage went backwards: ${fmtMiles(d.from.miles)} mi (${formatISODate(d.from.date)}) → ${fmtMiles(d.to.miles)} mi (${formatISODate(d.to.date)})`,
    );
  }

  // ---- Recent fails ----
  const recentFail = tests.slice(0, rules.recentFailWindow).find((t) => t.result === 'FAILED');
  if (recentFail) amber.push(`Failed an MOT on ${formatISODate(recentFail.date)}`);

  // ---- Repeated advisory ----
  const repeated = findRepeatedAdvisory(tests, rules.repeatedAdvisoryTests);
  if (repeated) amber.push(`Same advisory in ${rules.repeatedAdvisoryTests}+ tests in a row: ${shorten(repeated)}`);

  // ---- Lots of advisories ----
  const advisories = latest.defects.filter((d) => isAdvisory(d.type)).length;
  if (advisories > rules.maxAdvisoriesForGreen) {
    amber.push(`${advisories} advisories at the latest test`);
  }

  // ---- Unusual mileage ----
  const milesPerYear = averageMilesPerYear(tests, registrationDate);
  const ageMonths = registrationDate ? wholeMonthsBetween(registrationDate, today) : undefined;
  if (milesPerYear !== undefined && (ageMonths === undefined || ageMonths > rules.mileageCheckMinAgeMonths)) {
    if (milesPerYear > rules.highMilesPerYear) amber.push(`High mileage: about ${fmtMiles(milesPerYear)} miles a year`);
    else if (milesPerYear < rules.lowMilesPerYear) amber.push(`Unusually low mileage: about ${fmtMiles(milesPerYear)} miles a year`);
  }

  // ---- Green ----
  if (bestExpiry && bestExpiry >= today) {
    green.push(
      `Valid MOT to ${formatISODate(bestExpiry)}; ${latest.result === 'PASSED' ? 'passed' : 'tested'} ${formatISODate(latest.date)} with ${advisories === 1 ? '1 advisory' : `${advisories} advisories`}`,
    );
  }

  const reasons = [
    ...red.map((text) => ({ light: 'red' as const, text })),
    ...amber.map((text) => ({ light: 'amber' as const, text })),
    ...green.map((text) => ({ light: 'green' as const, text })),
  ];
  const light: Light = red.length ? 'red' : amber.length ? 'amber' : 'green';
  return { light, reason: reasons[0]?.text ?? 'MOT history checked', reasons, milesPerYear };
}

/**
 * First advisory text that appears in N consecutive MOTs (newest first).
 * A fail and its retest a few days later count as one MOT, so a single
 * visit can't trigger this on its own.
 */
function findRepeatedAdvisory(testsNewestFirst: MotVehicle['tests'], n: number): string | undefined {
  const cycles: MotVehicle['tests'] = [];
  for (const t of testsNewestFirst) {
    const newer = cycles.at(-1);
    if (newer && daysBetween(t.date, newer.date) < 30) continue;
    cycles.push(t);
  }
  if (cycles.length < n) return undefined;
  const sets = cycles.map((t) => {
    const map = new Map<string, string>();
    for (const d of t.defects) if (isAdvisory(d.type) && d.text) map.set(normaliseDefectText(d.text), d.text);
    return map;
  });
  for (let i = 0; i + n <= sets.length; i++) {
    for (const [key, text] of sets[i]) {
      let run = 1;
      while (run < n && sets[i + run].has(key)) run++;
      if (run >= n) return text;
    }
  }
  return undefined;
}

function shorten(text: string, max = 70): string {
  let clean = text;
  // Remove inspection-manual references, including nested ones like (1.1.14 (a) (ii)).
  for (let prev = ''; prev !== clean; ) {
    prev = clean;
    clean = clean.replace(/\s*\([^()]*\)/g, '');
  }
  clean = clean.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
