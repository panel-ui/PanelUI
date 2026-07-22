import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Springs the thumb onto its resting step after a drag or a track tap. Drags
 * themselves are followed 1:1 with no spring, so the knob stays under the
 * finger; the spring only settles the final snap.
 */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const;
/** Grab radius around the thumb — the knob is small, the target should not be. */
const HIT_SLOP = 16;

const sliderVariants = tv({
  slots: {
    root: 'w-full justify-center',
    track: 'w-full justify-center overflow-hidden rounded-full',
    fill: 'absolute left-0 h-full rounded-full',
    thumb: 'absolute left-0 rounded-full border-2 border-background bg-primary shadow-sm',
  },
  variants: {
    color: {
      primary: { fill: 'bg-primary', thumb: 'bg-primary' },
      success: { fill: 'bg-success', thumb: 'bg-success' },
      warning: { fill: 'bg-warning', thumb: 'bg-warning' },
      destructive: { fill: 'bg-destructive', thumb: 'bg-destructive' },
      info: { fill: 'bg-info', thumb: 'bg-info' },
    },
    size: {
      sm: { root: 'h-4', track: 'h-1', thumb: 'h-4 w-4' },
      md: { root: 'h-5', track: 'h-1.5', thumb: 'h-5 w-5' },
      lg: { root: 'h-6', track: 'h-2', thumb: 'h-6 w-6' },
    },
    disabled: {
      true: { root: 'opacity-50' },
    },
  },
  defaultVariants: {
    color: 'primary',
    size: 'md',
  },
});

/** Track tint is the fill colour at low alpha, mirroring Progress. */
const TRACK_TINT: Record<string, string> = {
  primary: 'bg-primary/16',
  success: 'bg-success/16',
  warning: 'bg-warning/16',
  destructive: 'bg-destructive/16',
  info: 'bg-info/16',
};

const THUMB_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 16, md: 20, lg: 24 };

type SliderVariantProps = VariantProps<typeof sliderVariants>;

export interface SliderProps
  extends Omit<SliderVariantProps, 'disabled'> {
  className?: string;
  /** Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: number;
  /** Starting value when uncontrolled. */
  defaultValue?: number;
  /** Lower bound. */
  min?: number;
  /** Upper bound. */
  max?: number;
  /** Snap granularity. The value is always a multiple of `step` from `min`. */
  step?: number;
  /** Fires on every change while dragging — cheap updates only. */
  onValueChange?: (value: number) => void;
  /** Fires once when the gesture ends — the place for expensive side effects. */
  onValueCommit?: (value: number) => void;
  disabled?: boolean;
  /** Extra classes for the unfilled track. */
  trackClassName?: string;
  /** Extra classes for the filled portion. */
  fillClassName?: string;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
}

function clampJS(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number, min: number, max: number, step: number) {
  if (step <= 0) return clampJS(value, min, max);
  const stepped = Math.round((value - min) / step) * step + min;
  return clampJS(stepped, min, max);
}

/**
 * A value picker driven by a single thumb. The thumb position and the fill
 * width are animated on the UI thread — dragging never round-trips through
 * React — and the picked value bridges back to JS on change and on release.
 *
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
export const Slider = forwardRef<View, SliderProps>(
  (
    {
      className,
      trackClassName,
      fillClassName,
      thumbClassName,
      value: valueProp,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      onValueCommit,
      disabled = false,
      color = 'primary',
      size = 'md',
    },
    ref
  ) => {
    const isControlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const value = clampJS(isControlled ? valueProp! : internal, min, max);

    const slots = sliderVariants({ color, size, disabled });
    const thumbSize = THUMB_SIZE[size ?? 'md'];

    // Measured on layout; the thumb travels across (trackWidth - thumbSize) so
    // its centre stays inside the track at both ends.
    const trackWidth = useSharedValue(0);
    // Fraction 0..1 that drives the fill and the thumb, animated on the UI thread.
    const progress = useSharedValue(
      max > min ? (value - min) / (max - min) : 0
    );
    const startProgress = useSharedValue(0);

    // The change handler runs on JS; keep the latest props reachable from the
    // worklet callback without re-creating the gesture on every render.
    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommit);
    commitRef.current = onValueCommit;

    const emitChange = useCallback(
      (next: number) => {
        if (!isControlled) setInternal(next);
        changeRef.current?.(next);
      },
      [isControlled]
    );
    const emitCommit = useCallback((next: number) => {
      commitRef.current?.(next);
    }, []);

    // Keep the animation in step with a controlled value that changes elsewhere.
    useEffect(() => {
      const next = max > min ? (value - min) / (max - min) : 0;
      progress.value = withSpring(next, SPRING);
    }, [value, min, max, progress]);

    const onLayout = (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    };

    const commitFromProgress = useCallback(
      (p: number, commit: boolean) => {
        const raw = min + p * (max - min);
        const snapped = snap(raw, min, max, step);
        emitChange(snapped);
        if (commit) emitCommit(snapped);
      },
      [min, max, step, emitChange, emitCommit]
    );

    const pan = Gesture.Pan()
      .enabled(!disabled)
      .hitSlop(HIT_SLOP)
      .onBegin(() => {
        startProgress.value = progress.value;
      })
      .onUpdate((event) => {
        const travel = Math.max(trackWidth.value - thumbSize, 1);
        const delta = event.translationX / travel;
        const next = Math.min(Math.max(startProgress.value + delta, 0), 1);
        progress.value = next;
        runOnJS(commitFromProgress)(next, false);
      })
      .onFinalize(() => {
        runOnJS(commitFromProgress)(progress.value, true);
      });

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDuration(250)
      .onEnd((event) => {
        const travel = Math.max(trackWidth.value - thumbSize, 1);
        const next = Math.min(
          Math.max((event.x - thumbSize / 2) / travel, 0),
          1
        );
        progress.value = withSpring(next, SPRING);
        runOnJS(commitFromProgress)(next, true);
      });

    const gesture = Gesture.Race(pan, tap);

    const fillStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbSize, 0);
      return { width: progress.value * travel + thumbSize / 2 };
    });

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbSize, 0);
      return { transform: [{ translateX: progress.value * travel }] };
    });

    // VoiceOver / TalkBack increment and decrement move by a single step.
    const nudge = (dir: 1 | -1) => {
      const next = snap(value + dir * (step || 1), min, max, step);
      if (next === value) return;
      progress.value = withSpring(
        max > min ? (next - min) / (max - min) : 0,
        SPRING
      );
      emitChange(next);
      emitCommit(next);
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') nudge(1);
      else if (event.nativeEvent.actionName === 'decrement') nudge(-1);
    };

    return (
      <View
        ref={ref}
        className={slots.root({ className })}
        collapsable={false}
      >
        <GestureDetector gesture={gesture}>
          <View
            className={`${slots.track()} ${TRACK_TINT[color ?? 'primary']} ${trackClassName ?? ''}`}
            onLayout={onLayout}
          >
            <Animated.View
              style={fillStyle}
              className={slots.fill({ className: fillClassName })}
            />
            <Animated.View
              style={[thumbStyle, { width: thumbSize, height: thumbSize }]}
              className={slots.thumb({ className: thumbClassName })}
              accessible
              accessibilityRole="adjustable"
              accessibilityState={{ disabled }}
              accessibilityValue={{
                min,
                max,
                now: Math.round(value),
                text: String(value),
              }}
              accessibilityActions={[
                { name: 'increment' },
                { name: 'decrement' },
              ]}
              onAccessibilityAction={onAccessibilityAction}
            />
          </View>
        </GestureDetector>
      </View>
    );
  }
);

Slider.displayName = 'Slider';
