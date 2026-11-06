'use client';

/**
 * PieChart: one whole, divided between its parts.
 *
 * ```tsx
 * <PieChart data={spend} innerRadius={0.58}>
 *   <PieChart.Header title="This month" value="$18,420" legend />
 *   <PieChart.Slices />
 *   <PieChart.Center />
 * </PieChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's PieChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, hovering a slice reads it, a click or a
 * tap holds the reading, and the arrow keys walk the slices.
 *
 * ## One reading
 *
 * Hover, the keyboard, a press and the legend all set one index, and everything
 * that responds to it (the lift, the dimming, the centre, the callback) reads
 * that index. The lift and the dimming are CSS over the drawn slices rather than
 * chart states, so a reading that comes from the legend or from `activeIndex`
 * looks the same as one that comes from the pointer, without rebuilding the chart.
 *
 * ## The unroll
 *
 * One hand sweeps clockwise from the start of the dial and each slice shows only
 * as far as it has got. A slice half drawn is a shorter slice, so this cannot be
 * a fade. It is a conic mask over the finished drawing, with one registered
 * angle animated, and it comes off when the sweep ends. Nothing repaints at rest.
 */
import { defineChart, type ChartInteractionController, type ChartPoint } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { polar, radialArc } from '@tanstack/charts/polar';
import { Chart } from '@tanstack/charts/react/core';
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
  type CSSProperties,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { pieSliceAt, pieSlices, pieSlicesBetween, pieTotal, type PieSliceAngles } from './pie-layout';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type PieChartStatus = 'loading' | 'ready';

/** Written out in full, because the registry finds the tokens a component needs by reading its source. */
const COLORS = {
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

/** Which of the theme's roles a slice is drawn in. */
export type PieChartColor = keyof typeof COLORS;

/** One slice. Its share is worked out from the others, so there is no maximum. */
export interface PieDatum {
  /** Name for the legend, the centre readout and screen readers. */
  label: string;
  /** How much of the whole this slice is. Negatives are treated as zero. */
  value: number;
  /** Which of the theme's roles to draw it in. Defaults to the chart palette, in order. */
  color?: PieChartColor;
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: PALETTE,
};

const pieChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full justify-self-center',
    chart:
      'absolute! inset-0 cursor-pointer touch-pan-y rounded-full text-xs [&_svg]:rounded-full [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    skeleton:
      'pointer-events-none col-start-1 row-start-2 justify-self-center bg-muted transition-opacity duration-500 motion-reduce:transition-none',
    center:
      'pointer-events-none relative col-start-1 row-start-2 flex flex-col items-center justify-center self-center justify-self-center text-center',
    centerLabel: 'max-w-full truncate text-xs text-muted-foreground',
    centerValue: 'max-w-full truncate font-semibold tabular-nums tracking-tight',
    centerCaption: 'max-w-full truncate text-xs text-muted-foreground',
    legend: 'col-start-1 row-start-3 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3 text-xs',
    legendItem: 'flex items-center gap-1.5',
    legendButton:
      'flex max-w-full cursor-pointer items-center gap-1.5 rounded-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    legendName: 'truncate text-muted-foreground',
    legendValue: 'font-medium tabular-nums',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing:
      'flex max-w-[55%] shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Room kept outside the pie so a selected slice has somewhere to lift into. */
const LIFT = 8;
const MORPH_DURATION = 420;
const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

/** Milliseconds for a slice to lift out and settle back. */
const SELECT_DURATION = 180;

/** Opacity of a legend entry whose slice is not the one being read. */
const LEGEND_DIM = 0.4;

const SLICES_MARK = 'pie-slices';

const SWEEP_STYLES =
  "@property --panelui-pie-sweep{syntax:'<angle>';inherits:false;initial-value:0deg}" +
  '@keyframes panelui-pie-unroll{to{--panelui-pie-sweep:var(--panelui-pie-span)}}' +
  '@media (prefers-reduced-motion:no-preference){[data-pie-unroll]{' +
  'mask-image:conic-gradient(from var(--panelui-pie-start),#000 var(--panelui-pie-sweep),transparent 0);' +
  'animation:panelui-pie-unroll var(--panelui-pie-duration) cubic-bezier(0.33,1,0.68,1) both}}';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactNumber = (value: number) => COMPACT.format(value);

/** A square inside a circle, not across it: the corners of a wider box fall outside the hole. */
const holeRoom = (hole: number) => hole * Math.SQRT2;

/** Below this width the hole fits the number alone. */
const FULL_CENTER_ROOM = 90;

/** One slice as the arc mark wants it: angles in radians, clockwise from twelve. */
interface SliceRow {
  index: number;
  startAngle: number;
  endAngle: number;
}

interface SlicesConfig {
  cornerRadius: number;
  popOut: number;
  dimOpacity: number;
}

interface PieChartContextValue {
  data: readonly PieDatum[];
  total: number;
  slices: readonly PieSliceAngles[];
  colors: readonly string[];
  /** Outer radius in pixels. Zero until the plot has been measured. */
  radius: number;
  /** Inner radius in pixels. Zero for a pie. */
  hole: number;
  box: number;
  startAngle: number;
  endAngle: number;
  loading: boolean;
  activeIndex: number;
  setSlices: (config: SlicesConfig | undefined) => void;
  /** A reading that goes away by itself, such as hovering a legend entry. */
  read: (index: number) => void;
  /** Holds a slice, or lets it go if it is the one held. */
  togglePin: (index: number) => void;
}

const PieChartContext = createContext<PieChartContextValue | null>(null);

function useChart(component: string): PieChartContextValue {
  const context = useContext(PieChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <PieChart>`);
  }
  return context;
}

/** The slice being read and its share, for something rendered inside the chart. */
export function usePieChart() {
  const { data, slices, activeIndex } = useChart('usePieChart');
  return {
    activeIndex,
    activeSlice: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    /** The slice's share of the whole, 0 to 1. */
    activeFraction: activeIndex >= 0 ? (slices[activeIndex]?.fraction ?? 0) : 0,
  };
}

export interface PieChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** One entry per slice, in the order they are drawn clockwise. */
  data: readonly PieDatum[];
  /** Fixed diameter in pixels. Fills the container's width as a square when omitted. */
  size?: number;
  /**
   * The hole, as a share of the radius. `0` is a pie. Anything above it is a
   * donut, and `0.55` to `0.65` leaves room for a readout in the middle.
   */
  innerRadius?: number;
  /** Where the first slice begins, in degrees clockwise from twelve o'clock. */
  startAngle?: number;
  /**
   * Where the last one ends, on the same clock. A turn between the two closes
   * the pie, and anything less leaves a gap and reads as a dial.
   */
  endAngle?: number;
  /** Gap between one slice and the next, in degrees. */
  padAngle?: number;
  /**
   * The smallest angle any non-zero slice is drawn at, in degrees. The angle it
   * borrows comes off the others in proportion, so the turn still closes.
   */
  minAngle?: number;
  /** Milliseconds for the pie to unroll. */
  animationDuration?: number;
  /** `loading` holds the slices back and unrolls them when it turns `ready`. */
  status?: PieChartStatus;
  /** The slice being read. Leave unset to let the chart track it. */
  activeIndex?: number;
  /** Fires with the slice being read, or `-1` when there is none. */
  onActiveIndexChange?: (index: number) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one slice. Defaults to its name and share. */
  labelForDatum?: (datum: PieDatum, index: number) => string;
}

/** Imperative handle: re-run the unroll, for a "replay" control. */
export interface PieChartHandle {
  replay: () => void;
}

const PieChartRoot = forwardRef<PieChartHandle, PieChartProps & RenderProp<'div'>>(function PieChartRoot(
  {
    data,
    size,
    innerRadius = 0,
    startAngle = 0,
    endAngle = 360,
    padAngle = 0,
    minAngle = 0,
    animationDuration = 620,
    status = 'ready',
    activeIndex: activeIndexProp,
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
  const slotClasses = pieChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<ChartInteractionController<SliceRow, number, number> | null>(null);
  const scope = useId();
  const [measured, setMeasured] = useState(0);
  const [slicesConfig, setSlices] = useState<SlicesConfig | undefined>(undefined);
  const [internalActive, setInternalActive] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [unrolling, setUnrolling] = useState(true);

  /*
   * The chart mounts once its width is known. Mounted at a guess, the first
   * measurement is a resize.
   */
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => setMeasured(node.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const loading = status === 'loading';
  const box = size ?? measured;
  const radius = Math.max(box / 2 - LIFT, 0);
  const hole = radius * Math.max(0, Math.min(innerRadius, 0.95));

  const values = useMemo(() => data.map((datum) => datum.value), [data]);
  const total = useMemo(() => pieTotal(values), [values]);
  const slices = useMemo(
    () => pieSlices(values, { startAngle, endAngle, padAngle, minAngle }),
    [values, startAngle, endAngle, padAngle, minAngle]
  );
  // What is on screen, which trails `slices` through a data change. The angles
  // are tweened here because a morph between two drawn arcs interpolates the
  // large-arc flag as well: a flag of 0.5 is not a valid path, so any slice
  // crossing half a turn would vanish until the morph ended.
  const [drawn, setDrawn] = useState<readonly PieSliceAngles[]>(slices);
  const drawnRef = useRef<readonly PieSliceAngles[]>(slices);
  useEffect(() => {
    const from = drawnRef.current;
    if (from === slices) return;
    // An inline `data` array is new on every render without anything having moved.
    if (from.length === slices.length && from.every((slice, i) => slice.from === slices[i]!.from && slice.to === slices[i]!.to)) {
      drawnRef.current = slices;
      return;
    }
    const show = (next: readonly PieSliceAngles[]) => {
      drawnRef.current = next;
      setDrawn(next);
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show(slices);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const elapsed = Math.min(1, (now - began) / MORPH_DURATION);
      show(elapsed < 1 ? pieSlicesBetween(from, slices, 1 - (1 - elapsed) ** 3) : slices);
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [slices]);

  const colors = useMemo(
    () => data.map((datum, index) => (datum.color ? COLORS[datum.color] : PALETTE[index % PALETTE.length]!)),
    [data]
  );

  const wanted = activeIndexProp ?? internalActive;
  // An index the data no longer has reads nothing.
  const activeIndex = wanted < data.length ? wanted : -1;

  // A reading is reported when it changes, not per pointer event.
  const reported = useRef(-1);
  // Latest in a ref, so an inline callback does not count as a new reading.
  const onChange = useRef(onActiveIndexChange);
  useEffect(() => {
    onChange.current = onActiveIndexChange;
  });
  const report = useCallback((index: number) => {
    if (reported.current === index) return;
    reported.current = index;
    setInternalActive(index);
    onChange.current?.(index);
  }, []);

  // Held in a ref because the pointer's reports must not move a slice that was pressed.
  const pinned = useRef(-1);
  // A controlled value is the reading now, whatever was last reported or pressed.
  useEffect(() => {
    if (activeIndexProp === undefined) return;
    reported.current = activeIndexProp;
    if (pinned.current !== activeIndexProp) pinned.current = -1;
  }, [activeIndexProp]);
  const read = useCallback(
    (index: number) => {
      if (pinned.current < 0) report(index);
    },
    [report]
  );
  const togglePin = useCallback(
    (index: number) => {
      pinned.current = pinned.current === index ? -1 : index;
      report(pinned.current);
    },
    [report]
  );
  const release = useCallback(() => {
    pinned.current = -1;
    report(-1);
  }, [report]);
  // A held slice that was removed would otherwise block every other reading.
  useEffect(() => {
    if (pinned.current >= data.length || reported.current >= data.length) release();
  }, [data.length, release]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        setUnrolling(true);
        setRevision((current) => current + 1);
      },
    }),
    []
  );

  // Back to loading arms the unroll again, so a refetch does not land fully drawn.
  useEffect(() => {
    if (loading) {
      setUnrolling(true);
      release();
    }
  }, [loading, release]);

  // A remounted chart says nothing about the focus it lost.
  useEffect(() => {
    if (revision > 0 && pinned.current < 0) report(-1);
  }, [revision, report]);

  // The drawing only reads the slices and the geometry. The reading stays out of
  // here on purpose: a new definition would drop the chart's own focus.
  const definition = useMemo(() => {
    const rows: SliceRow[] = drawn.flatMap((slice, index) =>
      slice.to > slice.from
        ? [{ index, startAngle: slice.from * Math.PI * 2, endAngle: slice.to * Math.PI * 2 }]
        : []
    );
    return defineChart({
      theme: THEME,
      marks: [
        polar({
          scales: { angle: null, radius: null },
          marks: [
            radialArc(rows, {
              id: SLICES_MARK,
              key: 'index',
              innerRadius: hole,
              outerRadius: radius,
              cornerRadius: slicesConfig?.cornerRadius ?? 0,
              fill: (row) => colors[row.index] ?? PALETTE[0]!,
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      margin: 0,
      guides: false,
      focusRing: false,
      keyboard: true,
      pointer: true,
      // By the slice under the pointer, and round the dial in data order for the
      // arrow keys. The presets go by position on the screen, so Home would land
      // on whichever slice is furthest left.
      focus: {
        resolve: (points, { x, y }) => {
          const hit = pieSliceAt(drawn, x - box / 2, y - box / 2, hole, radius);
          return points.filter((point) => point.datum.index === hit);
        },
        group: (_points, { point }) => [point],
        navigation: (points) => [...points].sort((a, b) => a.datum.index - b.datum.index),
      },
      motion: false,
    });
  }, [drawn, colors, box, radius, hole, slicesConfig?.cornerRadius]);

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const onFocusChange = (point: ChartPoint<SliceRow, number, number> | null) => read(point ? point.datum.index : -1);

  const summary = label ?? `Pie chart, ${data.length} ${data.length === 1 ? 'slice' : 'slices'}`;
  const spoken = (datum: PieDatum, index: number) =>
    labelForDatum?.(datum, index) ?? `${datum.label}, ${Math.round((slices[index]?.fraction ?? 0) * 100)} percent`;

  const context = useMemo<PieChartContextValue>(
    () => ({
      data,
      total,
      slices,
      colors,
      radius,
      hole,
      box,
      startAngle,
      endAngle,
      loading,
      activeIndex,
      setSlices,
      read,
      togglePin,
    }),
    [data, total, slices, colors, radius, hole, box, startAngle, endAngle, loading, activeIndex, read, togglePin]
  );

  // Slices are found by the key the mark gives them, which holds the row's index and nothing the caller wrote.
  const active = activeIndex >= 0 ? slices[activeIndex] : undefined;
  const popOut = slicesConfig?.popOut ?? 6;
  const lift = active ? ((active.mid - 0.25) * Math.PI * 2) : 0;
  const reading = slicesConfig
    ? `[data-pie-scope="${scope}"] [data-ts-key^="${SLICES_MARK}:"]{transition:transform ${SELECT_DURATION}ms ease-out,fill-opacity ${SELECT_DURATION}ms ease-out}` +
      (active
        ? `[data-pie-scope="${scope}"] [data-ts-key^="${SLICES_MARK}:"]:not([data-ts-key$=":${activeIndex}"]){fill-opacity:${slicesConfig.dimOpacity}}` +
          `[data-pie-scope="${scope}"] [data-ts-key^="${SLICES_MARK}:"][data-ts-key$=":${activeIndex}"]{transform:translate(${(Math.cos(lift) * popOut).toFixed(2)}px,${(Math.sin(lift) * popOut).toFixed(2)}px)}`
        : '')
    : '';

  const span = Math.min(Math.max(endAngle - startAngle, 0), 360);
  const sweepVars = {
    '--panelui-pie-start': `${startAngle}deg`,
    '--panelui-pie-span': `${span}deg`,
    '--panelui-pie-duration': `${animationDuration}ms`,
  } as CSSProperties;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pie-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((datum, index) => (
                  <li key={index}>{spoken(datum, index)}</li>
                ))}
              </ul>
            )}
            <div
              ref={plotRef}
              data-slot="pie-chart-plot"
              data-pie-scope={scope}
              className={slotClasses.plot()}
              style={size ? { width: size, height: size } : { aspectRatio: 1 }}
              onClick={(event) => {
                const target = interactionRef.current?.resolvePointer(event.clientX, event.clientY);
                const point = target?.point;
                if (point) togglePin(point.datum.index);
                else if (pinned.current >= 0) release();
              }}
              // Before the chart moves its focus, so the move is read rather than ignored.
              onKeyDownCapture={(event) => {
                if (NAVIGATION_KEYS.has(event.key)) pinned.current = -1;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  interactionRef.current?.setControlledFocus(null);
                  release();
                }
                if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
                  event.preventDefault();
                  togglePin(activeIndex);
                }
              }}
            >
              <style>{SWEEP_STYLES + reading}</style>
              {box > 0 && !loading && slicesConfig ? (
                <div
                  key={revision}
                  data-pie-unroll={unrolling ? '' : undefined}
                  className="absolute inset-0"
                  style={sweepVars}
                  onAnimationEnd={() => setUnrolling(false)}
                >
                  <Chart
                    definition={definition}
                    renderer={renderer}
                    ariaLabel={summary}
                    aspectRatio={1}
                    initialWidth={box}
                    className={slotClasses.chart()}
                    onFocusChange={onFocusChange}
                    onRender={({ interaction }) => {
                      interactionRef.current = interaction;
                    }}
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

  return <PieChartContext.Provider value={context}>{element}</PieChartContext.Provider>;
});
PieChartRoot.displayName = 'PieChart';

export interface PieChartSlicesProps {
  /** Rounds the four turns of each slice, in pixels. */
  cornerRadius?: number;
  /** How far a slice lifts out of the pie while it is read, in pixels. */
  popOut?: number;
  /** Opacity of the other slices while one is read. */
  dimOpacity?: number;
}

/**
 * Every slice, in the order the data lists them. One part rather than one per
 * datum, because slices share a radius, a hole and a dial by definition.
 */
function PieChartSlices({ cornerRadius = 0, popOut = 6, dimOpacity = 0.35 }: PieChartSlicesProps) {
  const { setSlices } = useChart('PieChart.Slices');
  useEffect(() => {
    setSlices({ cornerRadius, popOut, dimOpacity });
    return () => setSlices(undefined);
  }, [cornerRadius, popOut, dimOpacity, setSlices]);
  return null;
}
PieChartSlices.displayName = 'PieChart.Slices';

export interface PieChartSkeletonProps extends ComponentProps<'div'> {
  /** Which of the theme's roles to draw the band in. Defaults to the muted surface. */
  color?: PieChartColor;
}

/**
 * The loading state: the dial as one plain band, with nothing divided up yet,
 * because placeholder slices would be a made-up split. It stays mounted through
 * the unroll and fades under the slices sweeping over it.
 */
function PieChartSkeleton({ color, className, style, render, ...props }: PieChartSkeletonProps & RenderProp<'div'>) {
  const { radius, hole, box, startAngle, endAngle, loading } = useChart('PieChart.Skeleton');
  const slots = pieChartVariants();
  const span = Math.min(Math.max(endAngle - startAngle, 0), 360);
  const band = `radial-gradient(closest-side,transparent ${(hole / Math.max(radius, 1)) * 100}%,#000 calc(${(hole / Math.max(radius, 1)) * 100}% + 0.5px))`;
  const dial = `conic-gradient(from ${startAngle}deg,#000 ${span}deg,transparent 0)`;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pie-chart-skeleton',
        'aria-hidden': true,
        className: slots.skeleton({ className }),
        style: {
          width: radius * 2,
          height: radius * 2,
          marginTop: LIFT,
          opacity: loading ? 1 : 0,
          ...(color ? { background: COLORS[color] } : {}),
          borderRadius: '50%',
          maskImage: `${band},${dial}`,
          maskComposite: 'intersect',
          ...style,
        },
      },
      props
    ),
  });

  return box > 0 ? element : null;
}
PieChartSkeleton.displayName = 'PieChart.Skeleton';

export interface PieChartCenterProps {
  /** Heading shown when no slice is read. */
  defaultLabel?: string;
  /** Format the number under the label. Defaults to a compact number. */
  formatValue?: (value: number, slice: PieDatum | null) => string;
  /** Draw the middle yourself. Given the slice being read, or `null` when there is none. */
  children?: (slice: PieDatum | null) => ReactNode;
  /** Added to the readout. */
  className?: string;
}

/**
 * The hole's readout: the total, and the slice's own figures while one is read.
 * It keeps to the square that fits inside the hole, and draws nothing on a pie
 * with no hole.
 */
function PieChartCenter({ defaultLabel = 'Total', formatValue, children, className }: PieChartCenterProps) {
  const { data, slices, total, hole, activeIndex, loading } = useChart('PieChart.Center');
  const slots = pieChartVariants();
  const room = holeRoom(hole);
  if (room <= 0 || loading) return null;

  const slice = activeIndex >= 0 ? (data[activeIndex] ?? null) : null;
  const share = activeIndex >= 0 ? (slices[activeIndex]?.fraction ?? 0) : 0;
  const format = formatValue ?? ((value: number) => compactNumber(value));
  const full = room >= FULL_CENTER_ROOM;

  return (
    <div data-slot="pie-chart-center" className={slots.center({ className })} style={{ maxWidth: room }}>
      {children ? (
        children(slice)
      ) : (
        <>
          <div className={slots.centerLabel()}>{slice ? slice.label : defaultLabel}</div>
          <div className={slots.centerValue({ className: full ? 'text-xl' : 'text-lg' })}>
            {format(slice ? slice.value : total, slice)}
          </div>
          {full && slice ? (
            <div className={slots.centerCaption()}>{`${Math.round(share * 100)}% of ${format(total, null)}`}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
PieChartCenter.displayName = 'PieChart.Center';

export interface PieChartLegendProps extends ComponentProps<'div'> {
  /** Show each slice's share of the whole beside its name. */
  showValue?: boolean;
}

/**
 * A swatch, a name and a share per slice, under the dial. Each entry is a button
 * for the same reading as its slice, and the easier target for a small one.
 */
function PieChartLegend({ showValue = true, className, render, ...props }: PieChartLegendProps & RenderProp<'div'>) {
  const { data, slices, colors, activeIndex, read, togglePin } = useChart('PieChart.Legend');
  const slots = pieChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pie-chart-legend',
        className: slots.legend({ className }),
        children: data.map((slice, index) => {
          const percent = Math.round((slices[index]?.fraction ?? 0) * 100);
          return (
            <button
              key={index}
              type="button"
              aria-pressed={activeIndex === index}
              aria-label={`${slice.label}, ${percent} percent`}
              className={slots.legendButton()}
              style={{ opacity: activeIndex >= 0 && activeIndex !== index ? LEGEND_DIM : 1 }}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') read(index);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') read(-1);
              }}
              onClick={() => togglePin(index)}
            >
              <span className={slots.legendSwatch()} style={{ background: colors[index] }} />
              <span className={slots.legendName()}>{slice.label}</span>
              {showValue ? <span className={slots.legendValue()}>{percent}%</span> : null}
            </button>
          );
        }),
      },
      props
    ),
  });

  return data.length ? element : null;
}
PieChartLegend.displayName = 'PieChart.Legend';

export interface PieChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Prettier names for the slices, keyed by their `label`. */
  labels?: Record<string, string>;
  /**
   * Draw a swatch and a name per slice along the trailing edge, for two or three
   * short names. Past that use `PieChart.Legend`, which has the whole width.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the pie: what the chart is of, what it reads and what the
 * colours mean. The value is not derived here, because a total is a count or a
 * currency depending on what was counted, and only the caller knows which.
 */
function PieChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: PieChartHeaderProps & RenderProp<'div'>) {
  const { data, colors } = useChart('PieChart.Header');
  const slots = pieChartVariants();
  const trailing =
    children ??
    (legend && data.length
      ? data.map((slice, index) => (
          <span key={index} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colors[index] }} />
            {labels?.[slice.label] ?? slice.label}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'pie-chart-header',
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
PieChartHeader.displayName = 'PieChart.Header';

export const PieChart = Object.assign(PieChartRoot, {
  Header: PieChartHeader,
  Slices: PieChartSlices,
  Center: PieChartCenter,
  Legend: PieChartLegend,
  Skeleton: PieChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { PieChartHeader, PieChartSlices, PieChartCenter, PieChartLegend, PieChartSkeleton };
