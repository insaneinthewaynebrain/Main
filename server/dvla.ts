/**
 * DVLA Vehicle Enquiry Service client.
 * Docs: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html
 */
import type { DvlaVehicle } from '../app/src/domain/vehicle/types';
import { DVLA_URL, ENV, env, serverLimits } from './config';
import { ApiFailure, logFailure } from './http';

type Fetch = typeof fetch;

export async function fetchDvlaVehicle(registration: string, fetchImpl: Fetch = fetch): Promise<DvlaVehicle> {
  const key = env(ENV.dvlaKey);
  if (!key) throw new ApiFailure('NOT_CONFIGURED', `The server has no ${ENV.dvlaKey} set.`);

  let res: Response;
  try {
    res = await fetchImpl(DVLA_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ registrationNumber: registration }),
      signal: AbortSignal.timeout(serverLimits.upstreamTimeoutMs),
    });
  } catch {
    logFailure('dvla', 'network error or timeout');
    throw new ApiFailure('UNAVAILABLE', 'DVLA is not responding — please try again shortly.');
  }

  if (res.ok) return normaliseDvla((await res.json()) as Record<string, unknown>, registration);

  logFailure('dvla', res.status);
  switch (res.status) {
    case 400:
      throw new ApiFailure('INVALID_REG');
    case 404:
      throw new ApiFailure('NOT_FOUND', 'DVLA has no vehicle with that registration.');
    case 429:
      throw new ApiFailure('RATE_LIMITED', 'DVLA is limiting requests — please wait a minute and try again.');
    case 401:
    case 403:
      throw new ApiFailure('NOT_CONFIGURED', 'DVLA rejected the API key — check DVLA_API_KEY in Netlify.');
    default:
      throw new ApiFailure('UNAVAILABLE', 'DVLA is unavailable right now — please try again shortly.');
  }
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

export function normaliseDvla(raw: Record<string, unknown>, registration: string): DvlaVehicle {
  return {
    registrationNumber: str(raw.registrationNumber) ?? registration,
    make: str(raw.make),
    colour: str(raw.colour),
    fuelType: str(raw.fuelType),
    engineCapacity: num(raw.engineCapacity),
    co2Emissions: num(raw.co2Emissions),
    euroStatus: str(raw.euroStatus),
    realDrivingEmissions: str(raw.realDrivingEmissions),
    yearOfFirstRegistration: num(raw.yearOfFirstRegistration),
    monthOfFirstRegistration: num(raw.monthOfFirstRegistration),
    yearOfManufacture: num(raw.yearOfManufacture),
    taxStatus: str(raw.taxStatus),
    taxDueDate: str(raw.taxDueDate),
    motStatus: str(raw.motStatus),
    motExpiry: str(raw.motExpiry),
    artEndDate: str(raw.artEndDate),
    markedForExport: bool(raw.markedForExport),
    typeApproval: str(raw.typeApproval),
    wheelplan: str(raw.wheelPlan),
  };
}
