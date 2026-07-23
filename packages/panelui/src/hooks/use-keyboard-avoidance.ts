/**
 * useKeyboardAvoidance — keep an element clear of the software keyboard.
 *
 * `KeyboardAvoidingView` shifts or pads an entire subtree by the full keyboard
 * height regardless of where the element actually sits, which over-scrolls
 * short forms and does nothing useful for an element already above the fold.
 * This works from the element's own position instead.
 *
 * Two modes, because "get out of the keyboard's way" and "ride the keyboard"
 * are different jobs:
 *
 * - **`lift`** (default) — for a field sitting in the page's flow. The element
 *   is measured every frame while the keyboard is up and moved by exactly the
 *   current overlap, so it follows the scroll: scroll it clear and the lift
 *   decays to nothing, scroll it back under and the lift returns. Measuring
 *   once and holding the result is what leaves a field hanging out of its own
 *   slot the moment the page moves underneath it.
 * - **`dock`** — for an absolutely-positioned composer, toolbar or search bar
 *   pinned near the bottom edge. There is nothing to measure: the element
 *   simply travels with the keyboard, less whatever bottom inset it is already
 *   sitting above.
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
import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent, type View } from 'react-native';
import {
  measure,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

/** How long a lifted element takes to settle back after it stops being active. */
const SETTLE_DURATION = 200;

/**
 * Movement below this is dropped. The element's measured position already
 * includes the translation applied on the previous frame, so the loop reads
 * its own output — a dead band keeps sub-pixel rounding from making it hum.
 */
const EPSILON = 0.5;

export type KeyboardAvoidanceMode = 'lift' | 'dock';

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
  /**
   * `lift` moves an in-flow element by its overlap with the keyboard and
   * tracks it as the page scrolls. `dock` travels with the keyboard outright,
   * for an element already pinned to the bottom edge.
   */
  mode?: KeyboardAvoidanceMode;
  /** Gap to keep between the element's bottom edge and the keyboard. `lift` only. */
  offset?: number;
  /**
   * How far above the bottom edge the element already sits — usually the safe
   * area inset it is offset by. Subtracted from the travel, since the keyboard
   * covers that strip too. `dock` only.
   */
  bottomInset?: number;
}

export interface UseKeyboardAvoidanceResult {
  /** Attach to the element that should stay visible. */
  ref: AnimatedRef<View>;
  /** Attach to the same element, so a re-layout at rest cannot leave it offset. */
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
  mode = 'lift',
  offset = 16,
  bottomInset = 0,
}: UseKeyboardAvoidanceOptions = {}): UseKeyboardAvoidanceResult {
  const ref = useAnimatedRef<View>();
  const rawHeight = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  /** The translation currently applied, in pixels. Zero or negative. */
  const translation = useSharedValue(0);

  // `active` is a plain prop and the worklets below cannot read props, so it is
  // mirrored — written in an effect, because touching a shared value during
  // render is a Reanimated strict-mode violation.
  const isActive = useSharedValue(active && enabled);
  useEffect(() => {
    isActive.value = active && enabled;
  }, [active, enabled, isActive]);

  /*
   * The whole of `lift` is this callback, and it runs only while the element is
   * the active one *and* the keyboard is up — see the reaction below.
   *
   * The element is re-measured every frame rather than once, because every
   * interesting thing that moves it happens after the keyboard opens: the page
   * scrolls, a sheet settles, content above it grows. A position captured at
   * the moment of focus is right for exactly one frame, and the element spends
   * the rest of the time holding an offset that belongs to where it used to be.
   *
   * What is measured already includes the translation applied on the previous
   * frame, so that is subtracted back out to recover the honest resting edge.
   * Without it the callback would chase its own output down the screen.
   */
  const track = useFrameCallback(() => {
    'worklet';
    const keyboardHeight = Math.abs(rawHeight.value);
    if (keyboardHeight === 0) return;

    const frame = measure(ref);
    if (!frame || frame.height <= 0) return;

    const restingBottom = frame.pageY + frame.height - translation.value;
    const keyboardTop = screenHeight - keyboardHeight;
    const overlap = restingBottom + offset - keyboardTop;
    const next = overlap > 0 ? -overlap : 0;

    if (Math.abs(next - translation.value) > EPSILON) translation.value = next;
  }, false);

  /*
   * Tracking is switched on the transition rather than left running, so a
   * screen full of fields costs nothing until one of them is being typed into.
   * `setActive` lives on the JS side, hence the hop.
   */
  const [tracking, setTracking] = useState(false);
  useAnimatedReaction(
    () => isActive.value && Math.abs(rawHeight.value) > 0,
    (shouldTrack, wasTracking) => {
      if (shouldTrack === wasTracking) return;
      runOnJS(setTracking)(shouldTrack);

      // Moving straight from one field to another never closes the keyboard,
      // so the field being left has nothing to follow back down — it is sent
      // home explicitly, or it stays hanging where the keyboard left it.
      if (!shouldTrack && translation.value !== 0) {
        translation.value = withTiming(0, { duration: SETTLE_DURATION });
      }
    }
  );

  const { setActive } = track;
  useEffect(() => {
    setActive(tracking && mode === 'lift');
    return () => setActive(false);
  }, [tracking, mode, setActive]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      // A layout pass while the element is at rest means its slot moved for
      // some reason other than the keyboard. Anything left over from the last
      // lift belongs to the old slot.
      if (!tracking && translation.value !== 0) translation.value = 0;
    },
    [tracking, translation]
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (mode === 'dock') {
      if (!isActive.value) return { transform: [{ translateY: 0 }] };
      // Both sources are normalised to a positive height here.
      const keyboardHeight = Math.abs(rawHeight.value);
      const travel = Math.max(keyboardHeight - bottomInset, 0);
      return { transform: [{ translateY: -travel }] };
    }

    return { transform: [{ translateY: translation.value }] };
  });

  return { ref, onLayout, animatedStyle };
}
