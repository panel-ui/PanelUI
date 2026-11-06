'use client';

/**
 * PolarAreaChart: several readings compared on one measure, as a dial.
 *
 * ```tsx
 * <PolarAreaChart data={scores}>
 *   <PolarAreaChart.Grid />
 *   <PolarAreaChart.Wedges />
 *   <PolarAreaChart.Labels />
 *   <PolarAreaChart.Legend />
 * </PolarAreaChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's PolarAreaChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a colour
 * is named by the theme's role, hovering a wedge reads it, a click or a tap holds the
 * reading, and the arrow keys walk the wedges.
 *
 * ## One reading
 *
 * Hover, the keyboard, a press and the legend all set one index. The dimming is CSS
 * over the drawn wedges, so reading never rebuilds the chart.
 *
 * ## The growth
 *
 * Wedges grow outward, because the radius is the quantity: a wedge half drawn is a
 * smaller reading. The radii are tweened here and each frame draws plain arcs, because
 * a morph between two drawn arcs interpolates the large-arc flag into an invalid path,
 * and a chart of one or two wedges spans half a turn.
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
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  polarBoxInside,
  polarNiceMax,
  polarPoint,
  polarRadiiBetween,
  polarReach,
  polarWedgeAt,
  polarWedges,
  type PolarAreaScale,
  type PolarWedge,
} from './polar-layout';

export type { PolarAreaScale };

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Whether the chart is showing data or waiting for it. */
export type PolarAreaChartStatus = 'loading' | 'ready';

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

/** Which of the theme's roles a wedge is drawn in. */
export type PolarAreaChartColor = keyof typeof COLORS;

/** One wedge. Its angle is fixed, so only the value decides how far it reaches. */
export interface PolarAreaDatum {
  /** Name for the legend, the readout and screen readers. */
  label: string;
  /** How far the wedge reaches, against `maxValue`. Negatives are treated as zero. */
  value: number;
  /** Which of the theme's roles to draw it in. Defaults to the chart palette, in order. */
  color?: PolarAreaChartColor;
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: PALETTE,
};

const polarAreaChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative z-1 col-start-1 row-start-2 w-full justify-self-center',
    chart:
      'absolute! inset-0 cursor-pointer touch-pan-y rounded-full text-xs [&_svg]:rounded-full [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    grid: 'pointer-events-none col-start-1 row-start-2 justify-self-center text-border',
    skeleton: 'pointer-events-none col-start-1 row-start-2 self-center justify-self-center rounded-full bg-muted',
    overlay: 'pointer-events-none relative z-2 col-start-1 row-start-2 justify-self-center',
    label: 'absolute flex size-16 items-center justify-center truncate text-xs font-semibold tabular-nums transition-opacity motion-reduce:transition-none',
    tooltip:
      'absolute flex w-33 flex-col items-center rounded-lg border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
    tooltipName: 'max-w-full truncate font-medium',
    tooltipValue: 'max-w-full truncate text-muted-foreground tabular-nums',
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

const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
const WEDGE_MARK = 'polar-wedge-';
const SELECT_DURATION = 180;
const LEGEND_DIM = 0.4;
/** How far along its own radius a wedge's label sits. */
const LABEL_AT = 0.62;
/** The side of the box a label is centred in, matching `size-16`. */
const LABEL_BOX = 64;
const DEFAULT_MIN_LABEL_RADIUS = 34;
/** The readout's measured box, matching `w-33`. */
const TOOLTIP_WIDTH = 132;
const TOOLTIP_HEIGHT = 44;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactNumber = (value: number) => COMPACT.format(value);

/** Black or white by the fill's own lightness, so a label holds up on any theme's colour. */
const inkOn = (fill: string) => `oklch(from ${fill} clamp(0, (0.65 - l) * 1000, 1) 0 0)`;

interface WedgeRow {
  index: number;
  startAngle: number;
  endAngle: number;
}

interface WedgesConfig {
  cornerRadius: number;
  dimOpacity: number;
}

interface PolarAreaChartContextValue {
  data: readonly PolarAreaDatum[];
  wedges: readonly PolarWedge[];
  colors: readonly string[];
  box: number;
  radius: number;
  maxValue: number;
  scale: PolarAreaScale;
  loading: boolean;
  activeIndex: number;
  dimOpacity: number;
  setWedges: (config: WedgesConfig | undefined) => void;
  read: (index: number) => void;
  togglePin: (index: number) => void;
}

const PolarAreaChartContext = createContext<PolarAreaChartContextValue | null>(null);

function useChart(component: string): PolarAreaChartContextValue {
  const context = useContext(PolarAreaChartContext);
  if (!context) throw new Error(`${component} must be used within a <PolarAreaChart>`);
  return context;
}

/** The wedge being read, for something rendered inside the chart. */
export function usePolarAreaChart() {
  const { data, wedges, activeIndex } = useChart('usePolarAreaChart');
  return {
    activeIndex,
    activeDatum: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    activeFraction: activeIndex >= 0 ? (wedges[activeIndex]?.fraction ?? 0) : 0,
  };
}

export interface PolarAreaChartHandle {
  /** Grow the wedges out of the centre again. */
  replay: () => void;
}

export interface PolarAreaChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** One entry per wedge, drawn clockwise in the order they are listed. */
  data: readonly PolarAreaDatum[];
  /** Diameter in pixels. Without it the chart fills its container's width as a square. */
  size?: number;
  /** The value the outermost ring stands for. Defaults to a round number above the largest value. */
  maxValue?: number;
  /** `radius` puts the value on the radius, `area` on the ink. */
  scale?: PolarAreaScale;
  /** Where the first wedge begins, in degrees clockwise from twelve o'clock. */
  startAngle?: number;
  /** Gap between one wedge and the next, in degrees. */
  padAngle?: number;
  /** `loading` shows `PolarAreaChart.Skeleton`, then the wedges grow when it turns `ready`. */
  status?: PolarAreaChartStatus;
  /** Milliseconds for the wedges to grow, and to move when `data` changes. */
  animationDuration?: number;
  /** The wedge being read. Leave unset to let the chart track it. */
  activeIndex?: number;
  /** Fires when the reading changes, from a hover, a key or a press, with `-1` when it ends. */
  onActiveIndexChange?: (index: number) => void;
  /** Names the chart for screen readers. */
  label?: string;
  /** Writes one wedge for screen readers, for a value with a unit. */
  labelForDatum?: (datum: PolarAreaDatum, index: number) => string;
}

const PolarAreaChartRoot = forwardRef<PolarAreaChartHandle, PolarAreaChartProps & RenderProp<'div'>>(function PolarAreaChartRoot(
  {
    data,
    size,
    maxValue: maxValueProp,
    scale = 'radius',
    startAngle = 0,
    padAngle = 0,
    status = 'ready',
    animationDuration = 620,
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
  const slots = polarAreaChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<ChartInteractionController<WedgeRow, number, number> | null>(null);
  const scope = useId();
  const [measured, setMeasured] = useState(0);
  const [wedgesConfig, setWedges] = useState<WedgesConfig | undefined>(undefined);
  const [internalActive, setInternalActive] = useState(-1);
  const [revision, setRevision] = useState(0);

  // The chart mounts once its width is known. Mounted at a guess, the first measurement is a resize.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const measure = () => setMeasured(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const loading = status === 'loading';
  const box = size ?? measured;
  const radius = Math.max(box / 2 - 1, 0);
  const values = useMemo(() => data.map((datum) => datum.value), [data]);
  const maxValue = maxValueProp && maxValueProp > 0 ? maxValueProp : polarNiceMax(Math.max(0, ...values));
  const wedges = useMemo(
    () => polarWedges(values, { radius, maxValue, scale, startAngle, padAngle }),
    [values, radius, maxValue, scale, startAngle, padAngle]
  );
  const colors = useMemo(
    () => data.map((datum, index) => (datum.color ? COLORS[datum.color] : PALETTE[index % PALETTE.length]!)),
    [data]
  );

  // What is on screen, which trails `wedges` through the growth and a data change.
  const [drawn, setDrawn] = useState<readonly number[]>([]);
  const drawnRef = useRef<readonly number[]>([]);
  const drawnRadius = useRef(0);
  useEffect(() => {
    const show = (next: readonly number[]) => {
      drawnRef.current = next;
      setDrawn(next);
    };
    // Back to loading arms the growth again, so a refetch does not land fully drawn.
    if (loading) {
      show([]);
      return;
    }
    const target = wedges.map((wedge) => wedge.radius);
    const from = drawnRef.current;
    const resized = drawnRadius.current > 0 && drawnRadius.current !== radius;
    drawnRadius.current = radius;
    // An inline `data` array is new on every render without anything having moved.
    if (from.length === target.length && from.every((value, index) => value === target[index])) return;
    // A resize is not a change in the readings, and a tween would trail the container.
    if (resized || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show(target);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const elapsed = Math.min(1, (now - began) / animationDuration);
      show(elapsed < 1 ? polarRadiiBetween(from, target, 1 - (1 - elapsed) ** 3) : target);
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [wedges, radius, loading, animationDuration, revision]);

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

  // Held in a ref because the pointer's reports must not move a wedge that was pressed.
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
  // A held wedge that was removed would otherwise block every other reading.
  useEffect(() => {
    if (pinned.current >= data.length || reported.current >= data.length) release();
  }, [data.length, release]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        drawnRef.current = [];
        setDrawn([]);
        setRevision((current) => current + 1);
      },
    }),
    []
  );

  useEffect(() => {
    if (loading) release();
  }, [loading, release]);

  // The drawing only reads the wedges and the geometry. The reading stays out of it, so hovering never rebuilds it.
  const definition = useMemo(() => {
    const cornerRadius = wedgesConfig?.cornerRadius ?? 0;
    return defineChart({
      theme: THEME,
      marks: [
        polar({
          scales: { angle: null, radius: null },
          // One mark per wedge, because a mark's radius is one number.
          marks: wedges.map((wedge, index) =>
            radialArc(
              [{ index, startAngle: wedge.from * Math.PI * 2, endAngle: wedge.to * Math.PI * 2 } satisfies WedgeRow],
              {
                id: `${WEDGE_MARK}${index}`,
                key: 'index',
                innerRadius: 0,
                outerRadius: drawn[index] ?? 0,
                cornerRadius,
                fill: () => colors[index] ?? PALETTE[0]!,
              }
            )
          ),
        }),
      ],
      scales: { x: null, y: null },
      margin: 0,
      guides: false,
      focusRing: false,
      keyboard: true,
      pointer: true,
      // By the wedge under the pointer, and round the dial in data order for the arrow keys.
      focus: {
        resolve: (points, { x, y }) => {
          const hit = polarWedgeAt(wedges, x - box / 2, y - box / 2);
          return points.filter((point) => point.datum.index === hit);
        },
        group: (_points, { point }) => [point],
        navigation: (points) => [...points].sort((a, b) => a.datum.index - b.datum.index),
      },
      motion: false,
    });
  }, [wedges, drawn, colors, box, wedgesConfig?.cornerRadius]);

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const onFocusChange = (point: ChartPoint<WedgeRow, number, number> | null) => read(point ? point.datum.index : -1);

  const summary = label ?? `Polar area chart, ${data.length} ${data.length === 1 ? 'wedge' : 'wedges'}`;
  const spoken = (datum: PolarAreaDatum, index: number) => labelForDatum?.(datum, index) ?? `${datum.label}, ${compactNumber(datum.value)}`;
  const dimOpacity = wedgesConfig?.dimOpacity ?? 0.35;

  const context = useMemo<PolarAreaChartContextValue>(
    () => ({ data, wedges, colors, box, radius, maxValue, scale, loading, activeIndex, dimOpacity, setWedges, read, togglePin }),
    [data, wedges, colors, box, radius, maxValue, scale, loading, activeIndex, dimOpacity, read, togglePin]
  );

  // Wedges are found by the key the mark gives them, which holds the mark's index and nothing the caller wrote.
  // The path only, because the mark's group carries the same prefix and would dim the wedge being read.
  const allWedges = `[data-polar-scope="${scope}"] path[data-ts-key^="${WEDGE_MARK}"]`;
  const reading =
    `${allWedges}{transition:fill-opacity ${SELECT_DURATION}ms ease-out}` +
    (activeIndex >= 0 ? `${allWedges}:not([data-ts-key^="${WEDGE_MARK}${activeIndex}:"]){fill-opacity:${dimOpacity}}` : '');

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'polar-area-chart',
        className: slots.root({ className }),
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
              data-slot="polar-area-chart-plot"
              data-polar-scope={scope}
              className={slots.plot()}
              style={size ? { width: size, height: size } : { aspectRatio: 1 }}
              onClick={(event) => {
                const point = interactionRef.current?.resolvePointer(event.clientX, event.clientY)?.point;
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
              <style>{reading}</style>
              {box > 0 && !loading && wedgesConfig && data.length ? (
                <Chart
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={1}
                  initialWidth={box}
                  className={slots.chart()}
                  onFocusChange={onFocusChange}
                  onRender={({ interaction }) => {
                    interactionRef.current = interaction;
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

  return <PolarAreaChartContext.Provider value={context}>{element}</PolarAreaChartContext.Provider>;
});
PolarAreaChartRoot.displayName = 'PolarAreaChart';

export interface PolarAreaChartGridProps {
  /** How many rings, including the outermost. */
  rings?: number;
  /** Which of the theme's roles to draw it in. Defaults to the border colour. */
  color?: PolarAreaChartColor;
  /** Draw a line from the centre out along each wedge's edge. */
  spokes?: boolean;
}

/**
 * The scale, drawn as rings. Each ring stands for an even step of the value and sits
 * where that value falls, which under `scale="area"` is not an even step of the radius.
 */
function PolarAreaChartGrid({ rings = 4, color, spokes = false }: PolarAreaChartGridProps) {
  const { box, radius, maxValue, scale, wedges } = useChart('PolarAreaChart.Grid');
  if (radius <= 0 || rings < 1) return null;
  const center = box / 2;
  const stroke = color ? COLORS[color] : 'currentColor';

  return (
    <svg
      data-slot="polar-area-chart-grid"
      aria-hidden
      className={polarAreaChartVariants().grid()}
      width={box}
      height={box}
      fill="none"
      stroke={stroke}
    >
      {Array.from({ length: rings }, (_, index) => (
        <circle
          key={index}
          cx={center}
          cy={center}
          r={polarReach(((index + 1) / rings) * maxValue, { radius, maxValue, scale })}
        />
      ))}
      {spokes
        ? wedges.map((wedge, index) => {
            const point = polarPoint(center, radius, wedge.from);
            return <line key={index} x1={center} y1={center} x2={point.x} y2={point.y} />;
          })
        : null}
    </svg>
  );
}
PolarAreaChartGrid.displayName = 'PolarAreaChart.Grid';

export interface PolarAreaChartWedgesProps {
  /** Rounds the turns of each wedge, in pixels. */
  cornerRadius?: number;
  /** Opacity of the other wedges while one is read. */
  dimOpacity?: number;
}

/**
 * Every wedge, in the order the data lists them. One part rather than one per datum,
 * because the wedges share a dial, a maximum and a scale by definition.
 */
function PolarAreaChartWedges({ cornerRadius = 0, dimOpacity = 0.35 }: PolarAreaChartWedgesProps) {
  const { setWedges } = useChart('PolarAreaChart.Wedges');
  useEffect(() => {
    setWedges({ cornerRadius, dimOpacity });
    return () => setWedges(undefined);
  }, [cornerRadius, dimOpacity, setWedges]);
  return null;
}
PolarAreaChartWedges.displayName = 'PolarAreaChart.Wedges';

export interface PolarAreaChartLabelsProps {
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number, datum: PolarAreaDatum) => string;
  /** Wedges reaching less far than this, in pixels, are left unlabelled. */
  minRadius?: number;
  /** Added to each label. */
  className?: string;
}

/**
 * The reading on each wedge with room for it. A shorter wedge is left blank, because
 * its label would sit beside a neighbour it does not describe. Those are read through
 * `Tooltip` and the legend.
 */
function PolarAreaChartLabels({ formatValue, minRadius = DEFAULT_MIN_LABEL_RADIUS, className }: PolarAreaChartLabelsProps) {
  const { data, wedges, colors, box, loading, activeIndex, dimOpacity } = useChart('PolarAreaChart.Labels');
  if (loading || box <= 0 || !wedges.length) return null;
  const slots = polarAreaChartVariants();
  const format = formatValue ?? ((value: number) => compactNumber(value));

  return (
    <div data-slot="polar-area-chart-labels" aria-hidden className={slots.overlay()} style={{ width: box, height: box }}>
      {wedges.map((wedge, index) => {
        const datum = data[index];
        if (!datum || wedge.radius < minRadius) return null;
        const point = polarPoint(box / 2, wedge.radius * LABEL_AT, wedge.mid);
        return (
          <div
            key={index}
            className={slots.label({ className })}
            style={{
              left: point.x - LABEL_BOX / 2,
              top: point.y - LABEL_BOX / 2,
              color: inkOn(colors[index]!),
              opacity: activeIndex >= 0 && activeIndex !== index ? dimOpacity : 1,
            }}
          >
            {format(datum.value, datum)}
          </div>
        );
      })}
    </div>
  );
}
PolarAreaChartLabels.displayName = 'PolarAreaChart.Labels';

export interface PolarAreaChartTooltipProps {
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number, datum: PolarAreaDatum) => string;
  /** Added to the readout. */
  className?: string;
}

/** The readout for the wedge being read, floating over the dial, and how the short wedges are named. */
function PolarAreaChartTooltip({ formatValue, className }: PolarAreaChartTooltipProps) {
  const { data, wedges, box, loading, activeIndex } = useChart('PolarAreaChart.Tooltip');
  const datum = data[activeIndex];
  const wedge = wedges[activeIndex];
  if (loading || !datum || !wedge) return null;
  const slots = polarAreaChartVariants();
  const format = formatValue ?? ((value: number) => compactNumber(value));
  const point = polarPoint(box / 2, wedge.radius * LABEL_AT, wedge.mid);

  return (
    <div data-slot="polar-area-chart-tooltip" className={slots.overlay()} style={{ width: box, height: box }}>
      <div
        className={slots.tooltip({ className })}
        style={{
          left: polarBoxInside(point.x, TOOLTIP_WIDTH, box),
          top: polarBoxInside(point.y, TOOLTIP_HEIGHT, box),
        }}
      >
        <span className={slots.tooltipName()}>{datum.label}</span>
        <span className={slots.tooltipValue()}>{format(datum.value, datum)}</span>
      </div>
    </div>
  );
}
PolarAreaChartTooltip.displayName = 'PolarAreaChart.Tooltip';

export interface PolarAreaChartSkeletonProps extends ComponentProps<'div'> {
  /** Which of the theme's roles to draw the disc in. Defaults to the muted surface. */
  color?: PolarAreaChartColor;
}

/**
 * The loading state: one plain disc, because placeholder wedges would be a made-up set
 * of readings.
 */
function PolarAreaChartSkeleton({ color, className, style, render, ...props }: PolarAreaChartSkeletonProps & RenderProp<'div'>) {
  const { radius, loading } = useChart('PolarAreaChart.Skeleton');
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'polar-area-chart-skeleton',
        'aria-hidden': true,
        className: polarAreaChartVariants().skeleton({ className }),
        style: {
          width: radius * 1.24,
          height: radius * 1.24,
          ...(color ? { background: COLORS[color] } : {}),
          ...style,
        },
      },
      props
    ),
  });
  return loading && radius > 0 ? element : null;
}
PolarAreaChartSkeleton.displayName = 'PolarAreaChart.Skeleton';

export interface PolarAreaChartLegendProps extends ComponentProps<'div'> {
  /** Show each wedge's reading beside its name. */
  showValue?: boolean;
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number, datum: PolarAreaDatum) => string;
}

/**
 * A swatch, a name and a reading per wedge, under the dial. The reading rather than a
 * share, because these values need not add up to anything. Each entry is a button for
 * the same reading as its wedge, and the easier target for a short one.
 */
function PolarAreaChartLegend({ showValue = true, formatValue, className, render, ...props }: PolarAreaChartLegendProps & RenderProp<'div'>) {
  const { data, colors, activeIndex, read, togglePin } = useChart('PolarAreaChart.Legend');
  const slots = polarAreaChartVariants();
  const format = formatValue ?? ((value: number) => compactNumber(value));

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'polar-area-chart-legend',
        className: slots.legend({ className }),
        children: data.map((datum, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={activeIndex === index}
            aria-label={`${datum.label}, ${format(datum.value, datum)}`}
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
            <span className={slots.legendName()}>{datum.label}</span>
            {showValue ? <span className={slots.legendValue()}>{format(datum.value, datum)}</span> : null}
          </button>
        )),
      },
      props
    ),
  });

  return data.length ? element : null;
}
PolarAreaChartLegend.displayName = 'PolarAreaChart.Legend';

export interface PolarAreaChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Prettier names for the wedges, keyed by their `label`. */
  labels?: Record<string, string>;
  /** Draw a swatch and a name per wedge along the trailing edge, for two or three short names. */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/** The strip above the dial. The value is not derived here, because its formatting is the caller's to know. */
function PolarAreaChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: PolarAreaChartHeaderProps & RenderProp<'div'>) {
  const { data, colors } = useChart('PolarAreaChart.Header');
  const slots = polarAreaChartVariants();
  const trailing =
    children ??
    (legend && data.length
      ? data.map((datum, index) => (
          <span key={index} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colors[index] }} />
            {labels?.[datum.label] ?? datum.label}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'polar-area-chart-header',
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
PolarAreaChartHeader.displayName = 'PolarAreaChart.Header';

export const PolarAreaChart = Object.assign(PolarAreaChartRoot, {
  Header: PolarAreaChartHeader,
  Grid: PolarAreaChartGrid,
  Wedges: PolarAreaChartWedges,
  Labels: PolarAreaChartLabels,
  Tooltip: PolarAreaChartTooltip,
  Legend: PolarAreaChartLegend,
  Skeleton: PolarAreaChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  PolarAreaChartHeader,
  PolarAreaChartGrid,
  PolarAreaChartWedges,
  PolarAreaChartLabels,
  PolarAreaChartTooltip,
  PolarAreaChartLegend,
  PolarAreaChartSkeleton,
};
