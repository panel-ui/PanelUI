/**
 * FlipCard — two faces of one card, and a turn between them.
 *
 * ```tsx
 * <FlipCard>
 *   <FlipCard.Front className="items-center justify-center rounded-2xl bg-card p-6">
 *     <Text>Tap me</Text>
 *   </FlipCard.Front>
 *   <FlipCard.Back className="items-center justify-center rounded-2xl bg-primary p-6">
 *     <Text className="text-primary-foreground">The other side</Text>
 *   </FlipCard.Back>
 * </FlipCard>
 * ```
 *
 * For content that is genuinely two-sided — a bank card and its security code,
 * a term and its definition, a photograph and what it is of. Not for
 * progressive disclosure: the back replaces the front rather than extending
 * it, so anything the reader needs to compare across the turn belongs in
 * [Collapsible](../collapsible) or a second card instead.
 *
 * ## One box, and both faces in it
 *
 * The back is laid over the front, so there is one box and the two faces fill
 * it. State the height on the root and both faces take it; leave it off and
 * the front's own content decides, with the back given whatever that came to.
 *
 * A back with more in it than the front overflows rather than growing the
 * card, and the fix is a height on the root rather than more padding on the
 * back — a card whose height changed halfway through the turn would be a card
 * that moved everything under it.
 *
 * ## Both faces are hidden the same way twice
 *
 * `backfaceVisibility` is the mechanism, and it is not reliable on every
 * Android surface — so the face that has turned away is also faded out and
 * dropped behind, on the same shared value, at the halfway point. Two
 * mechanisms for one job, because the failure of the first is a card that
 * shows both faces mirrored through each other and nothing in the tree that
 * says why.
 *
 * ## Under reduce motion
 *
 * The faces swap with no turn at all. Not a shorter turn — none. The rotation
 * is the part that moves, and moving is the part the setting is about; which
 * face is showing is the information, and it is kept.
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
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { cn } from '../../utils/cn';
import type { ViewRef } from '../../primitives/refs';

/**
 * How the card settles on a face.
 *
 * Clamped, and a little heavier than the library's other springs. A card has
 * apparent mass — it is a rectangle the size of your hand — and a turn that
 * overshoots and comes back reads as a playing card being flicked rather than
 * an object being turned over. The overshoot is also the one place the hidden
 * face can appear, since it puts the rotation past 360.
 */
const SPRING = {
  damping: 18,
  stiffness: 140,
  mass: 0.9,
  overshootClamping: true,
} as const;

/**
 * Distance across the card that counts as a whole turn, as a fraction of its
 * own width or height.
 *
 * Less than the full span: a drag that has crossed two thirds of the card has
 * made its point, and requiring the whole width means the last part of every
 * deliberate flip is spent travelling to an edge the finger has to reach.
 */
const DRAG_SPAN = 0.66;

/** Velocity, in points per second, that carries a short drag over anyway. */
const FLICK_VELOCITY = 500;

const flipCardVariants = tv({
  slots: {
    root: 'relative',
    face: 'w-full',
  },
});

/** Which axis the card turns about. */
export type FlipCardDirection = 'horizontal' | 'vertical';

/** Which way round it turns. */
export type FlipCardRotation = 'normal' | 'reverse';

/** What flips the card. */
export type FlipCardTrigger = 'press' | 'drag' | 'none';

interface FlipCardContextValue {
  flipped: boolean;
  direction: FlipCardDirection;
  rotation: FlipCardRotation;
  perspective: number;
  progress: SharedValue<number>;
  flip: () => void;
}

const FlipCardContext = createContext<FlipCardContextValue | null>(null);

function useFlipCardContext(component: string) {
  const context = useContext(FlipCardContext);
  if (!context) throw new Error(`${component} must be used within a <FlipCard>`);
  return context;
}

/**
 * The card's state, for a face that needs to know which way round it is.
 *
 * `progress` runs 0 → 1 across the turn and is a shared value, so a face can
 * drive its own animation off the same turn rather than starting a second one
 * beside it.
 */
export function useFlipCard() {
  const { flipped, direction, rotation, progress, flip } = useFlipCardContext('useFlipCard');
  return { flipped, direction, rotation, progress, flip };
}

export interface FlipCardProps extends Omit<ViewProps, 'children'> {
  /** `FlipCard.Front` and `FlipCard.Back`, in either order. */
  children?: ReactNode;
  /**
   * Which axis the card turns about. `horizontal` turns it left to right about
   * its vertical axis; `vertical` turns it top over bottom.
   */
  direction?: FlipCardDirection;
  /**
   * Which way round the turn goes. `reverse` sends it the other way, for a
   * pair of cards that should not turn identically.
   */
  rotation?: FlipCardRotation;
  /**
   * Which face is showing, when the caller holds it. Leave unset to let the
   * card keep its own, and pair with `trigger="none"` for a card flipped only
   * from outside.
   */
  flipped?: boolean;
  /** Which face an uncontrolled card starts on. */
  defaultFlipped?: boolean;
  /** Fires whenever the card settles on the other face, however it got there. */
  onFlippedChange?: (flipped: boolean) => void;
  /**
   * What turns the card. `press` is a tap anywhere on it; `drag` turns it with
   * the finger and springs to whichever face is nearer on release; `none`
   * leaves it to `flipped`.
   */
  trigger?: FlipCardTrigger;
  /**
   * How deep the turn looks, in points. Smaller is more dramatic — the near
   * edge swings further out — and below about 400 a full card starts to read
   * as a door rather than a card.
   */
  perspective?: number;
  /** Classes for the card's own box. The front's size is the card's size. */
  className?: string;
}

const FlipCardRoot = forwardRef<ViewRef, FlipCardProps>(
  (
    {
      children,
      direction = 'horizontal',
      rotation = 'normal',
      flipped: flippedProp,
      defaultFlipped = false,
      onFlippedChange,
      trigger = 'press',
      perspective = 1000,
      className,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = useState(defaultFlipped);
    const isControlled = flippedProp !== undefined;
    const flipped = isControlled ? flippedProp : internal;

    const progress = useSharedValue(defaultFlipped ? 1 : 0);
    const startProgress = useSharedValue(0);
    const span = useSharedValue(0);
    const reduceMotion = useReducedMotion();

    const { root, face } = flipCardVariants();

    /*
     * The settled face is React state and the turn is a shared value, and the
     * two are kept in step from here rather than from the gesture: a drag that
     * is let go past halfway has already decided, and telling React at the
     * moment of release rather than at the end of the spring is what keeps the
     * hidden face out of the accessibility tree while it is still turning.
     */
    const settle = useCallback(
      (next: boolean) => {
        if (!isControlled) setInternal(next);
        onFlippedChange?.(next);
      },
      [isControlled, onFlippedChange]
    );

    useEffect(() => {
      progress.value = reduceMotion
        ? flipped
          ? 1
          : 0
        : withSpring(flipped ? 1 : 0, SPRING);
    }, [flipped, progress, reduceMotion]);

    useEffect(() => () => cancelAnimation(progress), [progress]);

    const flip = useCallback(() => settle(!flipped), [flipped, settle]);

    const gesture = useMemo(() => {
      const tap = Gesture.Tap()
        .enabled(trigger === 'press')
        .onEnd((_event, success) => {
          if (success) runOnJS(flip)();
        });

      /*
       * The span is read from the shared value rather than from a captured
       * number, so a card that is measured or resized mid-touch does not leave
       * the gesture dividing by the width it had when the finger landed.
       */
      const pan = Gesture.Pan()
        .enabled(trigger === 'drag')
        .onBegin(() => {
          startProgress.value = progress.value;
        })
        .onUpdate((event) => {
          const travel = direction === 'horizontal' ? event.translationX : event.translationY;
          const reach = Math.max(span.value * DRAG_SPAN, 1);
          const next = startProgress.value + travel / reach;
          progress.value = Math.min(Math.max(next, 0), 1);
        })
        .onEnd((event) => {
          const velocity = direction === 'horizontal' ? event.velocityX : event.velocityY;
          const committed =
            progress.value > 0.5 || (progress.value > 0.1 && velocity > FLICK_VELOCITY);
          runOnJS(settle)(committed);
        });

      return Gesture.Exclusive(pan, tap);
    }, [direction, flip, progress, settle, span, startProgress, trigger]);

    /*
     * One turn, read two ways. The front runs 0 → 180 and the back 180 → 360,
     * so at any moment exactly one of them has its face toward the reader.
     *
     * `sign` is not an RTL mirror. Turning a physical object over is a physical
     * direction, not a reading direction, and a card that spun the other way
     * in an Arabic layout would be a different card rather than the same one
     * laid out correctly.
     */
    const sign = rotation === 'reverse' ? -1 : 1;
    const axis = direction === 'horizontal' ? 'rotateY' : 'rotateX';

    const frontStyle = useAnimatedStyle(() => {
      const angle = interpolate(progress.value, [0, 1], [0, 180 * sign]);
      const showing = progress.value < 0.5;
      return {
        transform: [{ perspective }, { [axis]: `${angle}deg` } as never],
        opacity: showing ? 1 : 0,
        zIndex: showing ? 1 : 0,
      };
    });

    const backStyle = useAnimatedStyle(() => {
      const angle = interpolate(progress.value, [0, 1], [-180 * sign, 0]);
      const showing = progress.value >= 0.5;
      return {
        transform: [{ perspective }, { [axis]: `${angle}deg` } as never],
        opacity: showing ? 1 : 0,
        zIndex: showing ? 1 : 0,
      };
    });

    let front: ReactNode = null;
    let back: ReactNode = null;
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue;
      if (child.type === FlipCardFront) front = child;
      else if (child.type === FlipCardBack) back = child;
    }

    const context = useMemo<FlipCardContextValue>(
      () => ({ flipped, direction, rotation, perspective, progress, flip }),
      [direction, flip, flipped, perspective, progress, rotation]
    );

    /*
     * The gesture goes on the card itself rather than on a view around it.
     *
     * A wrapper is an extra box with no width of its own, and a card sized
     * `w-full` inside one is asking for a percentage of nothing — which is how
     * a two-hundred-point card ended up taller than the screen and hanging off
     * the side of it.
     *
     * The accessibility action rides here for the same reason. A drag is not
     * available to a screen reader, and a card that can only be turned by
     * dragging is a card some readers can never see the back of.
     */
    const card = (
      <View
        ref={ref}
        onLayout={(event) => {
          span.value =
            direction === 'horizontal'
              ? event.nativeEvent.layout.width
              : event.nativeEvent.layout.height;
        }}
        accessible={trigger !== 'none'}
        accessibilityRole={trigger === 'none' ? undefined : 'button'}
        accessibilityState={{ expanded: flipped }}
        accessibilityActions={
          trigger === 'none' ? undefined : [{ name: 'activate', label: 'Flip the card over' }]
        }
        onAccessibilityAction={trigger === 'none' ? undefined : flip}
        {...props}
        className={root({ className })}
      >
        {/* The front is in flow and the back is laid over it, so the card is
            the front's size on both axes and the back is handed that box. */}
        <Animated.View
          style={frontStyle}
          className={face({ className: 'grow' })}
          accessibilityElementsHidden={flipped}
          importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        >
          {front}
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, backStyle]}
          className={face()}
          accessibilityElementsHidden={!flipped}
          importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        >
          {back}
        </Animated.View>
      </View>
    );

    return (
      <FlipCardContext.Provider value={context}>
        {/* A gesture rather than a Pressable, and no press feedback with it.
            The card already answers the touch by turning; dipping it first
            makes the turn look like it started late. */}
        {trigger === 'none' ? card : <GestureDetector gesture={gesture}>{card}</GestureDetector>}
      </FlipCardContext.Provider>
    );
  }
);

export interface FlipCardFaceProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/** The face showing at rest. Its size is the card's size. */
const FlipCardFront = forwardRef<ViewRef, FlipCardFaceProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    // The backface is the first of the two mechanisms that hide a face turned
    // away; the opacity on the animated parent is the second.
    style={{ backfaceVisibility: 'hidden' }}
    {...props}
    // `h-full` of a card that states no height is ignored rather than
    // collapsing, so one shape covers both: a card given a height is filled,
    // and a card left to its content still measures it.
    className={cn('h-full w-full', className)}
  />
));

/** The face revealed by the turn, laid over the front. */
const FlipCardBack = forwardRef<ViewRef, FlipCardFaceProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    style={{ backfaceVisibility: 'hidden' }}
    {...props}
    className={cn('h-full w-full', className)}
  />
));

FlipCardRoot.displayName = 'FlipCard';
FlipCardFront.displayName = 'FlipCard.Front';
FlipCardBack.displayName = 'FlipCard.Back';

export const FlipCard = Object.assign(FlipCardRoot, {
  Front: FlipCardFront,
  Back: FlipCardBack,
});
