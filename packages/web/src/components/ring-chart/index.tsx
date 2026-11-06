'use client';

/**
 * RingChart: progress towards several targets, as concentric arcs.
 *
 * ```tsx
 * <RingChart data={goals} size={208}>
 *   <RingChart.Header title="Today" value="486 kcal" legend />
 *   <RingChart.Ring index={0} />
 *   <RingChart.Ring index={1} />
 *   <RingChart.Center />
 * </RingChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's RingChart, so a chart written
 * for one reads the same in the other. What differs is what the web changes: a
 * colour is named by the theme's role, hovering a ring reads it, a click or a tap
 * holds the reading, and the arrow keys walk the rings.
 *
 * ## Why this is plain SVG
 *
 * Each ring is a value against its own target, with a track behind it. A dash on
 * a circle draws that with a rounded end, an open gauge or countable ticks, and
 * sweeps by moving two numbers on a path that never changes. An arc mark can do
 * none of those, and tweening one between its two ends breaks at half a turn.
 *
 * A part portals into the one `<svg>` the root owns, so a ring can sit inside
 * anything and still be drawn with the others.
 */
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
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';
import { ringAfterKey, ringFraction, ringPercent, ringRadius, ringSpan, ringStagger, ringTick } from './ring-layout';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

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

/** Which of the theme's roles a ring is drawn in. */
export type RingChartColor = keyof typeof COLORS;

/** One ring per datum. Nothing is shared between rings, so nothing has to add up. */
export interface RingDatum {
  /** Name for the legend, the centre readout and screen readers. */
  label: string;
  /** Where this ring has got to. */
  value: number;
  /** What it is aiming at. The ring is full when `value` reaches it. */
  maxValue: number;
  /** Which of the theme's roles to draw it in. Defaults to the chart palette, in order. */
  color?: RingChartColor;
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const ringChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full justify-self-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
    svg: 'absolute inset-0 block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
    ring: 'transition-opacity duration-150 motion-reduce:transition-none',
    sweep:
      'ease-out transition-[stroke-dasharray] duration-(--ring-duration) delay-(--ring-delay) motion-reduce:transition-none',
    tick: 'ease-out transition-opacity duration-150 delay-(--ring-delay) motion-reduce:transition-none',
    hit: 'cursor-pointer touch-pan-y [@media(pointer:coarse)]:[stroke-width:28px]',
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

const DIM = 0.35;
const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
const LEGEND_DIM = 0.4;
/** Below this width the hole fits the number alone. */
const FULL_CENTER_ROOM = 90;

const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const compactNumber = (value: number) => COMPACT.format(value);

interface RingChartContextValue {
  data: readonly RingDatum[];
  box: number;
  strokeWidth: number;
  ringGap: number;
  startAngle: number;
  /** How much of a turn the arcs run. 1 is a closed ring. */
  span: number;
  animationDuration: number;
  colors: readonly string[];
  svg: SVGSVGElement | null;
  /** False for the frame a sweep starts from. */
  revealed: boolean;
  /** Bumped by `replay()`, to draw each ring afresh from nothing. */
  revision: number;
  activeIndex: number;
  read: (index: number) => void;
  togglePin: (index: number) => void;
}

const RingChartContext = createContext<RingChartContextValue | null>(null);

function useChart(component: string): RingChartContextValue {
  const context = useContext(RingChartContext);
  if (!context) throw new Error(`${component} must be used within a <RingChart>`);
  return context;
}

/** The ring being read, for something rendered inside the chart. */
export function useRingChart() {
  const { data, activeIndex } = useChart('useRingChart');
  return { activeIndex, activeRing: activeIndex >= 0 ? (data[activeIndex] ?? null) : null };
}

export interface RingChartHandle {
  /** Sweep the rings in again from nothing. */
  replay: () => void;
}

export interface RingChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** One entry per ring, outermost first. */
  data: readonly RingDatum[];
  /** Fixed diameter in pixels. Without it the chart fills its container's width as a square. */
  size?: number;
  /** Thickness of each ring. */
  strokeWidth?: number;
  /** Gap between one ring and the next. */
  ringGap?: number;
  /** Where the arcs begin, in degrees clockwise from twelve o'clock. */
  startAngle?: number;
  /**
   * Where they end, on the same clock. Anything less than a turn from `startAngle`
   * leaves a gap and reads as a gauge: `startAngle={-90} endAngle={90}` is the half
   * circle over the top.
   */
  endAngle?: number;
  /** Milliseconds for the arcs to sweep in. */
  animationDuration?: number;
  /** The ring being read. Leave unset to let the chart track it. */
  activeIndex?: number;
  /** Fires when the reading changes, from a hover, a key or a press, with `-1` when it ends. */
  onActiveIndexChange?: (index: number) => void;
  /** Names the chart for screen readers. */
  label?: string;
  /** Writes one ring for screen readers, for a value with a unit. */
  labelForDatum?: (datum: RingDatum, index: number) => string;
}

const RingChartRoot = forwardRef<RingChartHandle, RingChartProps & RenderProp<'div'>>(function RingChartRoot(
  {
    data,
    size,
    strokeWidth = 12,
    ringGap = 6,
    startAngle = 0,
    endAngle = 360,
    animationDuration = 700,
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
  const plotRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [measured, setMeasured] = useState(0);
  const [internalActive, setInternalActive] = useState(-1);
  const [revealed, setRevealed] = useState(false);
  const [revision, setRevision] = useState(0);

  // Measured rather than scaled by a viewBox, so a ring keeps the thickness it was given at any size.
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const measure = () => setMeasured(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const box = size ?? measured;
  const span = ringSpan(startAngle, endAngle);
  const colors = useMemo(
    () => data.map((ring, index) => (ring.color ? COLORS[ring.color] : PALETTE[index % PALETTE.length]!)),
    [data]
  );

  // Two frames, so the browser has painted the empty arcs before they transition away from them.
  const drawable = box > 0;
  useEffect(() => {
    if (!drawable) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [drawable, revision]);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        setRevealed(false);
        setRevision((current) => current + 1);
      },
    }),
    []
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

  // Held in a ref because the pointer's reports must not move a ring that was pressed.
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
  // A held ring that was removed would otherwise block every other reading.
  useEffect(() => {
    if (pinned.current >= data.length || reported.current >= data.length) release();
  }, [data.length, release]);

  const context = useMemo<RingChartContextValue>(
    () => ({
      data,
      box,
      strokeWidth,
      ringGap,
      startAngle,
      span,
      animationDuration,
      colors,
      svg,
      revealed,
      revision,
      activeIndex,
      read,
      togglePin,
    }),
    [data, box, strokeWidth, ringGap, startAngle, span, animationDuration, colors, svg, revealed, revision, activeIndex, read, togglePin]
  );

  const summary = label ?? `Ring chart, ${data.length} ${data.length === 1 ? 'ring' : 'rings'}`;
  const spoken = (datum: RingDatum, index: number) =>
    labelForDatum?.(datum, index) ?? `${datum.label}, ${ringPercent(datum.value, datum.maxValue)} percent`;
  const active = data[activeIndex];
  const slots = ringChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'ring-chart',
        className: slots.root({ className }),
        children: (
          <>
            <ul aria-label={summary} className="sr-only">
              {data.map((datum, index) => (
                <li key={index}>{spoken(datum, index)}</li>
              ))}
            </ul>
            <div aria-live="polite" className="sr-only">
              {active ? spoken(active, activeIndex) : ''}
            </div>
            <div
              ref={plotRef}
              data-slot="ring-chart-plot"
              role="group"
              aria-label={summary}
              tabIndex={data.length ? 0 : undefined}
              className={slots.plot()}
              style={size ? { width: size, height: size } : { aspectRatio: 1 }}
              // A press on a ring stops here, so what arrives is a press on nothing.
              onClick={() => {
                if (pinned.current >= 0) release();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  release();
                  return;
                }
                if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
                  event.preventDefault();
                  togglePin(activeIndex);
                  return;
                }
                // The browser's own shortcuts, such as going back.
                if (!NAVIGATION_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
                event.preventDefault();
                pinned.current = -1;
                report(ringAfterKey(event.key, activeIndex, data.length));
              }}
              onBlur={() => read(-1)}
            >
              {box > 0 ? <svg ref={setSvg} aria-hidden className={slots.svg()} width={box} height={box} /> : null}
            </div>
            {children}
          </>
        ),
      },
      props
    ),
  });

  return <RingChartContext.Provider value={context}>{element}</RingChartContext.Provider>;
});
RingChartRoot.displayName = 'RingChart';

export interface RingChartRingProps {
  /** Which entry in `data` this ring draws. */
  index: number;
  /** Which of the theme's roles to draw it in, over the datum's and the palette. */
  color?: RingChartColor;
  /** Rounded ends or square ones. Defaults to round, and to square when the ring is segmented. */
  lineCap?: 'round' | 'butt';
  /** Opacity of the track behind the arc. */
  trackOpacity?: number;
  /** Break the ring into this many ticks, lit one at a time, for a target made of countable things. */
  segments?: number;
  /** Gap between one tick and the next, in pixels. */
  segmentGap?: number;
}

/**
 * One ring: a track, and the arc showing how far along it the value has got. The
 * pointer's target is a wider transparent stroke along the arc, so the dead part
 * of a gauge stays dead.
 */
function RingChartRing({ index, color, lineCap, trackOpacity = 0.15, segments, segmentGap = 3 }: RingChartRingProps) {
  const { data, box, strokeWidth, ringGap, startAngle, span, animationDuration, colors, svg, revealed, revision, activeIndex, read, togglePin } =
    useChart('RingChart.Ring');
  const datum = data[index];
  if (!datum || !svg || box <= 0) return null;

  const slots = ringChartVariants();
  const stroke = color ? COLORS[color] : colors[index];
  const radius = ringRadius(box, strokeWidth, ringGap, index);
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * span;
  const fraction = ringFraction(datum.value, datum.maxValue);
  const ticks = segments && segments > 0 ? Math.floor(segments) : 0;
  // A round cap on a dash of nothing still draws a dot, which reads as progress.
  const cap = lineCap ?? (ticks || fraction === 0 ? 'butt' : 'round');
  const start = ringStagger(index, data.length);
  const circle = {
    cx: box / 2,
    cy: box / 2,
    r: radius,
    fill: 'none',
    strokeWidth,
    // A circle's stroke starts at three o'clock, so it is turned back a quarter to start at twelve.
    transform: `rotate(${startAngle - 90} ${box / 2} ${box / 2})`,
  };

  const body = ticks ? (
    (() => {
      const { slot, dash } = ringTick(arcLength, ticks, segmentGap);
      const lit = Math.round(ticks * fraction);
      return Array.from({ length: ticks }, (_, tick) => {
        const pattern = {
          strokeDasharray: `${dash} ${circumference}`,
          strokeDashoffset: -slot * tick,
          strokeLinecap: cap,
        };
        const delay = (start + (tick / ticks) * 0.6) * animationDuration;
        return (
          <g key={tick}>
            <circle {...circle} {...pattern} stroke={stroke} strokeOpacity={trackOpacity} />
            <circle
              {...circle}
              {...pattern}
              stroke={stroke}
              className={slots.tick()}
              opacity={revealed && tick < lit ? 1 : 0}
              style={{ '--ring-delay': `${delay}ms` } as CSSProperties}
            />
          </g>
        );
      });
    })()
  ) : (
    <>
      <circle
        {...circle}
        stroke={stroke}
        strokeOpacity={trackOpacity}
        strokeLinecap={cap}
        strokeDasharray={`${arcLength} ${circumference}`}
      />
      <circle
        {...circle}
        stroke={stroke}
        strokeLinecap={cap}
        className={slots.sweep()}
        style={
          {
            strokeDasharray: `${revealed ? arcLength * fraction : 0} ${circumference}`,
            '--ring-duration': `${animationDuration * 0.6}ms`,
            '--ring-delay': `${start * animationDuration}ms`,
          } as CSSProperties
        }
      />
    </>
  );

  return createPortal(
    <g
      key={revision}
      data-slot="ring-chart-ring"
      className={slots.ring()}
      opacity={activeIndex >= 0 && activeIndex !== index ? DIM : 1}
    >
      {body}
      <circle
        {...circle}
        stroke="transparent"
        strokeWidth={strokeWidth + ringGap}
        strokeDasharray={`${arcLength} ${circumference}`}
        pointerEvents="stroke"
        className={slots.hit()}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') read(index);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') read(-1);
        }}
        onClick={(event) => {
          event.stopPropagation();
          togglePin(index);
        }}
      />
    </g>,
    svg
  );
}
RingChartRing.displayName = 'RingChart.Ring';

export interface RingChartCenterProps {
  /** Heading shown when no ring is read. Defaults to the outermost ring's own name. */
  defaultLabel?: string;
  /** Format the number under the label. Defaults to a compact number. */
  formatValue?: (value: number, ring: RingDatum | null) => string;
  /** Draw the middle yourself. Given the ring being read, or `null` when there is none. */
  children?: (ring: RingDatum | null) => ReactNode;
  /** Added to the readout. */
  className?: string;
}

/**
 * The hole's readout: the outermost ring until one is read. Never a total, because
 * the rings measure different things against different targets.
 */
function RingChartCenter({ defaultLabel, formatValue, children, className }: RingChartCenterProps) {
  const { data, box, strokeWidth, ringGap, activeIndex } = useChart('RingChart.Center');
  if (box <= 0) return null;

  const slots = ringChartVariants();
  const selected = activeIndex >= 0;
  const ring = (selected ? data[activeIndex] : data[0]) ?? null;
  const format = formatValue ?? ((value: number) => compactNumber(value));
  const inner = Math.max(ringRadius(box, strokeWidth, ringGap, Math.max(data.length - 1, 0)) - strokeWidth / 2, 0);
  // A square inside a circle, not across it: the corners of a wider box fall outside the hole.
  const room = inner * Math.SQRT2;
  const full = room >= FULL_CENTER_ROOM;

  return (
    <div data-slot="ring-chart-center" className={slots.center({ className })} style={{ maxWidth: room }}>
      {children ? (
        children(selected ? ring : null)
      ) : ring ? (
        <>
          <div className={slots.centerLabel()}>{selected ? ring.label : (defaultLabel ?? ring.label)}</div>
          <div className={slots.centerValue({ className: full ? 'text-xl' : 'text-lg' })}>{format(ring.value, ring)}</div>
          {full ? <div className={slots.centerCaption()}>{`of ${format(ring.maxValue, ring)}`}</div> : null}
        </>
      ) : null}
    </div>
  );
}
RingChartCenter.displayName = 'RingChart.Center';

export interface RingChartLegendProps extends ComponentProps<'div'> {
  /** Show each ring's percentage of its own target beside its name. */
  showValue?: boolean;
}

/**
 * A swatch, a name and a percentage per ring, under the plot. Each entry is a button
 * for the same reading as its ring, and the easier target on a small chart.
 */
function RingChartLegend({ showValue = true, className, render, ...props }: RingChartLegendProps & RenderProp<'div'>) {
  const { data, colors, activeIndex, read, togglePin } = useChart('RingChart.Legend');
  const slots = ringChartVariants();

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'ring-chart-legend',
        className: slots.legend({ className }),
        children: data.map((ring, index) => {
          const percent = ringPercent(ring.value, ring.maxValue);
          return (
            <button
              key={index}
              type="button"
              aria-pressed={activeIndex === index}
              aria-label={`${ring.label}, ${percent} percent`}
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
              <span className={slots.legendName()}>{ring.label}</span>
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
RingChartLegend.displayName = 'RingChart.Legend';

export interface RingChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a target. */
  caption?: ReactNode;
  /** Prettier names for the rings, keyed by their `label`. */
  labels?: Record<string, string>;
  /** Draw a swatch and a name per ring along the trailing edge. */
  legend?: boolean;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the rings: what the chart is of, what it reads and what the colours
 * mean. The value is not derived here, because there is no total to derive. Take it
 * from `onActiveIndexChange` and pass the formatted string down.
 */
function RingChartHeader({
  title,
  value,
  caption,
  labels,
  legend = false,
  className,
  children,
  render,
  ...props
}: RingChartHeaderProps & RenderProp<'div'>) {
  const { data, colors } = useChart('RingChart.Header');
  const slots = ringChartVariants();
  const trailing =
    children ??
    (legend && data.length
      ? data.map((ring, index) => (
          <span key={index} className={slots.legendItem()}>
            <span className={slots.legendSwatch()} style={{ background: colors[index] }} />
            {labels?.[ring.label] ?? ring.label}
          </span>
        ))
      : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'ring-chart-header',
        className: slots.header({ className }),
        children: (
          <>
            <div className={slots.headerText()}>
              {title ? <div className={slots.headerMuted()}>{title}</div> : null}
              {value || value === 0 ? <div className={slots.headerValue()}>{value}</div> : null}
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
RingChartHeader.displayName = 'RingChart.Header';

export const RingChart = Object.assign(RingChartRoot, {
  Header: RingChartHeader,
  Ring: RingChartRing,
  Center: RingChartCenter,
  Legend: RingChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export { RingChartHeader, RingChartRing, RingChartCenter, RingChartLegend };
