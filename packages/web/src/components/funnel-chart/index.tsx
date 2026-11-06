'use client';

/**
 * FunnelChart — how many were left at each step, and where the rest went.
 *
 * ```tsx
 * <FunnelChart data={checkout}>
 *   <FunnelChart.Header title="Checkout" value="41,800" />
 *   <FunnelChart.Stages />
 *   <FunnelChart.Labels />
 * </FunnelChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's FunnelChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, a stage is read by hovering, dragging or
 * the arrow keys, and a click pins the reading.
 *
 * ## The order is the caller's
 *
 * Every stage is a subset of the one above it, so stages are never sorted and
 * nothing is normalised to a total. A stage larger than the one above it is drawn
 * as given, because that is a real problem in the data.
 *
 * ## One ribbon, drawn in rings
 *
 * Each band is as tall as its value where it starts and as tall as the next
 * stage's where it ends. It is drawn several times concentrically, from a wide
 * faint ring to a tight near-solid core, so the edge falls off and text can sit on
 * the low-opacity fill. Each ring is one area mark over pixel scales.
 *
 * ## The whole column is the target
 *
 * A late stage can be a sliver, so reading is by column rather than by shape, and
 * the plot handles it directly: the chart's own focus works from a mark's points,
 * and these areas have only their two ends.
 */
import { areaY, defineChart, type ChartMotionContext } from '@tanstack/charts';
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
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { funnelLayout, ribbonCurve, stageAt, type FunnelLayout } from './funnel-layout';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type FunnelChartStatus = 'loading' | 'ready';

/** Whether the sides of a band are drawn as curves or as straight diagonals. */
export type FunnelEdges = 'curved' | 'straight';

/** Which conversion a stage's pill reports. */
export type FunnelShare = 'previous' | 'top' | 'none';

/** How the key under the run is arranged. */
export type FunnelLegendLayout = 'list' | 'inline';

/** Which of the theme's roles a stage is drawn in. */
export type FunnelChartColor =
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

const COLOR_VAR: Record<FunnelChartColor, string> = {
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

/** One step of the process. */
export interface FunnelDatum {
  /** Name of the step, for the label, the legend and the screen reader. */
  label: string;
  /** How many were left at it. Negatives are treated as zero. */
  value: number;
  /** Which of the theme's roles to draw it in, at full strength instead of the faded hue. */
  color?: FunnelChartColor;
}

const THEME = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  background: 'transparent',
  palette: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
};

const funnelChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    plot: 'relative col-start-1 row-start-2 w-full touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
    chart: 'absolute! inset-0',
    column:
      'absolute inset-y-0 flex cursor-pointer flex-col items-center outline-none transition-opacity duration-150 motion-reduce:transition-none data-dimmed:opacity-50',
    columnStrip: 'flex w-full min-w-0 flex-col items-center',
    columnValue: 'max-w-full truncate pb-1 text-sm font-semibold tabular-nums',
    columnMiddle: 'flex min-h-0 w-full flex-1 items-center justify-center',
    // A percentage is never cut: on a narrow column the pill overhangs instead.
    columnPill:
      'shrink-0 whitespace-nowrap rounded-full border border-border bg-background px-1.5 py-0.5 text-xs font-bold tabular-nums',
    columnName: 'max-w-full truncate pt-1 text-xs font-medium text-muted-foreground',
    legend: 'col-start-1 row-start-3 flex w-full pt-3',
    legendList: 'flex-col gap-1.5',
    legendInline: 'flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1.5',
    legendRow:
      'flex cursor-pointer items-center gap-1.5 rounded-sm text-start text-xs outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none data-dimmed:opacity-40',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    legendName: 'truncate text-muted-foreground',
    legendValue: 'font-medium tabular-nums',
    legendShare: 'tabular-nums',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex max-w-[55%] shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
  },
});

/** Milliseconds for a stage to dim and swell as another is read, and to settle on new data. */
const SELECT_DURATION = 180;

/** How far in the innermost ring is drawn from the outermost. */
const RING_INSET = 0.35;

/** Opacity of the outermost ring, and of the innermost. */
const RING_FAINTEST = 0.18;
const RING_STRONGEST = 0.83;

/** How much further the core spreads when its stage is read. */
const SELECT_SPREAD = 0.12;

/** Past a half, the sides' control points overshoot each other. See `ribbonCurve`. */
const CURVE = 0.55;

/** How far the placeholder ribbon narrows along the run. */
const SKELETON_TAPER = 0.4;

const SKELETON_MARK = 'funnel-chart-skeleton';

const STAGE_MARK = 'funnel-chart-stage-';

/*
 * Each stage grows out of the centre line, one after another. An area has no
 * entrance of its own to delay, so this runs in CSS on the marks' groups: every
 * ring of a stage shares its delay, through a variable the stage's rule sets.
 */
const KEYFRAMES = `@keyframes panelui-funnel-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@media (prefers-reduced-motion:no-preference){[data-slot=funnel-chart-plot][data-revealing] [data-ts-key^='${STAGE_MARK}']{transform-box:fill-box;transform-origin:center;animation:panelui-funnel-grow var(--funnel-grow) cubic-bezier(.33,1,.68,1) calc(var(--funnel-stage,0)*var(--funnel-stagger)) both}}`;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** One end of a ring's band. */
interface RingRow {
  stage: number;
  x: number;
  y1: number;
  y2: number;
}

/** What the parts have asked for. Formatters are read when the readings render, so a new one costs nothing. */
interface Slots {
  stages?: { dimOpacity: number };
  skeleton?: { color: FunnelChartColor | undefined };
  labels?: FunnelChartLabelsProps;
}

interface FunnelChartContextValue {
  data: readonly FunnelDatum[];
  layout: FunnelLayout;
  colors: readonly string[];
  activeIndex: number;
  /** A press on a stage's row or column: pins it, or lets it go. */
  press: (index: number) => void;
  /** A pointer over a stage's row, without a press. `-1` when it leaves. */
  preview: (index: number) => void;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
}

const FunnelChartContext = createContext<FunnelChartContextValue | null>(null);

function useChart(component: string): FunnelChartContextValue {
  const context = useContext(FunnelChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <FunnelChart>`);
  }
  return context;
}

/** The stage being read and how it converted, for something rendered inside the chart. */
export function useFunnelChart() {
  const { data, layout, activeIndex } = useChart('useFunnelChart');
  return {
    activeIndex,
    activeStage: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    /** Its share of the first stage, 0 to 1. */
    activeShare: activeIndex >= 0 ? (layout.shares[activeIndex] ?? 0) : 0,
    /** Its share of the stage above it, 0 to 1. */
    activeStep: activeIndex >= 0 ? (layout.steps[activeIndex] ?? 0) : 0,
  };
}

export interface FunnelChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The steps, in the order they happen. Never reordered. */
  data: readonly FunnelDatum[];
  /**
   * How tall the run is drawn, in pixels. The width is the container's, and
   * nothing in the data says how deep the ribbon should taper.
   */
  height?: number;
  /** How wide one stage is, in pixels. Left unset, the stages divide the width between them. */
  stageSize?: number;
  /** Space between one stage and the next, in pixels. */
  gap?: number;
  /** Concentric rings drawn per stage. `1` draws the band once, flat. */
  layers?: number;
  /** Whether the sides of a band are curves or straight diagonals. */
  edges?: FunnelEdges;
  /**
   * The shortest a non-zero stage is drawn, as a share of the tallest. A genuine
   * zero is still drawn as nothing.
   */
  minWidth?: number;
  /** The funnel's hue, as one of the theme's roles. */
  color?: FunnelChartColor;
  /** Milliseconds for one stage to grow. */
  animationDuration?: number;
  /** Milliseconds between one stage starting and the next. `0` for all at once. */
  staggerDelay?: number;
  /** `loading` holds the stages back and grows them in when it turns `ready`. */
  status?: FunnelChartStatus;
  /** The stage being read. Leave unset to let the chart track it. */
  activeIndex?: number;
  /**
   * The stage being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, stage: FunnelDatum | null) => void;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one stage. Defaults to its name, count and share of the first. */
  labelForDatum?: (stage: FunnelDatum, index: number) => string;
}

/** Imperative handle: re-run the entrance, for a "replay" control. */
export interface FunnelChartHandle {
  replay: () => void;
}

const FunnelChartRoot = forwardRef<FunnelChartHandle, FunnelChartProps & RenderProp<'div'>>(function FunnelChartRoot(
  {
    data,
    height = 200,
    stageSize,
    gap = 4,
    layers = 3,
    edges = 'curved',
    minWidth = 0.1,
    color = 'chart-1',
    animationDuration = 700,
    staggerDelay = 90,
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
  const slotClasses = funnelChartVariants();
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, rtl: false });
  const [slots, setSlots] = useState<Slots>({});
  const [internalActive, setInternalActive] = useState(-1);
  const [revision, setRevision] = useState(0);

  const loading = status === 'loading';
  const { width, rtl } = size;
  const { stages, skeleton, labels } = slots;
  const controlled = activeIndexProp !== undefined;
  const active = loading ? -1 : controlled ? activeIndexProp : internalActive;

  /*
   * The chart mounts once its width is known. Mounted at a guess, the first
   * measurement is a resize, and a resize ends the entrance before it is seen.
   */
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const read = () => {
      const next = { width: node.clientWidth, rtl: getComputedStyle(node).direction === 'rtl' };
      setSize((current) => (current.width === next.width && current.rtl === next.rtl ? current : next));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setSlot = useCallback<FunnelChartContextValue['setSlot']>(
    (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
    []
  );

  useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

  const layout = useMemo(
    () => funnelLayout(data, { width, height, gap, stageSize, minWidth, mirrored: rtl }),
    [data, width, height, gap, stageSize, minWidth, rtl]
  );

  const hue = COLOR_VAR[color];
  const colors = useMemo(() => data.map((stage) => (stage.color ? COLOR_VAR[stage.color] : hue)), [data, hue]);
  const rings = Math.max(1, Math.round(layers));
  const curve = useMemo(() => ribbonCurve(edges === 'curved' ? CURVE : 0), [edges]);

  const definition = useMemo(() => {
    const dimOpacity = stages?.dimOpacity ?? 0.3;
    const drawn = stages && !loading ? layout.bands : [];
    const marks = drawn.flatMap((band, stage) => {
      if (band.head <= 0 && band.tail <= 0) return [];
      const selected = active === stage;
      const dimmed = active >= 0 && !selected;
      return Array.from({ length: rings }, (_unused, ring) => {
        // A lone ring is the core, not the faint edge of a halo it does not have.
        const depth = rings > 1 ? ring / (rings - 1) : 1;
        // The outermost ring is the tallest and faintest, so the fill falls off
        // towards the edge. Reading a stage pushes the core out past the halo, so
        // the band swells rather than resizes.
        const reach = (1 - (ring / rings) * RING_INSET) * (1 + (selected ? depth * SELECT_SPREAD : 0));
        const rows: RingRow[] = [
          { stage, x: band.offset, y1: layout.middle - band.head * reach, y2: layout.middle + band.head * reach },
          {
            stage,
            x: band.offset + band.length,
            y1: layout.middle - band.tail * reach,
            y2: layout.middle + band.tail * reach,
          },
        ];
        return areaY(rows, {
          id: `${STAGE_MARK}${stage}-${ring}`,
          x: 'x',
          y1: 'y1',
          y2: 'y2',
          curve,
          fill: colors[stage] ?? hue,
          fillOpacity:
            (layout.strengths[stage] ?? 1) *
            (RING_FAINTEST + depth * (RING_STRONGEST - RING_FAINTEST)) *
            (dimmed ? dimOpacity : 1),
        });
      });
    });

    const extent = Math.max(0, layout.middle - layout.textBand);
    const placeholder =
      loading && skeleton
        ? [
            areaY(
              [
                { stage: 0, x: 0, y1: layout.middle - extent, y2: layout.middle + extent },
                {
                  stage: 0,
                  x: width,
                  y1: layout.middle - extent * SKELETON_TAPER,
                  y2: layout.middle + extent * SKELETON_TAPER,
                },
              ] satisfies RingRow[],
              {
                id: SKELETON_MARK,
                x: 'x',
                y1: 'y1',
                y2: 'y2',
                curve,
                fill: skeleton.color ? COLOR_VAR[skeleton.color] : 'var(--skeleton, var(--muted))',
                fillOpacity: 1,
                motion: false,
              }
            ),
          ]
        : [];

    const axis = { axis: false as const, grid: false as const };
    return defineChart({
      theme: THEME,
      marks: [...placeholder, ...marks],
      // The rows are already in pixels. The ribbon is symmetrical about the middle,
      // so it does not matter which way up the height runs.
      scales: {
        x: { ...axis, scale: scaleLinear([0, Math.max(width, 1)], [0, 1]) },
        y: { ...axis, scale: scaleLinear([0, Math.max(height, 1)], [0, 1]) },
      },
      guides: false,
      margin: 0,
      focusRing: false,
      keyboard: false,
      pointer: false,
      focus: false,
      motion: (context: ChartMotionContext<RingRow>) =>
        context.phase === 'enter'
          ? (false as const)
          : { transition: { type: 'tween' as const, duration: SELECT_DURATION, easing: 'ease-out' as const } },
    });
  }, [
    layout,
    stages,
    skeleton,
    loading,
    active,
    rings,
    curve,
    colors,
    hue,
    width,
    height,
  ]);

  const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: SELECT_DURATION, easing: 'ease-out' } }), []);

  /*
   * A hover or a key previews, and a press pins. Everything shown is asked for
   * through `read`: a controlled chart shows only what its parent keeps. A change
   * this chart did not report came from outside, and counts as a pin.
   */
  const pinned = useRef(controlled ? activeIndexProp : -1);
  const pointerStage = useRef(-1);
  const reported = useRef(active);
  const dragged = useRef(false);
  const latest = useRef({ data, onActiveIndexChange, controlled });
  useEffect(() => {
    latest.current = { data, onActiveIndexChange, controlled };
  });

  const read = useCallback((index: number) => {
    if (reported.current === index) return;
    reported.current = index;
    const { data: stages, onActiveIndexChange: notify, controlled: parentOwned } = latest.current;
    if (!parentOwned) setInternalActive(index);
    notify?.(index, index >= 0 ? (stages[index] ?? null) : null);
  }, []);

  useEffect(() => {
    if (!controlled || activeIndexProp === reported.current) return;
    pinned.current = activeIndexProp;
    reported.current = activeIndexProp;
  }, [controlled, activeIndexProp]);

  const press = useCallback(
    (index: number) => {
      pinned.current = pinned.current === index ? -1 : index;
      read(pinned.current >= 0 ? pinned.current : pointerStage.current);
    },
    [read]
  );

  const preview = useCallback(
    (index: number) => {
      pointerStage.current = index;
      read(index >= 0 ? index : pinned.current);
    },
    [read]
  );

  // A remounted chart says nothing about what it was reading, and new data may not have that stage.
  const count = data.length;
  const lifecycle = `${revision}:${status}:${count}`;
  const seenLifecycle = useRef(lifecycle);
  useEffect(() => {
    if (seenLifecycle.current === lifecycle) return;
    seenLifecycle.current = lifecycle;
    pinned.current = -1;
    pointerStage.current = -1;
    read(-1);
  }, [lifecycle, read]);

  // A pinned reading lasts until the next press elsewhere.
  useEffect(() => {
    if (active < 0) return;
    const onPress = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node) || pinned.current < 0) return;
      pinned.current = -1;
      read(-1);
    };
    document.addEventListener('pointerdown', onPress, { capture: true });
    return () => document.removeEventListener('pointerdown', onPress, { capture: true });
  }, [active, read]);

  const stageUnder = (event: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>) =>
    stageAt(layout.bands, event.clientX - event.currentTarget.getBoundingClientRect().left);

  const interactive = !loading && layout.bands.length > 0;

  // The attribute comes off once the last stage has grown, so a later rebuild cannot replay it.
  const chartKey = `${revision}:${status}`;
  const [revealedKey, setRevealedKey] = useState('');
  const lastDrawn = layout.bands.map(({ head, tail }) => head > 0 || tail > 0).lastIndexOf(true);
  const stageRules = layout.bands
    .map((_band, index) => `[data-ts-key^='${STAGE_MARK}${index}-']{--funnel-stage:${index}}`)
    .join('');

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const last = layout.bands.length - 1;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: number | undefined;
    if (event.key === forward || event.key === 'ArrowDown') next = active < 0 ? 0 : Math.min(active + 1, last);
    else if (event.key === backward || event.key === 'ArrowUp') next = active < 0 ? last : Math.max(active - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next !== undefined) {
      event.preventDefault();
      read(next);
    } else if ((event.key === 'Enter' || event.key === ' ') && active >= 0) {
      event.preventDefault();
      press(active);
    }
  };

  // On the root, so it also clears a reading pinned from a legend row.
  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    pinned.current = -1;
    pointerStage.current = -1;
    read(-1);
  };

  const spoken = (stage: FunnelDatum, index: number) =>
    labelForDatum?.(stage, index) ??
    `${stage.label}, ${stage.value}, ${Math.round((layout.shares[index] ?? 0) * 100)} percent of the first stage`;
  const summary = label ?? `Funnel chart, ${count} ${count === 1 ? 'stage' : 'stages'}`;
  const activeStage = active >= 0 ? data[active] : undefined;

  const context = useMemo<FunnelChartContextValue>(
    () => ({ data, layout, colors, activeIndex: active, press, preview, setSlot }),
    [data, layout, colors, active, press, preview, setSlot]
  );

  const element = useRender({
    defaultTagName: 'div',
    ref: rootRef,
    render,
    props: mergeProps(
      {
        'data-slot': 'funnel-chart',
        onKeyDown: onRootKeyDown,
        className: slotClasses.root({ className }),
        children: (
          <>
            {loading ? null : (
              <ul aria-label={summary} className="sr-only">
                {data.map((stage, index) => (
                  <li key={index}>{spoken(stage, index)}</li>
                ))}
              </ul>
            )}
            <div aria-live="polite" className="sr-only">
              {activeStage ? spoken(activeStage, active) : ''}
            </div>
            <div
              ref={plotRef}
              data-slot="funnel-chart-plot"
              className={slotClasses.plot()}
              style={{
                height,
                ['--funnel-grow' as string]: `${animationDuration}ms`,
                ['--funnel-stagger' as string]: `${Math.max(0, staggerDelay)}ms`,
              }}
              data-revealing={!loading && revealedKey !== chartKey ? '' : undefined}
              onAnimationEnd={(event) => {
                const key = (event.target as Element).getAttribute('data-ts-key');
                if (key?.startsWith(`${STAGE_MARK}${lastDrawn}-`)) setRevealedKey(chartKey);
              }}
              {...(interactive
                ? {
                    role: 'group',
                    tabIndex: 0,
                    'aria-label': `${summary}. Use the arrow keys to read a stage.`,
                    onKeyDown,
                    onBlur: () => read(pinned.current >= 0 ? pinned.current : pointerStage.current),
                    onPointerDown: () => {
                      dragged.current = false;
                    },
                    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
                      if (event.pointerType === 'touch') dragged.current = true;
                      preview(stageUnder(event));
                    },
                    onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => {
                      // A finger lifting is not a reader leaving: the last reading stays.
                      if (event.pointerType !== 'touch') preview(-1);
                    },
                    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
                      if (event.pointerType !== 'touch' || !dragged.current) return;
                      pinned.current = stageUnder(event);
                      pointerStage.current = -1;
                      read(pinned.current);
                    },
                    onPointerCancel: () => {
                      pointerStage.current = -1;
                      read(pinned.current);
                    },
                    onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
                      if (dragged.current) {
                        dragged.current = false;
                        return;
                      }
                      // A screen reader's activation has no coordinates, so a column names its own stage.
                      const column = (event.target as Element).closest<HTMLElement>('[data-stage]');
                      const index = column ? Number(column.dataset.stage) : stageUnder(event);
                      if (index >= 0) press(index);
                    },
                  }
                : {})}
            >
              <style>{KEYFRAMES + stageRules}</style>
              {width > 0 ? (
                <Chart
                  // Stages arriving after a load, or a replay, are a new chart.
                  key={chartKey}
                  definition={definition}
                  renderer={renderer}
                  ariaLabel={summary}
                  height={height}
                  initialWidth={width}
                  className={slotClasses.chart()}
                />
              ) : null}
              {labels && interactive ? (
                <FunnelChartColumns {...labels} data={data} layout={layout} active={active} />
              ) : null}
            </div>
            {children}
          </>
        ),
      },
      props
    ),
  });

  return <FunnelChartContext.Provider value={context}>{element}</FunnelChartContext.Provider>;
});
FunnelChartRoot.displayName = 'FunnelChart';

/**
 * The readings around the ribbon. Each column is a button for a screen reader's
 * cursor, and skipped by Tab, where the plot's arrow keys already walk the stages.
 * The press bubbles to the plot, which reads the stage from `data-stage`.
 */
function FunnelChartColumns({
  className,
  formatValue,
  formatShare,
  share = 'top',
  showValue = true,
  showLabel = true,
  data,
  layout,
  active,
}: FunnelChartLabelsProps & { data: readonly FunnelDatum[]; layout: FunnelLayout; active: number }) {
  const slots = funnelChartVariants();
  const format = formatValue ?? ((value: number) => COMPACT.format(value));
  const formatPercent = formatShare ?? ((ratio: number) => `${Math.round(ratio * 100)}%`);

  return layout.bands.map((band, index) => {
    const stage = data[index];
    if (!stage) return null;
    const ratio = share === 'top' ? layout.shares[index] : layout.steps[index];
    const pill = share === 'none' || (share === 'previous' && index === 0) ? null : formatPercent(ratio ?? 0, stage);
    const value = format(stage.value, stage);
    return (
      <button
        key={index}
        type="button"
        tabIndex={-1}
        data-slot="funnel-chart-labels"
        data-stage={index}
        data-dimmed={active >= 0 && active !== index ? '' : undefined}
        aria-pressed={active === index}
        aria-label={`${stage.label}, ${value}${pill ? `, ${pill}` : ''}`}
        className={slots.column({ className })}
        style={{ left: band.offset, width: band.length }}
      >
        <span className={slots.columnStrip({ className: 'justify-end' })} style={{ height: layout.textBand }}>
          {showValue ? <span className={slots.columnValue()}>{value}</span> : null}
        </span>
        <span className={slots.columnMiddle()}>{pill ? <span className={slots.columnPill()}>{pill}</span> : null}</span>
        <span className={slots.columnStrip()} style={{ height: layout.textBand }}>
          {showLabel ? <span className={slots.columnName()}>{stage.label}</span> : null}
        </span>
      </button>
    );
  });
}

export interface FunnelChartStagesProps {
  /** Opacity of the stages that are not being read, once one is. */
  dimOpacity?: number;
}

/**
 * Every stage, in the order the data lists them. One part rather than one per
 * stage, because a stage's near edge is the previous stage's far edge.
 */
function FunnelChartStages({
  dimOpacity = 0.3,
}: FunnelChartStagesProps) {
  const { setSlot } = useChart('FunnelChart.Stages');
  useEffect(() => {
    setSlot('stages', { dimOpacity });
    return () => setSlot('stages', undefined);
  }, [dimOpacity, setSlot]);
  return null;
}
FunnelChartStages.displayName = 'FunnelChart.Stages';

export interface FunnelChartSkeletonProps {
  /** Which of the theme's roles to draw the placeholder in. Defaults to the theme's skeleton colour. */
  color?: FunnelChartColor;
}

/**
 * The loading state: one plain ribbon over the whole run, undivided. Placeholder
 * stages would be an invented drop-off, and a reader cannot tell one from a real one.
 */
function FunnelChartSkeleton({
  color,
}: FunnelChartSkeletonProps) {
  const { setSlot } = useChart('FunnelChart.Skeleton');
  useEffect(() => {
    setSlot('skeleton', { color });
    return () => setSlot('skeleton', undefined);
  }, [color, setSlot]);
  return null;
}
FunnelChartSkeleton.displayName = 'FunnelChart.Skeleton';

export interface FunnelChartLabelsProps {
  /** Added to each stage's column. */
  className?: string;
  /** Format the count. Defaults to a compact number. */
  formatValue?: (value: number, stage: FunnelDatum) => string;
  /** Format the conversion in the pill. Defaults to a whole percent. */
  formatShare?: (share: number, stage: FunnelDatum) => string;
  /**
   * Which conversion the pill reports. `top` is the share of the first stage.
   * `previous` is the share of the stage above, so the first stage has no pill.
   */
  share?: FunnelShare;
  /** Show the count above the ribbon. */
  showValue?: boolean;
  /** Show the stage's name under the ribbon. */
  showLabel?: boolean;
}

/**
 * The readings, arranged around the ribbon: the count above the band, the name
 * under it, and the conversion in a pill on the band. Split this way, each has
 * the stage's whole column, so a name stays whole at phone width.
 */
function FunnelChartLabels({
  className,
  formatValue,
  formatShare,
  share,
  showValue,
  showLabel,
}: FunnelChartLabelsProps) {
  const { setSlot } = useChart('FunnelChart.Labels');
  useEffect(() => {
    setSlot('labels', { className, formatValue, formatShare, share, showValue, showLabel });
    return () => setSlot('labels', undefined);
  }, [className, formatValue, formatShare, share, showValue, showLabel, setSlot]);
  return null;
}
FunnelChartLabels.displayName = 'FunnelChart.Labels';

export interface FunnelChartLegendProps extends ComponentProps<'div'> {
  /**
   * `list` gives every stage a row, with the numbers in a column. `inline` runs
   * them together and wraps, which is denser where the names are short.
   */
  layout?: FunnelLegendLayout;
  /** Show each stage's reading beside its name. */
  showValue?: boolean;
  /** Format the value in a `list` key. Defaults to a compact number. */
  formatValue?: (value: number, stage: FunnelDatum) => string;
}

/** A swatch, a name and a reading per stage, under the run. For a funnel drawn without `Labels`. */
function FunnelChartLegend({
  layout: arrangement = 'list',
  showValue = true,
  formatValue,
  className,
  render,
  ...props
}: FunnelChartLegendProps & RenderProp<'div'>) {
  const { data, layout, colors, activeIndex, press, preview } = useChart('FunnelChart.Legend');
  const slots = funnelChartVariants();
  const list = arrangement === 'list';
  const format = formatValue ?? ((value: number) => COMPACT.format(value));

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'funnel-chart-legend',
        className: slots.legend({ className: [list ? slots.legendList() : slots.legendInline(), className] }),
        children: data.map((stage, index) => {
          const percent = Math.round((layout.shares[index] ?? 0) * 100);
          return (
            <button
              key={index}
              type="button"
              aria-pressed={activeIndex === index}
              aria-label={`${stage.label}, ${percent} percent of the first stage`}
              data-dimmed={activeIndex >= 0 && activeIndex !== index ? '' : undefined}
              className={slots.legendRow({ className: list ? 'w-full' : 'max-w-full' })}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') preview(index);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch') preview(-1);
              }}
              onFocus={() => preview(index)}
              onBlur={() => preview(-1)}
              onClick={() => press(index)}
            >
              <span
                className={slots.legendSwatch()}
                // Mixed with the page rather than given an opacity: Chromium paints a wide-gamut
                // colour with alpha wrongly inside a dimmed row.
                style={{
                  background: `color-mix(in oklab, ${colors[index]} ${(layout.strengths[index] ?? 1) * 100}%, var(--background))`,
                }}
              />
              <span className={slots.legendName({ className: list ? 'flex-1' : 'shrink' })}>{stage.label}</span>
              {showValue && list ? <span className={slots.legendValue()}>{format(stage.value, stage)}</span> : null}
              {showValue ? (
                <span
                  className={slots.legendShare({
                    className: list ? 'w-10 text-end text-muted-foreground' : 'font-medium',
                  })}
                >
                  {percent}%
                </span>
              ) : null}
            </button>
          );
        }),
      },
      props
    ),
  });

  return data.length ? element : null;
}
FunnelChartLegend.displayName = 'FunnelChart.Legend';

export interface FunnelChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the funnel is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a caveat. */
  caption?: ReactNode;
  /** Trailing slot: a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the run. The value is not derived, because 41800 is a count, a
 * currency or a rate depending on what was counted. A readout that follows the
 * pointer takes it from `onActiveIndexChange` and passes the string down.
 */
function FunnelChartHeader({
  title,
  value,
  caption,
  className,
  children,
  render,
  ...props
}: FunnelChartHeaderProps & RenderProp<'div'>) {
  const slots = funnelChartVariants();
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'funnel-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value ? <div className={slots.headerValue()}>{value}</div> : null}
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
FunnelChartHeader.displayName = 'FunnelChart.Header';

export const FunnelChart = Object.assign(FunnelChartRoot, {
  Header: FunnelChartHeader,
  Stages: FunnelChartStages,
  Labels: FunnelChartLabels,
  Legend: FunnelChartLegend,
  Skeleton: FunnelChartSkeleton,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { FunnelChartHeader, FunnelChartStages, FunnelChartLabels, FunnelChartLegend, FunnelChartSkeleton };
