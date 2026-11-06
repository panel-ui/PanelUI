'use client';

/**
 * Plot: a chart you assemble, for the chart that is not in the box.
 *
 * ```tsx
 * <Plot data={months} xDataKey="month">
 *   <Plot.Grid />
 *   <Plot.Bars dataKey="orders" color="chart-3" />
 *   <Plot.Line dataKey="revenue" />
 *   <Plot.YAxis />
 *   <Plot.XAxis />
 *   <Plot.Cursor />
 *   <Plot.Tooltip />
 * </Plot>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's Plot, so a chart written for one
 * reads the same in the other. What differs is what the web changes: a colour is
 * named by the theme's role, a row is read by hovering, tapping or dragging, a
 * click pins the reading, and the arrow keys walk the rows.
 *
 * ## One scale, however many marks
 *
 * Every mark reads the same plot box and the same y-domain, and the domain is
 * derived from all of them together. See `plot-scale.ts`.
 *
 * ## Four layers, stacked in one box
 *
 * The marks are one chart definition, drawn in the order they are written. Under
 * them is the grid, which stays out of the reveal because it is the frame the
 * marks arrive into. `Plot.Layer` draws on an SVG directly under or directly over
 * the marks, and those two and the chart are clipped together, so everything is
 * uncovered as one drawing. Over all of that are the axes, the rules and
 * `Plot.Overlay`, which are real text. Parts reach their layer through a portal,
 * so they can be written in any order and wrapped in components of your own.
 */
import {
  areaY,
  barY,
  defineChart,
  dot,
  lineY,
  type ChartInteractionController,
  type ChartMotionContext,
  type ChartPoint,
} from '@tanstack/charts';
import { crosshair } from '@tanstack/charts/crosshair';
import { motion } from '@tanstack/charts/motion';
import { RendererChart } from '@tanstack/charts/react/tooltip';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip as chartTooltip } from '@tanstack/charts/tooltip';
import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  bandOf,
  columnValues,
  compactNumber,
  domainBetween,
  labelledRows,
  plotCurve,
  plotExtent,
  xOf,
  yOf,
  type PlotBound,
  type PlotBox,
  type PlotCurve,
} from './plot-scale';

export {
  areaPath,
  bandOf,
  barPath,
  compactNumber,
  linePath,
  segment,
  xAt,
  xOf,
  yOf,
  type PlotBound,
  type PlotBox,
  type PlotCurve,
  type PlotPoint,
} from './plot-scale';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type PlotStatus = 'loading' | 'ready';
export type PlotDatum = Record<string, string | number | null | undefined>;

/**
 * How the index of a row becomes an x. `point` puts the first and last rows on the
 * plot's own edges, and `band` gives every row an equal slice and centres it.
 */
export type PlotScale = 'point' | 'band';

/** Which of the theme's roles a mark is drawn in. */
export type PlotColor =
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

const COLOR_VAR: Record<PlotColor, string> = {
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

const PALETTE = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'].map((role) => `var(--${role})`);

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: PALETTE,
};

const plotVariants = tv({
  slots: {
    root: 'relative flex w-full flex-col text-foreground',
    // The box comes after the header and the legend, whatever order they are written in.
    box: 'relative order-1 w-full',
    layer: 'pointer-events-none absolute inset-0 size-full overflow-visible',
    reveal: 'absolute inset-0',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    overlay: 'pointer-events-none absolute inset-0',
    userOverlay: 'absolute inset-0 *:pointer-events-auto',
    axisLabel: 'absolute truncate text-xs tabular-nums text-muted-foreground',
    rule: 'absolute',
    ruleLabel: 'absolute whitespace-nowrap text-xs font-medium',
    header: 'flex flex-col gap-0.5',
    headerTitle: 'truncate text-sm text-muted-foreground',
    headerValue: 'truncate text-2xl font-semibold tabular-nums tracking-tight',
    headerCaption: 'truncate text-xs text-muted-foreground',
    legend: 'flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 pb-2 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    // A custom body gets no surface from the chart, so the readout draws its own.
    readout:
      'flex w-max flex-col gap-0.5 rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs tabular-nums text-popover-foreground shadow-lg',
    readoutTitle: 'text-muted-foreground',
    readoutRow: 'flex items-center gap-1.5 text-sm font-semibold',
    readoutSwatch: 'size-1.5 shrink-0 rounded-full',
  },
});

/** Room left around the plot for the axis labels and the markers' rings. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };
const COMPACT_PADDING = { top: 2, right: 1, bottom: 2, left: 1 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Box each x label is centred in. A longer one is truncated rather than shoving. */
const POINT_LABEL_WIDTH = 56;

/** How far past the box the reveal's clip reaches at rest, for strokes and dots on the edge. */
const REVEAL_BLEED = 24;

const REVEAL_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';

/** The chart's `ease-out`, so what is drawn outside it keeps time with the marks. */
const easeOut = (t: number) => 1 - (1 - t) ** 2;

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One row's value for one mark. Null where the column has a gap. */
interface MarkRow {
  index: number;
  value: number | null;
}

type MarkSpec =
  | { kind: 'line'; dataKey: string; color: string; strokeWidth: number; curve?: PlotCurve; dashArray?: string }
  | { kind: 'area'; dataKey: string; color: string; opacity: number; curve?: PlotCurve }
  | { kind: 'bars'; dataKey: string; color: string; gap: number; radius: number; opacity: number; baseline: number }
  | { kind: 'dots'; dataKey: string; color: string; size: number; ringWidth: number };

type RegisteredMark = MarkSpec & { id: string; order: number };

/** Which child of the root a part was written as, so marks draw in written order. */
const OrderContext = createContext(0);

interface Hosts {
  grid: SVGSVGElement | null;
  under: SVGSVGElement | null;
  over: SVGSVGElement | null;
  overlay: HTMLDivElement | null;
}

/** What the root's parts asked for. The readout's formatters are read when it opens. */
interface Slots {
  yAxis?: boolean;
  cursor?: { color: PlotColor | undefined; showLine: boolean };
  tooltip?: {
    className: string | undefined;
    latest: { current: Pick<PlotTooltipProps, 'formatValue' | 'formatX' | 'children'> };
  };
}

/** Everything a mark needs to draw itself. Read it with `usePlot()`. */
export interface PlotGeometry {
  /** The rows, in order. */
  data: readonly PlotDatum[];
  /** Key holding the x label. */
  xDataKey: string;
  /** The drawable box, after the padding and any axis gutter are taken off. */
  plot: PlotBox;
  /** How an index becomes an x. */
  xScale: PlotScale;
  /** `loading` draws nothing but the frame. */
  status: PlotStatus;
  /** Bottom of the y-domain, moving while the domain settles. Draw with this one, so a mark moves with the rest. */
  domainMin: number;
  /** Top of the y-domain, moving while the domain settles. */
  domainMax: number;
  /** The domain being settled on. Labels read this, so they hold still while the marks move. */
  extent: [number, number];
  /** The five theme series colours, as CSS values. */
  palette: readonly string[];
  /** Every mark that registered, as `[dataKey, CSS colour]`. */
  series: readonly [string, string][];
  /** Adds a column of your own to the domain and the legend. */
  registerSeries: (key: string, color: string) => void;
  /** Takes back what `registerSeries` added. */
  unregisterSeries: (key: string, color?: string) => void;
  /** Row being read, or `-1`. */
  activeIndex: number;
}

interface PlotContextValue extends PlotGeometry {
  hosts: Hosts;
  /** Written position of the first mark, which decides which side of the marks a layer falls. */
  firstMarkOrder: number;
  setMark: (mark: RegisteredMark) => void;
  removeMark: (id: string) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
}

const PlotContext = createContext<PlotContextValue | null>(null);

function useChart(component: string): PlotContextValue {
  const context = useContext(PlotContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Plot>`);
  }
  return context;
}

/** The resolved geometry, for a mark of your own. It re-renders on each frame of a domain change. */
export function usePlot(): PlotGeometry {
  return useChart('usePlot');
}

/** The row being read, for a readout drawn inside the plot. */
export function usePlotCursor(): { activeIndex: number; activePoint: PlotDatum | null } {
  const { data, activeIndex } = useChart('usePlotCursor');
  return { activeIndex, activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null };
}

export interface PlotProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a position along the x-axis. */
  data: readonly PlotDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /** `loading` draws the frame and nothing in it, and reveals the marks when it turns `ready`. */
  status?: PlotStatus;
  /** The plot's width ÷ height. `2` is the wide card shape, and `1.6` suits a narrow column. */
  aspectRatio?: number;
  /** Milliseconds for the plot to be uncovered. */
  animationDuration?: number;
  /** Milliseconds for the marks and the y-axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * The y-domain, as `[low, high]`. Either end may be a number to pin it there or
   * `auto` to take it from the data. `[0, 'auto']` keeps the baseline at zero while
   * the top follows whatever arrives.
   */
  yDomain?: [PlotBound, PlotBound];
  /**
   * Round the derived ends of the y-domain out to a step of 1, 2 or 5 times a power
   * of ten, so the axis labels are values a reader can measure against. It only ever
   * widens the axis, and a pinned end is left alone.
   */
  nice?: boolean;
  /**
   * How an index becomes an x. Derived from the marks when left out: a plot with bars
   * in it is banded, and anything else is on points. `Plot.Bars` always needs slices,
   * so it keeps the plot banded even when this says `point`.
   */
  xScale?: PlotScale;
  /** How series are joined between points, unless a mark overrides it. */
  curve?: PlotCurve;
  /**
   * The row being read, and `-1`/`null` when there is none. This is how a readout
   * outside the plot gets its value. Fires when the row changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: PlotDatum | null) => void;
  /** Drop the padding so the marks reach the edges, for a plot with no axis, grid or cursor. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: PlotDatum, index: number) => string;
}

/** Imperative handle: re-run the reveal, for a "replay" control. */
export interface PlotHandle {
  replay: () => void;
}

const PlotRoot = forwardRef<PlotHandle, PlotProps & RenderProp<'div'>>(function PlotRoot(
  {
    data,
    xDataKey = 'label',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    nice = false,
    xScale: xScaleProp,
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
  const slotClasses = plotVariants();
  const boxRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<ChartInteractionController<MarkRow, number, number> | null>(null);
  const releaseDrag = useRef<(() => void) | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [marks, setMarks] = useState<readonly RegisteredMark[]>([]);
  const [extraSeries, setExtraSeries] = useState<readonly [string, string][]>([]);
  const [slots, setSlots] = useState<Slots>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [gridHost, setGridHost] = useState<SVGSVGElement | null>(null);
  const [underHost, setUnderHost] = useState<SVGSVGElement | null>(null);
  const [overHost, setOverHost] = useState<SVGSVGElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLDivElement | null>(null);

  /*
   * The chart mounts once its width is known. Mounted at a guess, the first
   * measurement is a resize, and a resize would redraw the marks under the reveal.
   */
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const read = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setMark = useCallback((mark: RegisteredMark) => {
    setMarks((current) =>
      current.some(({ id }) => id === mark.id)
        ? current.map((entry) => (entry.id === mark.id ? mark : entry))
        : [...current, mark]
    );
  }, []);
  const removeMark = useCallback((id: string) => setMarks((current) => current.filter((entry) => entry.id !== id)), []);
  const setSlot = useCallback<PlotContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );
  const registerSeries = useCallback(
    (key: string, color: string) => setExtraSeries((current) => [...current, [key, color]]),
    []
  );
  const unregisterSeries = useCallback((key: string, color?: string) => {
    setExtraSeries((current) => {
      const matching = current.flatMap((entry, index) =>
        entry[0] === key && (color === undefined || entry[1] === color) ? [index] : []
      );
      const at = matching[matching.length - 1];
      return at === undefined ? current : current.filter((_entry, index) => index !== at);
    });
  }, []);

  const loading = status === 'loading';
  const { cursor, tooltip } = slots;

  // Stable, so a mark that registered later in time still draws where it was written.
  const ordered = useMemo(() => [...marks].sort((a, b) => a.order - b.order), [marks]);
  const firstMarkOrder = ordered[0]?.order ?? Number.POSITIVE_INFINITY;
  const hasBars = ordered.some(({ kind }) => kind === 'bars');
  const xScale: PlotScale = hasBars ? 'band' : (xScaleProp ?? 'point');
  const banded = xScale === 'band';

  // The same key on two marks is one entry, in the colour registered last.
  const series = useMemo<readonly [string, string][]>(() => {
    const byKey = new Map<string, string>();
    for (const { dataKey, color } of ordered) byKey.set(dataKey, color);
    for (const [key, color] of extraSeries) byKey.set(key, color);
    return [...byKey];
  }, [ordered, extraSeries]);

  const seriesKeys = series.map(([key]) => key).join('\n');
  const [yLow, yHigh] = yDomain ?? [];
  const extent = useMemo(
    () =>
      plotExtent(data, seriesKeys ? seriesKeys.split('\n') : [], {
        yDomain: yDomain ? [yLow as PlotBound, yHigh as PlotBound] : undefined,
        hasBars,
        nice,
      }),
    [data, seriesKeys, yLow, yHigh, hasBars, nice]
  );

  /*
   * The marks move with the chart's own motion. This follows them for everything
   * drawn outside it (a rule, a mark of your own), over the same duration.
   */
  const [domain, setDomain] = useState(extent);
  const shown = useRef(extent);
  const [lowEnd, highEnd] = extent;
  useEffect(() => {
    const from = shown.current;
    const settled = from[0] === lowEnd && from[1] === highEnd;
    if (settled) return;
    const land = (next: [number, number]) => {
      shown.current = next;
      setDomain(next);
    };
    // Nothing drawn yet means nothing to move from, so the first real domain lands at once.
    if (marks.length === 0 || loading || prefersReducedMotion()) {
      land([lowEnd, highEnd]);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / Math.max(1, domainDuration));
      land(domainBetween(from, [lowEnd, highEnd], easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [lowEnd, highEnd, marks.length > 0, loading, domainDuration]);

  const hasYAxis = slots.yAxis === true;
  const pad = compact ? COMPACT_PADDING : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
  const plot = useMemo<PlotBox>(
    () => ({
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    }),
    [pad.left, pad.top, pad.right, pad.bottom, size.width, size.height]
  );

  const readable = ordered.length > 0 && data.length > 0 && !loading;
  const interactive = cursor !== undefined && readable;
  const sliceWidth = data.length > 0 ? plot.width / data.length : 0;

  const definition = useMemo(() => {
    const indexes = Array.from({ length: data.length }, (_unused, index) => index);
    const curves = { monotone: plotCurve('monotone'), linear: plotCurve('linear') };

    const drawn = ordered.map((mark) => {
      const rows: MarkRow[] = columnValues(data, mark.dataKey).map((value, index) => ({ index, value }));
      const shared = { id: mark.id, x: 'index' as const, y: 'value' as const };
      const key = (row: MarkRow) => `${mark.id}:${row.index}`;
      const present = rows.filter((row) => row.value !== null);
      switch (mark.kind) {
        case 'line':
          return lineY(rows, {
            ...shared,
            stroke: mark.color,
            strokeWidth: mark.strokeWidth,
            curve: curves[mark.curve ?? curve],
            ...(mark.dashArray ? { strokeDasharray: mark.dashArray } : {}),
          });
        case 'area':
          return areaY(rows, {
            id: mark.id,
            x: 'index' as const,
            y1: lowEnd,
            y2: 'value' as const,
            fill: mark.color,
            fillOpacity: mark.opacity,
            curve: curves[mark.curve ?? curve],
          });
        case 'bars': {
          const base = Math.min(Math.max(mark.baseline, lowEnd), highEnd);
          return barY(present, {
            id: mark.id,
            x: 'index' as const,
            key,
            y1: base,
            y2: 'value' as const,
            fill: mark.color,
            fillOpacity: mark.opacity,
            radius: { end: mark.radius },
            maxThickness: Math.max(1, sliceWidth * (1 - Math.min(Math.max(mark.gap, 0), 0.95))),
          });
        }
        case 'dots':
          return dot(present, {
            ...shared,
            key,
            r: mark.size,
            fill: mark.color,
            stroke: 'var(--background)',
            strokeWidth: mark.ringWidth,
          });
      }
    });

    const guide =
      cursor?.showLine && interactive
        ? [
            crosshair<number, number>({
              x: { stroke: cursor.color ? COLOR_VAR[cursor.color] : 'var(--foreground)', strokeOpacity: 0.45 },
              y: false,
              // It follows the pointer, so it does not take the time a change of data does.
              motion: false,
            }),
          ]
        : [];

    return defineChart({
      theme: THEME,
      marks: loading ? [] : [...drawn, ...guide],
      scales: {
        x: {
          // Whole slices, so a line's point and a bar's centre agree. A bar's width is its own.
          scale: banded ? scaleBand(indexes, [0, 1]) : scalePoint(indexes, [0, 1]),
          axis: false as const,
        },
        y: { scale: scaleLinear([lowEnd, highEnd], [0, 1]), axis: false as const, grid: false as const },
      },
      margin: pad,
      focusRing: false,
      // The reveal uncovers the marks, so all a mark animates is a change of data.
      motion: (context: ChartMotionContext<MarkRow>) =>
        context.phase === 'enter'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } },
      keyboard: interactive,
      pointer: interactive,
      ...(interactive
        ? {
            focus: 'group-x' as const,
            maxFocusDistance: Number.POSITIVE_INFINITY,
            /*
             * There even without a `Plot.Tooltip`, which then draws nothing, because
             * the chart's pinning and its live region both come with this.
             */
            tooltip: {
              use: chartTooltip,
              // Beside the line and along the top, clear of the marks being read.
              anchor: { x: 'value', y: 'plot-top' } as const,
              placement: ['bottom-right', 'bottom-left'] as const,
              offset: 10,
              // Drawn by `renderReadout`. This is what the live region announces.
              content(points: readonly ChartPoint<MarkRow, number, number>[]) {
                const datum = points[0] ? data[points[0].datum.index] : undefined;
                if (!datum) return { rows: [] };
                const { formatValue, formatX } = tooltip?.latest.current ?? {};
                return {
                  title: formatX ? formatX(datum) : String(datum[xDataKey] ?? ''),
                  rows: series.flatMap(([key]) => {
                    const value = datum[key];
                    if (typeof value !== 'number') return [];
                    return [{ label: key, value: formatValue ? formatValue(value, key) : compactNumber(value) }];
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
    ordered,
    series,
    curve,
    banded,
    lowEnd,
    highEnd,
    pad.left,
    pad.top,
    pad.right,
    pad.bottom,
    sliceWidth,
    loading,
    interactive,
    cursor,
    tooltip,
    domainDuration,
  ]);

  // Marks take their timing from the definition. This one is what the readout moves with.
  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  /*
   * One reveal for every mark, as a clip widening over the chart and the layers
   * together. It ends unclipped, because the readout reaches past the box. Nothing
   * is set for the finished state, so reduced motion simply never starts it.
   */
  const plotLeft = plot.left;
  const boxWidth = size.width;
  const playReveal = useCallback(() => {
    const node = revealRef.current;
    if (!node || prefersReducedMotion() || typeof node.animate !== 'function') return;
    const bleed = `-${REVEAL_BLEED}px`;
    node.getAnimations().forEach((animation) => animation.cancel());
    node.animate(
      [
        { clipPath: `inset(${bleed} ${boxWidth - plotLeft}px ${bleed} ${bleed})` },
        { clipPath: `inset(${bleed} ${bleed} ${bleed} ${bleed})` },
      ],
      { duration: animationDuration, easing: REVEAL_EASING }
    );
  }, [animationDuration, boxWidth, plotLeft]);

  useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

  // Plays once, and going back to `loading` arms it again, so a refetch is uncovered too.
  const revealed = useRef(false);
  const ready = boxWidth > 0 && data.length > 0 && !loading;
  useLayoutEffect(() => {
    if (loading) revealed.current = false;
    if (revealed.current || !ready) return;
    revealed.current = true;
    playReveal();
  }, [loading, ready, playReveal]);

  // The chart also reports a row again when the data is rebuilt under it. Only a
  // change of row is news, and repeating it can loop a caller that keeps the datum.
  const reportedIndex = useRef(-1);
  const reportActive = (index: number) => {
    if (reportedIndex.current === index) return;
    reportedIndex.current = index;
    setActiveIndex(index);
    onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
  };
  useEffect(() => {
    if (!interactive) reportActive(-1);
  }, [interactive]);

  // A held reading ends with the next press, or when the plot goes away.
  useEffect(() => () => releaseDrag.current?.(), []);

  /*
   * The chart follows a mouse on its own but not a finger, which it treats as a
   * tap. A sideways drag reads the rows it crosses, and the last one stays until the
   * next press, the same as a tap's. A vertical drag never gets here: `pan-y` gives
   * it to the page, and the browser cancels the pointer.
   */
  const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !interactive) return;
    const interaction = interactionRef.current;
    const target = interaction?.resolvePointer(event.clientX, event.clientY);
    if (!interaction || !target) return;
    interaction.setControlledFocus(target);
    if (releaseDrag.current) return;
    const onPress = () => {
      releaseDrag.current?.();
      interactionRef.current?.setControlledFocus(null);
    };
    document.addEventListener('pointerdown', onPress, { capture: true });
    releaseDrag.current = () => {
      document.removeEventListener('pointerdown', onPress, { capture: true });
      releaseDrag.current = null;
    };
  };

  const renderReadout = (index: number) => {
    const datum = data[index];
    if (!datum) return null;
    const { formatValue, formatX, children: draw } = tooltip?.latest.current ?? {};
    return (
      <div data-slot="plot-readout" className={slotClasses.readout({ className: tooltip?.className })}>
        {draw ? (
          draw(datum, index)
        ) : (
          <>
            <div className={slotClasses.readoutTitle()}>{formatX ? formatX(datum) : String(datum[xDataKey] ?? '')}</div>
            {series.map(([key, color]) => {
              const value = datum[key];
              if (typeof value !== 'number') return null;
              return (
                <div key={key} className={slotClasses.readoutRow()}>
                  {series.length > 1 ? (
                    <span className={slotClasses.readoutSwatch()} style={{ background: color }} />
                  ) : null}
                  {formatValue ? formatValue(value, key) : compactNumber(value)}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  const summary = label ?? `Plot, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`;
  const spokenRow = (datum: PlotDatum, index: number) =>
    labelForDatum?.(datum, index) ??
    [xDataKey, ...series.map(([key]) => key)]
      .filter((key) => datum[key] !== null && datum[key] !== undefined)
      .map((key) => `${key}, ${datum[key]}`)
      .join('. ');

  const hosts = useMemo<Hosts>(
    () => ({ grid: gridHost, under: underHost, over: overHost, overlay: overlayHost }),
    [gridHost, underHost, overHost, overlayHost]
  );

  const context = useMemo<PlotContextValue>(
    () => ({
      data,
      xDataKey,
      plot,
      xScale,
      status,
      domainMin: domain[0],
      domainMax: domain[1],
      extent: [lowEnd, highEnd],
      palette: PALETTE,
      series,
      registerSeries,
      unregisterSeries,
      activeIndex,
      hosts,
      firstMarkOrder,
      setMark,
      removeMark,
      setSlot,
    }),
    [
      data,
      xDataKey,
      plot,
      xScale,
      status,
      domain,
      lowEnd,
      highEnd,
      series,
      registerSeries,
      unregisterSeries,
      activeIndex,
      hosts,
      firstMarkOrder,
      setMark,
      removeMark,
      setSlot,
    ]
  );

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'plot',
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
              ref={boxRef}
              data-slot="plot-box"
              className={slotClasses.box()}
              style={{ aspectRatio }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') interactionRef.current?.setControlledFocus(null);
              }}
              onPointerMove={readDrag}
              onPointerCancel={() => interactionRef.current?.setControlledFocus(null)}
            >
              <svg ref={setGridHost} aria-hidden className={slotClasses.layer()} />
              <div ref={revealRef} data-slot="plot-reveal" className={slotClasses.reveal()}>
                <svg ref={setUnderHost} aria-hidden className={slotClasses.layer()} />
                {size.width > 0 ? (
                  <RendererChart
                    definition={definition}
                    renderer={renderer}
                    ariaLabel={summary}
                    aspectRatio={aspectRatio}
                    initialWidth={size.width}
                    className={slotClasses.chart()}
                    onFocusChange={(point) => {
                      const row = point?.datum as MarkRow | undefined;
                      reportActive(row ? row.index : -1);
                    }}
                    onRender={({ interaction }) => {
                      interactionRef.current = interaction as ChartInteractionController<MarkRow, number, number>;
                    }}
                    renderTooltipBody={({ points }) => {
                      const row = points[0]?.datum as MarkRow | undefined;
                      return row && tooltip ? renderReadout(row.index) : null;
                    }}
                  />
                ) : null}
                <svg ref={setOverHost} aria-hidden className={slotClasses.layer()} />
              </div>
              <div ref={setOverlayHost} className={slotClasses.overlay()} />
            </div>
            {Children.map(children, (child, index) => (
              <OrderContext.Provider value={index}>{child}</OrderContext.Provider>
            ))}
          </>
        ),
      },
      props
    ),
  });

  return <PlotContext.Provider value={context}>{element}</PlotContext.Provider>;
});
PlotRoot.displayName = 'Plot';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

/** Tells the root about a mark, keeping its place in the order when its props change. */
function useMark(spec: MarkSpec) {
  const { setMark, removeMark } = useChart(`Plot.${spec.kind}`);
  const id = useId();
  const order = useContext(OrderContext);
  const signature = JSON.stringify(spec);
  useEffect(() => {
    setMark({ ...spec, id, order });
  }, [signature, id, order, setMark]);
  useEffect(() => () => removeMark(id), [id, removeMark]);
}

/* -------------------------------------------------------------------------- */
/* The marks                                                                  */
/* -------------------------------------------------------------------------- */

export interface PlotSeriesProps {
  /** Column of `data` this mark draws. */
  dataKey: string;
  /** Which of the theme's roles the mark is drawn in. */
  color?: PlotColor;
}

export interface PlotLineProps extends PlotSeriesProps {
  /** Thickness of the stroke, in pixels. */
  strokeWidth?: number;
  /** `monotone` never overshoots between points, and `linear` joins them straight. The root's by default. */
  curve?: PlotCurve;
  /** Dash pattern, such as `"6 4"`, for a forecast or a series that is not real yet. */
  dashArray?: string;
}

/** A series as a stroked line. A gap in the column breaks the line. */
function PlotLine({ dataKey, color = 'chart-1', strokeWidth = 2.5, curve, dashArray }: PlotLineProps) {
  useMark({ kind: 'line', dataKey, color: COLOR_VAR[color], strokeWidth, curve, dashArray });
  return null;
}
PlotLine.displayName = 'Plot.Line';

export interface PlotAreaProps extends PlotSeriesProps {
  /** Opacity of the fill. */
  opacity?: number;
  /** `monotone` never overshoots between points, and `linear` joins them straight. The root's by default. */
  curve?: PlotCurve;
}

/** A series as a fill down to the bottom of the plot. Write it before the line it belongs under. */
function PlotArea({ dataKey, color = 'chart-1', opacity = 0.18, curve }: PlotAreaProps) {
  useMark({ kind: 'area', dataKey, color: COLOR_VAR[color], opacity, curve });
  return null;
}
PlotArea.displayName = 'Plot.Area';

export interface PlotBarsProps extends PlotSeriesProps {
  /** Fraction of each slice left empty, `0` to `1`. */
  gap?: number;
  /** Rounds the end the bar grows towards, in pixels. */
  radius?: number;
  /** Opacity of the fill. */
  opacity?: number;
  /**
   * The value the columns grow from, for a chart of movement against a reference.
   * It is clamped into the axis, so a baseline the domain does not cover falls back
   * to the nearer edge.
   */
  baseline?: number;
}

/** A series as columns. Its presence puts the whole plot on a band scale. */
function PlotBars({ dataKey, color = 'chart-1', gap = 0.35, radius = 4, opacity = 1, baseline = 0 }: PlotBarsProps) {
  useMark({ kind: 'bars', dataKey, color: COLOR_VAR[color], gap, radius, opacity, baseline });
  return null;
}
PlotBars.displayName = 'Plot.Bars';

export interface PlotDotsProps extends PlotSeriesProps {
  /** Radius, in pixels. */
  size?: number;
  /** Ring around each dot in the page colour, so it reads on top of the line. */
  ringWidth?: number;
}

/** A dot per row, for a series short enough that its points are worth marking. */
function PlotDots({ dataKey, color = 'chart-1', size = 3.5, ringWidth = 2 }: PlotDotsProps) {
  useMark({ kind: 'dots', dataKey, color: COLOR_VAR[color], size, ringWidth });
  return null;
}
PlotDots.displayName = 'Plot.Dots';

/* -------------------------------------------------------------------------- */
/* The layers                                                                 */
/* -------------------------------------------------------------------------- */

export interface PlotGridProps {
  /** Horizontal rules across the plot. Yields `rows + 1` lines. */
  rows?: number;
  /** The theme role of the lines. The border colour by default. */
  color?: PlotColor;
  /** Dash pattern, such as `"4 6"`. An empty string draws a solid rule. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Horizontal rules, outside the reveal because they are the frame the marks arrive into. */
function PlotGrid({ rows = 4, color, dashArray = '4 6', opacity = 1 }: PlotGridProps) {
  const { plot, hosts } = useChart('Plot.Grid');
  if (!hosts.grid || plot.width <= 0) return null;
  const intervals = Math.max(1, Math.round(rows));
  return createPortal(
    <g
      data-slot="plot-grid"
      opacity={opacity}
      stroke={color ? COLOR_VAR[color] : 'var(--border)'}
      strokeDasharray={dashArray || undefined}
    >
      {Array.from({ length: intervals + 1 }, (_unused, index) => {
        const y = plot.top + (plot.height / intervals) * index;
        return <line key={index} x1={plot.left} x2={plot.left + plot.width} y1={y} y2={y} />;
      })}
    </g>,
    hosts.grid
  );
}
PlotGrid.displayName = 'Plot.Grid';

export interface PlotLayerProps {
  /** SVG elements, in the plot's own pixels. */
  children?: ReactNode;
}

/**
 * Marks of your own, in SVG, uncovered with the rest. Written before the first mark
 * it draws under every mark, and written after it, over them all. It takes no
 * pointer events, so anything that does belongs in `Plot.Overlay`.
 */
function PlotLayer({ children }: PlotLayerProps) {
  const { hosts, firstMarkOrder } = useChart('Plot.Layer');
  const order = useContext(OrderContext);
  const host = order < firstMarkOrder ? hosts.under : hosts.over;
  return host ? createPortal(<g data-slot="plot-layer">{children}</g>, host) : null;
}
PlotLayer.displayName = 'Plot.Layer';

export interface PlotOverlayProps extends ComponentProps<'div'> {}

/** Anything of your own that is text or takes a pointer, laid over the drawing. */
function PlotOverlay({ className, render, ...props }: PlotOverlayProps & RenderProp<'div'>) {
  const { hosts } = useChart('Plot.Overlay');
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      { 'data-slot': 'plot-overlay', className: plotVariants().userOverlay({ className }) },
      props
    ),
  });
  return hosts.overlay ? createPortal(element, hosts.overlay) : null;
}
PlotOverlay.displayName = 'Plot.Overlay';

export interface PlotRuleProps {
  /** Where to draw it, in the data's own units. Wins if `x` is given too. */
  y?: number;
  /** A row to draw a vertical rule at, by index: the day a change landed, the release being read against. */
  x?: number;
  /** A name for what the line means. */
  label?: string;
  /** The theme role of the line and its caption. The foreground colour by default. */
  color?: PlotColor;
  /** Thickness in pixels. */
  strokeWidth?: number;
  /** Break the line into dashes, so it reads as an annotation rather than a series. */
  dashed?: boolean;
  /** Fades the line and its caption together. */
  opacity?: number;
  /** Which end of the rule the caption sits at. */
  labelPlacement?: 'start' | 'end';
  /** Added to the caption. */
  labelClassName?: string;
  /** Added to the rule. */
  className?: string;
}

/**
 * A reference line at a value or a row, with a caption. It hides itself when the
 * value falls outside the axis, rather than pinning to the edge and claiming a
 * number the chart does not cover.
 */
function PlotRule({
  y,
  x,
  label,
  color,
  strokeWidth = 1,
  dashed = false,
  opacity = 1,
  labelPlacement = 'end',
  labelClassName,
  className,
}: PlotRuleProps) {
  const { plot, domainMin, domainMax, status, data, xScale, hosts } = useChart('Plot.Rule');
  if (status === 'loading' || !hosts.overlay || plot.width <= 0) return null;

  const stroke = color ? COLOR_VAR[color] : 'var(--foreground)';
  const slots = plotVariants();
  const border = `${strokeWidth}px ${dashed ? 'dashed' : 'solid'} ${stroke}`;

  if (y !== undefined) {
    const at = yOf(y, plot, domainMin, domainMax);
    if (at < plot.top - 0.5 || at > plot.top + plot.height + 0.5) return null;
    return createPortal(
      <div
        data-slot="plot-rule"
        className={slots.rule({ className })}
        style={{ left: plot.left, width: plot.width, top: at, opacity, borderTop: border }}
      >
        {label ? (
          <span
            className={slots.ruleLabel({ className: labelClassName })}
            style={{ color: stroke, top: 2, ...(labelPlacement === 'start' ? { left: 0 } : { right: 0 }) }}
          >
            {label}
          </span>
        ) : null}
      </div>,
      hosts.overlay
    );
  }

  if (x === undefined || data.length === 0) return null;
  const row = Math.max(0, Math.min(data.length - 1, x));
  const at = xScale === 'band' ? bandOf(row, data.length, plot) : xOf(row, data.length, plot);
  return createPortal(
    <div
      data-slot="plot-rule"
      className={slots.rule({ className })}
      style={{ left: at, top: plot.top, height: plot.height, opacity, borderLeft: border }}
    >
      {label ? (
        <span
          className={slots.ruleLabel({ className: labelClassName })}
          style={{ color: stroke, left: 4, ...(labelPlacement === 'start' ? { top: 0 } : { bottom: 0 }) }}
        >
          {label}
        </span>
      ) : null}
    </div>,
    hosts.overlay
  );
}
PlotRule.displayName = 'Plot.Rule';

export interface PlotXAxisProps {
  /** How many labels to show. The rest are dropped, evenly. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: PlotDatum, index: number) => string;
  /** Added to each label. */
  className?: string;
}

/** Labels along the bottom, each centred on the row it names and held inside the frame. */
function PlotXAxis({ ticks = 4, format, className }: PlotXAxisProps) {
  const { data, xDataKey, plot, xScale, hosts } = useChart('Plot.XAxis');
  if (!hosts.overlay || plot.width <= 0) return null;
  const slots = plotVariants();
  return createPortal(
    <div data-slot="plot-x-axis" aria-hidden>
      {labelledRows(data.length, ticks).map((index) => {
        const datum = data[index];
        if (!datum) return null;
        const x = xScale === 'band' ? bandOf(index, data.length, plot) : xOf(index, data.length, plot);
        return (
          <span
            key={index}
            className={slots.axisLabel({ className })}
            style={{
              bottom: 0,
              width: POINT_LABEL_WIDTH,
              textAlign: 'center',
              left: Math.max(0, Math.min(x - POINT_LABEL_WIDTH / 2, plot.left + plot.width + PADDING.right - POINT_LABEL_WIDTH)),
            }}
          >
            {format ? format(datum, index) : String(datum[xDataKey] ?? '')}
          </span>
        );
      })}
    </div>,
    hosts.overlay
  );
}
PlotXAxis.displayName = 'Plot.XAxis';

export interface PlotYAxisProps {
  /** How many intervals to divide the axis into. Yields `ticks + 1` labels. Give it the same count as the grid. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** Added to each label. */
  className?: string;
}

/**
 * Value labels down the side, one per grid line, with room made for them. They name
 * the domain being settled on, so they hold still while the marks move.
 */
function PlotYAxis({ ticks = 4, format, className }: PlotYAxisProps) {
  const { plot, extent, status, hosts, setSlot } = useChart('Plot.YAxis');
  useEffect(() => {
    setSlot('yAxis', true);
    return () => setSlot('yAxis', undefined);
  }, [setSlot]);

  if (!hosts.overlay || plot.width <= 0 || status === 'loading') return null;
  const [min, max] = extent;
  const intervals = Math.max(1, Math.round(ticks));
  const slots = plotVariants();
  return createPortal(
    <div data-slot="plot-y-axis" aria-hidden>
      {Array.from({ length: intervals + 1 }, (_unused, index) => {
        const value = max - ((max - min) * index) / intervals;
        return (
          <span
            key={index}
            className={slots.axisLabel({ className })}
            style={{
              left: 0,
              width: Math.max(plot.left - Y_AXIS_GUTTER, 0),
              textAlign: 'right',
              top: plot.top + (plot.height / intervals) * index,
              transform: 'translateY(-50%)',
            }}
          >
            {format ? format(value) : compactNumber(value)}
          </span>
        );
      })}
    </div>,
    hosts.overlay
  );
}
PlotYAxis.displayName = 'Plot.YAxis';

export interface PlotCursorProps {
  /** The theme role of the line. The foreground colour by default. */
  color?: PlotColor;
  /** Hide the vertical line and keep only the reading. */
  showLine?: boolean;
}

/**
 * Reading the rows, and the line that follows: hovering a row, pressing or dragging
 * across them, or the arrow keys. A click or a tap pins the reading until the next
 * press elsewhere or Escape. The hit area is the whole plot.
 */
function PlotCursor({ color, showLine = true }: PlotCursorProps) {
  const { setSlot } = useChart('Plot.Cursor');
  useEffect(() => {
    setSlot('cursor', { color, showLine });
    return () => setSlot('cursor', undefined);
  }, [color, showLine, setSlot]);
  return null;
}
PlotCursor.displayName = 'Plot.Cursor';

export interface PlotTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the heading from the row. Defaults to the value at `xDataKey`. */
  formatX?: (datum: PlotDatum) => string;
  /** Draw the readout yourself, given the row being read. */
  children?: (datum: PlotDatum, index: number) => ReactNode;
  /** Added to the readout's surface. */
  className?: string;
}

/** The readout that rides the cursor. It needs a `Plot.Cursor` beside it, which owns the reading. */
function PlotTooltip({ formatValue, formatX, children, className }: PlotTooltipProps) {
  const { setSlot } = useChart('Plot.Tooltip');
  const latest = useLatest({ formatValue, formatX, children });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
PlotTooltip.displayName = 'Plot.Tooltip';

/* -------------------------------------------------------------------------- */
/* Above the drawing                                                          */
/* -------------------------------------------------------------------------- */

export interface PlotHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** A word for what the plot is of. */
  title?: ReactNode;
  /** The figure, large. Usually the total, or the row being read. */
  value?: ReactNode;
  /** A line under the value. */
  caption?: ReactNode;
  /** Replaces the whole header, keeping only its place above the drawing. */
  children?: ReactNode;
}

/** The row above the drawing: what it is, and the one number worth reading. */
function PlotHeader({ title, value, caption, className, children, render, ...props }: PlotHeaderProps & RenderProp<'div'>) {
  const slots = plotVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'plot-header',
        className: slots.header({ className }),
        children: children ?? (
          <>
            {title ? <div className={slots.headerTitle()}>{title}</div> : null}
            {value ? <div className={slots.headerValue()}>{value}</div> : null}
            {caption ? <div className={slots.headerCaption()}>{caption}</div> : null}
          </>
        ),
      },
      props
    ),
  });
}
PlotHeader.displayName = 'Plot.Header';

export interface PlotLegendProps extends ComponentProps<'div'> {
  /** Names for the columns, keyed by `dataKey`. Falls back to the key itself. */
  labels?: Record<string, string>;
}

/** A swatch and a name per mark, taken from the marks that registered. */
function PlotLegend({ labels, className, render, ...props }: PlotLegendProps & RenderProp<'div'>) {
  const { series } = useChart('Plot.Legend');
  const slots = plotVariants();
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'plot-legend',
        className: slots.legend({ className }),
        children: series.map(([key, color]) => (
          <span key={key} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: color }} />
            {labels?.[key] ?? key}
          </span>
        )),
      },
      props
    ),
  });
  return series.length > 0 ? element : null;
}
PlotLegend.displayName = 'Plot.Legend';

export const Plot = Object.assign(PlotRoot, {
  Header: PlotHeader,
  Legend: PlotLegend,
  Grid: PlotGrid,
  Area: PlotArea,
  Bars: PlotBars,
  Line: PlotLine,
  Dots: PlotDots,
  Rule: PlotRule,
  Layer: PlotLayer,
  Overlay: PlotOverlay,
  XAxis: PlotXAxis,
  YAxis: PlotYAxis,
  Cursor: PlotCursor,
  Tooltip: PlotTooltip,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  PlotHeader,
  PlotLegend,
  PlotGrid,
  PlotArea,
  PlotBars,
  PlotLine,
  PlotDots,
  PlotRule,
  PlotLayer,
  PlotOverlay,
  PlotXAxis,
  PlotYAxis,
  PlotCursor,
  PlotTooltip,
};
