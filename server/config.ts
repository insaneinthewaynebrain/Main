/**
 * Server settings. Secrets come ONLY from environment variables — never from code.
 */
export const serverLimits = {
  /** Requests allowed per device (IP address) per window. One lookup = 2 requests. */
  perIp: { limit: 40, windowMs: 10 * 60_000 },
  /** Wrong passcodes allowed per IP before a cool-down. */
  wrongPasscode: { limit: 8, windowMs: 15 * 60_000 },
  /** Calls to DVLA/DVSA allowed per day in total, to protect your keys. */
  dailyUpstream: { limit: 600 },
  /** Give up on DVLA/DVSA after this long. */
  upstreamTimeoutMs: 10_000,
  /** Refresh the MOT access token this long before it expires. */
  tokenRefreshMarginMs: 5 * 60_000,
};

/** Environment variable names (values are never logged or returned). */
export const ENV = {
  passcode: 'APP_PASSCODE',
  dvlaKey: 'DVLA_API_KEY',
  motClientId: 'MOT_CLIENT_ID',
  motClientSecret: 'MOT_CLIENT_SECRET',
  motApiKey: 'MOT_API_KEY',
  motScope: 'MOT_SCOPE_URL',
  motTokenUrl: 'MOT_TOKEN_URL',
  mock: 'MOCK_MODE',
} as const;

export const DVLA_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
export const MOT_BASE_URL = 'https://history.mot.api.gov.uk/v1/trade/vehicles/registration/';

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function isMockMode(): boolean {
  const v = (env(ENV.mock) ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Names of required variables that are missing (names only, never values). */
export function missingEnv(names: string[]): string[] {
  return names.filter((n) => !env(n));
}
