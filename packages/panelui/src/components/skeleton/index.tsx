import { memo, useEffect } from 'react';
import type { ViewProps } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '../../utils/cn';

/** Milliseconds for one half of the pulse. */
const PULSE_DURATION = 700;
/** How far down the pulse goes. */
const PULSE_FLOOR = 0.45;
/**
 * Where the pulse rests when it is not running. Between the two ends of it, so
 * a still skeleton looks like the same placeholder rather than a solid block.
 */
const RESTING_OPACITY = 0.7;

export interface SkeletonProps {
  className?: string;
  /**
   * View style for the placeholder — a dimension computed at runtime, or one no
   * utility class expresses. Ordinary sizing belongs in `className`, and a
   * value here wins over the class that sets the same property.
   *
   * The pulse owns `opacity`; setting it here has no effect.
   */
  style?: ViewProps['style'];
  /**
   * What is loading, for a screen reader. Setting it makes this skeleton
   * announce as a busy status; leaving it unset keeps the placeholder out of
   * the accessibility tree entirely.
   *
   * A screen full of placeholders needs **one** of them labelled, not all of
   * them — put it on the skeleton standing for the region and leave the rest
   * silent.
   */
  label?: string;
}

/**
 * Pulsing placeholder for content that has not arrived. The opacity animation
 * runs on the UI thread.
 *
 * A placeholder is a picture of absent content, so it is hidden from assistive
 * technology by default — an unlabelled grey box announces nothing worth
 * hearing, and a screen of them announces it many times over. Pass `label` on
 * the one skeleton that stands for the region to have the wait announced once.
 *
 * Under the platform's reduce-motion setting the pulse stops and the
 * placeholder holds at a middle opacity. Unlike a spinner, a skeleton that
 * stops moving does not read as hung: it is a shape where content will be, and
 * the shape says that on its own.
 */
export const Skeleton = memo(function Skeleton({
  className,
  style,
  label,
}: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? RESTING_OPACITY : 1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = RESTING_OPACITY;
      return undefined;
    }
    opacity.value = 1;
    opacity.value = withRepeat(
      withTiming(PULSE_FLOOR, { duration: PULSE_DURATION }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const announced = label != null;

  return (
    <Animated.View
      accessibilityRole={announced ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityState={announced ? { busy: true } : undefined}
      accessibilityElementsHidden={!announced}
      importantForAccessibility={announced ? 'auto' : 'no-hide-descendants'}
      style={[style, animatedStyle]}
      className={cn('rounded-md bg-skeleton', className)}
    />
  );
});
