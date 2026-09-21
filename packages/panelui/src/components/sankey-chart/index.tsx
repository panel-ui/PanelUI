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
import { Pressable, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
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
import { compactNumber, flowPath, seriesColorAt, useSeriesColor } from '../../utils/chart';
import { cn } from '../../utils/cn';
import { useDirection } from '../../hooks/use-direction';
import { useSkeletonHandoff } from '../../hooks/use-skeleton-handoff';
import { sankeyLayout, type SankeyAlign, type SankeyLayout } from './sankey-layout';

export type { SankeyAlign } from './sankey-layout';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

/** How tall the diagram is drawn when the caller does not say. */
const DEFAULT_HEIGHT = 240;

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

/** Columns the placeholder suggests while there is no data to count. */
const SKELETON_COLUMNS = 3;

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
}

const SankeyChartContext = createContext<SankeyChartContextValue | null>(null);

function useChart(component: string): SankeyChartContextValue {
  const context = useContext(SankeyChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SankeyChart>`);
  }
  return context;
}

/** The selected node and what runs through it, for something drawn inside the chart. */
export function useSankeyChart() {
  const { nodes, layout, activeId } = useChart('useSankeyChart');

  return useMemo(() => {
    const placed = activeId ? layout.nodes.find((node) => node.id === activeId) : undefined;
    if (!placed) {
      return { activeId: null, activeNode: null, activeValue: 0, incoming: 0, outgoing: 0 };
    }

    const position = layout.nodes.indexOf(placed);
    let incoming = 0;
    let outgoing = 0;
    for (const link of layout.links) {
      if (link.target === position) incoming += link.value;
      if (link.source === position) outgoing += link.value;
    }

    return {
      activeId,
      activeNode: nodes.find((node) => node.id === activeId) ?? null,
      /** What passes through it — what the bar's height is drawn from. */
      activeValue: placed.value,
      /** What arrives. Zero at a node the flow starts from. */
      incoming,
      /** What leaves. Zero at a node the flow ends at. */
      outgoing,
    };
  }, [nodes, layout, activeId]);
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
   * How tall the diagram is drawn, in points.
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
      height = DEFAULT_HEIGHT,
      nodeWidth = DEFAULT_NODE_WIDTH,
      nodePadding = DEFAULT_NODE_PADDING,
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

    const layout = useMemo(
      () =>
        sankeyLayout(nodes, links, {
          width,
          height,
          nodeWidth,
          nodePadding,
          align,
          iterations,
        }),
      [nodes, links, width, height, nodeWidth, nodePadding, align, iterations]
    );

    /*
     * A flow reads from where it starts, and under a right-to-left layout that
     * is the right-hand edge. Mirroring the finished layout rather than laying
     * it out backwards keeps one set of maths under both directions — the
     * arrangement is identical, it is only read from the other end.
     */
    const mirrored = direction === 'rtl';
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
      ]
    );

    const slots: Record<Slot, ReactNode[]> = {
      svg: [],
      overlay: [],
      header: [],
      footer: [],
    };
    /*
     * Whether the names are on the chart decides how it is read out. With
     * `Labels` there is a pressable row per node already, and the semantic
     * list below would say all of it a second time; without them the diagram
     * is pure geometry and the list is the only way through it.
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
                <Svg
                  width={width}
                  height={height}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
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
            data={nodes}
            disabled={labelled || status === 'loading'}
            valueOf={(node) => [
              ['Node', node.label ?? node.id],
              ['Value', placed.nodes.find((placedNode) => placedNode.id === node.id)?.value],
            ]}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
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
  const { layout, links, colors, curve, reveal, windows, status, activeId } =
    useChart('SankeyChart.Links');

  if (status === 'loading' || !layout.links.length) return null;

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
            x0={source.x1}
            cy0={link.y0}
            x1={target.x0}
            cy1={link.y1}
            thickness={link.width}
            curve={curve}
            fill={links[link.input]?.color ?? colors[link.source] ?? colors[0] ?? '#3b82f6'}
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
  x0,
  cy0,
  x1,
  cy1,
  thickness,
  curve,
  fill,
  reveal,
  window,
  opacity,
}: {
  x0: number;
  cy0: number;
  x1: number;
  cy1: number;
  thickness: number;
  curve: number;
  fill: string;
  reveal: SharedValue<number>;
  window: { from: number; to: number };
  opacity: number;
}) {
  const { from, to } = window;
  const settled = useDerivedValue<number>(() =>
    withTiming(opacity, { duration: SELECT_DURATION })
  );

  const animatedProps = useAnimatedProps(() => {
    /*
     * The ribbon thickens about its own centre line rather than growing from
     * one edge, so it stays anchored where it meets the node instead of
     * sliding down it as it arrives.
     */
    const grown = thickness * progress(reveal.value, from, to);
    return {
      d: flowPath(x0, cy0, x1, cy1, grown, curve),
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
}

/**
 * The bars the ribbons run between.
 *
 * Solid where the ribbons are translucent, because a node is the one thing on
 * the diagram that is not crossing anything else — it is the edge the flow
 * arrives at, and it reads as an edge only if nothing shows through it.
 */
function SankeyChartNodes({ radius = 2, dimOpacity = 0.25 }: SankeyChartNodesProps) {
  const { layout, colors, reveal, windows, status, activeId } =
    useChart('SankeyChart.Nodes');

  if (status === 'loading' || !layout.nodes.length) return null;

  return (
    <G>
      {layout.nodes.map((node, index) => {
        const window = windows[node.layer] ?? windows[0] ?? { from: 0, to: 1 };
        return (
          <NodeBar
            key={node.id}
            x={node.x0}
            width={node.x1 - node.x0}
            y0={node.y0}
            y1={node.y1}
            radius={radius}
            fill={colors[index] ?? '#3b82f6'}
            reveal={reveal}
            window={window}
            opacity={activeId === null || activeId === node.id ? 1 : dimOpacity}
          />
        );
      })}
    </G>
  );
}
SankeyChartNodes.displayName = 'SankeyChart.Nodes';
SankeyChartNodes.slot = 'svg' as const;

function NodeBar({
  x,
  width,
  y0,
  y1,
  radius,
  fill,
  reveal,
  window,
  opacity,
}: {
  x: number;
  width: number;
  y0: number;
  y1: number;
  radius: number;
  fill: string;
  reveal: SharedValue<number>;
  window: { from: number; to: number };
  opacity: number;
}) {
  const { from, to } = window;
  const extent = y1 - y0;
  const centre = (y0 + y1) / 2;
  const settled = useDerivedValue<number>(() =>
    withTiming(opacity, { duration: SELECT_DURATION })
  );

  const animatedProps = useAnimatedProps(() => {
    // Grown about its centre, to match the ribbons meeting it.
    const grown = extent * progress(reveal.value, from, to);
    return { y: centre - grown / 2, height: grown, opacity: settled.value };
  });

  return <AnimatedRect animatedProps={animatedProps} x={x} width={width} rx={radius} fill={fill} />;
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
}: SankeyChartLabelsProps) {
  const { layout, nodes, width, height, status, activeId, setActiveId, labelFor } =
    useChart('SankeyChart.Labels');

  if (status === 'loading' || !layout.nodes.length) return null;

  const format = formatValue ?? ((value: number) => compactNumber(value));

  /*
   * Where the neighbouring columns sit, in points across the plot.
   *
   * A name's row needs a bound on both sides or it runs the width of the chart
   * and covers every row it crosses — and since the rows are absolutely
   * positioned siblings, the last one drawn takes the touch. That is a tap on
   * one name selecting a node two columns away, which is worse than a small
   * target because it is wrong rather than merely hard.
   */
  const edges: number[] = [];
  for (const placed of layout.nodes) {
    if (!edges.includes(placed.x0)) edges.push(placed.x0);
    if (!edges.includes(placed.x1)) edges.push(placed.x1);
  }
  edges.sort((a, b) => a - b);
  const nextEdge = (x: number) => edges.find((edge) => edge > x + 1e-6);
  const previousEdge = (x: number) => {
    let found: number | undefined;
    for (const edge of edges) if (edge < x - 1e-6) found = edge;
    return found;
  };

  return (
    <>
      {layout.nodes.map((node) => {
        const datum = nodes[node.index];
        if (!datum) return null;

        const extent = node.y1 - node.y0;
        if (extent < minHeight) return null;

        /*
         * Which side the name goes on is decided by where the bar actually is,
         * not by which column it belongs to. Under a right-to-left layout the
         * finished diagram is mirrored, so the last column is the one on the
         * left — reading the side off the column number there puts every name
         * in a box of zero width and the chart loses all of them.
         */
        const after = nextEdge(node.x1);
        const before = previousEdge(node.x0);
        const trailing = after === undefined;
        const name = labelFor(node.id);
        const value = format(node.value, datum);
        const selected = activeId === node.id;

        /*
         * A sliver's row is padded out to a real target rather than drawn
         * taller — growing the row would push it over its neighbours, and two
         * overlapping targets are worse than a small one.
         */
        const slack = Math.max(0, (MIN_TARGET - extent) / 2);
        const top = Math.max(0, Math.min(node.y0, height - extent));

        return (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${name}, ${value}`}
            hitSlop={{ top: slack, bottom: slack }}
            onPress={() => setActiveId(selected ? null : node.id)}
            style={{
              position: 'absolute',
              top,
              height: extent,
              justifyContent: 'center',
              /*
               * Each row takes the half of its gap nearest its own bar, so the
               * name leaving one column and the name arriving at the next can
               * share the space between them without sharing a touch target.
               */
              ...(trailing
                ? (() => {
                    const from = before === undefined ? 0 : (before + node.x0) / 2;
                    return {
                      left: from,
                      width: Math.max(0, node.x0 - LABEL_GAP - from),
                      alignItems: 'flex-end' as const,
                    };
                  })()
                : (() => {
                    const from = node.x1 + LABEL_GAP;
                    const to = after === undefined ? width : (node.x1 + after) / 2;
                    return { left: from, width: Math.max(0, to - from) };
                  })()),
            }}
            className={cn(className)}
          >
            {/*
              * Both alignments are stated rather than inherited. A paragraph's
              * default alignment follows the reading direction, so under a
              * right-to-left layout an unaligned name drifts to the far end of
              * its row and ends up sitting in the middle of the plot instead of
              * against the bar it belongs to. Which side the name hugs is a
              * fact about where its bar is, not about the language.
              */}
            <Text
              size="xs"
              weight={selected ? 'bold' : 'medium'}
              numberOfLines={1}
              style={{ textAlign: trailing ? 'right' : 'left' }}
            >
              {name}
            </Text>
            {showValue ? (
              <Text
                size="xs"
                muted
                numberOfLines={1}
                style={{ textAlign: trailing ? 'right' : 'left' }}
              >
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
  const { layout, width, height, labelFor } = useChart('SankeyChart.Tooltip');
  const { activeId, activeValue, incoming, outgoing } = useSankeyChart();

  if (!activeId) return null;
  const node = layout.nodes.find((placed) => placed.id === activeId);
  if (!node) return null;

  const format = formatValue ?? compactNumber;
  const CARD = 132;
  const trailing = node.x1 + LABEL_GAP + CARD > width;
  const left = trailing
    ? Math.max(0, node.x0 - LABEL_GAP - CARD)
    : Math.min(node.x1 + LABEL_GAP, Math.max(0, width - CARD));
  const centre = (node.y0 + node.y1) / 2;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        width: CARD,
        top: Math.max(0, Math.min(centre - 34, height - 68)),
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
  const { width, height, curve, status } = useChart('SankeyChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const fill = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  // Held through the fade rather than to the frame the data lands, so the plain
  // shape dissolves under the real one growing across it instead of leaving a
  // blank panel between the two.
  const { mounted, opacity } = useSkeletonHandoff(status === 'loading');
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  const shape = useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    const bar = DEFAULT_NODE_WIDTH;
    const step = (width - bar) / Math.max(SKELETON_COLUMNS - 1, 1);
    const band = height / 3;
    const columns = Array.from({ length: SKELETON_COLUMNS }, (_, i) => i * step);
    const ribbons: string[] = [];
    for (let i = 0; i < SKELETON_COLUMNS - 1; i += 1) {
      const from = columns[i]! + bar;
      const to = columns[i + 1]!;
      ribbons.push(flowPath(from, height / 3, to, height / 3, band * 0.5, curve));
      ribbons.push(flowPath(from, (height * 2) / 3, to, (height * 2) / 3, band * 0.5, curve));
    }
    return { bar, band, columns, ribbons };
  }, [width, height, curve]);

  if (!mounted || !shape) return null;

  return (
    <AnimatedG animatedProps={animatedProps}>
      {shape.ribbons.map((d, index) => (
        <Path key={`ribbon-${index}`} d={d} fill={fill} fillOpacity={0.5} />
      ))}
      {shape.columns.map((x, index) => (
        <Rect
          key={`bar-${index}`}
          x={x}
          y={height / 6}
          width={shape.bar}
          height={(height * 2) / 3}
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
  Header: SankeyChartHeader,
  Links: SankeyChartLinks,
  Nodes: SankeyChartNodes,
  Labels: SankeyChartLabels,
  Tooltip: SankeyChartTooltip,
  Skeleton: SankeyChartSkeleton,
});
