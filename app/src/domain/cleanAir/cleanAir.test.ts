import { describe, expect, it } from 'vitest';
import { assessCleanAir, fuelGroup, parseEuroStatus } from './cleanAir';

describe('parseEuroStatus', () => {
  it('reads DVLA variations', () => {
    expect(parseEuroStatus('Euro 6')).toBe(6);
    expect(parseEuroStatus('EURO 6 AD')).toBe(6);
    expect(parseEuroStatus('Euro 6d-TEMP')).toBe(6);
    expect(parseEuroStatus('EURO4')).toBe(4);
    expect(parseEuroStatus('Euro V')).toBe(5);
    expect(parseEuroStatus(undefined)).toBeUndefined();
    expect(parseEuroStatus('n/a')).toBeUndefined();
  });
});

describe('fuelGroup', () => {
  it('groups DVLA fuel types', () => {
    expect(fuelGroup('ELECTRICITY')).toBe('zero');
    expect(fuelGroup('HYBRID ELECTRIC')).toBe('petrol');
    expect(fuelGroup('ELECTRIC DIESEL')).toBe('diesel');
    expect(fuelGroup('PETROL/GAS')).toBe('petrol');
  });
});

describe('assessCleanAir', () => {
  it('electric is compliant', () => {
    expect(assessCleanAir({ fuelType: 'ELECTRICITY' }).status).toBe('likely-compliant');
  });
  it('uses the Euro status when present', () => {
    expect(assessCleanAir({ fuelType: 'DIESEL', euroStatus: 'Euro 6' }).status).toBe('likely-compliant');
    expect(assessCleanAir({ fuelType: 'DIESEL', euroStatus: 'Euro 5', registrationDate: '2016-01-01' }).status).toBe('likely-not-compliant');
    expect(assessCleanAir({ fuelType: 'PETROL', euroStatus: 'Euro 4' }).status).toBe('likely-compliant');
    expect(assessCleanAir({ fuelType: 'PETROL', euroStatus: 'Euro 3' }).status).toBe('likely-not-compliant');
  });
  it('falls back to the registration date', () => {
    expect(assessCleanAir({ fuelType: 'PETROL', registrationDate: '2006-01-01' }).status).toBe('likely-compliant');
    expect(assessCleanAir({ fuelType: 'PETROL', registrationDate: '2003-05-01' }).status).toBe('possibly-compliant');
    expect(assessCleanAir({ fuelType: 'PETROL', registrationDate: '1998-03-01' }).status).toBe('likely-not-compliant');
    expect(assessCleanAir({ fuelType: 'DIESEL', registrationDate: '2015-09-01' }).status).toBe('likely-compliant');
    expect(assessCleanAir({ fuelType: 'DIESEL', registrationDate: '2015-08-31' }).status).toBe('likely-not-compliant');
  });
  it('is unknown without enough data', () => {
    expect(assessCleanAir({}).status).toBe('unknown');
    expect(assessCleanAir({ fuelType: 'DIESEL' }).status).toBe('unknown');
  });
});
