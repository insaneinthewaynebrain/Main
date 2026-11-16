/**
 * DVSA MOT History API client, with an OAuth2 client-credentials token cache.
 * Docs: https://documentation.history.mot.api.gov.uk/mot-history-api/authentication/
 */
import { datePart } from '../app/src/domain/dates';
import type { MotTest, MotVehicle } from '../app/src/domain/vehicle/types';
import { ENV, MOT_BASE_URL, env, missingEnv, serverLimits } from './config';
import { ApiFailure, logFailure } from './http';

type Fetch = typeof fetch;

const MOT_VARS = [ENV.motClientId, ENV.motClientSecret, ENV.motApiKey, ENV.motScope, ENV.motTokenUrl];

// ---- Token cache (lives as long as the function instance stays warm) ----
let cached: { token: string; expiresAt: number } | undefined;
let inFlight: Promise<string> | undefined;

export function clearTokenCache(): void {
  cached = undefined;
  inFlight = undefined;
}

export async function getAccessToken(fetchImpl: Fetch = fetch, now: () => number = Date.now): Promise<string> {
  if (cached && cached.expiresAt - serverLimits.tokenRefreshMarginMs > now()) return cached.token;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env(ENV.motClientId)!,
      client_secret: env(ENV.motClientSecret)!,
      scope: env(ENV.motScope)!,
    });
    let res: Response;
    try {
      res = await fetchImpl(env(ENV.motTokenUrl)!, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(serverLimits.upstreamTimeoutMs),
      });
    } catch {
      logFailure('mot-token', 'network error or timeout');
      throw new ApiFailure('UNAVAILABLE', 'The MOT service login is not responding — please try again shortly.');
    }
    if (!res.ok) {
      logFailure('mot-token', res.status);
      if (res.status === 400 || res.status === 401) {
        throw new ApiFailure('NOT_CONFIGURED', 'The MOT login was refused — check the MOT_ variables in Netlify.');
      }
      throw new ApiFailure('UNAVAILABLE', 'The MOT service login is unavailable — please try again shortly.');
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number | string };
    if (!data.access_token) throw new ApiFailure('UNAVAILABLE', 'The MOT service login gave an unexpected reply.');
    const seconds = Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600;
    cached = { token: data.access_token, expiresAt: now() + seconds * 1000 };
    return data.access_token;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = undefined;
  }
}

export async function fetchMotHistory(registration: string, fetchImpl: Fetch = fetch): Promise<MotVehicle> {
  const missing = missingEnv(MOT_VARS);
  if (missing.length) throw new ApiFailure('NOT_CONFIGURED', `The server is missing: ${missing.join(', ')}.`);

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getAccessToken(fetchImpl);
    let res: Response;
    try {
      res = await fetchImpl(MOT_BASE_URL + encodeURIComponent(registration), {
        headers: { authorization: `Bearer ${token}`, 'x-api-key': env(ENV.motApiKey)!, accept: 'application/json' },
        signal: AbortSignal.timeout(serverLimits.upstreamTimeoutMs),
      });
    } catch {
      logFailure('mot', 'network error or timeout');
      throw new ApiFailure('UNAVAILABLE', 'The MOT service is not responding — please try again shortly.');
    }

    if (res.ok) return normaliseMot((await res.json()) as Record<string, unknown>, registration);

    logFailure('mot', res.status);
    // Token expired or revoked early: refresh once and retry.
    if (res.status === 401 && attempt === 0) {
      clearTokenCache();
      continue;
    }
    switch (res.status) {
      case 400:
        throw new ApiFailure('INVALID_REG');
      case 404:
        throw new ApiFailure('NOT_FOUND', 'No MOT record for that registration.');
      case 429:
        throw new ApiFailure('RATE_LIMITED', 'The MOT service is limiting requests — please wait a few minutes.');
      case 401:
      case 403:
        throw new ApiFailure('NOT_CONFIGURED', 'The MOT service rejected our credentials — check the MOT_ variables in Netlify.');
      default:
        throw new ApiFailure('UNAVAILABLE', 'The MOT service is unavailable right now — please try again shortly.');
    }
  }
  throw new ApiFailure('UNAVAILABLE');
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const date = (v: unknown) => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? datePart(s) : undefined;
};

export function normaliseMot(raw: Record<string, unknown>, registration: string): MotVehicle {
  const rawTests = Array.isArray(raw.motTests) ? (raw.motTests as Record<string, unknown>[]) : [];
  const tests: MotTest[] = rawTests
    .map((t): MotTest | undefined => {
      const completed = date(t.completedDate);
      if (!completed) return undefined;
      const result = String(t.testResult ?? '').toUpperCase().startsWith('PASS') ? 'PASSED' : 'FAILED';
      const value = Number(t.odometerValue);
      const read = String(t.odometerResultType ?? 'READ').toUpperCase() === 'READ' && Number.isFinite(value) && value > 0;
      const defects = Array.isArray(t.defects) ? (t.defects as Record<string, unknown>[]) : [];
      return {
        date: completed,
        result,
        expiryDate: date(t.expiryDate),
        odometer: read ? { value, unit: String(t.odometerUnit ?? '').toUpperCase() === 'KM' ? 'km' : 'mi' } : undefined,
        testNumber: str(t.motTestNumber),
        defects: defects.map((d) => ({
          text: str(d.text) ?? '',
          type: String(d.type ?? '').toUpperCase(),
          dangerous: d.dangerous === true,
        })),
      };
    })
    .filter((t): t is MotTest => t !== undefined)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const engine = Number(raw.engineSize);
  return {
    registration: str(raw.registration) ?? registration,
    make: str(raw.make),
    model: str(raw.model),
    fuelType: str(raw.fuelType),
    primaryColour: str(raw.primaryColour),
    engineSize: Number.isFinite(engine) && engine > 0 ? engine : undefined,
    registrationDate: date(raw.registrationDate),
    firstUsedDate: date(raw.firstUsedDate),
    manufactureDate: date(raw.manufactureDate),
    motTestDueDate: date(raw.motTestDueDate),
    hasOutstandingRecall: str(raw.hasOutstandingRecall) as MotVehicle['hasOutstandingRecall'],
    tests,
  };
}
