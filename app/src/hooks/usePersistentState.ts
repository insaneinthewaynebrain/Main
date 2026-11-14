import { useEffect, useState } from 'react';

const PREFIX = 'carfin:';

/** useState that remembers its value on this device. Falls back silently if storage is blocked. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
