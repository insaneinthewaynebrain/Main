/**
 * Everything on the Check screen, remembered on this device.
 * Kept in one object so the Shortlist can load a car into the calculator.
 */
import { useCallback } from 'react';
import { financeRules } from '../config/financeRules';
import type { LookupResult } from '../api/client';
import type { ManualRegistrationDate } from '../domain/vehicle/registrationDate';
import { usePersistentState } from './usePersistentState';

export type CheckSection = 'finance' | 'mot' | 'tax' | 'advert';

export interface CheckState {
  plateText: string;
  lookup?: LookupResult;
  priceText: string;
  deposit: number;
  /** Undefined = use the maximum. */
  requestedTerm?: number;
  /** Blank = today. */
  agreementStart: string;
  /** Use the manual registration date even when a lookup has one. */
  manualOn: boolean;
  /** Blank until the user picks a month and year. */
  manual: Partial<ManualRegistrationDate>;
  manualFuel: string;
  manualCo2Text: string;
  manualEngineText: string;
  listPriceText: string;
  overThreshold: boolean;
  /** Advert this car came from. */
  advertUrl: string;
  advertTitle?: string;
  advertImageUrl?: string;
  advertSite?: string;
  /** Shortlist card this car is linked to, if any. */
  shortlistId?: string;
  /** Which section tab is open. */
  section: CheckSection;
}

const KEY = 'check:v2';

/** A completely blank Check screen (what "Clear" gives you). */
export function blankCheckState(): CheckState {
  return {
    plateText: '',
    priceText: '',
    deposit: financeRules.deposit.default,
    agreementStart: '',
    manualOn: false,
    manual: {},
    manualFuel: '',
    manualCo2Text: '',
    manualEngineText: '',
    listPriceText: '',
    overThreshold: false,
    advertUrl: '',
    section: 'finance',
  };
}

/** Manual date only counts once month and year are both chosen. */
export function completeManual(m: Partial<ManualRegistrationDate>): ManualRegistrationDate | undefined {
  return m.year && m.month ? { year: m.year, month: m.month, day: m.day } : undefined;
}

export function writeCheckState(state: CheckState): void {
  try {
    localStorage.setItem(`carfin:${KEY}`, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function useCheckState() {
  const [state, setState] = usePersistentState<CheckState>(KEY, blankCheckState());
  const patch = useCallback((p: Partial<CheckState>) => setState((s) => ({ ...s, ...p })), [setState]);
  const clear = useCallback(() => setState(blankCheckState()), [setState]);
  return [{ ...blankCheckState(), ...state }, patch, clear] as const;
}
