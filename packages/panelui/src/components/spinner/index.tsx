import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';

/** Milliseconds for one full turn. */
const SPIN_DURATION = 800;
/** Milliseconds for one half of the fade that stands in for the turn. */
const PULSE_DURATION = 900;
/** How far down the fade goes. Faint enough to read as a pulse, not a flicker. */
const PULSE_FLOOR = 0.35;

const spinnerVariants = tv({
  base: 'rounded-full border-2 border-muted border-t-primary',
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8 border-[3px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  /**
   * What is loading, for a screen reader. Setting it makes the spinner
   * announce as a busy status; leaving it unset keeps it out of the
   * accessibility tree.
   *
   * Leave it unset wherever something around the spinner already says the
   * wait is on — a loading button, a row with its own caption. Set it where
   * the spinner is the only sign, or the wait passes in silence.
   */
  label?: string;
  /**
   * The colour of the turning arc. Any colour React Native accepts — a hex
   * string, `rgb()`, a named colour. Leave it unset to follow the theme's
   * primary colour.
   *
   * Set it where the spinner sits on a surface the theme did not choose for
   * it: a spinner on a filled button, or over a photo, wants the colour of the
   * text around it rather than the accent.
   */
  color?: string;
  /**
   * The colour of the faint ring the arc turns around. Leave it unset for the
   * theme's muted colour. Worth setting alongside `color` on a dark or
   * coloured surface, where the default ring can read as a second, fainter
   * spinner rather than as a track.
   */
  trackColor?: string;
}

/**
 * Rotating ring for work of unknown length. The animation runs entirely on the
 * UI thread.
 *
 * A bare ring carries no words, so it is hidden from assistive technology
 * unless `label` is given — an unnamed progress indicator announces its role
 * and nothing else, which is noise standing in for information.
 *
 * Under the platform's reduce-motion setting the ring stops turning and fades
 * in place instead. Stopping it dead is the other option and it is the wrong
 * one: a spinner that holds still reads as one that has hung, which is the
 * single thing a spinner exists to rule out. Reduce motion asks for less
 * travel, not for less news.
 */
export const Spinner = memo(function Spinner({
  className,
  size,
  label,
  color,
  trackColor,
}: SpinnerProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: reducedMotion ? PULSE_DURATION : SPIN_DURATION,
        easing: reducedMotion ? Easing.inOut(Easing.ease) : Easing.linear,
      }),
      -1,
      // The turn restarts where it began, because a full circle already ends
      // where it started. The fade turns around, because a pulse that snapped
      // back to full brightness would be the flicker the setting is there to
      // avoid.
      reducedMotion
    );
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  /*
   * One style sets both properties either case needs. The two are swapped on
   * the same view when the setting changes under a mounted spinner, and an
   * animated property that one case drops is not reset by the other — it is
   * left at whatever it was last given, which would strand a half-faded ring
   * at that opacity for the rest of its life.
   */
  const animatedStyle = useAnimatedStyle(() =>
    reducedMotion
      ? {
          opacity: interpolate(progress.value, [0, 1], [1, PULSE_FLOOR]),
          transform: [{ rotate: '0deg' }],
        }
      : {
          opacity: 1,
          transform: [{ rotate: `${progress.value * 360}deg` }],
        }
  );

  const announced = label != null;

  return (
    <Animated.View
      accessibilityRole={announced ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityState={announced ? { busy: true } : undefined}
      accessibilityElementsHidden={!announced}
      importantForAccessibility={announced ? 'auto' : 'no-hide-descendants'}
      // After the class, so a colour passed here wins over the theme's. The
      // track goes on every side and the arc on the top, the same split the
      // classes make, so setting one never repaints the other.
      style={[
        trackColor ? { borderColor: trackColor } : null,
        color ? { borderTopColor: color } : null,
        animatedStyle,
      ]}
      className={spinnerVariants({ size, className })}
    />
  );
});
