/**
 * Finance rules. Change values here — nothing else in the app hard-codes them.
 */
export interface FinanceRules {
  productName: string;
  maxTermMonths: number;
  minTermMonths: number;
  maxCarAgeAtEndMonths: number;
  apr: number;
  deposit: { min: number; max: number; step: number; default: number };
  defaultRegistration: { month: number; year: number };
  /** APR is fixed; there are no fees. */
  fees: number;
  registrationYearsBack: number;
  /** One-tap car price buttons (£). */
  quickPrices: number[];
  /** Step for the − / + price buttons (£). */
  priceStep: number;
}

export const financeRules: FinanceRules = {
  /** Product type shown in the UI. */
  productName: 'Hire purchase',

  /** Longest agreement offered, in months. */
  maxTermMonths: 60,

  /** Shortest agreement worth offering. Below this the car is "not eligible". */
  minTermMonths: 12,

  /** The car may be at most this many months old when the agreement ends. */
  maxCarAgeAtEndMonths: 96,

  /** Fixed APR as a decimal (0.099 = 9.9%). Displayed, not editable. */
  apr: 0.099,

  /** Deposit dropdown: from, to and step in £, plus the default selection. */
  deposit: { min: 0, max: 10_000, step: 500, default: 1_000 },

  /** No arrangement or completion fees. */
  fees: 0,

  /** Default for manual registration entry (month is 1–12). Without a day, the 1st is assumed. */
  defaultRegistration: { month: 10, year: 2023 },

  /** How many years back the manual registration year dropdown goes. */
  registrationYearsBack: 30,

  quickPrices: [16_500, 17_000, 17_500, 18_000, 18_500, 19_000],
  priceStep: 100,
};
