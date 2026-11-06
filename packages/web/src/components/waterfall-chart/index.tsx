'use client';

/**
 * WaterfallChart — how a run of changes carried one total to another.
 *
 * ```tsx
 * <WaterfallChart data={bridge}>
 *   <WaterfallChart.Grid />
 *   <WaterfallChart.Connectors />
 *   <WaterfallChart.Bars />
 *   <WaterfallChart.XAxis />
 *   <WaterfallChart.Tooltip />
 * </WaterfallChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's WaterfallChart, so a chart
 * written for one reads the same in the other. What differs is what the web
 * changes: a colour is named by the theme's role, a step is read by hovering,
 * tapping or dragging, a click pins the reading, and the arrow keys walk the run.
 *
 * ## Every bar but a total floats
 *
 * A step's bar starts where the previous one ended, so the gap under it is the
 * running total it acts on. A total is a reading rather than a change, so it is
 * measured from the baseline. Each bar grows from its own start towards its end,
 * because a step is a movement between two balances.
 *
 * ## The connectors are the sequence
 *
 * Without them the bars are a row of rectangles at unexplained heights. Each runs
 * from the middle of one band to the middle of the next, and the bars are drawn
 * over them, so the line reads as passing behind the run.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Bars`, `Connectors` and the rest draw nothing themselves. Each one
 * tells the root what it wants, and the root builds one chart definition from
 * them. They are found by context, so a part can be wrapped in a component of
 * your own. It also means the chart draws in the browser, in a box its
 * `aspectRatio` has reserved.
 */
import {
  barX,
  barY,
  defineChart,
  link,
  text,
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
import {
  waterfallExtent,
  waterfallKinds,
  waterfallReaches,
  waterfallSteps as resolveSteps,
  type WaterfallDatum as StepDatum,
  type WaterfallKind,
  type WaterfallStep as ResolvedStep,
} from './waterfall-steps';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type WaterfallChartStatus = 'loading' | 'ready';
export type WaterfallChartOrientation = 'vertical' | 'horizontal';
export type { WaterfallKind };

/** Which of the theme's roles a bar is drawn in. */
export type WaterfallChartColor =
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

export type WaterfallDatum = StepDatum<WaterfallChartColor>;
export type WaterfallStep = ResolvedStep<WaterfallChartColor>;

/** The running totals every step sits on, for a header or a table beside the chart. */
export const waterfallSteps = (data: readonly WaterfallDatum[]): WaterfallStep[] => resolveSteps(data);

const COLOR_VAR: Record<WaterfallChartColor, string> = {
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

const waterfallChartVariants = tv({
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
const SKELETON_LENGTH = 0.18;

/** Bands to draw when there is no data yet to count them from. */
const SKELETON_BARS = 6;

const SKELETON_MARK = 'waterfall-chart-skeleton';

/** How much of the entrance goes to staggering the bands. */
const STAGGER_SHARE = 0.45;

/** How long a connector takes to appear, once the bar it leaves has finished growing. */
const CONNECTOR_FADE = 120;

/** How far a written value sits off the end of its bar, in pixels. */
const VALUE_OFFSET = { above: -6, below: 15 };

/** What a stub stands on: no step yet, and a length that is a share of the axis. */
const STUB_STEP: WaterfallStep = {
  datum: { label: '', value: 0 },
  label: '',
  value: SKELETON_LENGTH,
  kind: 'total',
  start: 0,
  end: SKELETON_LENGTH,
};

const KEYFRAMES = '@keyframes panelui-waterfall-sweep{from{transform:translateX(-100%)}to{transform:translateX(250%)}}';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** A total is a reading, so it has no sign. On a change the sign is the reading. */
const signedNumber = (step: WaterfallStep) =>
  step.kind === 'total' ? compactNumber(step.value) : `${step.value > 0 ? '+' : ''}${compactNumber(step.value)}`;

const KIND_NAMES: Record<WaterfallKind, string> = { rise: 'Increase', fall: 'Decrease', total: 'Total' };

/** One bar: a resolved step and the band it stands in. */
interface StepRow {
  index: number;
  step: WaterfallStep;
}

/**
 * What the parts have asked for. An axis formatter is part of the drawing, so a
 * new one redraws it. The readout's are read through `latest` when it opens, so a
 * new one costs nothing.
 */
interface Slots {
  grid?: { rows: number; dashArray: string; opacity: number };
  bars?: { cornerRadius: number | undefined };
  connectors?: { dashArray: string; strokeWidth: number; opacity: number };
  xAxis?: Pick<WaterfallChartXAxisProps, 'ticks' | 'format'>;
  yAxis?: { ticks: number; format: WaterfallChartYAxisProps['format'] };
  values?: { format: WaterfallChartValuesProps['format'] };
  tooltip?: {
    className: string | undefined;
    latest: { current: Pick<WaterfallChartTooltipProps, 'formatValue' | 'formatTotal' | 'labels'> };
  };
  skeleton?: { bars: number | undefined; duration: number };
}

interface WaterfallChartContextValue {
  steps: readonly WaterfallStep[];
  colors: Record<WaterfallKind, string>;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
}

const WaterfallChartContext = createContext<WaterfallChartContextValue | null>(null);

function useChart(component: string): WaterfallChartContextValue {
  const context = useContext(WaterfallChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <WaterfallChart>`);
  }
  return context;
}

/**
 * The step being read, for something rendered inside the chart. A readout outside
 * it takes `onActiveIndexChange` instead.
 */
export function useWaterfallChart() {
  const { steps, activeIndex } = useChart('useWaterfallChart');
  return {
    activeIndex,
    activeStep: activeIndex >= 0 ? (steps[activeIndex] ?? null) : null,
  };
}

/**
 * Holds a non-zero step at the smallest length it may be drawn. A step that rounds
 * to nothing still happened. The floor is in pixels, so it is applied once the
 * scales have placed the bar, and the bar's far end is the end that moves. A step
 * wholly past a cropped `domain` stays at nothing, because its change is off the plot.
 */
function withMinimumLength<TMark extends ChartMark<StepRow, number, number, number, number>>(
  mark: TMark,
  floor: number,
  horizontal: boolean,
  domain: readonly [number, number] | undefined
): TMark {
  const adjust = (node: SceneNode): SceneNode => {
    if (node.kind === 'group') return { ...node, children: node.children.map(adjust) };
    if (node.kind !== 'rect' || !node.interaction?.point) return node;
    const { step } = node.interaction.point.datum as StepRow;
    const length = horizontal ? node.width : node.height;
    if (step.end === step.start || length >= floor || !waterfallReaches(step, domain)) return node;
    const forward = step.end > step.start;
    return horizontal
      ? { ...node, width: floor, x: forward ? node.x : node.x + length - floor }
      : { ...node, height: floor, y: forward ? node.y + length - floor : node.y };
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

/**
 * Takes a mark out of the reading. The chart counts each connector and written
 * value as a point, so the arrow keys would stop on them and never reach the last band.
 */
function withoutPoints<TMark extends ChartMark<StepRow, number, number, number, number>>(mark: TMark): TMark {
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

export interface WaterfallChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The steps, in the order they happen. The chart never sorts them. */
  data: readonly WaterfallDatum[];
  /**
   * `loading` holds the bars back and grows them in when it turns `ready`. Add a
   * `WaterfallChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: WaterfallChartStatus;
  /** The plot's width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow in. */
  animationDuration?: number;
  /** Milliseconds for the bars and the axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the value axis instead of deriving it. The derived axis always includes
   * zero, and bar lengths cannot be compared on one that does not.
   */
  yDomain?: [number, number];
  /** `vertical` stands the bars up; `horizontal` lays the run down the side. */
  orientation?: WaterfallChartOrientation;
  /** Fraction of each band left empty, `0` to `1`. */
  barGap?: number;
  /** Largest bar thickness in pixels. Derived from the band when omitted. */
  barWidth?: number;
  /** Corner radius on the ends of a bar. */
  cornerRadius?: number;
  /** Smallest length a non-zero bar is drawn at, in pixels. */
  minBarLength?: number;
  /** Opacity of the bars that are not being read. */
  fadedOpacity?: number;
  /** Which of the theme's roles a step that adds is drawn in. */
  riseColor?: WaterfallChartColor;
  /** Which of the theme's roles a step that subtracts is drawn in. */
  fallColor?: WaterfallChartColor;
  /** Which of the theme's roles a `total` step is drawn in. */
  totalColor?: WaterfallChartColor;
  /**
   * The step being read, and `-1`/`null` when there is none. Fires when the index
   * changes, not per frame.
   */
  onActiveIndexChange?: (index: number, step: WaterfallStep | null) => void;
  /** Drop the axis padding, for a run with no axis or readout. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one step. Defaults to its name, change and balance. */
  labelForDatum?: (step: WaterfallStep, index: number) => string;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface WaterfallChartHandle {
  replay: () => void;
}

const WaterfallChartRoot = forwardRef<WaterfallChartHandle, WaterfallChartProps & RenderProp<'div'>>(function WaterfallChartRoot(
  {
    data,
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    orientation = 'vertical',
    barGap = 0.34,
    barWidth,
    cornerRadius = 4,
    minBarLength = 2,
    fadedOpacity = 0.3,
    riseColor = 'success',
    fallColor = 'destructive',
    totalColor = 'chart-1',
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
  const slotClasses = waterfallChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [stubs, setStubs] = useState('');
  const interactionRef = useRef<ChartInteractionController<StepRow, number, number> | null>(null);
  const dragRelease = useRef<AbortController | null>(null);

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

  const setSlot = useCallback<WaterfallChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const horizontal = orientation === 'horizontal';
  const { grid, bars: barsSlot, connectors, xAxis, yAxis, values, tooltip, skeleton } = slots;

  const steps = useMemo(() => waterfallSteps(data), [data]);
  const colors = useMemo<Record<WaterfallKind, string>>(
    () => ({ rise: COLOR_VAR[riseColor], fall: COLOR_VAR[fallColor], total: COLOR_VAR[totalColor] }),
    [riseColor, fallColor, totalColor]
  );

  const definition = useMemo(() => {
    const rows: StepRow[] = steps.map((step, index) => ({ index, step }));
    const links = rows.slice(0, -1);

    const showStubs = loading && skeleton !== undefined;
    const bands = loading ? Math.max(1, skeleton?.bars ?? (steps.length || SKELETON_BARS)) : steps.length;
    const indexes = Array.from({ length: bands }, (_unused, index) => index);
    const stubRows: StepRow[] = showStubs ? indexes.map((index) => ({ index, step: STUB_STEP })) : [];

    const fillOf = ({ datum, kind }: WaterfallStep) => (datum.color ? COLOR_VAR[datum.color] : colors[kind]);

    const shared = {
      key: (row: StepRow) => row.index,
      fill: (row: StepRow) => fillOf(row.step),
      radius: barsSlot?.cornerRadius ?? cornerRadius,
      maxThickness: barWidth,
      states: [
        {
          when: { focus: 'unmatched' as const },
          style: { fillOpacity: fadedOpacity },
          transition: { type: 'tween' as const, duration: 120, easing: 'ease-out' as const },
        },
      ],
    };
    const drawn = horizontal
      ? barX(rows, { ...shared, y: 'index', x1: (row: StepRow) => row.step.start, x2: (row: StepRow) => row.step.end })
      : barY(rows, { ...shared, x: 'index', y1: (row: StepRow) => row.step.start, y2: (row: StepRow) => row.step.end });
    const shaped = minBarLength > 0 ? withMinimumLength(drawn, minBarLength, horizontal, yDomain) : drawn;

    const stubShared = {
      id: SKELETON_MARK,
      key: (row: StepRow) => row.index,
      fill: 'var(--muted)',
      radius: cornerRadius,
      maxThickness: barWidth,
      motion: false as const,
    };
    const stubMark = horizontal
      ? barX(stubRows, { ...stubShared, y: 'index', x1: 0, x2: SKELETON_LENGTH })
      : barY(stubRows, { ...stubShared, x: 'index', y1: 0, y2: SKELETON_LENGTH });

    const connectorStyle = connectors
      ? {
          key: (row: StepRow) => row.index,
          stroke: 'var(--muted-foreground)',
          strokeOpacity: connectors.opacity,
          strokeWidth: connectors.strokeWidth,
          strokeDasharray: connectors.dashArray,
        }
      : null;
    const connectorMark = connectorStyle
      ? horizontal
        ? withoutPoints(
            link(links, {
              ...connectorStyle,
              y1: 'index',
              y2: (row: StepRow) => row.index + 1,
              x1: (row: StepRow) => row.step.end,
              x2: (row: StepRow) => row.step.end,
            })
          )
        : withoutPoints(
            link(links, {
              ...connectorStyle,
              x1: 'index',
              x2: (row: StepRow) => row.index + 1,
              y1: (row: StepRow) => row.step.end,
              y2: (row: StepRow) => row.step.end,
            })
          )
      : null;

    // Sideways the bars run across the plot, and a number at the end of one lands on the next band's name.
    const valueMark =
      values && !horizontal
        ? withoutPoints(
            text(rows, {
              key: (row: StepRow) => row.index,
              x: 'index',
              y: (row: StepRow) => row.step.end,
              text: (row: StepRow) => (values.format ? values.format(row.step, row.index) : signedNumber(row.step)),
              fill: 'var(--foreground)',
              fontSize: 12,
              fontWeight: 500,
              anchor: 'middle',
              dy: (row: StepRow) => (row.step.end >= row.step.start ? VALUE_OFFSET.above : VALUE_OFFSET.below),
              motion: false as const,
            })
          )
        : null;

    const categoryLabel = (index: number) => {
      const step = steps[index];
      if (!step) return '';
      return xAxis?.format ? xAxis.format(step, index) : step.label;
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
              ...(xAxis?.ticks && !horizontal ? { values: indexes.filter((index) => index % categoryStride === 0) } : {}),
            },
          }
        : (false as const),
    };

    const valueTicks = yAxis?.ticks ?? grid?.rows;
    const valueFormat = (value: number) => {
      if (loading) return '';
      return yAxis?.format ? yAxis.format(value) : compactNumber(value);
    };
    const valueAxisShown = !horizontal && yAxis !== undefined;
    const valueOptions = {
      // While loading the stubs need a scale of their own: their length is a
      // share of the axis, and there may be no values yet to derive one from.
      // Clamped so a bar past a cropped `yDomain` stops at the plot's edge.
      scale: scaleLinear(loading ? [0, 1] : waterfallExtent(steps, yDomain), [0, 1]).clamp(true),
      nice: !loading && !yDomain,
      grid: grid ? { stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray } : false,
      axis: valueAxisShown
        ? {
            line: false as const,
            tickLabels: { opacity: 1 },
            ticks: { size: 0, format: valueFormat, ...(valueTicks ? { count: valueTicks } : {}) },
          }
        : horizontal && valueTicks
          ? { line: false as const, ticks: { size: 0, count: valueTicks, format: () => '' } }
          : (false as const),
    };

    const interactive = tooltip !== undefined && barsSlot !== undefined && !loading && rows.length > 0;
    const readout = tooltip
      ? {
          use: chartTooltip,
          className: tooltip.className,
          content(points: readonly ChartPoint<StepRow, number, number>[]) {
            const { formatValue, formatTotal, labels } = tooltip.latest.current;
            const point = points[0];
            if (!point) return { title: '', rows: [] };
            const { step } = point.datum;
            const balance = formatTotal
              ? formatTotal(step)
              : step.kind === 'total'
                ? null
                : compactNumber(step.end);
            return {
              title: step.label,
              rows: [
                {
                  label: labels?.[step.kind] ?? KIND_NAMES[step.kind],
                  value: formatValue ? formatValue(step) : signedNumber(step),
                  color: fillOf(step),
                },
                ...(balance === null ? [] : [{ label: labels?.balance ?? 'Balance', value: balance }]),
              ],
            };
          },
        }
      : undefined;

    return defineChart({
      theme: THEME,
      marks: loading
        ? [stubMark]
        : [...(connectorMark ? [connectorMark] : []), ...(barsSlot ? [shaped] : []), ...(valueMark ? [valueMark] : [])],
      scales: horizontal ? { x: valueOptions, y: categoryOptions } : { x: categoryOptions, y: valueOptions },
      ...(compact ? { guides: false as const, margin: 0 } : {}),
      ...(loading && !horizontal && yAxis ? { margin: { left: LOADING_GUTTER } } : {}),
      focusRing: false,
      /*
       * Bars grow in one after another and all finish inside the one duration: the
       * window each gets is what is left after the last one's delay. A connector
       * waits for the bar it leaves, because a line to a bar that is not there yet
       * points at nothing. Only these arrive, so a replay does not fade the axis in.
       */
      motion: (context: ChartMotionContext<StepRow>) => {
        if (context.phase !== 'enter') {
          return { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } };
        }
        if (context.role !== 'bar' && context.role !== 'link') return false as const;
        const band = context.datum?.index ?? 0;
        const stagger = bands > 1 ? STAGGER_SHARE : 0;
        const delay = bands > 1 ? (band / bands) * animationDuration * STAGGER_SHARE : 0;
        const duration = animationDuration * (1 - stagger);
        return context.role === 'bar'
          ? { delay, transition: { type: 'tween' as const, duration, easing: 'ease-out' as const } }
          : {
              delay: delay + duration,
              transition: { type: 'tween' as const, duration: CONNECTOR_FADE, easing: 'ease-out' as const },
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
    steps,
    colors,
    loading,
    horizontal,
    barGap,
    barWidth,
    cornerRadius,
    minBarLength,
    fadedOpacity,
    yDomain?.[0],
    yDomain?.[1],
    compact,
    animationDuration,
    domainDuration,
    grid,
    barsSlot,
    connectors,
    xAxis,
    yAxis,
    values,
    tooltip,
    skeleton,
  ]);

  // Marks take their timing from the definition. This one is what the readout
  // moves with, and it should keep up with the pointer.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const summary = label ?? `Waterfall chart, ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`;

  const context = useMemo<WaterfallChartContextValue>(
    () => ({ steps, colors, setSlot, activeIndex }),
    [steps, colors, setSlot, activeIndex]
  );

  const spokenRow = (step: WaterfallStep, index: number) =>
    labelForDatum?.(step, index) ??
    (step.kind === 'total'
      ? `${step.label}. Total, ${step.value}.`
      : `${step.label}. ${KIND_NAMES[step.kind]} of ${Math.abs(step.value)}, from ${step.start} to ${step.end}.`);

  // The chart also reports a band again when the data is rebuilt under it. Only a
  // change of band is news, and repeating it can loop a caller that keeps the step.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (steps[index] ?? null) : null);
  };
  const onFocusChange = (point: ChartPoint<StepRow, number, number> | null) =>
    reportActive(point ? point.datum.index : -1);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => reportActive(-1), [revision, status]);

  // Without a readout nothing can read a step, and the chart keeps a keyboard or drag focus it holds.
  const readable = tooltip !== undefined && barsSlot !== undefined;
  useEffect(() => {
    if (readable) return;
    interactionRef.current?.setControlledFocus(null);
    reportActive(-1);
  }, [readable]);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the bands it crosses, and the last one stays until
   * the next press, the same as a tap's. A vertical drag never gets here: `pan-y`
   * gives it to the page, and the browser cancels the pointer.
   */
  // Cleared as well as aborted: a controller left in the ref after the chart is
  // hidden mid-drag (by Activity, say) would stop any later drag from releasing.
  useEffect(
    () => () => {
      dragRelease.current?.abort();
      dragRelease.current = null;
    },
    []
  );
  const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !readable || loading) return;
    const interaction = interactionRef.current;
    const target = interaction?.resolvePointer(event.clientX, event.clientY);
    if (!interaction || !target) return;
    interaction.setControlledFocus(target);
    if (dragRelease.current) return;
    const release = new AbortController();
    dragRelease.current = release;
    document.addEventListener(
      'pointerdown',
      () => {
        dragRelease.current = null;
        interactionRef.current?.setControlledFocus(null);
      },
      { capture: true, once: true, signal: release.signal }
    );
  };

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'waterfall-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {steps.map((step, index) => (
                  <li key={index}>{spokenRow(step, index)}</li>
                ))}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="waterfall-chart-plot"
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
                  // An entrance only grows on a chart's first paint, so the bars
                  // arriving after a load, or a replay, are a new chart.
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
                  data-slot="waterfall-chart-skeleton"
                  aria-hidden
                  className={slotClasses.sweepClip()}
                  style={{ clipPath: `path('${stubs}')` }}
                >
                  <style>{KEYFRAMES}</style>
                  <div
                    className={slotClasses.sweep()}
                    style={{ animation: `panelui-waterfall-sweep ${skeleton.duration}ms linear infinite` }}
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

  return <WaterfallChartContext.Provider value={context}>{element}</WaterfallChartContext.Provider>;
});
WaterfallChartRoot.displayName = 'WaterfallChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface WaterfallChartGridProps {
  /** Roughly how many lines to draw across the value axis. */
  rows?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Lines across the value axis, so a bar can be read against a number. */
function WaterfallChartGrid({
  rows = 4,
  dashArray = '4 6',
  opacity = 1,
}: WaterfallChartGridProps) {
  const { setSlot } = useChart('WaterfallChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, opacity, setSlot]);
  return null;
}
WaterfallChartGrid.displayName = 'WaterfallChart.Grid';

export interface WaterfallChartBarsProps {
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/** The bars. Each is coloured by its kind, or by the step's own `color`. */
function WaterfallChartBars({
  cornerRadius,
}: WaterfallChartBarsProps) {
  const { setSlot } = useChart('WaterfallChart.Bars');
  useEffect(() => {
    setSlot('bars', { cornerRadius });
    return () => setSlot('bars', undefined);
  }, [cornerRadius, setSlot]);
  return null;
}
WaterfallChartBars.displayName = 'WaterfallChart.Bars';

export interface WaterfallChartConnectorsProps {
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** The stroke's width in pixels. */
  strokeWidth?: number;
  /** Opacity of the lines. */
  opacity?: number;
}

/** The lines from each bar's end to the next band. They always pass behind the bars. */
function WaterfallChartConnectors({
  dashArray = '3 4',
  strokeWidth = 1,
  opacity = 1,
}: WaterfallChartConnectorsProps) {
  const { setSlot } = useChart('WaterfallChart.Connectors');
  useEffect(() => {
    setSlot('connectors', { dashArray, strokeWidth, opacity });
    return () => setSlot('connectors', undefined);
  }, [dashArray, strokeWidth, opacity, setSlot]);
  return null;
}
WaterfallChartConnectors.displayName = 'WaterfallChart.Connectors';

export interface WaterfallChartSkeletonProps {
  /**
   * How many placeholder bars to draw. Defaults to one per step, and to six when
   * the data has not arrived.
   */
  bars?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
}

/**
 * The loading state: a row of short, equal stubs on the baseline, with a highlight
 * travelling across them. Floating them would invent a set of running totals.
 *
 * The highlight is a child translated inside a clip of the stubs' outlines, so
 * the loop runs on the compositor and repaints nothing.
 */
function WaterfallChartSkeleton({
  bars,
  duration = 1400,
}: WaterfallChartSkeletonProps) {
  const { setSlot } = useChart('WaterfallChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { bars, duration });
    return () => setSlot('skeleton', undefined);
  }, [bars, duration, setSlot]);
  return null;
}
WaterfallChartSkeleton.displayName = 'WaterfallChart.Skeleton';

export interface WaterfallChartXAxisProps {
  /**
   * How many labels to show. Every step by default, thinned only when the bands
   * get too narrow to read. Pass a number to force it lower.
   */
  ticks?: number;
  /** Turn a step into its label. Defaults to its `label`. */
  format?: (step: WaterfallStep, index: number) => string;
}

/** The step names under the bands. Sideways, `YAxis` has them. */
function WaterfallChartXAxis({
  ticks,
  format,
}: WaterfallChartXAxisProps) {
  const { setSlot } = useChart('WaterfallChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
WaterfallChartXAxis.displayName = 'WaterfallChart.XAxis';

export interface WaterfallChartYAxisProps {
  /** Roughly how many labels to show along the value axis. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Value labels down the side. Sideways, the side is the step axis, so the names go there. */
function WaterfallChartYAxis({
  ticks = 4,
  format,
}: WaterfallChartYAxisProps) {
  const { setSlot } = useChart('WaterfallChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
WaterfallChartYAxis.displayName = 'WaterfallChart.YAxis';

export interface WaterfallChartValuesProps {
  /** Format a step's number. Defaults to a signed compact number. */
  format?: (step: WaterfallStep, index: number) => string;
}

/**
 * Each step's change, written just past the end of its bar. Upright only: sideways
 * a number at the end of a bar lands on the next band's name.
 */
function WaterfallChartValues({
  format,
}: WaterfallChartValuesProps) {
  const { setSlot } = useChart('WaterfallChart.Values');
  useEffect(() => {
    setSlot('values', { format });
    return () => setSlot('values', undefined);
  }, [format, setSlot]);
  return null;
}
WaterfallChartValues.displayName = 'WaterfallChart.Values';

export interface WaterfallChartTooltipProps {
  /** Format the step's change. Defaults to a signed compact number. */
  formatValue?: (step: WaterfallStep) => string;
  /** Format the running total line. Return `null` to drop it. */
  formatTotal?: (step: WaterfallStep) => string | null;
  /** Names for the three kinds and for the running total line. */
  labels?: Partial<Record<WaterfallKind | 'balance', string>>;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a band, pressing or dragging across
 * them, or the arrow keys. A click or a tap pins the reading until the next press
 * elsewhere or Escape. It reports what the step changed by and what the balance
 * stood at afterwards, and the whole plot is the hit area.
 */
function WaterfallChartTooltip({
  formatValue,
  formatTotal,
  labels,
  className,
}: WaterfallChartTooltipProps) {
  const { setSlot } = useChart('WaterfallChart.Tooltip');
  const latest = useLatest({ formatValue, formatTotal, labels });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
WaterfallChartTooltip.displayName = 'WaterfallChart.Tooltip';

export interface WaterfallChartLegendProps extends ComponentProps<'div'> {
  /** Names for the three kinds. Defaults to Increase, Decrease and Total. */
  labels?: Partial<Record<WaterfallKind, string>>;
}

/** A swatch and a name per kind the run contains, so a run with no totals lists no colour for them. */
function WaterfallChartLegend({
  labels,
  className,
  render,
  ...props
}: WaterfallChartLegendProps & RenderProp<'div'>) {
  const { steps, colors } = useChart('WaterfallChart.Legend');
  const slots = waterfallChartVariants();
  const kinds = waterfallKinds(steps);

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'waterfall-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: kinds.map((kind) => (
          <span key={kind} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colors[kind] }} />
            {labels?.[kind] ?? KIND_NAMES[kind]}
          </span>
        )),
      },
      props
    ),
  });

  return kinds.length ? element : null;
}
WaterfallChartLegend.displayName = 'WaterfallChart.Legend';

export interface WaterfallChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the run is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a total. */
  caption?: ReactNode;
  /** Names for the three kinds, as the legend takes. */
  labels?: Partial<Record<WaterfallKind, string>>;
  /**
   * Draw a swatch and a name per kind along the trailing edge. Prefer this to
   * `WaterfallChart.Legend` on a chart that has a header: the legend sits over the
   * plot, in the corner the bars also want.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the run is of, what it reads and what the colours
 * mean. The value is not derived here. A readout that follows the pointer takes it
 * from `onActiveIndexChange` and passes the string down, so one header can show the
 * closing balance at rest and a step's change while one is read.
 */
function WaterfallChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: WaterfallChartHeaderProps & RenderProp<'div'>) {
  const { steps, colors } = useChart('WaterfallChart.Header');
  const slots = waterfallChartVariants();
  const kinds = waterfallKinds(steps);
  const trailing =
    children ??
    (legend && kinds.length
      ? kinds.map((kind) => (
          <span key={kind} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colors[kind] }} />
            {labels?.[kind] ?? KIND_NAMES[kind]}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'waterfall-chart-header',
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
WaterfallChartHeader.displayName = 'WaterfallChart.Header';

export const WaterfallChart = Object.assign(WaterfallChartRoot, {
  Header: WaterfallChartHeader,
  Grid: WaterfallChartGrid,
  Connectors: WaterfallChartConnectors,
  Bars: WaterfallChartBars,
  Skeleton: WaterfallChartSkeleton,
  XAxis: WaterfallChartXAxis,
  YAxis: WaterfallChartYAxis,
  Values: WaterfallChartValues,
  Tooltip: WaterfallChartTooltip,
  Legend: WaterfallChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  WaterfallChartHeader,
  WaterfallChartGrid,
  WaterfallChartConnectors,
  WaterfallChartBars,
  WaterfallChartSkeleton,
  WaterfallChartXAxis,
  WaterfallChartYAxis,
  WaterfallChartValues,
  WaterfallChartTooltip,
  WaterfallChartLegend,
};
