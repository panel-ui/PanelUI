/**
 * Compare — two versions of one picture, with a seam the reader drags across
 * it.
 *
 * ```tsx
 * <Compare height={260}>
 *   <Compare.After>
 *     <Image source={retouched} style={{ width: '100%', height: '100%' }} />
 *   </Compare.After>
 *   <Compare.Before>
 *     <Image source={original} style={{ width: '100%', height: '100%' }} />
 *   </Compare.Before>
 *   <Compare.Handle />
 * </Compare>
 * ```
 *
 * ## What it is for
 *
 * Showing that two images differ, when they differ in a way a pair of
 * thumbnails side by side will not carry. Retouching, a filter, a render at two
 * quality settings, a map at two dates: the change is spread across the frame
 * rather than gathered in one place, and the eye cannot hold one image well
 * enough to spot it in the other.
 *
 * The seam works because both versions are in the same place on the screen at
 * the same scale. Every pixel the reader is comparing is a pixel that was just
 * under the one beside it, so the difference arrives as movement rather than as
 * something to be remembered.
 *
 * ## It clips, it does not resize
 *
 * The revealed side is a window onto a full-size copy of its content, not a
 * copy of the content squeezed into the window. That distinction is the whole
 * implementation: a view whose width is animated will lay its children out
 * again at every new width, so an image inside one is an image being squashed
 * and stretched as the seam moves, and the two halves stop lining up — which
 * is the one thing this component exists to guarantee.
 *
 * It follows that the content has to be told how big to be, and the only thing
 * that knows is the container once it has been measured. So nothing is drawn
 * until the first layout pass has run, and `Compare.Before` sizes its child to
 * the measured box rather than to itself.
 *
 * ## It needs a height
 *
 * Everything inside is positioned absolutely, so the box has no height of its
 * own to take from its content. `height` is what gives it one. An image told to
 * fill the box will fill whatever height is set here, and cropping is
 * `resizeMode` on the image rather than anything this component does.
 *
 * ## Dragging, and the two ways round it
 *
 * The whole frame is the drag target, not just the knob — a knob is a small
 * thing to hit on a phone and the reader's finger is already over the picture.
 * The gesture only claims horizontal movement, so a Compare inside a scrolling
 * page still scrolls.
 *
 * A drag is not available to everyone, so the seam is also `adjustable`: a
 * screen reader moves it a `step` at a time without one, and `value` drives it
 * from anywhere else — a button that snaps to the ends, an animation, a slider
 * somewhere else on the screen.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { Text } from '../../primitives/text';
import { cn } from '../../utils/cn';
import { selectionTick } from '../../utils/haptics';
import { useDirectionSign } from '../../hooks/use-direction';

/** How tall the frame is when the caller does not say. */
const DEFAULT_HEIGHT = 240;

/** The knob's diameter, and so the width of the column the seam lives in. */
const KNOB = 36;

/** How far a screen reader's increment moves the seam, as a share of the box. */
const DEFAULT_STEP = 0.05;

/** Where the seam starts: the middle, so both sides are equally on show. */
const DEFAULT_VALUE = 0.5;

/** Movement along the axis before the drag is the gesture's rather than a scroll's. */
const CLAIM = 8;

/** And movement across it that hands the gesture back. */
const YIELD = 16;

export type CompareOrientation = 'horizontal' | 'vertical';

const compareVariants = tv({
  slots: {
    root: 'w-full overflow-hidden rounded-xl bg-muted',
    seam: 'absolute items-center justify-center',
    line: 'absolute bg-background',
    knob: 'items-center justify-center rounded-full border border-border bg-background shadow-md',
    grip: 'rounded-full bg-foreground/60',
  },
  variants: {
    orientation: {
      horizontal: {
        seam: 'bottom-0 top-0',
        line: 'h-full w-0.5',
        grip: 'h-3.5 w-1',
      },
      vertical: {
        seam: 'left-0 right-0',
        line: 'h-0.5 w-full',
        grip: 'h-1 w-3.5',
      },
    },
  },
  defaultVariants: { orientation: 'horizontal' },
});

interface CompareContextValue {
  /** Where the seam is, `0` to `1` of the box, on the UI thread. */
  ratio: SharedValue<number>;
  /** The measured box. Nothing is drawn until both are above zero. */
  width: number;
  height: number;
  orientation: CompareOrientation;
  /**
   * True where the frame reads right to left. A horizontal seam is anchored to
   * the reading edge, so everything positioned along that axis flips with it.
   */
  mirrored: boolean;
  disabled: boolean;
  step: number;
  /** Moves the seam and reports it, for the paths that are not the drag. */
  nudge: (delta: number) => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function useCompare(component: string): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Compare>`);
  }
  return context;
}

function clamp(value: number): number {
  'worklet';
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export interface CompareProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * How tall the frame is, in points.
   *
   * Required in practice rather than in the types: both sides are positioned
   * absolutely, so there is no content left to give the box a height of its own.
   */
  height?: number;
  /** Where the seam sits, `0` to `1`. Leave unset to let the frame track it. */
  value?: number;
  /** Where it starts when the frame is tracking it itself. */
  defaultValue?: number;
  /** Fires while the seam moves, with its new position. */
  onValueChange?: (value: number) => void;
  /** Fires once, when the finger is lifted. The one to persist. */
  onValueCommit?: (value: number) => void;
  /** Which way the seam runs. */
  orientation?: CompareOrientation;
  /** Freezes the seam where it is and takes it out of the accessibility tree. */
  disabled?: boolean;
  /** How far one screen-reader increment moves the seam, `0` to `1`. */
  step?: number;
  /** A tick when the seam reaches either end. */
  haptics?: boolean;
  children?: ReactNode;
}

function CompareRoot({
  className,
  height = DEFAULT_HEIGHT,
  value,
  defaultValue = DEFAULT_VALUE,
  onValueChange,
  onValueCommit,
  orientation = 'horizontal',
  disabled = false,
  step = DEFAULT_STEP,
  haptics = true,
  children,
  ...props
}: CompareProps) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [internal, setInternal] = useState(defaultValue);
  const sign = useDirectionSign();
  const mirrored = sign === -1;

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const ratio = useSharedValue(clamp(current));
  /** True between the finger landing and it lifting, so the prop can stand back. */
  const dragging = useSharedValue(false);

  /*
   * A controlled `value` owns the seam except while a finger is on it. The
   * drag writes the shared value directly and reports afterwards, so pushing
   * the prop back in during the drag would fight it for the same number.
   */
  const settled = clamp(current);
  useEffect(() => {
    if (controlled && !dragging.value) ratio.value = settled;
  }, [controlled, settled, ratio, dragging]);

  const commit = useCallback(
    (next: number) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange]
  );

  const finish = useCallback(
    (next: number) => {
      if (!controlled) setInternal(next);
      onValueCommit?.(next);
    },
    [controlled, onValueCommit]
  );

  /*
   * Reported a whole percent at a time rather than every frame. The seam itself
   * never needs the JS thread — it is drawn from the shared value — so a
   * callback per frame would be sixty re-renders a second spent on a number
   * nobody can read that fast.
   */
  const reported = useSharedValue(-1);
  const report = useCallback(
    (next: number) => {
      onValueChange?.(next);
    },
    [onValueChange]
  );

  const nudge = useCallback(
    (delta: number) => {
      const next = clamp(ratio.value + delta);
      ratio.value = next;
      commit(next);
      onValueCommit?.(next);
    },
    [ratio, commit, onValueCommit]
  );

  const horizontal = orientation === 'horizontal';
  const extent = horizontal ? box.width : box.height;

  const start = useSharedValue(0);
  const edge = useSharedValue(false);

  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .enabled(!disabled)
      .onBegin(() => {
        start.value = ratio.value;
        dragging.value = true;
        edge.value = ratio.value <= 0 || ratio.value >= 1;
      })
      .onUpdate((event) => {
        if (extent <= 0) return;
        /*
         * Under a right-to-left layout the leading edge is the right-hand one,
         * so a drag towards it has to move the seam the other way for "towards
         * the start" to keep meaning the same thing. Only the horizontal seam
         * has a leading edge; down is down in both directions.
         */
        const travelled = horizontal ? event.translationX * sign : event.translationY;
        const next = clamp(start.value + travelled / extent);
        ratio.value = next;

        // The one moment in this drag worth feeling: arriving at an end, where
        // the seam stops following the finger. Without it the stall reads as
        // the gesture having been dropped.
        const ended = next <= 0 || next >= 1;
        if (ended !== edge.value) {
          edge.value = ended;
          if (ended && haptics) runOnJS(selectionTick)();
        }

        const percent = Math.round(next * 100);
        if (percent !== reported.value) {
          reported.value = percent;
          runOnJS(report)(next);
        }
      })
      .onFinalize(() => {
        dragging.value = false;
        reported.value = -1;
        runOnJS(finish)(ratio.value);
      });

    /*
     * The seam only answers to the axis it moves on. Without that it claims any
     * movement at all, which is a Compare inside a scrolling page eating the
     * scroll the moment a finger lands on the picture.
     */
    return horizontal
      ? gesture.activeOffsetX([-CLAIM, CLAIM]).failOffsetY([-YIELD, YIELD])
      : gesture.activeOffsetY([-CLAIM, CLAIM]).failOffsetX([-YIELD, YIELD]);
  }, [
    disabled,
    extent,
    horizontal,
    sign,
    haptics,
    ratio,
    start,
    edge,
    dragging,
    reported,
    report,
    finish,
  ]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    const next = { width: Math.round(w), height: Math.round(h) };
    if (next.width !== box.width || next.height !== box.height) setBox(next);
    props.onLayout?.(event);
  };

  const context = useMemo<CompareContextValue>(
    () => ({
      ratio,
      width: box.width,
      height: box.height,
      orientation,
      mirrored,
      disabled,
      step,
      nudge,
    }),
    [ratio, box.width, box.height, orientation, mirrored, disabled, step, nudge]
  );

  const { root } = compareVariants({ orientation });

  /*
   * The background side is drawn first whatever order the caller wrote the
   * children in, because the revealed side is a window laid over it — reversed,
   * the window would be underneath and nothing would show through.
   */
  const layers: { base: ReactNode[]; clip: ReactNode[]; over: ReactNode[] } = {
    base: [],
    clip: [],
    over: [],
  };
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: keyof typeof layers }).layer ?? 'over';
    layers[layer in layers ? layer : 'over'].push(
      <ChildSlot key={index}>{child}</ChildSlot>
    );
  });

  return (
    <CompareContext.Provider value={context}>
      <GestureDetector gesture={pan}>
        <View
          {...props}
          onLayout={onLayout}
          style={[{ height }, props.style]}
          className={cn(root(), className)}
        >
          {box.width > 0 && box.height > 0 ? (
            <>
              {layers.base}
              {layers.clip}
              {layers.over}
            </>
          ) : null}
        </View>
      </GestureDetector>
    </CompareContext.Provider>
  );
}

function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export interface CompareAfterProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The side the seam uncovers as it travels: the whole frame, underneath.
 *
 * It is drawn at full size and never clipped, so it is the one that decides
 * what the frame looks like at either end of the travel.
 */
function CompareAfter({ className, children, ...props }: CompareAfterProps) {
  const { width, height } = useCompare('Compare.After');

  return (
    <View
      {...props}
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width, height }, props.style]}
      className={cn(className)}
    >
      {children}
    </View>
  );
}
CompareAfter.displayName = 'Compare.After';
CompareAfter.layer = 'base' as const;

export interface CompareBeforeProps extends ViewProps {
  className?: string;
  children?: ReactNode;
}

/**
 * The side on the near edge of the seam: a window onto the content, sized to
 * the frame.
 *
 * The child is given the frame's measured size in points rather than a
 * percentage. A percentage would be a percentage *of the window*, which shrinks
 * as the seam closes — so the image would slide and scale under the seam
 * instead of standing still behind it, and the two halves would no longer be
 * the same picture in the same place.
 */
function CompareBefore({ className, children, ...props }: CompareBeforeProps) {
  const { ratio, width, height, orientation, mirrored } = useCompare('Compare.Before');
  const horizontal = orientation === 'horizontal';
  /*
   * A horizontal window opens from the edge the line starts at, which is the
   * right-hand one under a right-to-left layout. Both the window and the copy
   * inside it are pinned to that same edge — pinning only the window would
   * slide the content along under the seam, which is the one thing the clip
   * exists to prevent. Vertical is unaffected: down is down in both directions.
   */
  const anchor = horizontal && mirrored ? 'right' : 'left';

  const clip = useAnimatedStyle(() =>
    horizontal
      ? { width: ratio.value * width, height }
      : { width, height: ratio.value * height }
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', [anchor]: 0, top: 0, overflow: 'hidden' }, clip]}
    >
      <View
        {...props}
        style={[{ position: 'absolute', [anchor]: 0, top: 0, width, height }, props.style]}
        className={cn(className)}
      >
        {children}
      </View>
    </Animated.View>
  );
}
CompareBefore.displayName = 'Compare.Before';
CompareBefore.layer = 'clip' as const;

export interface CompareHandleProps extends ViewProps {
  className?: string;
  /** Hide the two grip bars inside the knob. */
  withGrip?: boolean;
  /** Spoken name. */
  accessibilityLabel?: string;
  /** Replaces the knob. The line behind it is kept. */
  children?: ReactNode;
}

/**
 * The seam: a line across the frame with a knob on it.
 *
 * The knob is a marker rather than the target — the drag is on the whole frame,
 * and a 36-point circle is not something to ask a thumb to find. What it is
 * for is saying where the seam is and that it is the thing that moves, which a
 * bare line does not.
 *
 * It carries the accessibility wiring for the same reason a splitter's handle
 * does: it is the one part of this that is a control, so it is the part that is
 * `adjustable` and takes the increment and decrement a screen reader sends
 * instead of a drag.
 */
function CompareHandle({
  className,
  withGrip = true,
  accessibilityLabel = 'Compare',
  children,
  style,
  ...props
}: CompareHandleProps) {
  const { ratio, width, height, orientation, mirrored, disabled, step, nudge } =
    useCompare('Compare.Handle');
  const horizontal = orientation === 'horizontal';
  const { seam, line, knob, grip } = compareVariants({ orientation });
  // Pinned to the same edge the window opens from, and travelling away from it.
  const anchor = horizontal && mirrored ? 'right' : 'left';
  const towards = horizontal && mirrored ? -1 : 1;

  const offset = useDerivedValue(() =>
    horizontal ? ratio.value * width : ratio.value * height
  );

  const animatedStyle = useAnimatedStyle(() =>
    horizontal
      ? { transform: [{ translateX: (offset.value - KNOB / 2) * towards }] }
      : { transform: [{ translateY: offset.value - KNOB / 2 }] }
  );

  const [now, setNow] = useState(() => Math.round(ratio.value * 100));
  // The spoken value only has to be right when a screen reader reads it, so it
  // is pulled back to the JS thread a percent at a time rather than every frame
  // of a drag.
  useAnimatedReaction(
    () => Math.round(ratio.value * 100),
    (percent, previous) => {
      if (percent !== previous) runOnJS(setNow)(percent);
    }
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') nudge(step);
      else if (event.nativeEvent.actionName === 'decrement') nudge(-step);
    },
    [nudge, step]
  );

  return (
    <Animated.View
      {...props}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: 0, max: 100, now }}
      accessibilityActions={disabled ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={disabled ? undefined : onAccessibilityAction}
      pointerEvents="box-none"
      style={[
        horizontal ? { width: KNOB, [anchor]: 0 } : { height: KNOB, top: 0 },
        style,
        animatedStyle,
      ]}
      className={seam()}
    >
      <View className={line()} pointerEvents="none" />
      {children ?? (
        <View style={{ width: KNOB, height: KNOB }} className={knob()} pointerEvents="none">
          {withGrip ? (
            <View className={horizontal ? 'flex-row gap-1' : 'gap-1'}>
              <View className={grip()} />
              <View className={grip()} />
            </View>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}
CompareHandle.displayName = 'Compare.Handle';
CompareHandle.layer = 'over' as const;

export interface CompareLabelProps extends ViewProps {
  className?: string;
  /** Which side of the frame it sits on. */
  side?: 'start' | 'end';
  children?: ReactNode;
}

/**
 * A caption pinned to one corner, for saying which side is which.
 *
 * Worth adding wherever the two versions are not obviously an original and an
 * edit — two dates, two settings, two models. Where they are, it is one more
 * thing over the picture and the picture is the point.
 */
function CompareLabel({ className, side = 'start', children, ...props }: CompareLabelProps) {
  const { orientation, mirrored } = useCompare('Compare.Label');
  const horizontal = orientation === 'horizontal';
  // `start` is the edge the line begins at, which the layout direction decides.
  const start = horizontal && mirrored ? side !== 'start' : side === 'start';

  return (
    <View
      {...props}
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          ...(horizontal
            ? { top: 8, ...(start ? { left: 8 } : { right: 8 }) }
            : { left: 8, ...(start ? { top: 8 } : { bottom: 8 }) }),
        },
        props.style,
      ]}
      className={cn('rounded-md bg-background/80 px-2 py-1', className)}
    >
      {typeof children === 'string' ? (
        <Text size="xs" weight="medium" numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
CompareLabel.displayName = 'Compare.Label';
CompareLabel.layer = 'over' as const;

CompareRoot.displayName = 'Compare';

export const Compare = Object.assign(CompareRoot, {
  Before: CompareBefore,
  After: CompareAfter,
  Handle: CompareHandle,
  Label: CompareLabel,
});
