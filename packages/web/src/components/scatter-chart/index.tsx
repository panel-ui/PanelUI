'use client';

/**
 * ScatterChart — two measured quantities against each other, to show how they relate.
 *
 * ```tsx
 * <ScatterChart data={sessions} xDataKey="spend">
 *   <ScatterChart.Grid />
 *   <ScatterChart.Points dataKey="revenue" />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Tooltip />
 * </ScatterChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's ScatterChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a point is read by hovering, tapping or
 * dragging, a click pins the reading, and the arrow keys walk the points.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Points`, the axes and `Tooltip` draw nothing themselves. Each one tells
 * the root what it wants, and the root builds one chart definition from them. They
 * are found by context and not by inspecting children, so a part can be wrapped in
 * a component of your own. It also means the chart draws in the browser, in a box
 * its `aspectRatio` has reserved.
 *
 * ## Neither axis is floored at zero
 *
 * The subject is the spread. Forcing readings between 80 and 90 to share a frame
 * with zero squeezes them into a corner, so each domain is the data's own with a
 * little air around it. `xDomain` and `yDomain` fix one instead.
 *
 * ## A point is found by distance
 *
 * Two points can share an x, so there is no column to snap to. The nearest point
 * wins, and only within `hitRadius`, so an empty corner of the plot reads nothing.
 */
import { defineChart, dot, type ChartInteractionController, type ChartMotionContext, type ChartPoint } from '@tanstack/charts';
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
  scatterDomains,
  scatterRows,
  skeletonField,
  type ScatterChartDatum,
  type ScatterRow,
} from './scatter-scale';

export type { ScatterChartDatum } from './scatter-scale';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type ScatterChartStatus = 'loading' | 'ready';

/** Which of the theme's roles a series is drawn in. */
export type ScatterChartColor =
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

/** One plotted point, resolved back to the row it came from. */
export interface ScatterChartPoint {
  /** Index into `data`. */
  index: number;
  /** The series key this point belongs to. */
  dataKey: string;
  x: number;
  y: number;
  datum: ScatterChartDatum;
}

const COLOR_VAR: Record<ScatterChartColor, string> = {
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

const scatterChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [&_circle]:origin-center [&_circle]:[transform-box:fill-box] [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
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

/** Room round the plot for the outermost dots, which the axes do not measure. */
const EDGE = 14;

/** Margin of a compact chart: enough that a dot on the edge keeps its whole shape. */
const COMPACT_EDGE = 4;

/** How much of the reveal goes to staggering the points' start times. */
const STAGGER_SHARE = 0.4;

/** Up past its size and back to it: a dot that only grows reads as still loading until the last frame. */
const LANDING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** Milliseconds for a point to swell as it is read, and settle as it is not. */
const SELECT_DURATION = 140;

/** How much bigger a point is while it is read. */
const SWELL = 1.5;

/** How far from a point the pointer still reads it. A fingertip is wider than a dot. */
const HIT_RADIUS = 32;

/** The radii a size key maps onto when a series names none. */
const SIZE_RANGE: [number, number] = [3, 14];

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/**
 * Grows the drawn points in, one after another, all landing inside the one duration.
 * The renderer gives a dot no entrance of its own on a chart's first paint. A scale
 * leaves `r` to the swell, and costs no repaint once it has finished.
 */
function landPoints(container: Element, duration: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dots = container.querySelectorAll('svg circle');
  const share = dots.length > 1 ? STAGGER_SHARE : 0;
  dots.forEach((dot, order) => {
    dot.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: duration * (1 - share),
      delay: (order / dots.length) * duration * share,
      easing: LANDING,
      fill: 'backwards',
    });
  });
}

interface SeriesEntry {
  key: string;
  fill: string;
  opacity: number;
  size: number;
  sizeKey: string | undefined;
  sizeRange: readonly [number, number];
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new
 * one redraws it. The readout's are read through `latest` when it opens, so a new
 * one costs nothing.
 */
interface Slots {
  grid?: { rows: number; columns: number; dashArray: string; opacity: number };
  xAxis?: { ticks: number; format: ScatterChartXAxisProps['format'] };
  yAxis?: { ticks: number; format: ScatterChartYAxisProps['format'] };
  tooltip?: {
    showLabel: boolean;
    hitRadius: number;
    className: string | undefined;
    latest: { current: Pick<ScatterChartTooltipProps, 'formatX' | 'formatY' | 'formatTitle' | 'labels'> };
  };
  skeleton?: { count: number; fill: string };
}

interface ScatterChartContextValue {
  xDataKey: string;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activePoint: ScatterChartPoint | null;
}

const ScatterChartContext = createContext<ScatterChartContextValue | null>(null);

function useChart(component: string): ScatterChartContextValue {
  const context = useContext(ScatterChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <ScatterChart>`);
  }
  return context;
}

/**
 * The point being read, for something rendered inside the chart. A readout outside
 * it takes `onActivePointChange` instead.
 */
export function useScatterChart() {
  const { activePoint, xDataKey } = useChart('useScatterChart');
  return { activePoint, xDataKey };
}

export interface ScatterChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a point, placed by two of its values. */
  data: readonly ScatterChartDatum[];
  /** Key holding the x value. Unlike a category label, this must be a number. */
  xDataKey?: string;
  /**
   * `loading` holds the points back and grows them in when it turns `ready`. Add a
   * `ScatterChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: ScatterChartStatus;
  /** The plot's width ÷ height. `1` suits a scatter plot: neither axis is the important one. */
  aspectRatio?: number;
  /** Milliseconds for the points to arrive. */
  animationDuration?: number;
  /** Milliseconds for the points and the axes to settle after the data changes. */
  domainDuration?: number;
  /** Fix the x-axis instead of deriving it from the data. */
  xDomain?: [number, number];
  /** Fix the y-axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /**
   * The point being read, and `null` when there is none. Fires when it changes, not per
   * frame. Reading needs `ScatterChart.Tooltip`; `showLabel={false}` keeps it without the label.
   */
  onActivePointChange?: (point: ScatterChartPoint | null) => void;
  /** Drop the axis padding so the field reaches the edges, for a thumbnail. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its x, series and size keys and values. */
  labelForDatum?: (datum: ScatterChartDatum, index: number) => string;
}

/** Imperative handle: re-run the reveal, for a "replay" control. */
export interface ScatterChartHandle {
  replay: () => void;
}

const ScatterChartRoot = forwardRef<ScatterChartHandle, ScatterChartProps & RenderProp<'div'>>(function ScatterChartRoot(
  {
    data,
    xDataKey = 'x',
    status = 'ready',
    aspectRatio = 1,
    animationDuration = 650,
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
  const slotClasses = scatterChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesState] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activePoint, setActivePoint] = useState<ScatterChartPoint | null>(null);
  const [revision, setRevision] = useState(0);
  const interactionRef = useRef<ChartInteractionController<ScatterRow, number, number> | null>(null);
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
  const setSlot = useCallback<ScatterChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const { grid, xAxis, yAxis, tooltip, skeleton } = slots;

  const definition = useMemo(() => {
    const rows = scatterRows(data, xDataKey, series);
    const domains = scatterDomains(rows, xDomain, yDomain);

    const points = series.map(({ key, fill, opacity }) =>
      dot(
        rows.filter((row) => row.series === key),
        {
          id: `scatter-${key}`,
          key: (row: ScatterRow) => `${row.series}:${row.index}`,
          x: 'x',
          y: 'y',
          z: 'series',
          r: 'r',
          fill,
          fillOpacity: opacity,
          // A size change alone is easy to miss among neighbours, and an opacity
          // change alone is invisible wherever points overlap, so it does both.
          states: [
            {
              when: { focus: 'primary' as const },
              style: { r: ({ datum }: { datum: ScatterRow }) => datum.r * SWELL, fillOpacity: 1 },
              transition: { type: 'tween' as const, duration: SELECT_DURATION, easing: 'ease-out' as const },
            },
          ],
        }
      )
    );

    const placeholders = dot(loading && skeleton ? skeletonField(skeleton.count) : [], {
      id: 'scatter-skeleton',
      key: 'index',
      x: 'x',
      y: 'y',
      r: 'r',
      fill: skeleton?.fill ?? 'var(--muted)',
      motion: false,
    });

    const axisOf = (
      slot: { ticks: number; format: ((value: number) => string) | undefined } | undefined,
      gridCount: number | undefined
    ) => {
      if (slot) {
        return {
          line: false as const,
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

    const interactive = tooltip !== undefined && !loading && rows.length > 0;
    // Kept even with the label hidden, because a press only pins through a tooltip.
    const readout =
      tooltip
        ? {
            use: chartTooltip,
            className: tooltip.showLabel ? tooltip.className : 'hidden!',
            content(focused: readonly ChartPoint<ScatterRow, number, number>[]) {
              const { formatX, formatY, formatTitle, labels } = tooltip.latest.current;
              const point = focused[0];
              if (!point) return { title: '', rows: [] };
              const { index, series: key, x, y } = point.datum;
              const datum = data[index];
              return {
                title: datum && formatTitle ? formatTitle(datum) : '',
                rows: [
                  { label: labels?.[xDataKey] ?? xDataKey, value: formatX ? formatX(x) : compactNumber(x) },
                  {
                    label: labels?.[key] ?? key,
                    value: formatY ? formatY(y, key) : compactNumber(y),
                    color: point.color,
                  },
                ],
              };
            },
          }
        : undefined;

    return defineChart({
      theme: THEME,
      marks: loading ? [placeholders] : points,
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
      ...(compact
        ? { guides: false as const, margin: COMPACT_EDGE }
        : {
            margin: {
              top: EDGE,
              right: EDGE,
              ...(xAxis ? {} : { bottom: EDGE }),
              ...(yAxis ? (loading ? { left: LOADING_GUTTER } : {}) : { left: EDGE }),
            },
          }),
      focusRing: false,
      // Only a point added to a chart already showing fades in here, so a replay does
      // not also fade the axes and grid in again. The first arrival is `landPoints`.
      motion: (context: ChartMotionContext<ScatterRow>) =>
        context.phase === 'enter' && context.role !== 'dot'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive
        ? {
            maxFocusDistance: tooltip.hitRadius,
            ...(readout ? { tooltip: readout } : {}),
          }
        : {}),
    });
  }, [
    data,
    xDataKey,
    series,
    loading,
    xDomain?.[0],
    xDomain?.[1],
    yDomain?.[0],
    yDomain?.[1],
    compact,
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

  const summary = label ?? `Scatter chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<ScatterChartContextValue>(
    () => ({ xDataKey, series, setSeries, removeSeries, setSlot, activePoint }),
    [xDataKey, series, setSeries, removeSeries, setSlot, activePoint]
  );

  // Kept apart from the render, because every active point re-renders the root and a
  // large chart has thousands of rows to format.
  const spokenRows = useMemo(() => {
    const keys = [xDataKey, ...series.flatMap(({ key, sizeKey }) => (sizeKey ? [key, sizeKey] : [key]))];
    return data.map((datum, index) => (
      <li key={index}>
        {labelForDatum?.(datum, index) ??
          keys
            .filter((key) => datum[key] !== null && datum[key] !== undefined)
            .map((key) => `${key}, ${datum[key]}`)
            .join('. ')}
      </li>
    ));
  }, [data, labelForDatum, series, xDataKey]);

  // The chart also reports a point again when the data is rebuilt under it. Only a
  // different point, or new values on the same one, is news, and repeating it can loop
  // a caller that keeps the datum.
  const reportedId = useRef('');
  const report = (point: ScatterChartPoint | null) => {
    const id = point ? `${point.dataKey}:${point.index}:${point.x}:${point.y}:${JSON.stringify(point.datum)}` : '';
    if (reportedId.current === id) return;
    reportedId.current = id;
    setActivePoint(point);
    onActivePointChange?.(point);
  };
  const onFocusChange = (point: ChartPoint<ScatterRow, number, number> | null) => {
    const datum = point ? data[point.datum.index] : undefined;
    report(
      point && datum
        ? { index: point.datum.index, dataKey: point.datum.series, x: point.datum.x, y: point.datum.y, datum }
        : null
    );
  };

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => report(null), [revision, status]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the points it passes, and the last one stays until
   * the next press, the same as a tap's. A vertical drag never gets here: `pan-y`
   * gives it to the page, and the browser cancels the pointer.
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
        'data-slot': 'scatter-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {spokenRows}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="scatter-chart-plot"
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
                  // An entrance only plays on a chart's first paint, so the points
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
                    // An entrance belongs to a chart's first paint with points in it.
                    const paint = `${revision}:${status}`;
                    if (loading || landed.current === paint || scene.points.length === 0) return;
                    landed.current = paint;
                    // The chart swaps its surface right after this call, and a frame
                    // callback still runs ahead of the first paint.
                    requestAnimationFrame(() => landPoints(container, animationDuration));
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

  return <ScatterChartContext.Provider value={context}>{element}</ScatterChartContext.Provider>;
});
ScatterChartRoot.displayName = 'ScatterChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface ScatterChartGridProps {
  /** Roughly how many lines to draw across the plot. With a y-axis, the lines follow its `ticks` instead. */
  rows?: number;
  /**
   * Roughly how many lines to draw down it. x is a quantity here, so it earns a grid
   * of its own. With an x-axis, the lines follow its `ticks` instead.
   */
  columns?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Reference lines both ways, on the same round numbers as the axes. */
function ScatterChartGrid({
  rows = 4,
  columns = 4,
  dashArray = '4 6',
  opacity = 1,
}: ScatterChartGridProps) {
  const { setSlot } = useChart('ScatterChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, columns, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, columns, dashArray, opacity, setSlot]);
  return null;
}
ScatterChartGrid.displayName = 'ScatterChart.Grid';

export interface ScatterChartPointsProps {
  /** Key holding this series' y values. */
  dataKey: string;
  /** Which of the theme's roles the series is drawn in. */
  color?: ScatterChartColor;
  /** Radius of a point, in pixels. With `sizeKey`, the radius of a row with no finite value there. */
  size?: number;
  /**
   * Key holding a third quantity, spaced by each point's area rather than its radius. The
   * lowest value takes the smallest radius in `sizeRange` and the highest the largest, so
   * sizes compare rows without giving their exact ratio.
   */
  sizeKey?: string;
  /** Smallest and largest radius `sizeKey` maps onto. */
  sizeRange?: [number, number];
  /** Fill opacity. Below 1 by default, so overlapping points read as denser. */
  opacity?: number;
}

/** One series, as a field of dots. */
function ScatterChartPoints({
  dataKey,
  color = 'chart-1',
  size = 4.5,
  sizeKey,
  sizeRange = SIZE_RANGE,
  opacity = 0.75,
}: ScatterChartPointsProps) {
  const { setSeries, removeSeries } = useChart('ScatterChart.Points');
  const fill = COLOR_VAR[color];
  const [smallest, largest] = sizeRange;
  useEffect(() => {
    setSeries({ key: dataKey, fill, opacity, size, sizeKey, sizeRange: [smallest, largest] });
  }, [dataKey, fill, opacity, size, sizeKey, smallest, largest, setSeries]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
ScatterChartPoints.displayName = 'ScatterChart.Points';

export interface ScatterChartSkeletonProps {
  /** How many placeholder dots to scatter. */
  count?: number;
  /** Which of the theme's roles to draw them in. Defaults to the muted surface. */
  color?: ScatterChartColor;
}

/**
 * The loading state: a still field of muted dots where the data will be. Still,
 * because a shimmer over dots reads as the points moving, and position is what a
 * scatter plot says. The layout is the same on every render.
 */
function ScatterChartSkeleton({
  count = 24,
  color,
}: ScatterChartSkeletonProps) {
  const { setSlot } = useChart('ScatterChart.Skeleton');
  const fill = color ? COLOR_VAR[color] : 'var(--muted)';
  useEffect(() => {
    setSlot('skeleton', { count, fill });
    return () => setSlot('skeleton', undefined);
  }, [count, fill, setSlot]);
  return null;
}
ScatterChartSkeleton.displayName = 'ScatterChart.Skeleton';

export interface ScatterChartXAxisProps {
  /** Roughly how many labels to show. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** The x labels, on round numbers along a continuous scale. */
function ScatterChartXAxis({
  ticks = 4,
  format,
}: ScatterChartXAxisProps) {
  const { setSlot } = useChart('ScatterChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
ScatterChartXAxis.displayName = 'ScatterChart.XAxis';

export interface ScatterChartYAxisProps {
  /** Roughly how many labels to show. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Value labels down the side, with room made for them. */
function ScatterChartYAxis({
  ticks = 4,
  format,
}: ScatterChartYAxisProps) {
  const { setSlot } = useChart('ScatterChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
ScatterChartYAxis.displayName = 'ScatterChart.YAxis';

export interface ScatterChartTooltipProps {
  /** Float a small readout beside the point. Without it the point still swells and reports. */
  showLabel?: boolean;
  /** Format the x value for the readout. Defaults to a compact number. */
  formatX?: (value: number) => string;
  /** Format the y value for the readout. Defaults to a compact number. */
  formatY?: (value: number, key: string) => string;
  /** A heading for the readout, from the row: a name, a label, a category. */
  formatTitle?: (datum: ScatterChartDatum) => string;
  /** Prettier names for the x key and the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /** How far from a point the pointer still reads it, in pixels. */
  hitRadius?: number;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering near a point, tapping it, dragging across
 * the field, or the arrow keys. A click or a tap pins the reading until the next press
 * elsewhere or Escape.
 */
function ScatterChartTooltip({
  showLabel = true,
  formatX,
  formatY,
  formatTitle,
  labels,
  hitRadius = HIT_RADIUS,
  className,
}: ScatterChartTooltipProps) {
  const { setSlot } = useChart('ScatterChart.Tooltip');
  const latest = useLatest({ formatX, formatY, formatTitle, labels });
  useEffect(() => {
    setSlot('tooltip', { showLabel, hitRadius, className, latest });
    return () => setSlot('tooltip', undefined);
  }, [showLabel, hitRadius, className, latest, setSlot]);
  return null;
}
ScatterChartTooltip.displayName = 'ScatterChart.Tooltip';

export interface ScatterChartLegendProps extends ComponentProps<'div'> {
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/** A swatch and a name per series, in the order the series were declared. */
function ScatterChartLegend({
  labels,
  className,
  render,
  ...props
}: ScatterChartLegendProps & RenderProp<'div'>) {
  const { series } = useChart('ScatterChart.Legend');
  const slots = scatterChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'scatter-chart-legend',
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
ScatterChartLegend.displayName = 'ScatterChart.Legend';

export interface ScatterChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
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
   * `ScatterChart.Legend` on a chart that has a header: the legend sits over the plot,
   * in a corner the points also want.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it reads and what the colours
 * mean. The value is not derived here. A readout that follows the pointer takes it
 * from `onActivePointChange` and passes the string down, so one header can show a
 * summary at rest and a point's values while one is read.
 */
function ScatterChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: ScatterChartHeaderProps & RenderProp<'div'>) {
  const { series } = useChart('ScatterChart.Header');
  const slots = scatterChartVariants();
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
        'data-slot': 'scatter-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value !== undefined && value !== null ? <div className={slots.headerValue()}>{value}</div> : null}
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
ScatterChartHeader.displayName = 'ScatterChart.Header';

export const ScatterChart = Object.assign(ScatterChartRoot, {
  Header: ScatterChartHeader,
  Grid: ScatterChartGrid,
  Points: ScatterChartPoints,
  Skeleton: ScatterChartSkeleton,
  XAxis: ScatterChartXAxis,
  YAxis: ScatterChartYAxis,
  Tooltip: ScatterChartTooltip,
  Legend: ScatterChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  ScatterChartHeader,
  ScatterChartGrid,
  ScatterChartPoints,
  ScatterChartSkeleton,
  ScatterChartXAxis,
  ScatterChartYAxis,
  ScatterChartTooltip,
  ScatterChartLegend,
};
