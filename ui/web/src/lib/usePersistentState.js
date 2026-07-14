import { useEffect, useState } from 'react';

// State backed by localStorage: read once on mount, write back on every change.
// With `raw`, the string is stored verbatim (no JSON quotes); otherwise values
// are JSON-encoded and a `null` value removes the key entirely. Read/write
// failures fall back to the default and are logged rather than thrown.
export function usePersistentState(key, defaultValue, { raw = false } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return raw ? stored : JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (raw) {
        localStorage.setItem(key, value);
      } else if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
    }
  }, [key, value, raw]);

  return [value, setValue];
}
