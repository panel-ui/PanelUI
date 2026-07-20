import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCopyToClipboardOptions {
  /** Milliseconds before `copied` flips back. */
  timeout?: number;
  onCopy?: () => void;
}

export interface UseCopyToClipboardResult {
  /** Writes `value` to the clipboard and sets `copied`. */
  copy: (value: string) => Promise<void>;
  copied: boolean;
}

/**
 * Copy text to the clipboard, with a temporary "copied" state.
 *
 * Mirrors coss.com/ui's `useCopyToClipboard`.
 *
 * Requires `expo-clipboard`, which is an optional peer dependency — React
 * Native removed `Clipboard` from core, and pulling in a required native
 * module for one hook would cost every consumer who never calls it:
 *
 * ```sh
 * npx expo install expo-clipboard
 * ```
 *
 * ```tsx
 * const { copy, copied } = useCopyToClipboard();
 * <Button onPress={() => copy(url)}>{copied ? 'Copied' : 'Copy link'}</Button>
 * ```
 */
export function useCopyToClipboard({
  timeout = 2000,
  onCopy,
}: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Never leave a timer running against an unmounted component.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(
    async (value: string) => {
      const setString = await loadClipboard();
      await setString(value);

      setCopied(true);
      onCopy?.();

      if (timer.current) clearTimeout(timer.current);
      if (timeout > 0) {
        timer.current = setTimeout(() => setCopied(false), timeout);
      }
    },
    [timeout, onCopy]
  );

  return { copy, copied };
}

/**
 * Resolves expo-clipboard lazily, so apps that never call this hook are not
 * asked to install it. The import is awaited rather than top-level for the
 * same reason.
 */
async function loadClipboard(): Promise<(value: string) => Promise<unknown>> {
  try {
    const clipboard = await import('expo-clipboard');
    return clipboard.setStringAsync;
  } catch {
    throw new Error(
      'useCopyToClipboard requires expo-clipboard. Install it with: npx expo install expo-clipboard'
    );
  }
}
