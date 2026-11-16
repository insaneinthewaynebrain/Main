/**
 * Vehicle data as the app uses it. The server functions convert DVLA and
 * DVSA responses into these shapes, so the app never sees raw API output.
 */
import type { ISODate } from '../dates';

/** From the DVLA Vehicle Enquiry Service. */
export interface DvlaVehicle {
  registrationNumber: string;
  make?: string;
  colour?: string;
  fuelType?: string;
  engineCapacity?: number;
  co2Emissions?: number;
  euroStatus?: string;
  realDrivingEmissions?: string;
  yearOfFirstRegistration?: number;
  monthOfFirstRegistration?: number;
  yearOfManufacture?: number;
  taxStatus?: string;
  taxDueDate?: ISODate;
  motStatus?: string;
  motExpiry?: ISODate;
  /** "Additional Rate of Tax applicable until" — a sign of the expensive car supplement. */
  artEndDate?: ISODate;
  markedForExport?: boolean;
  typeApproval?: string;
  wheelplan?: string;
}

export type DefectType =
  | 'ADVISORY'
  | 'DANGEROUS'
  | 'FAIL'
  | 'MAJOR'
  | 'MINOR'
  | 'NON SPECIFIC'
  | 'SYSTEM GENERATED'
  | 'USER ENTERED';

export interface MotDefect {
  text: string;
  type: DefectType | string;
  dangerous: boolean;
}

export interface MotTest {
  /** Date the test was completed. */
  date: ISODate;
  result: 'PASSED' | 'FAILED';
  expiryDate?: ISODate;
  /** Reading in the unit recorded, if the odometer was read. */
  odometer?: { value: number; unit: 'mi' | 'km' };
  testNumber?: string;
  defects: MotDefect[];
}

/** From the DVSA MOT History API. */
export interface MotVehicle {
  registration: string;
  make?: string;
  model?: string;
  fuelType?: string;
  primaryColour?: string;
  engineSize?: number;
  /** Exact first registration date (if DVSA has it). */
  registrationDate?: ISODate;
  firstUsedDate?: ISODate;
  manufactureDate?: ISODate;
  /** Only for vehicles too new to have had an MOT. */
  motTestDueDate?: ISODate;
  hasOutstandingRecall?: 'Yes' | 'No' | 'Unknown' | 'Unavailable';
  /** Newest first. */
  tests: MotTest[];
}

export type ApiErrorCode =
  | 'INVALID_REG'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'UNAUTHORISED'
  | 'NOT_CONFIGURED'
  | 'BAD_REQUEST';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  imageUrl?: string;
  siteName?: string;
  /** True when the site refused or had no preview tags. */
  blocked?: boolean;
  /** True for made-up previews in mock mode. */
  sample?: boolean;
}
