'use client';

/**
 * AreaChart — filled bands over time, stacked or overlaid.
 *
 * ```tsx
 * <AreaChart data={traffic} xDataKey="hour" stacked>
 *   <AreaChart.Grid />
 *   <AreaChart.Area dataKey="direct" />
 *   <AreaChart.Area dataKey="search" color="chart-2" />
 *   <AreaChart.XAxis />
 *   <AreaChart.Tooltip />
 * </AreaChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's AreaChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a point is read by hovering, tapping or
 * dragging, a click pins the reading, and the arrow keys walk the points.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Area`, the axes and `Tooltip` draw nothing themselves. Each one tells
 * the root what it wants, and the root builds one chart definition from them.
 * They are found by context and not by inspecting children, so a part can be
 * wrapped in a component of your own. It also means the chart draws in the
 * browser, in a box its `aspectRatio` has reserved.
 *
 * ## The stack is worked out here
 *
 * The chart's stack layout belongs to the area mark and the line mark has none,
 * so the edge along a band's top would have to repeat it. Each row therefore
 * carries the band's bottom and top already added up, and the area and its edge
 * are both drawn from those. It also means a stack's order is simply the order
 * the `Area` parts were declared in, bottom first.
 *
 * A gap in one series leaves a gap in its own band and counts as zero for the
 * bands above it.
 */
import { areaY, d3Curve, defineChart, dot, lineY, type ChartInteractionController, type ChartMotionContext, type ChartPoint, type SceneNode } from '@tanstack/charts';
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

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type AreaChartStatus = 'loading' | 'ready';
export type AreaChartCurve = 'monotone' | 'linear';
export type AreaChartDatum = Record<string, string | number | null | undefined>;

/** Which of the theme's roles a series is drawn in. */
export type AreaChartColor =
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';

const COLOR_VAR: Record<AreaChartColor, string> = {
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
};

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const CURVES = { monotone: d3Curve(curveMonotoneX), linear: d3Curve(curveLinear) };

const areaChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    sweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
    sweep:
      'absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--chart-1)_55%,transparent),transparent)] motion-reduce:hidden',
    legend:
      'pointer-events-none absolute right-2 top-1 col-start-1 row-start-2 flex gap-3 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** The value-axis gutter held while loading, when there are no labels to size it from. */
const LOADING_GUTTER = 44;

/** How much of the value axis the placeholder band takes. */
const SKELETON_BAND = 0.18;

const SKELETON_MARK = 'area-chart-skeleton';

const KEYFRAMES = '@keyframes panelui-area-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One point of one band: what it reads, and where its band sits there. `value` is null across a gap. */
interface BandRow {
  index: number;
  series: string;
  value: number | null;
  bottom: number;
  top: number | null;
}

interface SeriesEntry {
  key: string;
  stroke: string;
  fillOpacity: number | undefined;
  gradientToOpacity: number;
  showLine: boolean;
  strokeWidth: number;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new one redraws it.
 * The readout's are read through `latest` when it opens, so a new one costs nothing.
 */
interface Slots {
  grid?: { rows: number; dashArray: string; opacity: number };
  xAxis?: Pick<AreaChartXAxisProps, 'ticks' | 'format'>;
  yAxis?: { ticks: number; format: AreaChartYAxisProps['format'] };
  tooltip?: { className: string | undefined; latest: { current: Pick<AreaChartTooltipProps, 'formatValue' | 'formatX' | 'labels'> } };
  skeleton?: { duration: number };
}

interface AreaChartContextValue {
  data: readonly AreaChartDatum[];
  xDataKey: string;
  stacked: boolean;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const AreaChartContext = createContext<AreaChartContextValue | null>(null);

function useChart(component: string): AreaChartContextValue {
  const context = useContext(AreaChartContext);
  if (!context) {
    throw new Error(`${component} must be used within an <AreaChart>`);
  }
  return context;
}

/**
 * The point being read, for something rendered inside the chart. A readout
 * outside it takes `onActiveIndexChange` instead.
 */
export function useAreaChart() {
  const { data, activeIndex, xDataKey } = useChart('useAreaChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
  };
}

/** Sits each band on the running total of the ones declared before it, or on zero when overlaid. */
function bandRows(data: readonly AreaChartDatum[], series: readonly SeriesEntry[], stacked: boolean): BandRow[] {
  return series.flatMap(({ key }, seriesIndex) =>
    data.map((datum, index) => {
      const read = datum[key];
      const value = typeof read === 'number' && !Number.isNaN(read) ? read : null;
      const bottom = stacked
        ? series.slice(0, seriesIndex).reduce((sum, below) => {
            const under = datum[below.key];
            return typeof under === 'number' && !Number.isNaN(under) ? sum + under : sum;
          }, 0)
        : 0;
      return { index, series: key, value, bottom, top: value === null ? null : bottom + value };
    })
  );
}

/** The placeholder band's outline from the drawn scene, for the sweep to be clipped to. */
function skeletonOutline(nodes: readonly SceneNode[], x = 0, y = 0, inside = false): string {
  return nodes
    .map((node) => {
      const within = inside || node.key.includes(SKELETON_MARK);
      if (node.kind === 'group') {
        return skeletonOutline(node.children, x + (node.translateX ?? 0), y + (node.translateY ?? 0), within);
      }
      if (node.kind !== 'area' || !within) return '';
      return `M${node.points.map(([left, top]) => `${left + x},${top + y}`).join('L')}Z`;
    })
    .join('');
}

export interface AreaChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a point along the x-axis. */
  data: readonly AreaChartDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bands back and grows them in when it turns `ready`. Add
   * an `AreaChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: AreaChartStatus;
  /** The plot's width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the bands to grow in. */
  animationDuration?: number;
  /** Milliseconds for the bands and the axis to settle after the data changes. */
  domainDuration?: number;
  /** Fix the value axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /**
   * Sit each band on the running total of the ones below it, so the top edge is
   * the whole and each thickness is a share. The first `Area` is the bottom of
   * the stack. Without it the bands overlay and their fills are translucent.
   */
  stacked?: boolean;
  /** `monotone` never overshoots between points. `linear` joins them straight. */
  curve?: AreaChartCurve;
  /**
   * The point being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: AreaChartDatum | null) => void;
  /** Drop the axis padding so the bands reach the edges, for a sparkline. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: AreaChartDatum, index: number) => string;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface AreaChartHandle {
  replay: () => void;
}

const AreaChartRoot = forwardRef<AreaChartHandle, AreaChartProps & RenderProp<'div'>>(function AreaChartRoot(
  {
    data,
    xDataKey = 'date',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    stacked = false,
    curve = 'monotone',
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
  const slotClasses = areaChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesState] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [outline, setOutline] = useState('');
  const interactionRef = useRef<ChartInteractionController<BandRow, number, number> | null>(null);
  const dragging = useRef(false);

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

  const setSeries = useCallback(
    (entry: SeriesEntry) =>
      setSeriesState((current) =>
        current.some(({ key }) => key === entry.key)
          ? current.map((existing) => (existing.key === entry.key ? entry : existing))
          : [...current, entry]
      ),
    []
  );
  const removeSeries = useCallback(
    (key: string) => setSeriesState((current) => current.filter((entry) => entry.key !== key)),
    []
  );
  const setSlot = useCallback<AreaChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const { grid, xAxis, yAxis, tooltip, skeleton } = slots;

  const definition = useMemo(() => {
    const rows = bandRows(data, series, stacked);
    const bySeries = new Map(series.map((entry) => [entry.key, entry]));
    const gradientId = (key: string) => `panelui-area-${series.findIndex((entry) => entry.key === key)}`;
    const curveFactory = CURVES[curve];
    const span = Math.max(1, data.length - 1);

    const area = areaY(rows, {
      id: 'area-chart-bands',
      x: 'index',
      y1: 'bottom',
      y2: 'top',
      z: 'series',
      key: 'index',
      fill: (row: BandRow) => `url(#${gradientId(row.series)})`,
      fillOpacity: 1,
      curve: curveFactory,
    });
    // One mark per series, because a mark has one stroke width.
    const edges = series
      .filter(({ showLine }) => showLine)
      .map(({ key, stroke, strokeWidth }) =>
        decorative(
          lineY(
            rows.filter((row) => row.series === key),
            {
              id: `area-chart-edge-${key}`,
              x: 'index',
              y: 'top',
              key: 'index',
              stroke,
              strokeWidth,
              lineCap: 'round',
              lineJoin: 'round',
              curve: curveFactory,
            }
          )
        )
      );
    // A dot on every band's top edge, for the point being read.
    const dots = series.map(({ key, stroke }) =>
      whenFocused(
        dot(
          rows.filter((row) => row.series === key && row.top !== null),
          {
            id: `area-chart-dot-${key}`,
            x: 'index',
            y: 'top',
            key: 'index',
            r: 4.5,
            fill: stroke,
            stroke: 'var(--card)',
            strokeWidth: 2,
          }
        ),
        { match: 'x' }
      )
    );
    const guide = crosshair<number, number>({ x: { stroke: 'var(--muted-foreground)', strokeOpacity: 0.6 }, y: false });

    const showBand = loading && skeleton !== undefined;
    const placeholderRows: BandRow[] = showBand
      ? [0, span].map((index) => ({ index, series: '', value: SKELETON_BAND, bottom: 0, top: SKELETON_BAND }))
      : [];
    const placeholder = areaY(placeholderRows, {
      id: SKELETON_MARK,
      x: 'index',
      y: 'top',
      key: 'index',
      fill: 'var(--muted)',
      fillOpacity: 1,
      motion: false,
    });

    const labelOf = (index: number) => {
      const datum = data[index];
      return datum ? String(datum[xDataKey] ?? '') : '';
    };
    const pointLabel = (index: number) => {
      const datum = data[index];
      const format = xAxis?.format;
      return datum && format ? format(datum, index) : labelOf(index);
    };

    // Evenly spaced with both ends kept, so the last row always has its label.
    const indexes = data.map((_row, index) => index);
    const tickValues =
      xAxis?.ticks && xAxis.ticks >= 2 && xAxis.ticks < data.length
        ? Array.from({ length: xAxis.ticks }, (_unused, tick) => Math.round((tick * span) / (xAxis.ticks! - 1)))
        : indexes;
    const xOptions = {
      scale: scaleLinear([0, span], [0, 1]),
      axis: xAxis
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: { size: 0, format: pointLabel, values: tickValues },
          }
        : (false as const),
    };

    const valueTicks = yAxis?.ticks ?? grid?.rows;
    const valueFormat = (value: number) => {
      if (loading) return '';
      const format = yAxis?.format;
      return format ? format(value) : compactNumber(value);
    };
    const yOptions = {
      // While loading the band needs a scale of its own: its height is a share
      // of the axis, and there may be no values yet to derive one from.
      scale: loading ? scaleLinear([0, 1], [0, 1]) : yDomain ? scaleLinear(yDomain, [0, 1]) : scaleLinear,
      nice: !loading && !yDomain,
      grid: grid ? { stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray } : false,
      axis: yAxis
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: { size: 0, format: valueFormat, ...(valueTicks ? { count: valueTicks } : {}) },
          }
        : (false as const),
    };

    const drawn = rows.some(({ value }) => value !== null);
    const interactive = tooltip !== undefined && !loading && drawn;
    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          // Beside the crosshair and along the top, clear of the dots it is reading.
          anchor: { x: 'value', y: 'plot-top' } as const,
          placement: ['bottom-right', 'bottom-left'] as const,
          offset: 12,
          content(points: readonly ChartPoint<BandRow, number, number>[]) {
            const { formatValue, formatX, labels } = tooltip.latest.current;
            const first = points[0]?.datum;
            const datum = first ? data[first.index] : undefined;
            const order = series.map(({ key }) => key);
            const listed = [...points].sort(
              (a, b) => order.indexOf(a.datum.series) - order.indexOf(b.datum.series)
            );
            if (stacked) listed.reverse();
            return {
              title: datum ? (formatX ? formatX(datum) : labelOf(first!.index)) : '',
              rows: listed.map(({ datum: row }) => ({
                label: labels?.[row.series] ?? row.series,
                value: formatValue ? formatValue(row.value ?? 0, row.series) : compactNumber(row.value ?? 0),
                color: bySeries.get(row.series)?.stroke,
              })),
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      // Bottom of the stack first, and a later band over an earlier one.
      marks: loading ? [placeholder] : [area, ...edges, ...(interactive ? [guide, ...dots] : [])],
      scales: { x: xOptions, y: yOptions },
      gradients: series.map((entry) => ({
        id: gradientId(entry.key),
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          // Stacked bands touch and carry more weight. Overlaid ones have to show each other through.
          { offset: 0, color: entry.stroke, opacity: entry.fillOpacity ?? (stacked ? 0.6 : 0.35) },
          { offset: 1, color: entry.stroke, opacity: entry.gradientToOpacity },
        ],
      })),
      ...(compact ? { guides: false as const, margin: 0 } : {}),
      ...(loading && yAxis ? { margin: { left: LOADING_GUTTER } } : {}),
      focusRing: false,
      // Only the bands arrive, so a replay does not also fade the axis and grid in again.
      motion: (context: ChartMotionContext<BandRow>) => {
        if (context.phase !== 'enter') {
          return { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } };
        }
        if (context.role !== 'area' && context.role !== 'line') return false as const;
        return { transition: { type: 'tween' as const, duration: animationDuration, easing: 'ease-out' as const } };
      },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive && readout
        ? {
            focus: 'group-x' as const,
            maxFocusDistance: Number.POSITIVE_INFINITY,
            tooltip: readout,
          }
        : {}),
    });
  }, [
    data,
    xDataKey,
    series,
    loading,
    stacked,
    curve,
    yDomain?.[0],
    yDomain?.[1],
    compact,
    animationDuration,
    domainDuration,
    grid,
    xAxis,
    yAxis,
    tooltip,
    skeleton,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Area chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<AreaChartContextValue>(
    () => ({ data, xDataKey, stacked, series, setSeries, removeSeries, setSlot, activeIndex }),
    [data, xDataKey, stacked, series, setSeries, removeSeries, setSlot, activeIndex]
  );

  const spokenRow = (datum: AreaChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [xDataKey, ...series.map(({ key }) => key)]
      .filter((key) => datum[key] !== null && datum[key] !== undefined)
      .map((key) => `${key}, ${datum[key]}`)
      .join('. ');

  // The chart also reports a point again when the data is rebuilt under it. Only a
  // change of point is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<BandRow, number, number> | null) =>
    reportActive(point ? point.datum.index : -1);

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

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'area-chart',
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
              data-slot="area-chart-plot"
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
                  // An entrance only grows from the baseline on a chart's first paint,
                  // so the bands arriving after a load, or a replay, are a new chart.
                  key={`${revision}:${status}`}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ scene, interaction }) => {
                    interactionRef.current = interaction;
                    setOutline(skeletonOutline(scene.nodes));
                  }}
                />
              ) : null}
              {loading && skeleton && outline ? (
                <div
                  data-slot="area-chart-skeleton"
                  aria-hidden
                  className={slotClasses.sweepClip()}
                  style={{ clipPath: `path('${outline}')` }}
                >
                  <style>{KEYFRAMES}</style>
                  <div
                    className={slotClasses.sweep()}
                    style={{ animation: `panelui-area-sweep ${skeleton.duration}ms linear infinite` }}
                  />
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

  return <AreaChartContext.Provider value={context}>{element}</AreaChartContext.Provider>;
});
AreaChartRoot.displayName = 'AreaChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface AreaChartGridProps {
  /** Roughly how many lines to draw across the value axis. */
  rows?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Lines across the value axis, so a band can be read against a number. */
function AreaChartGrid({ rows = 4, dashArray = '4 6', opacity = 1 }: AreaChartGridProps) {
  const { setSlot } = useChart('AreaChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, opacity, setSlot]);
  return null;
}
AreaChartGrid.displayName = 'AreaChart.Grid';

export interface AreaChartAreaProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Which of the theme's roles the series is drawn in. */
  color?: AreaChartColor;
  /**
   * Opacity of the fill at the top of the band. Defaults to `0.6` stacked and
   * `0.35` overlaid, so overlaid bands show each other through.
   */
  fillOpacity?: number;
  /** Opacity at the bottom. `0` fades the band out; match `fillOpacity` for a flat fill. */
  gradientToOpacity?: number;
  /** Draw the line along the top edge of the band. */
  showLine?: boolean;
  /** Thickness of that line. */
  strokeWidth?: number;
}

/**
 * One filled band with a line along its top edge. The fill fades downward,
 * because a flat fill of any weight competes with the line, and the top edge is
 * the part carrying the numbers. The first one declared is the bottom of a stack.
 */
function AreaChartArea({
  dataKey,
  color = 'chart-1',
  fillOpacity,
  gradientToOpacity = 0,
  showLine = true,
  strokeWidth = 2,
}: AreaChartAreaProps) {
  const { setSeries, removeSeries } = useChart('AreaChart.Area');
  const stroke = COLOR_VAR[color];
  useEffect(() => {
    setSeries({ key: dataKey, stroke, fillOpacity, gradientToOpacity, showLine, strokeWidth });
  }, [dataKey, stroke, fillOpacity, gradientToOpacity, showLine, strokeWidth, setSeries]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
AreaChartArea.displayName = 'AreaChart.Area';

export interface AreaChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The loading state: a low band along the baseline with a highlight travelling
 * across it.
 *
 * The highlight is a child translated inside a clip of the band's outline, so
 * the loop runs on the compositor and repaints nothing.
 */
function AreaChartSkeleton({ duration = 1400 }: AreaChartSkeletonProps) {
  const { setSlot } = useChart('AreaChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { duration });
    return () => setSlot('skeleton', undefined);
  }, [duration, setSlot]);
  return null;
}
AreaChartSkeleton.displayName = 'AreaChart.Skeleton';

export interface AreaChartXAxisProps {
  /**
   * How many labels to show, evenly spaced with both ends kept. Every row by
   * default, thinned only when they get too close to read.
   */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: AreaChartDatum, index: number) => string;
}

/** The x labels, each placed on its own point. */
function AreaChartXAxis({ ticks, format }: AreaChartXAxisProps) {
  const { setSlot } = useChart('AreaChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
AreaChartXAxis.displayName = 'AreaChart.XAxis';

export interface AreaChartYAxisProps {
  /** Roughly how many labels to show along the value axis. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Value labels down the side, with room made for them. */
function AreaChartYAxis({ ticks = 4, format }: AreaChartYAxisProps) {
  const { setSlot } = useChart('AreaChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
AreaChartYAxis.displayName = 'AreaChart.YAxis';

export interface AreaChartTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: AreaChartDatum) => string;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering the plot, pressing or dragging across
 * it, or the arrow keys. It brings the crosshair and a dot on every band's top
 * edge. A click or a tap pins the reading until the next press elsewhere or
 * Escape.
 */
function AreaChartTooltip({ formatValue, formatX, labels, className }: AreaChartTooltipProps) {
  const { setSlot } = useChart('AreaChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, labels });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
AreaChartTooltip.displayName = 'AreaChart.Tooltip';

export interface AreaChartLegendProps extends ComponentProps<'div'> {
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/** A swatch and a name per series. Reversed for a stack, so it reads in the order the bands appear. */
function AreaChartLegend({ labels, className, render, ...props }: AreaChartLegendProps & RenderProp<'div'>) {
  const { series, stacked } = useChart('AreaChart.Legend');
  const listed = stacked ? [...series].reverse() : series;
  const slots = areaChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'area-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: listed.map(({ key, stroke }) => (
          <span key={key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: stroke }} />
            {labels?.[key] ?? key}
          </span>
        )),
      },
      props
    ),
  });

  return series.length ? element : null;
}
AreaChartLegend.displayName = 'AreaChart.Legend';

export interface AreaChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a total. */
  caption?: ReactNode;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /**
   * Draw a swatch and a name per series along the trailing edge. Prefer this to
   * `AreaChart.Legend` on a chart that has a header: the legend sits over the
   * plot, in the corner the bands also want.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it reads and what the
 * colours mean. The value is not derived here. A readout that follows the
 * pointer takes it from `onActiveIndexChange` and passes the string down, so one
 * header can show a total at rest and a point's value while one is read.
 */
function AreaChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: AreaChartHeaderProps & RenderProp<'div'>) {
  const { series, stacked } = useChart('AreaChart.Header');
  const listed = stacked ? [...series].reverse() : series;
  const slots = areaChartVariants();
  const trailing =
    children ??
    (legend && series.length
      ? listed.map(({ key, stroke }) => (
          <span key={key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: stroke }} />
            {labels?.[key] ?? key}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'area-chart-header',
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
AreaChartHeader.displayName = 'AreaChart.Header';

export const AreaChart = Object.assign(AreaChartRoot, {
  Header: AreaChartHeader,
  Grid: AreaChartGrid,
  Area: AreaChartArea,
  Skeleton: AreaChartSkeleton,
  XAxis: AreaChartXAxis,
  YAxis: AreaChartYAxis,
  Tooltip: AreaChartTooltip,
  Legend: AreaChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  AreaChartHeader,
  AreaChartGrid,
  AreaChartArea,
  AreaChartSkeleton,
  AreaChartXAxis,
  AreaChartYAxis,
  AreaChartTooltip,
  AreaChartLegend,
};
