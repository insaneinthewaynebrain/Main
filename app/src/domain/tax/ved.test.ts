import { describe, expect, it } from 'vitest';
import { directDebitMonthly, estimateVed } from './ved';

const TODAY = '2026-11-16';

describe('before 1 March 2001 — engine size', () => {
  it('up to 1549cc', () => {
    const e = estimateVed({ registrationDate: '1998-03-01', fuelType: 'PETROL', engineCapacity: 1396, today: TODAY });
    expect(e).toMatchObject({ status: 'ok', annual: 230, regime: 'pre-2001' });
  });
  it('over 1549cc', () => {
    expect(estimateVed({ registrationDate: '2001-02-28', engineCapacity: 1550, today: TODAY })).toMatchObject({ annual: 375 });
  });
  it('asks for engine size if unknown', () => {
    expect(estimateVed({ registrationDate: '1999-01-01', today: TODAY })).toMatchObject({ status: 'needs-input', missing: 'engine' });
  });
});

describe('1 March 2001 – 31 March 2017 — CO2 bands', () => {
  const at = (co2: number, registrationDate = '2014-05-09') =>
    estimateVed({ registrationDate, fuelType: 'DIESEL', co2Emissions: co2, today: TODAY });
  it('band edges', () => {
    expect(at(100)).toMatchObject({ annual: 20 });
    expect(at(109)).toMatchObject({ annual: 20 });
    expect(at(111)).toMatchObject({ annual: 35 });
    expect(at(130)).toMatchObject({ annual: 170 });
    expect(at(131)).toMatchObject({ annual: 200 });
    expect(at(165)).toMatchObject({ annual: 275 });
    expect(at(255)).toMatchObject({ annual: 760 });
    expect(at(256)).toMatchObject({ annual: 790 });
  });
  it('describes the band', () => {
    expect(at(109)).toMatchObject({ rule: 'Registered 2001–2017: CO2 band B (109 g/km, band 101–110 g/km)' });
  });
  it('caps cars over 225 g/km registered before 23 March 2006 at band K', () => {
    expect(at(260, '2005-06-01')).toMatchObject({ annual: 445 });
    expect(at(260, '2006-03-23')).toMatchObject({ annual: 790 });
  });
  it('2001 starts the CO2 regime', () => {
    expect(at(150, '2001-03-01')).toMatchObject({ regime: 'co2-bands', annual: 225 });
  });
  it('electric cars in this period pay band A', () => {
    expect(estimateVed({ registrationDate: '2015-01-01', fuelType: 'ELECTRICITY', today: TODAY })).toMatchObject({ annual: 20 });
  });
  it('asks for CO2 if unknown', () => {
    expect(estimateVed({ registrationDate: '2010-01-01', fuelType: 'PETROL', today: TODAY })).toMatchObject({
      status: 'needs-input', missing: 'co2',
    });
  });
});

describe('1 April 2017 onwards — standard rate', () => {
  it('standard rate for petrol, diesel, hybrid and electric', () => {
    for (const fuelType of ['PETROL', 'DIESEL', 'HYBRID ELECTRIC', 'ELECTRICITY']) {
      expect(estimateVed({ registrationDate: '2017-04-01', fuelType, co2Emissions: 120, today: TODAY })).toMatchObject({
        annual: 200, monthly: 200 / 12, regime: 'standard',
      });
    }
  });
});

describe('expensive car supplement', () => {
  const base = { fuelType: 'PETROL', co2Emissions: 150, today: TODAY };

  it('applies in years 2–6 when the list price is over £40,000, with years remaining', () => {
    const e = estimateVed({ ...base, registrationDate: '2022-07-14', listPrice: 45_000 });
    expect(e).toMatchObject({ annual: 640 });
    if (e.status !== 'ok') throw new Error();
    expect(e.supplement).toMatchObject({ appliesNow: true, yearsRemaining: 2, endsOn: '2028-07-14' });
    expect(e.rule).toBe('Registered from 1 Apr 2017: standard rate £200 + £440 expensive car supplement (years 2–6, 2 years left)');
  });
  it('the tick box works without a list price', () => {
    expect(estimateVed({ ...base, registrationDate: '2022-07-14', overThresholdWhenNew: true })).toMatchObject({ annual: 640 });
  });
  it('exactly £40,000 is not "more than" the threshold', () => {
    expect(estimateVed({ ...base, registrationDate: '2022-07-14', listPrice: 40_000 })).toMatchObject({ annual: 200 });
  });
  it('does not apply in the first year, and says when it starts', () => {
    const e = estimateVed({ ...base, registrationDate: '2026-06-01', listPrice: 60_000 });
    expect(e).toMatchObject({ annual: 200 });
    if (e.status !== 'ok') throw new Error();
    expect(e.supplement).toMatchObject({ appliesNow: false, yearsRemaining: 5 });
    expect(e.rule).toContain('supplement starts 1 Jun 2027 for 5 years');
  });
  it('stops after year 6', () => {
    const e = estimateVed({ ...base, registrationDate: '2020-01-01', listPrice: 60_000 });
    expect(e).toMatchObject({ annual: 200 });
    if (e.status !== 'ok') throw new Error();
    expect(e.supplement?.yearsRemaining).toBe(0);
    expect(e.supplementRelevant).toBe(false);
  });
  it('is the last year on the day before the 6th anniversary', () => {
    const e = estimateVed({ ...base, registrationDate: '2020-11-17', listPrice: 60_000 });
    expect(e).toMatchObject({ annual: 640 });
    if (e.status !== 'ok') throw new Error();
    expect(e.supplement?.yearsRemaining).toBe(1);
  });
});

describe('electric cars (rules from April 2025)', () => {
  const ev = { fuelType: 'ELECTRICITY', co2Emissions: 0, today: TODAY };
  it('registered before 1 April 2025: standard rate, never the supplement', () => {
    const e = estimateVed({ ...ev, registrationDate: '2023-03-01', listPrice: 80_000 });
    expect(e).toMatchObject({ annual: 200, supplementRelevant: false });
    if (e.status !== 'ok') throw new Error();
    expect(e.rule).toContain('no supplement');
  });
  it('registered from 1 April 2025: £50,000 threshold', () => {
    expect(estimateVed({ ...ev, registrationDate: '2025-06-20', listPrice: 48_000 })).toMatchObject({ annual: 200 });
    expect(estimateVed({ ...ev, registrationDate: '2025-06-20', listPrice: 52_000 })).toMatchObject({ annual: 640, threshold: 50_000 });
  });
  it('petrol threshold stays £40,000', () => {
    expect(estimateVed({ fuelType: 'PETROL', registrationDate: '2025-06-20', listPrice: 45_000, today: TODAY })).toMatchObject({
      annual: 640, threshold: 40_000,
    });
  });
});

describe('flags likely expensive cars from DVLA data', () => {
  it('uses the DVLA additional-rate end date as a hint', () => {
    const e = estimateVed({ registrationDate: '2025-06-20', fuelType: 'ELECTRICITY', artEndDate: '2031-06-19', today: TODAY });
    expect(e).toMatchObject({ annual: 200 });
    if (e.status !== 'ok') throw new Error();
    expect(e.likelyExpensive).toContain('additional rate of tax until 19 Jun 2031');
  });
});

describe('monthly figures', () => {
  it('Direct Debit monthly is 5% more than annual ÷ 12', () => {
    expect(directDebitMonthly(200) * 12).toBeCloseTo(210, 8);
    expect(directDebitMonthly(640) * 12).toBeCloseTo(672, 8);
  });
});
