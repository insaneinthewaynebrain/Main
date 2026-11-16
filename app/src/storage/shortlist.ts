/**
 * Shortlist saved on this device in IndexedDB (photos included).
 * Plain async functions plus a tiny change notifier; the React hook lives in hooks/.
 */
import type { ISODate } from '../domain/dates';
import type { ManualRegistrationDate } from '../domain/vehicle/registrationDate';
import type { DvlaVehicle, MotVehicle } from '../domain/vehicle/types';

export interface ShortlistItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  reg?: string;
  /** From the lookup, or typed in. */
  make?: string;
  model?: string;
  advertUrl?: string;
  advertTitle?: string;
  advertImageUrl?: string;
  advertSite?: string;
  /** Photo picked from the camera roll (resized). */
  photo?: Blob;
  askingPrice?: number;
  deposit: number;
  requestedTermMonths?: number;
  /** Snapshot of the last lookup, so cards work offline. */
  vehicle?: DvlaVehicle;
  mot?: MotVehicle;
  lookupAt?: string;
  mock?: boolean;
  manualRegistration?: ManualRegistrationDate;
  manualFuelType?: string;
  manualCo2?: number;
  manualEngineCc?: number;
  listPrice?: number;
  overThresholdWhenNew?: boolean;
  notes: string;
  favourite: boolean;
  ruledOut: boolean;
  /** Agreement start when saved (blank = today). */
  agreementStart?: ISODate;
}

const DB_NAME = 'hp-calc';
const STORE = 'shortlist';
let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = undefined;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

const listeners = new Set<() => void>();
export function onShortlistChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

export async function listShortlist(): Promise<ShortlistItem[]> {
  const items = await tx('readonly', (s) => s.getAll() as IDBRequest<ShortlistItem[]>);
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getShortlistItem(id: string): Promise<ShortlistItem | undefined> {
  return tx('readonly', (s) => s.get(id) as IDBRequest<ShortlistItem | undefined>);
}

export async function saveShortlistItem(item: ShortlistItem): Promise<ShortlistItem> {
  const saved = { ...item, updatedAt: new Date().toISOString() };
  await tx('readwrite', (s) => s.put(saved));
  notify();
  return saved;
}

export async function deleteShortlistItem(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  notify();
}

export async function findByReg(reg: string): Promise<ShortlistItem | undefined> {
  return (await listShortlist()).find((i) => i.reg === reg);
}

export function newShortlistItem(partial: Partial<ShortlistItem> = {}): ShortlistItem {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: now,
    updatedAt: now,
    deposit: 1000,
    notes: '',
    favourite: false,
    ruledOut: false,
    ...partial,
  };
}
