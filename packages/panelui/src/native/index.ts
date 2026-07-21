/**
 * Optional bridge to the platform's own UI toolkit.
 *
 * A handful of controls are better served by the real thing than by a faithful
 * re-implementation: a switch, a picker, a sheet and a button are muscle
 * memory, and users notice when the animation curve or the haptic is a
 * near-miss. Passing `native` to those components hands rendering to SwiftUI
 * on iOS and Jetpack Compose on Android.
 *
 * It is optional on purpose. The package is resolved lazily and every caller
 * falls back to the styled implementation when it is missing, so nobody who
 * never writes `native` has to install anything.
 *
 * ```sh
 * npx expo install @expo/ui
 * ```
 *
 * **Theme tokens do not apply in native mode.** The platform draws the control
 * with its own colours, metrics and typography — that is the entire point, and
 * it means `className` and the variant props are ignored on those components.
 */
import { Platform } from 'react-native';
import type { ComponentType, ReactNode } from 'react';

interface NativeUIModule {
  Host: ComponentType<{
    children?: ReactNode;
    matchContents?: boolean;
    style?: unknown;
    [key: string]: unknown;
  }>;
  /**
   * Hosts React Native views inside the native tree. Anything of ours that
   * goes inside a native container has to be wrapped in this or the native
   * layout does not measure it — children spill outside their container.
   */
  RNHostView: ComponentType<{
    children?: ReactNode;
    matchContents?: boolean;
    style?: unknown;
  }>;
  Button: ComponentType<Record<string, unknown>>;
  Switch: ComponentType<Record<string, unknown>>;
  Picker: ComponentType<Record<string, unknown>> & {
    Item: ComponentType<Record<string, unknown>>;
  };
  BottomSheet: ComponentType<Record<string, unknown>>;
}

let resolved = false;
let module: NativeUIModule | null = null;

/**
 * The native UI module, or null when it is not installed or the platform has
 * no toolkit behind it. Resolved once and cached — a failed require is not
 * retried on every render.
 */
export function getNativeUI(): NativeUIModule | null {
  if (resolved) return module;
  resolved = true;

  // Web has no SwiftUI and no Compose; @expo/ui renders plain views there,
  // which loses the styling without gaining anything.
  if (Platform.OS === 'web') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('@expo/ui') as NativeUIModule;
  } catch {
    module = null;
  }

  return module;
}

/** Whether `native` will actually render a platform control. */
export function hasNativeUI(): boolean {
  return getNativeUI() !== null;
}
