/**
 * useKeyboardAvoidance — lift an element just clear of the software keyboard.
 *
 * `KeyboardAvoidingView` shifts or pads an entire subtree by the full keyboard
 * height regardless of where the element actually sits, which over-scrolls
 * short forms and does nothing useful for an element already above the fold.
 * This measures the element and moves it by exactly the overlap — and not at
 * all when there is none.
 *
 * The translation is driven by `useAnimatedKeyboard`, so the element tracks
 * the keyboard's own interpolation frame for frame, on the UI thread, with no
 * re-renders while it moves.
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

export function useKeyboardAvoidance({
  enabled = true,
  offset = 16,
}: UseKeyboardAvoidanceOptions = {}): UseKeyboardAvoidanceResult {
  const ref = useAnimatedRef<View>();
  const keyboard = useAnimatedKeyboard();
  const { height: screenHeight } = useWindowDimensions();

  /** Window-space bottom edge of the element with no translation applied. */
  const restingBottom = useSharedValue(0);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      // Measuring while lifted would fold the current translation into the
      // resting position and the element would creep upwards on every layout.
      if (keyboard.height.value !== 0) return;

      ref.current?.measureInWindow((_x, y, _width, height) => {
        restingBottom.value = y + height;
      });
    },
    [keyboard, ref, restingBottom]
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (!enabled || keyboard.height.value === 0 || restingBottom.value === 0) {
      return { transform: [{ translateY: 0 }] };
    }

    const keyboardTop = screenHeight - keyboard.height.value;
    const overlap = restingBottom.value + offset - keyboardTop;

    return { transform: [{ translateY: overlap > 0 ? -overlap : 0 }] };
  });

  return { ref, onLayout, animatedStyle };
}
