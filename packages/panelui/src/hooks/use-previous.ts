import { useEffect, useRef } from 'react';

/**
 * The value from the previous render, or `undefined` on the first.
 *
 * Useful for reacting to a transition rather than a state — firing only when
 * something *became* true.
 *
 * ```tsx
 * const wasOpen = usePrevious(isOpen);
 * useEffect(() => {
 *   if (isOpen && !wasOpen) track('sheet_opened');
 * }, [isOpen, wasOpen]);
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
