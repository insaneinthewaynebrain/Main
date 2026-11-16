import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serverLimits } from './config';
import { guard, PASSCODE_HEADER } from './guard';
import { handleMot, handleVehicle, handleLinkPreview } from './handlers';
import { ApiFailure } from './http';
import { assertPublicUrl, isPrivateAddress, parsePreviewTags } from './linkPreview';
import { clearTokenCache, fetchMotHistory, getAccessToken, normaliseMot } from './mot';
import { fetchDvlaVehicle } from './dvla';
import { MemoryCounterStore, setCounterStore } from './rateLimit';

const ENV_NAMES = ['APP_PASSCODE', 'MOCK_MODE', 'DVLA_API_KEY', 'MOT_CLIENT_ID', 'MOT_CLIENT_SECRET', 'MOT_API_KEY', 'MOT_SCOPE_URL', 'MOT_TOKEN_URL'];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_NAMES.map((n) => [n, process.env[n]]));
  for (const n of ENV_NAMES) delete process.env[n];
  setCounterStore(new MemoryCounterStore());
  clearTokenCache();
});
afterEach(() => {
  for (const n of ENV_NAMES) {
    if (saved[n] === undefined) delete process.env[n];
    else process.env[n] = saved[n];
  }
  setCounterStore(undefined);
});

const post = (path: string, body: unknown, passcode?: string) =>
  new Request(`http://x${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(passcode ? { [PASSCODE_HEADER]: passcode } : {}) },
    body: JSON.stringify(body),
  });

describe('passcode and rate limiting', () => {
  it('fails closed when live and no passcode is configured', async () => {
    process.env.DVLA_API_KEY = 'k';
    await expect(guard(post('/', {}), '1.1.1.1', { upstream: true })).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });
  it('requires the right passcode', async () => {
    process.env.APP_PASSCODE = 'open sesame';
    await expect(guard(post('/', {}), 'ip', { upstream: false })).rejects.toMatchObject({ code: 'UNAUTHORISED' });
    await expect(guard(post('/', {}, 'wrong'), 'ip', { upstream: false })).rejects.toMatchObject({ code: 'UNAUTHORISED' });
    await expect(guard(post('/', {}, 'open sesame'), 'ip', { upstream: false })).resolves.toBeUndefined();
  });
  it('locks out after too many wrong passcodes', async () => {
    process.env.APP_PASSCODE = 'right';
    for (let i = 0; i < serverLimits.wrongPasscode.limit; i++) {
      await guard(post('/', {}, 'wrong'), 'ip2', { upstream: false }).catch(() => {});
    }
    await expect(guard(post('/', {}, 'right'), 'ip2', { upstream: false })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(guard(post('/', {}, 'right'), 'other-ip', { upstream: false })).resolves.toBeUndefined();
  });
  it('limits requests per IP', async () => {
    process.env.APP_PASSCODE = 'pc';
    for (let i = 0; i < serverLimits.perIp.limit; i++) await guard(post('/', {}, 'pc'), 'ip3', { upstream: true });
    await expect(guard(post('/', {}, 'pc'), 'ip3', { upstream: true })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(guard(post('/', {}, 'pc'), 'ip4', { upstream: true })).resolves.toBeUndefined();
  });
  it('caps total upstream calls per day', async () => {
    process.env.APP_PASSCODE = 'pc';
    for (let i = 0; i < serverLimits.dailyUpstream.limit; i++) await guard(post('/', {}, 'pc'), `ip-${i}`, { upstream: true });
    await expect(guard(post('/', {}, 'pc'), 'fresh-ip', { upstream: true })).rejects.toThrow(/Today's lookup limit/);
  });
  it('does not throttle mock mode', async () => {
    process.env.MOCK_MODE = '1';
    for (let i = 0; i < serverLimits.perIp.limit + 5; i++) await guard(post('/', {}), 'ip5', { upstream: true });
  });
});

describe('handlers in mock mode', () => {
  beforeEach(() => {
    process.env.MOCK_MODE = '1';
  });
  it('looks up a sample car (spaces and lowercase are fine)', async () => {
    const res = await handleVehicle(post('/api/vehicle', { registration: 'mk22 grn' }), { ip: 'a' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ mock: true, vehicle: { make: 'TOYOTA', yearOfFirstRegistration: 2022 } });
  });
  it('returns the exact registration date from MOT data', async () => {
    const res = await handleMot(post('/api/mot', { registration: 'MK22GRN' }), { ip: 'a' });
    expect((await res.json()).mot.registrationDate).toBe('2022-07-14');
  });
  it('clear errors: invalid, not found, unavailable, rate limited', async () => {
    const codes = async (registration: string) => {
      const r = await handleVehicle(post('/api/vehicle', { registration }), { ip: 'b' });
      return [r.status, (await r.json()).error.code];
    };
    expect(await codes('!!')).toEqual([400, 'INVALID_REG']);
    expect(await codes('ZZ99ZZZ')).toEqual([404, 'NOT_FOUND']);
    expect(await codes('SV19DWN')).toEqual([503, 'UNAVAILABLE']);
    expect(await codes('RL19MIT')).toEqual([429, 'RATE_LIMITED']);
  });
  it('rejects GET and non-JSON bodies', async () => {
    const get = await handleVehicle(new Request('http://x/api/vehicle'), { ip: 'c' });
    expect(get.status).toBe(400);
  });
  it('gives a labelled sample link preview', async () => {
    const res = await handleLinkPreview(post('/api/link-preview', { url: 'https://www.autotrader.co.uk/car-details/1' }), { ip: 'd' });
    expect((await res.json()).preview).toMatchObject({ sample: true, siteName: 'autotrader.co.uk' });
  });
});

describe('DVLA client', () => {
  beforeEach(() => {
    process.env.DVLA_API_KEY = 'dvla-test-key';
  });
  it('POSTs the registration in the body with the x-api-key header', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ registrationNumber: 'AB12CDE', make: 'FORD', monthOfFirstRegistration: 7 })));
    const v = await fetchDvlaVehicle('AB12CDE', fetchMock as unknown as typeof fetch);
    expect(v).toMatchObject({ make: 'FORD', monthOfFirstRegistration: 7 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('dvla-test-key');
    expect(JSON.parse(init.body as string)).toEqual({ registrationNumber: 'AB12CDE' });
  });
  it('maps errors', async () => {
    const withStatus = (status: number) => fetchDvlaVehicle('AB12CDE', (async () => new Response('{}', { status })) as unknown as typeof fetch);
    await expect(withStatus(404)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(withStatus(429)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(withStatus(503)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(withStatus(400)).rejects.toMatchObject({ code: 'INVALID_REG' });
  });
});

describe('MOT client and token cache', () => {
  beforeEach(() => {
    Object.assign(process.env, {
      MOT_CLIENT_ID: 'id', MOT_CLIENT_SECRET: 'secret', MOT_API_KEY: 'mot-key',
      MOT_SCOPE_URL: 'https://tapi.dvsa.gov.uk/.default', MOT_TOKEN_URL: 'https://login.example/token',
    });
  });

  function fakeUpstream(motStatuses: number[] = [200]) {
    let tokenCount = 0;
    const calls: { url: string; init: RequestInit }[] = [];
    const statuses = [...motStatuses];
    const impl = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('login.example')) {
        tokenCount++;
        return new Response(JSON.stringify({ access_token: `token-${tokenCount}`, expires_in: 3599 }));
      }
      const status = statuses.shift() ?? 200;
      return new Response(JSON.stringify(status === 200 ? { registration: 'AB12CDE', motTests: [], hasOutstandingRecall: 'No' } : {}), { status });
    });
    return { impl: impl as unknown as typeof fetch, calls, tokens: () => tokenCount };
  }

  it('requests a client-credentials token with the scope', async () => {
    const up = fakeUpstream();
    await getAccessToken(up.impl);
    const body = new URLSearchParams(up.calls[0].init.body as string);
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'client_credentials', client_id: 'id', client_secret: 'secret', scope: 'https://tapi.dvsa.gov.uk/.default',
    });
  });
  it('caches the token until shortly before expiry', async () => {
    const up = fakeUpstream();
    let t = 0;
    const now = () => t;
    expect(await getAccessToken(up.impl, now)).toBe('token-1');
    t = 50 * 60_000; // 50 min later: still valid (expires at ~60 min, refresh margin 5 min)
    expect(await getAccessToken(up.impl, now)).toBe('token-1');
    t = 56 * 60_000; // within 5 min of expiry: refresh
    expect(await getAccessToken(up.impl, now)).toBe('token-2');
  });
  it('shares one token request between simultaneous lookups', async () => {
    const up = fakeUpstream();
    await Promise.all([getAccessToken(up.impl), getAccessToken(up.impl), getAccessToken(up.impl)]);
    expect(up.tokens()).toBe(1);
  });
  it('calls the API with the bearer token and X-API-Key', async () => {
    const up = fakeUpstream();
    await fetchMotHistory('AB12CDE', up.impl);
    const api = up.calls.find((c) => c.url.includes('history.mot.api.gov.uk'))!;
    expect(api.url).toBe('https://history.mot.api.gov.uk/v1/trade/vehicles/registration/AB12CDE');
    const h = api.init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer token-1');
    expect(h['x-api-key']).toBe('mot-key');
  });
  it('refreshes the token once on a 401', async () => {
    const up = fakeUpstream([401, 200]);
    await fetchMotHistory('AB12CDE', up.impl);
    expect(up.tokens()).toBe(2);
  });
  it('maps errors', async () => {
    await expect(fetchMotHistory('AB12CDE', fakeUpstream([404]).impl)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(fetchMotHistory('AB12CDE', fakeUpstream([429]).impl)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(fetchMotHistory('AB12CDE', fakeUpstream([500]).impl)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
  it('says which variables are missing (names only)', async () => {
    delete process.env.MOT_API_KEY;
    await expect(fetchMotHistory('AB12CDE', fakeUpstream().impl)).rejects.toThrow(/MOT_API_KEY/);
  });
  it('normalises tests, kilometres and defects', () => {
    const v = normaliseMot(
      {
        registration: 'AB12CDE', registrationDate: '2020-02-03', engineSize: '1598',
        motTests: [
          { completedDate: '2024-01-05T10:00:00.000Z', testResult: 'PASSED', expiryDate: '2025-01-04', odometerValue: '50000', odometerUnit: 'KM', odometerResultType: 'READ', defects: [{ text: 'Tyre worn', type: 'advisory', dangerous: false }] },
          { completedDate: '2025-01-03T10:00:00.000Z', testResult: 'FAILED', odometerValue: '0', odometerResultType: 'UNREADABLE' },
        ],
      },
      'AB12CDE',
    );
    expect(v.engineSize).toBe(1598);
    expect(v.tests.map((t) => t.date)).toEqual(['2025-01-03', '2024-01-05']);
    expect(v.tests[1].odometer).toEqual({ value: 50000, unit: 'km' });
    expect(v.tests[0].odometer).toBeUndefined();
    expect(v.tests[1].defects[0].type).toBe('ADVISORY');
  });
});

describe('link preview safety', () => {
  it('spots private addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1']) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress('151.101.1.1')).toBe(false);
  });
  it('only allows public http(s) links', async () => {
    const resolvePublic = async () => ['151.101.1.1'];
    await expect(assertPublicUrl('ftp://x.com/a', resolvePublic)).rejects.toBeInstanceOf(ApiFailure);
    await expect(assertPublicUrl('http://localhost/', resolvePublic)).rejects.toBeInstanceOf(ApiFailure);
    await expect(assertPublicUrl('http://169.254.169.254/latest', resolvePublic)).rejects.toBeInstanceOf(ApiFailure);
    await expect(assertPublicUrl('https://evil.example/', async () => ['10.0.0.5'])).rejects.toBeInstanceOf(ApiFailure);
    await expect(assertPublicUrl('https://www.autotrader.co.uk/car-details/1', resolvePublic)).resolves.toBeInstanceOf(URL);
  });
  it('reads Open Graph tags in any attribute order', () => {
    const html = `<head><title>Fallback</title>
      <meta content="2021 Ford Focus &amp; more" property="og:title">
      <meta property='og:image' content='/img/car.jpg'>
      <meta property="og:site_name" content="AutoSite"></head>`;
    expect(parsePreviewTags(html, new URL('http://cars.example/ad/1'))).toEqual({
      title: '2021 Ford Focus & more',
      imageUrl: 'https://cars.example/img/car.jpg',
      siteName: 'AutoSite',
    });
  });
});
