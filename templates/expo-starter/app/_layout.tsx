// First, and it has to be first: this is what loads the Tailwind pipeline and
// the theme tokens every class name below resolves through.
import '../global.css';

import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { PanelUIProvider, useThemeMode } from 'panelui-native';

/**
 * React Navigation paints its own theme background over every screen and
 * defaults to an opaque light grey, which sits on top of the themed background
 * underneath — so without this the page never follows the theme.
 *
 * Building the navigation theme from the live tokens fixes it for every theme
 * at once: `useCSSVariable` subscribes to theme changes, so this re-runs on
 * each switch, including the named themes that the OS knows nothing about.
 */
function ThemedNavigation() {
  const { mode } = useThemeMode();
  const [background, card, text, border, primary] = useCSSVariable([
    '--color-background',
    '--color-card',
    '--color-foreground',
    '--color-border',
    '--color-primary',
  ]) as (string | undefined)[];

  /*
   * The window itself, which is behind everything React draws and is not
   * something a class name can reach. It matters because this theme is
   * PanelUI's rather than the device's: someone can be in a dark PanelUI theme
   * on a phone set to light, and then every strip the app is not painting —
   * behind the status bar, under the navigation bar, the gap a screen
   * transition opens — stays the light window colour. Telling the window the
   * token is what closes that gap.
   */
  useEffect(() => {
    if (background) void SystemUI.setBackgroundColorAsync(background);
  }, [background]);

  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      ...(background ? { background } : null),
      ...(card ? { card } : null),
      ...(text ? { text } : null),
      ...(border ? { border } : null),
      ...(primary ? { primary, notification: primary } : null),
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Not style="auto": that reads the OS appearance, which is left
          unspecified for the named themes. */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Owns the portal host that dialogs, sheets, menus and toasts render
          into. Overlays mount into it, so it has to be above every screen. */}
      <PanelUIProvider>
        <ThemedNavigation />
      </PanelUIProvider>
    </SafeAreaProvider>
  );
}
