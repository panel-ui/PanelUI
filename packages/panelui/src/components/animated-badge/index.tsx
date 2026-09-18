/**
 * AnimatedBadge — a status pill whose icon and label roll over when the status
 * changes.
 *
 * A badge that swaps its word between one frame and the next is a badge people
 * miss. The status is the smallest thing on the screen and usually not the
 * thing being looked at, so a change with no movement in it registers as
 * having always said that. Rolling the old glyph out and the new one in is
 * what makes the change itself visible.
 *
 * ```tsx
 * <AnimatedBadge status="loading">Deploying</AnimatedBadge>
 * <AnimatedBadge status="success">Live</AnimatedBadge>
 * ```
 *
 * ## The roll, and the width
 *
 * The outgoing glyph rises out of the pill and fades; the incoming one comes
 * up from below and settles on a spring, with a slight rotation and scale so
 * it reads as turning over rather than sliding. Both are clipped to the pill,
 * which is what keeps the movement inside the badge instead of over whatever
 * it sits beside.
 *
 * The pill's width springs to the new word rather than jumping, because a
 * badge in a row of them shoves its neighbours as it changes and a jump does
 * that in one frame. Everything runs on the UI thread.
 *
 * That spring covers position as well as width, so a badge set inside a
 * paragraph slides across a line the text engine has already finished laying
 * out. Pass `animateLayout={false}` there: the figure still rolls, and the
 * pill stays where the sentence puts it.
 *
 * ## Which change counts as a change
 *
 * The label is keyed on what it says, so `"Queued"` to `"Building"` rolls and
 * a re-render with the same word does not. Where the label is an element
 * rather than a string, or where two different states share a word, pass
 * `contentKey` — the badge cannot tell those apart on its own, and without a
 * key it either animates on every render or never.
 *
 * ## Reduced motion
 *
 * With the preference on, every part of this is skipped: the glyph and the
 * label cut over, the pill resizes immediately, and the pulse does not run.
 * The badge still says what it says, which is the part that mattered.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleIcon,
  InfoIcon,
  XIcon,
} from '../../icons';
import { IconColorProvider } from '../../icons';
import { Text, textChildren } from '../../primitives/text';

/** How long the pulse takes to swell and settle again, in milliseconds. */
const PULSE_DURATION = 800;

/** The roll's exit: short, because it is over before anyone looks at it. */
const ROLL_OUT = 180;

/** The roll's entrance. Springy, so the glyph lands rather than arriving. */
const ROLL_IN = { damping: 18, stiffness: 210, mass: 0.85 } as const;

export type AnimatedBadgeStatus =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'loading';

export type AnimatedBadgeSize = 'sm' | 'md';

const animatedBadgeVariants = tv({
  slots: {
    /*
     * Clipped, which is the whole mechanism: the glyphs travel a full line box
     * in and out, and without this they would be drawn over whatever the badge
     * is sitting next to.
     */
    /*
     * No border. A ring would have to be a colour per status, and there is no
     * token for one — `border` on its own resolves to `currentColor`, which
     * comes out black on every pill in every theme. The tinted fill is what
     * separates the badge from the surface, which is how `Badge` does it too.
     */
    root: 'flex-row items-center self-start overflow-hidden rounded-full',
    label: 'font-medium',
    /** The pulse's fill, behind the content and inside the same clip. */
    pulse: 'absolute inset-0',
    /** One clipped column per rolling element, so the two move independently. */
    slot: 'items-center justify-center overflow-hidden',
  },
  variants: {
    status: {
      neutral: {
        root: 'bg-muted',
        label: 'text-muted-foreground',
        pulse: 'bg-muted-foreground',
      },
      info: {
        root: 'bg-info-subtle',
        label: 'text-info-foreground',
        pulse: 'bg-info',
      },
      success: {
        root: 'bg-success-subtle',
        label: 'text-success-foreground',
        pulse: 'bg-success',
      },
      warning: {
        root: 'bg-warning-subtle',
        label: 'text-warning-foreground',
        pulse: 'bg-warning',
      },
      danger: {
        root: 'bg-destructive-subtle',
        label: 'text-destructive-foreground',
        pulse: 'bg-destructive',
      },
      loading: {
        root: 'bg-info-subtle',
        label: 'text-info-foreground',
        pulse: 'bg-info',
      },
    },
    size: {
      sm: { root: 'h-6 gap-1.5 px-2', label: 'text-[11px]' },
      md: { root: 'h-8 gap-2 px-3', label: 'text-xs' },
    },
  },
  defaultVariants: {
    status: 'neutral',
    size: 'md',
  },
});

/** The glyph each status carries, when none is passed. */
const STATUS_ICON: Record<AnimatedBadgeStatus, typeof InfoIcon> = {
  neutral: CircleIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  danger: XIcon,
  // Never drawn: `loading` uses the spinner instead, because a still glyph
  // beside the word "loading" is the one status that has to move.
  loading: CircleIcon,
};

/** Which token the glyph is tinted from, so it matches the label beside it. */
const STATUS_COLOR_VAR: Record<AnimatedBadgeStatus, string> = {
  neutral: '--color-muted-foreground',
  info: '--color-info-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  danger: '--color-destructive-foreground',
  loading: '--color-info-foreground',
};

/** Glyph sizes per badge size — the icon tracks the text, not the box. */
const ICON_SIZE: Record<AnimatedBadgeSize, number> = { sm: 12, md: 14 };

/** Milliseconds for one full turn of the loading ring. */
const SPIN_DURATION = 800;

/** Whether a value is one of the statuses the badge knows how to draw. */
function isStatus(value: unknown): value is AnimatedBadgeStatus {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATUS_ICON, value);
}

/** Values already warned about, so a list of badges does not warn once per row. */
const warnedStatuses = new Set<string>();

export interface AnimatedBadgeProps
  extends ViewProps,
    VariantProps<typeof animatedBadgeVariants> {
  /**
   * Which state the badge shows. Anything other than the six statuses is drawn
   * as `neutral`, with a warning in development — map a boolean or a state of
   * your own onto one first, as in `status={synced ? 'success' : 'neutral'}`.
   */
  status?: AnimatedBadgeStatus;
  size?: AnimatedBadgeSize;
  /** The word. Changing it rolls the old one out and the new one in. */
  children?: ReactNode;
  /** A glyph of your own, in place of the status's. */
  icon?: ReactNode;
  /** Whether a glyph is drawn at all. */
  showIcon?: boolean;
  /**
   * A slow swell behind the content, for a status that is still happening.
   * On by default while `status` is `loading`, and off otherwise — pass it
   * explicitly for a state of your own that is also still running.
   */
  pulse?: boolean;
  /**
   * What counts as a change, when the label cannot say. The label is keyed on
   * its own text, so this is only needed where it is an element rather than a
   * string, or where two states share a word.
   */
  contentKey?: string | number;
  /**
   * Whether the pill springs to its new size, and to its new place when what
   * is around it moves.
   *
   * On by default, which is what a badge standing on its own wants: growing to
   * a longer word in one frame shoves whatever is beside it.
   *
   * Turn it off for a badge set in a line of text. The animation covers
   * position as well as size, and the words around it are placed by the text
   * engine and simply appear where they now belong — so an animating badge
   * slides across a sentence that has already finished moving, which reads as
   * the badge coming loose from the line rather than as the figure changing.
   */
  animateLayout?: boolean;
  className?: string;
  labelClassName?: string;
}

export const AnimatedBadge = forwardRef<View, AnimatedBadgeProps>(
  (
    {
      status: statusProp = 'neutral',
      size = 'md',
      children,
      icon,
      showIcon = true,
      pulse,
      contentKey,
      animateLayout = true,
      className,
      labelClassName,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion();

    /*
     * Every lookup below is keyed on the status, so a value outside the six
     * finds no icon and the badge renders `undefined` as a component. That
     * crash names the badge but not the prop, so resolve it here instead.
     */
    const status: AnimatedBadgeStatus = isStatus(statusProp) ? statusProp : 'neutral';
    if (__DEV__ && !isStatus(statusProp)) {
      const received = String(statusProp);
      if (!warnedStatuses.has(received)) {
        warnedStatuses.add(received);
        console.warn(
          `AnimatedBadge: status must be one of ${Object.keys(STATUS_ICON).join(', ')}; ` +
            `received ${JSON.stringify(statusProp) ?? received}. Drawing it as neutral.`
        );
      }
    }

    const slots = animatedBadgeVariants({ status, size });

    const themeColor = useCSSVariable(STATUS_COLOR_VAR[status]);
    const iconColor = typeof themeColor === 'string' ? themeColor : undefined;
    const Icon = STATUS_ICON[status];

    const pulsing = (pulse ?? status === 'loading') && !reducedMotion;

    /*
     * Keyed on what it says, so a re-render with the same word does not roll.
     * Falling back to the status rather than to a constant means an element
     * label at least changes when the state does, which is the common case for
     * one — a caller with two states sharing a word passes `contentKey`.
     */
    const labelKey =
      contentKey ??
      (typeof children === 'string' || typeof children === 'number'
        ? children
        : status);

    /*
     * The width spring is for a badge changing, not for one arriving.
     *
     * Arming it on mount is not enough, and that is the whole subtlety: the
     * pill's first *measured* layout lands a frame or two after the first
     * render — text measures, the row settles — so a spring switched on at
     * mount still catches that settling and animates it. From the outside the
     * badge appears, drifts, and stops, on every screen that shows one.
     *
     * So it arms on the first real change instead. Nothing has to be guessed
     * about when layout has finished, because until the status or the word
     * actually moves there is nothing the spring is for.
     */
    const [armed, setArmed] = useState(false);
    const first = useRef<string | null>(null);
    useEffect(() => {
      const key = `${status}\u0000${labelKey}`;
      if (first.current === null) {
        first.current = key;
        return;
      }
      if (key !== first.current) setArmed(true);
    }, [status, labelKey]);

    const swell = useSharedValue(0);
    useEffect(() => {
      if (!pulsing) {
        swell.value = withTiming(0, { duration: 200 });
        return;
      }
      swell.value = withRepeat(
        withSequence(
          withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }, [pulsing, swell]);

    const pulseStyle = useAnimatedStyle(() => ({
      opacity: 0.08 + swell.value * 0.1,
      transform: [{ scale: 0.96 + swell.value * 0.08 }],
    }));

    return (
      <Animated.View
        ref={ref}
        // The pill grows to the new word rather than jumping to it: a badge in
        // a row of them shoves its neighbours as it changes, and a jump does
        // all of that shoving in one frame. `animateLayout={false}` turns it
        // off for a badge inside a paragraph, where the text around it does not
        // animate and a sliding pill is the only thing still moving.
        layout={
          reducedMotion || !armed || !animateLayout
            ? undefined
            : LinearTransition.springify().damping(22)
        }
        accessibilityRole="text"
        accessibilityState={{ busy: status === 'loading' }}
        className={slots.root({ className })}
        {...props}
      >
        {pulsing ? (
          <Animated.View
            pointerEvents="none"
            className={slots.pulse()}
            style={pulseStyle}
          />
        ) : null}

        {showIcon ? (
          <View className={slots.slot()} style={{ height: ICON_SIZE[size] + 4 }}>
            {/*
              A glyph passed in is somebody else's, from any set, and it reads
              the ambient colour rather than the badge's status. Provided here
              so `icon` comes out the same colour as the word beside it instead
              of the icon set's own grey.
            */}
            <IconColorProvider color={iconColor}>
              <Roll contentKey={status} reducedMotion={reducedMotion} turn>
                {icon ??
                  (status === 'loading' ? (
                    <LoadingRing
                      size={ICON_SIZE[size]}
                      color={iconColor}
                      reducedMotion={reducedMotion}
                    />
                  ) : (
                    <Icon size={ICON_SIZE[size]} color={iconColor} />
                  ))}
              </Roll>
            </IconColorProvider>
          </View>
        ) : null}

        {/* `{flag && 'Label'}` leaves a boolean here, which React draws as
            nothing — so it gets no slot either, rather than an empty gap. */}
        {children != null && typeof children !== 'boolean' ? (
          <View className={slots.slot()}>
            <Roll contentKey={labelKey} reducedMotion={reducedMotion}>
              {textChildren(children, (text) => (
                <Text className={slots.label({ className: labelClassName })}>{text}</Text>
              ))}
            </Roll>
          </View>
        ) : null}
      </Animated.View>
    );
  }
);

AnimatedBadge.displayName = 'AnimatedBadge';

/**
 * The turning ring `loading` draws in place of a glyph.
 *
 * Built here rather than borrowed from `Spinner` because this one has to be
 * the status's colour and the badge's glyph size, and `Spinner` takes both
 * from classes — a badge overriding them ends up fighting the merge, and an
 * arbitrary border width that fails to compile leaves a ring with no border at
 * all, which is an empty hole where the icon should be.
 *
 * The track and the arc are two views of the same colour rather than two
 * colours: the track is the same stroke at low opacity, so there is nothing to
 * resolve but the one value the label already uses.
 */
function LoadingRing({
  size,
  color,
  reducedMotion,
}: {
  size: number;
  color: string | undefined;
  reducedMotion: boolean;
}) {
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    turn.value = withRepeat(
      withTiming(1, { duration: SPIN_DURATION, easing: Easing.linear }),
      -1,
      false
    );
  }, [reducedMotion, turn]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));

  const ring = {
    position: 'absolute',
    inset: 0,
    borderRadius: size / 2,
    borderWidth: Math.max(1, Math.round(size / 8)),
  } as const;

  return (
    <View style={{ width: size, height: size }}>
      <View style={[ring, { borderColor: color, opacity: 0.25 }]} />
      <Animated.View
        style={[ring, { borderColor: 'transparent', borderTopColor: color }, style]}
      />
    </View>
  );
}

/**
 * One element's turn: the old one out through the top, the new one up from
 * below.
 *
 * ## Why it is one view rather than two
 *
 * The obvious build is to key the element on its content and let the old one
 * animate out while the new one animates in. It does not work here: for the
 * length of the transition both are mounted in the same box, and the box
 * becomes as large as the pair of them — a badge that swells and collapses
 * around every change.
 *
 * So there is one view throughout, and the content is swapped at the far end
 * of the roll: it travels out carrying the old word, the word is changed while
 * it is off-screen, and it comes back with the new one. Nothing is ever in the
 * badge twice.
 *
 * The two halves are deliberately not symmetrical. The entrance is what the
 * reader is meant to follow, so it springs and takes its time; the exit is
 * only getting out of the way, and an exit that lingers holds the badge empty.
 *
 * The travel is a percentage rather than a distance, so a glyph and a word of
 * different heights each clear their own box by the same amount.
 */
function Roll({
  contentKey,
  children,
  reducedMotion,
  turn = false,
}: {
  /** What counts as a change. A new value rolls; the same value does not. */
  contentKey: string | number;
  children: ReactNode;
  reducedMotion: boolean;
  /** Add a little rotation, for a glyph. A rotating word is a gimmick. */
  turn?: boolean;
}) {
  const [shownKey, setShownKey] = useState(contentKey);
  const settled = Object.is(shownKey, contentKey);

  /*
   * What is on screen while the swap is in flight. Held in a ref rather than
   * state because it is only read at the moment of the swap, and holding it in
   * state would re-render the badge on every parent render to store an element
   * nobody is looking at yet.
   */
  const outgoing = useRef<ReactNode>(children);
  const incomingKey = useRef(contentKey);
  useEffect(() => {
    incomingKey.current = contentKey;
    if (settled) outgoing.current = children;
  });

  // -1 fully below, 0 at rest, +1 fully above.
  const phase = useSharedValue(0);

  const commit = useCallback(() => {
    setShownKey(incomingKey.current);
    phase.value = -1;
    phase.value = withSpring(0, ROLL_IN);
  }, [phase]);

  useEffect(() => {
    if (settled) {
      /*
       * Changed and changed back before the roll finished. The swap that would
       * have brought the element home is never scheduled, so without this it
       * stays parked outside the badge — an empty slot where the glyph should
       * be, for as long as the status holds.
       */
      if (phase.value !== 0) phase.value = withSpring(0, ROLL_IN);
      return;
    }
    if (reducedMotion) {
      setShownKey(incomingKey.current);
      return;
    }
    phase.value = withTiming(1, { duration: ROLL_OUT }, (finished) => {
      'worklet';
      // Interrupted means another change arrived mid-roll; that change's own
      // effect owns the swap, and committing here too would swap twice.
      if (finished) runOnJS(commit)();
    });
  }, [contentKey, settled, reducedMotion, commit, phase]);

  const style = useAnimatedStyle(() => {
    const p = phase.value;
    const distance = Math.min(Math.abs(p), 1);
    return {
      opacity: 1 - distance * 0.9,
      transform: [
        { translateY: `${p * -90}%` },
        { scale: 1 - distance * 0.1 },
        { rotate: turn ? `${p * 12}deg` : '0deg' },
      ],
    };
  });

  return <Animated.View style={style}>{settled ? children : outgoing.current}</Animated.View>;
}
