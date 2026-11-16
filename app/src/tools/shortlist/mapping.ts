/**
 * Converting between the Check screen and shortlist cards, and evaluating cards.
 */
import type { CheckState } from '../../hooks/useCheckState';
import { defaultCheckState } from '../../hooks/useCheckState';
import { evaluateCar, type CarEvaluation } from '../../domain/evaluate';
import { todayISO } from '../../domain/dates';
import { formatRegistration } from '../../domain/vehicle/registration';
import { parseMoney, titleCase } from '../../lib/format';
import { newShortlistItem, type ShortlistItem } from '../../storage/shortlist';

const num = (t: string) => {
  const n = parseMoney(t);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function itemFromCheck(state: CheckState, existing?: ShortlistItem): ShortlistItem {
  const lk = state.lookup;
  const base = existing ?? newShortlistItem();
  return {
    ...base,
    reg: lk?.reg ?? base.reg,
    make: lk?.mot?.make ?? lk?.vehicle?.make ?? base.make,
    model: lk?.mot?.model ?? base.model,
    vehicle: lk?.vehicle ?? base.vehicle,
    mot: lk?.mot ?? base.mot,
    lookupAt: lk?.at ?? base.lookupAt,
    mock: lk?.mock ?? base.mock,
    askingPrice: num(state.priceText),
    deposit: state.deposit,
    requestedTermMonths: state.requestedTerm,
    manualRegistration: state.manualOn || !lk ? state.manual : undefined,
    manualFuelType: state.manualFuel || undefined,
    manualCo2: num(state.manualCo2Text),
    manualEngineCc: num(state.manualEngineText),
    listPrice: num(state.listPriceText),
    overThresholdWhenNew: state.overThreshold,
    agreementStart: state.agreementStart || undefined,
  };
}

export function checkFromItem(item: ShortlistItem): CheckState {
  const d = defaultCheckState();
  const hasLookup = !!(item.vehicle || item.mot);
  return {
    ...d,
    plateText: item.reg ? formatRegistration(item.reg) : '',
    lookup: hasLookup && item.reg
      ? { reg: item.reg, at: item.lookupAt ?? item.updatedAt, vehicle: item.vehicle, mot: item.mot, mock: item.mock }
      : undefined,
    priceText: item.askingPrice ? String(item.askingPrice) : '',
    deposit: item.deposit,
    requestedTerm: item.requestedTermMonths,
    agreementStart: item.agreementStart ?? '',
    manualOn: !!item.manualRegistration && hasLookup,
    manual: item.manualRegistration ?? d.manual,
    manualFuel: item.manualFuelType ?? '',
    manualCo2Text: item.manualCo2 ? String(item.manualCo2) : '',
    manualEngineText: item.manualEngineCc ? String(item.manualEngineCc) : '',
    listPriceText: item.listPrice ? String(item.listPrice) : '',
    overThreshold: !!item.overThresholdWhenNew,
    shortlistId: item.id,
  };
}

/** Everything a shortlist card shows, worked out fresh for today. */
export function evaluateItem(item: ShortlistItem, today = todayISO()): CarEvaluation {
  return evaluateCar(
    {
      vehicle: item.vehicle,
      mot: item.mot,
      manualRegistration: item.manualRegistration,
      manualFuelType: item.manualFuelType,
      manualCo2: item.manualCo2,
      manualEngineCc: item.manualEngineCc,
      listPrice: item.listPrice,
      overThresholdWhenNew: item.overThresholdWhenNew,
    },
    {
      price: item.askingPrice ?? NaN,
      deposit: item.deposit,
      requestedTermMonths: item.requestedTermMonths,
      agreementStart: item.agreementStart && item.agreementStart >= today ? item.agreementStart : today,
    },
    today,
  );
}

export function itemName(item: ShortlistItem): string {
  const titled = [titleCase(item.make), titleCase(item.model)].filter(Boolean).join(' ');
  return titled || item.advertTitle || (item.reg ? formatRegistration(item.reg) : 'Untitled car');
}
