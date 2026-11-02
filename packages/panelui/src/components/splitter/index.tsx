/**
 * Splitter — panes that share a container, with a seam between them the reader
 * can drag.
 *
 * ```tsx
 * <Splitter className="h-64" defaultLayout={[65, 35]}>
 *   <Splitter.Panel minSize={30}>{list}</Splitter.Panel>
 *   <Splitter.Handle />
 *   <Splitter.Panel minSize={20} collapsible>{detail}</Splitter.Panel>
 * </Splitter>
 * ```
 *
 * Sizes are percentages of the splitter, so a layout dragged in portrait is
 * still the same layout in landscape. The splitter itself has no height of its
 * own — give it one, or put it in something that does, or it collapses to
 * nothing and takes its panes with it.
 *
 * The seams are drawn over the panes rather than between them. A handle that
 * took layout space would have to be measured before the panes could be sized,
 * which puts the whole layout downstream of a number nobody controls; floating
 * it means the panes add up to exactly the container and the handle can be as
 * wide a target as a finger needs without changing anything.
 *
 * Dragging runs on the UI thread. `onLayoutChange` fires when the seam is let
 * go rather than on every frame, because a layout that round-trips through
 * React sixty times a second is the one thing that makes this feel slow.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useDirectionSign } from '../../hooks/use-direction';
import { selectionTick } from '../../utils/haptics';
import {
  isCollapsed,
  layoutOffset,
  normalizeConstraint,
  resetLayout,
  resizeLayout,
  resolveLayout,
  type SplitterConstraint,
} from './splitter-math';
import { webDeps } from '../../primitives/web-deps';

export type SplitterOrientation = 'horizontal' | 'vertical';

/**
 * How thick the seam's touch target is, in points. Wider than the line it
 * draws, because the line is a hairline and a hairline is not a target.
 */
const HANDLE_THICKNESS = 24;

const splitterVariants = tv({
  slots: {
    root: 'relative overflow-hidden',
    panel: 'overflow-hidden',
    handle: 'absolute items-center justify-center',
    line: 'bg-border',
    grip: 'absolute rounded-full bg-muted-foreground/30',
  },
  variants: {
    orientation: {
      horizontal: {
        // `w-full`, because the panes are shares of a width the splitter has to
        // already know. Left to size itself, a row asks its children how wide
        // they are and the children answer with a share of that answer — a
        // circle that resolves to zero and takes the whole splitter with it.
        // Inside anything that centres its children, that is what happens.
        root: 'w-full flex-row',
        // Over the pane that follows it, not under. A seam is drawn between two
        // panes but written between them too, and a later sibling paints on top
        // — which left the outer half of every touch target dead.
        handle: 'bottom-0 start-0 top-0 z-10 w-6',
        line: 'h-full w-px',
        grip: 'h-8 w-1',
      },
      vertical: {
        root: 'flex-col',
        handle: 'end-0 start-0 top-0 z-10 h-6',
        line: 'h-px w-full',
        grip: 'h-1 w-8',
      },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

interface SplitterContextValue {
  orientation: SplitterOrientation;
  /** Live percentages, one per panel. Written by drags, read by every pane. */
  layout: SharedValue<number[]>;
  /** The splitter's own size along its axis, in points. `0` until measured. */
  available: SharedValue<number>;
  /** Whether that measurement has landed. Panes size themselves by flex until it has. */
  measured: boolean;
  /** The last settled layout, for the props that have to be React state. */
  settled: number[];
  /** The layout the splitter resolved to before anybody dragged it. */
  initial: number[];
  constraints: SplitterConstraint[];
  disabled: boolean;
  step: number;
  sign: 1 | -1;
  commit: (next: number[]) => void;
}

const SplitterContext = createContext<SplitterContextValue | null>(null);
const PanelIndexContext = createContext(0);
const BoundaryIndexContext = createContext(-1);

function useSplitter(component: string): SplitterContextValue {
  const context = useContext(SplitterContext);
  if (!context) throw new Error(`${component} must be used within a <Splitter>`);
  return context;
}

export interface SplitterProps extends ViewProps {
  className?: string;
  /** Which way the panes are laid out. Defaults to `horizontal`. */
  orientation?: SplitterOrientation;
  /**
   * Controlled layout, as one percentage per panel. Pair it with
   * `onLayoutChange`: a seam that is let go snaps back to this unless the value
   * moves with it.
   */
  layout?: number[];
  /**
   * Starting layout when uncontrolled, as one percentage per panel. Panels left
   * out of it fall back to their own `defaultSize`, and then to an even share.
   */
  defaultLayout?: number[];
  /** Called with the new layout once a seam is let go, or stepped. */
  onLayoutChange?: (layout: number[]) => void;
  /** Freezes every seam. */
  disabled?: boolean;
  /** How far one accessibility step moves a seam, in percent. Defaults to `5`. */
  step?: number;
}

function isElementOfType(child: ReactNode, type: unknown): child is ReactElement<Record<string, unknown>> {
  return isValidElement(child) && child.type === type;
}

function SplitterRoot({
  className,
  orientation = 'horizontal',
  layout: layoutProp,
  defaultLayout,
  onLayoutChange,
  disabled = false,
  step = 5,
  children,
  onLayout,
  ...props
}: SplitterProps) {
  const horizontal = orientation === 'horizontal';
  const sign = useDirectionSign();
  const { root } = splitterVariants({ orientation });

  const items = Children.toArray(children);
  const panels = items.filter((child) => isElementOfType(child, SplitterPanel)) as ReactElement<SplitterPanelProps>[];

  // The panes' limits are read straight off their elements rather than
  // registered from an effect. A layout that is only correct after the children
  // have mounted and reported in is a layout that is wrong on the first frame,
  // and this one is knowable before any of them render.
  const constraintsKey = JSON.stringify(
    panels.map((panel) => [
      panel.props.minSize,
      panel.props.maxSize,
      panel.props.collapsible === true,
      panel.props.collapsedSize,
      panel.props.defaultSize,
    ])
  );
  const constraints = useMemo(
    () => panels.map((panel) => normalizeConstraint(panel.props)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [constraintsKey]
  );

  const sizesKey = JSON.stringify([
    layoutProp ?? null,
    defaultLayout ?? null,
    panels.map((panel) => panel.props.defaultSize ?? null),
  ]);
  const resolved = useMemo(() => {
    const declared = layoutProp ?? defaultLayout;
    return resolveLayout(
      panels.map((panel, index) => declared?.[index] ?? panel.props.defaultSize),
      constraints
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizesKey, constraints]);

  const layout = useSharedValue<number[]>(resolved);
  const available = useSharedValue(0);
  const [measured, setMeasured] = useState(false);
  const [settled, setSettled] = useState(resolved);
  // Bumped when a controlled splitter is let go, so a caller that ignored the
  // change gets the seam put back where its props still say it is.
  const [syncToken, setSyncToken] = useState(0);

  const controlled = layoutProp !== undefined;
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;

  useEffect(() => {
    layout.value = resolved;
    setSettled(resolved);
  }, [resolved, syncToken, layout]);

  const commit = useCallback(
    (next: number[]) => {
      if (controlledRef.current) setSyncToken((token) => token + 1);
      else setSettled(next);
      onLayoutChange?.(next);
    },
    [onLayoutChange]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const box = event.nativeEvent.layout;
      const size = horizontal ? box.width : box.height;
      available.value = size;
      if (size > 0) setMeasured(true);
      onLayout?.(event);
    },
    [available, horizontal, onLayout]
  );

  const context = useMemo<SplitterContextValue>(
    () => ({
      orientation,
      layout,
      available,
      measured,
      settled,
      initial: resolved,
      constraints,
      disabled,
      // A step of zero or less is a seam that cannot be moved without a drag,
      // which is the one thing the accessibility actions exist to avoid.
      step: Number.isFinite(step) && step > 0 ? step : 5,
      sign,
      commit,
    }),
    [
      orientation,
      layout,
      available,
      measured,
      settled,
      resolved,
      constraints,
      disabled,
      step,
      sign,
      commit,
    ]
  );

  // Panes learn their index and seams learn which pair they sit between from
  // where they appear, so nothing has to be numbered by hand and a pane cannot
  // be given the wrong one.
  let panelIndex = -1;
  const laidOut = items.map((child, index) => {
    if (isElementOfType(child, SplitterPanel)) {
      panelIndex += 1;
      return (
        <PanelIndexContext.Provider key={`panel-${panelIndex}`} value={panelIndex}>
          {child}
        </PanelIndexContext.Provider>
      );
    }
    if (isElementOfType(child, SplitterHandle)) {
      return (
        <BoundaryIndexContext.Provider key={`handle-${index}`} value={panelIndex}>
          {child}
        </BoundaryIndexContext.Provider>
      );
    }
    return child;
  });

  return (
    <SplitterContext.Provider value={context}>
      <View className={root({ className })} onLayout={handleLayout} {...props}>
        {laidOut}
      </View>
    </SplitterContext.Provider>
  );
}

export interface SplitterPanelProps extends ViewProps {
  className?: string;
  /** Starting share of the splitter, in percent. Unsized panes split the rest. */
  defaultSize?: number;
  /** Smallest share this pane may hold while open, in percent. Defaults to `10`. */
  minSize?: number;
  /** Largest share this pane may hold, in percent. Defaults to `100`. */
  maxSize?: number;
  /** Lets a drag past `minSize` shut the pane rather than stopping at it. */
  collapsible?: boolean;
  /** Share this pane holds while shut, in percent. Defaults to `0`. */
  collapsedSize?: number;
}

/**
 * One pane.
 *
 * It clips what is inside it, so a pane dragged narrower hides its content
 * rather than pushing it into the pane beside it.
 */
function SplitterPanel({ className, children, style, ...props }: SplitterPanelProps) {
  const context = useSplitter('Splitter.Panel');
  const index = useContext(PanelIndexContext);
  const { panel } = splitterVariants({ orientation: context.orientation });
  const horizontal = context.orientation === 'horizontal';

  const animatedStyle = useAnimatedStyle(() => {
    const size = (context.available.value * (context.layout.value[index] ?? 0)) / 100;
    return horizontal ? { width: size } : { height: size };
  }, webDeps([index, horizontal]));

  // Nothing is measured on the first frame, and a pane sized from a container of
  // zero is a pane nobody can see. Until the measurement lands, a definite flex
  // basis of zero takes precedence over that width and the shares below carry
  // the layout — so the first frame is already in proportion, and the switch to
  // measured points changes nothing anybody can see.
  const unmeasured = { flexGrow: context.settled[index] ?? 0, flexBasis: 0, flexShrink: 1 };

  return (
    <Animated.View
      className={panel({ className })}
      style={[context.measured ? null : unmeasured, style, animatedStyle]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export interface SplitterHandleProps extends ViewProps {
  className?: string;
  /** Freezes this seam on its own, leaving the others draggable. */
  disabled?: boolean;
  /** Draws the grip in the middle of the seam. Defaults to `true`. */
  withGrip?: boolean;
  /** What a screen reader calls the seam. Defaults to "Resize panels". */
  accessibilityLabel?: string;
}

/**
 * The seam between two panes.
 *
 * Put one between each pair. It is `adjustable` to a screen reader, so the
 * layout can be moved a step at a time without a drag, and a double tap puts
 * the pair back where it started — the fastest way out of a pane dragged shut
 * by accident.
 */
function SplitterHandle({
  className,
  disabled,
  withGrip = true,
  accessibilityLabel = 'Resize panels',
  style,
  ...props
}: SplitterHandleProps) {
  const context = useSplitter('Splitter.Handle');
  const boundary = useContext(BoundaryIndexContext);
  const { handle, line, grip } = splitterVariants({ orientation: context.orientation });
  const horizontal = context.orientation === 'horizontal';
  const frozen = context.disabled || disabled === true;

  const { layout, available, constraints, sign, commit } = context;
  const start = useSharedValue<number[]>([]);
  const collapsed = useSharedValue(false);
  const moved = useSharedValue(false);

  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .enabled(!frozen && boundary >= 0)
      .onBegin(() => {
        start.value = layout.value.slice();
        moved.value = false;
        const constraint = constraints[boundary];
        collapsed.value = constraint
          ? isCollapsed(layout.value[boundary] ?? 0, constraint)
          : false;
      })
      .onUpdate((event) => {
        if (available.value <= 0) return;
        const travelled = horizontal ? event.translationX * sign : event.translationY;
        const delta = (travelled / available.value) * 100;
        const next = resizeLayout(start.value, boundary, delta, constraints);
        moved.value = true;
        layout.value = next;

        // The one moment in a drag worth feeling: a pane arriving at shut, or
        // leaving it. Both are a jump the finger did not make, so the tick is
        // what says the jump was the control and not a stutter.
        const constraint = constraints[boundary];
        if (constraint) {
          const shut = isCollapsed(next[boundary] ?? 0, constraint);
          if (shut !== collapsed.value) {
            collapsed.value = shut;
            runOnJS(selectionTick)();
          }
        }
      })
      // A seam that was pressed and not moved has nothing to report, and a
      // layout change nobody made is a re-render nobody asked for.
      .onFinalize(() => {
        if (moved.value) runOnJS(commit)(layout.value.slice());
      });

    /*
     * A seam only answers to the axis it moves on. Without that it claims any
     * movement at all — which is a splitter inside a scroller taking the
     * scroll, and a drag with no way to fail, which is the one thing the double
     * tap behind it is waiting for.
     */
    return horizontal
      ? gesture.activeOffsetX([-8, 8]).failOffsetY([-16, 16])
      : gesture.activeOffsetY([-8, 8]).failOffsetX([-16, 16]);
  }, [
    available,
    boundary,
    collapsed,
    commit,
    constraints,
    frozen,
    horizontal,
    layout,
    moved,
    sign,
    start,
  ]);

  const { initial } = context;
  /**
   * Puts this pair back to the proportions the splitter started with, without
   * touching the panes further along — the two of them share exactly the room
   * they already have between them.
   */
  const reset = useCallback(() => {
    const next = resetLayout(layout.value, initial, boundary, constraints);
    layout.value = next;
    commit(next);
  }, [boundary, commit, constraints, initial, layout]);

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        // A tap that has travelled this far is a drag, and saying so is what
        // lets it give up on the movement rather than on a timer.
        .maxDistance(HANDLE_THICKNESS / 2)
        .enabled(!frozen && boundary >= 0)
        .onEnd((_event, success) => {
          if (success) runOnJS(reset)();
        }),
    [boundary, frozen, reset]
  );

  /*
   * The drag comes first, and the order is the whole of it.
   *
   * A race gives its first gesture the priority and makes the rest wait for it
   * to fail. With the tap in front, every drag was held back until the tap gave
   * up — which a two-tap gesture only does once its window has expired, half a
   * second after the finger lands. A slow first drag outlasted that and worked;
   * the quicker one after it did not, and the seam ignored it.
   *
   * Round this way the pan activates on movement, and a press that never moves
   * fails it and hands the touch on, which is all the tap was waiting for.
   */
  const gesture = useMemo(() => Gesture.Race(pan, doubleTap), [doubleTap, pan]);

  const animatedStyle = useAnimatedStyle(() => {
    if (available.value <= 0) return { opacity: 0 };
    const seam = (available.value * layoutOffset(layout.value, boundary)) / 100;
    const shift = seam - HANDLE_THICKNESS / 2;
    return {
      opacity: 1,
      transform: horizontal ? [{ translateX: shift * sign }] : [{ translateY: shift }],
    };
  }, webDeps([boundary, horizontal, sign]));

  // A step moves the seam along the layout, not along the screen, so it is the
  // one piece of this that the reading direction does not touch: incrementing
  // grows the pane that comes first either way.
  const step = useCallback(
    (direction: 1 | -1) => {
      const next = resizeLayout(
        layout.value.slice(),
        boundary,
        direction * context.step,
        constraints
      );
      layout.value = next;
      commit(next);
    },
    [boundary, commit, constraints, context.step, layout]
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') step(1);
      else if (event.nativeEvent.actionName === 'decrement') step(-1);
    },
    [step]
  );

  const now = Math.round(layoutOffset(context.settled, boundary));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        {...props}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: frozen }}
        accessibilityValue={{ min: 0, max: 100, now }}
        accessibilityActions={frozen ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={frozen ? undefined : onAccessibilityAction}
        className={handle({ className })}
        style={[style, animatedStyle]}
      >
        <View className={line()} />
        {withGrip ? <View className={grip()} /> : null}
      </Animated.View>
    </GestureDetector>
  );
}

SplitterRoot.displayName = 'Splitter';
SplitterPanel.displayName = 'Splitter.Panel';
SplitterHandle.displayName = 'Splitter.Handle';

export const Splitter = Object.assign(SplitterRoot, {
  Panel: SplitterPanel,
  Handle: SplitterHandle,
});

export {
  DEFAULT_MAX_SIZE,
  DEFAULT_MIN_SIZE,
  isCollapsed,
  layoutOffset,
  normalizeConstraint,
  panelFloor,
  resetLayout,
  resizeLayout,
  resolveLayout,
  type SplitterConstraint,
  type SplitterConstraintInput,
} from './splitter-math';
