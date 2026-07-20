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

const SPRING = { damping: 20, stiffness: 180, mass: 0.6 } as const;
/** Fraction of the track covered by the sliding bar in indeterminate mode. */
const INDETERMINATE_WIDTH = 0.4;

const progressVariants = tv({
  slots: {
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
}

function clamp(value: number) {
  'worklet';
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * Determinate or indeterminate progress bar. The fill width (determinate) and
 * the sliding bar (indeterminate) are both driven on the UI thread, so updates
 * never re-render past the value change itself.
 */
export const Progress = forwardRef<View, ProgressProps>(
  (
    {
      className,
      indicatorClassName,
      value = 0,
      indeterminate = false,
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

    return (
      <View
        ref={ref}
        accessibilityRole="progressbar"
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
  }
);

Progress.displayName = 'Progress';
