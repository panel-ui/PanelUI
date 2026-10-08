import { forwardRef, useEffect } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useDirectionSign } from '../../hooks/use-direction';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 20, stiffness: 180, mass: 0.6 } as const;
/** Fraction of the track covered by the sliding bar in indeterminate mode. */
const INDETERMINATE_WIDTH = 0.4;
/** Milliseconds for the bar to cross the track once. */
const SWEEP_DURATION = 1100;
/** Milliseconds for one half of the fade that stands in for the sweep. */
const PULSE_DURATION = 900;
/** How far down the fade goes. Faint enough to read as a pulse, not a flicker. */
const PULSE_FLOOR = 0.35;

const progressVariants = tv({
  slots: {
    root: 'w-full gap-2',
    header: 'flex-row items-center justify-between',
    track: 'w-full overflow-hidden rounded-full',
    indicator: 'h-full rounded-full',
  },
  variants: {
    color: {
      primary: { track: 'bg-primary/16', indicator: 'bg-primary' },
      success: { track: 'bg-success/16', indicator: 'bg-success' },
      warning: { track: 'bg-warning/16', indicator: 'bg-warning' },
      destructive: { track: 'bg-destructive/16', indicator: 'bg-destructive' },
      info: { track: 'bg-info/16', indicator: 'bg-info' },
    },
    size: {
      sm: { track: 'h-1.5' },
      md: { track: 'h-2' },
      lg: { track: 'h-3' },
    },
  },
  defaultVariants: {
    color: 'primary',
    size: 'md',
  },
});

type ProgressVariantProps = VariantProps<typeof progressVariants>;

export interface ProgressProps
  extends Omit<ViewProps, 'children'>,
    ProgressVariantProps {
  className?: string;
  /**
   * Where the work has got to, somewhere between `minValue` and `maxValue`.
   * Ignored when `indeterminate` is set.
   */
  value?: number;
  /**
   * The bottom of the range — the value at which the bar reads as empty.
   * Defaults to `0`.
   */
  minValue?: number;
  /**
   * The top of the range — the value at which the bar reads as full. Defaults
   * to `100`, so a bare percentage keeps working with neither bound set.
   */
  maxValue?: number;
  /**
   * Show a looping animation for unknown-duration work. Under the platform's
   * reduce-motion setting the bar fills the track and pulses instead of
   * travelling across it, so it still reads as running.
   */
  indeterminate?: boolean;
  /** Extra classes for the moving indicator. */
  indicatorClassName?: string;
  /**
   * Caption drawn above the track, on the left. Supplying it (or
   * `showValueLabel`) wraps the bar in a header row; the track alone renders
   * otherwise.
   */
  label?: string;
  /**
   * Draw the percentage above the track, on the right. Hidden while
   * `indeterminate` — there is nothing meaningful to show.
   */
  showValueLabel?: boolean;
  /**
   * Text for the value label. Overrides the formatted percentage — use it for
   * a byte count, a step tally, anything that is not a bare percent.
   */
  valueLabel?: string;
  /**
   * How to write the value, through `Intl.NumberFormat`. A `percent` style
   * formats how far along the bar is; every other style formats the value
   * itself, so `{ style: 'currency', currency: 'USD' }` against a `maxValue`
   * of `2000` reads `$1,250.00` rather than a percentage of it. Falls back to
   * a rounded percent when omitted.
   */
  formatOptions?: Intl.NumberFormatOptions;
  /** Extra classes for the label + value-label row. */
  headerClassName?: string;
}

/** `value` held inside the range, so a stray number cannot escape the track. */
function clamp(value: number, min: number, max: number) {
  if (!(value > min)) return min;
  if (value > max) return max;
  return value;
}

/**
 * How far along the bar is, 0–1. An empty or inverted range has no meaningful
 * position in it, so it reads as empty rather than dividing by zero.
 */
function fractionOf(value: number, min: number, max: number) {
  const span = max - min;
  if (!(span > 0)) return 0;
  return clamp((value - min) / span, 0, 1);
}

/**
 * The right-hand caption: an explicit override, an `Intl` rendering, or a
 * rounded percent.
 *
 * A `percent` style is given the fraction, because that is what a percentage
 * of the range means; every other style is given the value, because a currency
 * or a byte count is a quantity and not a proportion.
 */
function formatValue(
  value: number,
  fraction: number,
  valueLabel?: string,
  formatOptions?: Intl.NumberFormatOptions
) {
  if (valueLabel != null) return valueLabel;
  if (formatOptions) {
    try {
      return new Intl.NumberFormat(undefined, formatOptions).format(
        formatOptions.style === 'percent' ? fraction : value
      );
    } catch {
      // Some engines ship a partial Intl; fall through to the plain percent.
    }
  }
  return `${Math.round(fraction * 100)}%`;
}

/**
 * Determinate or indeterminate progress bar. The fill width (determinate) and
 * the sliding bar (indeterminate) are both driven on the UI thread, so updates
 * never re-render past the value change itself.
 *
 * Pass `label` or `showValueLabel` to caption the bar with a header row; the
 * bare track renders when neither is set, so existing call sites are untouched.
 *
 * The value is read against `minValue` / `maxValue`, which default to 0 and
 * 100 — so a percentage needs neither. Set them and the bar speaks in whatever
 * the work is actually counted in: bytes uploaded, seats filled, points
 * scored. Nothing has to be converted to a percent on the way in, and the
 * screen reader is told the real range rather than a derived one.
 *
 * Reduce motion is honoured in both modes: the fill lands on its value rather
 * than springing to it, and the indeterminate bar pulses in place rather than
 * crossing the track.
 */
export const Progress = forwardRef<View, ProgressProps>(
  (
    {
      className,
      indicatorClassName,
      headerClassName,
      value = 0,
      minValue = 0,
      maxValue = 100,
      indeterminate = false,
      label,
      showValueLabel = false,
      valueLabel,
      formatOptions,
      color,
      size,
      ...props
    },
    ref
  ) => {
    const slots = progressVariants({ color, size });
    const trackWidth = useSharedValue(0);
    // Yoga mirrors the track; the bar sliding along it is a transform, so it
    // has to be turned around itself.
    const sign = useDirectionSign();
    const target = fractionOf(value, minValue, maxValue);
    const progress = useSharedValue(target);
    const slide = useSharedValue(0);
    const reducedMotion = useReducedMotion();

    /**
     * The loop is tied to `indeterminate` and to how much motion is wanted.
     * Restarting it whenever the value moved used to leave `withRepeat`
     * cycling from wherever the bar had got to, so a bar that kept receiving
     * values while looping ended up sweeping a shrinking sliver of the track
     * instead of crossing it.
     *
     * Under reduce motion the same loop drives a fade rather than a journey
     * across the track. Freezing it outright is the other option and it is the
     * wrong one: a bar that stops moving reads as a bar that has hung, which is
     * the one thing an indeterminate bar exists to rule out. Reduce motion asks
     * for less travel, not for less news — so the travel goes and the pulse
     * stays, running slower than the sweep it replaces.
     */
    useEffect(() => {
      if (!indeterminate) return undefined;
      slide.value = 0;
      slide.value = withRepeat(
        withTiming(1, {
          duration: reducedMotion ? PULSE_DURATION : SWEEP_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        // The sweep restarts at the left edge; the fade turns around, because a
        // pulse that snapped back to full brightness would be the flicker the
        // setting is there to avoid.
        reducedMotion
      );
      return () => cancelAnimation(slide);
    }, [indeterminate, reducedMotion, slide]);

    // The fill follows the value, and picks up from wherever the loop left it
    // when a bar stops being indeterminate mid-flight. Reduce motion lands on
    // the value instead of springing to it — the number is the information, and
    // the overshoot is decoration.
    useEffect(() => {
      if (indeterminate) return;
      progress.value = reducedMotion ? target : withSpring(target, SPRING);
    }, [indeterminate, target, progress, reducedMotion]);

    const onLayout = (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    };

    /*
     * Both styles set every property either of them sets. The two are swapped
     * on the same view when a bar stops being indeterminate, and an animated
     * property that one style drops is not reset by the other — it is simply
     * left at whatever it was last given, which would strand a half-faded bar
     * at that opacity for the rest of its life.
     */
    const determinateStyle = useAnimatedStyle(() => ({
      width: trackWidth.value * progress.value,
      opacity: 1,
      transform: [{ translateX: 0 }],
    }));

    const indeterminateStyle = useAnimatedStyle(() => {
      if (reducedMotion) {
        // Nothing travels: the whole track carries the bar and the bar breathes.
        return {
          width: trackWidth.value,
          opacity: interpolate(slide.value, [0, 1], [1, PULSE_FLOOR]),
          transform: [{ translateX: 0 }],
        };
      }
      const barWidth = trackWidth.value * INDETERMINATE_WIDTH;
      return {
        width: barWidth,
        opacity: 1,
        transform: [
          {
            // The loop travels the way the text does. Yoga mirrors the track
            // but not the transform sliding along it.
            translateX: interpolate(
              slide.value,
              [0, 1],
              sign === 1
                ? [-barWidth, trackWidth.value]
                : [trackWidth.value, -barWidth]
            ),
          },
        ],
      };
    });

    // The value label is meaningless while looping, so it is dropped there.
    const showValue = showValueLabel && !indeterminate;
    const hasHeader = label != null || showValue;
    const spoken = formatValue(
      clamp(value, minValue, maxValue),
      target,
      valueLabel,
      formatOptions
    );

    const track = (
      <View
        ref={ref}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        // Indeterminate has no value to announce, so `busy` is the only thing
        // separating "working, length unknown" from "empty and going nowhere".
        // Always a boolean, never `undefined`: Android ignores a state that
        // goes missing, so a bar turning determinate would still read as busy.
        accessibilityState={{ busy: indeterminate }}
        accessibilityValue={
          indeterminate
            ? undefined
            : {
                min: minValue,
                max: maxValue,
                now: clamp(value, minValue, maxValue),
                // Without this the range is read as a bare number. `text` is
                // what carries the unit — the percent sign, the currency.
                text: spoken,
              }
        }
        className={slots.track({ className })}
        onLayout={onLayout}
        {...props}
      >
        <Animated.View
          style={indeterminate ? indeterminateStyle : determinateStyle}
          className={slots.indicator({ className: indicatorClassName })}
        />
      </View>
    );

    if (!hasHeader) return track;

    return (
      <View className={slots.root()}>
        <View className={slots.header({ className: headerClassName })}>
          {label != null ? (
            <Text size="sm" weight="medium" numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showValue ? (
            <Text size="sm" muted className={cn(label == null && 'ms-auto')}>
              {spoken}
            </Text>
          ) : null}
        </View>
        {track}
      </View>
    );
  }
);

Progress.displayName = 'Progress';
