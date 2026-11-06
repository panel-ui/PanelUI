'use client';

/**
 * LineChart — a series over time, drawn in from the left.
 *
 * ```tsx
 * <LineChart data={visits} xDataKey="date">
 *   <LineChart.Grid />
 *   <LineChart.Area dataKey="visits" />
 *   <LineChart.Line dataKey="visits" />
 *   <LineChart.XAxis />
 *   <LineChart.Tooltip />
 * </LineChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's LineChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a point is read by hovering, tapping or
 * dragging, a click pins the reading, and the arrow keys walk the points.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Line`, `Area`, the axes and `Tooltip` draw nothing themselves. Each one
 * tells the root what it wants, and the root builds one chart definition from
 * them. They are found by context and not by inspecting children, so a part can
 * be wrapped in a component of your own. It also means the chart draws in the
 * browser, in a box its `aspectRatio` has reserved.
 *
 * ## One reveal, then the scale moves
 *
 * A new chart uncovers its series from the left by a clip, so a line, its fill and
 * its markers arrive together while the grid and axes are already there. After
 * that a change of data moves the points and the axis to their new values, and
 * the reveal does not play again: repeating it would turn a refresh into an
 * animation.
 *
 * ## Web additions
 *
 * `ReferenceLine`, `Marker` and the `step` curve are not in the app library. They
 * are for reading a value against a plan without hovering.
 */
import { areaY, d3Curve, defineChart, dot, lineY, ruleX, ruleY, text, type ChartInteractionController, type ChartMotionContext, type ChartPoint } from '@tanstack/charts';
import { crosshair } from '@tanstack/charts/crosshair';
import { whenFocused } from '@tanstack/charts/focus/mark';
import { decorative } from '@tanstack/charts/mark/decorative';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip as chartTooltip } from '@tanstack/charts/tooltip';
import { curveLinear, curveMonotoneX, curveStepAfter } from 'd3-shape';
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
import { lineDomain, readValue, tickIndexes } from './line-scale';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type LineChartStatus = 'loading' | 'ready';
export type LineChartCurve = 'monotone' | 'linear' | 'step';
export type LineChartDatum = Record<string, string | number | null | undefined>;

/** The theme's colour roles. */
type LineChartRole =
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

/** A role in the theme, or any CSS colour. */
export type LineChartColor = LineChartRole | (string & {});

const COLOR_VAR: Record<LineChartRole, string> = {
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

const paintOf = (color: LineChartColor) => COLOR_VAR[color as LineChartRole] ?? color;

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const CURVES = { monotone: d3Curve(curveMonotoneX), linear: d3Curve(curveLinear), step: d3Curve(curveStepAfter) };

/** The size of a reference line's or a marker's label. */
const ANNOTATION_FONT_SIZE = 11;

const lineChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    skeleton: 'pointer-events-none absolute overflow-hidden rounded-full bg-muted',
    sweep:
      'absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--chart-1)_55%,transparent),transparent)] motion-reduce:hidden',
    legend:
      'pointer-events-none absolute right-2 top-1 col-start-1 row-start-2 flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground',
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

/** The stroke of the skeleton's rule, the default of a line. */
const SKELETON_THICKNESS = 2.5;

/** Keeps a compact line's stroke from being cut at the edges of its box. */
const COMPACT_MARGIN = { top: 2, right: 1, bottom: 2, left: 1 };

/*
 * Measured against the whole drawing, so a line that starts late is not revealed
 * late as well. Nothing but the series moves: the grid and axes are already there.
 */
const STYLES = `@keyframes panelui-line-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@keyframes panelui-line-reveal{from{clip-path:inset(0 100% 0 0) view-box}to{clip-path:inset(0 0 0 0) view-box}}
@media (prefers-reduced-motion:no-preference){[data-slot=line-chart-plot][data-revealing] :is(.ts-chart__line,.ts-chart__area){animation:panelui-line-reveal var(--line-reveal) cubic-bezier(.33,1,.68,1) both}}`;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One point of one series. `value` is null across a gap. */
interface LineRow {
  index: number;
  series: string;
  value: number | null;
}

interface LineEntry {
  key: string;
  stroke: string;
  strokeWidth: number;
  dashArray: string | undefined;
  showMarkers: boolean;
  curve: LineChartCurve | undefined;
}

interface AreaEntry {
  key: string;
  fill: string;
  opacity: number;
}

/** A rule from `ReferenceLine` (across, at a value) or `Marker` (down, at a row). */
interface Annotation {
  id: string;
  axis: 'x' | 'y';
  at: number;
  stroke: string;
  dashArray: string;
  label: string | undefined;
}

/** Where the drawing put the plot, in pixels inside the chart's box. */
interface PlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new one redraws it.
 * The readout's are read through `latest` when it opens, so a new one costs nothing.
 */
interface Slots {
  grid?: { rows: number; dashArray: string | undefined; opacity: number; stroke: string };
  xAxis?: { ticks: number; format: LineChartXAxisProps['format'] };
  yAxis?: { ticks: number; format: LineChartYAxisProps['format'] };
  tooltip?: {
    stroke: string;
    showLabel: boolean;
    className: string | undefined;
    latest: { current: Pick<LineChartTooltipProps, 'formatValue' | 'formatX' | 'labels'> };
  };
  skeleton?: { duration: number; base: string | undefined };
}

interface LineChartContextValue {
  data: readonly LineChartDatum[];
  xDataKey: string;
  lines: readonly LineEntry[];
  setLine: (entry: LineEntry) => void;
  removeLine: (key: string) => void;
  setArea: (entry: AreaEntry) => void;
  removeArea: (key: string) => void;
  setAnnotation: (entry: Annotation) => void;
  removeAnnotation: (id: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const LineChartContext = createContext<LineChartContextValue | null>(null);

function useChart(component: string): LineChartContextValue {
  const context = useContext(LineChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <LineChart>`);
  }
  return context;
}

/**
 * The point being read, for something rendered inside the chart. A readout
 * outside it takes `onActiveIndexChange` instead.
 */
export function useLineChart() {
  const { data, activeIndex, xDataKey } = useChart('useLineChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
  };
}

/** Puts an entry in its place, or at the end if it is new, so a change keeps the order. */
function upsert<Entry extends { key: string }>(current: readonly Entry[], entry: Entry): readonly Entry[] {
  return current.some(({ key }) => key === entry.key)
    ? current.map((existing) => (existing.key === entry.key ? entry : existing))
    : [...current, entry];
}

export interface LineChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a point along the x-axis. */
  data: readonly LineChartDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the series back and draws them in when it turns `ready`. Add
   * a `LineChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: LineChartStatus;
  /** The plot's width ÷ height. `2` is the wide card shape; `1.6` suits a narrow column. */
  aspectRatio?: number;
  /** Milliseconds for the reveal. */
  animationDuration?: number;
  /** Milliseconds for the points and the axis to settle after the data changes. */
  domainDuration?: number;
  /** Fix the value axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /** `monotone` never overshoots between points; `linear` joins them straight; `step` holds each value until the next, for a balance that moves on the day money does. */
  curve?: LineChartCurve;
  /**
   * The point being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: LineChartDatum | null) => void;
  /** Drop the axis padding so the line reaches the edges, for a sparkline. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: LineChartDatum, index: number) => string;
}

/** Imperative handle: re-run the reveal, for a "replay" control. */
export interface LineChartHandle {
  replay: () => void;
}

const LineChartRoot = forwardRef<LineChartHandle, LineChartProps & RenderProp<'div'>>(function LineChartRoot(
  {
    data,
    xDataKey = 'date',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
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
  const slotClasses = lineChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [lines, setLines] = useState<readonly LineEntry[]>([]);
  const [areas, setAreas] = useState<readonly AreaEntry[]>([]);
  const [annotations, setAnnotations] = useState<readonly Annotation[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [revealedKey, setRevealedKey] = useState('');
  const [box, setBox] = useState<PlotBox | null>(null);
  const interactionRef = useRef<ChartInteractionController<LineRow, number, number> | null>(null);
  const dragging = useRef(false);
  // Unique per chart: gradients are found by id across the whole page.
  const gradientPrefix = `panelui-line-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

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

  const setLine = useCallback((entry: LineEntry) => setLines((current) => upsert(current, entry)), []);
  const removeLine = useCallback(
    (key: string) => setLines((current) => current.filter((entry) => entry.key !== key)),
    []
  );
  const setArea = useCallback((entry: AreaEntry) => setAreas((current) => upsert(current, entry)), []);
  const removeArea = useCallback(
    (key: string) => setAreas((current) => current.filter((entry) => entry.key !== key)),
    []
  );
  const setAnnotation = useCallback(
    (entry: Annotation) =>
      setAnnotations((current) =>
        current.some(({ id }) => id === entry.id)
          ? current.map((existing) => (existing.id === entry.id ? entry : existing))
          : [...current, entry]
      ),
    []
  );
  const removeAnnotation = useCallback(
    (id: string) => setAnnotations((current) => current.filter((entry) => entry.id !== id)),
    []
  );
  const setSlot = useCallback<LineChartContextValue['setSlot']>(
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
  const { grid, xAxis, yAxis, tooltip, skeleton } = slots;

  const definition = useMemo(() => {
    const span = Math.max(1, data.length - 1);
    const rowsOf = (key: string): LineRow[] =>
      data.map((datum, index) => ({ index, series: key, value: readValue(datum[key]) }));

    const valueTicks = yAxis?.ticks ?? grid?.rows ?? 4;
    const domain =
      yDomain ??
      lineDomain(
        data,
        [...lines, ...areas].map(({ key }) => key),
        valueTicks,
        annotations.filter(({ axis }) => axis === 'y').map(({ at }) => at)
      );

    const gradientId = (key: string) => `${gradientPrefix}-${areas.findIndex((entry) => entry.key === key)}`;
    // Closed against the bottom of the plot, not zero, which may be far outside it.
    const areaMarks = areas.map(({ key }) =>
      decorative(
        areaY(rowsOf(key), {
          id: `line-chart-area-${key}`,
          x: 'index',
          y1: () => domain[0],
          y2: 'value',
          key: 'index',
          fill: `url(#${gradientId(key)})`,
          fillOpacity: 1,
          // Follows its line, so a stepped balance is not filled under a smooth edge.
          curve: CURVES[lines.find((line) => line.key === key)?.curve ?? curve],
        })
      )
    );
    // One mark per series, because a mark has one stroke width and one dash.
    const lineMarks = lines.map(({ key, stroke, strokeWidth, dashArray, showMarkers, curve: own }) =>
      lineY(rowsOf(key), {
        id: `line-chart-line-${key}`,
        x: 'index',
        y: 'value',
        key: 'index',
        stroke,
        strokeWidth,
        strokeDasharray: dashArray,
        points: showMarkers,
        lineCap: 'round',
        lineJoin: 'round',
        curve: CURVES[own ?? curve],
      })
    );
    // A computed value can be infinite, and a row can be gone once the data shrinks.
    const drawable = annotations.filter(({ axis, at }) =>
      axis === 'y' ? Number.isFinite(at) : Number.isInteger(at) && at >= 0 && at < data.length
    );
    const annotationMarks = drawable.flatMap(({ id, axis, at, stroke, dashArray, label: name }) => {
      const nearEnd = axis === 'x' && at > span * 0.75;
      return [
        decorative(
          axis === 'y'
            ? ruleY([at], { id: `line-chart-rule-${id}`, stroke, strokeDasharray: dashArray, strokeWidth: 1 })
            : ruleX([at], { id: `line-chart-rule-${id}`, stroke, strokeDasharray: dashArray, strokeWidth: 1 })
        ),
        ...(name
          ? [
              decorative(
                text([name], {
                  id: `line-chart-rule-label-${id}`,
                  x: () => (axis === 'y' ? 0 : at),
                  y: () => (axis === 'y' ? at : domain[1]),
                  text: () => name,
                  fill: stroke,
                  fontSize: ANNOTATION_FONT_SIZE,
                  anchor: nearEnd ? 'end' : 'start',
                  dx: nearEnd ? -6 : axis === 'y' ? 8 : 6,
                  dy: axis === 'y' ? -8 : 8,
                })
              ),
            ]
          : []),
      ];
    });
    // A dot riding each series at the point being read.
    const dots = lines.map(({ key, stroke }) =>
      whenFocused(
        dot(
          rowsOf(key).filter((row) => row.value !== null),
          { id: `line-chart-dot-${key}`, x: 'index', y: 'value', key: 'index', r: 4.5, fill: stroke }
        ),
        { match: 'x' }
      )
    );

    const labelOf = (index: number) => {
      const datum = data[index];
      return datum ? String(datum[xDataKey] ?? '') : '';
    };
    const pointLabel = (index: number) => {
      const datum = data[index];
      const format = xAxis?.format;
      return datum && format ? format(datum, index) : labelOf(index);
    };

    const xOptions = {
      scale: scaleLinear([0, span], [0, 1]),
      axis: xAxis
        ? {
            line: false as const,
            // The two ends lean inward, clear of the bottom value label and the plot's edge.
            tickLabels: {
              opacity: 1,
              anchor: ({ value }: { value: number }) =>
                value === 0 ? ('start' as const) : value === data.length - 1 ? ('end' as const) : undefined,
            },
            ticks: { size: 0, format: pointLabel, values: tickIndexes(data.length, xAxis.ticks) },
          }
        : (false as const),
    };

    const valueFormat = (value: number) => {
      if (loading) return '';
      const format = yAxis?.format;
      return format ? format(value) : compactNumber(value);
    };
    const yOptions = {
      scale: scaleLinear(loading ? [0, 1] : domain, [0, 1]),
      grid: grid ? { stroke: grid.stroke, strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray } : false,
      axis: yAxis
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: { size: 0, format: valueFormat, count: valueTicks },
          }
        : grid
          ? { line: false as const, ticks: { size: 0, count: valueTicks, format: () => '' } }
          : (false as const),
    };

    const drawn = lines.some(({ key }) => data.some((datum) => readValue(datum[key]) !== null));
    const interactive = tooltip !== undefined && !loading && drawn;
    const readout =
      tooltip?.showLabel === true
        ? {
            use: chartTooltip,
            className: tooltip.className,
            // Beside the crosshair and along the top, clear of the dots it is reading.
            anchor: { x: 'value', y: 'plot-top' } as const,
            placement: ['bottom-right', 'bottom-left'] as const,
            offset: 12,
            // From the row, not the points: focus across separate marks hands over only one.
            content(points: readonly ChartPoint<LineRow, number, number>[]) {
              const { formatValue, formatX, labels } = tooltip.latest.current;
              const index = points[0]?.datum.index ?? -1;
              const datum = data[index];
              if (!datum) return { title: '', rows: [] };
              return {
                title: formatX ? formatX(datum) : labelOf(index),
                rows: lines.flatMap(({ key, stroke }) => {
                  const value = readValue(datum[key]);
                  if (value === null) return [];
                  return [
                    {
                      label: labels?.[key] ?? key,
                      value: formatValue ? formatValue(value, key) : compactNumber(value),
                      color: stroke,
                    },
                  ];
                }),
              };
            },
          }
        : undefined;

    return defineChart({
      theme: THEME,
      marks: loading
        ? []
        : [
            ...areaMarks,
            ...lineMarks,
            ...annotationMarks,
            ...(interactive
              ? [crosshair<number, number>({ y: false, stroke: tooltip.stroke, strokeOpacity: 0.45, strokeWidth: 1 }), ...dots]
              : []),
          ],
      scales: { x: xOptions, y: yOptions },
      gradients: areas.map(({ key, fill, opacity }) => ({
        id: gradientId(key),
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
        stops: [
          { offset: 0, color: fill, opacity },
          { offset: 1, color: fill, opacity: 0 },
        ],
      })),
      ...(compact ? { guides: false as const, margin: COMPACT_MARGIN } : {}),
      ...(loading && yAxis ? { margin: { left: LOADING_GUTTER } } : {}),
      focusRing: false,
      // The series arrive by the clip in `STYLES`, and everything else is simply there.
      motion: (context: ChartMotionContext<LineRow>) =>
        context.phase === 'enter'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive
        ? {
            focus: 'group-x' as const,
            maxFocusDistance: Number.POSITIVE_INFINITY,
            ...(readout ? { tooltip: readout } : {}),
          }
        : {}),
    });
  }, [
    data,
    xDataKey,
    lines,
    areas,
    annotations,
    loading,
    curve,
    yDomain?.[0],
    yDomain?.[1],
    compact,
    domainDuration,
    gradientPrefix,
    grid,
    xAxis,
    yAxis,
    tooltip,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Line chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<LineChartContextValue>(
    () => ({ data, xDataKey, lines, setLine, removeLine, setArea, removeArea, setAnnotation, removeAnnotation, setSlot, activeIndex }),
    [data, xDataKey, lines, setLine, removeLine, setArea, removeArea, setAnnotation, removeAnnotation, setSlot, activeIndex]
  );

  const spokenRow = (datum: LineChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [...new Set([xDataKey, ...lines.map(({ key }) => key), ...areas.map(({ key }) => key)])]
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
  const onFocusChange = (point: ChartPoint<LineRow, number, number> | null) =>
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
        'data-slot': 'line-chart',
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
              data-slot="line-chart-plot"
              data-revealing={!loading && revealedKey !== chartKey ? '' : undefined}
              className={slotClasses.plot()}
              style={{ aspectRatio, ['--line-reveal' as string]: `${animationDuration}ms` }}
              onAnimationEnd={(event) => {
                if (event.animationName === 'panelui-line-reveal') setRevealedKey(chartKey);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') interactionRef.current?.setControlledFocus(null);
              }}
              onPointerMove={readDrag}
              onPointerCancel={() => interactionRef.current?.setControlledFocus(null)}
            >
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
                      current &&
                      current.x === x &&
                      current.y === y &&
                      current.width === plotWidth &&
                      current.height === height
                        ? current
                        : { x, y, width: plotWidth, height }
                    );
                  }}
                />
              ) : null}
              {loading && skeleton && box ? (
                <div
                  data-slot="line-chart-skeleton"
                  aria-hidden
                  className={slotClasses.skeleton()}
                  style={{
                    left: box.x,
                    width: box.width,
                    top: box.y + box.height / 2 - SKELETON_THICKNESS / 2,
                    height: SKELETON_THICKNESS,
                    background: skeleton.base,
                  }}
                >
                  <div
                    className={slotClasses.sweep()}
                    style={{ animation: `panelui-line-sweep ${skeleton.duration}ms linear infinite` }}
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

  return <LineChartContext.Provider value={context}>{element}</LineChartContext.Provider>;
});
LineChartRoot.displayName = 'LineChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface LineChartGridProps {
  /** Roughly how many lines to draw across the value axis. */
  rows?: number;
  /** The stroke's dash pattern. Omit for the default dash, `"none"` for a solid rule. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
  /** A role in the theme, or any CSS colour, for the lines. Defaults to the border colour. */
  color?: LineChartColor;
}

/** Lines across the value axis, so a point can be read against a number. */
function LineChartGrid({
  rows = 4,
  dashArray = '4 6',
  opacity = 1,
  color,
}: LineChartGridProps) {
  const { setSlot } = useChart('LineChart.Grid');
  const stroke = color ? paintOf(color) : 'var(--border)';
  useEffect(() => {
    setSlot('grid', { rows, dashArray, opacity, stroke });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, opacity, stroke, setSlot]);
  return null;
}
LineChartGrid.displayName = 'LineChart.Grid';

export interface LineChartLineProps {
  /** Column in the data holding this series' values. A missing value leaves a gap. */
  dataKey: string;
  /** A role in the theme, or any CSS colour, for the series. */
  color?: LineChartColor;
  /** The stroke's width. */
  strokeWidth?: number;
  /** The stroke's dash pattern, such as `"6 4"`, for a projection or a secondary series. */
  dashArray?: string;
  /** A dot at every point. Best kept for short series. */
  showMarkers?: boolean;
  /** Defaults to the chart's `curve`. `step` beside a smooth series draws a balance against its plan. */
  curve?: LineChartCurve;
}

/** One series. */
function LineChartLine({
  dataKey,
  color = 'chart-1',
  strokeWidth = 2.5,
  dashArray,
  showMarkers = false,
  curve,
}: LineChartLineProps) {
  const { setLine, removeLine } = useChart('LineChart.Line');
  const stroke = paintOf(color);
  useEffect(() => {
    setLine({ key: dataKey, stroke, strokeWidth, dashArray, showMarkers, curve });
  }, [dataKey, stroke, strokeWidth, dashArray, showMarkers, curve, setLine]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeLine(dataKey), [dataKey, removeLine]);
  return null;
}
LineChartLine.displayName = 'LineChart.Line';

export interface LineChartAreaProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** A role in the theme, or any CSS colour, for the fill. */
  color?: LineChartColor;
  /** Opacity at the line. It fades to nothing at the bottom of the plot. */
  opacity?: number;
}

/**
 * The fill under a series, under every line. A separate part from the line,
 * because a chart with two series usually wants it on only one of them: two
 * translucent fills over each other make a third colour that means nothing.
 */
function LineChartArea({
  dataKey,
  color = 'chart-1',
  opacity = 0.18,
}: LineChartAreaProps) {
  const { setArea, removeArea } = useChart('LineChart.Area');
  const fill = paintOf(color);
  useEffect(() => {
    setArea({ key: dataKey, fill, opacity });
  }, [dataKey, fill, opacity, setArea]);
  useEffect(() => () => removeArea(dataKey), [dataKey, removeArea]);
  return null;
}
LineChartArea.displayName = 'LineChart.Area';

/** Registers one rule with the root, keeping its place in the order when its props change. */
function useAnnotation(component: string, entry: Omit<Annotation, 'id'>) {
  const { setAnnotation, removeAnnotation } = useChart(component);
  const id = useId();
  const { axis, at, stroke, dashArray, label } = entry;
  useEffect(() => {
    setAnnotation({ id, axis, at, stroke, dashArray, label });
  }, [id, axis, at, stroke, dashArray, label, setAnnotation]);
  useEffect(() => () => removeAnnotation(id), [id, removeAnnotation]);
}

export interface LineChartReferenceLineProps {
  /** The value to draw the rule at. It counts toward the value axis. */
  y: number;
  /** A role in the theme, or any CSS colour, for the rule and its label. */
  color?: LineChartColor;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Text above the rule's left end. */
  label?: string;
}

/** A rule across the plot at a fixed value: a budget, an average, a target. */
function LineChartReferenceLine({
  y,
  color = 'foreground',
  dashArray = '3 4',
  label,
}: LineChartReferenceLineProps) {
  useAnnotation('LineChart.ReferenceLine', { axis: 'y', at: y, stroke: paintOf(color), dashArray, label });
  return null;
}
LineChartReferenceLine.displayName = 'LineChart.ReferenceLine';

export interface LineChartMarkerProps {
  /** The row to draw the rule at, counted from `0`. */
  index: number;
  /** A role in the theme, or any CSS colour, for the rule and its label. */
  color?: LineChartColor;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Text beside the rule's top. It moves to the left of a rule near the right edge. */
  label?: string;
}

/** A rule down the plot at one row: a release, the day something ran out. */
function LineChartMarker({
  index,
  color = 'muted-foreground',
  dashArray = '2 3',
  label,
}: LineChartMarkerProps) {
  useAnnotation('LineChart.Marker', { axis: 'x', at: index, stroke: paintOf(color), dashArray, label });
  return null;
}
LineChartMarker.displayName = 'LineChart.Marker';

export interface LineChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  /** A role in the theme, or any CSS colour, for the rule under the highlight. Defaults to the muted colour. */
  color?: LineChartColor;
}

/**
 * The loading state: a flat rule where the series will be, with a highlight
 * travelling along it. The highlight is a translated child inside the rule's
 * clip, so the loop runs on the compositor and repaints nothing.
 */
function LineChartSkeleton({
  duration = 1400,
  color,
}: LineChartSkeletonProps) {
  const { setSlot } = useChart('LineChart.Skeleton');
  const base = color && paintOf(color);
  useEffect(() => {
    setSlot('skeleton', { duration, base });
    return () => setSlot('skeleton', undefined);
  }, [duration, base, setSlot]);
  return null;
}
LineChartSkeleton.displayName = 'LineChart.Skeleton';

export interface LineChartXAxisProps {
  /** How many labels to show, evenly spaced with both ends kept. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: LineChartDatum, index: number) => string;
}

/** The x labels, each on its own point. */
function LineChartXAxis({
  ticks = 4,
  format,
}: LineChartXAxisProps) {
  const { setSlot } = useChart('LineChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
LineChartXAxis.displayName = 'LineChart.XAxis';

export interface LineChartYAxisProps {
  /** Roughly how many labels to show. Give it the same number as `Grid`'s `rows`. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Value labels down the side, with room made for them. */
function LineChartYAxis({
  ticks = 4,
  format,
}: LineChartYAxisProps) {
  const { setSlot } = useChart('LineChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
LineChartYAxis.displayName = 'LineChart.YAxis';

export interface LineChartTooltipProps {
  /** The crosshair's colour: a role in the theme, or any CSS colour. */
  color?: LineChartColor;
  /** Draw the popover. Without it the crosshair and dots still follow the reading, for a readout in the header. */
  showLabel?: boolean;
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: LineChartDatum) => string;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The crosshair, the dots that ride the lines, the popover, and what drives them:
 * hovering, pressing or dragging across the plot, or the arrow keys. A click or a
 * tap pins the reading until the next press elsewhere or Escape. The whole plot is
 * the hit area, because a readout you have to land on the line to summon is one
 * nobody finds.
 */
function LineChartTooltip({
  color = 'foreground',
  showLabel = true,
  formatValue,
  formatX,
  labels,
  className,
}: LineChartTooltipProps) {
  const { setSlot } = useChart('LineChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, labels });
  const stroke = paintOf(color);
  useEffect(() => {
    setSlot('tooltip', { stroke, showLabel, className, latest });
    return () => setSlot('tooltip', undefined);
  }, [stroke, showLabel, className, latest, setSlot]);
  return null;
}
LineChartTooltip.displayName = 'LineChart.Tooltip';

/** A swatch and a name per line, in the order the lines were declared. */
function seriesKey(lines: readonly LineEntry[], labels: Record<string, string> | undefined, slots: ReturnType<typeof lineChartVariants>) {
  return lines.map(({ key, stroke }) => (
    <span key={key} className={slots.legendItem()}>
      <span className={slots.legendSwatch()} style={{ background: stroke }} />
      {labels?.[key] ?? key}
    </span>
  ));
}

export interface LineChartLegendProps extends ComponentProps<'div'> {
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/** The series key, over the top corner of the plot. On a chart with a header, use its `legend` prop. */
function LineChartLegend({
  labels,
  className,
  render,
  ...props
}: LineChartLegendProps & RenderProp<'div'>) {
  const { lines } = useChart('LineChart.Legend');
  const slots = lineChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'line-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: seriesKey(lines, labels, slots),
      },
      props
    ),
  });

  return lines.length ? element : null;
}
LineChartLegend.displayName = 'LineChart.Legend';

export interface LineChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
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
   * `LineChart.Legend` on a chart that has a header: the legend sits over the
   * plot, in a corner the lines also want.
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
function LineChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: LineChartHeaderProps & RenderProp<'div'>) {
  const { lines } = useChart('LineChart.Header');
  const slots = lineChartVariants();
  const trailing = children ?? (legend && lines.length ? seriesKey(lines, labels, slots) : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'line-chart-header',
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
LineChartHeader.displayName = 'LineChart.Header';

export const LineChart = Object.assign(LineChartRoot, {
  Header: LineChartHeader,
  Grid: LineChartGrid,
  Area: LineChartArea,
  Line: LineChartLine,
  ReferenceLine: LineChartReferenceLine,
  Marker: LineChartMarker,
  Skeleton: LineChartSkeleton,
  XAxis: LineChartXAxis,
  YAxis: LineChartYAxis,
  Tooltip: LineChartTooltip,
  Legend: LineChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  LineChartHeader,
  LineChartGrid,
  LineChartArea,
  LineChartLine,
  LineChartReferenceLine,
  LineChartMarker,
  LineChartSkeleton,
  LineChartXAxis,
  LineChartYAxis,
  LineChartTooltip,
  LineChartLegend,
};
