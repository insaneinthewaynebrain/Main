/**
 * Annual vehicle tax (VED) estimate for a car, using the dated rates in
 * config/vedRates.ts. Plain logic, no UI.
 */
import { vedRates, type VedRates } from '../../config/vedRates';
import { addYears, daysBetween, formatISODate, type ISODate } from '../dates';

export interface VedInput {
  registrationDate: ISODate;
  fuelType?: string;
  /** g/km, from DVLA. */
  co2Emissions?: number;
  /** cc, from DVLA or MOT. */
  engineCapacity?: number;
  /** List price when new, if the user entered it. */
  listPrice?: number;
  /** The user ticked "over the threshold when new". */
  overThresholdWhenNew?: boolean;
  /** DVLA "additional rate of tax applicable until" date. */
  artEndDate?: ISODate;
  today: ISODate;
}

export interface SupplementInfo {
  /** Supplement is included in this year's estimate. */
  appliesNow: boolean;
  /** Years still to pay, counting the current one. 0 if finished. */
  yearsRemaining: number;
  /** Last day the supplement can apply (end of year 6). */
  endsOn: ISODate;
  threshold: number;
}

export type VedEstimate =
  | {
      status: 'ok';
      annual: number;
      monthly: number;
      /** One line describing the rule applied. */
      rule: string;
      regime: 'pre-2001' | 'co2-bands' | 'standard';
      supplement?: SupplementInfo;
      /** A hint that the car is probably over the list-price threshold (from DVLA). */
      likelyExpensive?: string;
      /** Whether the expensive car supplement question is relevant for this car. */
      supplementRelevant: boolean;
      threshold?: number;
    }
  | { status: 'needs-input'; missing: 'co2' | 'engine'; rule: string };

export function isZeroEmission(fuelType?: string, co2?: number): boolean {
  const f = (fuelType ?? '').toUpperCase();
  return f === 'ELECTRICITY' || f === 'ELECTRIC' || f.includes('FUEL CELL') || f === 'HYDROGEN' || (co2 === 0 && !f.includes('HYBRID'));
}

export function estimateVed(input: VedInput, rates: VedRates = vedRates): VedEstimate {
  const { registrationDate, today } = input;
  const ddNote = (annual: number) => ({ annual, monthly: annual / 12 });

  // ---- Before 1 March 2001: engine size ----
  if (registrationDate < rates.regimes.co2BandsFrom) {
    if (!input.engineCapacity) {
      return { status: 'needs-input', missing: 'engine', rule: 'Registered before 1 Mar 2001: taxed on engine size, which is unknown' };
    }
    const small = input.engineCapacity <= rates.pre2001.smallEngineMaxCc;
    const annual = small ? rates.pre2001.smallEngine : rates.pre2001.largeEngine;
    return {
      status: 'ok',
      ...ddNote(annual),
      regime: 'pre-2001',
      supplementRelevant: false,
      rule: `Registered before 1 Mar 2001: engine ${small ? 'up to' : 'over'} ${rates.pre2001.smallEngineMaxCc}cc`,
    };
  }

  // ---- 1 March 2001 – 31 March 2017: CO2 bands ----
  if (registrationDate < rates.regimes.standardRateFrom) {
    const co2 = input.co2Emissions ?? (isZeroEmission(input.fuelType) ? 0 : undefined);
    if (co2 === undefined) {
      return { status: 'needs-input', missing: 'co2', rule: 'Registered 2001–2017: taxed on CO2, which is unknown' };
    }
    let band = rates.co2Bands.find((b) => co2 <= b.maxCo2)!;
    if (co2 > 225 && registrationDate < rates.bandKCapBefore) band = rates.co2Bands.find((b) => b.band === 'K')!;
    const lower = rates.co2Bands[rates.co2Bands.indexOf(band) - 1]?.maxCo2;
    const range = band.maxCo2 === Infinity ? `over ${lower} g/km` : lower === undefined ? `up to ${band.maxCo2} g/km` : `${lower + 1}–${band.maxCo2} g/km`;
    return {
      status: 'ok',
      ...ddNote(band.rate),
      regime: 'co2-bands',
      supplementRelevant: false,
      rule: `Registered 2001–2017: CO2 band ${band.band} (${co2} g/km, band ${range})`,
    };
  }

  // ---- 1 April 2017 onwards: standard rate + expensive car supplement ----
  const ecs = rates.expensiveCarSupplement;
  const zero = isZeroEmission(input.fuelType, input.co2Emissions);
  const threshold = zero ? ecs.electricThreshold : ecs.threshold;
  const exempt = zero && registrationDate < ecs.electricExemptBefore;

  const startsOn = addYears(registrationDate, ecs.firstYear - 1); // start of year 2
  const endsOn = addYears(registrationDate, ecs.lastYear); // end of year 6
  const inWindow = today >= startsOn && today < endsOn;
  const notStarted = today < startsOn;
  const yearsRemaining = today >= endsOn ? 0 : notStarted
    ? ecs.lastYear - ecs.firstYear + 1
    : Math.ceil(daysBetween(today, endsOn) / 365.25);

  const declared = input.overThresholdWhenNew || (input.listPrice !== undefined && input.listPrice > threshold);
  const supplement: SupplementInfo | undefined =
    declared && !exempt ? { appliesNow: inWindow, yearsRemaining, endsOn, threshold } : undefined;

  let likelyExpensive: string | undefined;
  if (!exempt && !declared && input.artEndDate && input.artEndDate > today) {
    likelyExpensive = `DVLA records an additional rate of tax until ${formatISODate(input.artEndDate)} — this car was probably over £${threshold.toLocaleString('en-GB')} when new`;
  }

  const annual = rates.standardRate + (supplement?.appliesNow ? ecs.amount : 0);
  let rule = `Registered from 1 Apr 2017: standard rate £${rates.standardRate}`;
  if (exempt && input.listPrice !== undefined && input.listPrice > threshold) {
    rule += ' (zero emission registered before 1 Apr 2025: no supplement)';
  } else if (supplement?.appliesNow) {
    rule += ` + £${ecs.amount} expensive car supplement (years ${ecs.firstYear}–${ecs.lastYear}, ${supplement.yearsRemaining} ${supplement.yearsRemaining === 1 ? 'year' : 'years'} left)`;
  } else if (supplement && notStarted) {
    rule += `; £${ecs.amount} supplement starts ${formatISODate(startsOn)} for ${supplement.yearsRemaining} years`;
  } else if (supplement && !inWindow) {
    rule += ' (expensive car supplement has finished)';
  }

  return {
    status: 'ok',
    ...ddNote(annual),
    regime: 'standard',
    rule,
    supplement,
    likelyExpensive,
    supplementRelevant: !exempt && today < endsOn,
    threshold,
  };
}

/** Monthly cost if paid by 12 Direct Debits (includes the surcharge). */
export function directDebitMonthly(annual: number, rates: VedRates = vedRates): number {
  return (annual * (1 + rates.directDebitMonthlySurcharge)) / 12;
}
