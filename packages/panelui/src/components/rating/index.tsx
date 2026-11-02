/**
 * Rating — a row of stars you can read or set.
 *
 * A rating is two jobs wearing one shape. Read-only, it is a compact way to
 * *show* a score — four-and-a-half stars next to a product. Interactive, it is
 * an *input*: tap a star to pick a whole value, or with `precision={0.5}` press
 * the left half of a star for a half. Either way the fill is the truth, so the
 * two modes look identical and only differ in whether a finger changes them.
 *
 * Partial fills are drawn by clipping a filled star over an empty one of the
 * same geometry — the filled layer's width is a fraction of the star's, so a
 * half star is exactly half and any precision in between is honest. That fill
 * is animated on the UI thread: setting a value springs the stars to it rather
 * than snapping, and a drag follows the finger with no spring so it never lags.
 *
 * ```tsx
 * <Rating defaultValue={3} onValueChange={setScore} />
 *
 * <Rating value={4.5} precision={0.5} readOnly />
 *
 * <Rating label="Rate your stay" showValue color="warning" defaultValue={0} />
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
  type SharedValue,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { StarIcon } from '../../icons';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import {
  normalizeRatingMax,
  normalizeRatingPrecision,
  normalizeRatingValue,
} from './rating-inputs';
import type { ViewRef } from '../../primitives/refs';

/** Springs the fill onto its resting value after a tap or the end of a drag. */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const;

const ratingVariants = tv({
  slots: {
    root: 'gap-2',
    header: 'flex-row items-center justify-between gap-3',
    label: 'text-sm font-medium text-foreground',
    value: 'text-sm text-muted-foreground',
    row: 'flex-row items-center self-start',
  },
  variants: {
    size: {
      sm: { row: 'gap-0.5' },
      md: { row: 'gap-1' },
      lg: { row: 'gap-1.5' },
    },
    disabled: {
      true: { root: 'opacity-50' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type RatingVariantProps = VariantProps<typeof ratingVariants>;
export type RatingSize = NonNullable<RatingVariantProps['size']>;
export type RatingColor =
  | 'warning'
  | 'primary'
  | 'success'
  | 'destructive'
  | 'info'
  | 'foreground';

/** Star pixel size per size token — the whole control scales from this. */
const STAR_SIZE: Record<RatingSize, number> = { sm: 18, md: 24, lg: 32 };

/** The CSS token each colour paints its filled stars with. */
const FILL_VAR: Record<RatingColor, string> = {
  warning: '--color-warning',
  primary: '--color-primary',
  success: '--color-success',
  destructive: '--color-destructive',
  info: '--color-info',
  foreground: '--color-foreground',
};

function clampJS(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Rounds `value` up to the nearest `precision`, so any touch fills at least it. */
function snap(value: number, precision: number, max: number) {
  const stepped = Math.ceil(value / precision) * precision;
  // Guard the float drift that `ceil` on fractional steps can leave behind.
  return clampJS(Math.round(stepped / precision) * precision, 0, max);
}

export interface RatingProps extends Omit<RatingVariantProps, 'disabled'> {
  className?: string;
  /** Controlled value. Leave unset and pass `defaultValue` to run uncontrolled. */
  value?: number;
  /** Starting value when uncontrolled. */
  defaultValue?: number;
  /** How many stars. */
  max?: number;
  /**
   * Smallest step a tap can pick, as a fraction of a star. `1` is whole stars,
   * `0.5` lets the left half of a star mean a half. Reading a value renders any
   * precision — this only constrains what a finger can set.
   */
  precision?: number;
  /** Fires as the value changes, including live while dragging. */
  onValueChange?: (value: number) => void;
  /** Fires once when a tap or drag ends — the place for expensive side effects. */
  onValueCommit?: (value: number) => void;
  /** Show the stars but ignore touches — the display half of the component. */
  readOnly?: boolean;
  disabled?: boolean;
  /**
   * Let a second tap on the current value clear it back to zero, so a rating
   * given by mistake can be taken back without a separate control.
   */
  allowClear?: boolean;
  /** Which token the filled stars are painted with. */
  color?: RatingColor;
  /** Caption above the stars. Also becomes the accessibility label. */
  label?: string;
  /** Show the numeric value on the caption row, opposite the label. */
  showValue?: boolean;
  /** Format the shown value. Defaults to the number as written. */
  formatValue?: (value: number) => string;
  /**
   * A tick under the finger each time a drag crosses onto a new star. Off by
   * default — needs the optional `expo-haptics`, and is silent without it.
   */
  haptics?: boolean;
  /** Extra classes for the caption row. */
  headerClassName?: string;
  /** Extra classes for the row of stars. */
  rowClassName?: string;
}

/**
 * One star: an empty outline with a filled copy clipped over it. The clip width
 * is driven by the shared `display` value on the UI thread, so the fill of this
 * star animates and drags without a React render.
 */
function Star({
  index,
  display,
  size,
  gap,
  fillColor,
  emptyColor,
}: {
  index: number;
  display: SharedValue<number>;
  size: number;
  gap: number;
  fillColor: string;
  emptyColor: string;
}) {
  // Clamped inline rather than through a helper: this body runs on the UI
  // thread, which can only reach worklets, not module-scope functions.
  const clipStyle = useAnimatedStyle(() => ({
    width: Math.min(Math.max(display.value - index, 0), 1) * size,
  }));

  return (
    <View style={{ width: size, height: size, marginRight: gap }}>
      <StarIcon size={size} color={emptyColor} />
      {/* The filled layer is pinned to the left and clipped to a fraction of
          the star's width, so a partial value shows a partial star. */}
      <Animated.View
        style={[{ position: 'absolute', left: 0, top: 0, overflow: 'hidden' }, clipStyle]}
      >
        <StarIcon size={size} color={fillColor} filled />
      </Animated.View>
    </View>
  );
}

export const Rating = forwardRef<ViewRef, RatingProps>(
  (
    {
      className,
      headerClassName,
      rowClassName,
      value: valueProp,
      defaultValue = 0,
      max: maxProp = 5,
      precision: precisionProp = 1,
      onValueChange,
      onValueCommit,
      readOnly = false,
      disabled = false,
      allowClear = false,
      color = 'warning',
      size = 'md',
      label,
      showValue = false,
      formatValue,
      haptics = false,
    },
    ref
  ) => {
    const max = normalizeRatingMax(maxProp);
    const precision = normalizeRatingPrecision(precisionProp);
    const isControlled = valueProp !== undefined;
    const [internal, setInternal] = useState(() => normalizeRatingValue(defaultValue, max));
    const value = normalizeRatingValue(isControlled ? valueProp : internal, max);

    const interactive = !readOnly && !disabled;
    const slots = ratingVariants({ size, disabled });
    const starSize = STAR_SIZE[size ?? 'md'];
    const gap = size === 'sm' ? 2 : size === 'lg' ? 6 : 4;

    // SVG paints with real colour strings, not classes — resolve the tokens.
    const fillColor = useCSSVariable(FILL_VAR[color]);
    const emptyColor = useCSSVariable('--color-border');
    const fill = typeof fillColor === 'string' ? fillColor : '#f59e0b';
    const empty = typeof emptyColor === 'string' ? emptyColor : '#d4d4d4';

    // Drives every star's clipped fill on the UI thread.
    const display = useSharedValue(value);
    const rowWidth = useSharedValue(0);

    // Keep the change/commit handlers reachable from the gesture without
    // rebuilding it on every render.
    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommit);
    commitRef.current = onValueCommit;
    // The last whole star a drag crossed, so haptics tick once per star.
    const lastStep = useRef(Math.ceil(value));

    const emitChange = useCallback(
      (next: number) => {
        if (!isControlled) setInternal(next);
        changeRef.current?.(next);
      },
      [isControlled]
    );

    // Follow a controlled value that changes elsewhere, springing to it.
    useEffect(() => {
      display.value = withSpring(value, SPRING);
    }, [value, display]);

    const onRowLayout = (event: LayoutChangeEvent) => {
      rowWidth.value = event.nativeEvent.layout.width;
    };

    // Maps an x within the row to a snapped rating. Runs on JS off the worklet.
    const valueFromX = useCallback(
      (x: number, width: number) => {
        if (width <= 0) return value;
        const raw = clampJS(x / width, 0, 1) * max;
        return snap(raw, precision, max);
      },
      [max, precision, value]
    );

    const applyLive = useCallback(
      (x: number, width: number) => {
        let next = valueFromX(x, width);
        if (allowClear && next === value && Math.ceil(next) === lastStep.current) {
          next = 0;
        }
        display.value = next;
        if (haptics && Math.ceil(next) !== lastStep.current) {
          lastStep.current = Math.ceil(next);
          selectionTick();
        }
        emitChange(next);
      },
      [valueFromX, allowClear, value, display, haptics, emitChange]
    );

    // Resets the haptic step to where the touch started, then applies the first
    // position. Runs on JS: a ref cannot be written from a gesture worklet.
    const begin = useCallback(
      (x: number, width: number) => {
        lastStep.current = Math.ceil(value);
        applyLive(x, width);
      },
      [value, applyLive]
    );

    const commit = useCallback(
      (x: number, width: number) => {
        let next = valueFromX(x, width);
        if (allowClear && next === value) next = 0;
        display.value = withSpring(next, SPRING);
        lastStep.current = Math.ceil(next);
        emitChange(next);
        commitRef.current?.(next);
      },
      [valueFromX, allowClear, value, display, emitChange]
    );

    const pan = Gesture.Pan()
      .enabled(interactive)
      .onBegin((event) => {
        runOnJS(begin)(event.x, rowWidth.value);
      })
      .onUpdate((event) => {
        runOnJS(applyLive)(event.x, rowWidth.value);
      })
      .onFinalize((event) => {
        runOnJS(commit)(event.x, rowWidth.value);
      });

    const tap = Gesture.Tap()
      .enabled(interactive)
      .maxDuration(250)
      .onEnd((event) => {
        runOnJS(commit)(event.x, rowWidth.value);
      });

    const gesture = Gesture.Race(tap, pan);

    // VoiceOver / TalkBack move by a single precision step.
    const nudge = (dir: 1 | -1) => {
      const next = clampJS(
        Math.round((value + dir * precision) / precision) * precision,
        0,
        max
      );
      if (next === value) return;
      display.value = withSpring(next, SPRING);
      lastStep.current = Math.ceil(next);
      emitChange(next);
      commitRef.current?.(next);
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') nudge(1);
      else if (event.nativeEvent.actionName === 'decrement') nudge(-1);
    };

    const shown = formatValue ? formatValue(value) : String(value);
    const a11yLabel = label ?? `Rating, ${shown} out of ${max}`;

    const stars = (
      <View
        className={slots.row({ className: rowClassName })}
        onLayout={onRowLayout}
        // The row is measured for the touch math, so it must not collapse.
        collapsable={false}
      >
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            index={i}
            display={display}
            size={starSize}
            // No trailing gap after the last star, so the row width is honest.
            gap={i === max - 1 ? 0 : gap}
            fillColor={fill}
            emptyColor={empty}
          />
        ))}
      </View>
    );

    const header =
      label || showValue ? (
        <View className={slots.header({ className: headerClassName })}>
          {label ? <Text className={slots.label()}>{label}</Text> : <View />}
          {showValue ? <Text className={slots.value()}>{shown}</Text> : null}
        </View>
      ) : null;

    return (
      <View ref={ref} className={cn(slots.root({ className }))}>
        {header}
        {interactive ? (
          <GestureDetector gesture={gesture}>
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={a11yLabel}
              accessibilityState={{ disabled }}
              accessibilityValue={{ min: 0, max, now: value, text: shown }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={onAccessibilityAction}
              // Hold the stars in a self-starting box so the gesture area is
              // exactly the stars, not the full width of the parent.
              className="self-start"
            >
              {stars}
            </View>
          </GestureDetector>
        ) : (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={a11yLabel}
          >
            {stars}
          </View>
        )}
      </View>
    );
  }
);

Rating.displayName = 'Rating';
