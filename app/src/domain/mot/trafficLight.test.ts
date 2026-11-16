import { describe, expect, it } from 'vitest';
import { assessMot } from './trafficLight';
import { averageMilesPerYear, findMileageDrops, normaliseDefectText } from './history';
import type { MotTest, MotVehicle } from '../vehicle/types';

const TODAY = '2026-11-16';

function test(date: string, opts: Partial<MotTest> & { miles?: number } = {}): MotTest {
  const { miles, ...rest } = opts;
  return {
    date,
    result: 'PASSED',
    expiryDate: rest.result === 'FAILED' ? undefined : nextYear(date),
    odometer: miles === undefined ? undefined : { value: miles, unit: 'mi' },
    defects: [],
    ...rest,
  };
}
function nextYear(date: string) {
  return `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`;
}
const adv = (text: string) => ({ text, type: 'ADVISORY', dangerous: false });
const major = (text: string) => ({ text, type: 'MAJOR', dangerous: false });
const vehicle = (tests: MotTest[], extra: Partial<MotVehicle> = {}): MotVehicle => ({
  registration: 'AB12CDE',
  tests,
  ...extra,
});

describe('GREEN', () => {
  it('valid MOT, recent passes, few advisories', () => {
    const a = assessMot({
      mot: vehicle([
        test('2026-06-01', { miles: 40_000, defects: [adv('Tyre slightly worn')] }),
        test('2025-06-03', { miles: 32_000 }),
        test('2024-06-02', { miles: 24_000 }),
      ]),
      registrationDate: '2021-06-01',
      today: TODAY,
    });
    expect(a.light).toBe('green');
    expect(a.reason).toBe('Valid MOT to 1 Jun 2027; passed 1 Jun 2026 with 1 advisory');
  });
});

describe('NONE — too new for an MOT', () => {
  it('under 3 years old with no test is "No MOT due yet", not red', () => {
    const a = assessMot({
      mot: vehicle([], { motTestDueDate: '2028-06-19' }),
      registrationDate: '2025-06-20',
      today: TODAY,
    });
    expect(a.light).toBe('none');
    expect(a.reason).toBe('No MOT due yet — first MOT due 19 Jun 2028');
  });
  it('over 3 years old with no test is red', () => {
    expect(assessMot({ mot: vehicle([]), registrationDate: '2020-01-01', today: TODAY }).light).toBe('red');
  });
});

describe('AMBER', () => {
  it('MOT expires within 60 days', () => {
    const a = assessMot({ mot: vehicle([test('2025-12-20', { miles: 30_000 })]), registrationDate: '2021-12-01', today: TODAY });
    expect(a.light).toBe('amber');
    expect(a.reason).toBe('MOT expires in 34 days (20 Dec 2026)');
  });
  it('a fail in the last 2 tests', () => {
    const a = assessMot({
      mot: vehicle([
        test('2026-05-10', { miles: 30_000 }),
        test('2026-05-02', { result: 'FAILED', miles: 30_000, defects: [] }),
        test('2025-05-01', { miles: 22_000 }),
      ]),
      registrationDate: '2022-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('amber');
    expect(a.reason).toBe('Failed an MOT on 2 May 2026');
  });
  it('the same advisory in consecutive years (ignoring manual references)', () => {
    const a = assessMot({
      mot: vehicle([
        test('2026-05-01', { miles: 30_000, defects: [adv('Front brake disc worn (1.1.14 (a))')] }),
        test('2025-05-01', { miles: 22_000, defects: [adv('Front brake disc worn')] }),
      ]),
      registrationDate: '2021-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('amber');
    expect(a.reason).toContain('Same advisory');
    expect(a.reason).toBe('Same advisory in 2+ tests in a row: Front brake disc worn');
  });
  it('strips nested manual references from reasons', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 40_000, defects: [adv('Brake pipe corroded (1.1.11 (c) (ii))')] })]),
      registrationDate: '2021-05-01',
      today: TODAY,
    });
    expect(a.reason).toBe('Corrosion advisory: Brake pipe corroded');
  });
  it('a fail and same-week retest do not count as a repeat', () => {
    const a = assessMot({
      mot: vehicle([
        test('2025-12-10', { miles: 30_000, defects: [adv('Wiper blade worn')] }),
        test('2025-12-04', { result: 'FAILED', miles: 30_000, defects: [adv('Wiper blade worn')] }),
        test('2024-12-01', { miles: 22_000 }),
      ]),
      registrationDate: '2020-12-01',
      today: '2026-03-01',
    });
    expect(a.reasons.some((r) => r.text.includes('Same advisory'))).toBe(false);
  });
  it('more than 5 advisories', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 30_000, defects: ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => adv(`Item ${x}`)) })]),
      registrationDate: '2021-05-01',
      today: TODAY,
    });
    expect(a.reason).toBe('6 advisories at the latest test');
  });
  it('high mileage for its age', () => {
    const a = assessMot({ mot: vehicle([test('2026-05-01', { miles: 125_000 })]), registrationDate: '2021-05-01', today: TODAY });
    expect(a.light).toBe('amber');
    expect(a.reason).toMatch(/^High mileage: about 25,0\d\d miles a year$/);
  });
  it('low mileage for its age', () => {
    const a = assessMot({ mot: vehicle([test('2026-05-01', { miles: 6_000 })]), registrationDate: '2021-05-01', today: TODAY });
    expect(a.reason).toMatch(/^Unusually low mileage/);
  });
  it('plain corrosion advisory is amber, not red', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 40_000, defects: [adv('Brake pipe slightly corroded')] })]),
      registrationDate: '2021-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('amber');
    expect(a.reason).toBe('Corrosion advisory: Brake pipe slightly corroded');
  });
});

describe('RED', () => {
  it('no valid MOT', () => {
    const a = assessMot({ mot: vehicle([test('2025-01-10', { miles: 40_000 })]), registrationDate: '2020-01-01', today: TODAY });
    expect(a.light).toBe('red');
    expect(a.reason).toBe('No valid MOT — expired 10 Jan 2026');
  });
  it('major or dangerous defects in the latest test', () => {
    const a = assessMot({
      mot: vehicle([
        test('2026-10-01', { result: 'FAILED', miles: 50_000, defects: [major('Headlamp aim too high')] }),
        test('2026-02-01', { miles: 45_000 }),
      ]),
      registrationDate: '2020-02-01',
      today: TODAY,
    });
    expect(a.light).toBe('red');
    expect(a.reason).toBe('Latest test (1 Oct 2026) found 1 major defect');
  });
  it('dangerous defect wording', () => {
    const a = assessMot({
      mot: vehicle([
        test('2026-10-01', { result: 'FAILED', miles: 50_000, defects: [{ text: 'Tyre cord exposed', type: 'DANGEROUS', dangerous: true }] }),
        test('2026-02-01', { miles: 45_000 }),
      ]),
      registrationDate: '2020-02-01',
      today: TODAY,
    });
    expect(a.reason).toBe('Latest test (1 Oct 2026) found 1 dangerous/major defect');
  });
  it('structural corrosion advisory is red', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 40_000, defects: [adv('Offside sill corroded but not seriously weakened')] })]),
      registrationDate: '2021-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('red');
    expect(a.reason).toBe('Structural corrosion: Offside sill corroded but not seriously weakened');
  });
  it('mileage going backwards', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 38_000 }), test('2025-05-01', { miles: 41_000 }), test('2024-05-01', { miles: 30_000 })]),
      registrationDate: '2020-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('red');
    expect(a.reason).toBe('Mileage went backwards: 41,000 mi (1 May 2025) → 38,000 mi (1 May 2026)');
  });
  it('red outranks amber and lists every reason', () => {
    const a = assessMot({
      mot: vehicle([test('2026-05-01', { miles: 38_000, defects: [adv('Brake pipe corroded')] }), test('2025-05-01', { miles: 41_000 })]),
      registrationDate: '2020-05-01',
      today: TODAY,
    });
    expect(a.light).toBe('red');
    expect(a.reasons.map((r) => r.light)).toEqual(['red', 'amber', 'green']);
  });
});

describe('history helpers', () => {
  it('converts kilometres when checking for roll-backs', () => {
    const tests: MotTest[] = [
      { ...test('2024-01-01'), odometer: { value: 50_000, unit: 'km' } }, // ≈ 31,069 mi
      { ...test('2025-01-01'), odometer: { value: 32_000, unit: 'mi' } },
    ];
    expect(findMileageDrops(tests)).toHaveLength(0);
  });
  it('averages miles per year since registration', () => {
    expect(averageMilesPerYear([test('2025-01-01', { miles: 30_000 })], '2022-01-01')).toBeCloseTo(10_000, -2);
  });
  it('normalises defect text', () => {
    expect(normaliseDefectText('Front  Brake disc worn (1.1.14 (a) (ii))')).toBe('front brake disc worn');
  });
});
