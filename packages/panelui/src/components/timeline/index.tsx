/**
 * Timeline — a vertical sequence of events.
 *
 * One `value` on the root says how far the sequence has got, and every item
 * resolves its own state from its `step` against it — completed below, active
 * at, inactive above. Stating it once is the point: a timeline whose items each
 * carried their own state would let you write two active items, or none.
 *
 * State is resolved in JS and handed down through context into `tv()` variants
 * rather than being read off the element, because React Native has no
 * attribute selectors for a stylesheet to key off. `Steps` resolves its states
 * the same way, so the two read as siblings.
 *
 * ## Two orientations
 *
 * Vertical is the default and the ordinary case. Horizontal lays the items out
 * as columns on a rail that runs off the side of the screen and is swiped
 * through, which is the arrangement a long span of time wants: a decade of
 * entries read top to bottom is a page nobody reaches the end of.
 *
 * The objection to a horizontal timeline is that each item gets a fifth of a
 * phone's width, which will not hold a date and a title. The answer is that it
 * does not have to fit — the rail is wider than the screen, and a column takes
 * the width its contents need. An item with nothing on it collapses to a tick,
 * so a quiet stretch compresses and a busy one keeps its room.
 *
 * ```tsx
 * <Timeline variant="icon" value={2}>
 *   <Timeline.Item step={0} tone="info">
 *     <Timeline.Aside>
 *       <Timeline.Date>09:12</Timeline.Date>
 *       <Timeline.Label>Design</Timeline.Label>
 *     </Timeline.Aside>
 *     <Timeline.Indicator><SendIcon /></Timeline.Indicator>
 *     <Timeline.Content>
 *       <Timeline.Header>
 *         <Timeline.Title>Checkout language approved</Timeline.Title>
 *         <Timeline.Trailing>10:18</Timeline.Trailing>
 *       </Timeline.Header>
 *       <Timeline.Description>…</Timeline.Description>
 *     </Timeline.Content>
 *   </Timeline.Item>
 * </Timeline>
 * ```
 */
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  View,
  type FlatListProps,
  type ListRenderItemInfo,
  type Text as RNText,
  type ViewProps,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { tv } from 'tailwind-variants';
import { useCSSVariable } from 'uniwind';
import { IconColorProvider } from '../../icons';
import { selectionTick } from '../../utils/haptics';
import { Text, type TextProps, textChildren } from '../../primitives/text';
import { TIMELINE_WIDE_COLUMN, timelineColumnOffsets, timelineColumnWidth } from './timeline-geometry';
import type { TextRef, ViewRef } from '../../primitives/refs';

const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * A tick as the reading edge passes from one column to the next.
 *
 * The comparison runs on the UI thread every frame; the call back to
 * JavaScript happens once per column crossed, which is the difference between
 * feedback and a haptic per frame. Fired at the crossing itself rather than
 * when the scroll settles, so the tick and the column arriving are the same
 * moment — a haptic that lags what caused it reads as a glitch.
 */
function useColumnDetent(
  scrollX: SharedValue<number>,
  offsets: number[],
  haptics: boolean,
  onColumnChange?: (index: number) => void
) {
  const nearest = useSharedValue(0);

  /*
   * A stable function for `runOnJS`. The prop itself is a fresh closure on
   * every render, and handing that to the UI thread re-serialises it on every
   * frame the reaction is rebuilt.
   */
  const report = useCallback(
    (index: number) => {
      onColumnChange?.(index);
    },
    [onColumnChange]
  );

  // Nothing to compute unless somebody is listening. The reaction runs on
  // every scroll frame, so a timeline that wants neither pays nothing.
  const enabled = haptics || onColumnChange !== undefined;

  useAnimatedReaction(
    () => {
      if (!enabled || offsets.length === 0) return 0;
      let index = 0;
      let best = Infinity;
      for (let i = 0; i < offsets.length; i += 1) {
        const distance = Math.abs(scrollX.value - (offsets[i] ?? 0));
        if (distance < best) {
          best = distance;
          index = i;
        }
      }
      return index;
    },
    (index, previous) => {
      if (!enabled || previous === null || index === previous) return;
      nearest.value = index;
      if (haptics) runOnJS(selectionTick)();
      if (onColumnChange !== undefined) runOnJS(report)(index);
    }
  );
}


/*
 * Fallbacks for the two ends of the focus ramp, used only before the theme's
 * variables have resolved. `interpolateColor` needs two real colours on the
 * very first frame, and a missing one is a crash rather than a wrong shade.
 */
const INK_FALLBACK = { foreground: '#09090b', muted: '#71717a' };

/**
 * A column's text at full strength while it is the one being read, and muted
 * while it is not.
 *
 * Horizontal only, and it is the piece that was missing. Scale and a small drop
 * already picked the focused column out of the row, but every word in every
 * column stayed the same muted grey — so the column you had scrolled to was
 * nearer and no easier to read than the ones either side of it. Colour is what
 * says *this is the one*, and it is the only cue that survives being looked at
 * rather than glanced at.
 *
 * The ramp runs to the foreground token, which is what a heading uses. Anything
 * softer is another grey, and the whole complaint about the old drawing was
 * that it was grey.
 *
 * It is not disabled under reduced motion. The value is driven by scroll
 * position rather than by a clock — the reader's own finger is what moves it —
 * so there is no motion here to reduce. What that setting turns off is the
 * scale and the drop, which is handled where those are.
 */
function useColumnInk(component: string) {
  const { orientation, scrollX } = useTimeline(component);
  const item = useContext(TimelineItemContext);
  const foregroundToken = useCSSVariable('--color-foreground');
  const mutedToken = useCSSVariable('--color-muted-foreground');

  const horizontal = orientation === 'horizontal';
  const offset = item?.offset ?? 0;
  const width = Math.max(item?.columnWidth || TIMELINE_WIDE_COLUMN, 1);
  const foreground =
    typeof foregroundToken === 'string' ? foregroundToken : INK_FALLBACK.foreground;
  const muted = typeof mutedToken === 'string' ? mutedToken : INK_FALLBACK.muted;

  const style = useAnimatedStyle(() => {
    const distance = Math.abs(scrollX.value - offset);
    const away = interpolate(distance, [0, width], [0, 1], 'clamp');
    return { color: interpolateColor(away, [0, 1], [foreground, muted]) };
  });

  return { horizontal, style };
}

export type TimelineVariant = 'dot' | 'icon' | 'numbered' | 'card' | 'compact';
/** Semantic colour for a single event, independent of progress. */
export type TimelineTone = 'default' | 'info' | 'success' | 'warning' | 'danger';
/** Which way the sequence runs. */
export type TimelineOrientation = 'vertical' | 'horizontal';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const TimelineColumnOffsetContext = createContext<number | null>(null);

/*
 * Horizontal geometry.
 *
 * The rail has to land on exactly the same line in every column, and the
 * simplest way to guarantee that is to make the band above it a fixed height
 * rather than to position the rail against measured content.
 *
 * So the *column* reserves it, as padding, and the rail is drawn once across
 * the whole track at that offset. Each column's tick is the first thing after
 * the padding and is pulled up by half its own height to straddle the line.
 *
 * `Timeline.Aside` fills that band with a negative margin equal to its own
 * height: it draws inside the reserved strip and takes no flow height of its
 * own. That is what makes it optional. Reserved by the aside instead, a column
 * without one put its tick at the top of the column and 64 points above the
 * rail — which is not a mistake anyone makes twice, but is also not a mistake
 * the component should let anyone make once.
 */
const HORIZONTAL_RAIL_TOP = 64;
const HORIZONTAL_TICK_HEIGHT = 10;

/**
 * How wide a column is: what it was given, else what its contents ask for.
 *
 * Read by the item to size itself and by the root to build the snap offsets, so
 * it lives here rather than in either — the two disagreeing would put every
 * snap point half a column out.
 */
function itemWidth(props: TimelineItemProps): number {
  let filled = false;
  Children.forEach(props.children, (child) => {
    if (filled || !isValidElement(child)) return;
    const displayName = (child.type as { displayName?: string })?.displayName;
    if (displayName !== 'Timeline.Content') return;
    const inner = (child.props as { children?: ReactNode }).children;
    if (inner !== undefined && inner !== null && inner !== false) filled = true;
  });

  return timelineColumnWidth(props.width, filled);
}

/** Variants whose node is a filled disc rather than an outlined ring. */
const SOLID_VARIANTS: TimelineVariant[] = ['dot', 'card'];

const timelineVariants = tv({
  slots: {
    root: 'w-full flex-col',
    item: 'w-full flex-row gap-3',
    aside: 'w-20 items-end gap-0.5 pt-0.5',
    rail: 'items-center',
    // Flat discs, no ring — the same restraint Steps uses. Rings on every node
    // were most of what made the timeline read as noisy.
    indicator: 'items-center justify-center rounded-full',
    indicatorLabel: 'text-xs font-medium',
    separator: 'w-0.5 flex-1 rounded-full',
    body: 'flex-1 pb-6',
    panel: '',
    header: 'flex-row items-center gap-2',
    heading: 'flex-1 gap-0.5',
    date: 'text-xs font-medium text-muted-foreground',
    label: 'text-xs font-medium',
    meta: 'text-xs text-muted-foreground',
    title: 'text-sm font-medium text-foreground',
    trailing: 'text-xs text-muted-foreground',
    content: 'pt-1 text-sm text-muted-foreground',
    stats: 'mt-2 flex-row gap-6 rounded-xl border border-border px-3.5 py-2.5',
    statLabel: 'text-xs text-muted-foreground',
    statValue: 'text-sm font-medium text-foreground',
    /*
     * The masthead over a horizontal rail: what the run of columns is, said
     * once, above them.
     *
     * `gap-0` between the two lines and tight leading on both, because they
     * are one thing rather than two — a label and the name it introduces. Set
     * a step apart with a normal paragraph gap they read as a small heading
     * followed by a bigger unrelated one, which is what the pair looked like
     * before.
     *
     * The label is a size below the title and muted rather than the same size
     * in a lighter weight: at the same size the eye reads the grey one first
     * because it is on the left of the taller one, and the name — the part
     * anybody is actually looking for — arrives second.
     */
    masthead: 'gap-2',
    mastheadMedia: 'flex-row items-center',
    mastheadLabel: 'text-lg font-medium leading-tight text-muted-foreground',
    mastheadTitle: 'text-2xl font-semibold leading-tight text-foreground',
  },
  variants: {
    variant: {
      dot: { indicator: 'h-4 w-4' },
      icon: { indicator: 'h-8 w-8' },
      numbered: { indicator: 'h-7 w-7' },
      card: {
        indicator: 'h-4 w-4',
        // The gap stays on `body` so the connector runs through it; the card
        // chrome lives on an inner panel. Putting the border on `body` made
        // consecutive cards sit flush against each other.
        panel: 'rounded-xl border border-border bg-card p-3.5',
      },
      compact: {
        indicator: 'h-6 w-6',
        body: 'flex-1 pb-3',
        title: 'text-base',
      },
    },
    tone: {
      default: {},
      info: { label: 'text-info-foreground' },
      success: { label: 'text-success-foreground' },
      warning: { label: 'text-warning-foreground' },
      danger: { label: 'text-destructive-foreground' },
    },
    completed: {
      true: { separator: 'bg-primary' },
      false: { separator: 'bg-muted' },
    },
    /*
     * Horizontal turns the item from a row into a column and the rail from a
     * line down the side into a line across the top. The aside is a fixed
     * height because that height *is* where the rail sits — see
     * HORIZONTAL_RAIL_TOP — and it is left-aligned rather than right, since a
     * column reads from its own left edge rather than towards a rail beside it.
     */
    orientation: {
      vertical: {},
      horizontal: {
        item: 'w-auto shrink-0 flex-col gap-0 pr-6',
        aside: 'w-auto items-start justify-end gap-0 pb-2 pt-0',
        // Reserved by the column, not by whatever it happens to contain.
        rail: 'w-full items-start',
        body: 'w-auto flex-none pb-0 pt-5',
        title: 'text-sm',
        /*
         * A column's date is its name, not a caption on it. At `text-xs` next
         * to a `text-xs` meta line the two were a two-line grey block and the
         * year — the only thing distinguishing one column from the next — had
         * to be looked for. The meta line stays small above it and the pair
         * closes up, so they read as one label with an eyebrow rather than as
         * two.
         *
         * Colour is left alone: `useColumnInk` animates it per column so the
         * one you have landed on is the one in full ink, and a colour in the
         * class would be overridden by that anyway.
         */
        date: 'text-sm font-semibold leading-tight',
        meta: 'text-[11px] font-medium leading-tight',
      },
    },
  },
  defaultVariants: {
    variant: 'dot',
    tone: 'default',
    completed: false,
    orientation: 'vertical',
  },
});

/*
 * Colour rule, matching the Steps component: progress is solid, event kind is
 * tinted.
 *
 * - untoned pending   → bg-muted        (Steps' inactive)
 * - untoned completed → bg-primary      (Steps' completed)
 * - toned             → bg-{tone}-soft, content in the tone's foreground
 *
 * The `-soft` fills are the same tinted tokens Alert uses, so a toned node sits
 * in the same family as the rest of the library instead of shouting in raw
 * brand colour.
 *
 * Nodes that hold something — an icon or a number — get a hairline so they read
 * as a container. The `dot` and `card` discs stay bare: at 16px an outline is
 * most of what made the original look busy. The border therefore lives on the
 * tone class rather than the shared `indicator` slot, so a solid disc cannot
 * pick one up by accident.
 */
const TONE_NODE: Record<TimelineTone, { solid: string; tinted: string }> = {
  default: { solid: 'bg-primary', tinted: 'border border-border bg-muted' },
  info: { solid: 'bg-info', tinted: 'border border-info/32 bg-info-soft' },
  success: { solid: 'bg-success', tinted: 'border border-success/32 bg-success-soft' },
  warning: { solid: 'bg-warning', tinted: 'border border-warning/32 bg-warning-soft' },
  danger: {
    solid: 'bg-destructive',
    tinted: 'border border-destructive/32 bg-destructive-soft',
  },
};

/**
 * The node an incomplete, untoned step gets — bordered when it holds an icon
 * or a number, bare when it is a status disc.
 */
const PENDING_NODE = {
  solid: 'bg-muted',
  tinted: 'border border-border bg-muted',
} as const;

/**
 * CSS variable a tinted node's contents take their colour from. The
 * `-foreground` tokens are the ones tuned to read in both light and dark,
 * which is what sits on a soft tint.
 */
const TONE_ICON_VAR: Record<TimelineTone, string> = {
  default: '--color-primary',
  info: '--color-info-foreground',
  success: '--color-success-foreground',
  warning: '--color-warning-foreground',
  danger: '--color-destructive-foreground',
};

interface TimelineContextValue {
  activeStep: number;
  variant: TimelineVariant;
  orientation: TimelineOrientation;
  /** Horizontal only: where the track has been scrolled to, on the UI thread. */
  scrollX: SharedValue<number>;
  /** Horizontal only: each column's left edge, indexed by its `step`. */
  offsets: number[];
  /** Horizontal only: false when the reader has asked for less movement. */
  animate: boolean;
  /** A virtualized list draws one rail segment per mounted cell. */
  virtualized: boolean;
}

interface TimelineItemContextValue {
  step: number;
  completed: boolean;
  tone: TimelineTone;
  /** False on the last item, so its rail does not trail into nothing. */
  showSeparator: boolean;
  /**
   * Horizontal only: where this column starts, in points, and how wide it is.
   *
   * Both are worked out by the item, and the parts inside it need the same two
   * numbers to fade against the scroll. Passing them down beats deriving them
   * twice from measurements that would then be free to disagree.
   */
  offset: number;
  columnWidth: number;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);
const TimelineItemContext = createContext<TimelineItemContextValue | null>(null);

function useTimeline(component: string): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) throw new Error(`${component} must be used within a <Timeline>`);
  return context;
}

function useTimelineItem(component: string): TimelineItemContextValue {
  const context = useContext(TimelineItemContext);
  if (!context) throw new Error(`${component} must be used within a <Timeline.Item>`);
  return context;
}

export interface TimelineProps extends ViewProps {
  className?: string;
  /** Steps at or below this index render as completed. */
  value?: number;
  variant?: TimelineVariant;
  /**
   * Which way the sequence runs. `horizontal` lays the items out as columns on
   * a rail wider than the screen, swiped through rather than scrolled down.
   */
  orientation?: TimelineOrientation;
  /**
   * Horizontal only: land a flick on a column rather than between two.
   *
   * On by default, because the thing being moved between is a column — stopping
   * halfway shows two half-columns and no whole one.
   */
  snap?: boolean;
  /**
   * Horizontal only: a tick as the reading edge passes from one column to the
   * next. Needs `snap`, since a scroll that lands anywhere has no detents to
   * feel. Off by default — a haptic per column is a lot for a long history, and
   * whether this one is worth feeling is the caller's call.
   */
  haptics?: boolean;
  /**
   * Horizontal only: which column is at the reading edge, reported as it
   * changes.
   *
   * For anything outside the rail that belongs to the column being read — a
   * masthead naming it, a caption, a picture. Without it that block can only
   * show the same thing for the whole run, which makes a swipe through ten
   * columns a swipe under one unchanging heading.
   *
   * The index is the column's position among the rendered items, not its
   * `step`: `step` is the progress value and may be sparse or repeated, so it
   * cannot address a column.
   *
   * It fires on the crossing, not per frame — the reading edge passing from
   * one column to the next — so it is a state update per column rather than
   * per scroll event.
   */
  onColumnChange?: (index: number) => void;
  children?: ReactNode;
}

const TimelineRoot = forwardRef<ViewRef, TimelineProps>(
  (
    {
      className,
      value = 0,
      variant = 'dot',
      orientation = 'vertical',
      snap = true,
      haptics = false,
      onColumnChange,
      children,
      ...props
    },
    ref
  ) => {
    const horizontal = orientation === 'horizontal';
    const { root } = timelineVariants({ variant, orientation });
    const reducedMotion = useReducedMotion();
    const scrollX = useSharedValue(0);
    const border = useCSSVariable('--color-border');

    /*
     * The columns' left edges, from the same width rule the items size
     * themselves by. These are the snap points, and they are what an item reads
     * to know how far it is from the reading edge.
     */
    const columns = useMemo(() => {
      if (!horizontal) return { offsets: [], children };
      const items: ReactElement<TimelineItemProps>[] = [];
      Children.forEach(children, (child) => {
        if (isValidElement(child) && child.type === TimelineItem) {
          items.push(child as ReactElement<TimelineItemProps>);
        }
      });
      const offsets = timelineColumnOffsets(items.map((item) => itemWidth(item.props)));
      let position = 0;
      const rendered = Children.map(children, (child) => {
        if (!isValidElement(child) || child.type !== TimelineItem) return child;
        const offset = offsets[position++] ?? 0;
        return (
          <TimelineColumnOffsetContext.Provider value={offset}>
            {child}
          </TimelineColumnOffsetContext.Provider>
        );
      });
      return { offsets, children: rendered };
    }, [children, horizontal]);
    const { offsets } = columns;

    const context = useMemo(
      () => ({
        activeStep: value,
        variant,
        orientation,
        scrollX,
        offsets,
        animate: !reducedMotion,
        virtualized: false,
      }),
      [value, variant, orientation, scrollX, offsets, reducedMotion]
    );

    const onScroll = useAnimatedScrollHandler((event) => {
      scrollX.value = event.contentOffset.x;
    });

    useColumnDetent(scrollX, offsets, horizontal && snap && haptics, horizontal ? onColumnChange : undefined);

    if (!horizontal) {
      return (
        <TimelineContext.Provider value={context}>
          <View ref={ref} className={root({ className })} {...props}>
            {textChildren(children)}
          </View>
        </TimelineContext.Provider>
      );
    }

    return (
      <TimelineContext.Provider value={context}>
        <View ref={ref} className={root({ className })} {...props}>
          <AnimatedScrollView
            horizontal
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToOffsets={snap ? offsets : undefined}
          >
            {/*
              The track sizes itself to its columns, so the rail stretched
              between its own left and right edges runs the whole length of the
              sequence rather than the width of the screen.
            */}
            <View className="relative flex-row">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: HORIZONTAL_RAIL_TOP,
                  borderTopWidth: 1,
                  // Dashed borders only render at a radius of zero, which this
                  // has, and the rule is the whole element.
                  borderStyle: 'dashed',
                  borderColor: typeof border === 'string' ? border : undefined,
                }}
              />
              {textChildren(columns.children)}
            </View>
          </AnimatedScrollView>
        </View>
      </TimelineContext.Provider>
    );
  }
);
TimelineRoot.displayName = 'Timeline';

export interface TimelineListProps<T>
  extends Omit<
    FlatListProps<T>,
    | 'data'
    | 'renderItem'
    | 'horizontal'
    | 'getItemLayout'
    | 'onScroll'
    | 'snapToOffsets'
    | 'CellRendererComponent'
  > {
  /** Complete event collection; rows outside the native window stay unmounted. */
  data: readonly T[];
  /** Render one `Timeline.Item`. Its step, width, and last marker are owned by the list. */
  renderItem: (info: ListRenderItemInfo<T>) => ReactElement<TimelineItemProps>;
  /** Width of each column, or a resolver for mixed-width histories. */
  itemWidth?: number | ((item: T, index: number) => number);
  /** Steps at or below this index render as completed. */
  value?: number;
  variant?: TimelineVariant;
  snap?: boolean;
}

/**
 * Opt-in bounded mount path for long horizontal histories. The compound
 * `Timeline` API remains the simpler choice for short or mixed-content lists.
 */
function TimelineList<T>({
  data,
  renderItem,
  itemWidth: requestedWidth = TIMELINE_WIDE_COLUMN,
  value = 0,
  variant = 'dot',
  snap = true,
  initialNumToRender = 6,
  maxToRenderPerBatch = 6,
  windowSize = 5,
  className,
  ...props
}: TimelineListProps<T>) {
  const reducedMotion = useReducedMotion();
  const scrollX = useSharedValue(0);
  const widths = useMemo(
    () =>
      data.map((item, index) =>
        timelineColumnWidth(
          typeof requestedWidth === 'function' ? requestedWidth(item, index) : requestedWidth,
          true
        )
      ),
    [data, requestedWidth]
  );
  const offsets = useMemo(() => {
    let offset = 0;
    return widths.map((width) => {
      const current = offset;
      offset += width;
      return current;
    });
  }, [widths]);
  const context = useMemo(
    () => ({
      activeStep: value,
      variant,
      orientation: 'horizontal' as const,
      scrollX,
      offsets,
      animate: !reducedMotion,
      virtualized: true,
    }),
    [value, variant, scrollX, offsets, reducedMotion]
  );
  const { root } = timelineVariants({ variant, orientation: 'horizontal' });
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <TimelineContext.Provider value={context}>
      <Animated.FlatList
        data={data}
        horizontal
        accessibilityRole="list"
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        initialNumToRender={initialNumToRender}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        removeClippedSubviews
        className={root({ className })}
        {...props}
        getItemLayout={(_, index) => ({
          index,
          length: widths[index] ?? TIMELINE_WIDE_COLUMN,
          offset: offsets[index] ?? 0,
        })}
        snapToOffsets={snap ? offsets : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={(info) => (
          /*
           * The list owns the order, so it hands each column its own left edge
           * the same way the compound root does. An item reads its offset from
           * here rather than indexing by `step`, and a virtualized item that
           * was given none would sit at zero and never recede.
           */
          <TimelineColumnOffsetContext.Provider value={offsets[info.index] ?? 0}>
            {cloneElement(renderItem(info), {
              step: info.index,
              width: widths[info.index],
              last: info.index === data.length - 1,
              role: 'listitem',
            })}
          </TimelineColumnOffsetContext.Provider>
        )}
      />
    </TimelineContext.Provider>
  );
}
TimelineList.displayName = 'Timeline.List';

export interface TimelineItemProps extends ViewProps {
  className?: string;
  /** Position in the sequence, zero-based. */
  step: number;
  /** Force the completed state regardless of the timeline's value. */
  completed?: boolean;
  /** Colours the node and label — for event kind rather than progress. */
  tone?: TimelineTone;
  /** Set on the final item so its rail stops at the indicator. */
  last?: boolean;
  /**
   * Horizontal only: how wide this column is, in points.
   *
   * Left out, a column that carries content takes a readable width and one that
   * carries none collapses to a tick — so a quiet stretch of the sequence
   * compresses instead of paying full width for nothing. Set it to override
   * that for a column that needs more or less room than its contents suggest.
   * It must be finite and greater than zero; invalid values use the content default.
   */
  width?: number;
  children?: ReactNode;
}

const TimelineItem = forwardRef<ViewRef, TimelineItemProps>(
  (
    {
      className,
      step,
      completed,
      tone = 'default',
      last = false,
      width,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const { activeStep, variant, orientation, scrollX, animate, virtualized } =
      useTimeline('Timeline.Item');
    /*
     * Where this column starts, from its position among the rendered items
     * rather than from `step`. `step` is the semantic progress value: it may
     * be sparse, repeated or reordered, and indexing the offsets by it lands a
     * column on another column's snap point.
     */
    const columnOffset = useContext(TimelineColumnOffsetContext);
    const border = useCSSVariable('--color-border');
    const isCompleted = completed ?? step <= activeStep;
    const { item } = timelineVariants({
      variant,
      tone,
      completed: isCompleted,
      orientation,
    });
    const horizontal = orientation === 'horizontal';

    const columnWidth = horizontal
      ? itemWidth({ step, width, children } as TimelineItemProps)
      : undefined;
    const offset = columnOffset ?? 0;

    const context = useMemo(
      () => ({
        step,
        completed: isCompleted,
        tone,
        showSeparator: !last,
        offset,
        columnWidth: columnWidth ?? 0,
      }),
      [step, isCompleted, tone, last, offset, columnWidth]
    );

    /*
     * A column scales and drops as it leaves the reading edge, so the one being
     * read is distinct without fading informative text below its contrast.
     *
     * One column's width either side, not two: a window wide enough to hold
     * three columns near full strength is a row where nothing is picked out,
     * and picking one out is the whole job. The neighbours stay legible at the
     * far end of it — a timeline is worth reading for what came before and
     * after — they simply stop competing.
     *
     * The scale and the drop are what turn a fade into a focus. Four points and
     * four percent is under the threshold where anybody would call it movement,
     * and over the one where the column at the edge stops looking flat against
     * the rest.
     */
    const columnStyle = useAnimatedStyle(() => {
      if (!horizontal || !animate) return { transform: [] };
      const distance = Math.abs(scrollX.value - offset);
      const window = Math.max(columnWidth ?? timelineColumnWidth(undefined, true), 1);
      const away = interpolate(distance, [0, window], [0, 1], 'clamp');
      return {
        transform: [{ scale: 1 - away * 0.04 }, { translateY: away * 4 }],
      };
    });

    if (!horizontal) {
      return (
        <TimelineItemContext.Provider value={context}>
          <View ref={ref} className={item({ className })} style={style} {...props}>
            {textChildren(children)}
          </View>
        </TimelineItemContext.Provider>
      );
    }

    return (
      <TimelineItemContext.Provider value={context}>
        <Animated.View
          ref={ref}
          className={item({ className })}
          {...props}
          style={[
            style,
            // The band above the rail, reserved whether or not this column
            // writes a `Timeline.Aside` into it.
            { width: columnWidth, paddingTop: HORIZONTAL_RAIL_TOP },
            columnStyle,
          ]}
        >
          {virtualized && !last ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: HORIZONTAL_RAIL_TOP,
                borderTopWidth: 1,
                borderStyle: 'dashed',
                borderColor: typeof border === 'string' ? border : undefined,
              }}
            />
          ) : null}
          {textChildren(children)}
        </Animated.View>
      </TimelineItemContext.Provider>
    );
  }
);
TimelineItem.displayName = 'Timeline.Item';

/**
 * Right-aligned meta column to the left of the rail — a time, a category, a
 * person. Place it before `Timeline.Indicator`.
 */
const TimelineAside = forwardRef<ViewRef, ViewProps & { className?: string }>(
  ({ className, style, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Aside');
    const { aside } = timelineVariants({ variant, orientation });

    return (
      <View
        ref={ref}
        className={aside({ className })}
        /*
         * Horizontal: this draws *into* the band the column has already
         * reserved, rather than being the thing that reserves it — hence the
         * negative margin cancelling its own height. A column with a longer
         * label therefore cannot push its own tick below everybody else's, and
         * a column with no aside at all still has its tick on the rail.
         */
        style={
          orientation === 'horizontal'
            ? [{ height: HORIZONTAL_RAIL_TOP, marginTop: -HORIZONTAL_RAIL_TOP }, style]
            : style
        }
        {...props}
      />
    );
  }
);
TimelineAside.displayName = 'Timeline.Aside';

export interface TimelineIndicatorProps extends ViewProps {
  className?: string;
  /** Replaces the default node contents — an icon, say. */
  children?: ReactNode;
}

/**
 * The node on the rail, with the connector running below it.
 *
 * Children are wrapped in an `IconColorProvider` carrying the colour that
 * reads against this node, so an icon inside follows the theme instead of
 * disappearing when the fill inverts.
 */
const TimelineIndicator = forwardRef<ViewRef, TimelineIndicatorProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Indicator');
    const { step, completed, tone, showSeparator } =
      useTimelineItem('Timeline.Indicator');
    const { rail, indicator, indicatorLabel, separator } = timelineVariants({
      variant,
      tone,
      completed,
      orientation,
    });

    /*
     * Horizontal: a tick sitting on the rail, not a node with a connector
     * running out of it. The rail is already drawn across the whole track by
     * the root, so what a column owes it is the mark saying where this entry
     * falls — pulled up by half its height to straddle the line rather than
     * hang off it.
     */
    if (orientation === 'horizontal') {
      return (
        <View className={rail()}>
          <View
            ref={ref}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={indicator({
              className: `w-px rounded-none ${completed ? 'bg-primary' : 'bg-muted-foreground'} ${className ?? ''}`,
            })}
            style={{
              height: HORIZONTAL_TICK_HEIGHT,
              marginTop: -HORIZONTAL_TICK_HEIGHT / 2,
            }}
            {...props}
          />
        </View>
      );
    }

    // dot/card nodes are small discs with nothing inside, so they keep full
    // saturation — a soft tint at 16px would disappear. Nodes that hold an
    // icon or a number take the tinted fill instead.
    const isDisc = SOLID_VARIANTS.includes(variant);
    const toned = tone !== 'default';

    const fill = isDisc ? 'solid' : 'tinted';
    const nodeClass = toned
      ? TONE_NODE[tone][fill]
      : completed
        ? TONE_NODE.default.solid
        : PENDING_NODE[fill];

    // Contents sit on the tint (or on primary once complete), so they take the
    // colour tuned to read against it.
    const tintedContent = useCSSVariable(
      toned ? TONE_ICON_VAR[tone] : '--color-muted-foreground'
    );
    const solidContent = useCSSVariable('--color-primary-foreground');

    const resolved = (value: unknown) =>
      typeof value === 'string' ? value : undefined;

    const contentColor =
      !toned && completed ? resolved(solidContent) : resolved(tintedContent);

    return (
      <View className={rail()}>
        <IconColorProvider color={contentColor}>
          <View ref={ref} className={indicator({ className: `${nodeClass} ${className ?? ''}` })} {...props}>
            {variant === 'numbered' ? (
              <Text className={indicatorLabel()} style={{ color: contentColor }}>
                {step + 1}
              </Text>
            ) : variant === 'icon' || variant === 'compact' ? (
              children
            ) : null}
          </View>
        </IconColorProvider>
        {showSeparator ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className={separator()}
          />
        ) : null}
      </View>
    );
  }
);
TimelineIndicator.displayName = 'Timeline.Indicator';

/**
 * Everything to the right of the rail. Under `variant="card"` the children are
 * wrapped in the card panel, while the spacing between items stays outside it
 * so the connector runs unbroken.
 */
const TimelineContent = forwardRef<ViewRef, ViewProps & { className?: string }>(
  ({ className, children, style, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Content');
    const { completed, tone } = useTimelineItem('Timeline.Content');
    const { body, panel } = timelineVariants({ variant, tone, completed, orientation });
    const horizontal = orientation === 'horizontal';

    /*
     * Horizontal content is not dimmed as a block. The column already carries
     * the focus — it is nearer, and its text runs to the foreground as it comes
     * to the reading edge — and fading the whole slot on top of that would take
     * the neighbours out of the timeline rather than out of the way.
     */

    const inner =
      variant === 'card' ? (
        <View className={panel()}>{textChildren(children)}</View>
      ) : (
        children
      );

    if (!horizontal) {
      return (
        <View ref={ref} className={body({ className })} style={style} {...props}>
          {inner}
        </View>
      );
    }

    return (
      <View ref={ref} className={body({ className })} style={style} {...props}>
        {inner}
      </View>
    );
  }
);
TimelineContent.displayName = 'Timeline.Content';

/** Title row: heading on the left, `Timeline.Trailing` on the right. */
const TimelineHeader = forwardRef<ViewRef, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Header');
    const { header } = timelineVariants({ variant, orientation });
    return <View ref={ref} className={header({ className })} {...props} />;
  }
);
TimelineHeader.displayName = 'Timeline.Header';

/** Wraps a title and anything stacked under it inside the header row. */
const TimelineHeading = forwardRef<ViewRef, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Heading');
    const { heading } = timelineVariants({ variant, orientation });
    return <View ref={ref} className={heading({ className })} {...props} />;
  }
);
TimelineHeading.displayName = 'Timeline.Heading';

const TimelineDate = forwardRef<TextRef, TextProps>(({ className, style, ...props }, ref) => {
  const { variant, orientation } = useTimeline('Timeline.Date');
  const { date } = timelineVariants({ variant, orientation });
  const ink = useColumnInk('Timeline.Date');
  if (!ink.horizontal) {
    return <Text ref={ref} className={date({ className })} style={style} {...props} />;
  }
  return (
    <AnimatedText ref={ref} className={date({ className })} style={[style, ink.style]} {...props} />
  );
});
TimelineDate.displayName = 'Timeline.Date';

/** Category line in the aside, coloured by the item's tone. */
const TimelineLabel = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { variant, orientation } = useTimeline('Timeline.Label');
  const { tone } = useTimelineItem('Timeline.Label');
  const { label } = timelineVariants({ variant, tone, orientation });
  return <Text ref={ref} className={label({ className })} {...props} />;
});
TimelineLabel.displayName = 'Timeline.Label';

/** Muted supporting line — a person's name, a source. */
const TimelineMeta = forwardRef<TextRef, TextProps>(({ className, style, ...props }, ref) => {
  const { variant, orientation } = useTimeline('Timeline.Meta');
  const { meta } = timelineVariants({ variant, orientation });
  const ink = useColumnInk('Timeline.Meta');
  if (!ink.horizontal) {
    return <Text ref={ref} className={meta({ className })} style={style} {...props} />;
  }
  return (
    <AnimatedText ref={ref} className={meta({ className })} style={[style, ink.style]} {...props} />
  );
});
TimelineMeta.displayName = 'Timeline.Meta';

const TimelineTitle = forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => {
  const { variant, orientation } = useTimeline('Timeline.Title');
  const { title } = timelineVariants({ variant, orientation });
  return <Text ref={ref} className={title({ className })} {...props} />;
});
TimelineTitle.displayName = 'Timeline.Title';

/** Right-hand slot in the header row — a timestamp, usually. */
const TimelineTrailing = forwardRef<TextRef, TextProps>(
  ({ className, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Trailing');
    const { trailing } = timelineVariants({ variant, orientation });
    return <Text ref={ref} className={trailing({ className })} {...props} />;
  }
);
TimelineTrailing.displayName = 'Timeline.Trailing';

const TimelineDescription = forwardRef<TextRef, TextProps>(
  ({ className, style, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Description');
    const { content } = timelineVariants({ variant, orientation });
    const ink = useColumnInk('Timeline.Description');
    if (!ink.horizontal) {
      return <Text ref={ref} className={content({ className })} style={style} {...props} />;
    }
    return (
      <AnimatedText
        ref={ref}
        className={content({ className })}
        style={[style, ink.style]}
        {...props}
      />
    );
  }
);
TimelineDescription.displayName = 'Timeline.Description';

/** Bordered strip of label/value pairs under a title. */
const TimelineStats = forwardRef<ViewRef, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Stats');
    const { stats } = timelineVariants({ variant, orientation });
    return <View ref={ref} className={stats({ className })} {...props} />;
  }
);
TimelineStats.displayName = 'Timeline.Stats';

export interface TimelineStatProps extends ViewProps {
  className?: string;
  label: string;
  value: string;
}

const TimelineStat = forwardRef<ViewRef, TimelineStatProps>(
  ({ className, label, value, ...props }, ref) => {
    const { variant, orientation } = useTimeline('Timeline.Stat');
    const { statLabel, statValue } = timelineVariants({ variant, orientation });
    return (
      <View ref={ref} className={className} {...props}>
        <Text className={statLabel()}>{label}</Text>
        <Text className={statValue()}>{value}</Text>
      </View>
    );
  }
);
TimelineStat.displayName = 'Timeline.Stat';

export interface TimelineMastheadProps extends ViewProps {
  className?: string;
  /**
   * What sits above the two lines — a logo pair, an avatar stack, a single
   * mark. Anything; the slot only lays it out in a row.
   */
  media?: ReactNode;
  /** The small line: what kind of thing the run below is. */
  label?: string;
  /** The name of it, in the size the eye lands on first. */
  title?: string;
  /** Anything else, below the title. */
  children?: ReactNode;
}

/**
 * The block above a horizontal rail, saying what the run of columns is.
 *
 * Media, then a small label, then the name — the order a reader takes them in
 * anyway, and the reason it is a part rather than two `Text`s at every call
 * site: the pair has to be typeset as one unit, and a masthead written by hand
 * is a heading above another heading.
 *
 * ```tsx
 * <Timeline.Masthead
 *   media={
 *     <Avatar.Group size="sm">
 *       <Avatar fallback="A"><AppleIcon size={18} /></Avatar>
 *     </Avatar.Group>
 *   }
 *   label="Built for"
 *   title="iOS and Android"
 * />
 *
 * <Timeline orientation="horizontal">…</Timeline>
 * ```
 *
 * It sits outside the `Timeline`, above it, because it belongs to the whole
 * run rather than to any column in it — and a column is the only thing a
 * horizontal `Timeline` lays out.
 */
const TimelineMasthead = forwardRef<ViewRef, TimelineMastheadProps>(
  ({ className, media, label, title, children, ...props }, ref) => {
    const { masthead, mastheadMedia, mastheadLabel, mastheadTitle } = timelineVariants({
      orientation: 'horizontal',
    });

    return (
      <View ref={ref} className={masthead({ className })} {...props}>
        {media ? <View className={mastheadMedia()}>{media}</View> : null}
        {label !== undefined || title !== undefined ? (
          <View>
            {label !== undefined ? <Text className={mastheadLabel()}>{label}</Text> : null}
            {title !== undefined ? <Text className={mastheadTitle()}>{title}</Text> : null}
          </View>
        ) : null}
        {children}
      </View>
    );
  }
);
TimelineMasthead.displayName = 'Timeline.Masthead';

export const Timeline = Object.assign(TimelineRoot, {
  List: TimelineList,
  Item: TimelineItem,
  Aside: TimelineAside,
  Masthead: TimelineMasthead,
  Indicator: TimelineIndicator,
  Content: TimelineContent,
  Header: TimelineHeader,
  Heading: TimelineHeading,
  Date: TimelineDate,
  Label: TimelineLabel,
  Meta: TimelineMeta,
  Title: TimelineTitle,
  Trailing: TimelineTrailing,
  Description: TimelineDescription,
  Stats: TimelineStats,
  Stat: TimelineStat,
});
