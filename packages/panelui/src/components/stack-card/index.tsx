/**
 * StackCard — a pile of cards, taken one at a time by throwing the top one off.
 *
 * ```tsx
 * <StackCard className="h-[460px]" onSwipe={(direction, index) => decide(people[index], direction)}>
 *   <StackCard.Stamp action="right" color="success">Yes</StackCard.Stamp>
 *   <StackCard.Stamp action="left" color="destructive">No</StackCard.Stamp>
 *   {people.map((person) => (
 *     <StackCard.Card key={person.id}>
 *       <Text>{person.name}</Text>
 *     </StackCard.Card>
 *   ))}
 *   <StackCard.Empty>
 *     <Text muted>Nobody left</Text>
 *   </StackCard.Empty>
 * </StackCard>
 * ```
 *
 * For a queue of things each answered with one decision and then gone: a
 * review queue, a set of flashcards, an inbox of suggestions. The gesture is
 * the answer, which is what makes it quicker than a list of rows with buttons
 * on them — and what makes it wrong for anything the reader has to compare,
 * skim or come back to. A deck shows one card and hides the rest.
 *
 * For a run of slides the reader browses rather than disposes of, use
 * [Carousel](../carousel); for one row's actions in a list, [Swipe](../swipe).
 *
 * ## The pile is one drag, read by everything
 *
 * The top card's `x` and `y` are the only values a gesture writes, and every
 * other moving part is derived from them: each stamp fades in on how far the
 * drag has carried the card toward its own direction, and the cards behind
 * climb toward the top position on the furthest of those.
 *
 * That derivation is also what makes a dismissal seamless. By the time the top
 * card has been carried far enough to leave, the second card is already
 * exactly where the top card sits — so when the deck advances there is nothing
 * left for it to move, and no frame in which the pile re-arranges itself.
 *
 * ## The deck advances after React has accepted it
 *
 * Which card is on top is held twice: as React state, for what is mounted and
 * for the callbacks, and as a shared value, for what is drawn. The card flies
 * off, the new index is *requested*, and the shared value only moves once a
 * render comes back carrying it — at which point the offset is reset in the
 * same breath.
 *
 * Doing it in that order is what keeps a controlled deck honest. An owner that
 * declines the new index has a deck that stays where it was, because nothing
 * moved on the strength of the request alone; and because the second card was
 * already at the top position when the first left, accepting it moves nothing
 * on the screen either.
 *
 * One card behind the pile's stated depth stays mounted so it can fade in as
 * it takes the last visible place, and one card ahead of the top stays mounted
 * so `undo` has something to fly back in. The rest are unmounted, which is
 * what makes a deck of five hundred cost what a deck of five costs.
 *
 * ## A deck is not reachable by a gesture alone
 *
 * A throw is not available to a screen reader, and neither is a card that can
 * only be answered by throwing it. So the top card publishes an accessibility
 * action for every direction the deck accepts, and `StackCard.Action` renders
 * the same decisions as ordinary buttons — which sighted people reach for too,
 * on the card they are not sure about.
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { tv, type VariantProps } from 'tailwind-variants';
import { IconColorProvider } from '../../icons';
import { AnimatedPressable } from '../../primitives/animated-pressable';
import { useControllableState } from '../../primitives/controllable-state';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { impactKnock, selectionTick } from '../../utils/haptics';
import {
  depthOpacity,
  directionProgress,
  effectiveDepth,
  exitTarget,
  lever,
  releaseProgress,
  releasedDirection,
  resist,
  tiltAngle,
  type StackCardDirection,
} from './stack-card-geometry';

export type { StackCardDirection } from './stack-card-geometry';

/** Puts a card back when the release did not send it anywhere. */
const RETURN_SPRING = { damping: 20, stiffness: 220, mass: 0.7 } as const;

/**
 * Brings an undone card back in. Heavier than the one that recovers a drag: a
 * card arriving from off the screen has further to travel and nothing under
 * the finger to explain a fast stop.
 */
const ARRIVE_SPRING = { damping: 22, stiffness: 160, mass: 0.9 } as const;

/** How long a card takes to leave, in milliseconds. */
const EXIT_DURATION = 240;

/** How long a fade stands in for a throw under reduce motion. */
const FADE_DURATION = 160;

/**
 * The strong ease-out. A card leaving is already travelling when the animation
 * takes over from the finger, so it has to start at speed — an ease-in here is
 * a card that stops at the moment of release and then sets off again.
 */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** How far a finger gets on an axis the deck does not accept, at most. */
const LOCKED_AXIS_GIVE = 0.18;

/** Degrees the top card turns through at most. */
const MAX_TILT = 14;

/** How much lower each card behind the top one sits, in points. */
const PEEK = 14;

/** How much smaller each card behind the top one is drawn. */
const SHRINK = 0.055;

/** Degrees a fanned card is turned per place back in the pile. */
const FAN_TILT = 4;

/** Sideways splay of a fanned card per place back, in points. */
const FAN_SPREAD = 10;

/** Card sizes to fall back on before the pile has been measured. */
const UNMEASURED_WIDTH = 320;
const UNMEASURED_HEIGHT = 420;

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

interface StackCardContextValue {
  /** The top card's offset. Written only by the pan and the exit animation. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** The top card's opacity, which only reduce motion ever moves. */
  fade: SharedValue<number>;
  /** Which way the top card pivots, from where it was taken hold of. */
  pivot: SharedValue<number>;
  /** The furthest any accepted direction has been carried, 0 to 1. */
  release: SharedValue<number>;
  /** Which card is on top, as the UI thread draws it. */
  active: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  threshold: number;
  /** Where the deck is in React, which is what a caller reads. */
  index: number;
  count: number;
  disabled: boolean;
  canUndo: boolean;
  send: (direction: StackCardDirection) => void;
  undo: () => void;
  reset: () => void;
}

const StackCardContext = createContext<StackCardContextValue | null>(null);

function useStackCardContext(component: string) {
  const context = useContext(StackCardContext);
  if (!context) throw new Error(`${component} must be used within a <StackCard>`);
  return context;
}

/**
 * The deck's state, for a control that lives outside the pile — a counter, a
 * progress bar, a button in a toolbar.
 *
 * `release` is a shared value running 0 to 1 as the top card is carried toward
 * leaving, so something beside the deck can move with the drag rather than
 * starting a second animation next to it.
 */
export function useStackCard() {
  const { index, count, canUndo, release, send, undo, reset } =
    useStackCardContext('useStackCard');
  return {
    /** How many cards have been answered, which is also the top card's index. */
    index,
    /** How many cards the deck was given. */
    count,
    /** How many are left, the top one included. */
    remaining: Math.max(0, count - index),
    /** Whether there is a card to bring back. */
    canUndo,
    release,
    send,
    undo,
    reset,
  };
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

/** How the cards behind the top one are arranged. */
export type StackCardLayout = 'stack' | 'fan' | 'flat';

export interface StackCardHandle {
  /** Send the top card away as though it had been thrown that way. */
  swipe: (direction: StackCardDirection) => void;
  /** Bring the last card back, and with it the decision that removed it. */
  undo: () => void;
  /** Put every card back. */
  reset: () => void;
}

const stackCardVariants = tv({
  slots: {
    root: 'w-full',
    /*
     * The cards are laid over each other, so the pile has no height of its
     * own and takes what is left after anything else in the root. That is what
     * lets a caller state one height for the whole control and get a row of
     * buttons under a pile that fills the rest.
     */
    pile: 'relative w-full flex-1',
    card: 'absolute inset-0',
  },
});

export interface StackCardProps extends Omit<ViewProps, 'children'> {
  /**
   * A `StackCard.Card` for each card, plus any of `StackCard.Stamp`,
   * `StackCard.Empty` and `StackCard.Actions`, in any order. Anything else is
   * laid out under the pile.
   */
  children?: ReactNode;
  /**
   * Which card is on top, when the caller holds it. Leave unset to let the
   * deck keep its own. A controlled deck that declines a request stays where
   * it is, so this is also how a decision is confirmed before it is taken.
   */
  index?: number;
  /** Which card an uncontrolled deck starts on. */
  defaultIndex?: number;
  /** Fires whenever the deck asks to move, with the index it is asking for. */
  onIndexChange?: (index: number) => void;
  /**
   * Fires when a card leaves, with the way it went and the index it was at.
   * Not called by `undo` — the index going back is what reports that.
   */
  onSwipe?: (direction: StackCardDirection, index: number) => void;
  /** Fires once when the last card leaves. */
  onEmpty?: () => void;
  /**
   * Which ways a card may be thrown. A direction left out still follows the
   * finger a little and then comes back, rather than refusing to move at all —
   * a card that does not budge reads as a frozen screen.
   */
  directions?: readonly StackCardDirection[];
  /**
   * How the cards behind the top one are arranged. `stack` steps them down and
   * back; `fan` turns them alternately, like a hand of cards; `flat` hides them
   * entirely, for full-bleed cards where a peeking edge is only clutter.
   */
  layout?: StackCardLayout;
  /** How many cards are drawn behind the top one. Two is a pile; five is a mess. */
  depth?: number;
  /**
   * How far a card has to be taken for a release to send it away, as a
   * fraction of the card. Momentum counts toward it, so a flick clears it
   * without travelling.
   */
  threshold?: number;
  /** Stop the deck taking a gesture, without changing how it looks. */
  disabled?: boolean;
  /** A tick when a drag first reaches the point of no return, and a knock as the card goes. */
  haptics?: boolean;
  /**
   * What a screen reader is offered for each direction, in place of "Swipe
   * left". Name the decision — `{ left: 'Skip', right: 'Save' }`.
   */
  directionLabels?: Partial<Record<StackCardDirection, string>>;
  /** Classes for the whole control. Give it a height; the pile fills what is left. */
  className?: string;
  /** Classes for the box the cards are laid out in. */
  pileClassName?: string;
}

const StackCardRoot = forwardRef<StackCardHandle, StackCardProps>(
  (
    {
      children,
      index: indexProp,
      defaultIndex = 0,
      onIndexChange,
      onSwipe,
      onEmpty,
      directions = ['left', 'right'],
      layout = 'stack',
      depth = 2,
      threshold = 0.3,
      disabled = false,
      haptics = true,
      directionLabels,
      className,
      pileClassName,
      ...props
    },
    ref
  ) => {
    const cards: ReactElement[] = [];
    const stamps: ReactElement[] = [];
    let empty: ReactNode = null;
    const below: ReactNode[] = [];
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue;
      if (child.type === StackCardCard) cards.push(child);
      else if (child.type === StackCardStamp) stamps.push(child);
      else if (child.type === StackCardEmpty) empty = child;
      else below.push(child);
    }
    const count = cards.length;

    const { value: index, setValue: setIndex } = useControllableState({
      value: indexProp,
      defaultValue: defaultIndex,
      onChange: onIndexChange,
    });

    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const fade = useSharedValue(1);
    const pivot = useSharedValue(1);
    const active = useSharedValue(index);
    const width = useSharedValue(0);
    const height = useSharedValue(0);
    const reduceMotion = useReducedMotion();

    /*
     * The gesture's own copies of the two props it reads.
     *
     * A pan handler is built once and then runs on the UI thread, so a prop it
     * captured is the prop as it was when the handler was made. Reading them
     * from shared values instead means a deck whose accepted directions or
     * threshold change behaves as it is configured now, including mid-touch.
     */
    const allowed = useSharedValue<StackCardDirection[]>([...directions]);
    const reach = useSharedValue(threshold);
    useEffect(() => {
      allowed.value = [...directions];
    }, [allowed, directions]);
    useEffect(() => {
      reach.value = threshold;
    }, [reach, threshold]);

    const release = useDerivedValue(() =>
      releaseProgress(allowed.value, x.value, y.value, width.value, height.value, reach.value)
    );

    /*
     * Which way each answered card went, so `undo` can put one back out where
     * it came from before bringing it in. A ref rather than state: nothing is
     * rendered from it, and a decision recorded at the end of an animation
     * must not schedule a render of its own.
     */
    const history = useRef<StackCardDirection[]>([]);
    /** Set when a card should arrive rather than simply appear. */
    const arriving = useRef<StackCardDirection | null>(null);
    const reportedEmpty = useRef(false);

    useEffect(
      () => () => {
        cancelAnimation(x);
        cancelAnimation(y);
        cancelAnimation(fade);
      },
      [fade, x, y]
    );

    /*
     * The one place the drawn deck is moved, and it runs after every render
     * rather than on a change of `index`.
     *
     * Everything else only ever *asks* for an index. Nothing is drawn on the
     * strength of a request, so a controlled owner that declines one has a
     * deck that has not moved, and one that accepts gets the move and the
     * reset of the outgoing card's offset inside a single commit — which is
     * what stops the incoming card being drawn for a frame at the position the
     * outgoing one flew to.
     */
    useEffect(() => {
      if (active.value === index) return;
      active.value = index;
      fade.value = 1;

      const entrance = arriving.current;
      arriving.current = null;
      if (!entrance || reduceMotion) {
        x.value = 0;
        y.value = 0;
        return;
      }

      const from = exitTarget(
        entrance,
        width.value || UNMEASURED_WIDTH,
        height.value || UNMEASURED_HEIGHT,
        0,
        0
      );
      x.value = from.x;
      y.value = from.y;
      x.value = withSpring(0, ARRIVE_SPRING);
      y.value = withSpring(0, ARRIVE_SPRING);
    });

    useEffect(() => {
      if (index >= count && count > 0 && !reportedEmpty.current) {
        reportedEmpty.current = true;
        onEmpty?.();
        return;
      }
      if (index < count) reportedEmpty.current = false;
    }, [count, index, onEmpty]);

    /** Runs once the outgoing card is off the screen. */
    const requestNext = useCallback(
      (direction: StackCardDirection, from: number) => {
        history.current.push(direction);
        setIndex(from + 1);
        onSwipe?.(direction, from);
        if (haptics) impactKnock();
      },
      [haptics, onSwipe, setIndex]
    );

    const send = useCallback(
      (direction: StackCardDirection) => {
        if (index >= count) return;
        const from = index;

        if (reduceMotion) {
          // The throw is the part that moves, and moving is the part the
          // setting is about. The card still goes; it goes by fading.
          fade.value = withTiming(0, { duration: FADE_DURATION }, (finished) => {
            if (finished) runOnJS(requestNext)(direction, from);
          });
          return;
        }

        const target = exitTarget(
          direction,
          width.value || UNMEASURED_WIDTH,
          height.value || UNMEASURED_HEIGHT,
          x.value,
          y.value
        );
        const timing = { duration: EXIT_DURATION, easing: EASE_OUT };
        y.value = withTiming(target.y, timing);
        x.value = withTiming(target.x, timing, (finished) => {
          if (finished) runOnJS(requestNext)(direction, from);
        });
      },
      [count, fade, height, index, reduceMotion, requestNext, width, x, y]
    );

    const undo = useCallback(() => {
      if (index <= 0) return;
      arriving.current = history.current.pop() ?? 'left';
      setIndex(index - 1);
    }, [index, setIndex]);

    const reset = useCallback(() => {
      history.current = [];
      arriving.current = null;
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(fade);
      setIndex(0);
    }, [fade, setIndex, x, y]);

    useImperativeHandle(ref, () => ({ swipe: send, undo, reset }), [send, undo, reset]);

    /*
     * One tick, when the drag first reaches the point where letting go would
     * send the card. Latched on the reaction's own previous value, so dragging
     * back and forth across the line does not rattle — and fired at the
     * crossing rather than at the release, because the crossing is the moment
     * worth knowing about while there is still a choice.
     */
    useAnimatedReaction(
      () => release.value >= 1,
      (past, wasPast) => {
        if (wasPast === null || past === wasPast || !past) return;
        runOnJS(tick)(haptics);
      },
      [haptics]
    );

    /*
     * Which axes the deck answers to, read at build time rather than from the
     * shared value: an activation constraint is part of how the gesture is
     * constructed, so it cannot be changed from inside a handler.
     */
    const takesSideways = directions.includes('left') || directions.includes('right');
    const takesUpright = directions.includes('up') || directions.includes('down');

    const gesture = useMemo(
      () =>
        Gesture.Pan()
          /*
           * A pan with no declared axis inside a scrolling screen wins every
           * scroll that starts on the card, and the screen reads as broken in
           * a way that looks like a scrolling bug rather than a gesture one.
           * A deck that takes both axes has nothing to give up and declares
           * neither.
           */
          .activeOffsetX(takesSideways && !takesUpright ? [-10, 10] : [-1, 1])
          .activeOffsetY(takesUpright && !takesSideways ? [-10, 10] : [-1, 1])
          .onBegin((event) => {
            cancelAnimation(x);
            cancelAnimation(y);
            pivot.value = lever(event.y, height.value);
          })
          .onUpdate((event) => {
            const ways = allowed.value;
            const sideways = ways.indexOf('left') >= 0 || ways.indexOf('right') >= 0;
            const upright = ways.indexOf('up') >= 0 || ways.indexOf('down') >= 0;
            x.value = sideways
              ? event.translationX
              : resist(event.translationX, width.value, LOCKED_AXIS_GIVE);
            y.value = upright
              ? event.translationY
              : resist(event.translationY, height.value, LOCKED_AXIS_GIVE);
          })
          .onEnd((event) => {
            const direction = releasedDirection(
              allowed.value,
              x.value,
              y.value,
              event.velocityX,
              event.velocityY,
              width.value,
              height.value,
              reach.value
            );
            if (direction) {
              runOnJS(send)(direction);
              return;
            }
            // The velocity goes into the spring, so there is no seam between
            // the finger letting go and the card carrying on.
            x.value = withSpring(0, { ...RETURN_SPRING, velocity: event.velocityX });
            y.value = withSpring(0, { ...RETURN_SPRING, velocity: event.velocityY });
          }),
      [allowed, height, pivot, reach, send, takesSideways, takesUpright, width, x, y]
    );

    const context = useMemo<StackCardContextValue>(
      () => ({
        x,
        y,
        fade,
        pivot,
        release,
        active,
        width,
        height,
        threshold,
        index,
        count,
        disabled,
        canUndo: index > 0,
        send,
        undo,
        reset,
      }),
      [
        active,
        count,
        disabled,
        fade,
        height,
        index,
        pivot,
        release,
        reset,
        send,
        threshold,
        undo,
        width,
        x,
        y,
      ]
    );

    const slots = stackCardVariants();

    /*
     * The window of cards that stay mounted: one behind the last visible
     * place, so it fades in rather than appearing, and one ahead of the top,
     * so `undo` has a card to fly back in.
     */
    const first = Math.max(0, index - 1);
    const last = Math.min(count - 1, index + depth + 1);

    const accessibilityActions = useMemo(
      () =>
        directions.map((direction) => ({
          name: direction,
          label: directionLabels?.[direction] ?? DEFAULT_DIRECTION_LABELS[direction],
        })),
      [directionLabels, directions]
    );

    return (
      <StackCardContext.Provider value={context}>
        <View {...props} className={slots.root({ className })}>
          <View
            onLayout={(event: LayoutChangeEvent) => {
              width.value = event.nativeEvent.layout.width;
              height.value = event.nativeEvent.layout.height;
            }}
            className={slots.pile({ className: pileClassName })}
          >
            {index >= count ? empty : null}
            {cards.map((card, cardIndex) => {
              if (cardIndex < first || cardIndex > last) return null;
              const top = cardIndex === index;
              const live = top && !disabled;
              const slot = (
                <StackCardSlot
                  key={cardIndex}
                  cardIndex={cardIndex}
                  depth={depth}
                  layout={layout}
                  top={top}
                  live={live}
                  accessibilityActions={live ? accessibilityActions : undefined}
                  onAccessibilityAction={
                    live
                      ? (event: AccessibilityActionEvent) =>
                          send(event.nativeEvent.actionName as StackCardDirection)
                      : undefined
                  }
                >
                  {card}
                  {top ? stamps : null}
                </StackCardSlot>
              );

              /*
               * Only the top card is wrapped in a detector. Gesture-handler
               * resolves overlapping pans by the view tree rather than by
               * z-order, so a live detector on a card underneath would take
               * touches meant for the one in front of it.
               */
              return live ? (
                <GestureDetector key={cardIndex} gesture={gesture}>
                  {slot}
                </GestureDetector>
              ) : (
                slot
              );
            })}
          </View>
          {below}
        </View>
      </StackCardContext.Provider>
    );
  }
);

/** What a screen reader is offered when the caller names nothing better. */
const DEFAULT_DIRECTION_LABELS: Record<StackCardDirection, string> = {
  left: 'Swipe left',
  right: 'Swipe right',
  up: 'Swipe up',
  down: 'Swipe down',
};

/**
 * Scheduled from the threshold reaction, so the question of whether haptics
 * are wanted at all is answered off the UI thread.
 */
function tick(enabled: boolean) {
  if (enabled) selectionTick();
}

/* -------------------------------------------------------------------------- */
/* Slot                                                                       */
/* -------------------------------------------------------------------------- */

interface StackCardSlotProps {
  cardIndex: number;
  depth: number;
  layout: StackCardLayout;
  /** Whether this is the card on top, which is the only one a reader is shown. */
  top: boolean;
  /** Whether it also takes touches — false while the deck is disabled. */
  live: boolean;
  children: ReactNode;
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}

/**
 * One place in the pile, and the rule that puts a card there.
 *
 * A slot styles itself from its own distance to the top rather than being told
 * where to sit, so the deck advancing is one shared value changing and no
 * re-render at all — and a card mid-flight is styled by the same rule as the
 * pile behind it rather than by a second one that has to agree with it.
 */
function StackCardSlot({
  cardIndex,
  depth,
  layout,
  top,
  live,
  children,
  accessibilityActions,
  onAccessibilityAction,
}: StackCardSlotProps) {
  const { x, y, fade, pivot, release, active, width } = useStackCardContext('StackCard.Card');
  const { card } = stackCardVariants();
  /** Fixed per card, so a fan does not re-deal itself as the deck advances. */
  const side = cardIndex % 2 === 0 ? 1 : -1;

  const style = useAnimatedStyle(() => {
    const distance = cardIndex - active.value;

    /*
     * Answered, and still mounted only so `undo` has something to bring back.
     * Drawn nowhere until it is asked for.
     */
    if (distance < 0) return { opacity: 0, zIndex: 0, transform: [{ scale: 1 }] };

    if (distance === 0) {
      return {
        opacity: fade.value,
        zIndex: 200,
        transform: [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: `${tiltAngle(x.value, width.value, MAX_TILT, pivot.value)}deg` },
        ],
      };
    }

    const behind = effectiveDepth(distance, release.value);
    const opacity = depthOpacity(behind, depth);
    const zIndex = Math.round(100 - behind * 10);

    if (layout === 'flat') {
      // Nothing is drawn behind the top card, so the next one waits exactly
      // where the top card is and is simply uncovered as that one leaves.
      return { opacity: behind < 1 ? opacity : 0, zIndex, transform: [{ scale: 1 }] };
    }

    if (layout === 'fan') {
      return {
        opacity,
        zIndex,
        transform: [
          { translateX: side * behind * FAN_SPREAD },
          { translateY: behind * PEEK * 0.35 },
          { rotate: `${side * behind * FAN_TILT}deg` },
          { scale: 1 - behind * SHRINK * 0.6 },
        ],
      };
    }

    return {
      opacity,
      zIndex,
      transform: [{ translateY: behind * PEEK }, { scale: 1 - behind * SHRINK }],
    };
  });

  return (
    <Animated.View
      style={[style, { pointerEvents: live ? 'auto' : 'none' }]}
      className={card()}
      // Every card but the top one is out of the reading order. A pile is one
      // card as far as a reader is concerned, and the rest are its shadow.
      accessibilityElementsHidden={!top}
      importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      {children}
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export interface StackCardCardProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * One card. Filled, bordered and rounded out of the box, so a deck of plain
 * content already reads as a deck, and restyled from `className` like anything
 * else. It fills the pile on both axes: the pile's box is the card's size.
 */
const StackCardCard = forwardRef<View, StackCardCardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    {...props}
    className={cn(
      'h-full w-full overflow-hidden rounded-3xl border border-border bg-card',
      className
    )}
  />
));

/* -------------------------------------------------------------------------- */
/* Stamp                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A stamp is a filled block of colour with a word on it, turned a few degrees
 * so it reads as pressed onto the card rather than laid out on it.
 *
 * The fill is the status colour at full strength rather than a tint of it: a
 * stamp exists only for the moment it appears, and a six-per-cent wash of the
 * card's own surface is a smudge rather than an answer. The word is carried in
 * white, which is what the status colours are chosen to take — a status's
 * `-foreground` token is its darker text form, meant for a neutral surface,
 * and over the fill it is the same hue twice.
 *
 * It sits in the corner the card is being pulled away from, which is also the
 * corner the thumb is not over.
 */
const stampVariants = tv({
  slots: {
    root: 'absolute inset-x-6 z-10',
    pill: 'rounded-xl px-4 py-2',
    label: 'text-lg font-bold uppercase tracking-widest',
  },
  variants: {
    color: {
      default: { pill: 'bg-muted-foreground', label: 'text-background' },
      primary: { pill: 'bg-primary', label: 'text-primary-foreground' },
      success: { pill: 'bg-success', label: 'text-success-solid-foreground' },
      warning: { pill: 'bg-warning', label: 'text-warning-solid-foreground' },
      info: { pill: 'bg-info', label: 'text-info-solid-foreground' },
      destructive: {
        pill: 'bg-destructive',
        label: 'text-destructive-solid-foreground',
      },
    },
    action: {
      left: { root: 'top-6 items-end', pill: 'rotate-12' },
      right: { root: 'top-6 items-start', pill: '-rotate-12' },
      up: { root: 'bottom-6 items-center' },
      down: { root: 'top-6 items-center' },
    },
  },
  defaultVariants: {
    color: 'default',
    action: 'right',
  },
});

export type StackCardStampColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'destructive';

export interface StackCardStampProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof stampVariants> {
  className?: string;
  /** The word, or anything else to draw on the stamp. */
  children?: ReactNode;
  /** Which direction the stamp answers for. Also where on the card it goes. */
  action?: StackCardDirection;
  /** Extra classes for the label, when the stamp is given a string. */
  labelClassName?: string;
}

/**
 * The answer a throw is about to give, faded in as the card is carried toward
 * giving it.
 *
 * It reaches full strength exactly where letting go would commit, so a solid
 * stamp and the haptic tick are the same statement made twice — which is the
 * point, since the haptic is off for a lot of people and silent on most
 * Android hardware.
 */
const StackCardStamp = forwardRef<View, StackCardStampProps>(
  (
    { className, labelClassName, color = 'default', action = 'right', children, ...props },
    ref
  ) => {
    const { x, y, width, height, threshold } = useStackCardContext('StackCard.Stamp');
    const slots = stampVariants({ color, action });

    const style = useAnimatedStyle(() => {
      const progress = directionProgress(
        action,
        x.value,
        y.value,
        width.value,
        height.value,
        threshold
      );
      return {
        opacity: progress,
        // Landing rather than appearing: it is stamped on as the card commits.
        transform: [{ scale: interpolate(progress, [0, 1], [0.8, 1]) }],
      };
    });

    return (
      <Animated.View ref={ref} style={style} {...props} className={slots.root({ className })}>
        <View className={slots.pill()}>
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text className={slots.label({ className: labelClassName })}>{children}</Text>
          ) : (
            children
          )}
        </View>
      </Animated.View>
    );
  }
);

/* -------------------------------------------------------------------------- */
/* Empty                                                                      */
/* -------------------------------------------------------------------------- */

export interface StackCardEmptyProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * What is under the deck once the last card has gone.
 *
 * Mounted only when the deck is exhausted, so a card flying off never crosses
 * it. A deck with none of these leaves the empty box the cards were in, which
 * is the right answer when something else on the screen already says the queue
 * is finished.
 */
const StackCardEmpty = forwardRef<View, StackCardEmptyProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    {...props}
    className={cn(
      'absolute inset-0 items-center justify-center gap-2 rounded-3xl border border-dashed border-border p-6',
      className
    )}
  />
));

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export interface StackCardActionsProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The row of buttons under the pile. Laid out after it rather than over it, so
 * the buttons are not competing with the card for the same touches.
 */
const StackCardActions = forwardRef<View, StackCardActionsProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      {...props}
      className={cn('flex-row items-center justify-center gap-4 pt-5', className)}
    />
  )
);

const actionVariants = tv({
  slots: {
    root: 'items-center justify-center rounded-full border',
  },
  variants: {
    color: {
      default: { root: 'border-border bg-card' },
      primary: { root: 'border-primary bg-primary' },
      success: { root: 'border-success bg-success' },
      warning: { root: 'border-warning bg-warning' },
      info: { root: 'border-info bg-info' },
      destructive: { root: 'border-destructive bg-destructive' },
    },
    size: {
      sm: { root: 'h-10 w-10' },
      md: { root: 'h-14 w-14' },
      lg: { root: 'h-16 w-16' },
    },
  },
  defaultVariants: {
    color: 'default',
    size: 'md',
  },
});

/** How big a glyph is drawn on each button size. */
const ACTION_ICON_SIZE = { sm: 18, md: 24, lg: 28 } as const;

export interface StackCardActionProps
  extends Omit<ViewProps, 'children'>,
    VariantProps<typeof actionVariants> {
  className?: string;
  /** What pressing it does: send the top card that way, or bring the last one back. */
  action: StackCardDirection | 'undo';
  /** The glyph. Sized and tinted by the button — pass neither. */
  icon?: ReactNode;
  /**
   * What a screen reader is offered. Falls back to "Undo", or to the plain
   * name of the direction.
   */
  label?: string;
  /** Run after the deck has been told, for a sound or a log. */
  onPress?: () => void;
}

/**
 * One decision as an ordinary button.
 *
 * This is the accessible path through a deck, and it is also the path a lot of
 * sighted people take on the card they are unsure about: a throw looks
 * irreversible in a way a tap does not, so the pair is not redundant.
 *
 * `undo` disables itself on the first card, where there is nothing to bring
 * back, and every other action disables itself once the deck is empty — a
 * button that still looks pressable over an exhausted deck is the commonest
 * way one of these ends up feeling broken.
 */
const StackCardAction = forwardRef<View, StackCardActionProps>(
  ({ className, action, icon, label, color = 'default', size = 'md', onPress, ...props }, ref) => {
    const context = useStackCardContext('StackCard.Action');
    const slots = actionVariants({ color, size });
    const tint = useActionTint(color as StackCardStampColor);

    const isUndo = action === 'undo';
    const disabled =
      context.disabled || (isUndo ? !context.canUndo : context.index >= context.count);

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={label ?? (isUndo ? 'Undo' : DEFAULT_DIRECTION_LABELS[action])}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          if (isUndo) context.undo();
          else context.send(action);
          onPress?.();
        }}
        {...props}
        className={slots.root({ className: cn(disabled && 'opacity-40', className) })}
      >
        <IconColorProvider color={tint}>{sizeIcon(icon, size ?? 'md')}</IconColorProvider>
      </AnimatedPressable>
    );
  }
);

/**
 * The glyph at button size, unless the caller asked for one. Sized here rather
 * than at every call site, because a row of these reads as a set only while
 * the icons in it match.
 */
function sizeIcon(icon: ReactNode, size: 'sm' | 'md' | 'lg'): ReactNode {
  if (!isValidElement<{ size?: number }>(icon)) return icon;
  if (icon.props.size !== undefined) return icon;
  return cloneElement(icon, { size: ACTION_ICON_SIZE[size] });
}

/**
 * The colour a glyph is drawn in on a button — the token that reads against
 * its fill. Resolved from the theme wherever the theme has an answer, since a
 * hex stops being right the moment the theme inverts; white is the exception,
 * because a status fill is the same saturated colour in every theme and white
 * is what it carries.
 *
 * Both tokens are read on every render because a hook cannot be called for one
 * branch only. They are variable lookups, not work.
 */
function useActionTint(color: StackCardStampColor): string | undefined {
  const foreground = useCSSVariable('--color-foreground');
  const primary = useCSSVariable('--color-primary-foreground');

  if (color === 'default') return typeof foreground === 'string' ? foreground : undefined;
  if (color === 'primary') return typeof primary === 'string' ? primary : undefined;
  return '#ffffff';
}

StackCardRoot.displayName = 'StackCard';
StackCardCard.displayName = 'StackCard.Card';
StackCardStamp.displayName = 'StackCard.Stamp';
StackCardEmpty.displayName = 'StackCard.Empty';
StackCardActions.displayName = 'StackCard.Actions';
StackCardAction.displayName = 'StackCard.Action';

export const StackCard = Object.assign(StackCardRoot, {
  Card: StackCardCard,
  Stamp: StackCardStamp,
  Empty: StackCardEmpty,
  Actions: StackCardActions,
  Action: StackCardAction,
});
