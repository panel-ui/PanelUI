/**
 * Slider — a value picker driven by a single thumb.
 *
 * The thumb is a pill exactly as tall as the track rather than a disc floating
 * over it. That is a deliberate shape choice and it is also the robust one: a
 * knob taller than its track has to escape the track's own bounds to be drawn
 * whole, which puts the visual design at the mercy of a clipping rule. Here the
 * two are the same height, so there is nothing to clip and nothing to escape.
 *
 * Inside the pill sits a smaller knob that shrinks while dragging — the press
 * feedback lives on the part you are looking at, not on the whole control.
 *
 * Position and fill width are animated on the UI thread; dragging never
 * round-trips through React, and the picked value bridges back to JS on change
 * and on release.
 *
 * ```tsx
 * <Slider label="Volume" showValue defaultValue={30} />
 * ```
 *
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
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
import { getNativeUI } from '../../native';
import { Text } from '../../primitives/text';

/**
 * Springs the thumb onto its resting step after a drag or a track tap. Drags
 * themselves are followed 1:1 with no spring, so the knob stays under the
 * finger; the spring only settles the final snap.
 */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const;
/** Settles the knob between its idle and dragging sizes. */
const KNOB_SPRING = { damping: 15, stiffness: 200, mass: 0.5 } as const;
/** How far the knob shrinks while the thumb is held. */
const KNOB_PRESSED_SCALE = 0.86;
/** Grab radius around the thumb — the pill is small, the target should not be. */
const HIT_SLOP = 16;

const sliderVariants = tv({
  slots: {
    root: 'w-full gap-2',
    header: 'w-full flex-row items-center justify-between gap-3',
    label: 'text-sm font-medium text-foreground',
    value: 'text-sm text-muted-foreground',
    // The track is the full height of the control, so the thumb has somewhere
    // to sit rather than somewhere to stick out of.
    track: 'w-full justify-center rounded-full bg-muted',
    fill: 'absolute bottom-0 left-0 top-0 rounded-full',
    thumb: 'absolute left-0 rounded-full p-0.5',
    // `background`, not a per-colour on-token: the status foregrounds are the
    // darker text hues meant for soft fills, so a green-700 knob on a green-500
    // pill would barely show. The page background reads against every fill in
    // both themes.
    knob: 'flex-1 rounded-full bg-background shadow-sm',
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
      sm: { track: 'h-4', thumb: 'h-4' },
      md: { track: 'h-5', thumb: 'h-5' },
      lg: { track: 'h-6', thumb: 'h-6' },
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

/** Thumb width per size. Wider than it is tall, so the pill reads as a grip. */
const THUMB_WIDTH: Record<'sm' | 'md' | 'lg', number> = { sm: 24, md: 28, lg: 32 };

/** Row height reserved for the platform's own slider. */
const NATIVE_HEIGHT = 32;

type SliderVariantProps = VariantProps<typeof sliderVariants>;

export interface SliderProps extends Omit<SliderVariantProps, 'disabled'> {
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
  /**
   * Render the platform's own slider instead of this one. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply** — the platform draws the control, so
   * `color`, `size` and the slot classNames are ignored. `label` and
   * `showValue` still render the caption row above it, since that is ours.
   */
  native?: boolean;
  /** Caption above the track. Also becomes the accessibility label. */
  label?: string;
  /** Show the current value on the caption row, opposite the label. */
  showValue?: boolean;
  /** Format the shown value. Defaults to the rounded number. */
  formatValue?: (value: number) => string;
  /** Extra classes for the caption row. */
  headerClassName?: string;
  /** Extra classes for the unfilled track. */
  trackClassName?: string;
  /** Extra classes for the filled portion. */
  fillClassName?: string;
  /** Extra classes for the draggable thumb. */
  thumbClassName?: string;
  /** Extra classes for the knob inside the thumb. */
  knobClassName?: string;
}

function clampJS(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snap(value: number, min: number, max: number, step: number) {
  if (step <= 0) return clampJS(value, min, max);
  const stepped = Math.round((value - min) / step) * step + min;
  return clampJS(stepped, min, max);
}

export const Slider = forwardRef<View, SliderProps>(
  (
    {
      className,
      headerClassName,
      trackClassName,
      fillClassName,
      thumbClassName,
      knobClassName,
      value: valueProp,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      onValueCommit,
      disabled = false,
      native,
      label,
      showValue = false,
      formatValue,
      color = 'primary',
      size = 'md',
    },
    ref
  ) => {
    const isControlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const value = clampJS(isControlled ? valueProp! : internal, min, max);

    const slots = sliderVariants({ color, size, disabled });
    const thumbWidth = THUMB_WIDTH[size ?? 'md'];
    const nativeUI = native ? getNativeUI() : null;

    // Measured on layout; the thumb travels across (trackWidth - thumbWidth) so
    // it stays inside the track at both ends.
    const trackWidth = useSharedValue(0);
    // Fraction 0..1 that drives the fill and the thumb, animated on the UI thread.
    const progress = useSharedValue(max > min ? (value - min) / (max - min) : 0);
    const startProgress = useSharedValue(0);
    const pressed = useSharedValue(0);

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
        pressed.value = withSpring(1, KNOB_SPRING);
      })
      .onUpdate((event) => {
        const travel = Math.max(trackWidth.value - thumbWidth, 1);
        const delta = event.translationX / travel;
        const next = Math.min(Math.max(startProgress.value + delta, 0), 1);
        progress.value = next;
        runOnJS(commitFromProgress)(next, false);
      })
      .onFinalize(() => {
        pressed.value = withSpring(0, KNOB_SPRING);
        runOnJS(commitFromProgress)(progress.value, true);
      });

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDuration(250)
      .onEnd((event) => {
        const travel = Math.max(trackWidth.value - thumbWidth, 1);
        const next = Math.min(Math.max((event.x - thumbWidth / 2) / travel, 0), 1);
        progress.value = withSpring(next, SPRING);
        runOnJS(commitFromProgress)(next, true);
      });

    const gesture = Gesture.Race(pan, tap);

    // The fill runs under the thumb rather than up to it, so the two never show
    // a seam between them as the thumb moves.
    const fillStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbWidth, 0);
      return { width: progress.value * travel + thumbWidth };
    });

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbWidth, 0);
      return { transform: [{ translateX: progress.value * travel }] };
    });

    const knobStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 - pressed.value * (1 - KNOB_PRESSED_SCALE) }],
    }));

    // VoiceOver / TalkBack increment and decrement move by a single step.
    const nudge = (dir: 1 | -1) => {
      const next = snap(value + dir * (step || 1), min, max, step);
      if (next === value) return;
      progress.value = withSpring(max > min ? (next - min) / (max - min) : 0, SPRING);
      emitChange(next);
      emitCommit(next);
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') nudge(1);
      else if (event.nativeEvent.actionName === 'decrement') nudge(-1);
    };

    const shownValue = formatValue ? formatValue(value) : String(Math.round(value));

    const header =
      label || showValue ? (
        <View className={slots.header({ className: headerClassName })}>
          {label ? <Text className={slots.label()}>{label}</Text> : <View />}
          {showValue ? <Text className={slots.value()}>{shownValue}</Text> : null}
        </View>
      ) : null;

    if (nativeUI) {
      const { Host, Slider: NativeSlider } = nativeUI;
      return (
        <View ref={ref} className={slots.root({ className })}>
          {header}
          {/* Told its height rather than left to measure the platform's own
              content, which arrives a frame late — a host that has to work its
              size out renders at nothing and then jumps. */}
          <Host style={{ height: NATIVE_HEIGHT }}>
            <NativeSlider
              value={value}
              onValueChange={(next: number) => {
                emitChange(snap(next, min, max, step));
              }}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
          </Host>
        </View>
      );
    }

    return (
      <View ref={ref} className={slots.root({ className })} collapsable={false}>
        {header}

        <GestureDetector gesture={gesture}>
          <View
            className={slots.track({ className: trackClassName })}
            onLayout={onLayout}
          >
            <Animated.View
              style={fillStyle}
              className={slots.fill({ className: fillClassName })}
            />
            <Animated.View
              style={[thumbStyle, { width: thumbWidth }]}
              className={slots.thumb({ className: thumbClassName })}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityState={{ disabled }}
              accessibilityValue={{
                min,
                max,
                now: Math.round(value),
                text: shownValue,
              }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={onAccessibilityAction}
            >
              <Animated.View
                style={knobStyle}
                className={slots.knob({ className: knobClassName })}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    );
  }
);

Slider.displayName = 'Slider';
