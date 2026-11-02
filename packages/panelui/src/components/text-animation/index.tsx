/**
 * TextAnimation — the five ways a piece of text arrives.
 *
 * ```tsx
 * <TextAnimation.Typing text="Everything ships with its accessibility done" />
 * <TextAnimation.Rotating text={['fast', 'native', 'yours']} />
 * <TextAnimation.Counting value={2048} />
 * <TextAnimation.Sliding value={price} decimals={2} />
 * <TextAnimation.Scrolling value={120} step={10} />
 * ```
 *
 * ## Why one component with five parts
 *
 * They are one idea — a value that changes and wants to be seen changing —
 * and they share every prop that says *how*: `duration`, `delay`, `loop`,
 * `enabled`. Put on the `TextAnimation` root, those become the defaults for
 * everything inside it, so a hero with three of these in it is configured once
 * rather than three times.
 *
 * ## What React Native forces
 *
 * Nested `Text` is the only thing that gets real line-breaking, and it cannot
 * be transformed — a `translateY` on it is ignored. So the two parts that
 * animate a whole string, `Typing` and `Counting`, stay real text and keep
 * wrapping; the three that slide glyphs past each other lay out as rows of
 * views, which buys the transform and costs line-breaking. None of the three
 * is ever a paragraph, so the trade only ever falls the right way.
 *
 * ## Why the digits are drawn rather than measured
 *
 * A number animated as React state is a re-render per frame. `Counting` runs
 * the value on the UI thread and only crosses back when the *rounded* number
 * changes, which for a whole number is a couple of dozen times rather than
 * sixty a second. The sliding and scrolling parts do not cross back at all:
 * every digit is already rendered, and the animation is a transform on a
 * column of them.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Text as RNText, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { cn } from '../../utils/cn';
import { Text, type TextProps } from '../../primitives/text';
import { webDeps } from '../../primitives/web-deps';

const AnimatedText = Animated.createAnimatedComponent(RNText);

/** How long a caret spends lit, and then dark. */
const CARET_PERIOD = 520;
/** The spring every number rides. Slow enough to read the digits going past. */
const NUMBER_SPRING = { damping: 26, stiffness: 90, mass: 1 } as const;
/** How far a rotating phrase travels, in points. */
const ROTATE_DISTANCE = 22;

const textAnimationVariants = tv({
  slots: {
    /*
     * `tabular-nums` on everything numeric, without exception. Proportional
     * digits are different widths, so a rolling number changes width as it
     * rolls and shoves whatever is beside it back and forth — which reads as
     * the layout being broken rather than as the number being alive.
     */
    digits: 'flex-row items-center tabular-nums',
    column: 'items-center',
    caret: 'text-foreground',
    highlight: 'rounded-lg bg-secondary',
  },
});

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

interface TextAnimationContextValue {
  duration?: number;
  delay?: number;
  loop?: boolean;
  enabled?: boolean;
}

const TextAnimationContext = createContext<TextAnimationContextValue>({});

export interface TextAnimationProps extends ViewProps {
  className?: string;
  /**
   * How long one pass takes, in milliseconds. What that measures depends on
   * the part: a keystroke for `Typing`, a phrase's turn on screen for
   * `Rotating`, the whole journey for the three that count.
   */
  duration?: number;
  /** How long to wait before starting, in milliseconds. */
  delay?: number;
  /** Start again from the beginning when the run finishes. */
  loop?: boolean;
  /**
   * Animate at all. `false` draws the finished text or the final number
   * immediately, which is also what a reduced-motion setting does.
   */
  enabled?: boolean;
  children?: ReactNode;
}

/**
 * Shared configuration, and a row to lay the parts out in.
 *
 * Optional in every case — each part works standalone with its own props, and
 * this is only here so a line with three of them in it says `duration` once.
 */
function TextAnimationRoot({
  className,
  duration,
  delay,
  loop,
  enabled,
  children,
  ...props
}: TextAnimationProps) {
  const value = useMemo(
    () => ({ duration, delay, loop, enabled }),
    [delay, duration, enabled, loop]
  );

  return (
    <TextAnimationContext.Provider value={value}>
      <View className={cn('flex-row items-center', className)} {...props}>
        {children}
      </View>
    </TextAnimationContext.Provider>
  );
}
TextAnimationRoot.displayName = 'TextAnimation';

/**
 * The part's own prop, then the root's, then the part's own default.
 *
 * Written out because `??` alone would take the root's value over an explicit
 * `false` on the part, and "the root says loop, this one does not" is the
 * whole reason the root's values are defaults rather than settings.
 */
function useShared<K extends keyof TextAnimationContextValue>(
  key: K,
  own: TextAnimationContextValue[K],
  fallback: NonNullable<TextAnimationContextValue[K]>
): NonNullable<TextAnimationContextValue[K]> {
  const inherited = useContext(TextAnimationContext);
  return (own ?? inherited[key] ?? fallback) as NonNullable<TextAnimationContextValue[K]>;
}

/**
 * The same colour at a given alpha.
 *
 * A gradient stop of `transparent` is black at zero alpha on Android, so a
 * fade to it arrives through a grey smear on the way — it has to be the same
 * colour, faded.
 */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (channels) {
    const [r, g, b] = channels.split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

/** True when nothing should move: asked for, or asked for by the system. */
function useStill(enabled: boolean): boolean {
  return useReducedMotion() || !enabled;
}

/* -------------------------------------------------------------------------- */
/* Typing                                                                     */
/* -------------------------------------------------------------------------- */

export interface TextAnimationTypingProps extends Omit<TextProps, 'children'> {
  className?: string;
  /**
   * What to type. An array is typed, held, erased and replaced by the next,
   * which is the shape a rotating headline wants.
   */
  text: string | string[];
  /** Milliseconds per keystroke. */
  duration?: number;
  /** Milliseconds before the first keystroke. */
  delay?: number;
  /** How long a finished string sits before it is erased, in milliseconds. */
  hold?: number;
  /** Start again after the last string. Only means anything for an array. */
  loop?: boolean;
  /** Draw a blinking caret after the text. */
  caret?: boolean;
  /** Styles the caret. */
  caretClassName?: string;
  /** Called once the last string has finished being typed. */
  onDone?: () => void;
  enabled?: boolean;
}

/**
 * A string arriving one character at a time.
 *
 * The text is React state rather than anything on the UI thread, and it has
 * to be: a character is a different string, and a string is a re-render
 * whichever thread decided on it. That is fine at a keystroke every 50-odd
 * milliseconds, which is three orders of magnitude slower than a frame.
 *
 * It reserves no space. A line that grows as it types pushes whatever is under
 * it down the screen on every keystroke, so give the container a height, or
 * type into a block that has one already.
 */
function TextAnimationTyping({
  className,
  text,
  duration,
  delay,
  hold = 1400,
  loop,
  caret = false,
  caretClassName,
  onDone,
  enabled,
  ...props
}: TextAnimationTypingProps) {
  const step = useShared('duration', duration, 55);
  const wait = useShared('delay', delay, 0);
  const repeat = useShared('loop', loop, false);
  const still = useStill(useShared('enabled', enabled, true));

  const strings = useMemo(() => (typeof text === 'string' ? [text] : text), [text]);
  const [shown, setShown] = useState(() => (still ? (strings[0] ?? '') : ''));
  const [typing, setTyping] = useState(false);

  // Held in a ref so the effect below does not restart the whole run every
  // time the caller passes a new inline arrow function.
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (still) {
      setShown(strings[0] ?? '');
      setTyping(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const run = (index: number) => {
      const value = strings[index] ?? '';
      let at = 0;
      setTyping(true);

      const type = () => {
        if (cancelled) return;
        setShown(value.slice(0, at));
        if (at < value.length) {
          at += 1;
          timers.push(setTimeout(type, step));
          return;
        }
        setTyping(false);
        const last = index === strings.length - 1;
        if (last && !repeat) {
          done.current?.();
          return;
        }
        timers.push(setTimeout(() => erase(value, index), hold));
      };

      type();
    };

    const erase = (value: string, index: number) => {
      if (cancelled) return;
      let at = value.length;
      setTyping(true);

      const back = () => {
        if (cancelled) return;
        setShown(value.slice(0, at));
        if (at > 0) {
          at -= 1;
          timers.push(setTimeout(back, step));
          return;
        }
        setTyping(false);
        run(index === strings.length - 1 ? 0 : index + 1);
      };

      back();
    };

    timers.push(setTimeout(() => run(0), wait));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [hold, repeat, step, still, strings, wait]);

  return (
    /*
     * The caret is nested *inside* the text rather than laid out beside it. As
     * a sibling in a row it sits against the right of the whole block, so the
     * moment a line wraps it stops being after the last character and starts
     * floating at the end of the paragraph — which is exactly where a caret
     * should never be. Nested, it is one more glyph in the flow and lands
     * wherever typing has got to, on whichever line that is.
     */
    <Text className={className} {...props}>
      {shown}
      {caret ? <TypingCaret blinking={!typing} still={still} className={caretClassName} /> : null}
    </Text>
  );
}
TextAnimationTyping.displayName = 'TextAnimation.Typing';

/**
 * The caret. Solid while characters are arriving, blinking while they are not
 * — which is what a real one does, and what says "waiting" rather than
 * "finished".
 *
 * A glyph rather than a view, because only a glyph takes part in line-breaking
 * — and because a character is sized by the font it is in, so it is the right
 * height at every text size without being told any of them. Nested text can be
 * faded but not transformed, which the opacity here is well inside.
 */
function TypingCaret({
  blinking,
  still,
  className,
}: {
  blinking: boolean;
  still: boolean;
  className?: string;
}) {
  const { caret } = textAnimationVariants();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (still || !blinking) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: CARET_PERIOD }),
        withTiming(0, { duration: CARET_PERIOD })
      ),
      -1,
      false
    );
    return () => cancelAnimation(opacity);
  }, [blinking, opacity, still]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <AnimatedText
      // Decorative: the text it follows is what a screen reader should read.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
      className={caret({ className })}
    >
      {'\u258F'}
    </AnimatedText>
  );
}

/* -------------------------------------------------------------------------- */
/* Rotating                                                                   */
/* -------------------------------------------------------------------------- */

export interface TextAnimationRotatingProps extends Omit<TextProps, 'children'> {
  className?: string;
  /** The phrases to cycle. One string never rotates, which is a valid state. */
  text: string | string[];
  /** How long each phrase holds, in milliseconds. */
  duration?: number;
  /** Milliseconds before the first change. */
  delay?: number;
  enabled?: boolean;
}

/**
 * One phrase replaced by the next, the outgoing one leaving upward and the
 * incoming one arriving from below.
 *
 * The box is sized by the longest phrase and not by the current one. A box
 * that resizes as the words change makes the line around it jump, which is
 * more distracting than the effect is interesting — and a box sized by the
 * *first* phrase clips every longer one that follows, which is worse than
 * either.
 *
 * So the width comes from a sizer: every phrase, laid out invisibly in a view
 * with no height. Yoga still takes a column's width from its children when
 * their height is fixed at zero, so the box ends up as wide as the longest
 * phrase and as tall as one line of them.
 */
function TextAnimationRotating({
  className,
  text,
  duration,
  delay,
  enabled,
  ...props
}: TextAnimationRotatingProps) {
  const period = useShared('duration', duration, 2200);
  const wait = useShared('delay', delay, 0);
  const still = useStill(useShared('enabled', enabled, true));

  const phrases = useMemo(() => (typeof text === 'string' ? [text] : text), [text]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (still || phrases.length < 2) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setIndex((current) => (current + 1) % phrases.length);
      interval = setInterval(
        () => setIndex((current) => (current + 1) % phrases.length),
        period
      );
    }, wait + period);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [period, phrases.length, still, wait]);

  return (
    <View className={cn('overflow-hidden', className)}>
      {/* The sizer. No height, so it contributes nothing but width, and
          invisible, so what it contributes is only a measurement. */}
      <View style={{ height: 0 }} pointerEvents="none" accessibilityElementsHidden>
        {phrases.map((phrase) => (
          <Text key={phrase} {...props} className="opacity-0">
            {phrase}
          </Text>
        ))}
      </View>

      {phrases.map((phrase, at) => (
        <RotatingPhrase
          key={phrase}
          phrase={phrase}
          // The first is laid out in flow and gives the box its height; the
          // rest are stacked over it, so one line is the height whichever
          // phrase is showing.
          measured={at === 0}
          active={at === index}
          still={still}
          textProps={props}
        />
      ))}
    </View>
  );
}
TextAnimationRotating.displayName = 'TextAnimation.Rotating';

function RotatingPhrase({
  phrase,
  measured,
  active,
  still,
  textProps,
}: {
  phrase: string;
  measured: boolean;
  active: boolean;
  still: boolean;
  textProps: Omit<TextProps, 'children'>;
}) {
  const travel = useSharedValue(active ? 0 : ROTATE_DISTANCE);
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (still) {
      travel.value = active ? 0 : ROTATE_DISTANCE;
      opacity.value = active ? 1 : 0;
      return;
    }
    if (active) {
      // From below, not from wherever it was left: a phrase coming back after
      // a full cycle should arrive the same way it did the first time.
      travel.value = ROTATE_DISTANCE;
      travel.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 240 });
    } else {
      travel.value = withTiming(-ROTATE_DISTANCE, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [active, opacity, still, travel]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: travel.value }],
  }));

  return (
    <Animated.View
      style={[style, measured ? undefined : { position: 'absolute', left: 0, right: 0 }]}
      // Only the phrase on screen is announced. All of them are laid out, and
      // a screen reader reading the whole list is the cost of that.
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <Text {...textProps}>{phrase}</Text>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Counting                                                                   */
/* -------------------------------------------------------------------------- */

/** Formats a number the way both counting parts agree to. */
function useFormatter(decimals: number, formatOptions?: Intl.NumberFormatOptions) {
  return useMemo(() => {
    if (formatOptions) {
      try {
        const format = new Intl.NumberFormat(undefined, formatOptions);
        return (value: number) => format.format(value);
      } catch {
        // Some engines ship a partial Intl; fall through to the plain form.
      }
    }
    return (value: number) => value.toFixed(decimals);
  }, [decimals, formatOptions]);
}

export interface TextAnimationCountingProps extends Omit<TextProps, 'children'> {
  className?: string;
  /** Where the number ends up. */
  value: number;
  /** Where it starts from. Defaults to zero. */
  from?: number;
  /** How long the whole journey takes, in milliseconds. */
  duration?: number;
  /** Milliseconds before it starts. */
  delay?: number;
  /** Digits after the point. */
  decimals?: number;
  /**
   * Formatting for the number, as `Intl.NumberFormat` options — a currency, a
   * percentage, grouped thousands. Falls back to a plain fixed-point string on
   * an engine whose `Intl` cannot do it.
   */
  formatOptions?: Intl.NumberFormatOptions;
  enabled?: boolean;
}

/**
 * A number counting up to itself.
 *
 * The text is rewritten from a Reanimated reaction rather than from state:
 * sixty re-renders a second for a number that is only ever a string is the
 * kind of thing that makes an otherwise still screen drop frames. Only the
 * rounded value crosses back to JavaScript, so the work per frame is one
 * comparison and, at most, one `setState` on a value that actually changed.
 */
function TextAnimationCounting({
  className,
  value,
  from = 0,
  duration,
  delay,
  decimals = 0,
  formatOptions,
  enabled,
  ...props
}: TextAnimationCountingProps) {
  const span = useShared('duration', duration, 1200);
  const wait = useShared('delay', delay, 0);
  const still = useStill(useShared('enabled', enabled, true));

  const format = useFormatter(decimals, formatOptions);
  const progress = useSharedValue(still ? value : from);
  const [shown, setShown] = useState(() => (still ? value : from));

  useEffect(() => {
    if (still) {
      cancelAnimation(progress);
      progress.value = value;
      setShown(value);
      return;
    }
    progress.value = from;
    const timer = setTimeout(() => {
      progress.value = withTiming(value, {
        duration: span,
        // Fast at first and settling at the end, which is what makes the last
        // few digits readable instead of a blur that stops.
        easing: Easing.out(Easing.cubic),
      });
    }, wait);

    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [from, progress, span, still, value, wait]);

  const factor = 10 ** decimals;

  useAnimatedReaction(
    () => Math.round(progress.value * factor) / factor,
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    },
    webDeps([factor])
  );

  return (
    <Text
      // The final value, always: a screen reader should be told the number,
      // not read a slot machine.
      accessibilityLabel={format(value)}
      className={cn('tabular-nums', className)}
      {...props}
    >
      {format(shown)}
    </Text>
  );
}
TextAnimationCounting.displayName = 'TextAnimation.Counting';

/* -------------------------------------------------------------------------- */
/* Sliding                                                                    */
/* -------------------------------------------------------------------------- */

export interface TextAnimationSlidingProps extends ViewProps {
  className?: string;
  /** The number to show. Each digit rolls to its new value independently. */
  value: number;
  /** Digits after the point. */
  decimals?: number;
  /** Pad the whole part to this many digits with leading zeroes. */
  padStart?: number;
  /** A separator every three digits — `','` for `1,024`. */
  thousandSeparator?: string;
  /** The decimal mark. */
  decimalSeparator?: string;
  /** Styles the digits. */
  textClassName?: string;
  /** Size of the digits, as on `Text`. */
  size?: TextProps['size'];
  /** Weight of the digits, as on `Text`. */
  weight?: TextProps['weight'];
  /** Milliseconds before the roll starts. */
  delay?: number;
  enabled?: boolean;
}

/**
 * An odometer: every digit is a column of ten, and each column rolls to the
 * one it should be showing.
 *
 * Nothing here is measured at runtime. A column is ten stacked digits and the
 * whole thing is moved by a fraction of its own height, so the roll needs no
 * `onLayout`, no first frame at the wrong offset, and no re-render per digit
 * per frame. The height comes from one hidden `0` in flow, which is what makes
 * the column as tall as the font is rather than as tall as a number happens to
 * be.
 */
function TextAnimationSliding({
  className,
  value,
  decimals = 0,
  padStart = 1,
  thousandSeparator,
  decimalSeparator = '.',
  textClassName,
  size,
  weight,
  delay,
  enabled,
  ...props
}: TextAnimationSlidingProps) {
  const wait = useShared('delay', delay, 0);
  const still = useStill(useShared('enabled', enabled, true));
  const { digits } = textAnimationVariants();

  const { whole, fraction, negative } = useMemo(() => {
    const absolute = Math.abs(value);
    const fixed = absolute.toFixed(decimals);
    const [left = '0', right = ''] = fixed.split('.');
    return {
      whole: left.padStart(padStart, '0'),
      fraction: right,
      negative: value < 0,
    };
  }, [decimals, padStart, value]);

  const columns: ReactNode[] = [];

  whole.split('').forEach((digit, index) => {
    const fromEnd = whole.length - index - 1;
    columns.push(
      <SlidingColumn
        key={`w${index}`}
        digit={Number(digit)}
        delay={wait}
        still={still}
        className={textClassName}
        size={size}
        weight={weight}
      />
    );
    if (thousandSeparator && fromEnd > 0 && fromEnd % 3 === 0) {
      columns.push(
        <Text key={`s${index}`} size={size} weight={weight} className={textClassName}>
          {thousandSeparator}
        </Text>
      );
    }
  });

  if (fraction) {
    columns.push(
      <Text key="point" size={size} weight={weight} className={textClassName}>
        {decimalSeparator}
      </Text>
    );
    fraction.split('').forEach((digit, index) => {
      columns.push(
        <SlidingColumn
          key={`f${index}`}
          digit={Number(digit)}
          delay={wait}
          still={still}
          className={textClassName}
          size={size}
          weight={weight}
        />
      );
    });
  }

  return (
    <View
      // The number as one thing, so a screen reader says "1,024" rather than
      // reading four columns of ten digits each.
      accessibilityRole="text"
      accessibilityLabel={`${negative ? '-' : ''}${whole}${fraction ? decimalSeparator + fraction : ''}`}
      className={digits({ className })}
      {...props}
    >
      {negative ? (
        <Text size={size} weight={weight} className={textClassName}>
          −
        </Text>
      ) : null}
      {columns}
    </View>
  );
}
TextAnimationSliding.displayName = 'TextAnimation.Sliding';

const TEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function SlidingColumn({
  digit,
  delay,
  still,
  className,
  size,
  weight,
}: {
  digit: number;
  delay: number;
  still: boolean;
  className?: string;
  size?: TextProps['size'];
  weight?: TextProps['weight'];
}) {
  const { column } = textAnimationVariants();
  const offset = useSharedValue(still ? digit : 0);

  useEffect(() => {
    if (still) {
      cancelAnimation(offset);
      offset.value = digit;
      return;
    }
    const timer = setTimeout(() => {
      offset.value = withSpring(digit, NUMBER_SPRING);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(offset);
    };
  }, [delay, digit, offset, still]);

  /*
   * A percentage of the column's own height, so nothing has to be measured.
   * The column is ten digits tall; moving it by `-n/10` of that puts the nth
   * one in the window, whatever the font size turns out to be.
   */
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: `${(-offset.value / TEN.length) * 100}%` }],
  }));

  return (
    <View className="overflow-hidden">
      {/* In flow and invisible: it is what gives the window a digit's height
          and a digit's width without either being a number in the source. */}
      <Text size={size} weight={weight} className={cn('opacity-0', className)}>
        0
      </Text>
      <Animated.View style={[style, { position: 'absolute', top: 0 }]} className={column()}>
        {TEN.map((n) => (
          <Text key={n} size={size} weight={weight} className={cn('tabular-nums', className)}>
            {n}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Scrolling                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextAnimationScrollingProps extends ViewProps {
  className?: string;
  /** The value to land on. */
  value: number;
  /** The gap between the values either side of it. */
  step?: number;
  /** How many values to show above and below the one in the window. */
  around?: number;
  /** How long the run takes, in milliseconds. */
  duration?: number;
  /** Milliseconds before it starts. */
  delay?: number;
  /** Formatting for each value, as `Intl.NumberFormat` options. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Styles the values. */
  textClassName?: string;
  /** Size of the values, as on `Text`. */
  size?: TextProps['size'];
  /** Weight of the values, as on `Text`. */
  weight?: TextProps['weight'];
  /**
   * Draw a band behind the value in the window, so the one being chosen is
   * told apart from the scale around it.
   */
  highlight?: boolean;
  /** Styles that band. */
  highlightClassName?: string;
  /**
   * What the top and bottom of the window fade into — a theme token name, or
   * any colour. It has to be told: the fade is painted, so it can only be the
   * right colour if it is the colour of whatever is behind the window.
   * Defaults to `--color-background`; pass `--color-card` inside a card.
   *
   * `false` turns the fade off, for a window on a surface that is not one flat
   * colour.
   */
  fadeColor?: string | false;
  enabled?: boolean;
}

/**
 * A column of values scrolling past a window, coming to rest on one.
 *
 * The difference from `Sliding` is what the reader is being told. An odometer
 * says *this number changed*; a column that scrolls past its neighbours says
 * *this number was chosen from a scale*, and the values either side of it are
 * the scale. Reach for it for a target, a threshold, a picked quantity — and
 * for a plain change of value, reach for the other one.
 */
function TextAnimationScrolling({
  className,
  value,
  step = 1,
  around = 2,
  duration,
  delay,
  formatOptions,
  textClassName,
  size,
  weight,
  highlight = false,
  highlightClassName,
  fadeColor = '--color-background',
  enabled,
  ...props
}: TextAnimationScrollingProps) {
  const span = useShared('duration', duration, 1400);
  const wait = useShared('delay', delay, 0);
  const still = useStill(useShared('enabled', enabled, true));
  const { column, highlight: band } = textAnimationVariants();

  const token = useCSSVariable(
    typeof fadeColor === 'string' && fadeColor.startsWith('--')
      ? fadeColor
      : '--color-background'
  );
  const resolvedToken = typeof token === 'string' ? token : undefined;
  const fade =
    fadeColor === false
      ? undefined
      : (fadeColor.startsWith('--') ? resolvedToken : fadeColor) ?? resolvedToken;

  const format = useFormatter(0, formatOptions);

  // The window shows `around` either side of the resting value, so the run
  // starts that many steps below zero and ends that many above the target.
  const values = useMemo(() => {
    const out: number[] = [];
    for (let i = -around; value + around * step >= i * step; i += 1) {
      out.push(i * step);
      if (out.length > 400) break;
    }
    return out;
  }, [around, step, value]);

  const rows = around * 2 + 1;
  /*
   * The window shows `rows` values and the chosen one belongs in the middle of
   * them, so the column comes to rest `around` short of the target's own index.
   * Landing on the index itself would put the answer against the top edge with
   * the whole scale below it, which reads as having overshot.
   */
  const found = values.indexOf(value);
  const target = Math.max(0, (found >= 0 ? found : values.length - 1) - around);

  const offset = useSharedValue(still ? target : 0);

  useEffect(() => {
    if (still) {
      cancelAnimation(offset);
      offset.value = target;
      return;
    }
    offset.value = 0;
    const timer = setTimeout(() => {
      offset.value = withTiming(target, {
        duration: span,
        easing: Easing.out(Easing.cubic),
      });
    }, wait);
    return () => {
      clearTimeout(timer);
      cancelAnimation(offset);
    };
  }, [offset, span, still, target, wait]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: `${(-offset.value / values.length) * 100}%` }],
  }));

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={format(value)}
      className={cn('overflow-hidden', className)}
      {...props}
    >
      {/* `rows` invisible values in flow: the window is as tall as the number
          of rows asked for, at whatever height the font makes them. */}
      <View className="opacity-0">
        {Array.from({ length: rows }, (_, i) => (
          <Text key={i} size={size} weight={weight} className={textClassName}>
            0
          </Text>
        ))}
      </View>

      {/* Behind the column, so the value reads on top of it rather than
          through it. One row tall and in the middle, which is where the run
          comes to rest. */}
      {highlight ? (
        <View
          pointerEvents="none"
          className={band({ className: highlightClassName })}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(around / rows) * 100}%`,
            height: `${(1 / rows) * 100}%`,
          }}
        />
      ) : null}

      <Animated.View
        style={[style, { position: 'absolute', top: 0, left: 0, right: 0 }]}
        className={column()}
      >
        {values.map((entry) => (
          <Text
            key={entry}
            size={size}
            weight={weight}
            className={cn('tabular-nums', textClassName)}
          >
            {format(entry)}
          </Text>
        ))}
      </Animated.View>

      {/*
       * The neighbours have to recede or the window is a list of five numbers
       * with no answer in it. Fading the edges into the surface is what says
       * the column continues past them — and it is painted rather than masked
       * because a mask needs a native module this component would otherwise
       * not want.
       */}
      {fade ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[fade, withAlpha(fade, 0)]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${(around / rows) * 100}%`,
            }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(fade, 0), fade]}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${(around / rows) * 100}%`,
            }}
          />
        </>
      ) : null}
    </View>
  );
}
TextAnimationScrolling.displayName = 'TextAnimation.Scrolling';

export const TextAnimation = Object.assign(TextAnimationRoot, {
  Typing: TextAnimationTyping,
  Rotating: TextAnimationRotating,
  Counting: TextAnimationCounting,
  Sliding: TextAnimationSliding,
  Scrolling: TextAnimationScrolling,
});
