import { Fragment, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalHost, PortalProvider } from '../primitives/portal';
import { ToastViewport } from '../components/toast';
import { cn } from '../utils/cn';

/**
 * `react-native-keyboard-controller` needs its provider at the root, and
 * forgetting it is a silent failure — the hooks return zeroes and keyboard
 * avoidance simply does nothing. Mount it here when the package is installed
 * so `avoidKeyboard` works without any extra setup, and fall back to a
 * pass-through when it is not.
 */
const KeyboardProvider: ComponentType<{ children?: ReactNode }> = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const controller = require('react-native-keyboard-controller');
    return controller?.KeyboardProvider ?? Fragment;
  } catch {
    return Fragment;
  }
})();

export interface PanelUIProviderProps {
  children: ReactNode;
  /**
   * Classes for the themed page surface. Defaults to `bg-background`, which
   * follows the active theme. Pass your own to change the page colour.
   */
  className?: string;
  /**
   * Set to false to render without the themed page background — do this only
   * if you paint the app background yourself.
   */
  background?: boolean;
}

/**
 * Root provider for PanelUI. Owns three things:
 * the gesture handler root, the themed page background, and the portal host
 * used by overlay components (Dialog, BottomSheet, Select).
 *
 * The background lives here because native wrappers like SafeAreaView do not
 * accept `className` — putting `bg-background` on one silently does nothing,
 * leaving the page unthemed while its children follow the theme.
 *
 * Theme switching is handled natively by Uniwind — use the `useTheme()` hook
 * exported from panelui-native.
 */
export function PanelUIProvider({
  children,
  className,
  background = true,
}: PanelUIProviderProps) {
  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Outermost of ours, so every field below it can avoid the keyboard.
          A no-op Fragment when the controller is not installed. */}
      <KeyboardProvider>
        <View className={cn('flex-1', background && 'bg-background', className)}>
          <PortalProvider>
            {children}
            {/* Sits before PortalHost so it can portal into it. */}
            <ToastViewport />
            <PortalHost />
          </PortalProvider>
        </View>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
