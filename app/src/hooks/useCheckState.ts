/**
 * Everything on the Check screen, remembered on this device.
 * Kept in one object so the Shortlist can load a car into the calculator.
 */
import { useCallback } from 'react';
import { financeRules } from '../config/financeRules';
import type { LookupResult } from '../api/client';
import type { ManualRegistrationDate } from '../domain/vehicle/registrationDate';
import { usePersistentState } from './usePersistentState';

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
  manual: ManualRegistrationDate;
  manualFuel: string;
  manualCo2Text: string;
  manualEngineText: string;
  listPriceText: string;
  overThreshold: boolean;
  /** Shortlist card this came from, if any. */
  shortlistId?: string;
}

const KEY = 'check:v2';

function legacy<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`carfin:${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function defaultCheckState(): CheckState {
  return {
    plateText: '',
    // Carry over values from the original calculator.
    priceText: legacy('price', ''),
    deposit: legacy('deposit', financeRules.deposit.default),
    agreementStart: '',
    manualOn: false,
    manual: {
      year: legacy('regYear', financeRules.defaultRegistration.year),
      month: legacy('regMonth', financeRules.defaultRegistration.month),
    },
    manualFuel: '',
    manualCo2Text: '',
    manualEngineText: '',
    listPriceText: '',
    overThreshold: false,
  };
}

export function writeCheckState(state: CheckState): void {
  try {
    localStorage.setItem(`carfin:${KEY}`, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function useCheckState() {
  const [state, setState] = usePersistentState<CheckState>(KEY, defaultCheckState());
  const patch = useCallback((p: Partial<CheckState>) => setState((s) => ({ ...s, ...p })), [setState]);
  return [{ ...defaultCheckState(), ...state }, patch, setState] as const;
}
