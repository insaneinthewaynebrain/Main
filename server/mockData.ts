/**
 * Sample cars for MOCK_MODE, so the app works before the real keys are set.
 * MOT dates are relative to today so the examples stay meaningful.
 *
 *   MK22GRN  Toyota Yaris hybrid — GREEN, the worked example (registered 14 Jul 2022)
 *   AM21BER  Ford Focus diesel — AMBER (MOT expires soon, repeated advisory)
 *   RD20FLT  BMW 320d — RED (major sill corrosion, mileage went backwards)
 *   EV25ECS  Tesla Model Y — no MOT due yet, likely expensive car supplement
 *   NO24MOT  Kia Picanto — DVLA record but no MOT record
 *   OL14DSL  VW Golf diesel 2014 — not eligible for finance, not ULEZ compliant
 *   R123ABC  Rover 214 1998 — DVLA month only (approx), pre-2001 tax
 *   SV19DWN  pretends the services are down
 *   RL19MIT  pretends we've been rate limited
 *   anything else → not found
 */
import { addDays, addYears, todayISO, type ISODate } from '../app/src/domain/dates';
import type { DvlaVehicle, LinkPreview, MotDefect, MotTest, MotVehicle } from '../app/src/domain/vehicle/types';
import { ApiFailure } from './http';

interface MockCar {
  dvla: DvlaVehicle;
  mot?: (today: ISODate) => MotVehicle;
}

const adv = (text: string): MotDefect => ({ text, type: 'ADVISORY', dangerous: false });
const minor = (text: string): MotDefect => ({ text, type: 'MINOR', dangerous: false });
const major = (text: string): MotDefect => ({ text, type: 'MAJOR', dangerous: false });
const pass = (date: ISODate, miles: number, defects: MotDefect[] = []): MotTest => ({
  date, result: 'PASSED', expiryDate: addDays(addYears(date, 1), -1), odometer: { value: miles, unit: 'mi' }, defects,
  testNumber: String(100000000000 + Math.abs(hash(date + miles)) % 899999999999),
});
const fail = (date: ISODate, miles: number, defects: MotDefect[]): MotTest => ({
  date, result: 'FAILED', odometer: { value: miles, unit: 'mi' }, defects,
  testNumber: String(100000000000 + Math.abs(hash(date + miles + 'f')) % 899999999999),
});
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

const CARS: Record<string, MockCar> = {
  MK22GRN: {
    dvla: {
      registrationNumber: 'MK22GRN', make: 'TOYOTA', colour: 'GREY', fuelType: 'HYBRID ELECTRIC', engineCapacity: 1490,
      co2Emissions: 92, euroStatus: 'EURO 6 AP', yearOfFirstRegistration: 2022, monthOfFirstRegistration: 7,
      yearOfManufacture: 2022, taxStatus: 'Taxed', motStatus: 'Valid',
    },
    mot: (today) => {
      const last = addDays(today, -130);
      return {
        registration: 'MK22GRN', make: 'TOYOTA', model: 'YARIS DESIGN', fuelType: 'Hybrid Electric (Clean)', primaryColour: 'Grey',
        engineSize: 1490, registrationDate: '2022-07-14', manufactureDate: '2022-06-30', hasOutstandingRecall: 'No',
        tests: [
          pass(last, 28_540, [adv('Nearside rear tyre worn close to legal limit/worn on edge (5.2.3 (e))')]),
          pass(addYears(last, -1), 21_105),
        ],
      };
    },
  },
  AM21BER: {
    dvla: {
      registrationNumber: 'AM21BER', make: 'FORD', colour: 'BLUE', fuelType: 'DIESEL', engineCapacity: 1499, co2Emissions: 104,
      euroStatus: 'Euro 6', yearOfFirstRegistration: 2021, monthOfFirstRegistration: 2, yearOfManufacture: 2021,
      taxStatus: 'Taxed', motStatus: 'Valid',
    },
    mot: (today) => {
      const last = addYears(addDays(today, 41), -1); // expires in 40 days
      return {
        registration: 'AM21BER', make: 'FORD', model: 'FOCUS ST-LINE', fuelType: 'Diesel', primaryColour: 'Blue', engineSize: 1499,
        registrationDate: '2021-02-03', hasOutstandingRecall: 'Unknown',
        tests: [
          pass(last, 47_820, [adv('Front brake disc worn, pitted or scored, but not seriously weakened (1.1.14 (a) (ii))'), minor('Nearside front position lamp not working (4.2.1 (a) (ii))')]),
          pass(addDays(last, -362), 38_910, [adv('Front brake disc worn, pitted or scored, but not seriously weakened (1.1.14 (a) (ii))')]),
          pass(addDays(last, -729), 27_300),
        ],
      };
    },
  },
  RD20FLT: {
    dvla: {
      registrationNumber: 'RD20FLT', make: 'BMW', colour: 'BLACK', fuelType: 'DIESEL', engineCapacity: 1995, co2Emissions: 118,
      euroStatus: 'EURO 6', yearOfFirstRegistration: 2020, monthOfFirstRegistration: 1, yearOfManufacture: 2019,
      taxStatus: 'Taxed', motStatus: 'Valid',
    },
    mot: (today) => {
      const failed = addDays(today, -12);
      const before = addDays(today, -300);
      return {
        registration: 'RD20FLT', make: 'BMW', model: '320D M SPORT', fuelType: 'Diesel', primaryColour: 'Black', engineSize: 1995,
        registrationDate: '2020-01-15', hasOutstandingRecall: 'Yes',
        tests: [
          fail(failed, 58_960, [
            major('Offside sill excessively corroded (5.3.3 (b) (i))'),
            adv('Underside has light surface corrosion'),
          ]),
          pass(before, 61_230, [adv('Oil leak, but not excessive (8.4.1 (a) (i))')]),
          pass(addYears(before, -1), 44_800),
        ],
      };
    },
  },
  EV25ECS: {
    dvla: {
      registrationNumber: 'EV25ECS', make: 'TESLA', colour: 'WHITE', fuelType: 'ELECTRICITY', co2Emissions: 0,
      yearOfFirstRegistration: 2025, monthOfFirstRegistration: 6, yearOfManufacture: 2025, taxStatus: 'Taxed',
      motStatus: 'No details held by DVLA', artEndDate: '2031-06-19',
    },
    mot: () => ({
      registration: 'EV25ECS', make: 'TESLA', model: 'MODEL Y LONG RANGE', fuelType: 'Electric', primaryColour: 'White',
      registrationDate: '2025-06-20', manufactureDate: '2025-05-28', motTestDueDate: '2028-06-20', hasOutstandingRecall: 'No', tests: [],
    }),
  },
  NO24MOT: {
    dvla: {
      registrationNumber: 'NO24MOT', make: 'KIA', colour: 'RED', fuelType: 'PETROL', engineCapacity: 998, co2Emissions: 112,
      euroStatus: 'EURO 6', yearOfFirstRegistration: 2024, monthOfFirstRegistration: 9, yearOfManufacture: 2024,
      taxStatus: 'Taxed', motStatus: 'No details held by DVLA',
    },
  },
  OL14DSL: {
    dvla: {
      registrationNumber: 'OL14DSL', make: 'VOLKSWAGEN', colour: 'SILVER', fuelType: 'DIESEL', engineCapacity: 1598, co2Emissions: 109,
      euroStatus: 'Euro 5', yearOfFirstRegistration: 2014, monthOfFirstRegistration: 5, yearOfManufacture: 2014,
      taxStatus: 'Taxed', motStatus: 'Valid',
    },
    mot: (today) => {
      const last = addDays(today, -90);
      return {
        registration: 'OL14DSL', make: 'VOLKSWAGEN', model: 'GOLF SE TDI BLUEMOTION', fuelType: 'Diesel', primaryColour: 'Silver',
        engineSize: 1598, registrationDate: '2014-05-09', hasOutstandingRecall: 'No',
        tests: [pass(last, 96_400), pass(addYears(last, -1), 87_950), pass(addYears(last, -2), 79_100)],
      };
    },
  },
  R123ABC: {
    dvla: {
      registrationNumber: 'R123ABC', make: 'ROVER', colour: 'GREEN', fuelType: 'PETROL', engineCapacity: 1396,
      yearOfFirstRegistration: 1998, monthOfFirstRegistration: 3, yearOfManufacture: 1998, taxStatus: 'Taxed', motStatus: 'Valid',
    },
    mot: (today) => {
      const last = addDays(today, -60);
      return {
        registration: 'R123ABC', make: 'ROVER', model: '214', fuelType: 'Petrol', primaryColour: 'Green', engineSize: 1396,
        hasOutstandingRecall: 'Unavailable',
        tests: [pass(last, 51_200, [adv('Exhaust has a minor leak of exhaust gases (7.1.2 (a) (i))')]), pass(addYears(last, -1), 50_150)],
      };
    },
  },
};

/** Tax/MOT dates in DVLA data are also kept relative to today. */
function withDvlaDates(car: MockCar, today: ISODate): DvlaVehicle {
  const d = { ...car.dvla };
  if (d.taxStatus === 'Taxed') d.taxDueDate = addDays(today, 140);
  const mot = car.mot?.(today);
  const expiry = mot?.tests.filter((t) => t.result === 'PASSED').map((t) => t.expiryDate!).sort().at(-1);
  if (expiry) d.motExpiry = expiry;
  if (mot?.motTestDueDate) d.motExpiry = mot.motTestDueDate;
  return d;
}

function simulatedErrors(reg: string) {
  if (reg === 'SV19DWN') throw new ApiFailure('UNAVAILABLE', 'The service is unavailable right now — please try again shortly. (sample)');
  if (reg === 'RL19MIT') throw new ApiFailure('RATE_LIMITED', 'Too many lookups — please wait a few minutes and try again. (sample)', 120);
}

export function mockDvla(reg: string, today: ISODate = todayISO()): DvlaVehicle {
  simulatedErrors(reg);
  const car = CARS[reg];
  if (!car) throw new ApiFailure('NOT_FOUND', 'DVLA has no vehicle with that registration.');
  return withDvlaDates(car, today);
}

export function mockMot(reg: string, today: ISODate = todayISO()): MotVehicle {
  simulatedErrors(reg);
  const car = CARS[reg];
  if (!car?.mot) throw new ApiFailure('NOT_FOUND', 'No MOT record for that registration.');
  return car.mot(today);
}

export const MOCK_REGISTRATIONS = Object.keys(CARS);

/** A clearly-labelled sample preview so "add by link" can be tried offline. */
export function mockLinkPreview(url: string): LinkPreview {
  let host = 'example.com';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep default */
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="#1f232c"/><path d="M70 160h260l-22-48c-5-10-14-16-25-16H140c-11 0-21 6-26 16z" fill="#5eead4" opacity=".85"/><circle cx="130" cy="166" r="22" fill="#0f1115" stroke="#5eead4" stroke-width="6"/><circle cx="270" cy="166" r="22" fill="#0f1115" stroke="#5eead4" stroke-width="6"/><text x="200" y="215" fill="#9aa1ad" font-family="sans-serif" font-size="18" text-anchor="middle">Sample advert photo</text></svg>`;
  return {
    url,
    title: 'Sample advert — 2021 Ford Focus 1.5 EcoBlue ST-Line, 47,820 miles',
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    siteName: host,
    sample: true,
  };
}
