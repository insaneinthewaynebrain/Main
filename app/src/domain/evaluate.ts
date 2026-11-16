/**
 * One place that turns "what we know about a car" into everything the app shows:
 * registration date, term, payment, MOT light, tax and clean air. Plain logic,
 * used by both the Check screen and the Shortlist.
 */
import { calculateQuote, termWorking, type Quote, type TermWorking } from './finance/calculator';
import { assessCleanAir, type CleanAirResult } from './cleanAir/cleanAir';
import { assessMot, type MotAssessment } from './mot/trafficLight';
import { estimateVed, type VedEstimate } from './tax/ved';
import type { ISODate } from './dates';
import { resolveRegistrationDate, type ManualRegistrationDate, type ResolvedRegistrationDate } from './vehicle/registrationDate';
import type { DvlaVehicle, MotVehicle } from './vehicle/types';

export interface CarFacts {
  vehicle?: DvlaVehicle;
  mot?: MotVehicle;
  /** Overrides the looked-up registration date when set. */
  manualRegistration?: ManualRegistrationDate;
  /** Used when there's no lookup (or DVLA lacks them). */
  manualFuelType?: string;
  manualCo2?: number;
  manualEngineCc?: number;
  manualEuroStatus?: string;
  listPrice?: number;
  overThresholdWhenNew?: boolean;
}

export interface FinanceChoices {
  price: number;
  deposit: number;
  requestedTermMonths?: number;
  agreementStart: ISODate;
}

export interface CarEvaluation {
  registration?: ResolvedRegistrationDate;
  working?: TermWorking;
  quote?: Quote;
  mot?: MotAssessment;
  ved?: VedEstimate;
  cleanAir: CleanAirResult;
  fuelType?: string;
  /** Monthly finance payment + monthly tax (annual ÷ 12), when both are known. */
  trueMonthly?: number;
}

export function evaluateCar(facts: CarFacts, finance: FinanceChoices, today: ISODate): CarEvaluation {
  const { vehicle, mot } = facts;
  const registration = resolveRegistrationDate({ mot, dvla: vehicle, manual: facts.manualRegistration });
  const fuelType = vehicle?.fuelType ?? mot?.fuelType ?? facts.manualFuelType;

  const working = registration ? termWorking(registration.date, finance.agreementStart) : undefined;
  const quote = registration
    ? calculateQuote({
        price: finance.price,
        deposit: finance.deposit,
        registrationDate: registration.date,
        agreementStart: finance.agreementStart,
        requestedTermMonths: finance.requestedTermMonths,
      })
    : undefined;

  const motAssessment = vehicle || mot ? assessMot({ mot, dvla: vehicle, registrationDate: registration?.date, today }) : undefined;

  const ved = registration
    ? estimateVed({
        registrationDate: registration.date,
        fuelType,
        co2Emissions: vehicle?.co2Emissions ?? facts.manualCo2,
        engineCapacity: vehicle?.engineCapacity ?? mot?.engineSize ?? facts.manualEngineCc,
        listPrice: facts.listPrice,
        overThresholdWhenNew: facts.overThresholdWhenNew,
        artEndDate: vehicle?.artEndDate,
        today,
      })
    : undefined;

  const cleanAir = assessCleanAir({
    fuelType,
    euroStatus: vehicle?.euroStatus ?? facts.manualEuroStatus,
    registrationDate: registration?.date,
  });

  const trueMonthly = quote?.status === 'ok' && ved?.status === 'ok' ? quote.monthlyPayment + ved.monthly : undefined;

  return { registration, working, quote, mot: motAssessment, ved, cleanAir, fuelType, trueMonthly };
}
