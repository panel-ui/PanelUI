'use client';

/**
 * BarChart — categories compared by length, grouped or stacked.
 *
 * ```tsx
 * <BarChart data={revenue} xDataKey="month">
 *   <BarChart.Grid />
 *   <BarChart.Bar dataKey="revenue" />
 *   <BarChart.XAxis />
 *   <BarChart.Tooltip />
 * </BarChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's BarChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a band is read by hovering, tapping or
 * dragging, a click pins the reading, and the arrow keys walk the bands.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Bar`, the axes and `Tooltip` draw nothing themselves. Each one tells
 * the root what it wants, and the root builds one chart definition from them.
 * They are found by context and not by inspecting children, so a part can be
 * wrapped in a component of your own. It also means the chart draws in the
 * browser, in a box its `aspectRatio` has reserved.
 *
 * ## The baseline is zero
 *
 * A bar is read by its length, so a bar cropped at the bottom misreports its
 * value: twice as tall stops meaning twice as much. The derived domain always
 * reaches zero. `yDomain` can say otherwise, for a chart that accepts that.
 *
 * ## Rows become one row per bar
 *
 * The data arrives as one row per category with a column per series. The marks
 * want one row per bar, carrying its category's index rather than its name, so
 * two bands can share a label.
 */
import {
  barX,
  barY,
  defineChart,
  group,
  stack,
  type ChartInteractionController,
  type ChartMotionContext,
  type ChartMark,
  type ChartPoint,
  type SceneNode,
} from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleBand } from '@tanstack/charts/scales/band';
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

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type BarChartStatus = 'loading' | 'ready';
export type BarChartOrientation = 'vertical' | 'horizontal';
export type BarChartDatum = Record<string, string | number | null | undefined>;

/** Which of the theme's roles a series is drawn in. */
export type BarChartColor =
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

const COLOR_VAR: Record<BarChartColor, string> = {
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

const barChartVariants = tv({
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

/** How much of the value axis a placeholder bar takes. */
const SKELETON_LENGTH = 0.22;

/** Bands to draw when there is no data yet to count them from. */
const SKELETON_BARS = 7;

const SKELETON_MARK = 'bar-chart-skeleton';

/** How much of the entrance goes to staggering the bands. */
const STAGGER_SHARE = 0.45;

const KEYFRAMES = '@keyframes panelui-bar-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One bar: a value of one series in one band. */
interface BarRow {
  index: number;
  series: string;
  value: number;
}

interface SeriesEntry {
  key: string;
  fill: string;
  radius: number | undefined;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new one redraws it.
 * The readout's are read through `latest` when it opens, so a new one costs nothing.
 */
interface Slots {
  grid?: { rows: number; dashArray: string; opacity: number };
  xAxis?: Pick<BarChartXAxisProps, 'ticks' | 'format'>;
  yAxis?: { ticks: number; format: BarChartYAxisProps['format'] };
  tooltip?: { className: string | undefined; latest: { current: Pick<BarChartTooltipProps, 'formatValue' | 'formatX' | 'labels'> } };
  skeleton?: { bars: number | undefined; duration: number };
}

interface BarChartContextValue {
  data: readonly BarChartDatum[];
  xDataKey: string;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const BarChartContext = createContext<BarChartContextValue | null>(null);

function useChart(component: string): BarChartContextValue {
  const context = useContext(BarChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BarChart>`);
  }
  return context;
}

/**
 * The band being read, for something rendered inside the chart. A readout
 * outside it takes `onActiveIndexChange` instead.
 */
export function useBarChart() {
  const { data, activeIndex, xDataKey } = useChart('useBarChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
  };
}

type BarMark = ChartMark<BarRow, number, number, number, number>;

/**
 * Applies the two lengths the marks have no option for, in pixels, once the
 * scales have placed each bar: the gap at the tip of a stacked segment, and the
 * floor under a value too small to see.
 */
function withBarLengths<TMark extends BarMark>(
  mark: TMark,
  { gap, floor, horizontal }: { gap: number; floor: number; horizontal: boolean }
): TMark {
  const adjust = (node: SceneNode): SceneNode => {
    if (node.kind === 'group') return { ...node, children: node.children.map(adjust) };
    if (node.kind !== 'rect' || !node.interaction?.point) return node;
    const { value } = node.interaction.point.datum as BarRow;
    if (value === 0) return node;
    const length = horizontal ? node.width : node.height;
    const next = Math.max(length - gap, floor);
    // The tip is what moves: up or right for a positive value, the other way for a negative one.
    const tipAtStart = horizontal ? value < 0 : value > 0;
    return horizontal
      ? { ...node, width: next, x: tipAtStart ? node.x + length - next : node.x }
      : { ...node, height: next, y: tipAtStart ? node.y + length - next : node.y };
  };

  return {
    ...mark,
    initialize(context) {
      const initialized = mark.initialize(context);
      return {
        ...initialized,
        postDomain(scene) {
          const base = initialized.postDomain ? initialized.postDomain(scene) : scene;
          return { ...base, nodes: base.nodes.map(adjust) };
        },
      };
    },
  };
}

/** The stubs' outlines from the drawn scene, for the sweep to be clipped to. */
function stubOutlines(nodes: readonly SceneNode[], x = 0, y = 0, inside = false): string {
  return nodes
    .map((node) => {
      if (node.kind === 'group') {
        return stubOutlines(
          node.children,
          x + (node.translateX ?? 0),
          y + (node.translateY ?? 0),
          inside || node.key.includes(SKELETON_MARK)
        );
      }
      if (node.kind !== 'rect' || !(inside || node.key.includes(SKELETON_MARK))) return '';
      const left = node.x + x;
      const top = node.y + y;
      return `M${left},${top}h${node.width}v${node.height}h${-node.width}Z`;
    })
    .join('');
}

export interface BarChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a band along the category axis. */
  data: readonly BarChartDatum[];
  /** Key holding the category label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bars back and grows them in when it turns `ready`. Add
   * a `BarChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: BarChartStatus;
  /** The plot's width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow in. */
  animationDuration?: number;
  /** Milliseconds for the bars and the axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the value axis instead of deriving it. The derived domain always
   * includes zero, and bar lengths cannot be compared on a domain that does
   * not.
   */
  yDomain?: [number, number];
  /** `vertical` grows the bars upward; `horizontal` grows them rightward. */
  orientation?: BarChartOrientation;
  /** Stack the series on each other instead of standing them side by side. */
  stacked?: boolean;
  /** Fraction of each band left empty, `0` to `1`. */
  barGap?: number;
  /** Largest bar thickness in pixels. Derived from the band when omitted. */
  barWidth?: number;
  /** Pixels between the segments of a stack. */
  stackGap?: number;
  /** Corner radius on the growing end of a bar. */
  cornerRadius?: number;
  /** Smallest length a non-zero bar is drawn at, in pixels. */
  minBarLength?: number;
  /** Opacity of the bars that are not being read. */
  fadedOpacity?: number;
  /**
   * The band being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: BarChartDatum | null) => void;
  /** Drop the axis padding, for a bar sparkline with no axis or readout. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: BarChartDatum, index: number) => string;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface BarChartHandle {
  replay: () => void;
}

const BarChartRoot = forwardRef<BarChartHandle, BarChartProps & RenderProp<'div'>>(function BarChartRoot(
  {
    data,
    xDataKey = 'name',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    orientation = 'vertical',
    stacked = false,
    barGap = 0.2,
    barWidth,
    stackGap = 0,
    cornerRadius = 4,
    minBarLength = 0,
    fadedOpacity = 0.3,
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
  const slotClasses = barChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesState] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [stubs, setStubs] = useState('');
  const interactionRef = useRef<ChartInteractionController<BarRow, number, number> | null>(null)
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
  const setSlot = useCallback<BarChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const horizontal = orientation === 'horizontal';
  const { grid, xAxis, yAxis, tooltip, skeleton } = slots;

  const definition = useMemo(() => {
    const keys = series.map(({ key }) => key);
    const bySeries = new Map(series.map((entry) => [entry.key, entry]));
    const rows: BarRow[] = data.flatMap((datum, index) =>
      series.flatMap(({ key }) => {
        const value = datum[key];
        return typeof value === 'number' && !Number.isNaN(value) ? [{ index, series: key, value }] : [];
      })
    );

    const showStubs = loading && skeleton !== undefined;
    const bands = loading ? Math.max(1, skeleton?.bars ?? (data.length || SKELETON_BARS)) : data.length;
    const indexes = Array.from({ length: bands }, (_unused, index) => index);
    const stubRows: BarRow[] = showStubs ? indexes.map((index) => ({ index, series: '', value: SKELETON_LENGTH })) : [];

    const shared = {
      key: (row: BarRow) => `${row.index}:${row.series}`,
      z: (row: BarRow) => row.series,
      fill: (row: BarRow) => bySeries.get(row.series)?.fill ?? COLOR_VAR['chart-1'],
      radius: {
        end: (row: BarRow) => bySeries.get(row.series)?.radius ?? cornerRadius,
        stack: 'each' as const,
      },
      layout: stacked ? stack({ order: keys }) : group({ padding: 0, scale: scaleBand(keys, [0, 1]) }),
      maxThickness: barWidth,
      states: [
        {
          when: { focus: 'unmatched' as const },
          style: { fillOpacity: fadedOpacity },
          transition: { type: 'tween' as const, duration: 120, easing: 'ease-out' as const },
        },
      ],
    };
    const bars = horizontal
      ? barX(rows, { ...shared, x: 'value', y: 'index' })
      : barY(rows, { ...shared, x: 'index', y: 'value' });
    const shaped =
      (stacked && stackGap > 0) || minBarLength > 0
        ? withBarLengths(bars, { gap: stacked ? stackGap : 0, floor: minBarLength, horizontal })
        : bars;

    const stubShared = {
      id: SKELETON_MARK,
      key: 'index' as const,
      fill: 'var(--muted)',
      radius: { end: cornerRadius },
      maxThickness: barWidth,
      motion: false as const,
    };
    const stubMark = horizontal
      ? barX(stubRows, { ...stubShared, x: 'value', y: 'index' })
      : barY(stubRows, { ...stubShared, x: 'index', y: 'value' });

    const labelOf = (index: number) => {
      const datum = data[index];
      if (!datum) return '';
      return String(datum[xDataKey] ?? '');
    };
    const categoryLabel = (index: number) => {
      const datum = data[index];
      const format = xAxis?.format;
      return datum && format ? format(datum, index) : labelOf(index);
    };

    // A band owns a slice of the axis, with `barGap` of it left empty and split
    // evenly round the bar, so the end bands sit half a gap from the edge.
    const categoryScale = scaleBand(indexes, [0, 1]).paddingInner(barGap).paddingOuter(barGap / 2);
    const categoryStride = xAxis?.ticks ? Math.ceil(bands / Math.max(1, xAxis.ticks)) : 1;
    const categoryAxisShown = horizontal ? yAxis !== undefined : xAxis !== undefined;
    const categoryOptions = {
      scale: categoryScale,
      axis: categoryAxisShown
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: {
              size: 0,
              format: categoryLabel,
              ...(xAxis?.ticks && !horizontal
                ? { values: indexes.filter((index) => index % categoryStride === 0) }
                : {}),
            },
          }
        : (false as const),
    };

    const valueTicks = yAxis?.ticks ?? grid?.rows;
    const valueFormat = (value: number) => {
      if (loading) return '';
      const format = yAxis?.format;
      return format ? format(value) : compactNumber(value);
    };
    const valueAxisShown = !horizontal && yAxis !== undefined;
    const valueOptions = {
      // While loading the stubs need a scale of their own: their length is a
      // share of the axis, and there may be no values yet to derive one from.
      scale: loading
        ? scaleLinear([0, 1], [0, 1])
        : yDomain
          ? scaleLinear(yDomain, [0, 1])
          : scaleLinear,
      nice: !loading && !yDomain,
      grid: grid ? { stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray } : false,
      axis: valueAxisShown
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: { size: 0, format: valueFormat, ...(valueTicks ? { count: valueTicks } : {}) },
          }
        : horizontal && valueTicks
          ? ({ line: false as const, ticks: { size: 0, count: valueTicks, format: () => '' } })
          : (false as const),
    };

    const interactive = tooltip !== undefined && !loading && rows.length > 0;
    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          content(points: readonly ChartPoint<BarRow, number, number>[]) {
            const { formatValue, formatX, labels } = tooltip.latest.current;
            const first = points[0]?.datum;
            const datum = first ? data[first.index] : undefined;
            return {
              title: datum ? (formatX ? formatX(datum) : labelOf(first!.index)) : '',
              rows: points.map(({ datum: row, color }) => ({
                label: labels?.[row.series] ?? row.series,
                value: formatValue ? formatValue(row.value, row.series) : compactNumber(row.value),
                color,
              })),
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      marks: loading ? [stubMark] : [shaped],
      scales: horizontal ? { x: valueOptions, y: categoryOptions } : { x: categoryOptions, y: valueOptions },
      ...(compact ? { guides: false as const, margin: 0 } : {}),
      ...(loading && !horizontal && yAxis ? { margin: { left: LOADING_GUTTER } } : {}),
      focusRing: false,
      /*
       * Bars grow in one after another and all finish inside the one duration:
       * the window each gets is what is left after the last one's delay. Only the
       * bars arrive, so a replay does not also fade the axis and grid in again.
       */
      motion: (context: ChartMotionContext<BarRow>) => {
        if (context.phase !== 'enter') {
          return { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } };
        }
        if (context.role !== 'bar') return false as const;
        const band = context.datum?.index ?? 0;
        return {
          delay: bands > 1 ? (band / bands) * animationDuration * STAGGER_SHARE : 0,
          transition: {
            type: 'tween' as const,
            duration: animationDuration * (1 - (bands > 1 ? STAGGER_SHARE : 0)),
            easing: 'ease-out' as const,
          },
        };
      },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive && readout
        ? {
            focus: horizontal ? ('group-y' as const) : ('group-x' as const),
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
    horizontal,
    stacked,
    barGap,
    barWidth,
    stackGap,
    cornerRadius,
    minBarLength,
    fadedOpacity,
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

  const summary = label ?? `Bar chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<BarChartContextValue>(
    () => ({ data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex }),
    [data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex]
  );

  const spokenRow = (datum: BarChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [xDataKey, ...series.map(({ key }) => key)]
      .filter((key) => datum[key] !== null && datum[key] !== undefined)
      .map((key) => `${key}, ${datum[key]}`)
      .join('. ');

  // The chart also reports a band again when the data is rebuilt under it. Only a
  // change of band is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<BarRow, number, number> | null) =>
    reportActive(point ? point.datum.index : -1);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => reportActive(-1), [revision, status]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the bands it crosses, and the last one stays until
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
        'data-slot': 'bar-chart',
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
              data-slot="bar-chart-plot"
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
                  // so the bars arriving after a load, or a replay, are a new chart.
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
                    setStubs(stubOutlines(scene.nodes));
                  }}
                />
              ) : null}
              {loading && skeleton && stubs ? (
                <div
                  data-slot="bar-chart-skeleton"
                  aria-hidden
                  className={slotClasses.sweepClip()}
                  style={{ clipPath: `path('${stubs}')` }}
                >
                  <style>{KEYFRAMES}</style>
                  <div
                    className={slotClasses.sweep()}
                    style={{ animation: `panelui-bar-sweep ${skeleton.duration}ms linear infinite` }}
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

  return <BarChartContext.Provider value={context}>{element}</BarChartContext.Provider>;
});
BarChartRoot.displayName = 'BarChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface BarChartGridProps {
  /** Roughly how many lines to draw across the value axis. */
  rows?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Lines across the value axis, so a bar can be read against a number. */
function BarChartGrid({ rows = 4, dashArray = '4 6', opacity = 1 }: BarChartGridProps) {
  const { setSlot } = useChart('BarChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, opacity, setSlot]);
  return null;
}
BarChartGrid.displayName = 'BarChart.Grid';

export interface BarChartBarProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Which of the theme's roles the series is drawn in. */
  color?: BarChartColor;
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/** One series of bars. Their order is the order they stand in a band or stack. */
function BarChartBar({ dataKey, color = 'chart-1', cornerRadius }: BarChartBarProps) {
  const { setSeries, removeSeries } = useChart('BarChart.Bar');
  const fill = COLOR_VAR[color];
  useEffect(() => {
    setSeries({ key: dataKey, fill, radius: cornerRadius });
  }, [dataKey, fill, cornerRadius, setSeries]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
BarChartBar.displayName = 'BarChart.Bar';

export interface BarChartSkeletonProps {
  /**
   * How many placeholder bars to draw. Defaults to one per row, and to seven
   * when the data has not arrived.
   */
  bars?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The loading state: a row of short, equal stubs on the baseline, with a
 * highlight travelling across them. Equal, because stubs of differing heights
 * cannot be told from real data.
 *
 * The highlight is a child translated inside a clip of the stubs' outlines, so
 * the loop runs on the compositor and repaints nothing.
 */
function BarChartSkeleton({ bars, duration = 1400 }: BarChartSkeletonProps) {
  const { setSlot } = useChart('BarChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { bars, duration });
    return () => setSlot('skeleton', undefined);
  }, [bars, duration, setSlot]);
  return null;
}
BarChartSkeleton.displayName = 'BarChart.Skeleton';

export interface BarChartXAxisProps {
  /**
   * How many labels to show. Every category by default, thinned only when the
   * bands get too narrow to read. Pass a number to force it lower.
   */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: BarChartDatum, index: number) => string;
}

/** The category labels under the bands. Sideways, `YAxis` has them. */
function BarChartXAxis({ ticks, format }: BarChartXAxisProps) {
  const { setSlot } = useChart('BarChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
BarChartXAxis.displayName = 'BarChart.XAxis';

export interface BarChartYAxisProps {
  /** Roughly how many labels to show along the value axis. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Value labels down the side. Sideways, the side is the category axis, so the names go there. */
function BarChartYAxis({ ticks = 4, format }: BarChartYAxisProps) {
  const { setSlot } = useChart('BarChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
BarChartYAxis.displayName = 'BarChart.YAxis';

export interface BarChartTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: BarChartDatum) => string;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a band, pressing or dragging across
 * them, or the arrow keys. A click or a tap pins the reading until the next
 * press elsewhere or Escape. The whole plot is the hit area, because a readout
 * you have to land on a thin bar to summon is one nobody finds.
 */
function BarChartTooltip({ formatValue, formatX, labels, className }: BarChartTooltipProps) {
  const { setSlot } = useChart('BarChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, labels });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
BarChartTooltip.displayName = 'BarChart.Tooltip';

export interface BarChartLegendProps extends ComponentProps<'div'> {
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/** A swatch and a name per series, in the order the series were declared. */
function BarChartLegend({ labels, className, render, ...props }: BarChartLegendProps & RenderProp<'div'>) {
  const { series } = useChart('BarChart.Legend');
  const slots = barChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bar-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: series.map(({ key, fill: color }) => (
          <span key={key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: color }} />
            {labels?.[key] ?? key}
          </span>
        )),
      },
      props
    ),
  });

  return series.length ? element : null;
}
BarChartLegend.displayName = 'BarChart.Legend';

export interface BarChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
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
   * `BarChart.Legend` on a chart that has a header: the legend sits over the
   * plot, in the corner the bars also want.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it reads and what the
 * colours mean. The value is not derived here. A readout that follows the
 * pointer takes it from `onActiveIndexChange` and passes the string down, so one
 * header can show a total at rest and a band's value while one is read.
 */
function BarChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: BarChartHeaderProps & RenderProp<'div'>) {
  const { series } = useChart('BarChart.Header');
  const slots = barChartVariants();
  const trailing =
    children ??
    (legend && series.length
      ? series.map(({ key, fill: color }) => (
          <span key={key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: color }} />
            {labels?.[key] ?? key}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bar-chart-header',
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
BarChartHeader.displayName = 'BarChart.Header';

export const BarChart = Object.assign(BarChartRoot, {
  Header: BarChartHeader,
  Grid: BarChartGrid,
  Bar: BarChartBar,
  Skeleton: BarChartSkeleton,
  XAxis: BarChartXAxis,
  YAxis: BarChartYAxis,
  Tooltip: BarChartTooltip,
  Legend: BarChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  BarChartHeader,
  BarChartGrid,
  BarChartBar,
  BarChartSkeleton,
  BarChartXAxis,
  BarChartYAxis,
  BarChartTooltip,
  BarChartLegend,
};
