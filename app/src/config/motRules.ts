/**
 * Thresholds for the MOT traffic light. Change them here.
 */
export const motRules = {
  /** AMBER when a valid MOT expires within this many days. */
  expiryWarningDays: 60,
  /** AMBER when any of the latest N tests failed. */
  recentFailWindow: 2,
  /** AMBER when the latest test had more than this many advisories. */
  maxAdvisoriesForGreen: 5,
  /** AMBER when the same advisory appears in this many consecutive tests. */
  repeatedAdvisoryTests: 2,
  /** Mileage checks only apply once the car is older than this (months). */
  mileageCheckMinAgeMonths: 36,
  /** AMBER when average annual mileage is above this… */
  highMilesPerYear: 20_000,
  /** …or below this. */
  lowMilesPerYear: 2_000,
  /** Cars younger than this with no test show "No MOT due yet" (months). */
  firstMotDueMonths: 36,
  /** Words that mark a defect as corrosion. */
  corrosionPattern: /corro|rust/i,
  /** Words that make a corrosion item structural (RED even as an advisory). */
  structuralPattern: /structur|load[- ]?bearing|sill|sub[- ]?frame|chassis|floor ?pan|jacking point|mounting/i,
};

export type MotRules = typeof motRules;
