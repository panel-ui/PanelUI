/**
 * useRevealProgress — how far an element has travelled through the viewport.
 *
 * The number every scroll-driven effect is really made of: `0` before the
 * element has arrived, `1` once it has passed, and a smooth scrub between the
 * two. What an effect *does* with it — recolour, fade, zoom, step through
 * frames — is the only part that differs.
 *
 * The window is set the way a scroll-trigger's is: `start` and `end` are
 * positions down the viewport, as fractions of its height. Progress is `0`
 * while the element's **top** is still below `start`, and reaches `1` when its
 * **bottom** passes `end` — so a tall block scrubs across its own height rather
 * than snapping the moment its first line appears.
 *
 * ```tsx
 * const { ref, progress } = useRevealProgress({ start: 0.9, end: 0.5 });
 *
 * <Animated.View ref={ref} style={useAnimatedStyle(() => ({
 *   opacity: progress.value,
 * }))} />
 * ```
 *
 * The element is measured on the UI thread whenever the scroll position
 * changes — not every frame, and not once at layout. Once is wrong the moment
 * anything above it resizes; every frame is a measurement pass for a value that
 * only changes when the scroller moves.
 */
import { useCallback, useEffect } from 'react';
import { useWindowDimensions, type View } from 'react-native';
import {
  measure,
  useAnimatedRef,
  useDerivedValue,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { useScrollProgress } from '../primitives/scroll-progress';
import type { ViewRef } from '../primitives/refs';

export interface UseRevealProgressOptions {
  /**
   * Where down the viewport the element's top sits when progress is `0`, as a
   * fraction of the viewport height. `0.9` starts it just before it appears.
   */
  start?: number;
  /**
   * Where down the viewport the element's bottom sits when progress reaches
   * `1`. Smaller values mean a longer scrub.
   */
  end?: number;
  /**
   * Drive the effect from a value of your own instead of from the scroll
   * position. Anything passed here is used as-is and nothing is measured.
   */
  progress?: SharedValue<number>;
  /** Set false to hold progress at `1`, as though the element had passed. */
  enabled?: boolean;
}

export interface UseRevealProgressResult {
  /** Attach to the element whose travel drives the effect. */
  ref: AnimatedRef<ViewRef>;
  /**
   * Attach to the same element. It is what says the element can be measured —
   * without it the effect still works, at the cost of a warning per frame for
   * every element that is mounted but not yet laid out.
   */
  onLayout: () => void;
  /** `0` before, `1` after, scrubbed between. */
  progress: SharedValue<number>;
}

export function useRevealProgress({
  start = 0.9,
  end = 0.5,
  progress: external,
  enabled = true,
}: UseRevealProgressOptions = {}): UseRevealProgressResult {
  const ref = useAnimatedRef<ViewRef>();
  const scroll = useScrollProgress();
  const { height: windowHeight } = useWindowDimensions();

  /*
   * Whether the element has been laid out at least once and is still mounted.
   *
   * `measure` warns when it is handed a view the layout engine has no metrics
   * for, and the warning is printed before the `null` that would let a caller
   * notice. A list of these runs its measurement on every scroll frame, so one
   * element that has mounted but not laid out fills the log on its own — which
   * is the case the warning itself names, and the one it is least useful for.
   */
  const laidOut = useSharedValue(false);
  const onLayout = useCallback(() => {
    laidOut.value = true;
  }, [laidOut]);
  useEffect(
    () => () => {
      laidOut.value = false;
    },
    [laidOut]
  );

  const offset = scroll?.offset;
  const viewportValue = scroll?.viewport;
  const topValue = scroll?.top;

  const derived = useDerivedValue(() => {
    if (!enabled) return 1;

    // Read so the scroll position is a real dependency of this value. The
    // element's own position is not observable, and the scroller moving
    // underneath it is the only thing that changes it while it is on screen.
    const scrolled = offset ? offset.value : 0;
    const viewport = viewportValue?.value || windowHeight;
    const viewportTop = topValue?.value ?? 0;
    if (viewport <= 0 || Number.isNaN(scrolled)) return 0;
    if (!laidOut.value) return 0;

    const frame = measure(ref);
    if (!frame || frame.height <= 0) return 0;

    const top = frame.pageY - viewportTop;
    const from = start * viewport;
    const to = end * viewport - frame.height;
    const span = from - to;
    if (span <= 0) return top <= to ? 1 : 0;

    const value = (from - top) / span;
    return value < 0 ? 0 : value > 1 ? 1 : value;
  });

  // An external value is passed straight through, so a caller driving the
  // effect by hand never pays for the measurement.
  return { ref, onLayout, progress: external ?? derived };
}
