/**
 * Passcode check and rate limiting, shared by every function.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { ENV, env, isMockMode, serverLimits } from './config';
import { ApiFailure } from './http';
import { getCounterStore } from './rateLimit';

export const PASSCODE_HEADER = 'x-app-passcode';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/** Hash the IP so raw addresses are never stored. */
function ipKey(ip: string): string {
  return sha256(`hp-calc:${ip}`).toString('hex').slice(0, 24);
}

export function passcodeMatches(given: string, expected: string): boolean {
  return timingSafeEqual(sha256(given), sha256(expected));
}

export interface GuardOptions {
  /** Counts towards the daily cap on DVLA/DVSA calls. */
  upstream: boolean;
}

/**
 * Throws ApiFailure if the request isn't allowed. Order:
 * wrong-passcode lockout → passcode → per-IP limit → daily cap.
 */
export async function guard(req: Request, ip: string, opts: GuardOptions): Promise<void> {
  const store = await getCounterStore();
  const key = ipKey(ip || 'unknown');
  const lim = serverLimits;

  const fails = await store.peek(`fail:${key}`);
  if (fails && fails.count >= lim.wrongPasscode.limit) {
    throw new ApiFailure('RATE_LIMITED', 'Too many wrong passcodes — please wait 15 minutes.', Math.ceil((fails.resetAt - Date.now()) / 1000));
  }

  const expected = env(ENV.passcode);
  if (!expected) {
    if (!isMockMode()) throw new ApiFailure('NOT_CONFIGURED', `The server has no ${ENV.passcode} set.`);
  } else {
    const given = req.headers.get(PASSCODE_HEADER) ?? '';
    if (!given || !passcodeMatches(given, expected)) {
      if (given) await store.increment(`fail:${key}`, lim.wrongPasscode.windowMs);
      throw new ApiFailure('UNAUTHORISED', given ? 'That passcode is not right.' : 'Passcode needed.');
    }
  }

  // Sample cars cost nothing, so local mock-mode testing isn't throttled.
  if (isMockMode()) return;

  const perIp = await store.increment(`ip:${key}`, lim.perIp.windowMs);
  if (perIp.count > lim.perIp.limit) {
    throw new ApiFailure('RATE_LIMITED', undefined, Math.ceil((perIp.resetAt - Date.now()) / 1000));
  }

  if (opts.upstream) {
    const day = new Date().toISOString().slice(0, 10);
    const daily = await store.increment(`day:${day}`, 26 * 3600_000);
    if (daily.count > lim.dailyUpstream.limit) {
      throw new ApiFailure('RATE_LIMITED', "Today's lookup limit has been reached — try again tomorrow.");
    }
  }
}
