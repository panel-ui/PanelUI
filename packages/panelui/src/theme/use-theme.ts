import { Uniwind, useUniwind } from 'uniwind';

export type ThemeName = 'light' | 'dark' | 'system';

/**
 * Reactive access to the current Uniwind theme plus a setter.
 * Theme changes are applied natively by Uniwind without re-rendering the tree.
 */
export function useTheme() {
  const { theme } = useUniwind();

  return {
    /** Currently resolved theme ('light' or 'dark'). */
    theme,
    /** Switch theme: 'light', 'dark', or 'system' (follows device). */
    setTheme: (name: ThemeName) => Uniwind.setTheme(name),
  };
}
