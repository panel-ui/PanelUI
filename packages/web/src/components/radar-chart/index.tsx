'use client';

/**
 * RadarChart: several measures of one thing, drawn as one shape.
 *
 * ```tsx
 * <RadarChart data={scores} axisKey="skill" domain={[0, 100]}>
 *   <RadarChart.Grid />
 *   <RadarChart.Axis />
 *   <RadarChart.Series dataKey="you" />
 *   <RadarChart.Tooltip />
 * </RadarChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's RadarChart. What differs is what the
 * web changes: a colour is named by the theme's role, and `RadarChart.Tooltip` adds a
 * reading by pointer and by keyboard, which a screen you hold does not need.
 *
 * ## Parts describe, the root draws
 *
 * A `Series` registers what it wants and draws nothing itself, because the shapes all
 * have to go into one chart, in order, over one measured box.
 *
 * ## The movement
 *
 * The fractions are tweened here, so a shape grows from the centre and travels between
 * two profiles a vertex at a time, with the stroke at its final width throughout. A
 * change part way through another carries on from what is on screen.
 */
import { defineChart } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { polar, radialArea, radialDot, radialLine } from '@tanstack/charts/polar';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
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
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import {
  radarAxisAt,
  radarBetween,
  radarBoxInside,
  radarDomain,
  radarFraction,
  radarKeyWalk,
  radarLabelPlacement,
  radarPoint,
  radarValue,
  type RadarChartDatum,
} from './radar-layout';

export type { RadarChartDatum };

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

/** Whether the chart is showing data or waiting for it. */
export type RadarChartStatus = 'loading' | 'ready';

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

/** Which of the theme's roles a part is drawn in. */
export type RadarChartColor = keyof typeof COLORS;

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: PALETTE,
};

const radarChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative z-1 col-start-1 row-start-2 max-w-full cursor-default touch-pan-y justify-self-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
    surface: 'absolute inset-0',
    chart: 'absolute! inset-0 text-xs',
    grid: 'pointer-events-none col-start-1 row-start-2 max-w-full justify-self-center text-border',
    overlay: 'pointer-events-none relative z-2 col-start-1 row-start-2 max-w-full justify-self-center',
    axisLabel: 'absolute truncate font-medium whitespace-nowrap text-muted-foreground',
    tooltip:
      'absolute flex w-33 flex-col gap-0.5 rounded-lg border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
    tooltipTitle: 'truncate font-medium',
    tooltipRow: 'flex items-center gap-1.5 text-muted-foreground',
    tooltipName: 'min-w-0 flex-1 truncate',
    tooltipValue: 'font-medium text-popover-foreground tabular-nums',
    legend: 'pointer-events-none relative z-2 col-start-1 row-start-2 flex flex-col gap-1 self-end justify-self-start text-xs',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    legendName: 'truncate text-muted-foreground',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing:
      'flex max-w-[55%] shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Room around the rings for the labels, wider than tall because the labels are horizontal. */
const LABEL_ROOM = { x: 62, y: 26 };
/** With no labels asking for it, only enough not to clip the stroke. */
const BARE_ROOM = { x: 6, y: 6 };
const DEFAULT_SIZE = 180;
/** How long one profile takes to travel to the next. The growth is `animationDuration`. */
const MORPH_DURATION = 420;
/** The readout's width, matching `w-33`, and its height before and per series. */
const TOOLTIP_WIDTH = 132;
const TOOLTIP_BASE_HEIGHT = 30;
const TOOLTIP_ROW_HEIGHT = 18;
/** How far along its spoke the readout sits. */
const TOOLTIP_AT = 0.5;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactNumber = (value: number) => COMPACT.format(value);

interface SeriesConfig {
  dataKey: string;
  name?: string;
  color?: RadarChartColor;
  strokeWidth: number;
  fillOpacity: number;
  showDots: boolean;
}

interface VertexRow {
  angle: number;
  radius: number;
}

type Fractions = Record<string, readonly (number | null)[]>;

interface RadarChartContextValue {
  data: readonly RadarChartDatum[];
  axisKey: string;
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  series: readonly SeriesConfig[];
  colorOf: (dataKey: string) => string;
  nameOf: (config: SeriesConfig) => string;
  fractions: Fractions;
  loading: boolean;
  activeIndex: number;
  registerSeries: (config: SeriesConfig) => void;
  unregisterSeries: (dataKey: string) => void;
}

const RadarChartContext = createContext<RadarChartContextValue | null>(null);

function useChart(component: string): RadarChartContextValue {
  const context = useContext(RadarChartContext);
  if (!context) throw new Error(`${component} must be used within a <RadarChart>`);
  return context;
}

export interface RadarChartHandle {
  /** Grow the shapes out of the centre again. */
  replay: () => void;
}

export interface RadarChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** One row per axis, in the order they go round, with one key per series. */
  data: readonly RadarChartDatum[];
  /** The key holding each row's axis label. */
  axisKey?: string;
  /** `loading` draws the rings and no shape, and the shapes grow when it turns `ready`. */
  status?: RadarChartStatus;
  /** Ring diameter in pixels, with room for the labels added around it. Pass `null` to fill the width at `aspectRatio`. */
  size?: number | null;
  /** Width over height of the plot when `size` is `null`. */
  aspectRatio?: number;
  /** The values at the centre and at the outer ring. Defaults to zero and just above the largest value. */
  domain?: readonly [number, number];
  /** Milliseconds for the shapes to grow. */
  animationDuration?: number;
  /** Drop the room for axis labels, for a chart without them. */
  compact?: boolean;
  /** Names the chart for screen readers. */
  label?: string;
  /** Writes one axis for screen readers, for values with a unit. */
  labelForDatum?: (datum: RadarChartDatum, index: number) => string;
}

const RadarChartRoot = forwardRef<RadarChartHandle, RadarChartProps & RenderProp<'div'>>(function RadarChartRoot(
  {
    data,
    axisKey = 'axis',
    status = 'ready',
    size = DEFAULT_SIZE,
    aspectRatio = 1,
    domain,
    animationDuration = 620,
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
  const slots = radarChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [series, setSeries] = useState<readonly SeriesConfig[]>([]);
  const [active, setActive] = useState(-1);
  const [revision, setRevision] = useState(0);

  // The chart mounts once its box is known. Mounted at a guess, the first measurement is a resize.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const registerSeries = useCallback((config: SeriesConfig) => {
    setSeries((current) => {
      const at = current.findIndex((entry) => entry.dataKey === config.dataKey);
      // In place, so changing a prop does not reorder the shapes or their colours.
      if (at < 0) return [...current, config];
      return current.map((entry, index) => (index === at ? config : entry));
    });
  }, []);
  const unregisterSeries = useCallback((dataKey: string) => {
    setSeries((current) => current.filter((entry) => entry.dataKey !== dataKey));
  }, []);

  const room = compact ? BARE_ROOM : LABEL_ROOM;
  const { width, height } = box;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(Math.min(width / 2 - room.x, height / 2 - room.y), 0);
  const loading = status === 'loading';
  const count = data.length;

  const domainMin = domain?.[0];
  const domainMax = domain?.[1];
  const seriesKeys = series.map((entry) => entry.dataKey).join('\0');
  // By the values, so an inline `domain` or a new prop on a series does not count as a change.
  const target = useMemo<Fractions>(() => {
    const keys = seriesKeys ? seriesKeys.split('\0') : [];
    const extent = radarDomain(data, keys, domainMin === undefined || domainMax === undefined ? undefined : [domainMin, domainMax]);
    return Object.fromEntries(
      keys.map((key) => [
        key,
        data.map((row) => {
          const value = radarValue(row[key]);
          return value === null ? null : radarFraction(value, extent);
        }),
      ])
    );
  }, [data, seriesKeys, domainMin, domainMax]);

  // What is on screen, which trails `target` through the growth and a change of data.
  const [fractions, setFractions] = useState<Fractions>({});
  const fractionsRef = useRef<Fractions>({});
  useEffect(() => {
    const show = (next: Fractions) => {
      fractionsRef.current = next;
      setFractions(next);
    };
    // Back to loading arms the growth again, so a refetch does not land fully drawn.
    if (loading) {
      show({});
      return;
    }
    const from = fractionsRef.current;
    const keys = Object.keys(target);
    const moved =
      keys.length !== Object.keys(from).length ||
      keys.some((key) => {
        const before = from[key];
        const after = target[key]!;
        return before?.length !== after.length || after.some((value, index) => value !== before[index]);
      });
    // An inline `data` array is new on every render without anything having moved.
    if (!moved) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show(target);
      return;
    }
    const growing = keys.some((key) => !from[key]);
    const duration = growing ? animationDuration : MORPH_DURATION;
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const elapsed = Math.min(1, (now - began) / duration);
      const progress = 1 - (1 - elapsed) ** 3;
      show(
        elapsed < 1
          ? Object.fromEntries(keys.map((key) => [key, radarBetween(from[key], target[key]!, progress)]))
          : target
      );
      if (elapsed < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, loading, animationDuration, revision]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        fractionsRef.current = {};
        setFractions({});
        setRevision((current) => current + 1);
      },
    }),
    []
  );

  // One reading. Pressing holds it, so the pointer's reports must not move it. Hence the ref.
  const pinned = useRef(false);
  const release = useCallback(() => {
    pinned.current = false;
    setActive(-1);
  }, []);
  const activeIndex = !loading && count >= 3 && active < count ? active : -1;
  useEffect(() => {
    if (loading || active >= count) release();
  }, [loading, active, count, release]);

  const axisUnder = (clientX: number, clientY: number) => {
    const rect = plotRef.current?.getBoundingClientRect();
    return rect ? radarAxisAt(clientX - rect.left - cx, clientY - rect.top - cy, count, radius) : -1;
  };

  const definition = useMemo(
    () =>
      defineChart({
        theme: THEME,
        marks: [
          polar({
            // Both in the units the rows already hold: radians, and a share of the outer ring.
            scales: {
              angle: { scale: scaleLinear([0, Math.PI * 2], [0, Math.PI * 2]) },
              radius: { scale: scaleLinear([0, 1], [0, 1]), range: [0, radius] },
            },
            marks: series.flatMap((config, order) => {
              const color = config.color ? COLORS[config.color] : PALETTE[order % PALETTE.length]!;
              const values = fractions[config.dataKey] ?? [];
              const vertices: VertexRow[] = [];
              values.forEach((fraction, index) => {
                if (fraction !== null) vertices.push({ angle: (index / count) * Math.PI * 2, radius: fraction });
              });
              // Fewer than three readings is not a shape, and two spokes' worth of line would read as one.
              if (count < 3 || vertices.length < 3) return [];
              const outline = [...vertices, vertices[0]!];
              const shape = { angle: (row: VertexRow) => row.angle, radius: (row: VertexRow) => row.radius };
              return [
                radialArea(outline, { ...shape, id: `radar-area-${config.dataKey}`, radius1: 0, fill: () => color, fillOpacity: config.fillOpacity }),
                radialLine(outline, { ...shape, id: `radar-line-${config.dataKey}`, stroke: () => color, strokeWidth: config.strokeWidth }),
                ...(config.showDots ? [radialDot(vertices, { ...shape, id: `radar-dot-${config.dataKey}`, r: 3, fill: () => color })] : []),
              ];
            }),
          }),
        ],
        scales: { x: null, y: null },
        margin: 0,
        guides: false,
        focusRing: false,
        keyboard: false,
        pointer: false,
        motion: false,
      }),
    [series, fractions, count, radius]
  );

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

  const colorOf = useCallback(
    (dataKey: string) => {
      const order = series.findIndex((entry) => entry.dataKey === dataKey);
      const config = series[order];
      return config?.color ? COLORS[config.color] : PALETTE[Math.max(order, 0) % PALETTE.length]!;
    },
    [series]
  );
  const nameOf = useCallback((config: SeriesConfig) => config.name ?? config.dataKey, []);

  const summary = label ?? `Radar chart, ${count} ${count === 1 ? 'axis' : 'axes'}`;
  const spoken = (row: RadarChartDatum, index: number) =>
    labelForDatum?.(row, index) ??
    [
      String(row[axisKey] ?? ''),
      ...series.map((config) => {
        const value = radarValue(row[config.dataKey]);
        return `${nameOf(config)} ${value === null ? 'no value' : compactNumber(value)}`;
      }),
    ].join(', ');

  const context = useMemo<RadarChartContextValue>(
    () => ({ data, axisKey, width, height, cx, cy, radius, series, colorOf, nameOf, fractions: target, loading, activeIndex, registerSeries, unregisterSeries }),
    [data, axisKey, width, height, cx, cy, radius, series, colorOf, nameOf, target, loading, activeIndex, registerSeries, unregisterSeries]
  );

  const activeRow = activeIndex >= 0 ? data[activeIndex] : undefined;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'radar-chart',
        className: slots.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((row, index) => (
                  <li key={index}>{spoken(row, index)}</li>
                ))}
              </ul>
            )}
            <div aria-live="polite" className="sr-only">
              {activeRow ? spoken(activeRow, activeIndex) : ''}
            </div>
            <div
              ref={plotRef}
              data-slot="radar-chart-plot"
              role="group"
              aria-label={summary}
              tabIndex={0}
              className={slots.plot()}
              style={
                size
                  ? { width: size + room.x * 2, height: size + room.y * 2 }
                  : { width: '100%', aspectRatio }
              }
              // A finger reads by pressing, and its drags are the page scrolling.
              onPointerMove={(event) => {
                if (event.pointerType !== 'touch' && !pinned.current) setActive(axisUnder(event.clientX, event.clientY));
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch' && !pinned.current) setActive(-1);
              }}
              onBlur={() => {
                if (!pinned.current) setActive(-1);
              }}
              onClick={(event) => {
                const axis = axisUnder(event.clientX, event.clientY);
                pinned.current = axis >= 0 && !(pinned.current && axis === activeIndex);
                setActive(pinned.current ? axis : -1);
              }}
              onKeyDown={(event) => {
                const next = radarKeyWalk(activeIndex, count, event.key);
                if (next !== undefined) {
                  event.preventDefault();
                  pinned.current = false;
                  setActive(next);
                } else if (event.key === 'Escape') {
                  release();
                } else if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
                  event.preventDefault();
                  pinned.current = !pinned.current;
                }
              }}
            >
              {/* The chart refuses a scale no mark uses, so it waits for a shape. */}
              {radius > 0 && count >= 3 && Object.values(fractions).some((values) => values.filter((value) => value !== null).length >= 3) ? (
                // Inert, because the drawing would otherwise take focus away from the plot, which reads the keys.
                <div inert className={slots.surface()}>
                  <Chart definition={definition} renderer={renderer} ariaLabel={summary} aspectRatio={width / height} initialWidth={width} className={slots.chart()} />
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

  return <RadarChartContext.Provider value={context}>{element}</RadarChartContext.Provider>;
});
RadarChartRoot.displayName = 'RadarChart';

export interface RadarChartGridProps {
  /** How many rings, including the outermost. */
  rings?: number;
  /** Which of the theme's roles to draw it in. Defaults to the border colour. */
  color?: RadarChartColor;
  /** Draw the rings as circles rather than polygons through the spokes. */
  circular?: boolean;
  /** Draw a line from the centre to the rim along each axis. */
  spokes?: boolean;
}

/**
 * The scale, as rings. Polygons by default, because they are read against the shape on
 * top of them, and a round ring behind a polygon gives each axis a different distance
 * to the edge. Fewer than three axes is not a shape, so it draws nothing.
 */
function RadarChartGrid({ rings = 4, color, circular = false, spokes = true }: RadarChartGridProps) {
  const { data, width, height, cx, cy, radius } = useChart('RadarChart.Grid');
  const count = data.length;
  if (count < 3 || radius <= 0 || rings < 1) return null;

  const polygon = (reach: number) =>
    Array.from({ length: count }, (_, index) => {
      const point = radarPoint(cx, cy, reach, index, count);
      return `${point.x},${point.y}`;
    }).join(' ');

  return (
    <svg
      data-slot="radar-chart-grid"
      aria-hidden
      className={radarChartVariants().grid()}
      width={width}
      height={height}
      fill="none"
      stroke={color ? COLORS[color] : 'currentColor'}
    >
      {Array.from({ length: rings }, (_, index) => {
        const reach = (radius * (index + 1)) / rings;
        return circular ? <circle key={index} cx={cx} cy={cy} r={reach} /> : <polygon key={index} points={polygon(reach)} />;
      })}
      {spokes
        ? Array.from({ length: count }, (_, index) => {
            const point = radarPoint(cx, cy, radius, index, count);
            return <line key={index} x1={cx} y1={cy} x2={point.x} y2={point.y} />;
          })
        : null}
    </svg>
  );
}
RadarChartGrid.displayName = 'RadarChart.Grid';

export interface RadarChartAxisProps {
  /** Which of the theme's roles to draw the labels in. Defaults to the muted text colour. */
  color?: RadarChartColor;
  /** Label size in pixels. */
  fontSize?: number;
  /** Gap between the outer ring and the label, in pixels. */
  offset?: number;
  /** Rewrite a label, usually to shorten it. */
  formatLabel?: (label: string, index: number) => string;
}

/**
 * The axis names around the rings. Each runs away from the shape by which side of the
 * circle it is on, and a label too long for the room ends in an ellipsis.
 */
function RadarChartAxis({ color, fontSize = 11, offset = 10, formatLabel }: RadarChartAxisProps) {
  const { data, axisKey, width, height, cx, cy, radius } = useChart('RadarChart.Axis');
  const count = data.length;
  if (count < 3 || radius <= 0) return null;
  const slots = radarChartVariants();
  const shift = { start: '0', middle: '-50%', end: '-100%' };

  return (
    <div data-slot="radar-chart-axis" aria-hidden className={slots.overlay()} style={{ width, height }}>
      {data.map((row, index) => {
        const raw = String(row[axisKey] ?? '');
        const point = radarPoint(cx, cy, radius + offset, index, count);
        const { align, maxWidth } = radarLabelPlacement(point.x, cx, radius, width);
        return (
          <span
            key={index}
            className={slots.axisLabel()}
            style={{
              left: point.x,
              top: point.y,
              maxWidth,
              fontSize,
              color: color ? COLORS[color] : undefined,
              transform: `translate(${shift[align]}, ${point.y < cy ? '-100%' : '0'})`,
            }}
          >
            {formatLabel ? formatLabel(raw, index) : raw}
          </span>
        );
      })}
    </div>
  );
}
RadarChartAxis.displayName = 'RadarChart.Axis';

export interface RadarChartSeriesProps {
  /** The key in each row holding this series' value. */
  dataKey: string;
  /** What the legend, the readout and screen readers call it. Defaults to `dataKey`. */
  name?: string;
  /** Which of the theme's roles to draw it in. Defaults to the chart palette, in the order the series are declared. */
  color?: RadarChartColor;
  /** Outline width in pixels. */
  strokeWidth?: number;
  /** Opacity of the fill. Pass `0` for an outline only. */
  fillOpacity?: number;
  /** Draw a dot at each vertex. */
  showDots?: boolean;
}

/**
 * One profile. An axis with no number is left out of the shape, and a series with fewer
 * than three numbers draws nothing, because two points are a line.
 */
function RadarChartSeries({ dataKey, name, color, strokeWidth = 2, fillOpacity = 0.18, showDots = false }: RadarChartSeriesProps) {
  const { registerSeries, unregisterSeries } = useChart('RadarChart.Series');
  useEffect(() => {
    registerSeries({ dataKey, name, color, strokeWidth, fillOpacity, showDots });
  }, [dataKey, name, color, strokeWidth, fillOpacity, showDots, registerSeries]);
  useEffect(() => () => unregisterSeries(dataKey), [dataKey, unregisterSeries]);
  return null;
}
RadarChartSeries.displayName = 'RadarChart.Series';

export interface RadarChartTooltipProps {
  /** Format a value. Defaults to a compact number. */
  formatValue?: (value: number, dataKey: string) => string;
  /** Added to the readout. */
  className?: string;
}

/**
 * The reading for the axis nearest the pointer or walked to with the keys: its spoke
 * lit, a dot where each series crosses it, and each series' value in a readout.
 */
function RadarChartTooltip({ formatValue, className }: RadarChartTooltipProps) {
  const { data, axisKey, width, height, cx, cy, radius, series, colorOf, nameOf, fractions, activeIndex } = useChart('RadarChart.Tooltip');
  const row = data[activeIndex];
  if (!row) return null;
  const slots = radarChartVariants();
  const count = data.length;
  const rim = radarPoint(cx, cy, radius, activeIndex, count);
  const anchor = radarPoint(cx, cy, radius * TOOLTIP_AT, activeIndex, count);
  const boxHeight = TOOLTIP_BASE_HEIGHT + TOOLTIP_ROW_HEIGHT * series.length;

  return (
    <div data-slot="radar-chart-tooltip" className={slots.overlay()} style={{ width, height }}>
      <svg aria-hidden className="absolute inset-0" width={width} height={height}>
        <line x1={cx} y1={cy} x2={rim.x} y2={rim.y} stroke="var(--muted-foreground)" />
        {series.map((config) => {
          const fraction = fractions[config.dataKey]?.[activeIndex];
          if (fraction === null || fraction === undefined) return null;
          const point = radarPoint(cx, cy, fraction * radius, activeIndex, count);
          return <circle key={config.dataKey} cx={point.x} cy={point.y} r={4} fill={colorOf(config.dataKey)} stroke="var(--background)" strokeWidth={1.5} />;
        })}
      </svg>
      <div
        className={slots.tooltip({ className })}
        style={{
          left: radarBoxInside(anchor.x, TOOLTIP_WIDTH, width),
          top: radarBoxInside(anchor.y, boxHeight, height),
        }}
      >
        <span className={slots.tooltipTitle()}>{String(row[axisKey] ?? '')}</span>
        {series.map((config) => {
          const value = radarValue(row[config.dataKey]);
          return (
            <span key={config.dataKey} className={slots.tooltipRow()}>
              <span className={slots.legendSwatch()} style={{ background: colorOf(config.dataKey) }} />
              <span className={slots.tooltipName()}>{nameOf(config)}</span>
              <span className={slots.tooltipValue()}>
                {value === null ? 'n/a' : formatValue ? formatValue(value, config.dataKey) : compactNumber(value)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
RadarChartTooltip.displayName = 'RadarChart.Tooltip';

export interface RadarChartLegendProps extends ComponentProps<'div'> {
  /** Rewrite a series' name. */
  formatName?: (dataKey: string) => string;
}

/** The series, named and coloured, in the bottom-left corner of the plot, which the circle leaves empty. */
function RadarChartLegend({ formatName, className, render, ...props }: RadarChartLegendProps & RenderProp<'div'>) {
  const { series, colorOf, nameOf } = useChart('RadarChart.Legend');
  const slots = radarChartVariants();
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'radar-chart-legend',
        className: slots.legend({ className }),
        children: series.map((config) => (
          <div key={config.dataKey} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colorOf(config.dataKey) }} />
            <span className={slots.legendName()}>{formatName ? formatName(config.dataKey) : nameOf(config)}</span>
          </div>
        )),
      },
      props
    ),
  });
  return series.length ? element : null;
}
RadarChartLegend.displayName = 'RadarChart.Legend';

export interface RadarChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Draw a swatch and a name per series along the trailing edge. */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/** The strip above the rings. The value is not derived here, because its formatting is the caller's to know. */
function RadarChartHeader({ title, value, caption, legend = false, className, children, render, ...props }: RadarChartHeaderProps & RenderProp<'div'>) {
  const { series, colorOf, nameOf } = useChart('RadarChart.Header');
  const slots = radarChartVariants();
  const trailing =
    children ??
    (legend && series.length
      ? series.map((config) => (
          <span key={config.dataKey} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colorOf(config.dataKey) }} />
            {nameOf(config)}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'radar-chart-header',
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
RadarChartHeader.displayName = 'RadarChart.Header';

export const RadarChart = Object.assign(RadarChartRoot, {
  Header: RadarChartHeader,
  Grid: RadarChartGrid,
  Axis: RadarChartAxis,
  Series: RadarChartSeries,
  Tooltip: RadarChartTooltip,
  Legend: RadarChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { RadarChartHeader, RadarChartGrid, RadarChartAxis, RadarChartSeries, RadarChartTooltip, RadarChartLegend };
