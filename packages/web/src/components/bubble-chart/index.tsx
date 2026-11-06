'use client';

/**
 * BubbleChart — one labelled circle per row, on two measured axes, with a third
 * quantity on each circle's area.
 *
 * ```tsx
 * <BubbleChart data={products} xDataKey="growth" yDataKey="margin" sizeKey="revenue" labelKey="code">
 *   <BubbleChart.Grid />
 *   <BubbleChart.Bubbles />
 *   <BubbleChart.Labels />
 *   <BubbleChart.XAxis />
 *   <BubbleChart.YAxis />
 *   <BubbleChart.Tooltip />
 * </BubbleChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's BubbleChart, so a chart written for
 * one reads the same in the other. What differs is what the web changes: a colour is
 * named by the theme's role or any CSS colour, a bubble is read by hovering, tapping or
 * dragging, a click pins the reading, and the arrow keys walk the bubbles.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Quadrants`, `Trend`, `Bubbles`, `Labels`, the axes and `Tooltip` draw
 * nothing themselves. Each one tells the root what it wants, and the root builds one
 * chart definition from them, so the rules, the line and the names all move with the
 * bubbles when the data changes. They are found by context and not by inspecting
 * children, so a part can be wrapped in a component of your own.
 *
 * ## Area, not radius
 *
 * The third quantity maps to area, because doubling a radius quadruples the ink. Every
 * edge of the plot holds back the largest radius, so the bubble with the largest value
 * is never the one cropped.
 */
import {
  defineChart,
  dot,
  lineX,
  rect,
  ruleX,
  ruleY,
  text,
  type ChartInteractionController,
  type ChartMark,
  type ChartMotionContext,
  type ChartPoint,
} from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip as chartTooltip } from '@tanstack/charts/tooltip';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  bubbleDomains,
  bubbleRadius,
  bubbleRows,
  colorOf,
  fitLabel,
  fitLine,
  quadrantCentre,
  sizeExtentOf,
  skeletonField,
  trendSegment,
  type BubbleChartDatum,
  type BubbleFit,
  type BubbleRow,
} from './bubble-scale';

export type { BubbleChartDatum } from './bubble-scale';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type BubbleChartStatus = 'loading' | 'ready';

/** One bubble, resolved back to the row it came from. */
export interface BubbleChartPoint {
  /** Index into `data`. */
  index: number;
  x: number;
  y: number;
  /** The value behind the area, when `sizeKey` is set. */
  size: number | null;
  /** The name written inside the circle, when `labelKey` is set. */
  label: string;
  /** The colour it was drawn in. */
  color: string;
  datum: BubbleChartDatum;
}

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const bubbleChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [&_circle]:origin-center [&_circle]:[transform-box:fill-box] [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    legend: 'col-start-1 row-start-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-3 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    sizeKey: 'pointer-events-none absolute col-start-1 row-start-2 text-xs',
    sizeKeyLabel: 'font-medium',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Room left around the plot for the axis labels. Never less than the largest radius. */
const PADDING = { top: 18, right: 18, bottom: 22, left: 18 };

/** Left gutter when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Room for an axis's own name, when it is given one. */
const AXIS_TITLE_SIZE = 18;

/** Margin of a compact chart. */
const COMPACT_EDGE = 4;

/** How much of the reveal goes to staggering the bubbles' start times. */
const STAGGER_SHARE = 0.4;

/** Up past its size and back to it: a circle that only grows reads as still loading until the last frame. */
const LANDING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** Milliseconds for a bubble to swell as it is read, and settle as it is not. */
const SELECT_DURATION = 140;

/** How much bigger a bubble is while it is read. */
const SWELL = 1.12;

/** How far from a bubble's centre the pointer still reads it, at the least. */
const HIT_RADIUS = 22;

/** The radii the size key maps onto. */
const SIZE_RANGE: [number, number] = [10, 28];

/** Smallest radius that still gets a name: below it the name is wider than the circle. */
const LABEL_MIN_RADIUS = 10;

/** The names' paint, on a fill that is a chart colour in every theme. Also how the entrance finds them. */
const LABEL_FILL = '#fff';

/** Column the size key's values are written in, beside its circles. */
const SIZE_KEY_LABEL_WIDTH = 44;

/** Gap between a quadrant's caption and the corner it is written in. */
const QUADRANT_INSET = 6;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/**
 * Grows the bubbles in, one after another, all landing inside the one duration, with
 * each name fading in behind its circle. The renderer gives a dot no entrance of its
 * own on a chart's first paint.
 */
function landBubbles(container: Element, duration: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dots = container.querySelectorAll('svg circle');
  const share = dots.length > 1 ? STAGGER_SHARE : 0;
  dots.forEach((node, order) => {
    node.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: duration * (1 - share),
      delay: (order / dots.length) * duration * share,
      easing: LANDING,
      fill: 'backwards',
    });
  });
  container.querySelectorAll(`svg text[fill="${LABEL_FILL}"]`).forEach((node) => {
    node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration / 2, delay: duration / 2, fill: 'backwards' });
  });
}

/** A mark with nothing to read: names and overlays must not take a stop from the keyboard's walk. */
function withoutPoints(mark: ChartMark<BubbleRow, number, number>): ChartMark<BubbleRow, number, number> {
  return {
    ...mark,
    initialize(context) {
      const initialized = mark.initialize(context);
      return {
        ...initialized,
        postDomain(scene) {
          const base = initialized.postDomain ? initialized.postDomain(scene) : scene;
          return { ...base, points: [] };
        },
      };
    },
  };
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new
 * one redraws it. The readout's are read through `latest` when it opens, so a new one
 * costs nothing.
 */
interface Slots {
  grid?: { rows: number; columns: number; dashArray: string; opacity: number };
  bubbles?: { opacity: number; fill: string | undefined };
  labels?: { minRadius: number; format: BubbleChartLabelsProps['format'] };
  trend?: { stroke: string; strokeWidth: number; dashArray: string; opacity: number };
  quadrants?: { x: number | undefined; y: number | undefined; labels: BubbleChartQuadrantsProps['labels']; tint: boolean; stroke: string };
  xAxis?: { ticks: number; format: BubbleChartXAxisProps['format']; label: string | undefined };
  yAxis?: { ticks: number; format: BubbleChartYAxisProps['format']; label: string | undefined };
  tooltip?: {
    showLabel: boolean;
    hitRadius: number;
    className: string | undefined;
    latest: { current: Pick<BubbleChartTooltipProps, 'formatX' | 'formatY' | 'formatSize' | 'labels'> };
  };
  skeleton?: { count: number; fill: string };
}

interface BubbleChartContextValue {
  rows: readonly BubbleRow[];
  sizeExtent: [number, number] | null;
  sizeRange: readonly [number, number];
  margin: { top: number; right: number; bottom: number; left: number };
  loading: boolean;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activePoint: BubbleChartPoint | null;
}

const BubbleChartContext = createContext<BubbleChartContextValue | null>(null);

function useChart(component: string): BubbleChartContextValue {
  const context = useContext(BubbleChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BubbleChart>`);
  }
  return context;
}

/**
 * The bubble being read, for something rendered inside the chart. A readout outside it
 * takes `onActivePointChange` instead.
 */
export function useBubbleChart() {
  const { activePoint } = useChart('useBubbleChart');
  return { activeIndex: activePoint?.index ?? -1, activePoint };
}

export interface BubbleChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. One bubble each. */
  data: readonly BubbleChartDatum[];
  /** Key holding the horizontal value. */
  xDataKey?: string;
  /** Key holding the vertical value. */
  yDataKey?: string;
  /**
   * Key holding the third quantity, spaced by each bubble's area. The lowest value takes
   * the smallest radius in `sizeRange` and the highest the largest, so sizes compare rows
   * without giving their exact ratio. Without it every bubble is drawn at the middle of
   * `sizeRange`.
   */
  sizeKey?: string;
  /** Key holding the name written inside the circle. */
  labelKey?: string;
  /**
   * Key holding a colour for the row: a theme role, a CSS colour, or a number from 1
   * to 5 naming a chart colour. Without it the ramp cycles by row.
   */
  colorKey?: string;
  /**
   * Smallest and largest radius `sizeKey` maps onto, in pixels. The largest is also
   * what the plot holds back at every edge, so raising it costs room.
   */
  sizeRange?: [number, number];
  /**
   * `loading` holds the bubbles back and grows them in when it turns `ready`. Add a
   * `BubbleChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: BubbleChartStatus;
  /** The plot's width ÷ height. `1` is the square shape a bubble field reads best in. */
  aspectRatio?: number;
  /** Milliseconds for the bubbles to grow in. `0` draws them at once. */
  animationDuration?: number;
  /** Milliseconds for the bubbles and the axes to settle after the data changes. */
  domainDuration?: number;
  /** Fix the horizontal axis instead of deriving it. */
  xDomain?: [number, number];
  /** Fix the vertical axis instead of deriving it. */
  yDomain?: [number, number];
  /**
   * The bubble being read, and `null` when there is none. Fires when it changes, not per
   * frame. Reading needs `BubbleChart.Tooltip`; `showLabel={false}` keeps it without the label.
   */
  onActivePointChange?: (point: BubbleChartPoint | null) => void;
  /** Drop the axis padding so the field reaches the edges, for a thumbnail. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its name and values. */
  labelForDatum?: (datum: BubbleChartDatum, index: number) => string;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface BubbleChartHandle {
  replay: () => void;
}

const BubbleChartRoot = forwardRef<BubbleChartHandle, BubbleChartProps & RenderProp<'div'>>(function BubbleChartRoot(
  {
    data,
    xDataKey = 'x',
    yDataKey = 'y',
    sizeKey,
    labelKey,
    colorKey,
    sizeRange = SIZE_RANGE,
    status = 'ready',
    aspectRatio = 1,
    animationDuration = 800,
    domainDuration = 500,
    xDomain,
    yDomain,
    onActivePointChange,
    compact = false,
    label,
    labelForDatum,
    className,
    children,
    render,
    ...props
  },
  ref
) {
  const slotClasses = bubbleChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [slots, setSlots] = useState<Slots>({});
  const [activePoint, setActivePoint] = useState<BubbleChartPoint | null>(null);
  const [revision, setRevision] = useState(0);
  const interactionRef = useRef<ChartInteractionController<BubbleRow, number, number> | null>(null);
  const dragging = useRef(false);
  const landed = useRef('');

  /*
   * The chart mounts once its width is known. Mounted at a guess, the first
   * measurement is a resize, and a resize ends the entrance before it is seen.
   */
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => setWidth(node.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<BubbleChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const { grid, bubbles, labels, trend, quadrants, xAxis, yAxis, tooltip, skeleton } = slots;
  const [smallest, largest] = sizeRange;

  // A colour on the Bubbles part is the colour they are drawn in, so the legend, the
  // tooltip and the reported point all take it from here.
  const fillOverride = bubbles?.fill;
  const rows = useMemo(() => {
    const drawn = bubbleRows(data, { x: xDataKey, y: yDataKey, size: sizeKey, label: labelKey, color: colorKey }, [smallest, largest]);
    return fillOverride ? drawn.map((row) => ({ ...row, fill: fillOverride })) : drawn;
  }, [data, xDataKey, yDataKey, sizeKey, labelKey, colorKey, smallest, largest, fillOverride]);
  const sizeExtent = useMemo(() => sizeExtentOf(data, { x: xDataKey, y: yDataKey, size: sizeKey }), [data, xDataKey, yDataKey, sizeKey]);

  const margin = compact
    ? { top: COMPACT_EDGE, right: COMPACT_EDGE, bottom: COMPACT_EDGE, left: COMPACT_EDGE }
    : {
        top: Math.max(PADDING.top, largest),
        right: Math.max(PADDING.right, largest),
        bottom: Math.max(xAxis ? PADDING.bottom : 0, largest) + (xAxis?.label ? AXIS_TITLE_SIZE : 0),
        left: Math.max(yAxis ? Y_AXIS_WIDTH + (yAxis.label ? AXIS_TITLE_SIZE : 0) : PADDING.left, largest),
      };

  const definition = useMemo(() => {
    const domains = bubbleDomains(rows, xDomain, yDomain);
    const overlays: ChartMark<BubbleRow, number, number>[] = [];
    const place = (x: number, y: number, extra?: Partial<BubbleRow>): BubbleRow => ({
      index: 0,
      x,
      y,
      r: 0,
      size: null,
      label: '',
      fill: '',
      ...extra,
    });

    const centre = quadrants ? quadrantCentre(rows, quadrants.x, quadrants.y) : null;
    if (quadrants && centre) {
      const [left, right] = domains.x;
      const [bottom, top] = domains.y;
      if (quadrants.tint) {
        overlays.push(
          withoutPoints(
            rect(
              [
                place(centre.x, centre.y, { index: 0, x2: right, y2: top }),
                place(left, bottom, { index: 1, x2: centre.x, y2: centre.y }),
              ],
              {
                id: 'bubble-tint',
                key: 'index',
                x1: 'x',
                x2: (row: BubbleRow) => row.x2 ?? row.x,
                y1: 'y',
                y2: (row: BubbleRow) => row.y2 ?? row.y,
                fill: 'var(--foreground)',
                fillOpacity: 0.04,
              }
            )
          )
        );
      }
    }

    const rules = quadrants && centre
      ? [
          ruleX([centre.x], { id: 'bubble-split-x', stroke: quadrants.stroke, strokeOpacity: 0.7 }),
          ruleY([centre.y], { id: 'bubble-split-y', stroke: quadrants.stroke, strokeOpacity: 0.7 }),
        ]
      : [];

    const captions: ChartMark<BubbleRow, number, number>[] = [];
    if (quadrants && centre && quadrants.labels) {
      const [left, right] = domains.x;
      const [bottom, top] = domains.y;
      const corners = [
        { text: quadrants.labels.topLeft, x: left, y: top, west: true, north: true },
        { text: quadrants.labels.topRight, x: right, y: top, west: false, north: true },
        { text: quadrants.labels.bottomLeft, x: left, y: bottom, west: true, north: false },
        { text: quadrants.labels.bottomRight, x: right, y: bottom, west: false, north: false },
      ];
      corners.forEach(({ text: caption, x, y, west, north }) => {
        if (!caption) return;
        captions.push(
          withoutPoints(
            text([place(x, y, { label: caption })], {
              id: `bubble-corner-${west ? 'w' : 'e'}${north ? 'n' : 's'}`,
              key: 'label',
              x: 'x',
              y: 'y',
              text: 'label',
              anchor: west ? 'start' : 'end',
              dx: west ? QUADRANT_INSET : -QUADRANT_INSET,
              dy: north ? QUADRANT_INSET + 8 : -QUADRANT_INSET,
              fill: 'var(--foreground)',
              fontWeight: 500,
            })
          )
        );
      });
    }

    const fit = trend ? fitLine(rows) : null;
    const segment = fit ? trendSegment(fit, domains.x, domains.y) : null;
    const trendLine =
      trend && segment
        ? [
            withoutPoints(
              lineX(
                segment.map((end, index) => place(end.x, end.y, { index })),
                {
                  id: 'bubble-trend',
                  key: 'index',
                  x: 'x',
                  y: 'y',
                  stroke: trend.stroke,
                  strokeWidth: trend.strokeWidth,
                  strokeDasharray: trend.dashArray,
                  strokeOpacity: trend.opacity,
                }
              )
            ),
          ]
        : [];

    // One mark per colour: a dot's fill is a constant, and a bubble's colour is the row's.
    const fills = bubbles ? [...new Set(rows.map(({ fill }) => fill))] : [];
    const circles = fills.map((fill) =>
      dot(
        rows.filter((row) => row.fill === fill),
        {
          id: `bubbles-${fill}`,
          key: 'index',
          x: 'x',
          y: 'y',
          z: () => 'bubbles',
          r: 'r',
          fill,
          fillOpacity: bubbles?.opacity,
          // A size change alone is easy to miss among neighbours, and an opacity
          // change alone is invisible wherever circles overlap, so it does both.
          states: [
            {
              when: { focus: 'primary' as const },
              style: { r: ({ datum }: { datum: BubbleRow }) => datum.r * SWELL, fillOpacity: 1 },
              transition: { type: 'tween' as const, duration: SELECT_DURATION, easing: 'ease-out' as const },
            },
          ],
        }
      )
    );

    const named = labels
      ? rows
          .filter((row) => row.r >= labels.minRadius && (labels.format || row.label))
          .map((row) => {
            const datum = data[row.index];
            const name = labels.format && datum
              ? labels.format({ index: row.index, x: row.x, y: row.y, size: row.size, label: row.label, color: row.fill, datum })
              : row.label;
            return { ...row, label: fitLabel(name, row.r) };
          })
      : [];
    const names = named.length
      ? [
          withoutPoints(
            text(named, {
              id: 'bubble-names',
              key: 'index',
              x: 'x',
              y: 'y',
              text: 'label',
              fill: LABEL_FILL,
              fontWeight: 500,
              dy: 4,
            })
          ),
        ]
      : [];

    const placeholders = dot(loading && skeleton ? skeletonField(skeleton.count) : [], {
      id: 'bubble-skeleton',
      key: 'index',
      x: 'x',
      y: 'y',
      r: 'r',
      fill: skeleton?.fill ?? 'var(--muted)',
      motion: false,
    });

    const axisOf = (
      slot: { ticks: number; format: ((value: number) => string) | undefined; label: string | undefined } | undefined,
      gridCount: number | undefined
    ) => {
      if (slot) {
        return {
          line: false as const,
          ...(slot.label ? { label: slot.label } : {}),
          tickLabels: { opacity: 1 },
          ticks: {
            size: 0,
            count: slot.ticks,
            format: (value: number) => (loading ? '' : slot.format ? slot.format(value) : compactNumber(value)),
          },
        };
      }
      return gridCount ? { line: false as const, ticks: { size: 0, count: gridCount, format: () => '' } } : (false as const);
    };
    const gridLines = grid
      ? { stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray }
      : (false as const);

    const interactive = tooltip !== undefined && !loading && rows.length > 0 && bubbles !== undefined;
    const readout =
      tooltip && tooltip.showLabel
        ? {
            use: chartTooltip,
            className: tooltip.className,
            content(focused: readonly ChartPoint<BubbleRow, number, number>[]) {
              const { formatX, formatY, formatSize, labels: names_ } = tooltip.latest.current;
              const point = focused[0];
              if (!point) return { title: '', rows: [] };
              const { x, y, size, label: title, fill } = point.datum;
              return {
                title,
                rows: [
                  { label: names_?.[xDataKey] ?? xDataKey, value: formatX ? formatX(x) : compactNumber(x), color: fill },
                  { label: names_?.[yDataKey] ?? yDataKey, value: formatY ? formatY(y) : compactNumber(y) },
                  ...(sizeKey && size !== null
                    ? [{ label: names_?.[sizeKey] ?? sizeKey, value: formatSize ? formatSize(size) : compactNumber(size) }]
                    : []),
                ],
              };
            },
          }
        : undefined;

    return defineChart({
      theme: THEME,
      marks: loading ? [placeholders] : [...overlays, ...rules, ...trendLine, ...circles, ...names, ...captions],
      scales: {
        // While loading, the placeholders are shares of the plot, and there may be
        // no values yet to derive a domain from.
        x: {
          scale: scaleLinear(loading ? [0, 1] : domains.x, [0, 1]),
          grid: gridLines,
          axis: axisOf(xAxis, grid?.columns),
        },
        y: {
          scale: scaleLinear(loading ? [0, 1] : domains.y, [0, 1]),
          grid: gridLines,
          axis: axisOf(yAxis, grid?.rows),
        },
      },
      ...(compact ? { guides: false as const } : {}),
      margin,
      focusRing: false,
      // Only a bubble added to a chart already showing fades in here, so a replay does
      // not also fade the axes and grid in again. The first arrival is `landBubbles`.
      motion: (context: ChartMotionContext<BubbleRow>) =>
        context.phase === 'enter' && context.role !== 'dot' && context.role !== 'line'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive
        ? {
            // The largest bubble is wider than the floor, and all of it should read.
            maxFocusDistance: Math.max(tooltip.hitRadius, largest * SWELL),
            ...(readout ? { tooltip: readout } : {}),
          }
        : {}),
    });
  }, [
    rows,
    data,
    xDataKey,
    yDataKey,
    sizeKey,
    loading,
    xDomain?.[0],
    xDomain?.[1],
    yDomain?.[0],
    yDomain?.[1],
    compact,
    domainDuration,
    largest,
    margin.top,
    margin.right,
    margin.bottom,
    margin.left,
    grid,
    bubbles,
    labels,
    trend,
    quadrants,
    xAxis,
    yAxis,
    tooltip,
    skeleton,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Bubble chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<BubbleChartContextValue>(
    () => ({ rows, sizeExtent, sizeRange: [smallest, largest], margin, loading, setSlot, activePoint }),
    [rows, sizeExtent, smallest, largest, margin.top, margin.right, margin.bottom, margin.left, loading, setSlot, activePoint]
  );

  const spokenRow = (datum: BubbleChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [labelKey, xDataKey, yDataKey, sizeKey]
      .flatMap((key) => (key && datum[key] !== null && datum[key] !== undefined ? [`${key}, ${datum[key]}`] : []))
      .join('. ');

  // The chart also reports a point again when the data is rebuilt under it. Only a
  // different bubble, or new values on the same one, is news, and repeating it can loop
  // a caller that keeps the datum.
  const reportedId = useRef('');
  const report = (point: BubbleChartPoint | null) => {
    const id = point ? JSON.stringify([point.index, point.x, point.y, point.size, point.label, point.color, point.datum]) : '';
    if (reportedId.current === id) return;
    reportedId.current = id;
    setActivePoint(point);
    onActivePointChange?.(point);
  };
  const onFocusChange = (point: ChartPoint<BubbleRow, number, number> | null) => {
    const datum = point ? data[point.datum.index] : undefined;
    if (!point || !datum) return report(null);
    const { index, x, y, size, label: name, fill } = point.datum;
    report({ index, x, y, size, label: name, color: fill, datum });
  };

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => report(null), [revision, status]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a tap. A
   * sideways drag reads the bubbles it passes, and the last one stays until the next
   * press, the same as a tap's. A vertical drag never gets here: `pan-y` gives it to the
   * page, and the browser cancels the pointer.
   */
  const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !tooltip || loading) return;
    const interaction = interactionRef.current;
    if (!interaction) return;
    interaction.setControlledFocus(interaction.resolvePointer(event.clientX, event.clientY));
    if (dragging.current) return;
    dragging.current = true;
    document.addEventListener(
      'pointerdown',
      () => {
        dragging.current = false;
        interactionRef.current?.setControlledFocus(null);
      },
      { capture: true, once: true }
    );
  };

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bubble-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((datum, index) => (
                  <li key={index}>{spokenRow(datum, index)}</li>
                ))}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="bubble-chart-plot"
              className={slotClasses.plot()}
              style={{ aspectRatio }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') interactionRef.current?.setControlledFocus(null);
              }}
              onPointerMove={readDrag}
              onPointerCancel={() => interactionRef.current?.setControlledFocus(null)}
            >
              {width > 0 ? (
                <Chart
                  // An entrance only plays on a chart's first paint, so the bubbles
                  // arriving after a load, or a replay, are a new chart.
                  key={`${revision}:${status}`}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ container, scene, interaction }) => {
                    interactionRef.current = interaction;
                    // An entrance belongs to a chart's first paint with bubbles in it.
                    const paint = `${revision}:${status}`;
                    if (loading || landed.current === paint || scene.points.length === 0) return;
                    landed.current = paint;
                    // The chart swaps its surface right after this call, and a frame
                    // callback still runs ahead of the first paint.
                    requestAnimationFrame(() => landBubbles(container, animationDuration));
                  }}
                />
              ) : null}
            </div>
            {children}
          </>
        ),
      },
      props
    ),
  });

  return <BubbleChartContext.Provider value={context}>{element}</BubbleChartContext.Provider>;
});
BubbleChartRoot.displayName = 'BubbleChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface BubbleChartGridProps {
  /** Roughly how many lines to draw across the plot. With a y-axis, the lines follow its `ticks` instead. */
  rows?: number;
  /** Roughly how many lines to draw up it. With an x-axis, the lines follow its `ticks` instead. */
  columns?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Reference lines both ways, so a bubble can be placed against two numbers. */
function BubbleChartGrid({
  rows = 8,
  columns = 8,
  dashArray = '4 6',
  opacity = 1,
}: BubbleChartGridProps) {
  const { setSlot } = useChart('BubbleChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, columns, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, columns, dashArray, opacity, setSlot]);
  return null;
}
BubbleChartGrid.displayName = 'BubbleChart.Grid';

export interface BubbleChartTrendProps {
  /**
   * The line's slope and intercept, and how tightly the cloud sits on it. `r` runs 0
   * to 1: 1 is every bubble on the line, 0 is a cloud with no direction. Fires when the
   * numbers change, so putting the fit straight into state is safe. It does not fire when
   * fewer than two bubbles with different x values remain, so clear a stored fit with the data.
   */
  onFit?: (fit: BubbleFit) => void;
  /** A theme role or any CSS colour. Defaults to the muted foreground. */
  color?: string;
  /** Thickness of the line, in pixels. */
  strokeWidth?: number;
  /** Dash pattern. Dashed by default: the line is a reading, not a measurement. */
  dashArray?: string;
  /** Opacity of the line. */
  opacity?: number;
}

/**
 * The straight line that fits the cloud best, drawn under the circles. Least squares on
 * the raw values, so resizing the chart never changes it. Fewer than two bubbles, or
 * every bubble on one vertical, has no line to draw.
 */
function BubbleChartTrend({
  onFit,
  color,
  strokeWidth = 1.5,
  dashArray = '6 5',
  opacity = 0.7,
}: BubbleChartTrendProps) {
  const { setSlot, rows } = useChart('BubbleChart.Trend');
  const stroke = color ? colorOf(color) : 'var(--muted-foreground)';
  useEffect(() => {
    setSlot('trend', { stroke, strokeWidth, dashArray, opacity });
    return () => setSlot('trend', undefined);
  }, [stroke, strokeWidth, dashArray, opacity, setSlot]);

  const latest = useLatest(onFit);
  const fit = useMemo(() => fitLine(rows), [rows]);
  useEffect(() => {
    if (fit) latest.current?.(fit);
  }, [fit?.slope, fit?.intercept, fit?.r, latest]);
  return null;
}
BubbleChartTrend.displayName = 'BubbleChart.Trend';

export interface BubbleChartBubblesProps {
  /** Fill opacity. Below 1 by default, so overlapping bubbles read as denser. */
  opacity?: number;
  /** One colour for every bubble, a theme role or any CSS colour, over the per-row ramp. */
  color?: string;
}

/** The circles. */
function BubbleChartBubbles({
  opacity = 0.9,
  color,
}: BubbleChartBubblesProps) {
  const { setSlot } = useChart('BubbleChart.Bubbles');
  const fill = color ? colorOf(color) : undefined;
  useEffect(() => {
    setSlot('bubbles', { opacity, fill });
    return () => setSlot('bubbles', undefined);
  }, [opacity, fill, setSlot]);
  return null;
}
BubbleChartBubbles.displayName = 'BubbleChart.Bubbles';

export interface BubbleChartSkeletonProps {
  /** How many placeholder circles to scatter. */
  count?: number;
  /** A theme role or any CSS colour. Defaults to the muted surface. */
  color?: string;
}

/**
 * The loading state: a still field of muted circles. Still, because a shimmer over
 * circles reads as them moving, and position is what this chart says.
 */
function BubbleChartSkeleton({
  count = 7,
  color,
}: BubbleChartSkeletonProps) {
  const { setSlot } = useChart('BubbleChart.Skeleton');
  const fill = color ? colorOf(color) : 'var(--muted)';
  useEffect(() => {
    setSlot('skeleton', { count, fill });
    return () => setSlot('skeleton', undefined);
  }, [count, fill, setSlot]);
  return null;
}
BubbleChartSkeleton.displayName = 'BubbleChart.Skeleton';

export interface BubbleChartLabelsProps {
  /** Smallest radius a bubble may have and still be given its name. */
  minRadius?: number;
  /** Turn a bubble into its name. Defaults to the value at `labelKey`. */
  format?: (point: BubbleChartPoint) => string;
}

/**
 * The names, written inside the circles. A bubble too small to hold its name goes
 * without, and the readout names it instead. A name longer than its circle is cut.
 */
function BubbleChartLabels({
  minRadius = LABEL_MIN_RADIUS,
  format,
}: BubbleChartLabelsProps) {
  const { setSlot } = useChart('BubbleChart.Labels');
  useEffect(() => {
    setSlot('labels', { minRadius, format });
    return () => setSlot('labels', undefined);
  }, [minRadius, format, setSlot]);
  return null;
}
BubbleChartLabels.displayName = 'BubbleChart.Labels';

export interface BubbleChartQuadrantsProps {
  /** Where the vertical rule stands. Defaults to the mean of the x values. */
  x?: number;
  /** Where the horizontal rule lies. Defaults to the mean of the y values. */
  y?: number;
  /** A word for each corner, written in the corner it belongs to. */
  labels?: { topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string };
  /** Tint the high-high and low-low corners. */
  tint?: boolean;
  /** Colour of the rules, a theme role or any CSS colour. Defaults to the muted foreground. */
  color?: string;
}

/**
 * A crosshair splitting the plot into four, with a name for each corner. It stands at
 * the mean of each axis unless `x` and `y` pin it to a target or a budget.
 */
function BubbleChartQuadrants({
  x,
  y,
  labels,
  tint = true,
  color,
}: BubbleChartQuadrantsProps) {
  const { setSlot } = useChart('BubbleChart.Quadrants');
  const stroke = color ? colorOf(color) : 'var(--muted-foreground)';
  const key = JSON.stringify(labels ?? null);
  useEffect(() => {
    setSlot('quadrants', { x, y, labels, tint, stroke });
    return () => setSlot('quadrants', undefined);
  }, [x, y, key, tint, stroke, setSlot]);
  return null;
}
BubbleChartQuadrants.displayName = 'BubbleChart.Quadrants';

export interface BubbleChartSizeKeyProps extends ComponentProps<'div'> {
  /** Which corner of the plot it sits in. */
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** A word for what the area means: "people", "revenue". */
  label?: string;
}

/**
 * Three nested circles saying what a bubble's area is worth, because area has no axis
 * to read it off. It needs a `sizeKey` on the chart: without one every bubble is the
 * same size and there is no scale to key.
 */
function BubbleChartSizeKey({
  placement = 'bottom-right',
  format,
  label,
  className,
  style,
  render,
  ...props
}: BubbleChartSizeKeyProps & RenderProp<'div'>) {
  const { sizeExtent, sizeRange, margin, loading } = useChart('BubbleChart.SizeKey');
  const slots = bubbleChartVariants();
  const steps = sizeExtent
    ? // A Set, because every bubble being the same size leaves one step to show.
      [...new Set([sizeExtent[1], (sizeExtent[0] + sizeExtent[1]) / 2, sizeExtent[0]])].map((value) => ({
        value,
        r: bubbleRadius(value, sizeExtent, sizeRange),
      }))
    : [];
  const outer = steps[0]?.r ?? 0;
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bubble-chart-size-key',
        'aria-hidden': true,
        className: slots.sizeKey({ className }),
        style: {
          ...style,
          [placement.startsWith('top') ? 'top' : 'bottom']: placement.startsWith('top') ? margin.top : margin.bottom,
          [placement.endsWith('left') ? 'left' : 'right']: placement.endsWith('left') ? margin.left : margin.right,
        },
        children: (
          <>
            {label ? <div className={slots.sizeKeyLabel()}>{label}</div> : null}
            <svg width={outer * 2 + SIZE_KEY_LABEL_WIDTH} height={outer * 2 + 1} className="block overflow-visible">
              {steps.map(({ value, r }) => (
                <g key={value}>
                  <circle
                    cx={outer}
                    cy={outer * 2 - r}
                    r={r}
                    fill="none"
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.85}
                  />
                  <text x={outer * 2 + 6} y={outer * 2 - r * 2 + 8} fill="var(--muted-foreground)" fontSize={10}>
                    {format ? format(value) : compactNumber(value)}
                  </text>
                </g>
              ))}
            </svg>
          </>
        ),
      },
      props
    ),
  });
  return loading || !steps.length ? null : element;
}
BubbleChartSizeKey.displayName = 'BubbleChart.SizeKey';

export interface BubbleChartXAxisProps {
  /** Roughly how many labels to show. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** The axis's own name: what is being measured. */
  label?: string;
}

/** The horizontal labels, on round numbers. */
function BubbleChartXAxis({
  ticks = 4,
  format,
  label,
}: BubbleChartXAxisProps) {
  const { setSlot } = useChart('BubbleChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format, label });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, label, setSlot]);
  return null;
}
BubbleChartXAxis.displayName = 'BubbleChart.XAxis';

export interface BubbleChartYAxisProps {
  /** Roughly how many labels to show. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** The axis's own name: what is being measured. */
  label?: string;
}

/** The vertical labels, with a gutter made for them. */
function BubbleChartYAxis({
  ticks = 4,
  format,
  label,
}: BubbleChartYAxisProps) {
  const { setSlot } = useChart('BubbleChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format, label });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, label, setSlot]);
  return null;
}
BubbleChartYAxis.displayName = 'BubbleChart.YAxis';

export interface BubbleChartTooltipProps {
  /** Float a small readout beside the bubble. Without it the bubble still swells and reports. */
  showLabel?: boolean;
  /** Format the x value for the readout. Defaults to a compact number. */
  formatX?: (value: number) => string;
  /** Format the y value for the readout. Defaults to a compact number. */
  formatY?: (value: number) => string;
  /** Format the size value for the readout. Defaults to a compact number. */
  formatSize?: (value: number) => string;
  /** Prettier names for the x, y and size keys. */
  labels?: Record<string, string>;
  /** How far from a bubble's centre the pointer still reads it, at the least, in pixels. */
  hitRadius?: number;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a bubble, tapping it, dragging across the
 * field, or the arrow keys. A click or a tap pins the reading until the next press
 * elsewhere or Escape.
 */
function BubbleChartTooltip({
  showLabel = true,
  formatX,
  formatY,
  formatSize,
  labels,
  hitRadius = HIT_RADIUS,
  className,
}: BubbleChartTooltipProps) {
  const { setSlot } = useChart('BubbleChart.Tooltip');
  const latest = useLatest({ formatX, formatY, formatSize, labels });
  useEffect(() => {
    setSlot('tooltip', { showLabel, hitRadius, className, latest });
    return () => setSlot('tooltip', undefined);
  }, [showLabel, hitRadius, className, latest, setSlot]);
  return null;
}
BubbleChartTooltip.displayName = 'BubbleChart.Tooltip';

export interface BubbleChartLegendProps extends ComponentProps<'div'> {
  /** How many rows to list before stopping. */
  limit?: number;
}

/** A swatch and a name per row, because in this chart a row is the category. */
function BubbleChartLegend({
  limit = 8,
  className,
  render,
  ...props
}: BubbleChartLegendProps & RenderProp<'div'>) {
  const { rows } = useChart('BubbleChart.Legend');
  const slots = bubbleChartVariants();
  const shown = rows.filter((row) => row.label).slice(0, limit);
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bubble-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: shown.map((row) => (
          <span key={row.index} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: row.fill }} />
            {row.label}
          </span>
        )),
      },
      props
    ),
  });
  return shown.length ? element : null;
}
BubbleChartLegend.displayName = 'BubbleChart.Legend';

export interface BubbleChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: what the area means, usually. */
  caption?: ReactNode;
  /** Trailing slot: a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the plot. The value is not derived here: a readout that follows the
 * pointer takes it from `onActivePointChange` and passes the string down.
 */
function BubbleChartHeader({
  title,
  value,
  caption,
  className,
  children,
  render,
  ...props
}: BubbleChartHeaderProps & RenderProp<'div'>) {
  const slots = bubbleChartVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bubble-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value !== undefined && value !== null ? <div className={slots.headerValue()}>{value}</div> : null}
              {caption ? <div className={slots.headerMuted()}>{caption}</div> : null}
            </div>
            {children ? <div className={slots.headerTrailing()}>{children}</div> : null}
          </>
        ),
      },
      props
    ),
  });
}
BubbleChartHeader.displayName = 'BubbleChart.Header';

export const BubbleChart = Object.assign(BubbleChartRoot, {
  Header: BubbleChartHeader,
  Grid: BubbleChartGrid,
  Quadrants: BubbleChartQuadrants,
  Trend: BubbleChartTrend,
  Bubbles: BubbleChartBubbles,
  Labels: BubbleChartLabels,
  SizeKey: BubbleChartSizeKey,
  Skeleton: BubbleChartSkeleton,
  XAxis: BubbleChartXAxis,
  YAxis: BubbleChartYAxis,
  Tooltip: BubbleChartTooltip,
  Legend: BubbleChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  BubbleChartHeader,
  BubbleChartGrid,
  BubbleChartQuadrants,
  BubbleChartTrend,
  BubbleChartBubbles,
  BubbleChartLabels,
  BubbleChartSizeKey,
  BubbleChartSkeleton,
  BubbleChartXAxis,
  BubbleChartYAxis,
  BubbleChartTooltip,
  BubbleChartLegend,
};
