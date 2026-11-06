'use client';

/**
 * BumpChart — how a set of things ranked against each other over time.
 *
 * ```tsx
 * <BumpChart data={standings} xDataKey="week" defaultHighlight="harbour">
 *   <BumpChart.Grid />
 *   <BumpChart.Line dataKey="harbour" label="Harbour" color="chart-3" />
 *   <BumpChart.Line dataKey="northside" label="Northside" />
 *   <BumpChart.YAxis />
 *   <BumpChart.XAxis />
 *   <BumpChart.Labels />
 *   <BumpChart.Tooltip />
 * </BumpChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's BumpChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a column is read by hovering, tapping or
 * dragging, and the arrow keys walk the columns. `Standings` is only here: a
 * page has the room for a table, and it never covers the lines it describes.
 *
 * ## Positions, not values
 *
 * The y-axis is the rank, so the rows are evenly spaced whatever the gap between
 * the underlying scores. Pass the ranks directly, or pass the scores with
 * `values="score"` and each column is ranked for you, highest first.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Line`, the axes and `Tooltip` draw nothing themselves. Each one tells
 * the root what it wants, and the root builds one chart definition from them.
 * The margins are fixed rather than measured, so the names and the skeleton,
 * which are HTML over the drawing, know where every row is without waiting for
 * it to be drawn.
 */
import {
  crosshair,
  defineChart,
  lineY,
  ruleX,
  ruleY,
  type ChartCurve,
  type ChartInteractionController,
  type ChartMark,
  type ChartMotionContext,
  type ChartPoint,
  type SceneNode,
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

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type BumpChartStatus = 'loading' | 'ready';
export type BumpChartDatum = Record<string, string | number | null | undefined>;

/** Ranks per series key, one entry per row. `null` where a series has none. */
export type BumpRanks = Record<string, (number | null)[]>;

/** Which of the theme's roles a series is drawn in. */
export type BumpChartColor =
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

const COLOR_VAR: Record<BumpChartColor, string> = {
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

const MUTED = 'var(--muted-foreground)';

const THEME = {
  foreground: 'var(--foreground)',
  muted: MUTED,
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const bumpChartVariants = tv({
  slots: {
    root: 'w-full text-foreground @container',
    // Beside the chart where there is room for the table, under it where there is not.
    layout:
      'relative grid w-full grid-cols-1 @md:has-[[data-slot=bump-chart-standings]]:grid-cols-[minmax(0,1fr)_9.5rem] @md:has-[[data-slot=bump-chart-standings]]:gap-x-3',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [--ts-chart-tooltip-background:var(--popover)] [--ts-chart-tooltip-border-radius:var(--radius-xl)] [--ts-chart-tooltip-border:1px_solid_var(--border)] [--ts-chart-tooltip-color:var(--popover-foreground)] [--ts-chart-tooltip-shadow:var(--shadow-lg)] [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    sweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
    sweep:
      'absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--chart-1)_55%,transparent),transparent)] motion-reduce:hidden',
    skeletonRow: 'absolute h-1 -translate-y-1/2 rounded-full bg-muted',
    labels: 'pointer-events-none absolute inset-0 col-start-1 row-start-2',
    label:
      'pointer-events-auto absolute left-0 top-0 flex h-5 items-center truncate rounded-sm text-left text-xs outline-none transition-[transform,color] ease-in-out focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
    standings: 'relative col-start-1 row-start-3 mt-3 w-full @md:col-start-2 @md:row-start-2 @md:mt-0',
    standingsRow:
      'absolute inset-x-0 top-0 grid h-[30px] grid-cols-[1.5rem_0.5rem_minmax(0,1fr)_auto] items-center gap-1.5 border-t border-border text-left text-xs outline-none transition-transform ease-in-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none',
    standingsRank: 'text-muted-foreground tabular-nums',
    standingsMove: 'tabular-nums text-muted-foreground',
    legend:
      'pointer-events-none absolute right-2 top-1 col-start-1 row-start-2 flex gap-3 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    header: 'col-span-full col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Space round the plot, in pixels. */
const PADDING = { top: 8, right: 10, bottom: 32, left: 10 };

/** Left margin kept for `#1`…`#12`, gutter included. */
const Y_AXIS_WIDTH = 42;

/** Gap between the last column and the names. */
const LABELS_GAP = 12;

const DEFAULT_LABELS_WIDTH = 84;

/** Margin on every side of a chart with no axes, which keeps the dots whole. */
const COMPACT_MARGIN = 6;

/** How far the lines that are not picked out fade back. */
const DIMMED_OPACITY = 0.5;

/** Height of a row of the standings. Their order is drawn by moving them, so it has to be known. */
const STANDINGS_ROW = 30;

/** Rows to stand in for when there is no data yet to count them from. */
const SKELETON_ROWS = 4;

const SKELETON_THICKNESS = 4;

/*
 * The lines are drawn in from the left. Only the lines: the axes and the guides
 * are already there, and the clip is measured against the whole drawing so a
 * line that starts late is not revealed late as well.
 */
const STYLES = `@keyframes panelui-bump-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@keyframes panelui-bump-reveal{from{clip-path:inset(0 100% 0 0) view-box}to{clip-path:inset(0 0 0 0) view-box}}
@media (prefers-reduced-motion:no-preference){[data-slot=bump-chart-plot][data-revealing] .ts-chart__line{animation:panelui-bump-reveal var(--bump-reveal) ease-out both}}`;

const defaultRank = (rank: number) => '#' + rank;

/** Horizontal tangents at both ends of a segment, which is what makes the S between two ranks. */
const BUMP_CURVE: ChartCurve = {
  line: (points) =>
    points
      .map(([x, y], index) => {
        if (index === 0) return `M${x},${y}`;
        const [previousX, previousY] = points[index - 1]!;
        const middle = (previousX + x) / 2;
        return `C${middle},${previousY} ${middle},${y} ${x},${y}`;
      })
      .join(''),
  // A line never asks for this, and the type has no way to leave it out.
  area: () => '',
};

const finite = (value: BumpChartDatum[string]) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Each series' rank in every row.
 *
 * With `values: 'rank'` the rows already hold ranks and they are only
 * validated. With `values: 'score'` each row is ranked highest first; a tie
 * keeps the order the keys are passed in, so two equal scores never draw on
 * top of each other.
 */
export function bumpRanks(
  data: readonly BumpChartDatum[],
  keys: readonly string[],
  options: { values?: 'rank' | 'score' } = {}
): BumpRanks {
  const ranks: BumpRanks = Object.fromEntries(keys.map((key) => [key, [] as (number | null)[]]));
  for (const row of data) {
    if (options.values === 'score') {
      const scored = keys
        .flatMap((key, order) => {
          const score = finite(row[key]);
          return score === undefined ? [] : [{ key, order, score }];
        })
        .sort((a, b) => b.score - a.score || a.order - b.order);
      const place = new Map(scored.map(({ key }, index) => [key, index + 1]));
      for (const key of keys) ranks[key]!.push(place.get(key) ?? null);
    } else {
      for (const key of keys) {
        const rank = finite(row[key]);
        ranks[key]!.push(rank !== undefined && rank >= 1 ? rank : null);
      }
    }
  }
  return ranks;
}

/** One point of a line: a series' rank in one column. */
interface BumpRow {
  index: number;
  series: string;
  rank: number | null;
}

interface SeriesEntry {
  key: string;
  color: string;
  label: string;
  strokeWidth: number;
  showDots: boolean;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a new one redraws it.
 * The readout's are read through `latest` when it opens, so a new one costs nothing.
 */
interface Slots {
  grid?: { vertical: boolean; horizontal: boolean; dashArray: string; opacity: number };
  xAxis?: Pick<BumpChartXAxisProps, 'ticks' | 'format'>;
  yAxis?: Pick<BumpChartYAxisProps, 'format'>;
  labels?: { width: number };
  standings?: true;
  tooltip?: { className: string | undefined; latest: { current: Pick<BumpChartTooltipProps, 'formatRank' | 'formatX'> } };
  skeleton?: { rows: number | undefined; duration: number };
}

interface BumpChartContextValue {
  data: readonly BumpChartDatum[];
  xDataKey: string;
  series: readonly SeriesEntry[];
  setSeries: (entry: SeriesEntry) => void;
  removeSeries: (key: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  status: BumpChartStatus;
  ranks: BumpRanks;
  /** Where a rank is drawn, in pixels from the top of the plot. */
  rowY: (rank: number) => number;
  /** The drawn box of the plot, in pixels. */
  box: { left: number; top: number; width: number; height: number };
  morphDuration: number;
  highlight: string | null;
  setHighlight: (key: string | null) => void;
  activeIndex: number;
}

const BumpChartContext = createContext<BumpChartContextValue | null>(null);

function useChart(component: string): BumpChartContextValue {
  const context = useContext(BumpChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BumpChart>`);
  }
  return context;
}

/**
 * The column being read and the line picked out, for something rendered inside
 * the chart. A readout outside it takes `onActiveIndexChange` instead.
 */
export function useBumpChart() {
  const { data, activeIndex, xDataKey, ranks, highlight, setHighlight } = useChart('useBumpChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
    ranks,
    highlight,
    setHighlight,
  };
}

/** The dots have one size and no opacity of their own on the mark, so they are set once placed. */
function withDots<TMark extends ChartMark<BumpRow, number, number, number, number>>(
  mark: TMark,
  { radius, opacity }: { radius: number; opacity: number }
): TMark {
  const adjust = (node: SceneNode): SceneNode => {
    if (node.kind === 'group') return { ...node, children: node.children.map(adjust) };
    if (node.kind !== 'dot') return node;
    return { ...node, radius, style: { ...node.style, fillOpacity: opacity } };
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

export interface BumpChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a column: a week, a round, a release. */
  data: readonly BumpChartDatum[];
  /** Key holding the column's label. */
  xDataKey?: string;
  /**
   * What the series columns hold. `rank` takes them as places, `1` at the top.
   * `score` ranks every row for you, highest first.
   */
  values?: 'rank' | 'score';
  /**
   * The series drawn in its colour and on top, with the rest muted. `null` picks
   * none, and every line keeps its own colour. Controlled: pair it with
   * `onHighlightChange`.
   */
  highlight?: string | null;
  /** The series picked out on first render, when `highlight` is not passed. */
  defaultHighlight?: string | null;
  /** Called when a name in `Labels` or a row of `Standings` is pressed. */
  onHighlightChange?: (key: string | null) => void;
  /**
   * `loading` hides the lines and shows `BumpChart.Skeleton` if there is one.
   * The lines are drawn in from the left when it turns `ready`.
   */
  status?: BumpChartStatus;
  /** The plot's width ÷ height. */
  aspectRatio?: number;
  /** Milliseconds for the lines to draw in. */
  animationDuration?: number;
  /** Milliseconds for the lines to move to new places when the data changes. */
  morphDuration?: number;
  /**
   * The column being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: BumpChartDatum | null) => void;
  /** Drop the axis padding, for a chart with no axes. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one column. Defaults to its label and every series' rank. */
  labelForDatum?: (datum: BumpChartDatum, index: number) => string;
}

/** Imperative handle: re-run the draw-in, for a "replay" control. */
export interface BumpChartHandle {
  replay: () => void;
}

const BumpChartRoot = forwardRef<BumpChartHandle, BumpChartProps & RenderProp<'div'>>(function BumpChartRoot(
  {
    data,
    xDataKey = 'date',
    values = 'rank',
    highlight: highlightProp,
    defaultHighlight = null,
    onHighlightChange,
    status = 'ready',
    aspectRatio = 1.7,
    animationDuration = 700,
    morphDuration = 500,
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
  const slotClasses = bumpChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [series, setSeriesState] = useState<readonly SeriesEntry[]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [revealedKey, setRevealedKey] = useState('');
  const [ownHighlight, setOwnHighlight] = useState(defaultHighlight);
  const interactionRef = useRef<ChartInteractionController<BumpRow, number, number> | null>(null);
  const dragging = useRef(false);

  const highlight = highlightProp === undefined ? ownHighlight : highlightProp;
  const setHighlight = useCallback(
    (key: string | null) => {
      setOwnHighlight(key);
      onHighlightChange?.(key);
    },
    [onHighlightChange]
  );

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
  const setSlot = useCallback<BumpChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const { grid, xAxis, yAxis, labels, standings, tooltip, skeleton } = slots;

  const seriesKeys = series.map(({ key }) => key).join('\n');
  const ranks = useMemo(
    () => bumpRanks(data, seriesKeys ? seriesKeys.split('\n') : [], { values }),
    [data, seriesKeys, values]
  );

  /** How many places there are: the lowest rank anybody holds. */
  const dataRows = useMemo(
    () => Math.max(1, ...Object.values(ranks).flatMap((column) => column.flatMap((rank) => rank ?? []))),
    [ranks]
  );
  const rows = loading ? Math.max(1, skeleton?.rows ?? Math.max(dataRows, SKELETON_ROWS)) : dataRows;

  const margin = compact
    ? { top: COMPACT_MARGIN, right: COMPACT_MARGIN, bottom: COMPACT_MARGIN, left: COMPACT_MARGIN }
    : {
        ...PADDING,
        left: yAxis ? Y_AXIS_WIDTH : PADDING.left,
        right: labels ? labels.width + LABELS_GAP : PADDING.right,
      };
  const marginKey = `${margin.top}:${margin.right}:${margin.bottom}:${margin.left}`;

  const interactive = (tooltip !== undefined || standings !== undefined) && !loading && data.length > 0;

  const definition = useMemo(() => {
    const columns = Array.from({ length: data.length }, (_unused, index) => index);
    const places = Array.from({ length: rows }, (_unused, index) => index + 1);

    const guides = grid
      ? [
          ...(grid.vertical
            ? [ruleX(columns, { x: (index: number) => index, stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray, motion: false as const })]
            : []),
          ...(grid.horizontal
            ? [ruleY(places, { y: (place: number) => place, stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray, motion: false as const })]
            : []),
        ]
      : [];

    // The picked line goes last, so it sits on top of every crossing.
    const ordered = highlight
      ? [...series.filter(({ key }) => key !== highlight), ...series.filter(({ key }) => key === highlight)]
      : series;
    const lines = ordered.map(({ key, color, strokeWidth, showDots }) => {
      const picked = highlight === key;
      const dimmed = highlight !== null && !picked;
      const rowsOfLine: BumpRow[] = (ranks[key] ?? []).map((rank, index) => ({ index, series: key, rank }));
      const opacity = dimmed ? DIMMED_OPACITY : 1;
      return withDots(
        lineY(rowsOfLine, {
          id: `bump-line:${key}`,
          key: 'index',
          x: 'index',
          y: 'rank',
          curve: BUMP_CURVE,
          points: showDots,
          stroke: dimmed ? MUTED : color,
          strokeOpacity: opacity,
          strokeWidth: picked ? strokeWidth + 1 : strokeWidth,
        }),
        { radius: picked ? 3.5 : 2.5, opacity }
      );
    });

    const count = Math.min(xAxis?.ticks ?? 4, columns.length);
    const step = count > 1 ? (columns.length - 1) / (count - 1) : 0;
    const tickValues = Array.from({ length: count }, (_unused, index) => Math.round(index * step));
    const columnLabel = (index: number) => {
      const datum = data[index];
      if (!datum) return '';
      return xAxis?.format ? xAxis.format(datum, index) : String(datum[xDataKey] ?? '');
    };

    const xOptions = {
      // One column has no span to be spread over, so it stands in the middle.
      scale: scaleLinear(columns.length > 1 ? [0, columns.length - 1] : [-1, 1], [0, 1]),
      nice: false,
      grid: false as const,
      axis:
        xAxis && !compact
          ? { line: false as const, tickLabels: { opacity: 1 }, ticks: { size: 0, padding: 12, values: tickValues, format: columnLabel } }
          : (false as const),
    };
    const yOptions = {
      // Reversed, so the first place is at the top. One row stands in the middle.
      scale: scaleLinear(rows > 1 ? [rows, 1] : [2, 0], [0, 1]),
      nice: false,
      grid: false as const,
      axis:
        yAxis && !compact
          ? {
              line: false as const,
              tickLabels: { opacity: 1 },
              ticks: {
                size: 0,
                padding: 12,
                values: places,
                format: (place: number) => (loading ? '' : (yAxis.format ?? defaultRank)(place)),
              },
            }
          : (false as const),
    };

    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          content(points: readonly ChartPoint<BumpRow, number, number>[]) {
            const { formatRank = defaultRank, formatX } = tooltip.latest.current;
            const column = points[0]?.datum.index;
            const datum = column === undefined ? undefined : data[column];
            if (column === undefined || !datum) return { title: '', rows: [] };
            return {
              title: formatX ? formatX(datum) : String(datum[xDataKey] ?? ''),
              // The standings at this column. They come from the ranks because the
              // focus only hands over the line under the pointer.
              rows: series
                .flatMap((entry) => {
                  const rank = ranks[entry.key]?.[column];
                  return rank === null || rank === undefined ? [] : [{ entry, rank }];
                })
                .sort((a, b) => a.rank - b.rank)
                .map(({ entry, rank }) => ({
                  active: entry.key === highlight,
                  label: entry.label,
                  value: formatRank(rank),
                  color: drawnColor(entry, highlight),
                })),
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      marks: [
        ...guides,
        ...(loading ? [] : lines),
        ...(interactive ? [crosshair({ y: false, stroke: 'var(--foreground)', strokeOpacity: 0.45, strokeWidth: 1 })] : []),
      ],
      scales: { x: xOptions, y: yOptions },
      margin,
      ...(compact ? { guides: false as const } : {}),
      focusRing: false,
      // The lines arrive by the clip in `STYLES`, and everything else is simply there.
      motion: (context: ChartMotionContext<BumpRow>) =>
        context.phase === 'enter'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: morphDuration, easing: 'ease-in-out' as const } },
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
  }, [data, xDataKey, series, ranks, rows, loading, highlight, compact, morphDuration, interactive, grid, xAxis, yAxis, tooltip, marginKey]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const box = useMemo(() => {
    const height = width / aspectRatio;
    return {
      left: margin.left,
      top: margin.top,
      width: Math.max(width - margin.left - margin.right, 0),
      height: Math.max(height - margin.top - margin.bottom, 0),
    };
    // The margin is rebuilt every render, so it is compared by value.
  }, [width, aspectRatio, marginKey]);

  const rowY = useCallback(
    (rank: number) => box.top + (rows > 1 ? ((rank - 1) / (rows - 1)) * box.height : box.height / 2),
    [box, rows]
  );

  const chartKey = `${revision}:${status}`;
  const summary = label ?? `Bump chart, ${data.length} ${data.length === 1 ? 'column' : 'columns'}`;

  const context = useMemo<BumpChartContextValue>(
    () => ({
      data,
      xDataKey,
      series,
      setSeries,
      removeSeries,
      setSlot,
      status,
      ranks,
      rowY,
      box,
      morphDuration,
      highlight,
      setHighlight,
      activeIndex,
    }),
    [data, xDataKey, series, setSeries, removeSeries, setSlot, status, ranks, rowY, box, morphDuration, highlight, setHighlight, activeIndex]
  );

  const spokenRow = (datum: BumpChartDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [
      String(datum[xDataKey] ?? ''),
      ...series.flatMap(({ key, label: name }) => {
        const rank = ranks[key]?.[index];
        return rank === null || rank === undefined ? [] : [`${name}, rank ${rank}`];
      }),
    ].join('. ');

  // The chart also reports a column again when the data is rebuilt under it. Only a
  // change of column is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<BumpRow, number, number> | null) =>
    reportActive(point ? point.datum.index : -1);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => reportActive(-1), [revision, status]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the columns it crosses, and the last one stays until
   * the next press, the same as a tap's. A vertical drag never gets here: `pan-y`
   * gives it to the page, and the browser cancels the pointer.
   */
  const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !interactive) return;
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

  const stubs = loading && skeleton && box.width > 0;
  const placesDrawn = Array.from({ length: rows }, (_unused, index) => index + 1);

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bump-chart',
        className: slotClasses.root({ className }),
        children: (
          <div className={slotClasses.layout()}>
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
              data-slot="bump-chart-plot"
              data-revealing={!loading && revealedKey !== chartKey ? '' : undefined}
              className={slotClasses.plot()}
              style={{ aspectRatio, ['--bump-reveal' as string]: `${animationDuration}ms` }}
              onAnimationEnd={(event) => {
                if (event.animationName === 'panelui-bump-reveal') setRevealedKey(chartKey);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') interactionRef.current?.setControlledFocus(null);
              }}
              onPointerMove={readDrag}
              onPointerCancel={() => interactionRef.current?.setControlledFocus(null)}
            >
              {width > 0 ? (
                <Chart
                  // The draw-in belongs to a new chart: a load finishing, or a replay.
                  key={chartKey}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ interaction }) => {
                    interactionRef.current = interaction;
                  }}
                />
              ) : null}
              {stubs ? (
                <div data-slot="bump-chart-skeleton" aria-hidden>
                  {placesDrawn.map((place) => (
                    <span
                      key={place}
                      className={slotClasses.skeletonRow()}
                      style={{ left: box.left, top: rowY(place), width: box.width }}
                    />
                  ))}
                  <div
                    className={slotClasses.sweepClip()}
                    style={{
                      clipPath: `path('${placesDrawn
                        .map((place) => `M${box.left},${rowY(place) - SKELETON_THICKNESS / 2}h${box.width}v${SKELETON_THICKNESS}h${-box.width}Z`)
                        .join('')}')`,
                    }}
                  >
                    <div
                      className={slotClasses.sweep()}
                      style={{ animation: `panelui-bump-sweep ${skeleton.duration}ms linear infinite` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            {children}
          </div>
        ),
      },
      props
    ),
  });

  return <BumpChartContext.Provider value={context}>{element}</BumpChartContext.Provider>;
});
BumpChartRoot.displayName = 'BumpChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface BumpChartGridProps {
  /** A guide down every column. */
  vertical?: boolean;
  /** A guide across every rank. */
  horizontal?: boolean;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Guides down each column, so a dot can be read against the label below it. */
function BumpChartGrid({ vertical = true, horizontal = false, dashArray = '3 5', opacity = 1 }: BumpChartGridProps) {
  const { setSlot } = useChart('BumpChart.Grid');
  useEffect(() => {
    setSlot('grid', { vertical, horizontal, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [vertical, horizontal, dashArray, opacity, setSlot]);
  return null;
}
BumpChartGrid.displayName = 'BumpChart.Grid';

export interface BumpChartLineProps {
  /** Column in the data holding this series' rank, or its score with `values="score"`. */
  dataKey: string;
  /** The name shown by `Labels`, `Standings`, the tooltip and the legend. Defaults to `dataKey`. */
  label?: string;
  /** Which of the theme's roles the series is drawn in. */
  color?: BumpChartColor;
  /** Thickness of the line. The picked-out line is drawn one pixel thicker. */
  strokeWidth?: number;
  /** Draw a dot at every column. */
  showDots?: boolean;
}

/**
 * One series. It draws nothing itself: the lines are drawn together, so the one
 * picked out can be drawn last and sit on top of every crossing.
 */
function BumpChartLine({ dataKey, label, color = 'chart-1', strokeWidth = 1.5, showDots = true }: BumpChartLineProps) {
  const { setSeries, removeSeries } = useChart('BumpChart.Line');
  const stroke = COLOR_VAR[color];
  const name = label ?? dataKey;
  useEffect(() => {
    setSeries({ key: dataKey, color: stroke, label: name, strokeWidth, showDots });
  }, [dataKey, stroke, name, strokeWidth, showDots, setSeries]);
  // Apart from the update above, so a new colour keeps the series' place in the order.
  useEffect(() => () => removeSeries(dataKey), [dataKey, removeSeries]);
  return null;
}
BumpChartLine.displayName = 'BumpChart.Line';

export interface BumpChartSkeletonProps {
  /** How many rank rows to stand in for. Defaults to the data's, and at least four. */
  rows?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The loading state: a thin bar on every rank row with a highlight travelling
 * across them. Flat, so it says where the lines will be and nothing about where
 * they go.
 *
 * The highlight is a child translated inside a clip of the bars' outlines, so
 * the loop runs on the compositor and repaints nothing.
 */
function BumpChartSkeleton({ rows, duration = 1400 }: BumpChartSkeletonProps) {
  const { setSlot } = useChart('BumpChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { rows, duration });
    return () => setSlot('skeleton', undefined);
  }, [rows, duration, setSlot]);
  return null;
}
BumpChartSkeleton.displayName = 'BumpChart.Skeleton';

export interface BumpChartXAxisProps {
  /** How many columns to label, spread across the run. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: BumpChartDatum, index: number) => string;
}

/** The column labels along the bottom. */
function BumpChartXAxis({ ticks, format }: BumpChartXAxisProps) {
  const { setSlot } = useChart('BumpChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
BumpChartXAxis.displayName = 'BumpChart.XAxis';

export interface BumpChartYAxisProps {
  /** Format a rank. Defaults to `#1`, `#2`… */
  format?: (rank: number) => string;
}

/** The ranks down the side, one on every row. */
function BumpChartYAxis({ format }: BumpChartYAxisProps) {
  const { setSlot } = useChart('BumpChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { format });
    return () => setSlot('yAxis', undefined);
  }, [format, setSlot]);
  return null;
}
BumpChartYAxis.displayName = 'BumpChart.YAxis';

/** The colour a line is drawn in right now, so a muted line has a muted swatch. */
const drawnColor = (entry: SeriesEntry, highlight: string | null) =>
  highlight !== null && highlight !== entry.key ? MUTED : entry.color;

export interface BumpChartLabelsProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Room kept to the right of the plot for the names. Longer names are cut short. */
  width?: number;
  /** Let pressing a name pick that line out, and pressing it again clear it. */
  pressable?: boolean;
}

/**
 * Each series' name beside its last point, so the lines can be told apart
 * without a legend to look across to. The names move with their lines when the
 * data changes.
 */
function BumpChartLabels({
  width = DEFAULT_LABELS_WIDTH,
  pressable = true,
  className,
  render,
  ...props
}: BumpChartLabelsProps & RenderProp<'div'>) {
  const { series, ranks, rowY, box, status, morphDuration, highlight, setHighlight, setSlot } = useChart('BumpChart.Labels');
  const slots = bumpChartVariants();

  useEffect(() => {
    setSlot('labels', { width });
    return () => setSlot('labels', undefined);
  }, [width, setSlot]);

  const left = box.left + box.width + LABELS_GAP;
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bump-chart-labels',
        className: slots.labels({ className }),
        children: series.flatMap((entry) => {
          const last = (ranks[entry.key] ?? []).filter((rank) => rank !== null).pop();
          if (last === undefined) return [];
          const picked = highlight === entry.key;
          const dimmed = highlight !== null && !picked;
          const shared = {
            className: slots.label({ className: picked ? 'font-semibold' : undefined }),
            style: {
              width,
              // With nothing picked out, each name takes its line's colour, which
              // is the only thing tying it to that line across the crossings.
              color: picked ? 'var(--foreground)' : dimmed ? MUTED : entry.color,
              transform: `translate(${left}px, ${rowY(last) - 10}px)`,
              transitionDuration: `${morphDuration}ms`,
            },
          };
          return pressable ? (
            <button
              key={entry.key}
              type="button"
              aria-pressed={picked}
              onClick={() => setHighlight(picked ? null : entry.key)}
              {...shared}
            >
              <span className="truncate">{entry.label}</span>
            </button>
          ) : (
            <span key={entry.key} {...shared}>
              <span className="truncate">{entry.label}</span>
            </span>
          );
        }),
      },
      props
    ),
  });

  return status === 'loading' ? null : element;
}
BumpChartLabels.displayName = 'BumpChart.Labels';

export interface BumpChartStandingsProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Format a rank. Defaults to `#1`, `#2`… */
  formatRank?: (rank: number) => string;
  /** Show the places gained or lost since the column before. */
  movement?: boolean;
  /** Let pressing a row pick that line out, and pressing it again clear it. */
  pressable?: boolean;
}

/**
 * The table at the column being read, or at the last column when none is. It
 * goes beside the plot where there is room and under it where there is not, and
 * reading the chart reorders it. The rows keep their place in the DOM and are
 * moved with a transform, so keyboard focus does not jump as the order changes.
 */
function BumpChartStandings({
  formatRank = defaultRank,
  movement = true,
  pressable = true,
  className,
  render,
  ...props
}: BumpChartStandingsProps & RenderProp<'div'>) {
  const { data, xDataKey, series, ranks, status, morphDuration, highlight, setHighlight, activeIndex, setSlot } =
    useChart('BumpChart.Standings');
  const slots = bumpChartVariants();

  useEffect(() => {
    setSlot('standings', true);
    return () => setSlot('standings', undefined);
  }, [setSlot]);

  const column = activeIndex >= 0 ? activeIndex : data.length - 1;
  const standing = series
    .flatMap((entry) => {
      const rank = ranks[entry.key]?.[column];
      return rank === null || rank === undefined ? [] : [{ entry, rank }];
    })
    .sort((a, b) => a.rank - b.rank);
  const position = new Map(standing.map(({ entry }, index) => [entry.key, index]));

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bump-chart-standings',
        role: 'group',
        'aria-label': data[column] === undefined ? 'Standings' : `Standings, ${String(data[column][xDataKey] ?? `column ${column + 1}`)}`,
        className: slots.standings({ className }),
        style: { height: standing.length * STANDINGS_ROW },
        children: standing.length
          ? series.flatMap((entry) => {
              const at = position.get(entry.key);
              const rank = ranks[entry.key]?.[column];
              if (at === undefined || rank === null || rank === undefined) return [];
              const before = column > 0 ? ranks[entry.key]?.[column - 1] : null;
              const moved = movement && before !== null && before !== undefined ? before - rank : 0;
              const picked = highlight === entry.key;
              const shared = {
                className: slots.standingsRow({ className: at === 0 ? 'border-t-transparent' : undefined }),
                style: { transform: `translateY(${at * STANDINGS_ROW}px)`, transitionDuration: `${morphDuration / 2}ms` },
              };
              const cells = (
                <>
                  <span className={slots.standingsRank()}>{formatRank(rank)}</span>
                  <span className={slots.legendSwatch()} style={{ background: drawnColor(entry, highlight) }} />
                  <span className={picked ? 'truncate font-semibold' : 'truncate'}>{entry.label}</span>
                  <span className={slots.standingsMove()} style={moved > 0 ? { color: 'var(--success)' } : undefined}>
                    {moved > 0 ? `+${moved}` : moved < 0 ? `−${-moved}` : ''}
                  </span>
                </>
              );
              return pressable ? (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => setHighlight(picked ? null : entry.key)}
                  {...shared}
                >
                  {cells}
                </button>
              ) : (
                <div key={entry.key} {...shared}>
                  {cells}
                </div>
              );
            })
          : null,
      },
      props
    ),
  });

  return status === 'loading' ? null : element;
}
BumpChartStandings.displayName = 'BumpChart.Standings';

export interface BumpChartTooltipProps {
  /** Format a rank in the readout. Defaults to `#1`, `#2`… */
  formatRank?: (rank: number) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: BumpChartDatum) => string;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a column, pressing or dragging across
 * them, or the arrow keys. It lists every series in the order it stood at that
 * column. The whole plot is the hit area, because a readout you have to land on a
 * thin line to summon is one nobody finds.
 */
function BumpChartTooltip({ formatRank, formatX, className }: BumpChartTooltipProps) {
  const { setSlot } = useChart('BumpChart.Tooltip');
  const latest = useLatest({ formatRank, formatX });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
BumpChartTooltip.displayName = 'BumpChart.Tooltip';

export type BumpChartLegendProps = ComponentProps<'div'>;

/** A swatch and a name per series, in the order the series were declared. */
function BumpChartLegend({ className, render, ...props }: BumpChartLegendProps & RenderProp<'div'>) {
  const { series, highlight } = useChart('BumpChart.Legend');
  const slots = bumpChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bump-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: series.map((entry) => (
          <span key={entry.key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: drawnColor(entry, highlight) }} />
            {entry.label}
          </span>
        )),
      },
      props
    ),
  });

  return series.length ? element : null;
}
BumpChartLegend.displayName = 'BumpChart.Legend';

export interface BumpChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a total. */
  caption?: ReactNode;
  /** Draw a swatch and a name per series along the trailing edge. */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of and what it currently reads.
 * The value is not derived here. Pass the formatted string, from
 * `onActiveIndexChange` or `onHighlightChange` if it follows the chart.
 */
function BumpChartHeader({
  title,
  value,
  caption,
  legend = false,
  className,
  children,
  render,
  ...props
}: BumpChartHeaderProps & RenderProp<'div'>) {
  const { series, highlight } = useChart('BumpChart.Header');
  const slots = bumpChartVariants();
  const trailing =
    children ??
    (legend && series.length
      ? series.map((entry) => (
          <span key={entry.key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: drawnColor(entry, highlight) }} />
            {entry.label}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'bump-chart-header',
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
BumpChartHeader.displayName = 'BumpChart.Header';

export const BumpChart = Object.assign(BumpChartRoot, {
  Header: BumpChartHeader,
  Grid: BumpChartGrid,
  Line: BumpChartLine,
  Skeleton: BumpChartSkeleton,
  XAxis: BumpChartXAxis,
  YAxis: BumpChartYAxis,
  Labels: BumpChartLabels,
  Standings: BumpChartStandings,
  Tooltip: BumpChartTooltip,
  Legend: BumpChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  BumpChartHeader,
  BumpChartGrid,
  BumpChartLine,
  BumpChartSkeleton,
  BumpChartXAxis,
  BumpChartYAxis,
  BumpChartLabels,
  BumpChartStandings,
  BumpChartTooltip,
  BumpChartLegend,
};
