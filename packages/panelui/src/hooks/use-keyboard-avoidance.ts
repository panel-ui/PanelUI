/**
 * useKeyboardAvoidance — lift an element just clear of the software keyboard.
 *
 * `KeyboardAvoidingView` shifts or pads an entire subtree by the full keyboard
 * height regardless of where the element actually sits, which over-scrolls
 * short forms and does nothing useful for an element already above the fold.
 * This measures the element and moves it by exactly the overlap — and not at
 * all when there is none.
 *
 * ## Install the keyboard controller
 *
 * ```sh
 * npx expo install react-native-keyboard-controller
 * ```
 *
 * It is an optional peer, but on Android it is close to required. Reanimated's
 * own `useAnimatedKeyboard` — the fallback used when the controller is absent —
 * is deprecated in Reanimated 4, and merely *calling* it switches Android out
 * of `adjustResize` into manual inset handling for the whole app. That is a
 * global side effect from a local hook, and it is why keyboard avoidance built
 * on it tends to work on iOS and break on Android.
 *
 * With the controller installed, wrap your app in its `KeyboardProvider` —
 * `PanelUIProvider` does this for you when the package is present.
 *
 * ```tsx
 * const { ref, onLayout, animatedStyle } = useKeyboardAvoidance();
 *
 * <Animated.View ref={ref} onLayout={onLayout} style={animatedStyle}>
 *   <TextInput />
 * </Animated.View>
 * ```
 */
import { useCallback } from 'react';
import { useWindowDimensions, type LayoutChangeEvent, type View } from 'react-native';
import {
  useAnimatedKeyboard,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

export interface UseKeyboardAvoidanceOptions {
  /** Set false to leave the element where it is. */
  enabled?: boolean;
  /** Gap to keep between the element's bottom edge and the keyboard. */
  offset?: number;
}

export interface UseKeyboardAvoidanceResult {
  /** Attach to the element that should stay visible. */
  ref: AnimatedRef<View>;
  /** Attach to the same element — it is how the resting position is measured. */
  onLayout: (event: LayoutChangeEvent) => void;
  /** Apply to the same element. */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

type KeyboardHeightHook = () => SharedValue<number>;

/**
 * Resolved once, at module load, so the hook below always calls the same
 * underlying hook — swapping between them per render would break the rules of
 * hooks.
 */
const useKeyboardHeight: KeyboardHeightHook = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const controller = require('react-native-keyboard-controller');
    if (typeof controller?.useReanimatedKeyboardAnimation === 'function') {
      return () => {
        // The controller reports height as a negative offset, matching the
        // translation you would apply. Normalise it to a positive height so
        // the arithmetic below reads the same either way.
        const { height } = controller.useReanimatedKeyboardAnimation();
        return height as SharedValue<number>;
      };
    }
  } catch {
    // Not installed — fall through.
  }

  return () => useAnimatedKeyboard().height;
})();

/** True when the keyboard controller is driving this, rather than the fallback. */
export function hasKeyboardController(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return typeof require('react-native-keyboard-controller')
      ?.useReanimatedKeyboardAnimation === 'function';
  } catch {
    return false;
  }
}

export function useKeyboardAvoidance({
  enabled = true,
  offset = 16,
}: UseKeyboardAvoidanceOptions = {}): UseKeyboardAvoidanceResult {
  const ref = useAnimatedRef<View>();
  const rawHeight = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  /** Window-space bottom edge of the element with no translation applied. */
  const restingBottom = useSharedValue(0);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (height > 0) restingBottom.value = y + height;
    });
  }, [ref, restingBottom]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      // measureInWindow is only meaningful once the view is attached and
      // positioned, which is a frame later than onLayout on both platforms.
      requestAnimationFrame(measure);
    },
    [measure]
  );

  const animatedStyle = useAnimatedStyle(() => {
    // Both sources are normalised to a positive height here.
    const keyboardHeight = Math.abs(rawHeight.value);

    if (!enabled || keyboardHeight === 0 || restingBottom.value === 0) {
      return { transform: [{ translateY: 0 }] };
    }

    const keyboardTop = screenHeight - keyboardHeight;
    const overlap = restingBottom.value + offset - keyboardTop;

    return { transform: [{ translateY: overlap > 0 ? -overlap : 0 }] };
  });

  return { ref, onLayout, animatedStyle };
}
