'use client';

/**
 * HexChart — a whole broken into parts, counted out in cells.
 *
 * ```tsx
 * <HexChart data={attribution}>
 *   <HexChart.Header title="Attributed revenue" value="$6,750" />
 *   <HexChart.Cells />
 *   <HexChart.Tooltip />
 *   <HexChart.Legend />
 * </HexChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's HexChart, so a chart written for one
 * reads the same in the other. What differs is what the web changes: a series is read
 * by hovering its cells as well as by pressing them, a press pins the reading, and the
 * arrow keys walk the series.
 *
 * ## The field
 *
 * The cells are pointy-top hexagons on an offset grid. The unfilled cells are drawn too,
 * because the field is the denominator made visible. `shape` decides how the filled ones
 * are arranged: `grid` is reading order, which a reader can count off, and `blob` grows
 * the series out from the middle, which shows the shape of the split at a glance.
 *
 * ## Whole cells
 *
 * Every cell is a whole unit, so a series worth half a cell either rounds up to a full
 * one or vanishes. Cells are handed out by largest remainder, so the count always
 * spends exactly the cells available.
 */
import { defineChart, hexagon, type ChartMotionContext } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart } from '@tanstack/charts/react/core';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { hexAt, hexPlan, type HexCell, type HexPlan, type HexShape } from './hex-layout';

export type { HexShape } from './hex-layout';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type HexChartStatus = 'loading' | 'ready';

/** One slice of the whole. */
export interface HexDatum {
  /** The series' name, in the legend and to a screen reader. */
  label: string;
  /** How much of the whole it holds. Cells are shared out in proportion. */
  value: number;
  /** A theme role or any CSS colour. Defaults to the chart ramp, in data order. */
  color?: string;
}

const ROLES = new Set(['primary', 'info', 'success', 'warning', 'destructive', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']);

/** A theme role by name, or anything else as the CSS colour it already is. */
const colorOf = (color: string) => (ROLES.has(color) ? `var(--${color})` : color);

const hexChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
    chart: 'absolute! inset-0 [&_path]:origin-center [&_path]:[transform-box:fill-box]',
    label:
      'pointer-events-none absolute col-start-1 row-start-2 flex items-center gap-1.5 self-start justify-self-start rounded-lg border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md',
    labelDetail: 'text-muted-foreground',
    swatch: 'size-2 shrink-0 rounded-full',
    legend: 'col-start-1 row-start-3 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3',
    legendItem:
      'flex max-w-full cursor-pointer items-center gap-1.5 rounded-sm text-xs outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
    legendName: 'truncate text-muted-foreground',
    legendValue: 'font-medium tabular-nums',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex max-w-[55%] shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
    headerKey: 'flex items-center gap-1.5',
  },
});

/** How much of the reveal goes to staggering the cells' start times. */
const STAGGER_SHARE = 0.6;

/** Clearance between the label and the cells it is naming. */
const LABEL_GAP = 6;

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Grows the filled cells in from the start of the fill order, all landing inside the
 * one duration. The field stays put, because the total did not change. The renderer
 * gives a hexagon no entrance of its own on a chart's first paint.
 */
function landCells(container: Element, duration: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cells = [...container.querySelectorAll('svg [data-ts-key*=":hex:"]')];
  const orderOf = (cell: Element) => Number(/:hex:(\d+):/.exec(cell.getAttribute('data-ts-key') ?? '')?.[1] ?? 0);
  const last = Math.max(1, ...cells.map(orderOf));
  cells.forEach((cell) => {
    cell.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
      duration: duration * (1 - STAGGER_SHARE),
      delay: (orderOf(cell) / last) * duration * STAGGER_SHARE,
      easing: 'ease-out',
      fill: 'backwards',
    });
  });
}

/** What the parts have asked for. */
interface Slots {
  cells?: { emptyColor: string; dimOpacity: number };
  skeleton?: { fill: string };
  tooltip?: true;
}

interface HexChartContextValue {
  data: readonly HexDatum[];
  total: number;
  colors: readonly string[];
  plan: HexPlan;
  box: { width: number; height: number };
  loading: boolean;
  activeIndex: number;
  /** Selects a series as a press does: the same one again clears it. */
  press: (index: number) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
}

const HexChartContext = createContext<HexChartContextValue | null>(null);

function useChart(component: string): HexChartContextValue {
  const context = useContext(HexChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <HexChart>`);
  }
  return context;
}

const percentOf = (value: number, total: number) => (total > 0 ? Math.round((Math.max(0, value) / total) * 100) : 0);

export interface HexChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The slices of the whole. */
  data: readonly HexDatum[];
  /**
   * Cells across the field. Rows follow from the width, the height and this, and the
   * size of one cell follows from all three.
   */
  columns?: number;
  /** The field's width ÷ height. */
  aspectRatio?: number;
  /**
   * How much of the field a `blob` fills, from 0 to 1. A `grid` always fills all of it.
   * The rest is left as the unfilled cells around the shape.
   */
  density?: number;
  /** `blob` grows from the middle and shows the split at a glance. `grid` is reading order, for counting. */
  shape?: HexShape;
  /** Space between cells, as a share of a cell's radius. */
  cellGap?: number;
  /** Milliseconds for the series to fill in. `0` draws them at once. */
  animationDuration?: number;
  /** `loading` shows the field with nothing divided up yet. Add a `HexChart.Skeleton` to tint it. */
  status?: HexChartStatus;
  /** The series being read, by index, or -1 for none. Leave unset to let the chart keep it. */
  activeIndex?: number;
  /** The series being read, by index, and -1 when there is none. Reading needs `HexChart.Tooltip`. */
  onActiveIndexChange?: (index: number) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one series. Defaults to its name and share. */
  labelForDatum?: (series: HexDatum, index: number) => string;
}

/** Imperative handle: re-run the fill, for a "replay" control. */
export interface HexChartHandle {
  replay: () => void;
}

const HexChartRoot = forwardRef<HexChartHandle, HexChartProps & RenderProp<'div'>>(function HexChartRoot(
  {
    data,
    columns = 21,
    aspectRatio = 1.6,
    density = 0.55,
    shape = 'blob',
    cellGap = 0.14,
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
  const slotClasses = hexChartVariants();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [slots, setSlots] = useState<Slots>({});
  const [internalActive, setInternalActive] = useState(-1);
  const [revision, setRevision] = useState(0);
  const pinned = useRef(false);
  const landed = useRef('');

  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => setWidth(node.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<HexChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const loading = status === 'loading';
  const activeIndex = activeIndexProp ?? internalActive;
  const box = useMemo(() => ({ width, height: aspectRatio > 0 ? width / aspectRatio : 0 }), [width, aspectRatio]);
  const values = data.map(({ value }) => value).join();
  const plan = useMemo(
    () => hexPlan(values ? values.split(',').map(Number) : [], box, { columns, shape, density, loading }),
    [values, box, columns, shape, density, loading]
  );
  const total = data.reduce((sum, { value }) => sum + Math.max(0, value), 0);
  const colorKey = data.map(({ color }) => color ?? '').join();
  const colors = useMemo(
    () => data.map(({ color }, index) => (color ? colorOf(color) : `var(--chart-${(index % 5) + 1})`)),
    [colorKey, data.length]
  );

  const activeRef = useRef(activeIndex);
  const onChangeRef = useRef(onActiveIndexChange);
  // After commit, so a render React throws away leaves no reading `setActive` would skip.
  // Nothing active is nothing pinned, including when a parent clears a controlled selection.
  useLayoutEffect(() => {
    activeRef.current = activeIndex;
    onChangeRef.current = onActiveIndexChange;
    if (activeIndex < 0) pinned.current = false;
  });
  const setActive = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setInternalActive(index);
    onChangeRef.current?.(index);
  }, []);

  const press = useCallback(
    (index: number) => {
      const clearing = index < 0 || (activeRef.current === index && pinned.current);
      pinned.current = !clearing;
      setActive(clearing ? -1 : index);
    },
    [setActive]
  );

  const { cells, skeleton, tooltip } = slots;

  const definition = useMemo(() => {
    const radius = plan.metrics.radius * (1 - Math.max(0, Math.min(cellGap, 0.5)));
    const owned = (owner: number) => plan.cells.filter((cell) => cell.owner === owner);
    // The filled cells carry their place in the fill order in their key, for the entrance.
    const series = colors.map((fill, index) =>
      hexagon(owned(index), {
        id: `hex-${index}`,
        key: (cell: HexCell) => `hex:${cell.order}:${cell.column}:${cell.row}`,
        x: 'x',
        y: 'y',
        r: radius,
        fill,
        fillOpacity: activeIndex >= 0 && activeIndex !== index ? cells?.dimOpacity : 1,
      })
    );
    const field = hexagon(owned(-1), {
      id: 'hex-field',
      key: (cell: HexCell) => `field:${cell.column}:${cell.row}`,
      x: 'x',
      y: 'y',
      r: radius,
      fill: loading ? (skeleton?.fill ?? 'var(--muted)') : (cells?.emptyColor ?? 'var(--muted)'),
      motion: false,
    });

    return defineChart({
      theme: THEME,
      marks: !loading && cells ? [field, ...series] : loading ? [field] : [],
      scales: {
        x: { scale: scaleLinear([0, box.width], [0, 1]), axis: false as const, grid: false as const },
        y: { scale: scaleLinear([box.height, 0], [0, 1]), axis: false as const, grid: false as const },
      },
      guides: false as const,
      margin: 0,
      focusRing: false,
      keyboard: false,
      pointer: false,
      motion: (context: ChartMotionContext<HexCell>) =>
        context.phase === 'enter' ? (false as const) : { transition: { type: 'tween' as const, duration: 180, easing: 'ease-out' as const } },
    });
  }, [plan, box, colors, activeIndex, cells, skeleton, loading, cellGap]);

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 180, easing: 'ease-out' } }), []);

  // A remounted chart has no reading to keep. The first mount is not a remount, and
  // must leave a controlled `activeIndex` alone.
  const paint = `${revision}:${status}`;
  const lastPaint = useRef(paint);
  useEffect(() => {
    if (lastPaint.current === paint) return;
    lastPaint.current = paint;
    pinned.current = false;
    setActive(-1);
  }, [paint, setActive]);

  const ownerAt = (event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const cell = hexAt(event.clientX - bounds.left, event.clientY - bounds.top, plan);
    return cell ? (plan.cells[cell.row * plan.columns + cell.column]?.owner ?? -1) : -1;
  };
  const reads = tooltip === true && !loading;

  const summary = label ?? `Hex chart, ${data.length} series`;
  const spoken = (series: HexDatum, index: number) =>
    labelForDatum?.(series, index) ?? `${series.label}, ${percentOf(series.value, total)} percent`;

  const context = useMemo<HexChartContextValue>(
    () => ({ data, total, colors, plan, box, loading, activeIndex, press, setSlot }),
    [data, total, colors, plan, box, loading, activeIndex, press, setSlot]
  );

  const active = activeIndex >= 0 ? data[activeIndex] : undefined;

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'hex-chart',
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((series, index) => (
                  <li key={series.label}>{spoken(series, index)}</li>
                ))}
              </ul>
            )}
            <div role="status" className="sr-only">
              {active ? spoken(active, activeIndex) : ''}
            </div>
            <div
              ref={plotRef}
              data-slot="hex-chart-plot"
              role="group"
              aria-label={summary}
              tabIndex={reads ? 0 : undefined}
              className={slotClasses.plot()}
              style={{ aspectRatio }}
              onPointerMove={(event) => {
                if (reads && event.pointerType === 'mouse' && !pinned.current) setActive(ownerAt(event));
              }}
              onPointerLeave={() => {
                if (!pinned.current) setActive(-1);
              }}
              // A click rather than a pointer down, so that a scroll starting on the plot
              // does not pin the series under it.
              onClick={(event) => {
                if (reads) press(ownerAt(event));
              }}
              onKeyDown={(event) => {
                if (!reads || !data.length) return;
                if (event.key === 'Escape') return press(-1);
                const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                pinned.current = true;
                setActive(activeRef.current < 0 ? (step > 0 ? 0 : data.length - 1) : (activeRef.current + step + data.length) % data.length);
              }}
            >
              {width > 0 && box.height > 0 ? (
                <Chart
                  // An entrance only plays on a chart's first paint, so the cells
                  // arriving after a load, or a replay, are a new chart.
                  key={paint}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  aspectRatio={aspectRatio}
                  initialWidth={width}
                  className={slotClasses.chart()}
                  onRender={({ container, scene }) => {
                    if (loading || landed.current === paint || scene.points.length === 0) return;
                    landed.current = paint;
                    // The chart swaps its surface right after this call, and a frame
                    // callback still runs ahead of the first paint.
                    requestAnimationFrame(() => landCells(container, animationDuration));
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

  return <HexChartContext.Provider value={context}>{element}</HexChartContext.Provider>;
});
HexChartRoot.displayName = 'HexChart';

export interface HexChartCellsProps {
  /** Colour of the cells no series took, a theme role or any CSS colour. Defaults to the muted surface. */
  emptyColor?: string;
  /** Opacity of the series that are not being read, once one is. */
  dimOpacity?: number;
}

/**
 * The honeycomb: the unfilled field and the series over it. One part rather than one
 * per series, because one cell has to mean the same thing wherever it appears.
 */
function HexChartCells({
  emptyColor,
  dimOpacity = 0.25,
}: HexChartCellsProps) {
  const { setSlot } = useChart('HexChart.Cells');
  const resolved = emptyColor ? colorOf(emptyColor) : 'var(--muted)';
  useEffect(() => {
    setSlot('cells', { emptyColor: resolved, dimOpacity });
    return () => setSlot('cells', undefined);
  }, [resolved, dimOpacity, setSlot]);
  return null;
}
HexChartCells.displayName = 'HexChart.Cells';

export interface HexChartSkeletonProps {
  /** A theme role or any CSS colour. Defaults to the muted surface. */
  color?: string;
}

/**
 * The loading state: the field, with nothing divided up yet. Undivided on purpose,
 * because placeholder shares would be a made-up split.
 */
function HexChartSkeleton({ color }: HexChartSkeletonProps) {
  const { setSlot } = useChart('HexChart.Skeleton');
  const fill = color ? colorOf(color) : 'var(--muted)';
  useEffect(() => {
    setSlot('skeleton', { fill });
    return () => setSlot('skeleton', undefined);
  }, [fill, setSlot]);
  return null;
}
HexChartSkeleton.displayName = 'HexChart.Skeleton';

export interface HexChartTooltipProps {
  /** Format the series' value. Defaults to a compact number. */
  formatValue?: (value: number, series: HexDatum) => string;
  /** Show the count of cells beside the share. */
  showCells?: boolean;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * What makes the honeycomb readable, and the label that names the series. Hovering a
 * cell reads its series, a press pins it, pressing it again or an unfilled cell clears
 * it, and the arrow keys walk the series. The label hangs above the series so the cells
 * being read are never under it.
 */
function HexChartTooltip({
  formatValue,
  showCells = false,
  className,
}: HexChartTooltipProps) {
  const { data, total, colors, plan, box, loading, activeIndex, setSlot } = useChart('HexChart.Tooltip');
  const slots = hexChartVariants();
  const node = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setSlot('tooltip', true);
    return () => setSlot('tooltip', undefined);
  }, [setSlot]);

  const series = activeIndex >= 0 ? data[activeIndex] : undefined;
  const value = series ? (formatValue ? formatValue(series.value, series) : COMPACT.format(series.value)) : '';
  const percent = series ? percentOf(series.value, total) : 0;
  const detail = showCells ? `${percent}% · ${plan.counts[activeIndex] ?? 0} cells` : `${percent}%`;

  // Sized by its contents and placed once it knows its size, because a currency total
  // can be half again as wide as a compact one.
  useLayoutEffect(() => {
    if (!node.current) return;
    const { offsetWidth, offsetHeight } = node.current;
    setSize((current) =>
      current?.width === offsetWidth && current?.height === offsetHeight ? current : { width: offsetWidth, height: offsetHeight }
    );
  }, [value, detail]);

  const anchor = plan.anchors[activeIndex];
  if (loading || !series || !anchor) return null;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  return (
    <div
      ref={node}
      aria-hidden
      data-slot="hex-chart-tooltip"
      className={slots.label({ className })}
      style={{
        left: Math.max(0, Math.min(box.width - width, anchor.x - width / 2)),
        top: Math.max(0, Math.min(box.height - height, anchor.y - LABEL_GAP - height)),
        visibility: size ? 'visible' : 'hidden',
      }}
    >
      <span className={slots.swatch()} style={{ background: colors[activeIndex] }} />
      <span className="font-medium">{value}</span>
      <span className={slots.labelDetail()}>{detail}</span>
    </div>
  );
}
HexChartTooltip.displayName = 'HexChart.Tooltip';

export interface HexChartLegendProps extends ComponentProps<'div'> {
  /** Show each series' share of the whole beside its name. */
  showValue?: boolean;
}

/**
 * A swatch, a name and a share per series, under the chart. Each is a button that
 * selects its series, and usually the easier target: a series worth a couple of percent
 * is a handful of cells.
 */
function HexChartLegend({
  showValue = true,
  className,
  render,
  ...props
}: HexChartLegendProps & RenderProp<'div'>) {
  const { data, total, colors, activeIndex, press } = useChart('HexChart.Legend');
  const slots = hexChartVariants();
  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'hex-chart-legend',
        className: slots.legend({ className }),
        children: data.map((series, index) => {
          const percent = percentOf(series.value, total);
          return (
            <button
              key={series.label}
              type="button"
              aria-pressed={activeIndex === index}
              aria-label={`${series.label}, ${percent} percent`}
              className={slots.legendItem()}
              style={{ opacity: activeIndex >= 0 && activeIndex !== index ? 0.4 : 1 }}
              onClick={() => press(index)}
            >
              <span className={slots.swatch()} style={{ background: colors[index] }} />
              <span className={slots.legendName()}>{series.label}</span>
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
HexChartLegend.displayName = 'HexChart.Legend';

export interface HexChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Prettier names for the series, keyed by their `label`. */
  labels?: Record<string, string>;
  /**
   * Draw a swatch and a name per series along the trailing edge. For two or three short
   * names. Past that use `HexChart.Legend`, which runs across the full width.
   */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the honeycomb. The value is not derived here even though there is a
 * total, because a total of 6750 is a count, a currency or a percentage depending on
 * what was counted, and only the caller knows which.
 */
function HexChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: HexChartHeaderProps & RenderProp<'div'>) {
  const { data, colors } = useChart('HexChart.Header');
  const slots = hexChartVariants();
  const trailing =
    children ??
    (legend && data.length
      ? data.map((series, index) => (
          <span key={series.label} className={slots.headerKey()}>
            <span className={slots.swatch()} style={{ background: colors[index] }} />
            {labels?.[series.label] ?? series.label}
          </span>
        ))
      : null);
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'hex-chart-header',
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
HexChartHeader.displayName = 'HexChart.Header';

export const HexChart = Object.assign(HexChartRoot, {
  Header: HexChartHeader,
  Cells: HexChartCells,
  Tooltip: HexChartTooltip,
  Legend: HexChartLegend,
  Skeleton: HexChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { HexChartHeader, HexChartCells, HexChartTooltip, HexChartLegend, HexChartSkeleton };
