/**
 * Request handlers shared by the Netlify Functions and the local dev server.
 * Each one: guard (passcode + rate limit) → validate → call API or mock → JSON.
 */
import { isValidRegistration, normaliseRegistration } from '../app/src/domain/vehicle/registration';
import { ENV, isMockMode, missingEnv } from './config';
import { fetchDvlaVehicle } from './dvla';
import { guard } from './guard';
import { ApiFailure, errorResponse, json, logFailure, readJsonBody } from './http';
import { fetchLinkPreview } from './linkPreview';
import { mockDvla, mockLinkPreview, mockMot } from './mockData';
import { fetchMotHistory } from './mot';

export interface RequestContext {
  /** Client IP, used only (hashed) for rate limiting. */
  ip: string;
}

const MOCK_DELAY_MS = 350;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiFailure) return errorResponse(e);
    logFailure('handler', e instanceof Error ? e.name : 'unknown error');
    return errorResponse(new ApiFailure('UNAVAILABLE'));
  }
}

async function readRegistration(req: Request): Promise<string> {
  const body = await readJsonBody(req);
  const reg = normaliseRegistration(String(body.registration ?? ''));
  if (!isValidRegistration(reg)) throw new ApiFailure('INVALID_REG');
  return reg;
}

export function handleVehicle(req: Request, ctx: RequestContext): Promise<Response> {
  return run(async () => {
    await guard(req, ctx.ip, { upstream: true });
    const reg = await readRegistration(req);
    if (isMockMode()) {
      await pause(MOCK_DELAY_MS);
      return json({ vehicle: mockDvla(reg), mock: true });
    }
    return json({ vehicle: await fetchDvlaVehicle(reg) });
  });
}

export function handleMot(req: Request, ctx: RequestContext): Promise<Response> {
  return run(async () => {
    await guard(req, ctx.ip, { upstream: true });
    const reg = await readRegistration(req);
    if (isMockMode()) {
      await pause(MOCK_DELAY_MS + 150);
      return json({ mot: mockMot(reg), mock: true });
    }
    return json({ mot: await fetchMotHistory(reg) });
  });
}

export function handleLinkPreview(req: Request, ctx: RequestContext): Promise<Response> {
  return run(async () => {
    await guard(req, ctx.ip, { upstream: false });
    const body = await readJsonBody(req);
    const url = String(body.url ?? '').trim();
    if (!url || url.length > 2_000) throw new ApiFailure('BAD_REQUEST', 'Paste a web link.');
    if (isMockMode()) {
      await pause(MOCK_DELAY_MS);
      return json({ preview: mockLinkPreview(url) });
    }
    return json({ preview: await fetchLinkPreview(url) });
  });
}

/**
 * GET /api/health — open it in a browser to confirm the functions are deployed.
 * Reports only whether each setting is present (yes/no), never any values,
 * and doesn't need the passcode or call DVLA/DVSA.
 */
export function handleHealth(req: Request): Promise<Response> {
  return run(async () => {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new ApiFailure('BAD_REQUEST', 'Use GET.');
    const has = (name: string) => missingEnv([name]).length === 0;
    const motVars = [ENV.motClientId, ENV.motClientSecret, ENV.motApiKey, ENV.motScope, ENV.motTokenUrl];
    const settings = {
      APP_PASSCODE: has(ENV.passcode),
      DVLA_API_KEY: has(ENV.dvlaKey),
      ...Object.fromEntries(motVars.map((n) => [n, has(n)])),
    };
    const mock = isMockMode();
    const ready = mock || Object.values(settings).every(Boolean);
    return json({
      functions: 'running',
      mode: mock ? 'mock (sample cars)' : 'live',
      ready,
      settingsPresent: settings,
      missing: Object.entries(settings).filter(([, v]) => !v).map(([k]) => k),
    });
  });
}
