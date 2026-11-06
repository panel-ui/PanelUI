'use client';

/**
 * LiveLineChart — a reading that keeps arriving, against a window that keeps
 * moving.
 *
 * ```tsx
 * <LiveLineChart data={points} window={30}>
 *   <LiveLineChart.Grid />
 *   <LiveLineChart.Area />
 *   <LiveLineChart.Line />
 *   <LiveLineChart.Tip />
 *   <LiveLineChart.XAxis />
 * </LiveLineChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's LiveLineChart. What differs is
 * what the web changes: a colour is named by the theme's role, a reading is taken
 * by hovering, dragging or the arrow keys.
 *
 * ## Two layers
 *
 * The grid and the axes do not move with the clock, so they are one chart
 * definition, rebuilt when the axis changes. The line, the fill and the dots move
 * every frame, against a window tied to the wall clock whether or not a reading
 * arrives, so a feed that stalls shows as the line drifting away from the right
 * edge. A chart definition changes per data update, which is the wrong rate for
 * that, so they are one small SVG layer over the first, written directly and never
 * through React.
 *
 * ## What the clock costs
 *
 * One frame callback, for as long as the chart can be seen. `paused`,
 * `status="loading"`, a hidden page and scrolling off screen all stop it. Under
 * reduced motion it never starts, and the window advances as each reading arrives
 * instead, which is the same picture sampled less often.
 *
 * ## Colour follows the recent direction
 *
 * With `momentumColors`, the line, the fill and the dot take their colour from
 * where the reading has been going, which is the one thing on the chart readable
 * out of the corner of an eye.
 */
import { defineChart, lineY } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { area as areaPath, curveLinear, curveMonotoneX, line as linePath } from 'd3-shape';
import {
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
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { liveLineAccessibility } from './live-line-accessibility';
import {
  liveLineClockRuns,
  liveLineExtent,
  liveLineMomentum,
  liveLineOnPlot,
  liveLineRun,
  nearestReading,
  newestOnPlot,
  normalizeLiveLinePoints,
  normalizeLiveLineWindow,
  reconcileLiveLineActivePoint,
} from './live-line-lifecycle';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Whether the chart is showing data or waiting for it. */
export type LiveLineChartStatus = 'loading' | 'ready';
export type LiveLineChartCurve = 'monotone' | 'linear';

/** Where the reading has been going, over the last few points. */
export type LiveLineMomentum = 'up' | 'down' | 'flat';

/** Which of the theme's roles something is drawn in. */
export type LiveLineChartColor =
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

/** A colour per direction, for a chart that is read by its colour. */
export interface LiveLineMomentumColors {
  up?: LiveLineChartColor;
  down?: LiveLineChartColor;
  flat?: LiveLineChartColor;
}

/** One reading. `time` is a timestamp in milliseconds, as `Date.now()` gives. */
export interface LiveLinePoint {
  time: number;
  value: number;
}

const COLOR_VAR: Record<LiveLineChartColor, string> = {
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

const liveLineChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    plot: 'relative col-start-1 row-start-2 w-full touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
    chart: 'absolute! inset-0 text-xs',
    layer: 'pointer-events-none absolute inset-0 size-full overflow-visible',
    skeleton: 'pointer-events-none absolute h-0.5 rounded-full bg-muted',
    tip: 'pointer-events-none absolute left-0 top-0 size-2 rounded-full transition-colors duration-300',
    pulse: 'absolute inset-0 rounded-full motion-reduce:hidden',
    badge:
      'absolute right-4 -top-1.5 whitespace-nowrap rounded-md border border-border bg-popover px-1.5 py-0.5 text-xs font-medium tabular-nums text-popover-foreground',
    crosshair: 'pointer-events-none absolute left-0 w-px opacity-45',
    dot: 'pointer-events-none absolute left-0 top-0 size-2 rounded-full',
    readout:
      'pointer-events-none absolute left-0 top-0 flex w-29 flex-col items-center rounded-lg border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
    readoutValue: 'font-medium tabular-nums',
    readoutAge: 'text-muted-foreground',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex max-w-[55%] shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Room left around the plot, fixed so the moving layer and the guides agree. */
const MARGIN = { top: 12, right: 14, bottom: 22, left: 10 };

/** The left margin when a `YAxis` needs somewhere to write. */
const Y_AXIS_WIDTH = 44;

/** Half the width of a dot, for centring it on the point it names. */
const DOT_RADIUS = 4;

/** The readout's width, for keeping it inside the plot. */
const READOUT_WIDTH = 116;

/** A transform and an opacity, so the loop runs on the compositor and repaints nothing. */
const STYLES = `@keyframes panelui-live-pulse{from{transform:scale(1);opacity:.55}to{transform:scale(3.2);opacity:0}}`;

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)'],
};

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

const CURVES = { monotone: curveMonotoneX, linear: curveLinear };

/** Where the guides put the plot, in pixels inside the chart's box. */
interface PlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Format = (value: number) => string;

/** What the parts have asked for. Formatters are read through `latest`, so a new one costs nothing. */
interface Slots {
  header?: { title: string | undefined; value: string | undefined; format: { current: Format | undefined } };
  grid?: { rows: number; dashArray: string | undefined; stroke: string };
  area?: { fill: string | undefined; opacity: number };
  line?: { stroke: string | undefined; strokeWidth: number };
  tip?: { badge: boolean; pulse: boolean; className: string | undefined; format: { current: Format | undefined } };
  xAxis?: { ticks: number; format: { current: ((secondsAgo: number) => string) | undefined } };
  yAxis?: { ticks: number; format: { current: Format | undefined } };
  tooltip?: { className: string | undefined; format: { current: Format | undefined } };
  skeleton?: { base: string | undefined };
}

interface LiveLineChartContextValue {
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activePoint: LiveLinePoint | null;
  latest: LiveLinePoint | null;
  momentum: LiveLineMomentum;
  color: string;
}

const LiveLineChartContext = createContext<LiveLineChartContextValue | null>(null);

function useChart(component: string): LiveLineChartContextValue {
  const context = useContext(LiveLineChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <LiveLineChart>`);
  }
  return context;
}

/** The reading under the crosshair, for something rendered inside the chart. */
export function useLiveLineChart() {
  const { activePoint, latest, momentum, color } = useChart('useLiveLineChart');
  return { activePoint, latest, momentum, color };
}

/** Hands a part's formatter to the root without a new function redrawing the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

/** True when the system asks for less motion. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener('change', read);
    return () => query.removeEventListener('change', read);
  }, []);
  return reduced;
}

export interface LiveLineChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The readings so far. Invalid values are dropped and timestamps are ordered. */
  data: readonly LiveLinePoint[];
  /** How much time the plot spans, in seconds. Invalid values use 30. */
  window?: number;
  /** Freeze the window where it is. The readings still arrive; the clock stops. */
  paused?: boolean;
  /** Fix the value axis instead of deriving it from what is visible. */
  yDomain?: [number, number];
  /** Milliseconds for the value axis to settle after the range changes. */
  domainDuration?: number;
  /** `monotone` never overshoots between readings; `linear` joins them straight. */
  curve?: LiveLineChartCurve;
  /**
   * The most readings kept. Older ones are dropped, so an unbounded feed does not
   * grow an array for as long as the page is open. Must be positive and finite.
   */
  maxPoints?: number;
  /** The plot's width ÷ height. */
  aspectRatio?: number;
  /** `loading` holds the clock and draws `Skeleton` in place of the line. */
  status?: LiveLineChartStatus;
  /** Which role to draw in per direction. Left out, the chart keeps to one colour. */
  momentumColors?: LiveLineMomentumColors;
  /** Which of the theme's roles the chart is drawn in, `chart-1` by default. Ignored when `momentumColors` is set. */
  color?: LiveLineChartColor;
  /** The reading under the crosshair as it moves, and `null` when it is let go. */
  onActivePointChange?: (point: LiveLinePoint | null) => void;
  /** Names the chart for a screen reader. Falls back to the Header's title, then to "Live line chart". */
  label?: string;
  /** Further guidance after the snapshot a screen reader gets. */
  hint?: string;
}

/** Imperative handle: land the window on the present, after a pause. */
export interface LiveLineChartHandle {
  sync: () => void;
}

const LiveLineChartRoot = forwardRef<LiveLineChartHandle, LiveLineChartProps & RenderProp<'div'>>(function LiveLineChartRoot(
  {
    data,
    window: windowSeconds = 30,
    paused = false,
    yDomain,
    domainDuration = 420,
    curve = 'monotone',
    maxPoints = 500,
    aspectRatio = 2,
    status = 'ready',
    momentumColors,
    color,
    onActivePointChange,
    label,
    hint,
    className,
    children,
    render,
    ...props
  },
  ref
) {
  const classes = liveLineChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [box, setBox] = useState<PlotBox | null>(null);
  const [slots, setSlots] = useState<Slots>({});
  const [activePoint, setActiveState] = useState<LiveLinePoint | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  // Advanced while a reading is held, so "4s ago" counts up under it.
  const [, setAgeTick] = useState(0);
  const reducedMotion = useReducedMotion();
  // Unique per chart: clips and gradients are found by id across the whole page.
  const idPrefix = `panelui-live-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => setWidth(node.clientWidth);
    read();
    const size = new ResizeObserver(read);
    size.observe(node);
    const view = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true));
    view.observe(node);
    return () => {
      size.disconnect();
      view.disconnect();
    };
  }, []);

  useEffect(() => {
    const read = () => setPageVisible(document.visibilityState !== 'hidden');
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, []);

  const setSlot = useCallback<LiveLineChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  const loading = status === 'loading';
  const windowMs = normalizeLiveLineWindow(windowSeconds) * 1000;
  const points = useMemo(() => normalizeLiveLinePoints(data, maxPoints), [data, maxPoints]);
  const liveLatest = points[points.length - 1] ?? null;

  const liveExtent = useMemo<[number, number]>(
    () => yDomain ?? liveLineExtent(points, (liveLatest?.time ?? 0) - windowMs),
    [points, liveLatest, windowMs, yDomain]
  );
  const liveMomentum = liveLineMomentum(points, liveExtent);

  /*
   * `paused` holds the whole picture and not only the clock. Readings keep arriving
   * while it is held, so an axis, a dot or a colour taken from the newest one would
   * go on moving under a frozen line.
   */
  const [held, setHeld] = useState<{ extent: [number, number]; latest: LiveLinePoint | null; momentum: LiveLineMomentum } | null>(null);
  useEffect(() => {
    if (!paused) setHeld({ extent: liveExtent, latest: liveLatest, momentum: liveMomentum });
  }, [paused, liveExtent, liveLatest, liveMomentum]);
  const extent = paused && held ? held.extent : liveExtent;
  const latest = paused && held ? held.latest : liveLatest;
  const momentum = paused && held ? held.momentum : liveMomentum;

  const resolved = COLOR_VAR[
    momentumColors
      ? momentum === 'up'
        ? (momentumColors.up ?? 'success')
        : momentum === 'down'
          ? (momentumColors.down ?? 'destructive')
          : (momentumColors.flat ?? color ?? 'chart-1')
      : (color ?? 'chart-1')
  ];

  const reported = useRef<LiveLinePoint | null>(null);
  const report = useLatest(onActivePointChange);
  const setActivePoint = useCallback(
    (point: LiveLinePoint | null) => {
      if (reported.current?.time === point?.time && reported.current?.value === point?.value) return;
      reported.current = point;
      setActiveState(point);
      report.current?.(point);
    },
    [report]
  );

  // A reading trimmed away under the crosshair has nothing left to point at.
  useEffect(() => {
    setActivePoint(reconcileLiveLineActivePoint(reported.current, points));
  }, [points, setActivePoint]);

  useEffect(() => {
    if (!activePoint) return;
    const timer = setInterval(() => setAgeTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, [activePoint]);

  const running = liveLineClockRuns({ paused, loading, reducedMotion, visible: onScreen && pageVisible });

  // Everything the frame callback reads. Refs, because it runs outside React.
  const nowRef = useRef(0);
  const domain = useRef({ from: extent, to: extent, start: -Infinity, duration: 0, set: false });
  const frame = useRef({ points, windowMs, box, curve, activePoint, setActivePoint });

  const draw = useCallback(() => {
    const { points, windowMs, box, curve, activePoint, setActivePoint } = frame.current;
    if (!box) return;
    const xMax = nowRef.current;
    const xMin = xMax - windowMs;

    const { from, to, start, duration } = domain.current;
    const raw = duration > 0 ? Math.min(1, (performance.now() - start) / duration) : 1;
    const eased = 1 - (1 - raw) ** 3;
    const yMin = from[0] + (to[0] - from[0]) * eased;
    const yMax = from[1] + (to[1] - from[1]) * eased;

    const xOf = (time: number) => box.x + ((time - xMin) / windowMs) * box.width;
    const yOf = (value: number) => box.y + box.height - ((value - yMin) / (yMax - yMin || 1)) * box.height;

    const run = liveLineRun(points, xMin, xMax);
    const factory = CURVES[curve];
    const reading = run.length > 1;
    lineRef.current?.setAttribute(
      'd',
      reading
        ? (linePath<LiveLinePoint>()
            .x(({ time }) => xOf(time))
            .y(({ value }) => yOf(value))
            .curve(factory)(run) ?? '')
        : ''
    );
    areaRef.current?.setAttribute(
      'd',
      reading
        ? (areaPath<LiveLinePoint>()
            .x(({ time }) => xOf(time))
            .y0(box.y + box.height)
            .y1(({ value }) => yOf(value))
            .curve(factory)(run) ?? '')
        : ''
    );

    const place = (node: HTMLElement | null, x: number, y: number) => {
      if (node) node.style.transform = `translate(${x}px, ${y}px)`;
    };

    const tip = tipRef.current;
    if (tip) {
      const newest = newestOnPlot(points, xMin, xMax);
      tip.style.opacity = newest ? '1' : '0';
      if (newest) place(tip, xOf(newest.time) - DOT_RADIUS, yOf(newest.value) - DOT_RADIUS);
    }

    if (activePoint) {
      // The moment has scrolled off the plot, and there is nothing left to read.
      if (activePoint.time < xMin) {
        setActivePoint(null);
        return;
      }
      const x = xOf(activePoint.time);
      place(crosshairRef.current, x, 0);
      place(dotRef.current, x - DOT_RADIUS, yOf(activePoint.value) - DOT_RADIUS);
      const half = READOUT_WIDTH / 2;
      place(readoutRef.current, Math.min(box.x + box.width - half, Math.max(box.x + half, x)) - half, box.y);
    }
  }, []);

  /*
   * After every render and before the paint, so a part that has just mounted is in
   * place on its first frame. A render is rare: the clock does not cause one.
   */
  useLayoutEffect(() => {
    frame.current = { points, windowMs, box, curve, activePoint, setActivePoint };
    if (nowRef.current === 0) nowRef.current = Date.now();
    draw();
  });

  useEffect(() => {
    const current = domain.current;
    // The first scale lands: there is nothing to move from. It lands as well when the
    // clock stops, or a pause would finish the move on whatever render came next.
    if (!current.set || !running) {
      domain.current = { from: extent, to: extent, start: -Infinity, duration: 0, set: true };
    } else if (current.to[0] === extent[0] && current.to[1] === extent[1]) {
      return;
    } else {
      const now = performance.now();
      const eased = 1 - (1 - Math.min(1, (now - current.start) / (current.duration || 1))) ** 3;
      const from: [number, number] = [
        current.from[0] + (current.to[0] - current.from[0]) * eased,
        current.from[1] + (current.to[1] - current.from[1]) * eased,
      ];
      domain.current = { from, to: extent, start: now, duration: domainDuration, set: true };
    }
    draw();
  }, [extent, running, domainDuration, draw]);

  useEffect(() => {
    if (!running) return;
    let id = requestAnimationFrame(function tick() {
      nowRef.current = Date.now();
      draw();
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running, draw]);

  // With no clock the window lands on the present as each reading arrives.
  useEffect(() => {
    if (running || paused) return;
    nowRef.current = Date.now();
    draw();
  }, [running, paused, points, draw]);

  useImperativeHandle(
    ref,
    () => ({
      sync: () => {
        nowRef.current = Date.now();
        draw();
      },
    }),
    [draw]
  );

  const { header, grid, area, line, tip, xAxis, yAxis, tooltip, skeleton } = slots;
  const seconds = windowMs / 1000;

  const definition = useMemo(() => {
    const valueTicks = Math.max(1, yAxis?.ticks ?? grid?.rows ?? 4);
    const timeTicks = Math.max(1, xAxis?.ticks ?? 4);
    // Even steps across the axis, so a rule stays put when the scale under it moves.
    const values = Array.from({ length: valueTicks + 1 }, (_, index) => extent[0] + ((extent[1] - extent[0]) * index) / valueTicks);
    const offsets = Array.from({ length: timeTicks + 1 }, (_, index) => -seconds + (seconds * index) / timeTicks);
    return defineChart({
      theme: THEME,
      // Empty: it only tells the guides their scales hold numbers.
      marks: [lineY<LiveLinePoint>([], { id: 'live-line-guides', x: 'time', y: 'value' })],
      margin: { ...MARGIN, left: yAxis ? Y_AXIS_WIDTH : MARGIN.left },
      motion: false as const,
      keyboard: false,
      pointer: false,
      focusRing: false,
      scales: {
        x: {
          scale: scaleLinear([-seconds, 0], [0, 1]),
          axis:
            xAxis && !loading
              ? {
                  line: false as const,
                  tickLabels: {
                    opacity: 1,
                    anchor: ({ value }: { value: number }) =>
                      value === -seconds ? ('start' as const) : value === 0 ? ('end' as const) : undefined,
                  },
                  ticks: {
                    size: 0,
                    values: offsets,
                    format: (value: number) => {
                      const secondsAgo = Math.abs(value);
                      const format = xAxis.format.current;
                      return format ? format(secondsAgo) : secondsAgo === 0 ? 'now' : `-${Number(secondsAgo.toFixed(1))}s`;
                    },
                  },
                }
              : (false as const),
        },
        y: {
          scale: scaleLinear(extent, [0, 1]),
          grid: grid ? { stroke: grid.stroke, strokeOpacity: 1, strokeDasharray: grid.dashArray } : false,
          axis:
            yAxis && !loading
              ? {
                  line: false as const,
                  tickLabels: { opacity: 1 },
                  ticks: { size: 0, values, format: (value: number) => (yAxis.format.current ?? compactNumber)(value) },
                }
              : grid
                ? { line: false as const, ticks: { size: 0, values, format: () => '' } }
                : (false as const),
        },
      },
    });
  }, [extent, seconds, grid, xAxis, yAxis, loading]);

  // The definition turns motion off, and a renderer is still required.
  const renderer = useMemo(() => motion(), []);

  const headerFormat = header?.format.current;
  const tipFormat = tip?.format.current;
  const snapshot = liveLineAccessibility({
    name: label ?? header?.title,
    status,
    latest,
    activePoint,
    momentum,
    windowSeconds: seconds,
    paused,
    now: Date.now(),
    valueOverride: header?.value,
    formatLatest: headerFormat ?? tipFormat ?? compactNumber,
    formatActive: tooltip?.format.current ?? headerFormat ?? tipFormat ?? compactNumber,
  });

  const canRead = tooltip !== undefined && !loading;
  useEffect(() => {
    if (!canRead) setActivePoint(null);
  }, [canRead, setActivePoint]);

  const readAt = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canRead || !box) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, box.x), box.x + box.width);
    const xMin = nowRef.current - windowMs;
    setActivePoint(nearestReading(liveLineOnPlot(points, xMin, nowRef.current), xMin + ((x - box.x) / box.width) * windowMs));
  };

  const readByKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setActivePoint(null);
      return;
    }
    if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || !canRead) return;
    event.preventDefault();
    const onPlot = liveLineOnPlot(points, nowRef.current - windowMs, nowRef.current);
    if (!onPlot.length) return;
    const at = activePoint ? onPlot.findIndex(({ time }) => time === activePoint.time) : onPlot.length;
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    setActivePoint(onPlot[Math.min(Math.max(at + step, 0), onPlot.length - 1)] ?? null);
  };

  const context = useMemo<LiveLineChartContextValue>(
    () => ({ setSlot, activePoint, latest, momentum, color: resolved }),
    [setSlot, activePoint, latest, momentum, resolved]
  );

  const lineStroke = line?.stroke ?? resolved;
  const areaFill = area?.fill ?? resolved;
  const secondsAgo = activePoint ? Math.max(0, Math.round((Date.now() - activePoint.time) / 1000)) : 0;
  const paint = { transition: 'stroke 300ms' };

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'live-line-chart',
        className: classes.root({ className }),
        children: (
          <>
            <style>{STYLES}</style>
            <div
              ref={plotRef}
              data-slot="live-line-chart-plot"
              role="img"
              aria-label={snapshot}
              aria-description={hint}
              tabIndex={tooltip ? 0 : undefined}
              className={classes.plot()}
              style={{ aspectRatio }}
              onKeyDown={readByKey}
              onBlur={() => setActivePoint(null)}
              onPointerDown={readAt}
              onPointerMove={(event) => {
                // A finger reads only what it is dragging across; a hover reads on its own.
                if (event.pointerType === 'mouse' || event.buttons > 0) readAt(event);
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== 'mouse') setActivePoint(null);
              }}
              onPointerLeave={() => setActivePoint(null)}
              onPointerCancel={() => setActivePoint(null)}
            >
              {width > 0 ? (
                <Chart
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={snapshot}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={classes.chart()}
                  onRender={({ scene }) => {
                    const { x, y, width: plotWidth, height } = scene.chart;
                    setBox((current) =>
                      current && current.x === x && current.y === y && current.width === plotWidth && current.height === height
                        ? current
                        : { x, y, width: plotWidth, height }
                    );
                  }}
                />
              ) : null}
              {box && !loading ? (
                <>
                  <svg data-slot="live-line-chart-layer" aria-hidden className={classes.layer()}>
                    <defs>
                      {/* The run starts one reading outside the window, and this hides the overhang. */}
                      <clipPath id={`${idPrefix}-clip`}>
                        <rect x={box.x} y={0} width={box.width} height={box.y + box.height} />
                      </clipPath>
                      {area ? (
                        <linearGradient id={`${idPrefix}-fill`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" style={{ stopColor: areaFill, stopOpacity: area.opacity, transition: 'stop-color 300ms' }} />
                          <stop offset="1" style={{ stopColor: areaFill, stopOpacity: 0, transition: 'stop-color 300ms' }} />
                        </linearGradient>
                      ) : null}
                    </defs>
                    <g clipPath={`url(#${idPrefix}-clip)`}>
                      {area ? <path ref={areaRef} data-slot="live-line-chart-area" fill={`url(#${idPrefix}-fill)`} /> : null}
                      {line ? (
                        <path
                          ref={lineRef}
                          data-slot="live-line-chart-line"
                          fill="none"
                          stroke={lineStroke}
                          strokeWidth={line.strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={paint}
                        />
                      ) : null}
                    </g>
                  </svg>
                  {activePoint ? (
                    <div
                      ref={crosshairRef}
                      data-slot="live-line-chart-crosshair"
                      className={classes.crosshair()}
                      style={{ top: box.y, height: box.height, background: resolved }}
                    />
                  ) : null}
                  {tip && latest ? (
                    <div ref={tipRef} data-slot="live-line-chart-tip" className={classes.tip()} style={{ background: resolved }}>
                      {tip.pulse && !paused ? (
                        <div
                          className={classes.pulse()}
                          style={{ background: resolved, animation: 'panelui-live-pulse 1600ms ease-out infinite' }}
                        />
                      ) : null}
                      {/* Never while a reading is held: that is one question, and it has one answer. */}
                      {tip.badge && !activePoint ? (
                        <div data-slot="live-line-chart-badge" className={classes.badge({ className: tip.className })}>
                          {(tipFormat ?? compactNumber)(latest.value)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {activePoint ? (
                    <>
                      <div ref={dotRef} data-slot="live-line-chart-dot" className={classes.dot()} style={{ background: resolved }} />
                      <div
                        ref={readoutRef}
                        data-slot="live-line-chart-readout"
                        className={classes.readout({ className: tooltip?.className })}
                      >
                        <span className={classes.readoutValue()}>
                          {(tooltip?.format.current ?? compactNumber)(activePoint.value)}
                        </span>
                        <span className={classes.readoutAge()}>{secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}</span>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
              {box && loading && skeleton ? (
                <div
                  data-slot="live-line-chart-skeleton"
                  aria-hidden
                  className={classes.skeleton()}
                  style={{ left: box.x, width: box.width, top: box.y + box.height / 2 - 1, background: skeleton.base }}
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

  return <LiveLineChartContext.Provider value={context}>{element}</LiveLineChartContext.Provider>;
});
LiveLineChartRoot.displayName = 'LiveLineChart';

export interface LiveLineChartGridProps {
  /** How many bands the plot is divided into. Give it the same number as `YAxis`'s `ticks`. */
  rows?: number;
  /** The stroke's dash pattern. `"none"` for a solid rule. */
  dashArray?: string;
  /** Which of the theme's roles the lines are drawn in. Defaults to the border colour. */
  color?: LiveLineChartColor;
}

/** The horizontal rules the readings are judged against. */
function LiveLineChartGrid({
  rows = 4,
  dashArray = '4 6',
  color,
}: LiveLineChartGridProps) {
  const { setSlot } = useChart('LiveLineChart.Grid');
  const stroke = color ? COLOR_VAR[color] : 'var(--border)';
  useEffect(() => {
    setSlot('grid', { rows, dashArray, stroke });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, stroke, setSlot]);
  return null;
}
LiveLineChartGrid.displayName = 'LiveLineChart.Grid';

export interface LiveLineChartLineProps {
  /** The stroke's width. */
  strokeWidth?: number;
  /** Which of the theme's roles to draw in. Overrides the chart's colour, momentum included. */
  color?: LiveLineChartColor;
}

/** The line. */
function LiveLineChartLine({
  strokeWidth = 2,
  color,
}: LiveLineChartLineProps) {
  const { setSlot } = useChart('LiveLineChart.Line');
  const stroke = color ? COLOR_VAR[color] : undefined;
  useEffect(() => {
    setSlot('line', { stroke, strokeWidth });
    return () => setSlot('line', undefined);
  }, [stroke, strokeWidth, setSlot]);
  return null;
}
LiveLineChartLine.displayName = 'LiveLineChart.Line';

export interface LiveLineChartAreaProps {
  /** Opacity at the top of the fill, fading to nothing at the bottom of the plot. */
  opacity?: number;
  /** Which of the theme's roles to draw in. Overrides the chart's colour, momentum included. */
  color?: LiveLineChartColor;
}

/** The fill under the line, so a chart that wants only the shape simply does not have one. */
function LiveLineChartArea({
  opacity = 0.22,
  color,
}: LiveLineChartAreaProps) {
  const { setSlot } = useChart('LiveLineChart.Area');
  const fill = color ? COLOR_VAR[color] : undefined;
  useEffect(() => {
    setSlot('area', { fill, opacity });
    return () => setSlot('area', undefined);
  }, [fill, opacity, setSlot]);
  return null;
}
LiveLineChartArea.displayName = 'LiveLineChart.Area';

export interface LiveLineChartTipProps {
  /**
   * Write the current reading in a badge beside the dot. Off by default, because a
   * floating card nobody opened reads as a tooltip. Turn it on where the chart has
   * no header to put the reading in.
   */
  badge?: boolean;
  /** Ring the dot with a repeating pulse. Held while paused and under reduced motion. */
  pulse?: boolean;
  /** Format the badge. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** Added to the badge's surface. */
  className?: string;
}

/**
 * The dot at the leading end. It rides the newest reading and not the right-hand
 * edge, so a feed that stops is a dot drifting left with the rest of the line.
 */
function LiveLineChartTip({
  badge = false,
  pulse = true,
  formatValue,
  className,
}: LiveLineChartTipProps) {
  const { setSlot } = useChart('LiveLineChart.Tip');
  const format = useLatest(formatValue);
  useEffect(() => {
    setSlot('tip', { badge, pulse, className, format });
    return () => setSlot('tip', undefined);
  }, [badge, pulse, className, format, setSlot]);
  return null;
}
LiveLineChartTip.displayName = 'LiveLineChart.Tip';

export interface LiveLineChartXAxisProps {
  /** How many steps along the bottom. There is a label at each end of each one. */
  ticks?: number;
  /** Rewrites a label. Given how many seconds back the tick is. */
  formatTick?: (secondsAgo: number) => string;
}

/**
 * How far back the plot reaches. The labels are offsets from now and never change:
 * a moving window labelled with clock times would rewrite every one of them on
 * every frame.
 */
function LiveLineChartXAxis({
  ticks = 4,
  formatTick,
}: LiveLineChartXAxisProps) {
  const { setSlot } = useChart('LiveLineChart.XAxis');
  const format = useLatest(formatTick);
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
LiveLineChartXAxis.displayName = 'LiveLineChart.XAxis';

export interface LiveLineChartYAxisProps {
  /** How many steps up the side. There is a label at each end of each one. */
  ticks?: number;
  /** Format a value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
}

/** The scale up the left-hand side, with room made for it. */
function LiveLineChartYAxis({
  ticks = 4,
  formatValue,
}: LiveLineChartYAxisProps) {
  const { setSlot } = useChart('LiveLineChart.YAxis');
  const format = useLatest(formatValue);
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
LiveLineChartYAxis.displayName = 'LiveLineChart.YAxis';

export interface LiveLineChartTooltipProps {
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * Hover, drag or use the arrow keys to read a reading that has already gone past.
 * The crosshair is pinned to the moment and not the place on screen, so it travels
 * left with the reading it named. Escape or moving away lets it go.
 */
function LiveLineChartTooltip({
  formatValue,
  className,
}: LiveLineChartTooltipProps) {
  const { setSlot } = useChart('LiveLineChart.Tooltip');
  const format = useLatest(formatValue);
  useEffect(() => {
    setSlot('tooltip', { className, format });
    return () => setSlot('tooltip', undefined);
  }, [className, format, setSlot]);
  return null;
}
LiveLineChartTooltip.displayName = 'LiveLineChart.Tooltip';

export interface LiveLineChartSkeletonProps {
  /** Which of the theme's roles the line is drawn in. Defaults to the muted colour. */
  color?: LiveLineChartColor;
}

/** The waiting state: a flat line down the middle of the plot, shown while `status="loading"`. */
function LiveLineChartSkeleton({
  color,
}: LiveLineChartSkeletonProps) {
  const { setSlot } = useChart('LiveLineChart.Skeleton');
  const base = color && COLOR_VAR[color];
  useEffect(() => {
    setSlot('skeleton', { base });
    return () => setSlot('skeleton', undefined);
  }, [base, setSlot]);
  return null;
}
LiveLineChartSkeleton.displayName = 'LiveLineChart.Skeleton';

export interface LiveLineChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what is being watched. */
  title?: string;
  /** The readout. Left out, it shows the current reading. */
  value?: string;
  /** One muted line under the value. */
  caption?: ReactNode;
  /** Format the derived value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** Trailing slot: a pause control, a badge, a unit. */
  children?: ReactNode;
}

/**
 * The strip above the plot. The value falls back to the reading under the crosshair,
 * then to the latest one, so reading back through the window shows here with nothing
 * to wire up. It is hidden from a screen reader, which has the chart's snapshot.
 */
function LiveLineChartHeader({
  title,
  value,
  caption,
  formatValue,
  className,
  children,
  render,
  ...props
}: LiveLineChartHeaderProps & RenderProp<'div'>) {
  const { setSlot, activePoint, latest } = useChart('LiveLineChart.Header');
  const slots = liveLineChartVariants();
  const format = useLatest(formatValue);
  const shown = activePoint ?? latest;

  useEffect(() => {
    setSlot('header', { title, value, format });
    return () => setSlot('header', undefined);
  }, [title, value, format, setSlot]);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'live-line-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div aria-hidden className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              <div className={slots.headerValue()}>{value ?? (shown ? (formatValue ?? compactNumber)(shown.value) : '–')}</div>
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
LiveLineChartHeader.displayName = 'LiveLineChart.Header';

export const LiveLineChart = Object.assign(LiveLineChartRoot, {
  Header: LiveLineChartHeader,
  Grid: LiveLineChartGrid,
  Area: LiveLineChartArea,
  Line: LiveLineChartLine,
  Tip: LiveLineChartTip,
  XAxis: LiveLineChartXAxis,
  YAxis: LiveLineChartYAxis,
  Tooltip: LiveLineChartTooltip,
  Skeleton: LiveLineChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  LiveLineChartHeader,
  LiveLineChartGrid,
  LiveLineChartArea,
  LiveLineChartLine,
  LiveLineChartTip,
  LiveLineChartXAxis,
  LiveLineChartYAxis,
  LiveLineChartTooltip,
  LiveLineChartSkeleton,
};
