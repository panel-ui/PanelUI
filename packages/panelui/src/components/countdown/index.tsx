/**
 * Countdown — the time left until a moment, ticking.
 *
 * ```tsx
 * <Countdown to={launch} />
 * <Countdown to={saleEnds} variant="inline" urgentBelow={300} />
 * ```
 *
 * The clock is read, not counted. Every tick works out what is left from
 * `Date.now()` and the target, and the next tick is scheduled for the moment
 * the displayed second turns over. A countdown that subtracted one per
 * interval would drift by however late each timer fired, and would be wrong
 * by the whole time the app spent in the background.
 *
 * Each digit is its own keyed view: when it changes, the old one slides out
 * downward and the new one drops in from above, on the UI thread. Only the
 * digits that changed move, so a ticking clock is one column moving, not the
 * whole number re-rendering. Nothing moves on the first render, and nothing
 * moves at all under reduce motion.
 *
 * The screen-reader label is coarser than the display — minutes until the
 * last minute, then seconds — because a label that changed every second
 * would be re-read every second. See `countdown-time.ts`.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useReducedMotion,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import {
  describeSeconds,
  msUntilNextTick,
  secondsLeft,
  splitSeconds,
  trimLeading,
  type CountdownPart,
  type CountdownUnit,
} from './countdown-time';

export type { CountdownUnit } from './countdown-time';

/** How long a digit takes to change. Well inside the second it is shown for. */
const DIGIT_MS = 260;
const EASE = Easing.out(Easing.cubic);

/*
 * The new digit drops into its slot from one digit-height above while the old
 * one drops out by one digit-height below, so the two travel together like an
 * odometer wheel and are never on top of each other. A fixed distance would
 * overlap them at large sizes and overshoot the window at small ones, so the
 * distance is the measured height of the digit itself.
 */
function enter(values: EntryAnimationsValues) {
  'worklet';
  return {
    initialValues: { originY: values.targetOriginY - values.targetHeight, opacity: 0 },
    animations: {
      originY: withTiming(values.targetOriginY, { duration: DIGIT_MS, easing: EASE }),
      opacity: withTiming(1, { duration: DIGIT_MS, easing: EASE }),
    },
  };
}

function exit(values: ExitAnimationsValues) {
  'worklet';
  return {
    initialValues: { originY: values.currentOriginY, opacity: 1 },
    animations: {
      originY: withTiming(values.currentOriginY + values.currentHeight, {
        duration: DIGIT_MS,
        easing: EASE,
      }),
      opacity: withTiming(0, { duration: DIGIT_MS, easing: EASE }),
    },
  };
}

const countdownVariants = tv({
  slots: {
    root: 'flex-row items-start',
    segment: 'items-center',
    digits: 'flex-row',
    digit: 'font-semibold tabular-nums text-foreground',
    label: 'font-medium uppercase tracking-wider text-muted-foreground',
    separator: 'font-semibold tabular-nums text-muted-foreground',
    suffix: 'font-semibold text-muted-foreground',
  },
  variants: {
    /**
     * `segmented` puts each unit in its own box with its name under it — a
     * launch page, a hero, anything the countdown is the point of.
     * `inline` is a line of text, `2d 14:03:22`, for a banner, a button
     * caption or a row.
     */
    variant: {
      segmented: {
        root: 'gap-2',
        segment: 'gap-1.5 rounded-xl border border-border bg-card shadow-sm',
      },
      inline: {
        root: 'items-baseline',
        segment: 'flex-row items-baseline',
      },
    },
    size: {
      sm: { digit: 'text-lg', label: 'text-[10px]', separator: 'text-lg', suffix: 'text-sm' },
      md: { digit: 'text-3xl', label: 'text-[10px]', separator: 'text-3xl', suffix: 'text-xl' },
      lg: { digit: 'text-4xl', label: 'text-[11px]', separator: 'text-4xl', suffix: 'text-2xl' },
    },
  },
  compoundVariants: [
    { variant: 'segmented', size: 'sm', class: { segment: 'min-w-12 px-2 py-1.5' } },
    { variant: 'segmented', size: 'md', class: { segment: 'min-w-16 px-3 py-2.5' } },
    { variant: 'segmented', size: 'lg', class: { segment: 'min-w-16 px-3 py-3' } },
  ],
  defaultVariants: { variant: 'segmented', size: 'md' },
});

type CountdownVariantProps = VariantProps<typeof countdownVariants>;

/**
 * The urgent colour. A class added on top rather than a `tv()` variant: it is
 * derived from `urgentBelow` and the clock, not passed, and a variant here
 * would be documented as a prop.
 */
const URGENT = { digit: 'text-destructive', separator: 'text-destructive/60' };

const DEFAULT_LABELS: Record<CountdownUnit, string> = {
  days: 'Days',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds',
};

const SUFFIX: Record<CountdownUnit, string> = { days: 'd', hours: 'h', minutes: 'm', seconds: 's' };

export interface CountdownProps extends Omit<ViewProps, 'children'>, CountdownVariantProps {
  className?: string;
  /** The moment to count down to, as a `Date` or epoch milliseconds. */
  to: Date | number;
  /**
   * Which units to show, largest to smallest. The largest one absorbs
   * everything above it — `['hours', 'minutes', 'seconds']` shows two days as
   * 48 hours. Defaults to all four.
   */
  units?: CountdownUnit[];
  /**
   * Drop leading units while they are zero, so a launch three hours away has
   * no "00 days" box. The smallest two always stay.
   */
  trim?: boolean;
  /** Names under each box in `segmented`. Pass any subset to translate them. */
  labels?: Partial<Record<CountdownUnit, string>>;
  /**
   * Turn the digits to the destructive colour once this many seconds or fewer
   * are left — the last five minutes of a sale, the last ten seconds of a bid.
   */
  urgentBelow?: number;
  /** Called once when the time is up, including on mount if it already is. */
  onComplete?: () => void;
  /** Called with the whole seconds left each time the display changes. */
  onTick?: (secondsLeft: number) => void;
}

/** One digit in a window its own height, swapped with a slide when it changes. */
function Digit({
  value,
  animate,
  className,
}: {
  value: string;
  animate: boolean;
  className: string;
}) {
  return (
    <View className="overflow-hidden">
      {/* In flow and invisible: it gives the window a digit's width and height. */}
      <Text className={cn(className, 'opacity-0')}>0</Text>
      <Animated.View
        key={value}
        entering={animate ? enter : undefined}
        exiting={animate ? exit : undefined}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <Text className={cn(className, 'text-center')}>{value}</Text>
      </Animated.View>
    </View>
  );
}

function Digits({
  part,
  animate,
  className,
}: {
  part: CountdownPart;
  animate: boolean;
  className: string;
}) {
  const slots = countdownVariants();
  const text = String(part.value).padStart(2, '0');
  return (
    <View className={slots.digits()}>
      {text.split('').map((char, index) => (
        // Keyed by place from the right, so a days count going from 10 to 9
        // keeps the ones column it already had.
        <Digit
          key={text.length - index}
          value={char}
          animate={animate}
          className={className}
        />
      ))}
    </View>
  );
}

const CountdownRoot = forwardRef<View, CountdownProps>(function Countdown(
  {
    className,
    to,
    variant = 'segmented',
    size = 'md',
    units,
    trim = true,
    labels,
    urgentBelow,
    onComplete,
    onTick,
    ...props
  },
  ref
) {
  const target = typeof to === 'number' ? to : to.getTime();
  const [left, setLeft] = useState(() => secondsLeft(target, Date.now()));

  // Callbacks through refs, so a new arrow function from the parent on every
  // render does not restart the clock.
  const completeRef = useRef(onComplete);
  const tickRef = useRef(onTick);
  completeRef.current = onComplete;
  tickRef.current = onTick;

  // No animation on the first render: the numbers are arriving, not changing.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const tick = () => {
      const now = Date.now();
      const next = secondsLeft(target, now);
      setLeft(next);
      tickRef.current?.(next);
      if (next === 0) {
        if (!done) {
          done = true;
          completeRef.current?.();
        }
        return;
      }
      // A few milliseconds past the turn, so the read lands in the new second.
      timer = setTimeout(tick, msUntilNextTick(target, now) + 8);
    };
    tick();
    return () => clearTimeout(timer);
  }, [target]);

  const urgent = urgentBelow != null && left > 0 && left <= urgentBelow;
  const variants = countdownVariants({ variant, size });
  const slots = {
    ...variants,
    digit: () => cn(variants.digit(), urgent && URGENT.digit),
    separator: () => cn(variants.separator(), urgent && URGENT.separator),
  };
  const split = splitSeconds(left, units);
  const parts = trim ? trimLeading(split) : split;
  // Custom layout animations do not read the system setting on their own.
  const reduced = useReducedMotion();
  const animate = mounted.current && !reduced;
  const names = { ...DEFAULT_LABELS, ...labels };

  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={describeSeconds(left)}
      className={slots.root({ className })}
      {...props}
    >
      {parts.map((part, index) => {
        if (variant === 'inline') {
          // Days read as "2d" ahead of a clock; the rest as hh:mm:ss.
          const isDays = part.unit === 'days';
          const nextIsClock = parts[index + 1] && parts[index + 1]!.unit !== 'days';
          return (
            <View key={part.unit} className={slots.segment()}>
              {isDays ? (
                <>
                  <Text className={slots.digit()}>{part.value}</Text>
                  <Text className={slots.suffix()}>{SUFFIX.days} </Text>
                </>
              ) : (
                <>
                  <Digits part={part} animate={animate} className={slots.digit()} />
                  {nextIsClock ? <Text className={slots.separator()}>:</Text> : null}
                </>
              )}
            </View>
          );
        }

        return (
          <View key={part.unit} className={slots.segment()}>
            <Digits part={part} animate={animate} className={slots.digit()} />
            <Text className={slots.label()}>{names[part.unit]}</Text>
          </View>
        );
      })}
    </View>
  );
});

export const Countdown = CountdownRoot;
