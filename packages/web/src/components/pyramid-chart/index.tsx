'use client';

/**
 * PyramidChart — two series mirrored about a centre line, one row per category.
 *
 * ```tsx
 * <PyramidChart data={penguins} xDataKey="species">
 *   <PyramidChart.Grid />
 *   <PyramidChart.Bar dataKey="male" side="start" />
 *   <PyramidChart.Bar dataKey="female" side="end" />
 *   <PyramidChart.XAxis />
 *   <PyramidChart.YAxis />
 *   <PyramidChart.Tooltip />
 * </PyramidChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's PyramidChart, so a chart
 * written for one reads the same in the other. What differs is what the web
 * changes: a colour is named by the theme's role, a row is read by hovering,
 * tapping or dragging, a click pins the reading, and the arrow keys walk the rows.
 *
 * ## The two wings share one scale
 *
 * The domain comes from the larger of the two series' extents and both use it, so
 * a bar twice as long as the one facing it means twice as much. The centre is
 * zero and stays there, because a wing cropped at its base misreports its value.
 *
 * ## Lengths, not signed values
 *
 * Which side a series is on comes from `side`, not from the sign of its numbers,
 * so a value is a distance outward. A negative one is drawn as nothing and still
 * appears in the readout, so a data error shows as a gap and not as a bar pointing
 * the wrong way.
 *
 * ## One mark for both wings
 *
 * Every bar is a row of one mark, with its two ends worked out in value units.
 * That is what lets the readout hold both of a row's bars at once: the chart only
 * groups the points of a single mark. The names and the value labels are HTML
 * placed from the same numbers, because neither has a place on a chart axis: a
 * name can sit over its bars, and the value axis repeats itself either side of zero.
 */
import {
  barX,
  defineChart,
  ruleX,
  type ChartInteractionController,
  type ChartMotionContext,
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
import { barThickness, gutterUnits, sharedMax, wingSpan, wingTicks, type PyramidSide } from './pyramid-scale';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type PyramidChartStatus = 'loading' | 'ready';

/** Which wing a series grows into. */
export type PyramidChartSide = PyramidSide;

/** Where the category names sit. */
export type PyramidChartLabelPlacement = 'above' | 'center' | 'start';

export type PyramidChartDatum = Record<string, string | number | null | undefined>;

/** Which of the theme's roles a series is drawn in. */
export type PyramidChartColor =
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

const COLOR_VAR: Record<PyramidChartColor, string> = {
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

const pyramidChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    sweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
    sweep:
      'absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--chart-1)_55%,transparent),transparent)] motion-reduce:hidden',
    overlay: 'pointer-events-none absolute inset-0 text-xs text-muted-foreground',
    tick: 'absolute bottom-0 truncate text-center tabular-nums',
    name: 'absolute flex items-center truncate',
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

/** Room around the plot. The bottom holds the value labels. */
const PADDING = { top: 6, right: 10, bottom: 22, left: 10 };

/** Left gutter held for the names when they sit at the start. */
const CATEGORY_GUTTER = 68;

/** Middle gutter held for them between the wings. It comes off the bars, not the edges. */
const CENTRE_GUTTER = 72;

/** Height taken off the top of every band for the name sitting over it. */
const LABEL_ROW = 20;

/** The box a value label is centred in, narrow enough to stay inside the chart at the edge. */
const AXIS_LABEL_WIDTH = 56;

/** How much of a wing a placeholder bar takes. */
const SKELETON_LENGTH = 0.35;

/** Rows to draw when there is no data yet to count them from. */
const SKELETON_ROWS = 5;

const SKELETON_MARK = 'pyramid-chart-skeleton';

/** How much of the entrance goes to staggering the rows. */
const STAGGER_SHARE = 0.45;

const KEYFRAMES = '@keyframes panelui-pyramid-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** One bar: a value of one series in one row, with its two ends on the shared scale. */
interface WingRow {
  index: number;
  series: string;
  side: PyramidSide;
  value: number;
  x1: number;
  x2: number;
}

interface SeriesEntry {
  key: string;
  fill: string;
  side: PyramidSide;
  radius: number | undefined;
}

/**
 * What the parts have asked for. The readout's formatters are read through
 * `latest` when it opens, so a new one costs nothing.
 */
interface Slots {
  grid?: { columns: number; dashArray: string; opacity: number; centreLine: boolean };
  xAxis?: Pick<PyramidChartXAxisProps, 'ticks' | 'format' | 'className'>;
  yAxis?: Pick<PyramidChartYAxisProps, 'format' | 'className'>;
  tooltip?: {
    className: string | undefined;
    latest: { current: Pick<PyramidChartTooltipProps, 'formatValue' | 'formatX' | 'labels'> };
  };
  skeleton?: { rows: number | undefined; duration: number };
}

interface PyramidChartContextValue {
  data: readonly PyramidChartDatum[];
  xDataKey: string;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const PyramidChartContext = createContext<PyramidChartContextValue | null>(null);

function useChart(component: string): PyramidChartContextValue {
  const context = useContext(PyramidChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <PyramidChart>`);
  }
  return context;
}

/**
 * The row being read, for something rendered inside the chart. A readout outside
 * it takes `onActiveIndexChange` instead.
 */
export function usePyramidChart() {
  const { data, activeIndex, xDataKey } = useChart('usePyramidChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
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

/** Rounds the outward corners only, so the two wings meet square at the centre. */
const outwardCorners = (side: PyramidSide, radius: number): readonly [number, number, number, number] =>
  side === 'start' ? [radius, 0, 0, radius] : [0, radius, radius, 0];

export interface PyramidChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a band across the chart, with a wing either side. */
  data: readonly PyramidChartDatum[];
  /** Key holding the category label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bars at the centre and grows them out when it turns
   * `ready`. Add a `PyramidChart.Skeleton` for something to stand in the plot
   * meanwhile.
   */
  status?: PyramidChartStatus;
  /** The plot's width ÷ height. `1.2` suits three or four rows in a card. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow out. */
  animationDuration?: number;
  /** Milliseconds for the bars to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the far end of the shared scale instead of deriving it. The near end is
   * zero either way.
   */
  maxValue?: number;
  /**
   * Where the category names sit. `above` gives each row a line of its own over
   * its pair of bars. `center` puts them in a gutter between the wings, and
   * `start` down the left edge.
   */
  labelPlacement?: PyramidChartLabelPlacement;
  /** Fraction of each band left empty, `0` to `1`. */
  barGap?: number;
  /** Largest bar thickness in pixels. Derived from the band when omitted. */
  barWidth?: number;
  /** Corner radius on the outward end of a bar. */
  cornerRadius?: number;
  /** Smallest length a positive bar is drawn at, in pixels. */
  minBarLength?: number;
  /** Opacity of the rows that are not being read. */
  fadedOpacity?: number;
  /**
   * The row being read, and `-1`/`null` when there is none. Fires when the index
   * changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: PyramidChartDatum | null) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: PyramidChartDatum, index: number) => string;
}

/** Imperative handle: re-run the grow-out, for a "replay" control. */
export interface PyramidChartHandle {
  replay: () => void;
}

const PyramidChartRoot = forwardRef<PyramidChartHandle, PyramidChartProps & RenderProp<'div'>>(function PyramidChartRoot(
  {
    data,
    xDataKey = 'name',
    status = 'ready',
    aspectRatio = 1.2,
    animationDuration = 700,
    domainDuration = 500,
    maxValue,
    labelPlacement = 'above',
    barGap = 0.25,
    barWidth,
    cornerRadius = 4,
    minBarLength = 0,
    fadedOpacity = 0.3,
    onActiveIndexChange,
    label,
    labelForDatum,
    className,
    children,
    render,
    ...props
  },
  ref
) {
  const slotClasses = pyramidChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesState] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [stubs, setStubs] = useState('');
  const interactionRef = useRef<ChartInteractionController<WingRow, number, number> | null>(null);
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
  const setSlot = useCallback<PyramidChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const { grid, xAxis, yAxis, tooltip, skeleton } = slots;

  /*
   * Each place a name can go takes its room from somewhere different: `above`
   * off the top of every band, `center` out of the middle of the plot, `start`
   * off the left edge.
   */
  const gutter = yAxis && labelPlacement === 'center' ? CENTRE_GUTTER : 0;
  const labelInset = yAxis && labelPlacement === 'above' ? LABEL_ROW : 0;
  const left = yAxis && labelPlacement === 'start' ? CATEGORY_GUTTER : PADDING.left;
  const plotWidth = Math.max(width - left - PADDING.right, 0);
  const plotHeight = Math.max(width / aspectRatio - PADDING.top - PADDING.bottom, 0);
  const rowCount = loading ? Math.max(1, skeleton?.rows ?? (data.length || SKELETON_ROWS)) : data.length;
  const band = rowCount > 0 ? plotHeight / rowCount : 0;

  const extentMax = useMemo(
    () => sharedMax(data, series.map(({ key }) => key), maxValue),
    [data, series, maxValue]
  );
  // While loading the stubs have a scale of their own: a stub's length is a share of a wing.
  const domainMax = loading ? 1 : extentMax;
  const base = gutterUnits(domainMax, plotWidth, gutter);
  const wing = (plotWidth - gutter) / 2;
  const floor = wing > 0 ? (minBarLength / wing) * domainMax : 0;
  const thickness = barThickness(band, labelInset, barGap, barWidth);

  const definition = useMemo(() => {
    const bySeries = new Map(series.map((entry) => [entry.key, entry]));
    const rows: WingRow[] = data.flatMap((datum, index) =>
      series.flatMap(({ key, side }) => {
        const value = datum[key];
        if (typeof value !== 'number' || Number.isNaN(value)) return [];
        const [x1, x2] = wingSpan(value, side, base, floor);
        return [{ index, series: key, side, value, x1, x2 }];
      })
    );

    const indexes = Array.from({ length: rowCount }, (_unused, index) => index);
    const stubRows: WingRow[] =
      loading && skeleton
        ? indexes.flatMap((index) =>
            (['start', 'end'] as const).map((side) => {
              const [x1, x2] = wingSpan(SKELETON_LENGTH, side, base);
              return { index, series: side, side, value: SKELETON_LENGTH, x1, x2 };
            })
          )
        : [];

    const bars = barX(rows, {
      x1: 'x1',
      x2: 'x2',
      y: 'index',
      z: 'series',
      key: (row: WingRow) => `${row.index}:${row.series}`,
      fill: (row: WingRow) => bySeries.get(row.series)?.fill ?? COLOR_VAR['chart-1'],
      radius: (row: WingRow) => outwardCorners(row.side, bySeries.get(row.series)?.radius ?? cornerRadius),
      maxThickness: thickness,
      states: [
        {
          when: { focus: 'unmatched' as const },
          style: { fillOpacity: fadedOpacity },
          transition: { type: 'tween' as const, duration: 120, easing: 'ease-out' as const },
        },
      ],
    });

    const stubMark = barX(stubRows, {
      id: SKELETON_MARK,
      x1: 'x1',
      x2: 'x2',
      y: 'index',
      z: 'series',
      key: (row: WingRow) => `${row.index}:${row.series}`,
      fill: 'var(--muted)',
      radius: (row: WingRow) => outwardCorners(row.side, cornerRadius),
      maxThickness: thickness,
      motion: false as const,
    });

    const rules = grid
      ? ruleX(
          wingTicks(domainMax, grid.columns).flatMap((value) => [-(base + value), base + value]),
          {
            id: 'pyramid-chart-grid',
            stroke: 'var(--border)',
            strokeOpacity: grid.opacity,
            strokeDasharray: grid.dashArray,
            motion: false as const,
          }
        )
      : null;
    // The solid line both wings are measured from. A gutter has names standing where it would go.
    const centre =
      grid?.centreLine && gutter === 0
        ? ruleX([0], { id: 'pyramid-chart-centre', stroke: 'var(--border)', strokeOpacity: grid.opacity, motion: false as const })
        : null;

    const interactive = tooltip !== undefined && !loading && rows.length > 0;
    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          content(points: readonly ChartPoint<WingRow, number, number>[]) {
            const { formatValue, formatX, labels } = tooltip.latest.current;
            const first = points[0]?.datum;
            const datum = first ? data[first.index] : undefined;
            return {
              title: datum ? (formatX ? formatX(datum) : String(datum[xDataKey] ?? '')) : '',
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
      marks: [...(rules ? [rules] : []), ...(centre ? [centre] : []), loading ? stubMark : bars],
      scales: {
        x: { scale: scaleLinear([-(domainMax + base), domainMax + base], [0, 1]), nice: false },
        y: { scale: scaleBand(indexes, [0, 1]).paddingInner(0).paddingOuter(0) },
      },
      guides: false as const,
      // A name's line comes off every band, so the bars move down by half of it, and
      // moving the two margins by the same amount leaves the bands as tall as they were.
      margin: {
        top: PADDING.top + labelInset / 2,
        bottom: PADDING.bottom - labelInset / 2,
        left,
        right: PADDING.right,
      },
      focusRing: false,
      /*
       * Rows grow out one after another and all finish inside the one duration:
       * the window each gets is what is left after the last one's delay.
       */
      motion: (context: ChartMotionContext<WingRow>) => {
        if (context.phase !== 'enter') {
          return { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } };
        }
        if (context.role !== 'bar') return false as const;
        const row = context.datum?.index ?? 0;
        return {
          delay: rowCount > 1 ? (row / rowCount) * animationDuration * STAGGER_SHARE : 0,
          transition: {
            type: 'tween' as const,
            duration: animationDuration * (1 - (rowCount > 1 ? STAGGER_SHARE : 0)),
            easing: 'ease-out' as const,
          },
        };
      },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive && readout
        ? { focus: 'group-y' as const, maxFocusDistance: Number.POSITIVE_INFINITY, tooltip: readout }
        : {}),
    });
  }, [
    data,
    xDataKey,
    series,
    loading,
    rowCount,
    domainMax,
    base,
    floor,
    thickness,
    gutter,
    labelInset,
    left,
    cornerRadius,
    fadedOpacity,
    animationDuration,
    domainDuration,
    grid,
    tooltip,
    skeleton,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Pyramid chart, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;

  const context = useMemo<PyramidChartContextValue>(
    () => ({ data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex }),
    [data, xDataKey, series, setSeries, removeSeries, setSlot, activeIndex]
  );

  const spokenRow = (datum: PyramidChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [xDataKey, ...series.map(({ key }) => key)]
      .filter((key) => datum[key] !== null && datum[key] !== undefined)
      .map((key) => `${key}, ${datum[key]}`)
      .join('. ');

  // The chart also reports a row again when the data is rebuilt under it. Only a
  // change of row is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<WingRow, number, number> | null) =>
    reportActive(point ? point.datum.index : -1);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => reportActive(-1), [revision, status]);

  // Without a readout nothing can read a row, and the chart keeps a keyboard or drag focus it holds.
  const readable = tooltip !== undefined;
  useEffect(() => {
    if (readable) return;
    interactionRef.current?.setControlledFocus(null);
    reportActive(-1);
  }, [readable]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the rows it crosses, and the last one stays until
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

  // Centred on its tick, then held inside the chart: the outermost tick is on the
  // plot's edge, where a centred box would hang half its width off the side.
  const tickLeft = (x: number) => Math.max(0, Math.min(x - AXIS_LABEL_WIDTH / 2, width - AXIS_LABEL_WIDTH));
  const centre = left + plotWidth / 2;
  const axisTicks =
    xAxis && !loading && wing > 0
      ? [
          { key: 'centre', value: 0, x: centre },
          ...wingTicks(extentMax, xAxis.ticks ?? 2).flatMap((value, index, all) => {
            const reach = gutter / 2 + (wing * (index + 1)) / all.length;
            return [
              { key: `start-${index}`, value, x: centre - reach },
              { key: `end-${index}`, value, x: centre + reach },
            ];
          }),
        ]
      : [];
  const formatTick = xAxis?.format ?? compactNumber;

  // A placeholder count that differs from the data has no names to line up with.
  const names = yAxis && width > 0 && band > 0 && rowCount === data.length ? data : [];
  const nameBox = (index: number): { left: number; width: number; top: number; height: number } => {
    const top = PADDING.top + index * band;
    if (labelPlacement === 'above') return { left: 0, width, top, height: LABEL_ROW };
    if (labelPlacement === 'center') return { left: centre - CENTRE_GUTTER / 2, width: CENTRE_GUTTER, top, height: band };
    return { left: 0, width: Math.max(left - 8, 0), top, height: band };
  };
  const nameAlign = labelPlacement === 'start' ? 'flex-end' : 'center';

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pyramid-chart',
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
              data-slot="pyramid-chart-plot"
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
                  // An entrance only grows from the centre on a chart's first paint,
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
                  data-slot="pyramid-chart-skeleton"
                  aria-hidden
                  className={slotClasses.sweepClip()}
                  style={{ clipPath: `path('${stubs}')` }}
                >
                  <style>{KEYFRAMES}</style>
                  <div
                    className={slotClasses.sweep()}
                    style={{ animation: `panelui-pyramid-sweep ${skeleton.duration}ms linear infinite` }}
                  />
                </div>
              ) : null}
              {axisTicks.length ? (
                <div data-slot="pyramid-chart-x-axis" aria-hidden className={slotClasses.overlay({ className: xAxis?.className })}>
                  {axisTicks.map(({ key, value, x }) => (
                    <span key={key} className={slotClasses.tick()} style={{ left: tickLeft(x), width: AXIS_LABEL_WIDTH }}>
                      {formatTick(value)}
                    </span>
                  ))}
                </div>
              ) : null}
              {names.length ? (
                <div data-slot="pyramid-chart-y-axis" aria-hidden className={slotClasses.overlay({ className: yAxis?.className })}>
                  {names.map((datum, index) => (
                    <span key={index} className={slotClasses.name()} style={{ ...nameBox(index), justifyContent: nameAlign }}>
                      {yAxis?.format ? yAxis.format(datum, index) : String(datum[xDataKey] ?? '')}
                    </span>
                  ))}
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

  return <PyramidChartContext.Provider value={context}>{element}</PyramidChartContext.Provider>;
});
PyramidChartRoot.displayName = 'PyramidChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface PyramidChartGridProps {
  /** How many lines to draw on each wing. */
  columns?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
  /** Draw the solid line down the middle. A gutter between the wings leaves it out. */
  centreLine?: boolean;
}

/** Mirrored reference lines, plus the solid line both wings are measured from. */
function PyramidChartGrid({
  columns = 2,
  dashArray = '4 6',
  opacity = 1,
  centreLine = true,
}: PyramidChartGridProps) {
  const { setSlot } = useChart('PyramidChart.Grid');
  useEffect(() => {
    setSlot('grid', { columns, dashArray, opacity, centreLine });
    return () => setSlot('grid', undefined);
  }, [columns, dashArray, opacity, centreLine, setSlot]);
  return null;
}
PyramidChartGrid.displayName = 'PyramidChart.Grid';

export interface PyramidChartBarProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Which wing it grows into. */
  side?: PyramidChartSide;
  /**
   * Which of the theme's roles the series is drawn in. Defaults to a different
   * one per side, so two bars with nothing but a key and a side are told apart.
   */
  color?: PyramidChartColor;
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/** One wing. */
function PyramidChartBar({
  dataKey,
  side = 'end',
  color,
  cornerRadius,
}: PyramidChartBarProps) {
  const { setSeries, removeSeries } = useChart('PyramidChart.Bar');
  const fill = COLOR_VAR[color ?? (side === 'start' ? 'chart-2' : 'chart-1')];
  useEffect(() => {
    setSeries({ key: dataKey, fill, side, radius: cornerRadius });
  }, [dataKey, fill, side, cornerRadius, setSeries]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
PyramidChartBar.displayName = 'PyramidChart.Bar';

export interface PyramidChartSkeletonProps {
  /**
   * How many placeholder rows to draw. Defaults to one per row of data, and to
   * five when the data has not arrived.
   */
  rows?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The loading state: equal stubs either side of the centre, with a highlight
 * travelling across them. Equal, because wings of differing lengths cannot be
 * told from real data.
 *
 * The highlight is a child translated inside a clip of the stubs' outlines, so
 * the loop runs on the compositor and repaints nothing.
 */
function PyramidChartSkeleton({
  rows,
  duration = 1400,
}: PyramidChartSkeletonProps) {
  const { setSlot } = useChart('PyramidChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { rows, duration });
    return () => setSlot('skeleton', undefined);
  }, [rows, duration, setSlot]);
  return null;
}
PyramidChartSkeleton.displayName = 'PyramidChart.Skeleton';

export interface PyramidChartXAxisProps {
  /** How many labels per wing, not counting the zero in the middle. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** Added to the layer holding the labels. */
  className?: string;
}

/**
 * The value labels along the bottom: the same magnitudes twice, either side of a
 * zero, because both wings are read outward from the centre.
 */
function PyramidChartXAxis({
  ticks = 2,
  format,
  className,
}: PyramidChartXAxisProps) {
  const { setSlot } = useChart('PyramidChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format, className });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, className, setSlot]);
  return null;
}
PyramidChartXAxis.displayName = 'PyramidChart.XAxis';

export interface PyramidChartYAxisProps {
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: PyramidChartDatum, index: number) => string;
  /** Added to the layer holding the names. */
  className?: string;
}

/** The category names, one per row. `labelPlacement` on the chart decides where they sit. */
function PyramidChartYAxis({
  format,
  className,
}: PyramidChartYAxisProps) {
  const { setSlot } = useChart('PyramidChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { format, className });
    return () => setSlot('yAxis', undefined);
  }, [format, className, setSlot]);
  return null;
}
PyramidChartYAxis.displayName = 'PyramidChart.YAxis';

export interface PyramidChartTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: PyramidChartDatum) => string;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a row, pressing or dragging across
 * them, or the arrow keys. A click or a tap pins the reading until the next press
 * elsewhere or Escape. The whole plot is the hit area, and the other rows fade.
 */
function PyramidChartTooltip({
  formatValue,
  formatX,
  labels,
  className,
}: PyramidChartTooltipProps) {
  const { setSlot } = useChart('PyramidChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, labels });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
PyramidChartTooltip.displayName = 'PyramidChart.Tooltip';

export interface PyramidChartLegendProps extends ComponentProps<'div'> {
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/** A swatch and a name per series, in the order the series were declared. */
function PyramidChartLegend({ labels, className, render, ...props }: PyramidChartLegendProps & RenderProp<'div'>) {
  const { series } = useChart('PyramidChart.Legend');
  const slots = pyramidChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pyramid-chart-legend',
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
PyramidChartLegend.displayName = 'PyramidChart.Legend';

export interface PyramidChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
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
   * `PyramidChart.Legend` on a chart that has a header: the legend sits over the
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
 * header can show a total at rest and a row's figures while one is read.
 */
function PyramidChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: PyramidChartHeaderProps & RenderProp<'div'>) {
  const { series } = useChart('PyramidChart.Header');
  const slots = pyramidChartVariants();
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
        'data-slot': 'pyramid-chart-header',
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
PyramidChartHeader.displayName = 'PyramidChart.Header';

export const PyramidChart = Object.assign(PyramidChartRoot, {
  Header: PyramidChartHeader,
  Grid: PyramidChartGrid,
  Bar: PyramidChartBar,
  Skeleton: PyramidChartSkeleton,
  XAxis: PyramidChartXAxis,
  YAxis: PyramidChartYAxis,
  Tooltip: PyramidChartTooltip,
  Legend: PyramidChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  PyramidChartHeader,
  PyramidChartGrid,
  PyramidChartBar,
  PyramidChartSkeleton,
  PyramidChartXAxis,
  PyramidChartYAxis,
  PyramidChartTooltip,
  PyramidChartLegend,
};
