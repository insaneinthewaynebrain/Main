/**
 * UK vehicle tax (VED) rates for cars — UPDATE EACH APRIL.
 *
 * Copied from GOV.UK on the date below. To update:
 *   1. Open each source page.
 *   2. Change the figures here to match.
 *   3. Update `ratesFrom` and `checkedOn`.
 *   4. Run `npm test` — the tax tests will tell you which expectations moved.
 *
 * All amounts are the "single 12 month payment" in £.
 */
export const vedRates = {
  /** Tax year these rates apply from. */
  ratesFrom: '2026-04-01',
  /** When someone last checked these figures against GOV.UK. */
  checkedOn: '2026-11-16',
  sources: {
    rateTables: 'https://www.gov.uk/vehicle-tax-rate-tables',
    electric: 'https://www.gov.uk/guidance/vehicle-tax-for-electric-and-low-emissions-vehicles',
  },

  /** Regime boundaries (first registration date). */
  regimes: {
    /** Before this: taxed on engine size. */
    co2BandsFrom: '2001-03-01',
    /** On or after this: flat standard rate (+ expensive car supplement). */
    standardRateFrom: '2017-04-01',
  },

  /** Cars registered before 1 March 2001 — by engine size. */
  pre2001: {
    smallEngineMaxCc: 1549,
    smallEngine: 230,
    largeEngine: 375,
  },

  /** Cars registered 1 March 2001 – 31 March 2017 — by CO2 band (petrol, diesel, alternative fuel, zero emission). */
  co2Bands: [
    { band: 'A', maxCo2: 100, rate: 20 },
    { band: 'B', maxCo2: 110, rate: 20 },
    { band: 'C', maxCo2: 120, rate: 35 },
    { band: 'D', maxCo2: 130, rate: 170 },
    { band: 'E', maxCo2: 140, rate: 200 },
    { band: 'F', maxCo2: 150, rate: 225 },
    { band: 'G', maxCo2: 165, rate: 275 },
    { band: 'H', maxCo2: 175, rate: 325 },
    { band: 'I', maxCo2: 185, rate: 360 },
    { band: 'J', maxCo2: 200, rate: 410 },
    { band: 'K', maxCo2: 225, rate: 445 },
    { band: 'L', maxCo2: 255, rate: 760 },
    { band: 'M', maxCo2: Infinity, rate: 790 },
  ],
  /** Cars over 225 g/km registered before this date pay band K. */
  bandKCapBefore: '2006-03-23',

  /** Cars registered on or after 1 April 2017 — second payment onwards (all fuel types, incl. electric). */
  standardRate: 200,

  /** Expensive car supplement ("additional rate"). */
  expensiveCarSupplement: {
    /** Extra per year on top of the standard rate. */
    amount: 440,
    /** List price must be MORE than this (petrol, diesel, hybrid, alternative fuel). */
    threshold: 40_000,
    /** List price must be MORE than this for electric / zero emission cars. */
    electricThreshold: 50_000,
    /** Zero emission cars registered before this date never pay it. */
    electricExemptBefore: '2025-04-01',
    /** Paid for 5 years from the second time the car is taxed: years 2 to 6. */
    firstYear: 2,
    lastYear: 6,
  },

  /** Paying by 12 monthly Direct Debits costs this much more than paying yearly (e.g. £210 vs £200). */
  directDebitMonthlySurcharge: 0.05,
};

export type VedRates = typeof vedRates;
