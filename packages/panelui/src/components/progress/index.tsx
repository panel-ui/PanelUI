import { forwardRef, useEffect } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';

const SPRING = { damping: 20, stiffness: 180, mass: 0.6 } as const;
/** Fraction of the track covered by the sliding bar in indeterminate mode. */
const INDETERMINATE_WIDTH = 0.4;

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
  /** Progress value, 0–100. Ignored when `indeterminate` is set. */
  value?: number;
  /** Show a looping animation for unknown-duration work. */
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
   * Format the value label as a fraction of the whole with `Intl.NumberFormat`
   * — e.g. `{ style: 'currency', currency: 'USD' }`. Falls back to a rounded
   * percent when omitted.
   */
  formatOptions?: Intl.NumberFormatOptions;
  /** Extra classes for the label + value-label row. */
  headerClassName?: string;
}

function clamp(value: number) {
  'worklet';
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/** The right-hand caption: an explicit override, an Intl fraction, or a percent. */
function formatValue(
  value: number,
  valueLabel?: string,
  formatOptions?: Intl.NumberFormatOptions
) {
  if (valueLabel != null) return valueLabel;
  if (formatOptions) {
    try {
      return new Intl.NumberFormat(undefined, formatOptions).format(value / 100);
    } catch {
      // Some engines ship a partial Intl; fall through to the plain percent.
    }
  }
  return `${Math.round(value)}%`;
}

/**
 * Determinate or indeterminate progress bar. The fill width (determinate) and
 * the sliding bar (indeterminate) are both driven on the UI thread, so updates
 * never re-render past the value change itself.
 *
 * Pass `label` or `showValueLabel` to caption the bar with a header row; the
 * bare track renders when neither is set, so existing call sites are untouched.
 */
export const Progress = forwardRef<View, ProgressProps>(
  (
    {
      className,
      indicatorClassName,
      headerClassName,
      value = 0,
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
    const progress = useSharedValue(clamp(value) / 100);
    const slide = useSharedValue(0);

    const target = clamp(value) / 100;

    useEffect(() => {
      if (indeterminate) {
        slide.value = withRepeat(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
          -1,
          false
        );
        return () => cancelAnimation(slide);
      }
      progress.value = withSpring(target, SPRING);
      return undefined;
    }, [indeterminate, target, progress, slide]);

    const onLayout = (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    };

    const determinateStyle = useAnimatedStyle(() => ({
      width: trackWidth.value * progress.value,
    }));

    const indeterminateStyle = useAnimatedStyle(() => {
      const barWidth = trackWidth.value * INDETERMINATE_WIDTH;
      return {
        width: barWidth,
        transform: [
          {
            translateX: interpolate(
              slide.value,
              [0, 1],
              [-barWidth, trackWidth.value]
            ),
          },
        ],
      };
    });

    // The value label is meaningless while looping, so it is dropped there.
    const showValue = showValueLabel && !indeterminate;
    const hasHeader = label != null || showValue;

    const track = (
      <View
        ref={ref}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={
          indeterminate ? undefined : { min: 0, max: 100, now: clamp(value) }
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
            <Text size="sm" muted className={cn(label == null && 'ml-auto')}>
              {formatValue(clamp(value), valueLabel, formatOptions)}
            </Text>
          ) : null}
        </View>
        {track}
      </View>
    );
  }
);

Progress.displayName = 'Progress';
