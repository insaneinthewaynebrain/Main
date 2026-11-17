/**
 * Talks to the server functions. The passcode is sent in a header; API keys
 * never reach the browser.
 *
 * VITE_API_BASE lets a native (Capacitor) build point at the Netlify site,
 * e.g. VITE_API_BASE=https://your-site.netlify.app. On the web it's blank.
 */
import type { ApiError, DvlaVehicle, LinkPreview, MotVehicle } from '../domain/vehicle/types';
import { getPasscode } from '../storage/passcode';
import { explainUnexpectedReply } from './unexpectedReply';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export type ApiResult<T> = { ok: true; data: T; mock?: boolean } | { ok: false; error: ApiError };

async function post<T>(path: string, body: unknown, pick: (json: Record<string, unknown>) => T): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-passcode': getPasscode() },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: { code: 'UNAVAILABLE', message: "Can't reach the lookup service — are you offline?" } };
  }
  const text = await res.text().catch(() => '');
  let json: Record<string, unknown> | undefined;
  try {
    const parsed = JSON.parse(text);
    json = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    json = undefined;
  }
  if (!json) {
    // Not our functions answering: GitHub Pages, Netlify's login wall, a missing function…
    return { ok: false, error: explainUnexpectedReply(res.status, text.slice(0, 2000), window.location.hostname) };
  }
  if (!res.ok || json.error) {
    const err = json.error as ApiError | undefined;
    return { ok: false, error: err ?? { code: 'UNAVAILABLE', message: 'Something went wrong — please try again.' } };
  }
  return { ok: true, data: pick(json), mock: json.mock === true };
}

export const fetchVehicle = (registration: string) =>
  post('vehicle', { registration }, (j) => j.vehicle as DvlaVehicle);

export const fetchMot = (registration: string) =>
  post('mot', { registration }, (j) => j.mot as MotVehicle);

export const fetchLinkPreview = (url: string) =>
  post('link-preview', { url }, (j) => j.preview as LinkPreview);

export interface LookupResult {
  reg: string;
  /** ISO date-time of the lookup. */
  at: string;
  vehicle?: DvlaVehicle;
  mot?: MotVehicle;
  vehicleError?: ApiError;
  motError?: ApiError;
  mock?: boolean;
}

/** Calls DVLA and MOT together; either can fail without losing the other. */
export async function lookupRegistration(reg: string): Promise<LookupResult> {
  const [v, m] = await Promise.all([fetchVehicle(reg), fetchMot(reg)]);
  return {
    reg,
    at: new Date().toISOString(),
    vehicle: v.ok ? v.data : undefined,
    mot: m.ok ? m.data : undefined,
    vehicleError: v.ok ? undefined : v.error,
    motError: m.ok ? undefined : m.error,
    mock: (v.ok && v.mock) || (m.ok && m.mock) || undefined,
  };
}

/** The single message to show when a lookup didn't produce a usable car. */
export function lookupProblem(r: LookupResult): ApiError | undefined {
  if (r.vehicle || r.mot) return undefined;
  const errs = [r.vehicleError, r.motError].filter((e): e is ApiError => !!e);
  const order: ApiError['code'][] = ['UNAUTHORISED', 'RATE_LIMITED', 'NOT_CONFIGURED', 'UNAVAILABLE', 'INVALID_REG', 'BAD_REQUEST', 'NOT_FOUND'];
  errs.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  const first = errs[0];
  if (first?.code === 'NOT_FOUND') return { code: 'NOT_FOUND', message: 'Registration not found. Check it, or enter the registration date manually below.' };
  return first;
}
