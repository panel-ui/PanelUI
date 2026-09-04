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
 *
 * The one exception is which appearance it draws: `colorScheme` is the single
 * theme signal the toolkit accepts, and `NativeHost` is what passes it. Mount
 * every host through that rather than reaching for `Host` directly, or the
 * control resolves its own appearance from the system and stops tracking the
 * app's theme.
 */
import { Platform } from 'react-native';
import type { ComponentType, ReactNode } from 'react';

export { NativeHost, type NativeHostProps } from './native-host';

interface NativeUIModule {
  Host: ComponentType<{
    children?: ReactNode;
    /**
     * Which axes the platform is allowed to size.
     *
     * **It is not a one-off measurement.** An axis given to `matchContents` is
     * given for good: the host writes the platform's measured size straight
     * into the layout every time the platform's geometry changes, and dirties
     * the layout when it does. So a control that lays itself out again under a
     * press drags its box with it, and everything below it moves — which is
     * the defect this spent three attempts on, twice reasoning about the first
     * measurement when the problem was every one after it.
     *
     * The rule that comes out of that: **never hand over an axis whose size
     * you already know.** State it in `style` instead and match only what is
     * genuinely the platform's — a labelled button's width, a toggle's width.
     * An axis left out is never written to, so an explicit size on it is safe.
     *
     * Where nothing can be stated the axis has to stay matched. A picker is
     * the honest example: a menu is a compact button and a wheel is a rotor,
     * and only the platform knows which it drew.
     */
    matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
    /**
     * Which safe areas the host lets the platform inset its content for.
     *
     * Every host here passes `keyboard`, and it is not optional. A host is a
     * hosting controller, and a hosting controller insets its content for the
     * keyboard by default — so a control docked above the keyboard has its
     * content moved *inside* the box React Native gave it, over whatever is
     * above it, while React Native's own layout says nothing has moved. That
     * is a composer whose buttons sit on its text until the next layout pass
     * puts them back.
     *
     * React Native owns the layout of everything in this library, so a
     * platform that moves content inside a box we positioned is never right.
     * `keyboard` and not `all`: the notch and the home indicator are the
     * platform's business and stay its business.
     */
    ignoreSafeArea?: 'all' | 'container' | 'keyboard';
    /**
     * The appearance the platform draws the hosted control in.
     *
     * Passed by `NativeHost` from the app's own theme, because the host would
     * otherwise resolve it from the system — which is a different question,
     * and one whose answer does not change when the theme does.
     */
    colorScheme?: 'light' | 'dark';
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
  /**
   * `style` here is not a React Native style — it is the small portable subset
   * (`width`, `height`, padding, `backgroundColor`, `borderRadius`, `opacity`)
   * that the toolkit compiles into real SwiftUI and Compose modifiers. It is
   * how a control is given a definite size without the host having to guess.
   */
  Button: ComponentType<Record<string, unknown>>;
  Switch: ComponentType<Record<string, unknown>>;
  Slider: ComponentType<Record<string, unknown>>;
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

/**
 * The SwiftUI view modifiers, for the handful of things the portable props
 * cannot express.
 *
 * The universal components cover the common ground — a variant, a size, an
 * enabled flag — but the platform has looks with no cross-platform equivalent,
 * and Liquid Glass is the one that matters: it is the material iOS 26 draws its
 * own floating controls in, and nothing in the portable API asks for it. A
 * modifier is how SwiftUI is configured, so this is the door to it.
 *
 * iOS only, and lazily resolved like everything else here. Android's toolkit
 * has its own modifier system and no equivalent material, so asking for glass
 * there is not a downgrade — it is a different question.
 */
interface SwiftUIModifiers {
  buttonStyle: (
    style:
      | 'automatic'
      | 'bordered'
      | 'borderedProminent'
      | 'borderless'
      | 'glass'
      | 'glassProminent'
      | 'plain'
  ) => unknown;
  buttonBorderShape: (
    shape: 'automatic' | 'capsule' | 'roundedRectangle' | 'circle',
    cornerRadius?: number
  ) => unknown;
  controlSize: (size: 'mini' | 'small' | 'regular' | 'large' | 'extraLarge') => unknown;
  /**
   * Paints a sheet's own surface, rather than a background behind its content.
   *
   * It is the only way out of the material a sheet is drawn in by default, and
   * it reaches what an ordinary background cannot: the grabber's strip at the
   * top and the safe-area inset at the bottom, which belong to the sheet's
   * chrome and not to anything hosted inside it.
   *
   * **iOS 16.4 and up.** Below that it is inert and the sheet keeps its
   * material — the same shape as glass being inert below iOS 26, and the same
   * trap: indistinguishable from the prop not working. Check the OS before
   * changing any code on a report of "the colour did nothing".
   */
  presentationBackground: (color: string) => unknown;
  /**
   * Greys a control out and stops it answering.
   *
   * Optional because the module is cast whole rather than feature-checked, and
   * an older `@expo/ui` without it would otherwise be a crash instead of a
   * menu row that is merely still tappable. Call it through a guard.
   */
  disabled?: (disabled: boolean) => unknown;
  /**
   * Fires when the view is put on screen, and when it is taken off again.
   *
   * The way to find out that a menu has opened. SwiftUI builds a menu's
   * content only once it is presented, so an item inside one appears exactly
   * when the menu does — which is the only signal the control gives, since it
   * owns its open state and reports nothing about it.
   *
   * Optional for the same reason as `disabled`: the module is cast whole, and
   * a version without these should lose the backdrop rather than crash.
   */
  onAppear?: (handler: () => void) => unknown;
  onDisappear?: (handler: () => void) => unknown;
}

/**
 * The SwiftUI-only components, for the ones the universal set does not carry.
 *
 * `@expo/ui` exports a portable component for everything both toolkits agree
 * on, and that is what `getNativeUI` reaches. A popover is not on that list:
 * SwiftUI has one that anchors to a view and adapts itself on a compact
 * screen, and Compose's nearest relative is a dropdown menu, which is a
 * different control with different rules. Rather than pretend the two are one
 * thing, the iOS one is reached here and Android keeps the styled panel.
 */
interface SwiftUIComponents {
  Host: ComponentType<{
    children?: ReactNode;
    matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
    ignoreSafeArea?: 'all' | 'container' | 'keyboard';
    /** As on the portable host above — see `NativeHost`. */
    colorScheme?: 'light' | 'dark';
    style?: unknown;
  }>;
  RNHostView: ComponentType<{ children?: ReactNode; matchContents?: boolean }>;
  Popover: ComponentType<{
    children?: ReactNode;
    isPresented?: boolean;
    onIsPresentedChange?: (isPresented: boolean) => void;
    attachmentAnchor?: 'leading' | 'trailing' | 'center' | 'top' | 'bottom';
    arrowEdge?: 'leading' | 'trailing' | 'top' | 'bottom' | 'none';
  }> & {
    Trigger: ComponentType<{ children?: ReactNode }>;
    Content: ComponentType<{ children?: ReactNode }>;
  };
}

let swiftUIResolved = false;
let swiftUI: SwiftUIComponents | null = null;

export function getSwiftUI(): SwiftUIComponents | null {
  if (swiftUIResolved) return swiftUI;
  swiftUIResolved = true;

  if (Platform.OS !== 'ios') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@expo/ui/swift-ui') as Partial<SwiftUIComponents>;
    // A version without the popover is not an error; it is a fallback to the
    // styled panel, which is what every missing native path here does.
    swiftUI =
      module.Host && module.RNHostView && module.Popover
        ? (module as SwiftUIComponents)
        : null;
  } catch {
    swiftUI = null;
  }

  return swiftUI;
}

/**
 * A hosting boundary, as both toolkits declare it. The same three props matter
 * on either side — see `NativeUIModule.Host` above for what each one costs.
 */
type NativeHostComponent = ComponentType<{
  children?: ReactNode;
  matchContents?: boolean | { vertical?: boolean; horizontal?: boolean };
  ignoreSafeArea?: 'all' | 'container' | 'keyboard';
  colorScheme?: 'light' | 'dark';
  style?: unknown;
}>;

type RNHostComponent = ComponentType<{
  children?: ReactNode;
  matchContents?: boolean;
  style?: unknown;
}>;

/**
 * SwiftUI's menu, and the button that fills a row of it.
 *
 * Separate from `getSwiftUI` on purpose: that resolver refuses a module with no
 * popover in it, and a version that ships one control but not the other would
 * take the menu down with it. Each native path asks only for what it needs.
 */
interface SwiftUIMenuComponents {
  Host: NativeHostComponent;
  RNHostView: RNHostComponent;
  /**
   * `label` takes a React element as well as a string — the element is passed
   * through a native slot and becomes the thing you press. That is what lets
   * the trigger stay a real Fab rather than a platform button wearing its name.
   */
  Menu: ComponentType<{
    label?: ReactNode;
    children?: ReactNode;
    modifiers?: unknown[];
  }>;
  Button: ComponentType<{
    label?: string;
    systemImage?: string;
    role?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
    modifiers?: unknown[];
  }>;
}

let swiftUIMenuResolved = false;
let swiftUIMenu: SwiftUIMenuComponents | null = null;

export function getSwiftUIMenu(): SwiftUIMenuComponents | null {
  if (swiftUIMenuResolved) return swiftUIMenu;
  swiftUIMenuResolved = true;

  if (Platform.OS !== 'ios') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@expo/ui/swift-ui') as Partial<SwiftUIMenuComponents>;
    swiftUIMenu =
      module.Host && module.RNHostView && module.Menu && module.Button
        ? (module as SwiftUIMenuComponents)
        : null;
  } catch {
    swiftUIMenu = null;
  }

  return swiftUIMenu;
}

/**
 * Compose's dropdown menu — the same instruction, answered by a different
 * control.
 *
 * It is not the shape SwiftUI's menu is. This one is controlled: it takes the
 * open state rather than owning it, and it splits the trigger and the items
 * into named slots instead of reading the label off a prop. Both differences
 * reach the caller, so they are written out here rather than smoothed over.
 */
interface ComposeMenuComponents {
  Host: NativeHostComponent;
  RNHostView: RNHostComponent;
  Text: ComponentType<{ children?: ReactNode; color?: string }>;
  DropdownMenu: ComponentType<{
    children?: ReactNode;
    expanded?: boolean;
    onDismissRequest?: () => void;
  }> & {
    Trigger: ComponentType<{ children?: ReactNode }>;
    Items: ComponentType<{ children?: ReactNode }>;
  };
  DropdownMenuItem: ComponentType<{
    children?: ReactNode;
    enabled?: boolean;
    onClick?: () => void;
    elementColors?: { textColor?: string; disabledTextColor?: string };
  }> & {
    Text: ComponentType<{ children?: ReactNode }>;
    LeadingIcon: ComponentType<{ children?: ReactNode }>;
  };
}

let composeMenuResolved = false;
let composeMenu: ComposeMenuComponents | null = null;

export function getComposeMenu(): ComposeMenuComponents | null {
  if (composeMenuResolved) return composeMenu;
  composeMenuResolved = true;

  if (Platform.OS !== 'android') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@expo/ui/jetpack-compose') as Partial<ComposeMenuComponents>;
    composeMenu =
      module.Host && module.RNHostView && module.DropdownMenu && module.DropdownMenuItem
        ? (module as ComposeMenuComponents)
        : null;
  } catch {
    composeMenu = null;
  }

  return composeMenu;
}

let modifiersResolved = false;
let modifiers: SwiftUIModifiers | null = null;

export function getSwiftUIModifiers(): SwiftUIModifiers | null {
  if (modifiersResolved) return modifiers;
  modifiersResolved = true;

  if (Platform.OS !== 'ios') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modifiers = require('@expo/ui/swift-ui/modifiers') as SwiftUIModifiers;
  } catch {
    modifiers = null;
  }

  return modifiers;
}

/**
 * The Compose view modifiers — the other half of the same door.
 *
 * Android's toolkit has its own modifier system and its own vocabulary, so a
 * modifier built for one platform is not a modifier the other can read. Where
 * both are asked the same question the answers are written separately, here and
 * above, rather than one being sent to both.
 */
interface ComposeModifiers {
  background: (color: string) => unknown;
}

let composeResolved = false;
let compose: ComposeModifiers | null = null;

export function getComposeModifiers(): ComposeModifiers | null {
  if (composeResolved) return compose;
  composeResolved = true;

  if (Platform.OS !== 'android') return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    compose = require('@expo/ui/jetpack-compose/modifiers') as ComposeModifiers;
  } catch {
    compose = null;
  }

  return compose;
}
