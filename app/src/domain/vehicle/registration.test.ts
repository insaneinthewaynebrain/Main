import { describe, expect, it } from 'vitest';
import { formatRegistration, isValidRegistration, normaliseRegistration } from './registration';
import { resolveRegistrationDate } from './registrationDate';

describe('registration numbers', () => {
  it('strips spaces and uppercases', () => {
    expect(normaliseRegistration(' mk22 grn ')).toBe('MK22GRN');
    expect(normaliseRegistration('ab-12.cde')).toBe('AB12CDE');
  });
  it('accepts UK formats', () => {
    for (const r of ['MK22 GRN', 'A123 BCD', 'R123ABC', 'ABC 123D', 'ABZ 1234', '1 A', 'K1']) {
      expect(isValidRegistration(r)).toBe(true);
    }
  });
  it('rejects nonsense', () => {
    for (const r of ['', 'A', 'ABCDEFGH', '12345678', 'AB12CDEF', 'ABCD']) {
      expect(isValidRegistration(r)).toBe(false);
    }
  });
  it('formats with the conventional space', () => {
    expect(formatRegistration('mk22grn')).toBe('MK22 GRN');
    expect(formatRegistration('r123abc')).toBe('R123 ABC');
    expect(formatRegistration('abc123d')).toBe('ABC 123D');
  });
});

describe('resolveRegistrationDate', () => {
  it('prefers the exact MOT date', () => {
    expect(
      resolveRegistrationDate({
        mot: { registration: 'X', tests: [], registrationDate: '2022-07-14' },
        dvla: { registrationNumber: 'X', yearOfFirstRegistration: 2022, monthOfFirstRegistration: 7 },
      }),
    ).toEqual({ date: '2022-07-14', approx: false, source: 'mot' });
  });
  it('falls back to the DVLA month, assuming the 1st (approx)', () => {
    expect(
      resolveRegistrationDate({ dvla: { registrationNumber: 'X', yearOfFirstRegistration: 2022, monthOfFirstRegistration: 7 } }),
    ).toEqual({ date: '2022-07-01', approx: true, source: 'dvla' });
  });
  it('manual entry overrides, approx without a day', () => {
    expect(resolveRegistrationDate({ manual: { year: 2023, month: 10 } })).toEqual({ date: '2023-10-01', approx: true, source: 'manual' });
    expect(resolveRegistrationDate({ manual: { year: 2023, month: 10, day: 9 } })).toEqual({ date: '2023-10-09', approx: false, source: 'manual' });
  });
  it('is undefined with nothing to go on', () => {
    expect(resolveRegistrationDate({})).toBeUndefined();
  });
});
