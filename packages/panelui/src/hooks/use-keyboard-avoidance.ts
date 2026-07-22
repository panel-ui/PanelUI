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
import { useCallback, useEffect } from 'react';
import { useWindowDimensions, type LayoutChangeEvent, type View } from 'react-native';
import {
  measure,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

export interface UseKeyboardAvoidanceOptions {
  /** Set false to leave the element where it is. */
  enabled?: boolean;
  /**
   * Whether this element is the one that should get out of the keyboard's way.
   *
   * Defaults to true, which suits a composer or a toolbar: it rides the
   * keyboard whatever is focused. A *field* wants the opposite — pass its own
   * focus state, or every field on the screen lifts whenever any one of them
   * is tapped, and they all arrive at the same place on top of each other.
   */
  active?: boolean;
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
  active = true,
  offset = 16,
}: UseKeyboardAvoidanceOptions = {}): UseKeyboardAvoidanceResult {
  const ref = useAnimatedRef<View>();
  const rawHeight = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  /** Window-space bottom edge of the element with no translation applied. */
  const restingBottom = useSharedValue(0);

  // `active` is a plain prop and the reaction below is a worklet, so it is
  // mirrored rather than closed over — written in an effect, because touching
  // a shared value during render is a Reanimated strict-mode violation.
  const isActive = useSharedValue(active && enabled);
  useEffect(() => {
    isActive.value = active && enabled;
  }, [active, enabled, isActive]);

  /*
   * The resting position is taken the moment this element becomes the one that
   * should move, on the UI thread, rather than once at layout time.
   *
   * Measuring at layout is wrong in two ways that both show up as "avoidance
   * does nothing". A field inside an overlay is laid out before the overlay
   * knows where it goes — it is parked off-screen at that point, so the stored
   * position is a large negative number that is nonetheless non-zero, and the
   * arithmetic below happily concludes there is no overlap. And a field that
   * has scrolled since it was laid out is measured where it used to be.
   *
   * Keying off "active and the keyboard is up" rather than off the keyboard
   * alone matters for the second field you tap: moving straight from one field
   * to another never closes the keyboard, so there is no opening to react to,
   * and a hook watching only the keyboard would never measure it.
   *
   * At the instant it becomes active the element has no translation applied,
   * so what is measured then is the honest resting position.
   */
  useAnimatedReaction(
    () => isActive.value && Math.abs(rawHeight.value) > 0,
    (shouldLift, wasLifting) => {
      if (shouldLift === wasLifting) return;

      if (!shouldLift) {
        // Forget it, so the next time round measures wherever the element has
        // got to in the meantime.
        restingBottom.value = 0;
        return;
      }

      const frame = measure(ref);
      if (frame && frame.height > 0 && frame.pageY >= 0) {
        restingBottom.value = frame.pageY + frame.height;
      }
    }
  );

  const seed = useCallback(() => {
    // Skipped only when a position is already known and the keyboard is up —
    // the element is lifted then, and this would store the lifted position as
    // the resting one. With no position yet there is no translation to undo,
    // so measuring is safe whatever the keyboard is doing.
    if (restingBottom.value !== 0 && Math.abs(rawHeight.value) > 0) return;

    ref.current?.measureInWindow((_x, y, _width, height) => {
      if (height > 0 && y >= 0) restingBottom.value = y + height;
    });
  }, [ref, rawHeight, restingBottom]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      // Covers the case the reaction above cannot: a keyboard that is already
      // up when this element mounts, where there is no transition to react to.
      // measureInWindow is only meaningful once the view is attached and
      // positioned, which is a frame later than onLayout on both platforms.
      requestAnimationFrame(seed);
    },
    [seed]
  );

  const animatedStyle = useAnimatedStyle(() => {
    // Both sources are normalised to a positive height here.
    const keyboardHeight = Math.abs(rawHeight.value);

    if (!isActive.value || keyboardHeight === 0 || restingBottom.value === 0) {
      return { transform: [{ translateY: 0 }] };
    }

    const keyboardTop = screenHeight - keyboardHeight;
    const overlap = restingBottom.value + offset - keyboardTop;

    return { transform: [{ translateY: overlap > 0 ? -overlap : 0 }] };
  });

  return { ref, onLayout, animatedStyle };
}
