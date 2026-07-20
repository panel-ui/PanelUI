import { Uniwind, useUniwind } from 'uniwind';

/** Themes shipped in `panelui-native/theme.css`. */
export type PanelTheme =
  | 'light'
  | 'dark'
  | 'moon'
  | 'moon-dark'
  | 'grass'
  | 'grass-dark';

export type ThemeName = PanelTheme | 'system';

/** Light/dark mode within a theme family. */
export type ThemeMode = 'light' | 'dark';

/** A theme family — one look, in its light and dark form. */
export interface PanelThemeFamily {
  /** Stable id, e.g. `'moon'`. */
  id: string;
  /** Short display name, for a theme picker. */
  name: string;
  light: PanelTheme;
  dark: PanelTheme;
  /** Representative colour for a swatch, as `[light, dark]`. */
  swatch: [string, string];
}

/**
 * The theme families PanelUI ships. Each sets its own palette *and* its own
 * radius scale, so switching family changes the shape of the UI as well as
 * its colour — Panel is the Coss default, Moon is sharp and monochrome,
 * Grass is soft and green.
 *
 * Everything beyond `panel` must be registered in your metro config, or
 * `setTheme` throws "it was not registered":
 *
 * ```js
 * withUniwindConfig(config, {
 *   cssEntryFile: './global.css',
 *   extraThemes: ['moon', 'moon-dark', 'grass', 'grass-dark'],
 * });
 * ```
 */
export const PANEL_THEMES: readonly PanelThemeFamily[] = [
  {
    id: 'panel',
    name: 'Panel',
    light: 'light',
    dark: 'dark',
    swatch: ['#262626', '#f5f5f5'],
  },
  {
    id: 'moon',
    name: 'Moon',
    light: 'moon',
    dark: 'moon-dark',
    swatch: ['#0070f3', '#0070f3'],
  },
  {
    id: 'grass',
    name: 'Grass',
    light: 'grass',
    dark: 'grass-dark',
    swatch: ['#24b47e', '#3ecf8e'],
  },
];

/** Every concrete theme name, in registration order. */
export const PANEL_THEME_NAMES: readonly PanelTheme[] = PANEL_THEMES.flatMap(
  (family) => [family.light, family.dark]
);

/** The names to pass as `extraThemes` in your metro config. */
export const PANEL_EXTRA_THEMES: readonly string[] = PANEL_THEME_NAMES.filter(
  (name) => name !== 'light' && name !== 'dark'
);

function findFamily(theme: string): PanelThemeFamily {
  return (
    PANEL_THEMES.find((family) => family.light === theme || family.dark === theme) ??
    PANEL_THEMES[0]!
  );
}

/**
 * Reactive access to the current Uniwind theme plus a setter.
 * Theme changes are applied natively by Uniwind without re-rendering the tree.
 */
export function useTheme() {
  const { theme } = useUniwind();

  return {
    /** The active theme name, e.g. `'dark'` or `'moon-dark'`. */
    theme: theme as PanelTheme,
    /** Switch theme by name, or `'system'` to follow the device. */
    setTheme: (name: ThemeName) => Uniwind.setTheme(name),
  };
}

/**
 * Theme family and light/dark mode as two separate axes — what a picker like
 * "choose a brand, then toggle the sun" actually needs.
 *
 * Named themes are not adaptive in Uniwind, so each brand ships as a
 * light/dark pair. Toggling the mode keeps the current family, so a user in
 * Moon dark lands in Moon light rather than the default theme.
 *
 * ```tsx
 * const { family, mode, setFamily, toggleMode } = useThemeMode();
 * ```
 */
export function useThemeMode() {
  const { theme } = useUniwind();
  const family = findFamily(theme);
  const mode: ThemeMode = theme === family.dark ? 'dark' : 'light';

  return {
    /** The active theme family. */
    family,
    /** `'light'` or `'dark'` within that family. */
    mode,
    /** Switch brand, staying in the current light/dark mode. */
    setFamily: (id: string) => {
      const next = PANEL_THEMES.find((candidate) => candidate.id === id);
      if (next) Uniwind.setTheme(next[mode]);
    },
    /** Set the mode, staying in the current family. */
    setMode: (next: ThemeMode) => Uniwind.setTheme(family[next]),
    /** Flip light ↔ dark within the current family. */
    toggleMode: () => Uniwind.setTheme(mode === 'dark' ? family.light : family.dark),
  };
}
