import { useEffect, useState } from 'react';

/**
 * A copy of `value` that only updates once it has stopped changing for
 * `delay` ms — for search fields, where you want the typed value on screen
 * immediately but the query fired once.
 *
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debounced = useDebouncedValue(query, 300);
 * useEffect(() => { search(debounced); }, [debounced]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
