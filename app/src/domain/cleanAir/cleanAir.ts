/**
 * Likely clean air zone compliance from fuel type, Euro status and registration date.
 * DVLA data isn't definitive, so results are always "likely" and link to official checkers.
 */
import { cleanAirConfig, type CleanAirConfig } from '../../config/cleanAirZones';
import type { ISODate } from '../dates';

export type CleanAirStatus = 'likely-compliant' | 'possibly-compliant' | 'likely-not-compliant' | 'unknown';

export interface CleanAirResult {
  status: CleanAirStatus;
  /** One-line summary, e.g. "Likely ULEZ and clean air zone compliant". */
  headline: string;
  /** What the judgement was based on. */
  basis: string;
  euro?: number;
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/** "Euro 6", "EURO 6 AD", "Euro 6d-TEMP", "EURO4", "Euro V" → number. */
export function parseEuroStatus(text?: string): number | undefined {
  if (!text) return undefined;
  const m = /euro\s*([1-6]|VI|IV|V|III|II|I)\b/i.exec(text) ?? /euro\s*([1-6])/i.exec(text);
  if (!m) return undefined;
  const v = m[1].toUpperCase();
  return ROMAN[v] ?? Number(v);
}

export type FuelGroup = 'zero' | 'petrol' | 'diesel' | 'unknown';

export function fuelGroup(fuelType?: string): FuelGroup {
  const f = (fuelType ?? '').toUpperCase();
  if (!f) return 'unknown';
  if (f === 'ELECTRICITY' || f === 'ELECTRIC' || f.includes('FUEL CELL') || f.includes('HYDROGEN')) return 'zero';
  if (f.includes('DIESEL')) return 'diesel'; // includes "ELECTRIC DIESEL" hybrids
  if (f.includes('PETROL') || f.includes('HYBRID') || f.includes('GAS')) return 'petrol';
  return 'unknown';
}

export function assessCleanAir(
  input: { fuelType?: string; euroStatus?: string; registrationDate?: ISODate },
  config: CleanAirConfig = cleanAirConfig,
): CleanAirResult {
  const group = fuelGroup(input.fuelType);
  const euro = parseEuroStatus(input.euroStatus);
  const yes = (basis: string): CleanAirResult => ({ status: 'likely-compliant', headline: 'Likely compliant with ULEZ and UK clean air zones', basis, euro });
  const no = (basis: string): CleanAirResult => ({ status: 'likely-not-compliant', headline: 'Likely NOT compliant — charges in ULEZ and Class D zones', basis, euro });

  if (group === 'zero') return yes('Zero emission vehicle');
  if (group === 'unknown') {
    return { status: 'unknown', headline: 'Compliance unknown', basis: 'Fuel type not recognised', euro };
  }

  const min = group === 'petrol' ? config.minimumEuro.petrol : config.minimumEuro.diesel;
  const fuelName = group === 'petrol' ? 'Petrol' : 'Diesel';

  if (euro !== undefined) {
    return euro >= min
      ? yes(`${fuelName}, Euro ${euro} (needs Euro ${min})`)
      : no(`${fuelName}, Euro ${euro} (needs Euro ${min})`);
  }

  const reg = input.registrationDate;
  if (!reg) return { status: 'unknown', headline: 'Compliance unknown', basis: 'No Euro status or registration date' };

  const fb = config.dateFallback;
  if (group === 'petrol') {
    if (reg >= fb.petrolEuro4From) return yes(`Petrol registered from 2006, so likely Euro 4 or newer (needs Euro ${min})`);
    if (reg >= fb.petrolMaybeFrom) {
      return {
        status: 'possibly-compliant',
        headline: 'Possibly compliant — many 2001–2005 petrol cars meet Euro 4',
        basis: `Petrol registered 2001–2005, Euro status not recorded (needs Euro ${min})`,
      };
    }
    return no(`Petrol registered before 2001, so likely below Euro ${min}`);
  }
  if (reg >= fb.dieselEuro6From) return yes(`Diesel registered from Sept 2015, so likely Euro 6 (needs Euro ${min})`);
  return no(`Diesel registered before Sept 2015, so likely below Euro ${min}`);
}
