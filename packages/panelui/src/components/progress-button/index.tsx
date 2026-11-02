/**
 * ProgressButton — press and hold to confirm, with the wait drawn on the button.
 *
 * ```tsx
 * <ProgressButton onComplete={wipe}>
 *   <ProgressButton.Label>Hold to erase</ProgressButton.Label>
 * </ProgressButton>
 * ```
 *
 * For the action a confirmation dialog exists to slow down. A dialog asks the
 * question somewhere else and takes the answer as a tap — which is two taps,
 * and two taps in a row is a rhythm a hand falls into. A hold cannot be
 * completed by accident and cannot be completed by habit: it has to be
 * sustained, and the fill says for how much longer.
 *
 * ## The fill is the promise
 *
 * Nothing fires until the fill reaches the end. There is no tolerance near the
 * top, because a tolerance means the button sometimes commits after the reader
 * has deliberately let go — which is the one failure a confirmation control
 * cannot have. Released early, the fill drains back, in proportion to how far
 * it got.
 *
 * ## How it is drawn
 *
 * The fill is a clipped copy of the button in inverted colours, growing from
 * the leading edge. That is what keeps the label legible across the boundary:
 * a single label under a translucent wash goes muddy in the middle of the
 * wipe, exactly where the eye is. Two labels, each at full contrast on its own
 * ground, never do.
 *
 * The clip is a view under `overflow: 'hidden'`, and its width is animated.
 * Animating a width is normally a layout pass per frame; this view is
 * absolutely positioned over the button and its copy of the label is pinned to
 * the button's own width, so nothing it contains reflows as it grows.
 *
 * ## Reduced motion
 *
 * The wipe is replaced by a stepped fill that advances in fifths. The hold
 * still has to be legible — a control that asks you to wait and shows nothing
 * is a broken button — so this is a coarser indicator, not the absence of one.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { CheckIcon, IconColorProvider } from '../../icons';
import { Text, textChildren } from '../../primitives/text';
import { impactKnock, selectionTick } from '../../utils/haptics';
import {
  DEFAULT_AUTO_RESET_DELAY,
  fillDuration,
  releaseDuration,
  resolveHoldDuration,
} from './progress-button-hold';
import type { ViewRef } from '../../primitives/refs';

/** How many steps the reduced-motion fill advances in. */
const REDUCED_STEPS = 5;

/**
 * The arrival of the completed drawing.
 *
 * A spring rather than a timing, and slightly overshooting: the fill has just
 * spent two seconds moving at a constant rate, and something that lands with a
 * little weight is what tells the reader the waiting part is over.
 */
const DONE_SPRING = { damping: 14, stiffness: 220, mass: 0.6 } as const;

/** How long the completed drawing takes to leave again on a reset. */
const DONE_EXIT = 140;

/**
 * Which token the tick is drawn in, per variant.
 *
 * It sits on the finished fill, so it takes that fill's own foreground rather
 * than the button's — the same pairing `fillLabel` uses, which is what keeps
 * the contrast right in both themes without a hardcoded colour.
 */
const DONE_TINT = {
  primary: '--color-primary-foreground',
  secondary: '--color-background',
  destructive: '--color-destructive-solid-foreground',
  success: '--color-success-solid-foreground',
} as const;

const progressButtonVariants = tv({
  slots: {
    /*
     * Every variant rests on the same secondary surface, and `variant` decides
     * only what colour comes across it.
     *
     * Drawn as outlines they were four different buttons before anything had
     * happened, and the one thing they all do — wait to be held — was the
     * thing the drawing did not say. A solid ground says it: the button is
     * unfilled, and the fill is what the hold produces.
     *
     * The variant is still legible at rest, because the label carries its
     * colour. That is the half worth keeping — a destructive hold should not
     * look like an ordinary one before it is touched — and it is also the half
     * that survives the wipe, since the fill covers the ground the label was
     * standing on and the second copy takes over.
     */
    root: 'relative overflow-hidden border border-transparent bg-secondary',
    /*
     * The row inside the button. It is separate from `root` because the fill
     * has to sit over the whole button including its padding — a wipe that
     * stops at the text's own box leaves an unfilled margin down each side and
     * reads as a progress bar someone put inside a button.
     */
    content: 'flex-row items-center justify-center gap-2',
    label: 'min-w-0 shrink text-center font-medium',
    /** The inverted copy, drawn on the filled ground. */
    fill: '',
    fillLabel: 'min-w-0 shrink text-center font-medium',
  },
  variants: {
    variant: {
      primary: {
        label: 'text-primary',
        fill: 'bg-primary',
        fillLabel: 'text-primary-foreground',
      },
      secondary: {
        label: 'text-secondary-foreground',
        fill: 'bg-foreground',
        fillLabel: 'text-background',
      },
      destructive: {
        label: 'text-destructive',
        fill: 'bg-destructive',
        fillLabel: 'text-destructive-solid-foreground',
      },
      success: {
        label: 'text-success',
        fill: 'bg-success',
        fillLabel: 'text-success-solid-foreground',
      },
    },
    size: {
      // Matched to Button's boxes, and `min-h-*` for the same reason: the
      // label's glyphs grow with the system text size and the box has to grow
      // with them. The side padding is `shape`'s to decide, below.
      sm: {
        root: 'min-h-9',
        content: 'min-h-9 gap-1.5 py-2',
        label: 'text-[14px]',
        fillLabel: 'text-[14px]',
      },
      md: {
        root: 'min-h-11',
        content: 'min-h-11 py-2.5',
        label: 'text-[16px]',
        fillLabel: 'text-[16px]',
      },
      lg: {
        root: 'min-h-12',
        content: 'min-h-12 py-2.5',
        label: 'text-[18px]',
        fillLabel: 'text-[18px]',
      },
    },
    /*
     * The corner, and the side padding that follows from it.
     *
     * The fill is clipped by the button's radius, so the shape of the button is
     * also the shape of the wipe's leading edge as it comes out of the corner.
     * A pill sends that edge out as a curve, which reads as the button filling
     * up; a small radius sends it out square, which reads as a rectangle
     * sliding out from under the button. That is why `pill` is the default and
     * stays it.
     *
     * `rounded` is for a progress button standing in a row of ordinary ones —
     * a form's footer, a toolbar, a card's actions — where a lone pill among
     * `rounded-lg` buttons reads as a different kind of control rather than as
     * the one that has to be held. It is `Button`'s box exactly: same radius,
     * same padding, same minimum width, and the heights already agreed.
     */
    shape: {
      // The radius is only on the root. It has `overflow-hidden`, so it is what
      // clips the fill — and the fill's own leading edge has to stay straight:
      // rounding it would round the wipe's front as well as the button's
      // corner, which is a bar with a domed end travelling across the button.
      pill: { root: 'rounded-full' },
      rounded: { root: 'rounded-lg' },
    },
    fullWidth: {
      true: { root: 'w-full' },
    },
    disabled: {
      true: { root: 'opacity-[0.64]' },
    },
  },
  compoundVariants: [
    // A pill is wider than the equivalent Button at every size, because the
    // corner is a half-circle rather than a small radius: the curve eats into
    // the side padding, and at Button's values the first and last glyphs sit
    // against it. `rounded` has Button's corner, so it takes Button's padding.
    { shape: 'pill', size: 'sm', class: { content: 'px-3.5' } },
    { shape: 'pill', size: 'md', class: { content: 'px-5' } },
    { shape: 'pill', size: 'lg', class: { content: 'px-7' } },
    { shape: 'rounded', size: 'sm', class: { root: 'min-w-9', content: 'px-2.5' } },
    { shape: 'rounded', size: 'md', class: { root: 'min-w-11', content: 'px-4' } },
    { shape: 'rounded', size: 'lg', class: { content: 'px-6' } },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    shape: 'pill',
  },
});

type ProgressButtonVariantProps = VariantProps<typeof progressButtonVariants>;

/** How a progress button looks. */
export type ProgressButtonVariant = NonNullable<ProgressButtonVariantProps['variant']>;
/** How big a progress button is. */
export type ProgressButtonSize = NonNullable<ProgressButtonVariantProps['size']>;
/** What corner a progress button has. */
export type ProgressButtonShape = NonNullable<ProgressButtonVariantProps['shape']>;

interface ProgressButtonContextValue {
  /** `0` to `1` across the hold. */
  progress: SharedValue<number>;
  /**
   * `0` to `1` across the arrival of the completed drawing. Separate from
   * `progress` because the fill has finished by the time this starts, and the
   * two would otherwise have to share one clock running at two speeds.
   */
  done: SharedValue<number>;
  /** Width of the button, so the fill's copy of the label can match it. */
  width: number;
  completed: boolean;
  variant: ProgressButtonVariant;
  size: ProgressButtonSize;
  slots: ReturnType<typeof progressButtonVariants>;
}

const ProgressButtonContext = createContext<ProgressButtonContextValue | null>(null);

function useProgressButtonContext(component: string): ProgressButtonContextValue {
  const context = useContext(ProgressButtonContext);
  if (!context) throw new Error(`${component} must be used within a <ProgressButton>`);
  return context;
}

/** How far through the hold this button is, for something rendered inside it. */
export function useProgressButton() {
  const { progress, completed } = useProgressButtonContext('useProgressButton');
  return { progress, completed };
}

export interface ProgressButtonProps
  extends Omit<PressableProps, 'children' | 'disabled'>,
    Omit<ProgressButtonVariantProps, 'disabled'> {
  className?: string;
  /**
   * Milliseconds the button has to be held. Defaults to `2000`, and is floored
   * at `200` — a hold that completes on touch-down is a button with extra steps.
   */
  holdDuration?: number;
  /** Fires once the hold has been sustained to the end. */
  onComplete?: () => void;
  /** Fires whenever the completed state changes, including on a reset. */
  onCompletedChange?: (completed: boolean) => void;
  /** Controlled completion. Leave unset to let the button own it. */
  completed?: boolean;
  /** Return to the unfilled state after `autoResetDelay`. */
  autoReset?: boolean;
  /** Milliseconds to stay completed before resetting. Defaults to `1000`. */
  autoResetDelay?: number;
  /**
   * Dim the button and refuse the hold outright. The fill never starts, so
   * there is no half-finished state to explain.
   */
  disabled?: boolean;
  /**
   * A tick as the hold takes, and a knock when it completes. Off by default:
   * whether an action is worth feeling is the caller's call, not the control's.
   */
  haptics?: boolean;
  /**
   * The corner. `pill` by default — the fill is clipped by it, so a half-circle
   * sends the wipe's leading edge out as a curve and the button reads as
   * filling up.
   *
   * `rounded` gives it [Button](/docs/components/button)'s box exactly: the
   * same radius, side padding and minimum width, at heights that already
   * matched. Use it where the hold stands in a row of ordinary buttons — a
   * form's footer, a toolbar, a card's actions — and a lone pill would read as
   * a different kind of control rather than as the one that has to be held.
   */
  shape?: ProgressButtonShape;
  children?: ReactNode;
}

const ProgressButtonRoot = forwardRef<ViewRef, ProgressButtonProps>(function ProgressButtonRoot(
  {
    className,
    variant = 'primary',
    size = 'md',
    shape = 'pill',
    fullWidth,
    holdDuration,
    onComplete,
    onCompletedChange,
    completed: completedProp,
    autoReset = false,
    autoResetDelay = DEFAULT_AUTO_RESET_DELAY,
    disabled = false,
    haptics = false,
    accessibilityState,
    children,
    ...props
  },
  ref
) {
  const slots = progressButtonVariants({ variant, size, shape, fullWidth, disabled });
  const duration = resolveHoldDuration(holdDuration);
  const reducedMotion = useReducedMotion();

  const progress = useSharedValue(0);
  const done = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const [internalCompleted, setInternalCompleted] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = completedProp !== undefined;
  const completed = isControlled ? completedProp : internalCompleted;

  /*
   * The reaction below watches a shared value, and a shared value can reach the
   * end for reasons other than a hold — a controlled button being told it is
   * complete fills instantly. Read from a ref rather than from `completed` so
   * the guard sees the current answer without the reaction being rebuilt.
   */
  const completedRef = useRef(completed);
  completedRef.current = completed;

  const finish = useCallback(() => {
    // Already complete: the fill was set from outside, and firing the action
    // again would run it a second time for something the reader did not do.
    if (completedRef.current) return;
    if (!isControlled) setInternalCompleted(true);
    onCompletedChange?.(true);
    onComplete?.();
    if (haptics) impactKnock();
  }, [isControlled, onComplete, onCompletedChange, haptics]);

  /*
   * Completion is read off the animation rather than timed alongside it.
   *
   * A `setTimeout` for `holdDuration` and a fill for `holdDuration` are two
   * clocks that agree only while the app is idle: the moment the JS thread is
   * busy the button fires before the fill arrives, or the fill sits full while
   * nothing happens. The reaction fires on the frame the value actually
   * reaches the end, which is the frame the reader saw it get there.
   */
  useAnimatedReaction(
    () => progress.value >= 1,
    (full, was) => {
      if (full && !was) runOnJS(finish)();
    }
  );

  /*
   * Both directions are started on the UI thread, and that is not a detail.
   *
   * A shared value animated on the UI thread does not report back to
   * JavaScript, so `progress.value` read from a press handler is the value
   * from before the hold began — zero. The release computed from it either did
   * nothing or, worse, `cancelAnimation` wrote that stale zero back and the
   * fill vanished on touch-up instead of travelling home.
   *
   * `runOnUI` puts the read where the value actually lives.
   */
  const begin = useCallback(() => {
    if (disabled || completed) return;
    if (haptics) selectionTick();
    runOnUI(() => {
      'worklet';
      cancelAnimation(progress);
      const from = progress.value;
      if (from >= 1) return;
      progress.value = withTiming(1, {
        // The distance still ahead, at the fill's own rate — so a press that
        // catches the fill on its way back carries on from there rather than
        // restarting the clock.
        duration: fillDuration(from, duration),
        /*
         * Linear. A fill is constant motion, and an eased one misreports the
         * wait: it races the first half and crawls the second, or the reverse.
         *
         * Under reduced motion it steps instead, and is still a real
         * indicator — what that setting is about is continuous movement, not
         * the button saying how much longer to wait. Take that away and the
         * control asks for a hold with nothing on screen to say why.
         */
        easing: reducedMotion ? Easing.steps(REDUCED_STEPS, true) : Easing.linear,
      });
    })();
  }, [disabled, completed, haptics, progress, reducedMotion, duration]);

  /*
   * The fill, played backwards.
   *
   * Same rate, same easing, same stepping under reduced motion — only the
   * direction differs. Let go at nine tenths of a two-second hold and the fill
   * takes 1.8 seconds to travel home, which is the 1.8 seconds it took to get
   * there. A fill that vanishes has been deleted; a fill that travels back has
   * been let go, and telling those apart is the whole reason the wait is drawn
   * on the button.
   *
   * Every path that empties the fill goes through here — a hold let go, an
   * `autoReset` landing, a controlled button told it is no longer complete.
   * They were three separate assignments and two of them snapped.
   */
  const rewind = useCallback(() => {
    runOnUI(() => {
      'worklet';
      cancelAnimation(progress);
      const from = progress.value;
      if (from <= 0) {
        progress.value = 0;
        return;
      }
      progress.value = withTiming(0, {
        duration: releaseDuration(from, duration),
        easing: reducedMotion ? Easing.steps(REDUCED_STEPS, true) : Easing.linear,
      });
    })();
  }, [progress, duration, reducedMotion]);

  const abandon = useCallback(() => {
    /*
     * A completed hold has nothing to abandon. Without this the fill drains on
     * the release that follows a successful hold — the button empties, looks
     * untouched, and then refuses every press after it, because `begin` bails
     * on a completed button. That combination is a control that has silently
     * stopped working.
     */
    if (completedRef.current) return;
    rewind();
  }, [rewind]);

  const reset = useCallback(() => {
    rewind();
    if (!isControlled) setInternalCompleted(false);
    onCompletedChange?.(false);
  }, [rewind, isControlled, onCompletedChange]);

  useEffect(() => {
    if (!completed || !autoReset) return;
    resetTimer.current = setTimeout(reset, autoResetDelay);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = null;
    };
  }, [completed, autoReset, autoResetDelay, reset]);

  /*
   * The fill follows the completed state, in both directions.
   *
   * A controlled button told it is complete fills without a hold, and one told
   * it is no longer complete empties — otherwise the next hold would start from
   * a bar that is already full.
   */
  useEffect(() => {
    if (completed) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }
    rewind();
  }, [completed, progress, rewind]);

  /*
   * And the completed drawing follows it too. Under reduced motion it is a
   * swap: what that setting is about is movement, and a tick that grows is
   * movement with nothing to report.
   */
  useEffect(() => {
    if (reducedMotion) {
      done.value = completed ? 1 : 0;
      return;
    }
    done.value = completed ? withSpring(1, DONE_SPRING) : withTiming(0, { duration: DONE_EXIT });
  }, [completed, done, reducedMotion]);

  useEffect(
    () => () => {
      cancelAnimation(progress);
      cancelAnimation(done);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [progress, done]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
    props.onLayout?.(event);
  };

  /*
   * `slots` is rebuilt every render, so it is deliberately not a dependency —
   * including it would make this memo re-run every time and hand every consumer
   * a new object for no change. The variant and size it is derived from are the
   * dependencies instead.
   */
  const context = useMemo<ProgressButtonContextValue>(
    () => ({ progress, done, width, completed, variant, size, slots }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress, done, width, completed, variant, size]
  );

  /*
   * The completed drawing is part of the button rather than something every
   * call site has to remember, so one is added unless the caller wrote their
   * own. A hold that lands and shows nothing is the reader wondering whether it
   * worked, which is the thing this control exists to remove.
   */
  const written = Children.toArray(children);
  const hasDone = written.some(
    (child) => isValidElement(child) && child.type === ProgressButtonDone
  );
  const body = (
    <>
      {written.length > 0 ? written : <ProgressButtonLabel>Hold to confirm</ProgressButtonLabel>}
      {hasDone ? null : <ProgressButtonDone />}
    </>
  );

  return (
    <ProgressButtonContext.Provider value={context}>
      <Pressable
        ref={ref}
        accessibilityRole="button"
        /*
         * Spoken as what it is. A button whose label says "Hold to confirm"
         * still announces as an ordinary button to anyone who cannot see the
         * fill, and a single activation does nothing — so the hint carries the
         * instruction and the state carries the outcome.
         */
        accessibilityHint="Press and hold to confirm"
        accessibilityState={{
          ...accessibilityState,
          disabled,
          checked: completed,
        }}
        disabled={disabled}
        /*
         * The spread sits above the hold rather than below it. Underneath, a
         * caller passing `onPressIn` — reasonably, to log a tap — would replace
         * the gesture the whole control is, and the button would simply never
         * fill.
         */
        {...props}
        onPressIn={begin}
        onPressOut={abandon}
        // A few points of drift should not abandon a hold the reader is
        // still making. Fingers move.
        pressRetentionOffset={16}
        onLayout={onLayout}
        className={slots.root({ className })}
      >
        {body}
      </Pressable>
    </ProgressButtonContext.Provider>
  );
});

export interface ProgressButtonLabelProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * What the button says, drawn twice.
 *
 * The second copy is the one inside the fill, in the inverted colour, pinned to
 * the button's own width and clipped to however far the hold has got. Both are
 * the same text at the same position, so the boundary between them falls in the
 * middle of a glyph rather than between two differently laid-out lines.
 */
function ProgressButtonLabel({ className, children, ...props }: ProgressButtonLabelProps) {
  const { progress, width, slots } = useProgressButtonContext('ProgressButton.Label');

  const fillStyle = useAnimatedStyle(() => ({ width: width * progress.value }));

  return (
    <View {...props} className={slots.content({ className })}>
      {textChildren(children, (text) => (
        <Text className={slots.label()}>{text}</Text>
      ))}

      {/* The wipe. `pointerEvents` off so it never takes the press it is
          drawn on top of, and `width` fixed to the button so the copy inside
          it is laid out exactly where the original is rather than reflowing
          into whatever the clip currently allows. */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
          fillStyle,
        ]}
        className={slots.fill()}
      >
        <View style={{ width }} className={slots.content()}>
          {textChildren(children, (text) => (
            <Text className={slots.fillLabel()}>{text}</Text>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
ProgressButtonLabel.displayName = 'ProgressButton.Label';

export interface ProgressButtonDoneProps extends ViewProps {
  className?: string;
  /**
   * What the button shows once the hold has landed. A tick on its own by
   * default; children replace it, so a word beside one is
   * `<ProgressButton.Done><CheckIcon /><Text>Paid</Text></ProgressButton.Done>`.
   */
  children?: ReactNode;
}

/**
 * The drawing the button lands on.
 *
 * It sits over the finished fill rather than beside the label, so the button
 * does not change width at the moment it completes — a control that resizes as
 * it succeeds moves everything under it, and the reader's eye is on the button.
 *
 * One is added for you unless you write your own, because a hold that lands and
 * shows nothing leaves the reader checking whether it worked.
 */
function ProgressButtonDone({ className, children, ...props }: ProgressButtonDoneProps) {
  const { done, completed, variant, slots } = useProgressButtonContext('ProgressButton.Done');
  const tint = useCSSVariable(DONE_TINT[variant]);

  /*
   * It carries the fill's own colour and covers the button edge to edge.
   *
   * The alternative — fading the label out from under it — takes the fill with
   * it, because the fill is drawn inside the label so that the two copies of
   * the text line up. The button would empty at the exact moment it succeeded,
   * and the tick, drawn in the colour that reads against a full fill, would be
   * left standing on nothing.
   */
  const style = useAnimatedStyle(() => ({ opacity: done.value }));
  // The tick arrives from slightly under full size. The ground it lands on
  // does not: a background box that grows reads as the button resizing.
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.7 + done.value * 0.3 }] }));

  return (
    <Animated.View
      {...props}
      // Never takes the press: the button underneath still owns it, which is
      // what lets a completed button be reset and held again.
      pointerEvents="none"
      accessibilityElementsHidden={!completed}
      importantForAccessibility={completed ? 'auto' : 'no-hide-descendants'}
      style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, style]}
      className={slots.fill({ className: slots.content({ className }) })}
    >
      <Animated.View style={markStyle} className={slots.content()}>
        <IconColorProvider color={typeof tint === 'string' ? tint : undefined}>
          {children ?? <CheckIcon size={18} />}
        </IconColorProvider>
      </Animated.View>
    </Animated.View>
  );
}
ProgressButtonDone.displayName = 'ProgressButton.Done';

ProgressButtonRoot.displayName = 'ProgressButton';

export const ProgressButton = Object.assign(ProgressButtonRoot, {
  Label: ProgressButtonLabel,
  Done: ProgressButtonDone,
});

export {
  DEFAULT_AUTO_RESET_DELAY,
  DEFAULT_HOLD_DURATION,
  DEFAULT_RELEASE_DURATION,
  fillDuration,
  isComplete,
  releaseDuration,
  resolveHoldDuration,
} from './progress-button-hold';
