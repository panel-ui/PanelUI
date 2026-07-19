import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalHost, PortalProvider } from '../primitives/portal';

export interface PanelUIProviderProps {
  children: ReactNode;
}

/**
 * Root provider for PanelUI. Wraps the app with the gesture handler root and
 * the portal host used by overlay components (Dialog, BottomSheet, Select).
 *
 * Theme switching is handled natively by Uniwind — use `Uniwind.setTheme()`
 * or the `useTheme()` hook exported from panelui-native.
 */
export function PanelUIProvider({ children }: PanelUIProviderProps) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <PortalProvider>
        {children}
        <PortalHost />
      </PortalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
