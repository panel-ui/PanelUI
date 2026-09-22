/**
 * SankeyChart — where a quantity came from and where it ended up.
 *
 * ```tsx
 * <SankeyChart nodes={stages} links={flows}>
 *   <SankeyChart.Header title="Traffic" value="128,400" />
 *   <SankeyChart.Links />
 *   <SankeyChart.Nodes />
 *   <SankeyChart.Labels />
 *   <SankeyChart.Tooltip />
 * </SankeyChart>
 * ```
 *
 * ## What it answers that the other charts do not
 *
 * Every other chart here takes one set of things and measures them. This one
 * takes two and says how much of the first became the second. A treemap cuts a
 * total into its parts, a funnel counts what survived each step, a waterfall
 * carries a balance from one figure to another — none of them can say that
 * *this* source fed *that* destination, because none of them draws a thing that
 * has two ends.
 *
 * So the question to bring to it is a routing question. Which campaigns
 * produced which signups; which budget lines paid for which departments; what
 * the traffic that arrived on the landing page went on to do. If the answer
 * does not need a source *and* a target, one of the simpler charts will read
 * better at the same size.
 *
 * ## The ribbon is the reading
 *
 * A ribbon's thickness is its value, on one scale shared by the whole diagram,
 * so a ribbon twice as thick is twice as much wherever it is on the page. That
 * is the only quantity here: the horizontal distance a ribbon travels is the
 * number of columns between its ends and means nothing else, and the vertical
 * order within a column is chosen to keep the ribbons from crossing rather than
 * to rank anything.
 *
 * A node's height is what passes through it — the larger of what arrives and
 * what leaves, which are the same number unless some of it went nowhere. Where
 * they differ, give the node an explicit `value` to pin it; the diagram cannot
 * infer a loss it was never told about.
 *
 * ## Columns are the flow's, not the caller's
 *
 * Nothing about the order of the `nodes` array decides where a node is drawn. A
 * node that receives from another has to be drawn after it or its ribbon would
 * run backwards, so the columns come out of the links. `align` only settles the
 * cases the flow leaves open, and the default pushes every node that feeds
 * nothing into the last column, so the diagram ends on a straight edge of
 * destinations instead of a ragged one.
 *
 * ## Bad rows are dropped rather than fatal
 *
 * Flow data is nearly always joined together from somewhere nobody in the room
 * owns, and it arrives with rows that name a node that is not there, carry a
 * zero, or close a loop. A loop in particular has no left-to-right reading at
 * all. All of them are dropped and counted, and `onDropLinks` reports how many
 * — so a screen can say "3 rows could not be drawn" instead of going blank or
 * quietly showing less than it was given.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import {
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import {
  compactNumber,
  flowPath,
  flowPathVertical,
  seriesColorAt,
  useSeriesColor,
} from '../../utils/chart';
import { cn } from '../../utils/cn';
import { useDirection } from '../../hooks/use-direction';
import { useSkeletonHandoff } from '../../hooks/use-skeleton-handoff';
import {
  sankeyLayout,
  transposeLayout,
  type SankeyAlign,
  type SankeyCollapse,
  type SankeyLayout,
  type SankeyLayoutNode,
} from './sankey-layout';

export type { SankeyAlign, SankeyCollapse } from './sankey-layout';

/** Which way the flow runs. */
export type SankeyOrientation = 'horizontal' | 'vertical';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

/** How tall the diagram is drawn when the caller does not say. */
const DEFAULT_HEIGHT = 240;

/**
 * How much depth one stage of an upright flow is given when nothing says.
 *
 * A vertical diagram's height is the length of the flow, so unlike the
 * horizontal case it grows with the data: four stages in the height of three
 * is a set of bars with no room for a ribbon between them. Enough for a bar,
 * the names either side of it, and a run of ribbon long enough to read as one.
 */
const VERTICAL_STAGE = 132;

/** How thick a node's bar is. Thin enough to read as an edge the flow meets. */
const DEFAULT_NODE_WIDTH = 10;

/** The gap asked for between two nodes in a column. */
const DEFAULT_NODE_PADDING = 14;

/** Relaxation rounds. Where the arrangement stops visibly improving. */
const DEFAULT_ITERATIONS = 6;

/**
 * How far a ribbon's control points reach towards the middle.
 *
 * Exactly half, which puts both on the centre line and makes the two halves of
 * every ribbon mirror images. Anything less leaves a visible straight section
 * in the middle that reads as a kink where two ribbons were joined.
 */
const CURVE = 0.5;

/** A ribbon at rest. Translucent, because ribbons cross and both must be read. */
const LINK_OPACITY = 0.4;

/** A ribbon belonging to the selected node. */
const LINK_ACTIVE_OPACITY = 0.78;

/** And one that does not, once something is selected. */
const LINK_DIM_OPACITY = 0.08;

/** Milliseconds for one column of the flow to draw itself. */
const DEFAULT_DURATION = 620;

/** Milliseconds between one column starting and the next. */
const STAGGER = 110;

/** Milliseconds for a selection to take hold. */
const SELECT_DURATION = 180;

/** Space between a node's bar and its name. */
const LABEL_GAP = 6;

/** The smallest a label's press target is allowed to be, in points. */
const MIN_TARGET = 44;

/**
 * The narrowest a vertical name's box may be and still be allowed two lines.
 *
 * Below this a break puts one or two characters on the second line, which
 * costs a whole line of height to say nothing. Roughly ten characters at the
 * size the names are set in.
 */
const WRAPPABLE = 72;

/** Columns the placeholder suggests while there is no data to count. */
const SKELETON_COLUMNS = 3;

/**
 * What takes the geometry out of the accessibility tree, per platform.
 *
 * The two native props reach the DOM untranslated through react-native-svg, so
 * on web they mean nothing and one of them draws a React warning for its
 * casing. `aria-hidden` is what hides an `<svg>` there.
 */
const HIDDEN = (
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }
) as Record<string, unknown>;

type Slot = 'svg' | 'overlay' | 'header' | 'footer';

export type SankeyChartStatus = 'loading' | 'ready';

export interface SankeyNode {
  /** Stable key the links name. Must be unique; a repeat is ignored. */
  id: string;
  /** Name drawn beside the bar. Defaults to the id. */
  label?: string;
  /** Explicit colour, instead of the node's place in the palette. */
  color?: string;
  /**
   * Pins what passes through the node, for a stage that loses some of what it
   * received to somewhere the links do not describe. Left unset the node is
   * worth the larger of what arrives and what leaves.
   */
  value?: number;
}

export interface SankeyLink {
  /** `id` of the node it leaves. */
  source: string;
  /** `id` of the node it reaches. */
  target: string;
  /** How much travels. Zero, negative and non-finite rows are dropped. */
  value: number;
  /** Explicit colour, instead of taking the source node's. */
  color?: string;
}

interface SankeyChartContextValue {
  nodes: SankeyNode[];
  links: SankeyLink[];
  layout: SankeyLayout;
  width: number;
  height: number;
  curve: number;
  /** One colour per laid-out node, in the laid-out order. */
  colors: string[];
  /** Where each column sits in the entrance, `0` to `1`. */
  windows: { from: number; to: number }[];
  reveal: SharedValue<number>;
  status: SankeyChartStatus;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  labelFor: (id: string) => string;
  orientation: SankeyOrientation;
  /**
   * The caller's datum for a laid-out node, or a stand-in for one the layout
   * invented. `collapse` produces bars nobody wrote a row for, and every part
   * that reaches for a node's own data would otherwise drop them silently —
   * which, for the bucket holding a column's whole tail, is the one bar on the
   * diagram that most needs its name.
   */
  datumFor: (node: SankeyLayoutNode) => SankeyNode;
  /**
   * How `SankeyChart.Labels` tells the chart which names it actually drew.
   *
   * The names are press targets, so a node that has one is already reachable
   * and saying it again in the semantic list below is a duplicate. A node that
   * does not — a bar too short to label — is reachable by nothing at all
   * unless the list keeps it. Only `Labels` knows which is which, because
   * only `Labels` has the threshold.
   */
  reportLabelled: (ids: string[] | null) => void;
}

const SankeyChartContext = createContext<SankeyChartContextValue | null>(null);

function useChart(component: string): SankeyChartContextValue {
  const context = useContext(SankeyChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SankeyChart>`);
  }
  return context;
}

/** One end of a stream meeting the selected node. */
export interface SankeyChartFlow {
  /** The node at the other end. */
  id: string;
  /** Its name, already resolved. */
  label: string;
  /** What travels between the two. */
  value: number;
  /** That value as a fraction of the selected node's total, `0` to `1`. */
  share: number;
  /** The other node's colour, for a swatch beside its name. */
  color: string;
}

/** The selected node and what runs through it, for something drawn inside the chart. */
export function useSankeyChart() {
  const { nodes, layout, activeId, colors, labelFor } = useChart('useSankeyChart');

  return useMemo(() => {
    const placed = activeId ? layout.nodes.find((node) => node.id === activeId) : undefined;
    if (!placed) {
      return {
        activeId: null,
        activeNode: null,
        activeValue: 0,
        incoming: 0,
        outgoing: 0,
        sources: [] as SankeyChartFlow[],
        targets: [] as SankeyChartFlow[],
        collapsed: null as string[] | null,
      };
    }

    const position = layout.nodes.indexOf(placed);
    let incoming = 0;
    let outgoing = 0;
    const sources: SankeyChartFlow[] = [];
    const targets: SankeyChartFlow[] = [];

    const flow = (at: number, value: number): SankeyChartFlow | null => {
      const other = layout.nodes[at];
      if (!other) return null;
      return {
        id: other.id,
        label: labelFor(other.id),
        value,
        // Against what passes through the node rather than against the side's
        // own total, so in and out are read on one scale — at a node that
        // loses some of what it received, two totals that differ is the point.
        share: placed.value > 0 ? value / placed.value : 0,
        color: colors[at] ?? colors[0] ?? '#3b82f6',
      };
    };

    for (const link of layout.links) {
      if (link.target === position) {
        incoming += link.value;
        const row = flow(link.source, link.value);
        if (row) sources.push(row);
      }
      if (link.source === position) {
        outgoing += link.value;
        const row = flow(link.target, link.value);
        if (row) targets.push(row);
      }
    }

    // Largest first: the reason to open a breakdown is to find out what the
    // biggest part of it was.
    sources.sort((a, b) => b.value - a.value);
    targets.sort((a, b) => b.value - a.value);

    return {
      activeId,
      activeNode: nodes[placed.index] ?? { id: placed.id },
      /** What passes through it — what the bar's height is drawn from. */
      activeValue: placed.value,
      /** What arrives. Zero at a node the flow starts from. */
      incoming,
      /** What leaves. Zero at a node the flow ends at. */
      outgoing,
      /** Where it came from, largest first. */
      sources,
      /** Where it went, largest first. */
      targets,
      /** The ids `collapse` folded in, on a bucket. `null` on every other node. */
      collapsed: placed.collapsed ?? null,
    };
  }, [nodes, layout, activeId, colors, labelFor]);
}

export interface SankeyChartProps
  extends ViewProps,
    ChartAccessibilityProps<SankeyNode> {
  className?: string;
  /** The stages. Order does not decide position — the links do. */
  nodes: SankeyNode[];
  /** What travels between them. */
  links: SankeyLink[];
  /**
   * How tall the diagram is drawn, in points. Under `orientation="vertical"`
   * this is the length of the flow rather than the size of the bars, and left
   * unset it is worked out from how many stages the flow turned out to need.
   *
   * The width is the card's, but nothing in a flow says how deep it should be:
   * a diagram of four nodes and one of forty are the same data at two heights,
   * and which of them is right is a question about the screen.
   */
  height?: number;
  /** How thick a node's bar is, in points. */
  nodeWidth?: number;
  /**
   * The gap between two nodes in a column, in points.
   *
   * A maximum rather than a promise. A crowded column gives its spacing up
   * before it gives up the height of its bars, because the bar is the reading.
   */
  nodePadding?: number;
  /**
   * Which way the flow runs: `horizontal` from one side to the other,
   * `vertical` from the top of the diagram down to the bottom.
   *
   * This is the axis the *stages* advance along, not the one the bars point
   * along — a vertical flow draws its bars as horizontal rules and stacks them
   * down the screen. Prefer it on a phone: the stages get the long side of the
   * screen, and a name gets the whole width of the card instead of the gap
   * between two columns.
   */
  orientation?: SankeyOrientation;
  /**
   * Folds each column's smallest nodes into one bucket, named `Other` unless
   * you say otherwise.
   *
   * A ribbon carries its value in its thickness, so a column of thirty is
   * thirty hairlines. `maxPerColumn` caps how many nodes a column keeps, the
   * bucket included; `minShare` folds anything under that fraction of its own
   * column. A column where fewer than two nodes would go in is left alone,
   * because one node in a bucket is a rename rather than a simplification.
   */
  collapse?: SankeyCollapse;
  /** Which column a node goes in where the flow leaves a choice. */
  align?: SankeyAlign;
  /** Relaxation rounds spent untangling the ribbons. */
  iterations?: number;
  /** How far a ribbon bends, `0` for a straight diagonal and `0.5` for an S. */
  curve?: number;
  /** The first hue. The rest of the palette follows from the theme's tokens. */
  color?: string;
  /** Milliseconds for one column to draw itself. */
  animationDuration?: number;
  /** Milliseconds between one column starting and the next. `0` for all at once. */
  staggerDelay?: number;
  /** `loading` draws a plain placeholder until the data arrives. */
  status?: SankeyChartStatus;
  /** Selected node. Leave unset to let the chart track it. */
  activeId?: string | null;
  /** Fires with the selected node's id, or `null` when the selection is cleared. */
  onActiveIdChange?: (id: string | null) => void;
  /**
   * Fires with how many link rows could not be drawn — ones naming a node that
   * is not there, carrying nothing, or closing a loop. `0` after a clean render,
   * so a banner can be shown and taken away from the same signal.
   */
  onDropLinks?: (count: number) => void;
  /**
   * Overrides what a screen reader says for one ribbon.
   *
   * The ribbons are the reading — a node's total says how much passed through
   * it, never where it went — so each one is spoken in its own right, as
   * "source to target, value". Only the rows that could be drawn are offered;
   * a dropped row is reported through `onDropLinks` instead.
   */
  accessibilityLabelForLink?: (link: SankeyLink, index: number) => string;
  children?: ReactNode;
}

/** Imperative handle: re-run the entrance, for a "replay" control. */
export interface SankeyChartHandle {
  replay: () => void;
}

const SankeyChartRoot = forwardRef<SankeyChartHandle, SankeyChartProps>(
  function SankeyChartRoot(
    {
      className,
      nodes,
      links,
      height: heightProp,
      nodeWidth = DEFAULT_NODE_WIDTH,
      nodePadding = DEFAULT_NODE_PADDING,
      orientation = 'horizontal',
      collapse,
      align = 'justify',
      iterations = DEFAULT_ITERATIONS,
      curve = CURVE,
      color,
      animationDuration = DEFAULT_DURATION,
      staggerDelay = STAGGER,
      status = 'ready',
      activeId: activeIdProp,
      onActiveIdChange,
      onDropLinks,
      accessibilityLabel,
      accessibilityHint,
      accessibilityLabelForDatum,
      accessibilityLabelForLink,
      onAccessibilityDatumPress,
      children,
      ...props
    },
    ref
  ) {
    const [width, setWidth] = useState(0);
    const [internalActive, setInternalActive] = useState<string | null>(null);
    const reveal = useSharedValue(0);
    const reducedMotion = useReducedMotion();
    const direction = useDirection();

    const controlled = activeIdProp !== undefined;
    const activeId = controlled ? activeIdProp : internalActive;

    const setActiveId = useMemo(
      () => (id: string | null) => {
        if (!controlled) setInternalActive(id);
        onActiveIdChange?.(id);
      },
      [controlled, onActiveIdChange]
    );

    const upright = orientation === 'horizontal';

    /*
     * How many stages the flow needs, for the case where the height has to be
     * worked out from it. Solved with no relaxation rounds and in an arbitrary
     * box, because the column count falls out of the links alone — the
     * arrangement inside the columns is exactly the part being skipped.
     */
    const stages = useMemo(() => {
      if (upright || heightProp !== undefined) return 0;
      return sankeyLayout(nodes, links, {
        width: 1000,
        height: 1000,
        nodeWidth,
        nodePadding,
        align,
        iterations: 0,
        collapse,
      }).columns;
    }, [upright, heightProp, nodes, links, nodeWidth, nodePadding, align, collapse]);

    const height =
      heightProp ??
      (upright ? DEFAULT_HEIGHT : Math.max(DEFAULT_HEIGHT, stages * VERTICAL_STAGE));

    const layout = useMemo(() => {
      /*
       * An upright flow is solved in the box as given. A vertical one is
       * solved in that box turned on its side and then turned back, so the
       * stages advance down the screen — one set of maths, read the other way.
       */
      const solved = sankeyLayout(nodes, links, {
        width: upright ? width : height,
        height: upright ? height : width,
        nodeWidth,
        nodePadding,
        align,
        iterations,
        collapse,
      });
      return upright ? solved : transposeLayout(solved);
    }, [nodes, links, width, height, nodeWidth, nodePadding, align, iterations, collapse, upright]);

    /*
     * A flow reads from where it starts, and under a right-to-left layout that
     * is the right-hand edge. Mirroring the finished layout rather than laying
     * it out backwards keeps one set of maths under both directions — the
     * arrangement is identical, it is only read from the other end.
     *
     * Only where the flow runs across the screen. A vertical one starts at the
     * top in every script, and mirroring it would flip the axis carrying the
     * values rather than the one carrying the order — the same diagram with
     * its bars reflected, for no reason a reader could name.
     */
    const mirrored = direction === 'rtl' && upright;
    const placed = useMemo<SankeyLayout>(() => {
      if (!mirrored || !layout.nodes.length) return layout;
      return {
        ...layout,
        nodes: layout.nodes.map((node) => ({
          ...node,
          x0: width - node.x1,
          x1: width - node.x0,
        })),
      };
    }, [layout, mirrored, width]);

    const dropped = layout.dropped;
    useEffect(() => {
      onDropLinks?.(dropped);
    }, [dropped, onDropLinks]);

    const c1 = useSeriesColor(color, 1);
    const c2 = useSeriesColor(undefined, 2);
    const c3 = useSeriesColor(undefined, 3);
    const c4 = useSeriesColor(undefined, 4);
    const c5 = useSeriesColor(undefined, 5);
    const palette = useMemo(() => [c1, c2, c3, c4, c5], [c1, c2, c3, c4, c5]);

    /*
     * Coloured by the node's own position in the data rather than by its column.
     * A colour per column would say the column means something, and it does not
     * — it is just how far along the flow a node happens to sit.
     */
    const colors = useMemo(
      () =>
        placed.nodes.map(
          (node, index) => nodes[node.index]?.color ?? seriesColorAt(palette, index)
        ),
      [placed.nodes, nodes, palette]
    );

    const labelFor = useMemo(() => {
      const names = new Map(nodes.map((node) => [node.id, node.label ?? node.id]));
      return (id: string) => names.get(id) ?? id;
    }, [nodes]);

    const datumFor = useMemo(
      () => (node: SankeyLayoutNode) => nodes[node.index] ?? { id: node.id },
      [nodes]
    );

    /*
     * One clock, with each column given the slice of it that it draws in, so
     * the flow arrives in the order it happens rather than all at once. A
     * shared value per column would be the same animation played n times and n
     * more things a replay would have to find.
     */
    const stagger = Math.max(0, staggerDelay);
    const columns = Math.max(placed.columns, 1);
    const total = animationDuration + Math.max(columns - 1, 0) * stagger;
    const windows = useMemo(
      () =>
        Array.from({ length: columns }, (_, column) => {
          const from = column * stagger;
          return {
            from: total > 0 ? from / total : 0,
            to: total > 0 ? (from + animationDuration) / total : 1,
          };
        }),
      [columns, stagger, animationDuration, total]
    );

    const playReveal = useMemo(
      () => () => {
        if (reducedMotion) {
          reveal.value = 1;
          return;
        }
        reveal.value = 0;
        // Linear, because the shaping is per column: each one eases inside its
        // own window, and easing the clock as well would ease it twice.
        reveal.value = withTiming(1, { duration: total, easing: Easing.linear });
      },
      [reducedMotion, total, reveal]
    );

    const loading = status === 'loading';
    const revealed = useRef(false);

    useEffect(() => {
      if (loading) {
        revealed.current = false;
        reveal.value = 0;
        return;
      }
      if (revealed.current || !placed.nodes.length) return;
      revealed.current = true;
      playReveal();
    }, [loading, placed.nodes.length, playReveal, reveal]);

    useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

    // Measured on the plot's own view rather than the outer one, so a header or
    // a footer cannot change how wide the diagram thinks it is.
    const onLayout = (event: LayoutChangeEvent) => {
      const next = Math.round(event.nativeEvent.layout.width);
      if (next !== width) setWidth(next);
    };

    /*
     * The ids `SankeyChart.Labels` drew a name for, or `null` while it has not
     * said. Compared rather than replaced, because Labels reports on every
     * layout change and a fresh array each time would re-render the chart
     * forever.
     */
    const [labelledIds, setLabelledIds] = useState<string[] | null>(null);
    const reportLabelled = useMemo(
      () => (ids: string[] | null) =>
        setLabelledIds((current) => {
          if (current === ids) return current;
          if (current === null || ids === null) return ids;
          if (current.length === ids.length && current.every((id, i) => id === ids[i])) {
            return current;
          }
          return ids;
        }),
      []
    );

    const context = useMemo<SankeyChartContextValue>(
      () => ({
        nodes,
        links,
        layout: placed,
        width,
        height,
        curve,
        colors,
        windows,
        reveal,
        status,
        activeId: activeId ?? null,
        setActiveId,
        labelFor,
        reportLabelled,
        orientation,
        datumFor,
      }),
      [
        nodes,
        links,
        placed,
        width,
        height,
        curve,
        colors,
        windows,
        reveal,
        status,
        activeId,
        setActiveId,
        labelFor,
        reportLabelled,
        orientation,
        datumFor,
      ]
    );

    const slots: Record<Slot, ReactNode[]> = {
      svg: [],
      overlay: [],
      header: [],
      footer: [],
    };
    /*
     * Whether the names are on the chart decides how it is read out. Without
     * `Labels` the diagram is pure geometry and the semantic list is the only
     * way through it. With them, most nodes are a pressable row already and
     * the list would say it all a second time — but only most: a bar too short
     * to label is left with no target and no entry, which is how the smallest
     * nodes on a crowded diagram became unreachable by either route. So the
     * list is narrowed to what `Labels` reports it dropped rather than turned
     * off wholesale.
     */
    let labelled = false;
    Children.forEach(children, (child, index) => {
      if (!isValidElement(child)) return;
      const slot = (child.type as { slot?: Slot }).slot ?? 'overlay';
      if ((child.type as { displayName?: string }).displayName === 'SankeyChart.Labels') {
        labelled = true;
      }
      slots[slot in slots ? slot : 'overlay'].push(
        <ChildSlot key={index}>{child}</ChildSlot>
      );
    });

    /*
     * The nodes the semantic list still has to carry.
     *
     * With no `Labels` that is all of them. With `Labels` it is the ones it
     * reported dropping — and until it has reported, none: a name that turns
     * out to exist is a duplicate entry, which is worse for one render than a
     * missing one, and the report lands on the render straight after.
     */
    const spoken = useMemo(() => {
      if (!labelled) return nodes;
      if (labelledIds === null) return [];
      const drawn = new Set(labelledIds);
      return nodes.filter((node) => !drawn.has(node.id));
    }, [nodes, labelled, labelledIds]);

    return (
      <SankeyChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {slots.header}
          <View onLayout={onLayout} style={{ height }} className="w-full">
            {width > 0 && height > 0 ? (
              <>
                {/*
                 * The geometry is decorative: every ribbon and bar in here is
                 * already spoken once, either by the names over it or by the
                 * semantic list below. Left in the tree it is a few hundred
                 * unlabelled paths to swipe through before reaching either.
                 */}
                <Svg width={width} height={height} {...HIDDEN}>
                  {slots.svg}
                </Svg>
                {/*
                 * Names sit over the SVG rather than inside it: they are text,
                 * and SVG text ignores the platform's text scaling and the
                 * theme's font.
                 */}
                {/*
                  * Laid out left to right whatever the reading direction, to
                  * match the SVG underneath it. React Native swaps `left` and
                  * `right` inside a right-to-left subtree, and the positions
                  * here are already mirrored — so left alone they would be
                  * mirrored a second time and every name would sit against the
                  * wrong side of the plot. The glyphs still run the right way:
                  * `Text` carries the writing direction of its own accord.
                  */}
                <View
                  pointerEvents="box-none"
                  style={{ position: 'absolute', width, height, direction: 'ltr' }}
                >
                  {slots.overlay}
                </View>
              </>
            ) : null}
          </View>
          {slots.footer}
          <ChartAccessibilityData
            chart="Flow diagram"
            data={spoken}
            disabled={status === 'loading' || (labelled && spoken.length === 0)}
            valueOf={(node) => [
              ['Node', node.label ?? node.id],
              ['Value', placed.nodes.find((placedNode) => placedNode.id === node.id)?.value],
            ]}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
          />
          <LinkAccessibilityData
            disabled={status === 'loading'}
            layout={placed}
            links={links}
            labelFor={labelFor}
            labelForLink={accessibilityLabelForLink}
          />
        </View>
      </SankeyChartContext.Provider>
    );
  }
);
SankeyChartRoot.displayName = 'SankeyChart';

function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * The ribbons, for a screen reader.
 *
 * Kept apart from the node list rather than folded into it, because the two
 * are different readings and a caller overrides them separately: a node says
 * how much passed through a stage, a ribbon says where it came from and where
 * it went. A diagram read out as nodes alone is a list of totals with the
 * routing — the thing the chart exists to show — missing from it.
 *
 * Offscreen rather than hidden, so the entries are reachable by swiping while
 * nothing about the drawn diagram moves.
 */
function LinkAccessibilityData({
  disabled,
  layout,
  links,
  labelFor,
  labelForLink,
}: {
  disabled: boolean;
  layout: SankeyLayout;
  links: SankeyLink[];
  labelFor: (id: string) => string;
  labelForLink?: (link: SankeyLink, index: number) => string;
}) {
  if (disabled || !layout.links.length) return null;

  return (
    <View style={{ position: 'absolute', left: -10_000, width: 1, height: 1 }}>
      {layout.links.map((link) => {
        // `input` points back at the caller's row; `index` is the drawn order,
        // which has closed up behind every row that could not be drawn.
        // A ribbon that `collapse` merged has no single row of the caller's
        // behind it, so there is nothing to hand an override — it still gets
        // spoken, in the chart's own words.
        const datum = link.input >= 0 ? links[link.input] : undefined;
        const source = layout.nodes[link.source];
        const target = layout.nodes[link.target];
        if (!source || !target) return null;

        const label =
          (datum ? labelForLink?.(datum, link.input) : undefined) ??
          `${labelFor(source.id)} to ${labelFor(target.id)}, ${compactNumber(link.value)}`;

        return (
          <View
            key={`${source.id}-${target.id}-${link.index}`}
            accessible
            accessibilityRole="text"
            accessibilityLabel={label}
          />
        );
      })}
    </View>
  );
}

/**
 * How much of the entrance a column has played, eased.
 *
 * Ease out cubic, written out rather than called: an easing from the animation
 * library is not a worklet and this runs on the UI thread every frame.
 */
function progress(clock: number, from: number, to: number): number {
  'worklet';
  const range = to - from;
  const raw = range > 0 ? (clock - from) / range : 1;
  const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  return 1 - (1 - clamped) * (1 - clamped) * (1 - clamped);
}

export interface SankeyChartLinksProps {
  /** A ribbon's opacity at rest. */
  opacity?: number;
  /** A ribbon's opacity when its node is selected. */
  activeOpacity?: number;
  /** And when something else is. */
  dimOpacity?: number;
}

/**
 * The ribbons.
 *
 * Drawn before the bars so a bar sits on top of the flows that meet it, which
 * is what gives a node a clean edge to arrive at instead of a fringe of ribbon
 * ends poking through it.
 *
 * Translucent at rest, and that is not decoration. Ribbons cross — that is the
 * shape of routed data — and an opaque one hides whatever passes under it, so
 * the reader loses the smaller of every pair. At this opacity a crossing reads
 * as two ribbons rather than as one with a notch in it.
 */
function SankeyChartLinks({
  opacity = LINK_OPACITY,
  activeOpacity = LINK_ACTIVE_OPACITY,
  dimOpacity = LINK_DIM_OPACITY,
}: SankeyChartLinksProps) {
  const { layout, links, colors, curve, reveal, windows, status, activeId, orientation } =
    useChart('SankeyChart.Links');

  if (status === 'loading' || !layout.links.length) return null;

  const upright = orientation === 'horizontal';

  return (
    <G>
      {layout.links.map((link) => {
        const source = layout.nodes[link.source];
        const target = layout.nodes[link.target];
        if (!source || !target) return null;

        const touching = activeId === source.id || activeId === target.id;
        const window = windows[source.layer] ?? windows[0] ?? { from: 0, to: 1 };

        return (
          <Ribbon
            key={link.index}
            // Where the ribbon leaves and arrives, along whichever axis the
            // stages advance on; `link.y0`/`y1` are already across it.
            from={upright ? source.x1 : source.y1}
            cFrom={link.y0}
            to={upright ? target.x0 : target.y0}
            cTo={link.y1}
            upright={upright}
            thickness={link.width}
            curve={curve}
            fill={
              (link.input >= 0 ? links[link.input]?.color : undefined) ??
              colors[link.source] ??
              colors[0] ??
              '#3b82f6'
            }
            reveal={reveal}
            window={window}
            opacity={
              activeId === null ? opacity : touching ? activeOpacity : dimOpacity
            }
          />
        );
      })}
    </G>
  );
}
SankeyChartLinks.displayName = 'SankeyChart.Links';
SankeyChartLinks.slot = 'svg' as const;

function Ribbon({
  from: edgeFrom,
  cFrom: centreFrom,
  to: edgeTo,
  cTo: centreTo,
  thickness,
  curve,
  fill,
  reveal,
  window,
  opacity,
  upright,
}: {
  from: number;
  cFrom: number;
  to: number;
  cTo: number;
  thickness: number;
  curve: number;
  fill: string;
  reveal: SharedValue<number>;
  window: { from: number; to: number };
  opacity: number;
  upright: boolean;
}) {
  const { from: windowFrom, to: windowTo } = window;
  const settled = useDerivedValue<number>(() =>
    withTiming(opacity, { duration: SELECT_DURATION })
  );

  const animatedProps = useAnimatedProps(() => {
    /*
     * The ribbon thickens about its own centre line rather than growing from
     * one edge, so it stays anchored where it meets the node instead of
     * sliding down it as it arrives.
     */
    const grown = thickness * progress(reveal.value, windowFrom, windowTo);
    return {
      d: upright
        ? flowPath(edgeFrom, centreFrom, edgeTo, centreTo, grown, curve)
        : flowPathVertical(edgeFrom, centreFrom, edgeTo, centreTo, grown, curve),
      fillOpacity: settled.value,
    };
  });

  return <AnimatedPath animatedProps={animatedProps} fill={fill} />;
}

export interface SankeyChartNodesProps {
  /** Corner radius on a node's bar, in points. */
  radius?: number;
  /** A bar's opacity when something else is selected. */
  dimOpacity?: number;
  /**
   * Whether pressing a bar selects its node.
   *
   * On by default, because the names are not always there to press. A bar
   * below `SankeyChart.Labels`' `minHeight` has no name and, without this, no
   * way to be selected at all.
   */
  interactive?: boolean;
}

/**
 * The bars the ribbons run between.
 *
 * Solid where the ribbons are translucent, because a node is the one thing on
 * the diagram that is not crossing anything else — it is the edge the flow
 * arrives at, and it reads as an edge only if nothing shows through it.
 */
function SankeyChartNodes({
  radius = 2,
  dimOpacity = 0.25,
  interactive = true,
}: SankeyChartNodesProps) {
  const { layout, colors, reveal, windows, status, activeId, setActiveId, orientation } =
    useChart('SankeyChart.Nodes');

  if (status === 'loading' || !layout.nodes.length) return null;

  const upright = orientation === 'horizontal';

  return (
    <G>
      {layout.nodes.map((node, index) => {
        const window = windows[node.layer] ?? windows[0] ?? { from: 0, to: 1 };
        const selected = activeId === node.id;
        return (
          <NodeBar
            key={node.id}
            // The bar is `nodeWidth` across the flow and its value along it,
            // so which pair of edges is which swaps with the orientation.
            thin0={upright ? node.x0 : node.y0}
            thin1={upright ? node.x1 : node.y1}
            long0={upright ? node.y0 : node.x0}
            long1={upright ? node.y1 : node.x1}
            upright={upright}
            radius={radius}
            fill={colors[index] ?? '#3b82f6'}
            reveal={reveal}
            window={window}
            opacity={activeId === null || selected ? 1 : dimOpacity}
            onPress={
              interactive ? () => setActiveId(selected ? null : node.id) : undefined
            }
          />
        );
      })}
    </G>
  );
}
SankeyChartNodes.displayName = 'SankeyChart.Nodes';
SankeyChartNodes.slot = 'svg' as const;

function NodeBar({
  thin0,
  thin1,
  long0,
  long1,
  upright,
  radius,
  fill,
  reveal,
  window,
  opacity,
  onPress,
}: {
  /** The bar's leading edge across the flow — `nodeWidth` separates the two. */
  thin0: number;
  thin1: number;
  /** And along it, which is where the value is. */
  long0: number;
  long1: number;
  upright: boolean;
  radius: number;
  fill: string;
  reveal: SharedValue<number>;
  window: { from: number; to: number };
  opacity: number;
  onPress?: () => void;
}) {
  const { from, to } = window;
  const extent = long1 - long0;
  const centre = (long0 + long1) / 2;
  const thickness = thin1 - thin0;
  const settled = useDerivedValue<number>(() =>
    withTiming(opacity, { duration: SELECT_DURATION })
  );

  const animatedProps = useAnimatedProps(() => {
    // Grown about its centre, to match the ribbons meeting it.
    const grown = extent * progress(reveal.value, from, to);
    const near = centre - grown / 2;
    return upright
      ? { y: near, height: grown, x: thin0, width: thickness, opacity: settled.value }
      : { x: near, width: grown, y: thin0, height: thickness, opacity: settled.value };
  });

  const bar = <AnimatedRect animatedProps={animatedProps} rx={radius} fill={fill} onPress={onPress} />;

  if (!onPress || extent >= MIN_TARGET) return bar;

  /*
   * A sliver gets a second, invisible rectangle to be pressed by, because the
   * bar itself is two points tall and nobody can land on it. `transparent`
   * rather than no fill: a shape with no fill is not hit-tested at all, so it
   * would look identical and do nothing.
   *
   * It is drawn before the bar so the bar keeps the tap where the two overlap,
   * and it grows about the same centre, which keeps the target over the bar
   * rather than beside it.
   */
  const target = Math.max(extent, MIN_TARGET);
  const thinCentre = (thin0 + thin1) / 2;
  const across = { from: thinCentre - MIN_TARGET / 2, size: MIN_TARGET };
  const along = { from: centre - target / 2, size: target };
  return (
    <>
      <Rect
        x={upright ? across.from : along.from}
        width={upright ? across.size : along.size}
        y={upright ? along.from : across.from}
        height={upright ? along.size : across.size}
        fill="transparent"
        onPress={onPress}
      />
      {bar}
    </>
  );
}

export interface SankeyChartLabelsProps {
  className?: string;
  /** Format the figure beside a name. Defaults to a compact number. */
  formatValue?: (value: number, node: SankeyNode) => string;
  /** Show the figure under the name. */
  showValue?: boolean;
  /**
   * Hide the name on a bar shorter than this, in points.
   *
   * A diagram of forty nodes has bars a few points tall, and forty names at
   * that spacing overlap into a grey band that hides the flow behind it. The
   * names that are dropped are the smallest ones, which is where the tooltip
   * takes over.
   */
  minHeight?: number;
  /**
   * Hide the name where its box is narrower than this, in points. Only where
   * the flow runs vertically, because only there is a name's width its value.
   *
   * Under a handful of characters every name truncates to the same `T…`, and a
   * row of those says nothing while looking like it is saying something. The
   * stages that lose their name are read from `SankeyChart.Legend` and
   * `SankeyChart.Breakdown`, and their bars stay pressable.
   */
  minWidth?: number;
}

/**
 * The names, and the press targets that go with them.
 *
 * Outside the bars rather than on them. A node's bar is as thick as it was
 * asked to be — ten points by default — and no name fits inside ten points, so
 * putting the name on the bar means widening every bar to suit the longest
 * label and losing the width the ribbons need.
 *
 * Which side a name goes on is decided by the column: the last column reads
 * inwards from the right edge, everything else outwards to the right. So the
 * names stay inside the chart's box at both ends, instead of the leftmost and
 * rightmost ones being clipped.
 *
 * The target is the label's row, not the bar. A node worth one percent of the
 * flow is a two-point sliver and cannot be hit; the row it sits in can, and it
 * is padded out to a proper target where the sliver is smaller than one.
 */
function SankeyChartLabels({
  className,
  formatValue,
  showValue = false,
  minHeight = 6,
  minWidth = 54,
}: SankeyChartLabelsProps) {
  const {
    layout,
    width,
    height,
    status,
    activeId,
    setActiveId,
    labelFor,
    reportLabelled,
    orientation,
    datumFor,
  } = useChart('SankeyChart.Labels');

  const upright = orientation === 'horizontal';
  const drawing = status !== 'loading' && layout.nodes.length > 0;

  /*
   * Where every name goes, and which ones there is no room for, worked out
   * once: the chart has to be told which names were drawn so its semantic list
   * can carry the rest, and a second copy of the rule would be a second answer
   * to the same question.
   */
  const placements = useMemo(() => {
    if (!drawing) return [];

    // Along the flow is the axis the stages advance on; across it is the axis
    // carrying the values. Which is horizontal swaps with the orientation.
    const alongStart = (node: SankeyLayoutNode) => (upright ? node.x0 : node.y0);
    const alongEnd = (node: SankeyLayoutNode) => (upright ? node.x1 : node.y1);
    const crossStart = (node: SankeyLayoutNode) => (upright ? node.y0 : node.x0);
    const crossEnd = (node: SankeyLayoutNode) => (upright ? node.y1 : node.x1);
    const alongSpan = upright ? width : height;
    const crossSpan = upright ? height : width;

    /*
     * Where the neighbouring stages sit along the flow.
     *
     * A name's box needs a bound on both sides or it runs the length of the
     * chart and covers every stage it crosses — and since the boxes are
     * absolutely positioned siblings, the last one drawn takes the touch. That
     * is a tap on one name selecting a node two stages away, which is worse
     * than a small target because it is wrong rather than merely hard.
     */
    const edges: number[] = [];
    for (const placed of layout.nodes) {
      if (!edges.includes(alongStart(placed))) edges.push(alongStart(placed));
      if (!edges.includes(alongEnd(placed))) edges.push(alongEnd(placed));
    }
    edges.sort((a, b) => a - b);

    // And where a stage's own neighbours sit across it, so a name can borrow
    // the gap either side of its bar without reaching into anybody else's.
    const rowEdges = new Map<number, number[]>();
    for (const placed of layout.nodes) {
      const list = rowEdges.get(placed.layer) ?? [];
      list.push(crossStart(placed), crossEnd(placed));
      rowEdges.set(placed.layer, list);
    }
    for (const list of rowEdges.values()) list.sort((a, b) => a - b);

    return layout.nodes.map((node) => {
      const extent = crossEnd(node) - crossStart(node);

      const after = edges.find((edge) => edge > alongEnd(node) + 1e-6);
      const before = edges.filter((edge) => edge < alongStart(node) - 1e-6).pop();
      const trailing = after === undefined;

      /*
       * The box along the flow: the half of the gap nearest its own bar, so
       * the name leaving one stage and the name arriving at the next can share
       * the space between them without sharing a touch target.
       */
      const gap = trailing
        ? (() => {
            const from = before === undefined ? 0 : (before + alongStart(node)) / 2;
            return { from, size: Math.max(0, alongStart(node) - LABEL_GAP - from) };
          })()
        : (() => {
            const from = alongEnd(node) + LABEL_GAP;
            const to = after === undefined ? alongSpan : (alongEnd(node) + after) / 2;
            return { from, size: Math.max(0, to - from) };
          })();

      // And across it: the bar's own run, clamped inside the plot.
      let crossFrom = Math.max(0, Math.min(crossStart(node), crossSpan - extent));
      let crossSize = extent;

      if (!upright) {
        /*
         * A vertical name is bounded by the width of its own bar, which for a
         * small stage is fewer points than the word it carries. So it borrows
         * the gap either side, the same amount on both, which keeps it centred
         * on what it names.
         */
        const list = rowEdges.get(node.layer) ?? [];
        const prev = list.filter((edge) => edge < crossStart(node) - 1e-6).pop();
        const next = list.find((edge) => edge > crossEnd(node) + 1e-6);
        const room = Math.min(
          crossStart(node) - (prev ?? 0),
          (next ?? crossSpan) - crossEnd(node)
        );
        const borrow = Math.max(0, room / 2 - LABEL_GAP / 2);
        crossFrom = Math.max(0, crossFrom - borrow);
        crossSize = Math.min(extent + borrow * 2, crossSpan - crossFrom);
      }

      /*
       * Whether there is room to say anything.
       *
       * Along the flow the test is the bar's own run, because that is what the
       * names would overlap into a grey band if every one of forty were drawn.
       * Across it — and only where the flow runs downwards, where the box is
       * as narrow as the value — the test is whether a name would survive the
       * box at all: under a handful of characters every name truncates to the
       * same "T…", and a column of those says nothing while looking like it is
       * saying something. Those stages are read from the legend and the
       * breakdown instead, and their bars are still pressable.
       */
      const show = extent >= minHeight && (upright || crossSize >= minWidth);

      return { node, show, trailing, gap, crossFrom, crossSize, extent };
    });
  }, [drawing, layout.nodes, width, height, upright, minHeight, minWidth]);

  const drawn = useMemo(
    () => (drawing ? placements.filter((p) => p.show).map((p) => p.node.id) : null),
    [drawing, placements]
  );

  useEffect(() => {
    reportLabelled(drawn);
    return () => reportLabelled(null);
  }, [drawn, reportLabelled]);

  if (!drawing) return null;

  const format = formatValue ?? ((value: number) => compactNumber(value));

  return (
    <>
      {placements.map(({ node, show, trailing, gap, crossFrom, crossSize, extent }) => {
        if (!show) return null;

        const name = labelFor(node.id);
        const value = format(node.value, datumFor(node));
        const selected = activeId === node.id;

        /*
         * A sliver's box is padded out to a real target rather than drawn
         * longer — growing it would push it over its neighbours, and two
         * overlapping targets are worse than one small one.
         */
        const slack = Math.max(0, (MIN_TARGET - extent) / 2);

        /*
         * Two lines only where a second one would help: somewhere to break,
         * and a box wide enough that the words either side of it stand a
         * chance. Without the width test a narrow box breaks the word itself,
         * and "Eati/ng out" reads as a fault in the chart where "Eating…"
         * reads as a name that did not fit.
         */
        const lines = !upright && crossSize >= WRAPPABLE && name.trim().includes(' ') ? 2 : 1;
        const align = upright ? (trailing ? 'right' : 'left') : 'center';

        return (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${name}, ${value}`}
            hitSlop={upright ? { top: slack, bottom: slack } : { left: slack, right: slack }}
            onPress={() => setActiveId(selected ? null : node.id)}
            style={{
              position: 'absolute',
              ...(upright
                ? {
                    top: crossFrom,
                    height: crossSize,
                    left: gap.from,
                    width: gap.size,
                    justifyContent: 'center',
                    alignItems: trailing ? ('flex-end' as const) : ('flex-start' as const),
                  }
                : {
                    left: crossFrom,
                    width: crossSize,
                    top: gap.from,
                    height: gap.size,
                    alignItems: 'center',
                    // Against the bar rather than centred in the gap, so the
                    // name sits with what it names instead of floating in the
                    // middle of the ribbons.
                    justifyContent: trailing ? ('flex-end' as const) : ('flex-start' as const),
                  }),
            }}
            className={cn(className)}
          >
            {/*
              * Both alignments are stated rather than inherited. A paragraph's
              * default alignment follows the reading direction, so under a
              * right-to-left layout an unaligned name drifts to the far end of
              * its box and ends up in the middle of the plot instead of against
              * the bar it belongs to. Which side the name hugs is a fact about
              * where its bar is, not about the language.
              */}
            <Text
              size="xs"
              weight={selected ? 'bold' : 'medium'}
              numberOfLines={lines}
              style={{ textAlign: align }}
            >
              {name}
            </Text>
            {showValue ? (
              <Text size="xs" muted numberOfLines={1} style={{ textAlign: align }}>
                {value}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </>
  );
}
SankeyChartLabels.displayName = 'SankeyChart.Labels';
SankeyChartLabels.slot = 'overlay' as const;

export interface SankeyChartTooltipProps {
  className?: string;
  /** Format the figures. Defaults to a compact number. */
  formatValue?: (value: number) => string;
}

/**
 * What the selected node carries: the total through it, and what that total is
 * made of at each end.
 *
 * In and out are shown separately because they are the two readings a flow
 * diagram is for, and they are only the same number when nothing was lost. A
 * node where they differ is the interesting one on the whole chart, and a
 * single total would hide exactly that.
 *
 * Anchored beside the node and clamped to the plot, so it never leaves the box
 * it belongs to — a card half off the edge of a phone is a card nobody can read.
 */
function SankeyChartTooltip({ className, formatValue }: SankeyChartTooltipProps) {
  const { layout, width, height, labelFor, orientation } = useChart('SankeyChart.Tooltip');
  const { activeId, activeValue, incoming, outgoing } = useSankeyChart();

  if (!activeId) return null;
  const node = layout.nodes.find((placed) => placed.id === activeId);
  if (!node) return null;

  const format = formatValue ?? compactNumber;
  const CARD = 132;
  const HALF = 34;
  const upright = orientation === 'horizontal';

  /*
   * Beside the bar on the axis the flow advances along, and level with its
   * middle on the other — then clamped into the plot at both ends, so a node
   * at an edge gets a card that is still entirely on the chart. It flips to
   * the near side when there is no room on the far one, which is what keeps a
   * last-stage node's card off the edge rather than half over it.
   */
  const alongEnd = upright ? node.x1 : node.y1;
  const alongStart = upright ? node.x0 : node.y0;
  const alongSpan = upright ? width : height;
  const cardAlong = upright ? CARD : HALF * 2;
  const trailing = alongEnd + LABEL_GAP + cardAlong > alongSpan;
  const along = trailing
    ? Math.max(0, alongStart - LABEL_GAP - cardAlong)
    : Math.min(alongEnd + LABEL_GAP, Math.max(0, alongSpan - cardAlong));

  const crossCentre = upright ? (node.y0 + node.y1) / 2 : (node.x0 + node.x1) / 2;
  const crossSpan = upright ? height : width;
  const cardCross = upright ? HALF * 2 : CARD;
  const cross = Math.max(0, Math.min(crossCentre - cardCross / 2, crossSpan - cardCross));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: CARD,
        left: upright ? along : cross,
        top: upright ? cross : along,
      }}
      className={cn(
        'gap-0.5 rounded-lg border border-border bg-background px-2.5 py-2 shadow-sm',
        className
      )}
    >
      <Text size="xs" weight="bold" numberOfLines={1}>
        {labelFor(activeId)}
      </Text>
      <Text size="xs" weight="semibold" numberOfLines={1}>
        {format(activeValue)}
      </Text>
      <Text size="xs" muted numberOfLines={1}>
        {`In ${format(incoming)} · Out ${format(outgoing)}`}
      </Text>
    </View>
  );
}
SankeyChartTooltip.displayName = 'SankeyChart.Tooltip';
SankeyChartTooltip.slot = 'overlay' as const;

export interface SankeyChartBreakdownProps extends ViewProps {
  className?: string;
  /** Format the figures. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** How many rows each side shows before stopping. */
  maxRows?: number;
  /**
   * Fires with the node at the other end of a row, so a breakdown can be
   * walked: press where a stream went and the chart follows it there.
   */
  onSelectNode?: (id: string) => void;
  /** Shown in place of the rows when nothing is selected. */
  placeholder?: string;
}

/**
 * What the selected node carries, written out in full underneath the diagram.
 *
 * The names on a flow diagram live in the gaps between its stages, which on a
 * phone is a few dozen points — wide enough to truncate almost anything. Here
 * there is the whole width of the card, so a stream is read as the name of
 * where it came from and the number it carried rather than as a ribbon whose
 * label ran out of room.
 *
 * In and out are listed separately because they are only the same total when
 * nothing was lost on the way through, and a node where they differ is the
 * interesting one on the chart.
 */
function SankeyChartBreakdown({
  className,
  formatValue,
  maxRows,
  onSelectNode,
  placeholder = 'Select a stage to see what it carries',
  ...props
}: SankeyChartBreakdownProps) {
  const { status, setActiveId, labelFor } = useChart('SankeyChart.Breakdown');
  const { activeId, activeValue, sources, targets } = useSankeyChart();

  if (status === 'loading') return null;

  const format = formatValue ?? compactNumber;
  const limit = maxRows && maxRows > 0 ? Math.floor(maxRows) : undefined;

  if (!activeId) {
    return (
      <View {...props} className={cn('w-full pt-3', className)}>
        <Text size="xs" muted>
          {placeholder}
        </Text>
      </View>
    );
  }

  const side = (title: string, rows: SankeyChartFlow[]) => {
    if (!rows.length) return null;
    const shown = limit ? rows.slice(0, limit) : rows;
    const rest = rows.length - shown.length;
    return (
      <View className="w-full gap-1">
        <Text size="xs" muted weight="medium">
          {title}
        </Text>
        {shown.map((row) => (
          <Pressable
            key={`${title}-${row.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${row.label}, ${format(row.value)}, ${Math.round(row.share * 100)} percent`}
            onPress={() => {
              setActiveId(row.id);
              onSelectNode?.(row.id);
            }}
            className="w-full flex-row items-center gap-2 py-1"
          >
            <View
              style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: row.color }}
            />
            {/* The name takes whatever the numbers leave, which is most of it. */}
            <Text size="xs" numberOfLines={1} className="shrink grow">
              {row.label}
            </Text>
            <Text size="xs" weight="medium" numberOfLines={1}>
              {format(row.value)}
            </Text>
            <Text size="xs" muted numberOfLines={1} className="w-10 text-right">
              {`${Math.round(row.share * 100)}%`}
            </Text>
          </Pressable>
        ))}
        {rest > 0 ? (
          <Text size="xs" muted>
            {`and ${rest} more`}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View {...props} className={cn('w-full gap-2 pt-3', className)}>
      <View className="w-full flex-row items-baseline justify-between gap-2">
        <Text size="xs" weight="bold" numberOfLines={1} className="shrink">
          {labelFor(activeId)}
        </Text>
        <Text size="xs" weight="semibold">
          {format(activeValue)}
        </Text>
      </View>
      {side('In', sources)}
      {side('Out', targets)}
    </View>
  );
}
SankeyChartBreakdown.displayName = 'SankeyChart.Breakdown';
SankeyChartBreakdown.slot = 'footer' as const;

export interface SankeyChartLegendProps extends ViewProps {
  className?: string;
  /** How many names to show before stopping. */
  limit?: number;
  /** Show each node's share of the whole flow beside its name. */
  showShare?: boolean;
}

/**
 * Every stage named, under the diagram.
 *
 * The names on the chart are dropped wherever a bar is too short to carry one,
 * which is the right call — forty names at that spacing overlap into a grey
 * band that hides the flow behind them — but it leaves the smallest nodes with
 * no name and nothing to press. Here each one gets its full name and a proper
 * target, and pressing it selects the same node the bar would.
 */
function SankeyChartLegend({
  className,
  limit,
  showShare = true,
  ...props
}: SankeyChartLegendProps) {
  const { layout, colors, status, activeId, setActiveId, labelFor } =
    useChart('SankeyChart.Legend');

  if (status === 'loading' || !layout.nodes.length) return null;

  // Against the widest stage rather than the sum of every node, which counts
  // whatever passes through a middle stage twice and makes every share small.
  let total = 0;
  const byLayer = new Map<number, number>();
  for (const node of layout.nodes) {
    const carried = (byLayer.get(node.layer) ?? 0) + node.value;
    byLayer.set(node.layer, carried);
    if (carried > total) total = carried;
  }

  const shown = limit && limit > 0 ? layout.nodes.slice(0, Math.floor(limit)) : layout.nodes;

  return (
    <View
      {...props}
      className={cn('w-full flex-row flex-wrap items-center gap-x-3 gap-y-1.5 pt-3', className)}
    >
      {shown.map((node, index) => {
        const percent = total > 0 ? Math.round((node.value / total) * 100) : 0;
        const selected = activeId === node.id;
        const dimmed = activeId !== null && !selected;
        return (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${labelFor(node.id)}, ${percent} percent`}
            onPress={() => setActiveId(selected ? null : node.id)}
            style={{ opacity: dimmed ? 0.4 : 1 }}
            className="max-w-full flex-row items-center gap-1.5"
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: colors[index] ?? '#3b82f6',
              }}
            />
            <Text size="xs" muted numberOfLines={1} className="shrink">
              {labelFor(node.id)}
            </Text>
            {showShare ? (
              <Text size="xs" weight="medium" numberOfLines={1}>
                {`${percent}%`}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
SankeyChartLegend.displayName = 'SankeyChart.Legend';
SankeyChartLegend.slot = 'footer' as const;

export interface SankeyChartSkeletonProps {
  color?: string;
}

/**
 * The loading state: a few plain bars and the ribbons between them, carrying no
 * values.
 *
 * Every bar the same height and every ribbon the same thickness, deliberately.
 * A placeholder with varied thicknesses would be an invented routing, and a
 * reader cannot tell an invented one from a real one until it changes under
 * them — which is worse than showing nothing, because it is showing something
 * wrong.
 */
function SankeyChartSkeleton({ color }: SankeyChartSkeletonProps) {
  const { width, height, curve, status, orientation } = useChart('SankeyChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const fill = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  // Held through the fade rather than to the frame the data lands, so the plain
  // shape dissolves under the real one growing across it instead of leaving a
  // blank panel between the two.
  const { mounted, opacity } = useSkeletonHandoff(status === 'loading');
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  const upright = orientation === 'horizontal';

  const shape = useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    // The placeholder is the diagram's own shape, turned the same way: a
    // waiting state that does not match what replaces it moves the whole card
    // at the moment the data lands.
    const along = upright ? width : height;
    const cross = upright ? height : width;
    const bar = DEFAULT_NODE_WIDTH;
    const step = (along - bar) / Math.max(SKELETON_COLUMNS - 1, 1);
    const band = cross / 3;
    const columns = Array.from({ length: SKELETON_COLUMNS }, (_, i) => i * step);
    const path = upright ? flowPath : flowPathVertical;
    const ribbons: string[] = [];
    for (let i = 0; i < SKELETON_COLUMNS - 1; i += 1) {
      const from = columns[i]! + bar;
      const to = columns[i + 1]!;
      ribbons.push(path(from, cross / 3, to, cross / 3, band * 0.5, curve));
      ribbons.push(path(from, (cross * 2) / 3, to, (cross * 2) / 3, band * 0.5, curve));
    }
    return { bar, band, columns, ribbons, cross };
  }, [width, height, curve, upright]);

  if (!mounted || !shape) return null;

  return (
    <AnimatedG animatedProps={animatedProps}>
      {shape.ribbons.map((d, index) => (
        <Path key={`ribbon-${index}`} d={d} fill={fill} fillOpacity={0.5} />
      ))}
      {shape.columns.map((at, index) => (
        <Rect
          key={`bar-${index}`}
          x={upright ? at : shape.cross / 6}
          y={upright ? shape.cross / 6 : at}
          width={upright ? shape.bar : (shape.cross * 2) / 3}
          height={upright ? (shape.cross * 2) / 3 : shape.bar}
          rx={2}
          fill={fill}
        />
      ))}
    </AnimatedG>
  );
}
SankeyChartSkeleton.displayName = 'SankeyChart.Skeleton';
SankeyChartSkeleton.slot = 'svg' as const;

export interface SankeyChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the flow is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a caveat. */
  caption?: string;
  /** Trailing slot — a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the diagram: what the flow is of and what it totals.
 *
 * The value is not derived even though there are sources to add up, because the
 * formatting is not the chart's to guess: 128400 is a count, a currency or a
 * rate depending on what was routed.
 */
function SankeyChartHeader({
  className,
  title,
  value,
  caption,
  children,
  ...props
}: SankeyChartHeaderProps) {
  return (
    <View
      {...props}
      className={cn('flex-row items-start justify-between gap-3 pb-3', className)}
    >
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text size="xs" muted>
            {title}
          </Text>
        ) : null}
        {value ? (
          <Text size="xl" weight="bold">
            {value}
          </Text>
        ) : null}
        {caption ? (
          <Text size="xs" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      {children ? <View className="max-w-[55%] shrink pt-1">{children}</View> : null}
    </View>
  );
}
SankeyChartHeader.displayName = 'SankeyChart.Header';
SankeyChartHeader.slot = 'header' as const;

export const SankeyChart = Object.assign(SankeyChartRoot, {
  Breakdown: SankeyChartBreakdown,
  Legend: SankeyChartLegend,
  Header: SankeyChartHeader,
  Links: SankeyChartLinks,
  Nodes: SankeyChartNodes,
  Labels: SankeyChartLabels,
  Tooltip: SankeyChartTooltip,
  Skeleton: SankeyChartSkeleton,
});
