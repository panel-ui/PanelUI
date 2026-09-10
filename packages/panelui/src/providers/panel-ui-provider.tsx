import { type ComponentType, type ReactNode } from 'react';
import { Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  PortalHost,
  PortalProvider,
  useModalIsolationActive,
} from '../primitives/portal';
import { ToastViewport } from '../components/toast';
import { cn } from '../utils/cn';

/**
 * `react-native-keyboard-controller` needs its provider at the root, and
 * forgetting it is a silent failure — the hooks return zeroes and keyboard
 * avoidance simply does nothing. Mount it here when the package is installed
 * so `avoidKeyboard` works without any extra setup, and fall back to a
 * pass-through when it is not.
 *
 * Installed is not the same question as usable, and the difference is what a
 * `try`/`catch` around the `require` cannot see. In a client that loads no
 * native modules of its own — Expo Go — the JavaScript is in `node_modules`
 * and resolves, so the require succeeds and hands back a provider whose native
 * side is absent. The throw then lands when that provider mounts, outside the
 * `try`, and takes the app down before anything has painted.
 *
 * `TurboModuleRegistry.get` answers the real question and returns null rather
 * than throwing, so the pass-through is reached instead.
 *
 * Resolved on the first render rather than when this module is evaluated. This
 * file is the first thing a consuming app imports, and asking the native module
 * registry a question before the runtime has finished standing up is a question
 * asked too early — by the first render it is up, and the answer cannot change
 * afterwards. The result is cached so the component type is stable: swapping it
 * between renders would unmount and rebuild everything below it.
 */
interface KeyboardHostProps {
  children?: ReactNode;
  statusBarTranslucent?: boolean;
  navigationBarTranslucent?: boolean;
}

/**
 * The pass-through, which has to be a component rather than `Fragment`.
 *
 * `Fragment` accepts `key` and `children` and warns about anything else, so
 * once the window flags below are forwarded it would warn in every project
 * that does not have the controller installed — which is the one case the
 * pass-through exists to keep quiet.
 */
function KeyboardPassthrough({ children }: KeyboardHostProps) {
  return <>{children}</>;
}

let keyboardProvider: ComponentType<KeyboardHostProps> | undefined;

function resolveKeyboardProvider(): ComponentType<KeyboardHostProps> {
  if (keyboardProvider) return keyboardProvider;

  let resolved: ComponentType<KeyboardHostProps> = KeyboardPassthrough;
  try {
    if (TurboModuleRegistry.get('KeyboardController') !== null) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const controller = require('react-native-keyboard-controller');
      resolved = controller?.KeyboardProvider ?? KeyboardPassthrough;
    }
  } catch {
    // Not installed, or installed without its native half. Either way the
    // pass-through is the answer.
  }

  keyboardProvider = resolved;
  return resolved;
}

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
  /**
   * Tell the keyboard controller that the Android status bar is translucent,
   * so it measures the keyboard against the right window inset.
   *
   * Reach for it only where the app draws under the status bar without being
   * edge-to-edge. Under edge-to-edge — the default from Expo SDK 54 — the
   * controller detects that for itself and this is ignored, so leave it unset
   * there rather than passing `false`: a value it has to ignore is a warning
   * in development.
   *
   * Android only, and inert without `react-native-keyboard-controller`.
   */
  statusBarTranslucent?: boolean;
  /**
   * The same, for a translucent Android navigation bar.
   *
   * Android only, and inert without `react-native-keyboard-controller`.
   */
  navigationBarTranslucent?: boolean;
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
  statusBarTranslucent,
  navigationBarTranslucent,
}: PanelUIProviderProps) {
  // Resolved once, on the first render of the first provider in the app, and
  // cached from there. See {@link resolveKeyboardProvider}.
  const KeyboardProvider = resolveKeyboardProvider();

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Outermost of ours, so every field below it can avoid the keyboard.
          A pass-through when the controller is not installed. */}
      {/* Passed through rather than defaulted: the controller warns about a
          value it has to ignore, and under edge-to-edge it ignores both. */}
      <KeyboardProvider
        statusBarTranslucent={statusBarTranslucent}
        navigationBarTranslucent={navigationBarTranslucent}
      >
        <PortalProvider>
          <ProviderSurface
            background={background}
            className={className}
          >
            {children}
          </ProviderSurface>
        </PortalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function ProviderSurface({
  children,
  className,
  background,
}: Required<Pick<PanelUIProviderProps, 'children' | 'background'>> &
  Pick<PanelUIProviderProps, 'className'>) {
  const modalActive = useModalIsolationActive();
  const isolateApp = Platform.OS === 'android' && modalActive;

  return (
    <View className={cn('flex-1', background && 'bg-background', className)}>
      {/* This wrapper is the app accessibility boundary. PortalHost stays its
          sibling, so hiding the background can never hide the active modal. */}
      <View
        collapsable={false}
        style={styles.content}
        importantForAccessibility={isolateApp ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      {/* Sits before PortalHost so it can portal into it. */}
      <ToastViewport />
      <PortalHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
