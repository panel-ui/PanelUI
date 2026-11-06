'use client';

/**
 * MirrorAreaChart — two readings of one timeline, one above a baseline and one
 * below it.
 *
 * ```tsx
 * <MirrorAreaChart data={load} xDataKey="time">
 *   <MirrorAreaChart.Grid />
 *   <MirrorAreaChart.Area dataKey="jobs" label="jobs" muted />
 *   <MirrorAreaChart.Area dataKey="high" label="high priority" />
 *   <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" />
 *   <MirrorAreaChart.Baseline />
 *   <MirrorAreaChart.Tooltip />
 * </MirrorAreaChart>
 * ```
 *
 * ## Two scales, one timeline
 *
 * Each half has its own scale, because the two readings are usually in different
 * units. Both grow away from the baseline, so a peak in one lines up with whatever
 * the other did at the same moment, and neither is squeezed into the other's range.
 * The chart draws on one axis, in shares of the plot, and works out each value's
 * position for its half.
 *
 * ## The parts describe, the root draws
 *
 * The parts draw nothing themselves. Each one tells the root what it wants, and the
 * root builds one chart definition from them, in a box its `aspectRatio` has
 * reserved. Areas on one side overlay in the order they are declared, so declare
 * the whole first and the part of it second.
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's MirrorAreaChart. What differs is
 * what the web changes: a colour is named by the theme's role, a point is read by
 * hovering, tapping or dragging, a click pins the reading, and the arrow keys walk
 * the points.
 */
import { areaY, d3Curve, defineChart, dot, lineY, ruleY, type ChartInteractionController, type ChartMotionContext, type ChartPoint } from '@tanstack/charts';
import { crosshair } from '@tanstack/charts/crosshair';
import { whenFocused } from '@tanstack/charts/focus/mark';
import { decorative } from '@tanstack/charts/mark/decorative';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip as chartTooltip } from '@tanstack/charts/tooltip';
import { curveLinear, curveMonotoneX } from 'd3-shape';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
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
import { mirrorPosition, mirrorShare, outerValue, readValue, sideExtent, tickIndexes, type MirrorAreaChartSide } from './mirror-scale';

export type { MirrorAreaChartSide };

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type MirrorAreaChartStatus = 'loading' | 'ready';
export type MirrorAreaChartCurve = 'monotone' | 'linear';
export type MirrorAreaChartDatum = Record<string, string | number | null | undefined>;

/** Which of the theme's roles something is drawn in. */
export type MirrorAreaChartColor =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'foreground'
  | 'muted-foreground';

const COLOR_VAR: Record<MirrorAreaChartColor, string> = {
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
  'chart-4': 'var(--chart-4)',
  'chart-5': 'var(--chart-5)',
  foreground: 'var(--foreground)',
  'muted-foreground': 'var(--muted-foreground)',
};

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const CURVES = { monotone: d3Curve(curveMonotoneX), linear: d3Curve(curveLinear) };

const mirrorAreaChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    dots: 'pointer-events-none absolute inset-0 size-full',
    skeleton: 'pointer-events-none absolute overflow-hidden rounded-sm bg-muted',
    sweep:
      'absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--chart-1)_30%,transparent),transparent)] motion-reduce:hidden',
    legend:
      'pointer-events-none absolute right-2 top-0 col-start-1 row-start-2 flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Room left around the plot for the axis labels. */
const MARGIN = { top: 12, right: 10, bottom: 30, left: 10 };

/** The left margin when a `YAxis` needs somewhere to write. */
const Y_AXIS_WIDTH = 40;

/** Keeps a compact band's stroke from being cut at the edges of its box. */
const COMPACT_MARGIN = { top: 2, right: 1, bottom: 2, left: 1 };

/** How far the skeleton's band reaches into each half. */
const SKELETON_REACH = 0.18;

/** Both halves grow out of the baseline at once, while the grid and axes are already there. */
const STYLES = `@keyframes panelui-mirror-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@keyframes panelui-mirror-reveal{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@media (prefers-reduced-motion:no-preference){[data-slot=mirror-area-chart-plot][data-revealing] :is(.ts-chart__line,.ts-chart__area){transform-origin:0 var(--mirror-baseline);animation:panelui-mirror-reveal var(--mirror-reveal) cubic-bezier(.33,1,.68,1) both}}`;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One point of one band. `position` is null across a gap. */
interface BandRow {
  index: number;
  position: number | null;
}

interface SeriesEntry {
  key: string;
  label: string;
  side: MirrorAreaChartSide;
  stroke: string;
  outer: number;
  inner: number;
  showLine: boolean;
  strokeWidth: number;
}

/** Where the drawing put the plot, in pixels inside the chart's box. */
interface PlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new
 * one redraws it. The readout's are read through `latest` when it opens.
 */
interface Slots {
  grid?: { variant: 'dots' | 'lines'; spacing: number | undefined; opacity: number; stroke: string };
  baseline?: { stroke: string; strokeWidth: number; opacity: number };
  xAxis?: { ticks: number; format: MirrorAreaChartXAxisProps['format'] };
  yAxis?: { formatTop: MirrorAreaChartYAxisProps['formatTop']; formatBottom: MirrorAreaChartYAxisProps['formatBottom'] };
  tooltip?: {
    stroke: string;
    className: string | undefined;
    latest: { current: Pick<MirrorAreaChartTooltipProps, 'formatValue' | 'formatX' | 'formatSummary'> };
  };
  skeleton?: { duration: number; base: string | undefined };
}

interface MirrorAreaChartContextValue {
  data: readonly MirrorAreaChartDatum[];
  xDataKey: string;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const MirrorAreaChartContext = createContext<MirrorAreaChartContextValue | null>(null);

function useChart(component: string): MirrorAreaChartContextValue {
  const context = useContext(MirrorAreaChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <MirrorAreaChart>`);
  }
  return context;
}

/** The row being read, for something rendered inside the chart. */
export function useMirrorAreaChart() {
  const { data, activeIndex, xDataKey } = useChart('useMirrorAreaChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
  };
}

/** Top-half areas first, then the bottom half's, each in declaration order. */
function sidesInOrder(series: readonly SeriesEntry[]) {
  return [...series.filter(({ side }) => side === 'top'), ...series.filter(({ side }) => side === 'bottom')];
}

export interface MirrorAreaChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a point along the x-axis. */
  data: readonly MirrorAreaChartDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /** How much of the plot's height sits above the baseline, from `0` to `1`. Give the half you want read first the larger share. */
  split?: number;
  /** Fix the top half's scale instead of deriving it from the data. Only the upper end is used: the baseline is always zero. */
  topDomain?: [number, number];
  /** Fix the bottom half's scale. Only the upper end is used. */
  bottomDomain?: [number, number];
  /** `monotone` never overshoots between points; `linear` joins them straight. */
  curve?: MirrorAreaChartCurve;
  /** `loading` holds the bands back and grows them out when it turns `ready`. Add a `MirrorAreaChart.Skeleton` to show something meanwhile. */
  status?: MirrorAreaChartStatus;
  /** The plot's width ÷ height. */
  aspectRatio?: number;
  /** Milliseconds for the bands to grow out. */
  animationDuration?: number;
  /** Milliseconds for the bands to settle after the data changes. */
  domainDuration?: number;
  /** The row being read, and `-1`/`null` when there is none. Fires when the index changes, not per frame. */
  onActiveIndexChange?: (index: number, datum: MirrorAreaChartDatum | null) => void;
  /** Drop the axis padding so the bands reach the edges, for a sparkline. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: MirrorAreaChartDatum, index: number) => string;
}

/** Imperative handle: re-run the reveal, for a "replay" control. */
export interface MirrorAreaChartHandle {
  replay: () => void;
}

const MirrorAreaChartRoot = forwardRef<MirrorAreaChartHandle, MirrorAreaChartProps & RenderProp<'div'>>(function MirrorAreaChartRoot(
  {
    data,
    xDataKey = 'date',
    split = 0.55,
    topDomain,
    bottomDomain,
    curve = 'monotone',
    status = 'ready',
    aspectRatio = 1.6,
    animationDuration = 700,
    domainDuration = 500,
    onActiveIndexChange,
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
  const slotClasses = mirrorAreaChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesList] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [revealedKey, setRevealedKey] = useState('');
  const [box, setBox] = useState<PlotBox | null>(null);
  const interactionRef = useRef<ChartInteractionController<BandRow, number, number> | null>(null);
  const dragging = useRef(false);
  // Unique per chart: gradients are found by id across the whole page.
  const idPrefix = `panelui-mirror-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

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

  // Puts an entry in its place, or at the end if it is new, so a change keeps the order.
  const setSeries = useCallback(
    (entry: SeriesEntry) =>
      setSeriesList((current) =>
        current.some(({ key }) => key === entry.key)
          ? current.map((existing) => (existing.key === entry.key ? entry : existing))
          : [...current, entry]
      ),
    []
  );
  const removeSeries = useCallback((key: string) => setSeriesList((current) => current.filter((entry) => entry.key !== key)), []);
  const setSlot = useCallback<MirrorAreaChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const chartKey = `${revision}:${status}`;
  // A finished reveal counts for this load only, so the next one plays again.
  useEffect(() => {
    if (loading) setRevealedKey('');
  }, [loading]);
  const { grid, baseline, xAxis, yAxis, tooltip, skeleton } = slots;
  const share = mirrorShare(split);

  const definition = useMemo(() => {
    const curveFactory = CURVES[curve];
    const span = Math.max(1, data.length - 1);
    const keysOf = (side: MirrorAreaChartSide) => series.filter((entry) => entry.side === side).map(({ key }) => key);
    const extents = {
      top: sideExtent(data, keysOf('top'), topDomain),
      bottom: sideExtent(data, keysOf('bottom'), bottomDomain),
    };
    const position = (value: number | null, side: MirrorAreaChartSide) =>
      value === null ? null : mirrorPosition(value, side, extents[side], share);
    const rowsOf = ({ key, side }: SeriesEntry): BandRow[] =>
      data.map((datum, index) => ({ index, position: position(readValue(datum[key]), side) }));

    const gradientId = (key: string) => `${idPrefix}-${series.findIndex((entry) => entry.key === key)}`;
    const bands = series.map((entry) =>
      decorative(
        areaY(rowsOf(entry), {
          id: `mirror-area-${entry.key}`,
          x: 'index',
          y1: () => 0,
          y2: 'position',
          key: 'index',
          fill: `url(#${gradientId(entry.key)})`,
          fillOpacity: 1,
          curve: curveFactory,
        })
      )
    );
    const edges = series
      .filter(({ showLine }) => showLine)
      .map((entry) =>
        decorative(
          lineY(rowsOf(entry), {
            id: `mirror-edge-${entry.key}`,
            x: 'index',
            y: 'position',
            key: 'index',
            stroke: entry.stroke,
            strokeWidth: entry.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            curve: curveFactory,
          })
        )
      );
    // The dot rides the outermost edge of the top half, or of the bottom when there is no top.
    const dotSide: MirrorAreaChartSide = keysOf('top').length ? 'top' : 'bottom';
    const dotKeys = keysOf(dotSide);
    const dotRows = data.flatMap((datum, index) => {
      const value = outerValue(datum, dotKeys);
      return value === null ? [] : [{ index, position: position(value, dotSide) }];
    });

    const labelOf = (index: number) => {
      const datum = data[index];
      if (!datum) return '';
      return xAxis?.format ? xAxis.format(datum, index) : String(datum[xDataKey] ?? '');
    };

    const valueTicks = [share, 0, share - 1];
    const valueLabel = (value: number) => {
      if (value === 0) return '0';
      return value > 0
        ? (yAxis?.formatTop ?? compactNumber)(extents.top)
        : (yAxis?.formatBottom ?? compactNumber)(extents.bottom);
    };
    const rules = Math.max(Math.round(grid?.spacing ?? 2), 1);
    const ruleTicks = Array.from({ length: rules }, (_, index) => index + 1).flatMap((step) => [
      (share * step) / rules,
      ((share - 1) * step) / rules,
    ]);
    const lined = grid?.variant === 'lines';

    const interactive = tooltip !== undefined && !loading && data.length > 0 && series.length > 0;
    const marks = loading
      ? []
      : [
          ...bands,
          ...edges,
          ...(baseline
            ? [
                decorative(
                  ruleY([0], {
                    id: 'mirror-baseline',
                    stroke: baseline.stroke,
                    strokeWidth: baseline.strokeWidth,
                    strokeOpacity: baseline.opacity,
                  })
                ),
              ]
            : []),
          ...(interactive
            ? [
                // What the pointer and the keys land on: one point for every row, gap or not.
                lineY(
                  data.map((_, index) => ({ index, position: 0 })),
                  { id: 'mirror-focus', x: 'index', y: 'position', key: 'index', stroke: 'transparent' }
                ),
                crosshair<number, number>({ y: false, stroke: tooltip.stroke, strokeOpacity: 0.6, strokeWidth: 1, strokeDasharray: '3 4' }),
                whenFocused(
                  dot(dotRows, {
                    id: 'mirror-dot',
                    x: 'index',
                    y: 'position',
                    key: 'index',
                    r: 4.5,
                    fill: tooltip.stroke,
                    stroke: 'var(--background)',
                    strokeWidth: 2,
                  }),
                  { match: 'x' }
                ),
              ]
            : []),
        ];

    return defineChart({
      theme: THEME,
      marks,
      margin: compact ? COMPACT_MARGIN : { ...MARGIN, left: yAxis ? Y_AXIS_WIDTH : MARGIN.left },
      scales: {
        x: {
          scale: scaleLinear([0, span], [0, 1]),
          axis:
            xAxis && !compact
              ? {
                  line: false as const,
                  // The two ends lean inward, clear of the plot's edge.
                  tickLabels: {
                    opacity: 1,
                    anchor: ({ value }: { value: number }) =>
                      value === 0 ? ('start' as const) : value === data.length - 1 ? ('end' as const) : undefined,
                  },
                  ticks: { size: 0, format: labelOf, values: tickIndexes(data.length, xAxis.ticks) },
                }
              : (false as const),
        },
        y: {
          scale: scaleLinear([share - 1, share], [0, 1]),
          grid: lined ? { stroke: grid.stroke, strokeOpacity: grid.opacity, strokeDasharray: '4 6' } : false,
          axis:
            yAxis && !compact && !loading
              ? {
                  line: false as const,
                  tickLabels: { opacity: 1 },
                  // Two scales, so three labels: a column of even numbers would suggest one.
                  ticks: { size: 0, values: lined ? [...valueTicks, ...ruleTicks] : valueTicks, format: (value: number) => (valueTicks.includes(value) ? valueLabel(value) : '') },
                }
              : lined
                ? { line: false as const, ticks: { size: 0, values: ruleTicks, format: () => '' } }
                : (false as const),
        },
      },
      gradients: series.map(({ key, side, stroke, outer, inner }) => ({
        id: gradientId(key),
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        // Top to bottom in the band's own box: the outer edge is at the top of a top band.
        stops: [
          { offset: 0, color: stroke, opacity: side === 'top' ? outer : inner },
          { offset: 1, color: stroke, opacity: side === 'top' ? inner : outer },
        ],
      })),
      focusRing: false,
      // The bands arrive by the animation in `STYLES`, and everything else is simply there.
      motion: (context: ChartMotionContext<BandRow>) =>
        context.phase === 'enter'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive
        ? {
            focus: 'group-x' as const,
            maxFocusDistance: Number.POSITIVE_INFINITY,
            tooltip: {
              use: chartTooltip,
              className: tooltip.className,
              // Beside the crosshair and along the top, on whichever side has room.
              anchor: { x: 'value', y: 'plot-top' } as const,
              placement: ['bottom-left', 'bottom-right'] as const,
              offset: 14,
              content(points: readonly ChartPoint<BandRow, number, number>[]) {
                const { formatValue, formatX, formatSummary } = tooltip.latest.current;
                const index = points[0]?.datum.index ?? -1;
                const datum = data[index];
                if (!datum) return { title: '', rows: [] };
                const title = formatX ? formatX(datum) : String(datum[xDataKey] ?? '');
                if (formatSummary) return { title, rows: [{ label: formatSummary(datum), value: '' }] };
                return {
                  title,
                  rows: series.flatMap(({ key, label: name, stroke }) => {
                    const value = readValue(datum[key]);
                    if (value === null) return [];
                    return [{ label: name, value: formatValue ? formatValue(value, key) : compactNumber(value), color: stroke }];
                  }),
                };
              },
            },
          }
        : {}),
    });
  }, [
    data,
    xDataKey,
    series,
    loading,
    curve,
    share,
    topDomain?.[0],
    topDomain?.[1],
    bottomDomain?.[0],
    bottomDomain?.[1],
    compact,
    domainDuration,
    idPrefix,
    grid,
    baseline,
    xAxis,
    yAxis,
    tooltip,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Mirror area chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<MirrorAreaChartContextValue>(
    () => ({ data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex }),
    [data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex]
  );

  const spokenRow = (datum: MirrorAreaChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [
      `${xDataKey}, ${datum[xDataKey] ?? ''}`,
      ...series.filter(({ key }) => readValue(datum[key]) !== null).map(({ key, label: name }) => `${name}, ${datum[key]}`),
    ].join('. ');

  // The chart also reports a point again when the data is rebuilt under it. Only a
  // change of point is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<BandRow, number, number> | null) => reportActive(point ? point.datum.index : -1);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => reportActive(-1), [revision, status]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the points it crosses, and the last one stays until
   * the next press, the same as a tap's. A vertical drag never gets here: `pan-y`
   * gives it to the page, and the browser cancels the pointer.
   */
  const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !tooltip || loading) return;
    const interaction = interactionRef.current;
    const target = interaction?.resolvePointer(event.clientX, event.clientY);
    if (!interaction || !target) return;
    interaction.setControlledFocus(target);
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

  const baselineY = box ? box.y + box.height * share : 0;
  const dotGap = Math.max(grid?.spacing ?? 12, 4);

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'mirror-area-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            <style>{STYLES}</style>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((datum, index) => (
                  <li key={index}>{spokenRow(datum, index)}</li>
                ))}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="mirror-area-chart-plot"
              data-revealing={!loading && revealedKey !== chartKey ? '' : undefined}
              className={slotClasses.plot()}
              style={{ aspectRatio, ['--mirror-reveal' as string]: `${animationDuration}ms`, ['--mirror-baseline' as string]: `${baselineY}px` }}
              onAnimationEnd={(event) => {
                if (event.animationName === 'panelui-mirror-reveal') setRevealedKey(chartKey);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') interactionRef.current?.setControlledFocus(null);
              }}
              onPointerMove={readDrag}
              onPointerCancel={() => interactionRef.current?.setControlledFocus(null)}
            >
              {/* Dots are a tile from the baseline, so one row always lies on it. */}
              {box && grid && grid.variant === 'dots' && !compact ? (
                <svg data-slot="mirror-area-chart-grid" aria-hidden className={slotClasses.dots()} style={{ opacity: grid.opacity }}>
                  <defs>
                    <pattern
                      id={`${idPrefix}-dots`}
                      x={box.x}
                      y={baselineY - dotGap / 2}
                      width={dotGap}
                      height={dotGap}
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx={dotGap / 2} cy={dotGap / 2} r={0.9} style={{ fill: grid.stroke }} />
                    </pattern>
                  </defs>
                  <rect x={box.x} y={box.y} width={box.width} height={box.height} fill={`url(#${idPrefix}-dots)`} />
                </svg>
              ) : null}
              {width > 0 ? (
                <Chart
                  // The reveal belongs to a new chart: a load finishing, or a replay.
                  key={chartKey}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ scene, interaction }) => {
                    interactionRef.current = interaction;
                    const { x, y, width: plotWidth, height } = scene.chart;
                    setBox((current) =>
                      current && current.x === x && current.y === y && current.width === plotWidth && current.height === height
                        ? current
                        : { x, y, width: plotWidth, height }
                    );
                  }}
                />
              ) : null}
              {loading && skeleton && box ? (
                <div
                  data-slot="mirror-area-chart-skeleton"
                  aria-hidden
                  className={slotClasses.skeleton()}
                  style={{
                    left: box.x,
                    width: box.width,
                    top: baselineY - box.height * share * SKELETON_REACH,
                    height: box.height * SKELETON_REACH,
                    background: skeleton.base,
                  }}
                >
                  <div className={slotClasses.sweep()} style={{ animation: `panelui-mirror-sweep ${skeleton.duration}ms linear infinite` }} />
                </div>
              ) : null}
            </div>
            {children}
          </>
        ),
      },
      props
    ),
  });

  return <MirrorAreaChartContext.Provider value={context}>{element}</MirrorAreaChartContext.Provider>;
});
MirrorAreaChartRoot.displayName = 'MirrorAreaChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface MirrorAreaChartGridProps {
  /** `dots` is a field of points; `lines` is dashed rules across each half. */
  variant?: 'dots' | 'lines';
  /** Distance between dots in pixels, or how many rules each half gets. */
  spacing?: number;
  /** Opacity of the dots or the rules. */
  opacity?: number;
  /** Which of the theme's roles they are drawn in. Defaults to the border colour. */
  color?: MirrorAreaChartColor;
}

/** The texture behind the bands. Dots by default, which mark the plot's extent without competing with the baseline. */
function MirrorAreaChartGrid({
  variant = 'dots',
  spacing,
  opacity = 1,
  color,
}: MirrorAreaChartGridProps) {
  const { setSlot } = useChart('MirrorAreaChart.Grid');
  const stroke = color ? COLOR_VAR[color] : 'var(--border)';
  useEffect(() => {
    setSlot('grid', { variant, spacing, opacity, stroke });
    return () => setSlot('grid', undefined);
  }, [variant, spacing, opacity, stroke, setSlot]);
  return null;
}
MirrorAreaChartGrid.displayName = 'MirrorAreaChart.Grid';

export interface MirrorAreaChartBaselineProps {
  /** Which of the theme's roles the line is drawn in. */
  color?: MirrorAreaChartColor;
  /** The line's width. */
  strokeWidth?: number;
  /** The line's opacity. */
  opacity?: number;
}

/** The line both halves grow away from, drawn over the bands. */
function MirrorAreaChartBaseline({
  color = 'muted-foreground',
  strokeWidth = 1,
  opacity = 0.5,
}: MirrorAreaChartBaselineProps) {
  const { setSlot } = useChart('MirrorAreaChart.Baseline');
  const stroke = COLOR_VAR[color];
  useEffect(() => {
    setSlot('baseline', { stroke, strokeWidth, opacity });
    return () => setSlot('baseline', undefined);
  }, [stroke, strokeWidth, opacity, setSlot]);
  return null;
}
MirrorAreaChartBaseline.displayName = 'MirrorAreaChart.Baseline';

export interface MirrorAreaChartAreaProps {
  /** Column in the data holding this series' values. A missing value leaves a gap. */
  dataKey: string;
  /** Which half it is drawn in. */
  side?: MirrorAreaChartSide;
  /** The name shown by the readout and the legend. Defaults to `dataKey`. */
  label?: string;
  /** Which of the theme's roles it is drawn in. */
  color?: MirrorAreaChartColor;
  /** Draw it in the muted foreground colour instead, for a total that the coloured areas are parts of. */
  muted?: boolean;
  /** Opacity of the fill at the band's outer edge. */
  fillOpacity?: number;
  /** Opacity of the fill at the baseline. Defaults to `fillOpacity`, a flat fill. */
  gradientToOpacity?: number;
  /** Draw the line along the band's outer edge. */
  showLine?: boolean;
  /** Thickness of that line. */
  strokeWidth?: number;
}

/**
 * One band, growing away from the baseline on its side. Areas on one side overlay
 * in declaration order, so a whole declared first is drawn behind a part of it
 * declared second.
 */
function MirrorAreaChartArea({
  dataKey,
  side = 'top',
  label,
  color = 'chart-1',
  muted = false,
  fillOpacity,
  gradientToOpacity,
  showLine = true,
  strokeWidth = 1.5,
}: MirrorAreaChartAreaProps) {
  const { setSeries, removeSeries } = useChart('MirrorAreaChart.Area');
  const stroke = COLOR_VAR[muted ? 'muted-foreground' : color];
  const outer = fillOpacity ?? (muted ? 0.22 : 0.3);
  const inner = gradientToOpacity ?? outer;
  const name = label ?? dataKey;
  useEffect(() => {
    setSeries({ key: dataKey, label: name, side, stroke, outer, inner, showLine, strokeWidth });
  }, [dataKey, name, side, stroke, outer, inner, showLine, strokeWidth, setSeries]);
  // Apart from the update above, so a new colour keeps the band's place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
MirrorAreaChartArea.displayName = 'MirrorAreaChart.Area';

export interface MirrorAreaChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  /** Which of the theme's roles the band is drawn in, under the highlight. Defaults to the muted colour. */
  color?: MirrorAreaChartColor;
}

/**
 * The loading state: a low band either side of the baseline with a highlight
 * travelling across it. It is a translated child inside the band's clip, so the
 * loop runs on the compositor and repaints nothing.
 */
function MirrorAreaChartSkeleton({
  duration = 1400,
  color,
}: MirrorAreaChartSkeletonProps) {
  const { setSlot } = useChart('MirrorAreaChart.Skeleton');
  const base = color && COLOR_VAR[color];
  useEffect(() => {
    setSlot('skeleton', { duration, base });
    return () => setSlot('skeleton', undefined);
  }, [duration, base, setSlot]);
  return null;
}
MirrorAreaChartSkeleton.displayName = 'MirrorAreaChart.Skeleton';

export interface MirrorAreaChartXAxisProps {
  /** How many labels to show, evenly spaced with both ends kept. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: MirrorAreaChartDatum, index: number) => string;
}

/** The x labels, each on its own point. */
function MirrorAreaChartXAxis({
  ticks = 4,
  format,
}: MirrorAreaChartXAxisProps) {
  const { setSlot } = useChart('MirrorAreaChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
MirrorAreaChartXAxis.displayName = 'MirrorAreaChart.XAxis';

export interface MirrorAreaChartYAxisProps {
  /** Format a value in the top half. */
  formatTop?: (value: number) => string;
  /** Format a value in the bottom half. */
  formatBottom?: (value: number) => string;
}

/** Three labels down the side: the top half's maximum, zero on the baseline, and the bottom half's maximum. */
function MirrorAreaChartYAxis({
  formatTop,
  formatBottom,
}: MirrorAreaChartYAxisProps) {
  const { setSlot } = useChart('MirrorAreaChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { formatTop, formatBottom });
    return () => setSlot('yAxis', undefined);
  }, [formatTop, formatBottom, setSlot]);
  return null;
}
MirrorAreaChartYAxis.displayName = 'MirrorAreaChart.YAxis';

export interface MirrorAreaChartTooltipProps {
  /** The crosshair's and the dot's colour, as one of the theme's roles. */
  color?: MirrorAreaChartColor;
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: MirrorAreaChartDatum) => string;
  /** One line to show instead of a row per series. Use it when the series only make sense read together. */
  formatSummary?: (datum: MirrorAreaChartDatum) => string;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * A dashed crosshair, a dot on the outer edge of the top half, and a readout beside
 * them, driven by hovering, pressing or dragging across the plot, or the arrow keys.
 * A click or a tap pins the reading until the next press elsewhere or Escape.
 */
function MirrorAreaChartTooltip({
  color = 'foreground',
  formatValue,
  formatX,
  formatSummary,
  className,
}: MirrorAreaChartTooltipProps) {
  const { setSlot } = useChart('MirrorAreaChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, formatSummary });
  const stroke = COLOR_VAR[color];
  useEffect(() => {
    setSlot('tooltip', { stroke, className, latest });
    return () => setSlot('tooltip', undefined);
  }, [stroke, className, latest, setSlot]);
  return null;
}
MirrorAreaChartTooltip.displayName = 'MirrorAreaChart.Tooltip';

/** A swatch and a name per area, top half first. */
function seriesKey(series: readonly SeriesEntry[], slots: ReturnType<typeof mirrorAreaChartVariants>) {
  return sidesInOrder(series).map(({ key, label, stroke }) => (
    <span key={key} className={slots.legendItem()}>
      <span className={slots.legendSwatch()} style={{ background: stroke }} />
      {label}
    </span>
  ));
}

export type MirrorAreaChartLegendProps = ComponentProps<'div'>;

/** A swatch and a name per area, over the top corner of the plot. On a chart with a header, use its `legend` prop. */
function MirrorAreaChartLegend({
  className,
  render,
  ...props
}: MirrorAreaChartLegendProps & RenderProp<'div'>) {
  const { series } = useChart('MirrorAreaChart.Legend');
  const slots = mirrorAreaChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'mirror-area-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: seriesKey(series, slots),
      },
      props
    ),
  });

  return series.length ? element : null;
}
MirrorAreaChartLegend.displayName = 'MirrorAreaChart.Legend';

export interface MirrorAreaChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a total. */
  caption?: ReactNode;
  /** Draw a swatch and a name per area along the trailing edge. */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot. The value is not derived here: pass the formatted
 * string, from `onActiveIndexChange` if it follows the pointer.
 */
function MirrorAreaChartHeader({
  title,
  value,
  caption,
  legend = false,
  className,
  children,
  render,
  ...props
}: MirrorAreaChartHeaderProps & RenderProp<'div'>) {
  const { series } = useChart('MirrorAreaChart.Header');
  const slots = mirrorAreaChartVariants();
  const trailing = children ?? (legend && series.length ? seriesKey(series, slots) : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'mirror-area-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value ? <div className={slots.headerValue()}>{value}</div> : null}
              {caption ? <div className={slots.headerMuted()}>{caption}</div> : null}
            </div>
            {trailing ? <div className={slots.headerTrailing()}>{trailing}</div> : null}
          </>
        ),
      },
      props
    ),
  });
}
MirrorAreaChartHeader.displayName = 'MirrorAreaChart.Header';

export const MirrorAreaChart = Object.assign(MirrorAreaChartRoot, {
  Header: MirrorAreaChartHeader,
  Grid: MirrorAreaChartGrid,
  Area: MirrorAreaChartArea,
  Baseline: MirrorAreaChartBaseline,
  Skeleton: MirrorAreaChartSkeleton,
  XAxis: MirrorAreaChartXAxis,
  YAxis: MirrorAreaChartYAxis,
  Tooltip: MirrorAreaChartTooltip,
  Legend: MirrorAreaChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  MirrorAreaChartHeader,
  MirrorAreaChartGrid,
  MirrorAreaChartArea,
  MirrorAreaChartBaseline,
  MirrorAreaChartSkeleton,
  MirrorAreaChartXAxis,
  MirrorAreaChartYAxis,
  MirrorAreaChartTooltip,
  MirrorAreaChartLegend,
};
