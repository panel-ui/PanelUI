/**
 * Slider — a value picker driven by a thumb, or a span picked by two.
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
 *
 * <Slider label="Price" showValue defaultRange={[20, 80]} />
 * ```
 *
 * A range is a second pair of props rather than a tuple in the first, so a
 * one-thumb slider's `onValueChange` still hands back a plain number and
 * nobody has to narrow a union to read it.
 *
 * Works controlled (`value`/`range` with their change handlers) or uncontrolled
 * (`defaultValue`/`defaultRange`).
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
import { useDirectionSign } from '../../hooks/use-direction';
import { NativeHost, getNativeUI } from '../../native';
import { Text } from '../../primitives/text';
import { selectionTick } from '../../utils/haptics';
import type { ViewRef } from '../../primitives/refs';

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
    fill: 'absolute bottom-0 start-0 top-0 rounded-full',
    thumb: 'absolute start-0 rounded-full p-0.5',
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

/**
 * The box the platform slider is given, in points.
 *
 * Both platforms draw a slider shorter than this and centre it, so the number
 * is the row's height rather than the control's — and at 44 it is also the
 * smallest a thing you drag is allowed to be.
 */
const NATIVE_SLIDER_HEIGHT = 44;

type SliderVariantProps = VariantProps<typeof sliderVariants>;

export interface SliderProps extends Omit<SliderVariantProps, 'disabled'> {
  className?: string;
  /** Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: number;
  /** Starting value when uncontrolled. */
  defaultValue?: number;
  /**
   * Controlled span, as `[low, high]`. Passing this — or `defaultRange` — gives
   * the slider two thumbs and fills between them instead of from the start.
   */
  range?: [number, number];
  /** Starting span when uncontrolled, as `[low, high]`. */
  defaultRange?: [number, number];
  /** Lower bound. */
  min?: number;
  /** Upper bound. */
  max?: number;
  /** Snap granularity. The value is always a multiple of `step` from `min`. */
  step?: number;
  /**
   * How many steps the two thumbs must stay apart on a range slider. `0` lets
   * them meet; `1` keeps a step between them, so the span is never empty.
   */
  minStepsBetweenThumbs?: number;
  /** Fires on every change while dragging — cheap updates only. */
  onValueChange?: (value: number) => void;
  /** Fires once when the gesture ends — the place for expensive side effects. */
  onValueCommit?: (value: number) => void;
  /** The range equivalent of `onValueChange`. Only fires on a range slider. */
  onRangeChange?: (range: [number, number]) => void;
  /** The range equivalent of `onValueCommit`. Only fires on a range slider. */
  onRangeCommit?: (range: [number, number]) => void;
  disabled?: boolean;
  /**
   * Render the platform's own slider instead of this one. Requires the
   * optional `@expo/ui` package; without it this prop does nothing.
   *
   * **Theme tokens do not apply** — the platform draws the control, so
   * `color`, `size` and the slot classNames are ignored. `label` and
   * `showValue` still render the caption row above it, since that is ours.
   *
   * **Ignored on a range slider.** Neither platform ships a two-thumb slider,
   * so a range draws ours rather than quietly losing a thumb.
   */
  native?: boolean;
  /** Caption above the track. Also becomes the accessibility label. */
  label?: string;
  /** Show the current value on the caption row, opposite the label. */
  showValue?: boolean;
  /** Format the shown value. Defaults to the rounded number. */
  formatValue?: (value: number) => string;
  /**
   * A tick under the finger each time a drag crosses onto a new step, and once
   * more when the drag ends. Off by default — needs the optional `expo-haptics`,
   * and is silent without it.
   */
  haptics?: boolean;
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

/** Which thumb a drag has hold of. A one-thumb slider only ever has `high`. */
type Thumb = 'low' | 'high';

function recordStep(last: Record<Thumb, number>, thumb: Thumb, next: number) {
  if (next === last[thumb]) return false;
  last[thumb] = next;
  return true;
}

export const Slider = forwardRef<ViewRef, SliderProps>(
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
      range: rangeProp,
      defaultRange,
      min = 0,
      max = 100,
      step = 1,
      minStepsBetweenThumbs = 0,
      onValueChange,
      onValueCommit,
      onRangeChange,
      onRangeCommit,
      disabled = false,
      native,
      label,
      showValue = false,
      formatValue,
      haptics = false,
      color = 'primary',
      size = 'md',
    },
    ref
  ) => {
    // Whether there are two thumbs is decided by which props were passed, not
    // by a flag: a slider handed `[20, 80]` is a range and there is nothing
    // else it could be.
    const isRange = rangeProp !== undefined || defaultRange !== undefined;

    const isControlled = valueProp !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const value = clampJS(isControlled ? valueProp! : internal, min, max);

    const isRangeControlled = rangeProp !== undefined;
    const [internalRange, setInternalRange] = useState<[number, number]>(
      defaultRange ?? [min, max]
    );
    const rawRange = isRangeControlled ? rangeProp! : internalRange;
    // Ordered as well as clamped, so a caller who passes `[80, 20]` gets the
    // span they meant rather than a fill of negative width.
    const low = clampJS(Math.min(rawRange[0], rawRange[1]), min, max);
    const high = clampJS(Math.max(rawRange[0], rawRange[1]), min, max);

    const slots = sliderVariants({ color, size, disabled });
    const thumbWidth = THUMB_WIDTH[size ?? 'md'];
    // A platform slider has one thumb, so a range never hands off to it.
    const nativeUI = native && !isRange ? getNativeUI() : null;

    const span = max > min ? max - min : 1;
    const toFraction = useCallback(
      (n: number) => (max > min ? (n - min) / (max - min) : 0),
      [min, max]
    );

    // Measured on layout; the thumb travels across (trackWidth - thumbWidth) so
    // it stays inside the track at both ends.
    // `1` left to right, `-1` right to left. Everything below that is a raw
    // pixel offset rather than a laid-out box multiplies through it.
    const sign = useDirectionSign();
    const trackWidth = useSharedValue(0);
    /*
     * Two fractions rather than one. `high` is the thumb every slider has, and
     * `low` sits at 0 on a one-thumb one — so the fill below reads the same
     * either way: from `low` to `high`, which for a single slider is the start
     * of the track to the thumb.
     */
    const lowProgress = useSharedValue(isRange ? toFraction(low) : 0);
    const highProgress = useSharedValue(isRange ? toFraction(high) : toFraction(value));
    const dragStartLow = useSharedValue(0);
    const dragStartHigh = useSharedValue(0);
    const activeThumb = useSharedValue<Thumb>('high');
    const pressed = useSharedValue(0);
    const pressedLow = useSharedValue(0);

    // The change handler runs on JS; keep the latest props reachable from the
    // worklet callback without re-creating the gesture on every render.
    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommit);
    commitRef.current = onValueCommit;
    const rangeChangeRef = useRef(onRangeChange);
    rangeChangeRef.current = onRangeChange;
    const rangeCommitRef = useRef(onRangeCommit);
    rangeCommitRef.current = onRangeCommit;
    // Each thumb owns its last tick. Sharing one scalar lets the stationary
    // endpoint suppress the thumb under the finger on a range slider.
    const lastTick = useRef<Record<Thumb, number>>({
      low,
      high: isRange ? high : value,
    });
    /*
     * True from the moment a finger lands until it lifts. A controlled parent
     * echoes every change straight back as a new prop, and springing the thumb
     * onto that echo fights the finger — visibly so at a coarse `step`, where
     * each frame would pull the knob back onto the last snapped value while the
     * finger had already moved past it.
     */
    const dragging = useRef(false);

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

    const emitRangeChange = useCallback(
      (next: [number, number]) => {
        if (!isRangeControlled) setInternalRange(next);
        rangeChangeRef.current?.(next);
      },
      [isRangeControlled]
    );

    // Keep the animation in step with a controlled value that changes elsewhere.
    useEffect(() => {
      if (isRange || dragging.current) return;
      highProgress.value = withSpring(toFraction(value), SPRING);
    }, [value, isRange, toFraction, highProgress]);

    useEffect(() => {
      if (!isRange || dragging.current) return;
      lowProgress.value = withSpring(toFraction(low), SPRING);
      highProgress.value = withSpring(toFraction(high), SPRING);
    }, [low, high, isRange, toFraction, lowProgress, highProgress]);

    const onLayout = (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    };

    const commitFromProgress = useCallback(
      (p: number, commit: boolean) => {
        const raw = min + p * span;
        const snapped = snap(raw, min, max, step);
        if (haptics && recordStep(lastTick.current, 'high', snapped)) {
          selectionTick();
        }
        emitChange(snapped);
        if (commit) emitCommit(snapped);
      },
      [min, max, span, step, haptics, emitChange, emitCommit]
    );

    const commitRangeFromProgress = useCallback(
      (pLow: number, pHigh: number, commit: boolean, thumb: Thumb) => {
        const next: [number, number] = [
          snap(min + pLow * span, min, max, step),
          snap(min + pHigh * span, min, max, step),
        ];
        const nextStep = thumb === 'low' ? next[0] : next[1];
        if (haptics && recordStep(lastTick.current, thumb, nextStep)) {
          selectionTick();
        }
        emitRangeChange(next);
        if (commit) rangeCommitRef.current?.(next);
      },
      [min, max, span, step, haptics, emitRangeChange]
    );

    /** The gap the two thumbs must keep, in the same 0..1 fractions as everything else. */
    const gap = minStepsBetweenThumbs > 0 ? (minStepsBetweenThumbs * step) / span : 0;

    const setDragging = useCallback((next: boolean) => {
      dragging.current = next;
    }, []);

    /**
     * Which thumb a touch at `x` should take. A tie goes to whichever thumb the
     * touch is *outside* of: with both stacked at one end, the nearer one may
     * be the one with nowhere to go, and a range that cannot be dragged back
     * off its own end is a broken control.
     */
    const pickThumb = (x: number): Thumb => {
      'worklet';
      const w = Math.max(trackWidth.value, 1);
      const travel = Math.max(w - thumbWidth, 1);
      const along = sign === 1 ? x : w - x;
      const p = (along - thumbWidth / 2) / travel;
      const toLow = Math.abs(p - lowProgress.value);
      const toHigh = Math.abs(p - highProgress.value);
      if (toLow === toHigh) return p < lowProgress.value ? 'low' : 'high';
      return toLow < toHigh ? 'low' : 'high';
    };

    const pan = Gesture.Pan()
      .enabled(!disabled)
      .hitSlop(HIT_SLOP)
      .onBegin((event) => {
        runOnJS(setDragging)(true);
        dragStartLow.value = lowProgress.value;
        dragStartHigh.value = highProgress.value;
        const thumb = isRange ? pickThumb(event.x) : 'high';
        activeThumb.value = thumb;
        if (thumb === 'low') pressedLow.value = withSpring(1, KNOB_SPRING);
        else pressed.value = withSpring(1, KNOB_SPRING);
      })
      .onUpdate((event) => {
        const travel = Math.max(trackWidth.value - thumbWidth, 1);
        /*
         * Yoga mirrors the track but not a translation: a finger moving right
         * in a right-to-left subtree is moving *back* along the scale, and
         * without the sign the thumb runs away from the finger.
         */
        const delta = (event.translationX * sign) / travel;

        if (!isRange) {
          const next = Math.min(Math.max(dragStartHigh.value + delta, 0), 1);
          highProgress.value = next;
          runOnJS(commitFromProgress)(next, false);
          return;
        }

        // Each thumb is bounded by the other rather than by the track, so they
        // can meet but never cross — a span turned inside out would fill
        // backwards and read as a different range entirely.
        if (activeThumb.value === 'low') {
          const ceiling = Math.max(highProgress.value - gap, 0);
          const next = Math.min(Math.max(dragStartLow.value + delta, 0), ceiling);
          lowProgress.value = next;
          runOnJS(commitRangeFromProgress)(next, highProgress.value, false, 'low');
        } else {
          const floor = Math.min(lowProgress.value + gap, 1);
          const next = Math.min(Math.max(dragStartHigh.value + delta, floor), 1);
          highProgress.value = next;
          runOnJS(commitRangeFromProgress)(lowProgress.value, next, false, 'high');
        }
      })
      .onFinalize(() => {
        pressed.value = withSpring(0, KNOB_SPRING);
        pressedLow.value = withSpring(0, KNOB_SPRING);
        runOnJS(setDragging)(false);
        if (isRange) {
          runOnJS(commitRangeFromProgress)(
            lowProgress.value,
            highProgress.value,
            true,
            activeThumb.value
          );
        } else {
          runOnJS(commitFromProgress)(highProgress.value, true);
        }
      });

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDuration(250)
      .onEnd((event) => {
        const travel = Math.max(trackWidth.value - thumbWidth, 1);
        // `event.x` is measured from the physical left edge either way, so
        // right-to-left counts back from the far end of the track.
        const along = sign === 1 ? event.x : trackWidth.value - event.x;
        const next = Math.min(Math.max((along - thumbWidth / 2) / travel, 0), 1);

        if (!isRange) {
          highProgress.value = withSpring(next, SPRING);
          runOnJS(commitFromProgress)(next, true);
          return;
        }

        if (pickThumb(event.x) === 'low') {
          const bounded = Math.min(next, Math.max(highProgress.value - gap, 0));
          lowProgress.value = withSpring(bounded, SPRING);
          runOnJS(commitRangeFromProgress)(bounded, highProgress.value, true, 'low');
        } else {
          const bounded = Math.max(next, Math.min(lowProgress.value + gap, 1));
          highProgress.value = withSpring(bounded, SPRING);
          runOnJS(commitRangeFromProgress)(lowProgress.value, bounded, true, 'high');
        }
      });

    const gesture = Gesture.Race(pan, tap);

    // The fill runs under both thumbs rather than up to them, so neither shows
    // a seam against it as it moves. On a one-thumb slider `low` is 0, and this
    // is the ordinary fill from the start of the track.
    const fillStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbWidth, 0);
      return {
        width: (highProgress.value - lowProgress.value) * travel + thumbWidth,
        transform: [{ translateX: lowProgress.value * travel * sign }],
      };
    });

    const thumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbWidth, 0);
      // A transform is not laid out, so Yoga does not mirror it — the thumb
      // has to travel the other way itself.
      return { transform: [{ translateX: highProgress.value * travel * sign }] };
    });

    const lowThumbStyle = useAnimatedStyle(() => {
      const travel = Math.max(trackWidth.value - thumbWidth, 0);
      return { transform: [{ translateX: lowProgress.value * travel * sign }] };
    });

    const knobStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 - pressed.value * (1 - KNOB_PRESSED_SCALE) }],
    }));

    const lowKnobStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 - pressedLow.value * (1 - KNOB_PRESSED_SCALE) }],
    }));

    // VoiceOver / TalkBack increment and decrement move by a single step.
    const nudge = (dir: 1 | -1, thumb: Thumb = 'high') => {
      if (!isRange) {
        const next = snap(value + dir * (step || 1), min, max, step);
        if (next === value) return;
        if (haptics) {
          recordStep(lastTick.current, 'high', next);
          selectionTick();
        }
        highProgress.value = withSpring(toFraction(next), SPRING);
        emitChange(next);
        emitCommit(next);
        return;
      }

      const gapValue = minStepsBetweenThumbs * step;
      const current = thumb === 'low' ? low : high;
      const bounded =
        thumb === 'low'
          ? clampJS(current + dir * (step || 1), min, high - gapValue)
          : clampJS(current + dir * (step || 1), low + gapValue, max);
      const next = snap(bounded, min, max, step);
      if (next === current) return;
      if (haptics) {
        recordStep(lastTick.current, thumb, next);
        selectionTick();
      }
      const pair: [number, number] = thumb === 'low' ? [next, high] : [low, next];
      (thumb === 'low' ? lowProgress : highProgress).value = withSpring(
        toFraction(next),
        SPRING
      );
      emitRangeChange(pair);
      rangeCommitRef.current?.(pair);
    };

    const accessibilityAction = (thumb: Thumb) => (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') nudge(1, thumb);
      else if (event.nativeEvent.actionName === 'decrement') nudge(-1, thumb);
    };

    const print = (n: number) => (formatValue ? formatValue(n) : String(Math.round(n)));
    const shownValue = isRange ? `${print(low)} – ${print(high)}` : print(value);

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
          {/*
            Neither axis is left to the platform.

            A slider has no intrinsic width — it fills whatever it is given —
            so ordinary layout was always going to decide that. The height was
            being matched, and matching is not a one-off: the host writes the
            platform's measured size back into the layout on every geometry
            change, so the row's height moved whenever the control was touched
            and everything below it moved with it. The height is stated
            instead.
          */}
          <NativeHost
            host={Host}
            matchContents={false}
            ignoreSafeArea="keyboard"
            style={{ height: NATIVE_SLIDER_HEIGHT }}
          >
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
          </NativeHost>
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

            {isRange ? (
              <Animated.View
                style={[lowThumbStyle, { width: thumbWidth }]}
                className={slots.thumb({ className: thumbClassName })}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={label ? `${label}, minimum` : 'Minimum'}
                accessibilityState={{ disabled }}
                accessibilityValue={{
                  min,
                  max: Math.round(high),
                  now: Math.round(low),
                  text: print(low),
                }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={accessibilityAction('low')}
              >
                <Animated.View
                  style={lowKnobStyle}
                  className={slots.knob({ className: knobClassName })}
                />
              </Animated.View>
            ) : null}

            <Animated.View
              style={[thumbStyle, { width: thumbWidth }]}
              className={slots.thumb({ className: thumbClassName })}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={
                isRange ? (label ? `${label}, maximum` : 'Maximum') : label
              }
              accessibilityState={{ disabled }}
              accessibilityValue={{
                min: isRange ? Math.round(low) : min,
                max,
                now: Math.round(isRange ? high : value),
                text: isRange ? print(high) : shownValue,
              }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={accessibilityAction('high')}
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
