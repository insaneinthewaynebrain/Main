/**
 * Basic fixed-window rate limiting. Uses Netlify Blobs when running on
 * Netlify (shared across function instances), otherwise memory.
 */
export interface CounterStore {
  /** Adds one to `key` and returns the new count and when the window resets. */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  peek(key: string): Promise<{ count: number; resetAt: number } | undefined>;
}

export class MemoryCounterStore implements CounterStore {
  private map = new Map<string, { count: number; resetAt: number }>();
  constructor(private now: () => number = Date.now) {}

  async increment(key: string, windowMs: number) {
    const t = this.now();
    const cur = this.map.get(key);
    const next = cur && cur.resetAt > t ? { count: cur.count + 1, resetAt: cur.resetAt } : { count: 1, resetAt: t + windowMs };
    this.map.set(key, next);
    if (this.map.size > 5_000) this.sweep(t);
    return next;
  }

  async peek(key: string) {
    const cur = this.map.get(key);
    return cur && cur.resetAt > this.now() ? cur : undefined;
  }

  private sweep(t: number) {
    for (const [k, v] of this.map) if (v.resetAt <= t) this.map.delete(k);
  }
}

/** Netlify Blobs-backed counters (not atomic — fine for basic protection). */
class BlobCounterStore implements CounterStore {
  constructor(private store: { get(k: string, o: { type: 'json' }): Promise<unknown>; setJSON(k: string, v: unknown): Promise<unknown> }) {}

  async increment(key: string, windowMs: number) {
    const t = Date.now();
    const cur = (await this.store.get(key, { type: 'json' })) as { count: number; resetAt: number } | null;
    const next = cur && cur.resetAt > t ? { count: cur.count + 1, resetAt: cur.resetAt } : { count: 1, resetAt: t + windowMs };
    await this.store.setJSON(key, next);
    return next;
  }

  async peek(key: string) {
    const cur = (await this.store.get(key, { type: 'json' })) as { count: number; resetAt: number } | null;
    return cur && cur.resetAt > Date.now() ? cur : undefined;
  }
}

let shared: CounterStore | undefined;

export async function getCounterStore(): Promise<CounterStore> {
  if (shared) return shared;
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: 'rate-limits', consistency: 'strong' });
    await store.get('probe'); // throws outside Netlify
    shared = new BlobCounterStore(store as never);
  } catch {
    shared = new MemoryCounterStore();
  }
  return shared;
}

/** For tests. */
export function setCounterStore(store: CounterStore | undefined): void {
  shared = store;
}
