'use client';

/**
 * CandlestickChart — four numbers a period, drawn as one mark.
 *
 * ```tsx
 * <CandlestickChart data={sessions} xDataKey="day">
 *   <CandlestickChart.Grid />
 *   <CandlestickChart.Candles />
 *   <CandlestickChart.XAxis />
 *   <CandlestickChart.Tooltip />
 * </CandlestickChart>
 * ```
 *
 * ## The same parts as the app
 *
 * The parts and their props are the app library's CandlestickChart, so a chart
 * written for one reads the same in the other. What differs is what the web
 * changes: a colour is named by the theme's role, a period is read by hovering,
 * tapping or dragging, a click pins the reading, and the arrow keys walk the
 * periods.
 *
 * ## One mark, four numbers
 *
 * A row is `{ open, high, low, close }`. The body spans open to close and the
 * wick spans low to high behind it. Colour is the sign of the period and not a
 * series identity, so there is no series list: the two colours are two states of
 * the one thing plotted. Both are bars with explicit ends, so a body grows from
 * its open towards its close.
 *
 * ## The baseline is not zero
 *
 * A candle compares nothing to zero. What is read is the distance between four
 * numbers close together and far from the origin, so the axis runs from the
 * lowest low to the highest high, with a margin. See `candles.ts`.
 *
 * ## The parts describe, the root draws
 *
 * `Grid`, `Candles`, the axes and `Tooltip` draw nothing themselves. Each tells
 * the root what it wants, and the root builds one chart definition from them.
 * They are found by context, so a part can be wrapped in a component of your own.
 */
import {
  barY,
  defineChart,
  type ChartInteractionController,
  type ChartMark,
  type ChartMotionContext,
  type ChartPoint,
  type SceneNode,
} from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { RendererChart } from '@tanstack/charts/react/tooltip';
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
import { candleExtent, candlesOf, changeOf, labelledPeriods, ohlcOf, priceTicks, type Candle, type CandleKeys, type Ohlc } from './candles';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type CandlestickChartStatus = 'loading' | 'ready';
export type CandlestickChartDatum = Record<string, string | number | null | undefined>;

/** Which of the theme's roles a direction is drawn in. */
export type CandlestickChartColor =
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

const COLOR_VAR: Record<CandlestickChartColor, string> = {
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
  palette: ['var(--success)', 'var(--destructive)'],
};

const candlestickChartVariants = tv({
  slots: {
    root: 'relative grid w-full grid-cols-1 text-foreground',
    plot: 'relative col-start-1 row-start-2 w-full',
    // `pan-y` hands a vertical drag to the page and a sideways one to the chart.
    chart:
      'absolute! inset-0 touch-pan-y rounded-lg text-xs [&_svg]:rounded-lg [&_svg]:outline-none [&_svg:focus-visible]:ring-2 [&_svg:focus-visible]:ring-ring',
    legend:
      'pointer-events-none absolute right-2 top-1 col-start-1 row-start-2 flex gap-3 text-xs text-muted-foreground',
    legendItem: 'flex items-center gap-1.5',
    legendSwatch: 'size-2 shrink-0 rounded-full',
    header: 'col-start-1 row-start-1 flex items-start justify-between gap-3 pb-3',
    headerText: 'flex min-w-0 flex-1 flex-col gap-0.5',
    headerMuted: 'text-xs text-muted-foreground',
    headerValue: 'text-xl font-bold tabular-nums tracking-tight',
    headerTrailing: 'flex shrink flex-wrap items-center justify-end gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground',
    // A custom body gets no surface from the chart, so the readout draws its own.
    readout:
      'flex w-max flex-col gap-0.5 rounded-xl border border-border bg-popover px-2.5 py-1.5 text-xs tabular-nums text-popover-foreground shadow-lg',
    readoutTitle: 'text-muted-foreground',
    readoutPrices: 'grid grid-cols-2 gap-x-3 gap-y-0.5',
    readoutPrice: 'flex items-baseline gap-1',
    readoutField: 'text-muted-foreground',
    readoutValue: 'font-medium',
    readoutChange: 'font-medium',
  },
});

/** The value-axis gutter held while loading, when there are no prices to size it from. */
const LOADING_GUTTER = 44;

/** Thinnest a wick is drawn, in pixels. */
const WICK_WIDTH = 1.5;

/**
 * Shortest a body is drawn, in pixels. A period that closed where it opened has
 * no height of its own, and that is not the same event as no period at all.
 */
const MIN_BODY_HEIGHT = 1.5;

/** How much of the entrance goes to staggering the candles. */
const STAGGER_SHARE = 0.45;

const DEFAULT_RISING: CandlestickChartColor = 'success';
const DEFAULT_FALLING: CandlestickChartColor = 'destructive';

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const COMPACT_SMALL = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });

/** Below one, a single decimal would round most values down to nothing. */
const compactNumber = (value: number) => (Math.abs(value) < 1 ? COMPACT_SMALL : COMPACT).format(value);

/** A period's change with its sign, so direction is not told by colour alone. */
function changeText(ohlc: Pick<Ohlc, 'open' | 'close'>) {
  const { change, percent } = changeOf(ohlc);
  const sign = (value: number) => (value >= 0 ? '+' : '');
  return `${sign(change)}${compactNumber(change)} (${sign(percent)}${percent.toFixed(2)}%)`;
}

type TooltipField = 'open' | 'high' | 'low' | 'close';

/**
 * What the parts have asked for. The readout's formatters are read through `latest`
 * when it opens, and the axes' are compared by what they write.
 */
interface Slots {
  grid?: { rows: number; dashArray: string; opacity: number };
  candles?: { rising: CandlestickChartColor; falling: CandlestickChartColor; cornerRadius: number };
  xAxis?: Pick<CandlestickChartXAxisProps, 'ticks' | 'format'>;
  yAxis?: { ticks: number; format: CandlestickChartYAxisProps['format'] };
  tooltip?: {
    className: string | undefined;
    latest: { current: Pick<CandlestickChartTooltipProps, 'formatValue' | 'formatX' | 'showChange'> };
  };
}

interface CandlestickChartContextValue {
  data: readonly CandlestickChartDatum[];
  xDataKey: string;
  setSlot: <K extends keyof Slots>(slot: K, value: Slots[K]) => void;
  activeIndex: number;
  rising: CandlestickChartColor;
  falling: CandlestickChartColor;
}

const CandlestickChartContext = createContext<CandlestickChartContextValue | null>(null);

function useChart(component: string): CandlestickChartContextValue {
  const context = useContext(CandlestickChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <CandlestickChart>`);
  }
  return context;
}

/**
 * The period being read, for something rendered inside the chart. A readout
 * outside it takes `onActiveIndexChange` instead.
 */
export function useCandlestickChart() {
  const { data, activeIndex, xDataKey } = useChart('useCandlestickChart');
  return {
    activeIndex,
    activePoint: activeIndex >= 0 ? (data[activeIndex] ?? null) : null,
    xDataKey,
  };
}

/** Holds a flat period's body at a visible height, about its own price, once the scales have placed it. */
function withBodyFloor<TMark extends ChartMark<Candle, number, number, number, number>>(mark: TMark): TMark {
  const adjust = (node: SceneNode): SceneNode => {
    if (node.kind === 'group') return { ...node, children: node.children.map(adjust) };
    if (node.kind !== 'rect' || node.height >= MIN_BODY_HEIGHT) return node;
    return { ...node, y: node.y - (MIN_BODY_HEIGHT - node.height) / 2, height: MIN_BODY_HEIGHT };
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

export interface CandlestickChartProps extends Omit<ComponentProps<'div'>, 'ref'> {
  /** The rows. Each one is a period along the x-axis. */
  data: readonly CandlestickChartDatum[];
  /** Key holding the period label. Used by the axis and the readout. */
  xDataKey?: string;
  /** Key holding the opening price. */
  openDataKey?: string;
  /** Key holding the period's high. */
  highDataKey?: string;
  /** Key holding the period's low. */
  lowDataKey?: string;
  /** Key holding the closing price. */
  closeDataKey?: string;
  /**
   * `loading` leaves the plot empty: the grid and the header stay, and no candles
   * are drawn. Turning `ready` grows them in from the left. Nothing stands in for
   * the candles, because a placeholder candle would be four made-up prices.
   */
  status?: CandlestickChartStatus;
  /** The plot's width ÷ height. `1.6` suits a chart this dense better than `2`. */
  aspectRatio?: number;
  /** Milliseconds for the candles to grow in. */
  animationDuration?: number;
  /** Milliseconds for the candles and the axis to settle after the data changes. */
  domainDuration?: number;
  /** Fix the price axis instead of deriving it from the lows and highs. */
  yDomain?: [number, number];
  /** Fraction of each period's slice left empty, `0` to `1`. */
  candleGap?: number;
  /** Fixed body width in pixels, instead of deriving it from `candleGap`. One pixel always stays between bodies. */
  candleWidth?: number;
  /** Opacity of the candles that are not being read. */
  fadedOpacity?: number;
  /**
   * The period being read, and `-1`/`null` when there is none. Fires when the
   * index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: CandlestickChartDatum | null) => void;
  /** Drop the axis padding, for a dense strip with no axis or readout. */
  compact?: boolean;
  /** What a screen reader calls the chart. */
  label?: string;
  /** What a screen reader says for one row. Defaults to its keys and values. */
  labelForDatum?: (datum: CandlestickChartDatum, index: number) => string;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface CandlestickChartHandle {
  replay: () => void;
}

const CandlestickChartRoot = forwardRef<CandlestickChartHandle, CandlestickChartProps & RenderProp<'div'>>(
  function CandlestickChartRoot(
    {
      data,
      xDataKey = 'date',
      openDataKey = 'open',
      highDataKey = 'high',
      lowDataKey = 'low',
      closeDataKey = 'close',
      status = 'ready',
      aspectRatio = 1.6,
      animationDuration = 700,
      domainDuration = 500,
      yDomain,
      candleGap = 0.3,
      candleWidth,
      fadedOpacity = 0.3,
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
    const slotClasses = candlestickChartVariants();
    const plotRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [slots, setSlots] = useState<Slots>({});
    const [activeIndex, setActiveIndex] = useState(-1);
    const [revision, setRevision] = useState(0);
    const interactionRef = useRef<ChartInteractionController<Candle, number, number> | null>(null);
    const releaseDrag = useRef<(() => void) | null>(null);

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

    const setSlot = useCallback<CandlestickChartContextValue['setSlot']>(
      (slot, value) => setSlots((current) => ({ ...current, [slot]: value })),
      []
    );

    useImperativeHandle(ref, () => ({ replay: () => setRevision((current) => current + 1) }), []);

    const loading = status === 'loading';
    const { grid, candles: candlesSlot, xAxis, yAxis, tooltip } = slots;
    const rising = candlesSlot?.rising ?? DEFAULT_RISING;
    const falling = candlesSlot?.falling ?? DEFAULT_FALLING;
    const keys = useMemo<CandleKeys>(
      () => ({ open: openDataKey, high: highDataKey, low: lowDataKey, close: closeDataKey }),
      [openDataKey, highDataKey, lowDataKey, closeDataKey]
    );

    // Labels thin with the width, so it is bucketed: a pixel of resize should not redefine the chart.
    const labelRoom = Math.floor(width / 34);

    const candles = useMemo(() => candlesOf(data, keys), [data, keys]);
    const total = data.length;
    const extent = useMemo<[number, number]>(
      () => (yDomain ? [yDomain[0], yDomain[1]] : loading ? [0, 1] : candleExtent(candles)),
      [yDomain?.[0], yDomain?.[1], loading, candles]
    );

    /*
     * The ticks are evenly spaced prices rather than round ones: the domain's ends
     * are not round, and `Grid` and `YAxis` count their lines separately. With
     * both, the axis decides, so every label has a line.
     */
    const tickCount = yAxis?.ticks ?? grid?.rows;
    const priceValues = tickCount === undefined ? [] : priceTicks(extent, tickCount);
    const periodValues = xAxis ? labelledPeriods(total, labelRoom * 34, xAxis.ticks) : [];
    const priceLabel = (value: number) => {
      if (loading || !yAxis) return '';
      return yAxis.format ? yAxis.format(value) : compactNumber(value);
    };
    const periodLabel = (index: number) => {
      const datum = data[index];
      if (!datum) return '';
      return xAxis?.format ? xAxis.format(datum, index) : String(datum[xDataKey] ?? '');
    };
    /*
     * What the axes will say, as the definition's dependency in place of the
     * formatters. An inline `format` is a new function on every render, and a new
     * definition restarts the readout's motion and drops the fade under the pointer.
     */
    const priceLabels = priceValues.map(priceLabel).join('|');
    const periodLabels = periodValues.map(periodLabel).join('|');

    const definition = useMemo(() => {
      const indexes = Array.from({ length: total }, (_unused, index) => index);

      const fillOf = (candle: Candle) => COLOR_VAR[candle.rising ? rising : falling];
      const shared = {
        x: 'index' as const,
        fill: fillOf,
        states: [
          {
            when: { focus: 'unmatched' as const },
            style: { fillOpacity: fadedOpacity },
            transition: { type: 'tween' as const, duration: 120, easing: 'ease-out' as const },
          },
        ],
      };

      // The wicks go first so the bodies sit over them, which reads as one mark.
      const wicks = barY(candles, {
        ...shared,
        id: 'candlestick-wicks',
        key: (candle: Candle) => `wick:${candle.index}`,
        y1: 'low',
        y2: 'high',
        maxThickness: WICK_WIDTH,
      });
      const bodies = withBodyFloor(
        barY(candles, {
          ...shared,
          id: 'candlestick-bodies',
          key: (candle: Candle) => `body:${candle.index}`,
          y1: 'open',
          y2: 'close',
          radius: candlesSlot?.cornerRadius ?? 1.5,
          // A fixed width takes the whole slice and is capped by the option, less one pixel between bodies.
          ...(candleWidth !== undefined ? { maxThickness: candleWidth, inset: 0.5 } : {}),
        })
      );

      const gap = candleWidth !== undefined ? 0 : candleGap;
      const x = {
        scale: scaleBand(indexes, [0, 1]).paddingInner(gap).paddingOuter(gap / 2),
        axis: xAxis
          ? {
              line: false as const,
              tickLabels: { opacity: 1 },
              ticks: {
                size: 0,
                format: periodLabel,
                values: periodValues,
              },
            }
          : (false as const),
      };

      const y = {
        scale: scaleLinear(extent, [0, 1]),
        grid: grid ? { stroke: 'var(--border)', strokeOpacity: grid.opacity, strokeDasharray: grid.dashArray } : false,
        axis:
          tickCount !== undefined
            ? {
                line: false as const,
                tickLabels: { opacity: yAxis ? 1 : 0 },
                ticks: {
                  size: 0,
                  values: priceValues,
                  format: priceLabel,
                },
              }
            : (false as const),
      };

      const interactive = tooltip !== undefined && !loading && candles.length > 0;

      return defineChart({
        theme: THEME,
        marks: loading || !candlesSlot ? [] : [wicks, bodies],
        scales: { x, y },
        ...(compact ? { guides: false as const, margin: 0 } : {}),
        ...(loading && yAxis ? { margin: { left: LOADING_GUTTER } } : {}),
        focusRing: false,
        /*
         * Candles grow in one after another and all finish inside the one
         * duration: the window each gets is what is left after the last one's
         * delay. Only the candles arrive, so a replay does not fade the axis in.
         */
        motion: (context: ChartMotionContext<Candle>) => {
          if (context.phase !== 'enter') {
            return { transition: { type: 'tween' as const, duration: domainDuration, easing: 'ease-out' as const } };
          }
          if (context.role !== 'bar') return false as const;
          const period = context.datum?.index ?? 0;
          return {
            delay: total > 1 ? (period / total) * animationDuration * STAGGER_SHARE : 0,
            transition: {
              type: 'tween' as const,
              duration: animationDuration * (1 - (total > 1 ? STAGGER_SHARE : 0)),
              easing: 'ease-out' as const,
            },
          };
        },
        keyboard: interactive,
        pointer: interactive,
        ...(interactive
          ? {
              focus: 'group-x' as const,
              maxFocusDistance: Number.POSITIVE_INFINITY,
              tooltip: {
                use: chartTooltip,
                // Drawn by `renderReadout`. This is what the live region announces.
                content(points: readonly ChartPoint<Candle, number, number>[]) {
                  const candle = points[0]?.datum;
                  const datum = candle ? data[candle.index] : undefined;
                  if (!candle || !datum) return { rows: [] };
                  const { formatValue, formatX, showChange = true } = tooltip.latest.current;
                  const price = (field: TooltipField) =>
                    formatValue ? formatValue(candle[field], field) : compactNumber(candle[field]);
                  return {
                    title: formatX ? formatX(datum) : String(datum[xDataKey] ?? ''),
                    rows: [
                      { label: 'Open', value: price('open') },
                      { label: 'High', value: price('high') },
                      { label: 'Low', value: price('low') },
                      { label: 'Close', value: price('close') },
                      ...(showChange ? [{ label: 'Change', value: changeText(candle) }] : []),
                    ],
                  };
                },
              },
            }
          : {}),
      });
    }, [
      candles,
      extent,
      total,
      data,
      xDataKey,
      loading,
      candleGap,
      candleWidth,
      fadedOpacity,
      compact,
      animationDuration,
      domainDuration,
      rising,
      falling,
      grid,
      candlesSlot,
      xAxis !== undefined,
      yAxis !== undefined,
      priceLabels,
      periodLabels,
      tooltip,
    ]);

    // Marks take their timing from the definition. This one is what the readout
    // moves with, and it should keep up with the pointer.
    const renderer = useMemo(() => motion({ transition: { type: 'tween', duration: 160, easing: 'ease-out' } }), []);

    const summary = label ?? `Candlestick chart, ${data.length} ${data.length === 1 ? 'period' : 'periods'}`;

    const context = useMemo<CandlestickChartContextValue>(
      () => ({ data, xDataKey, setSlot, activeIndex, rising, falling }),
      [data, xDataKey, setSlot, activeIndex, rising, falling]
    );

    const spokenRow = (datum: CandlestickChartDatum, index: number) =>
      labelForDatum?.(datum, index) ??
      [xDataKey, openDataKey, highDataKey, lowDataKey, closeDataKey]
        .filter((key) => datum[key] !== null && datum[key] !== undefined)
        .map((key) => `${key}, ${datum[key]}`)
        .join('. ');

    // The chart also reports a period again when the data is rebuilt under it. Only
    // a change of period is news, and repeating it can loop a caller that keeps the datum.
    const reportedIndex = useRef(-1);
    const reportActive = (index: number) => {
      if (reportedIndex.current === index) return;
      reportedIndex.current = index;
      setActiveIndex(index);
      onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
    };
    const onFocusChange = (point: ChartPoint<Candle, number, number> | null) =>
      reportActive(point ? point.datum.index : -1);

    // A remounted chart says nothing about the focus it lost.
    useEffect(() => reportActive(-1), [revision, status]);

    // A held reading ends with the next press, or with the chart it was read from.
    useEffect(() => () => releaseDrag.current?.(), [revision, status]);

    const clearReading = () => {
      releaseDrag.current?.();
      interactionRef.current?.setControlledFocus(null);
    };

    /*
     * The chart follows a mouse on its own but not a finger, which it treats as a
     * tap. A sideways drag reads the periods it crosses, and the last one stays
     * until the next press, the same as a tap's. A vertical drag never gets here:
     * `pan-y` gives it to the page, and the browser cancels the pointer.
     */
    const readDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch' || !tooltip || loading) return;
      const interaction = interactionRef.current;
      const target = interaction?.resolvePointer(event.clientX, event.clientY);
      if (!interaction || !target) return;
      interaction.setControlledFocus(target);
      if (releaseDrag.current) return;
      document.addEventListener('pointerdown', clearReading, { capture: true });
      releaseDrag.current = () => {
        document.removeEventListener('pointerdown', clearReading, { capture: true });
        releaseDrag.current = null;
      };
    };

    const renderReadout = (index: number) => {
      const datum = data[index];
      const ohlc = ohlcOf(datum, keys);
      if (!datum || !ohlc) return null;
      const { formatValue, formatX, showChange = true } = tooltip?.latest.current ?? {};
      const price = (value: number, field: TooltipField) => (formatValue ? formatValue(value, field) : compactNumber(value));
      const fields: [string, number, TooltipField][] = [
        ['O', ohlc.open, 'open'],
        ['H', ohlc.high, 'high'],
        ['L', ohlc.low, 'low'],
        ['C', ohlc.close, 'close'],
      ];
      return (
        <div data-slot="candlestick-chart-readout" className={slotClasses.readout({ className: tooltip?.className })}>
          <div className={slotClasses.readoutTitle()}>{formatX ? formatX(datum) : String(datum[xDataKey] ?? '')}</div>
          <div className={slotClasses.readoutPrices()}>
            {fields.map(([name, value, field]) => (
              <div key={field} className={slotClasses.readoutPrice()}>
                <span className={slotClasses.readoutField()}>{name}</span>
                <span className={slotClasses.readoutValue()}>{price(value, field)}</span>
              </div>
            ))}
          </div>
          {showChange ? (
            <div
              className={slotClasses.readoutChange()}
              style={{ color: COLOR_VAR[ohlc.close >= ohlc.open ? rising : falling] }}
            >
              {changeText(ohlc)}
            </div>
          ) : null}
        </div>
      );
    };

    const element = useRender({
      defaultTagName: 'div',
      render,
      props: mergeProps(
        {
          'data-slot': 'candlestick-chart',
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
                ref={plotRef}
                data-slot="candlestick-chart-plot"
                className={slotClasses.plot()}
                style={{ aspectRatio }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') clearReading();
                }}
                onPointerMove={readDrag}
                onPointerCancel={clearReading}
              >
                {width > 0 ? (
                  <RendererChart
                    // An entrance only grows from the baseline on a chart's first paint,
                    // so the candles arriving after a load, or a replay, are a new chart.
                    key={`${revision}:${status}`}
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
                    renderTooltipBody={({ points }) => {
                      const point = points[0] as ChartPoint<Candle, number, number> | undefined;
                      return point ? renderReadout(point.datum.index) : null;
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

    return <CandlestickChartContext.Provider value={context}>{element}</CandlestickChartContext.Provider>;
  }
);
CandlestickChartRoot.displayName = 'CandlestickChart';

/** Hands a part's formatters to the root without a new function rebuilding the chart. */
function useLatest<T>(value: T) {
  const [latest] = useState(() => ({ current: value }));
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export interface CandlestickChartGridProps {
  /** How many intervals to divide the price axis into. Yields `rows + 1` lines. A `YAxis` beside it sets the count instead. */
  rows?: number;
  /** The stroke's dash pattern. */
  dashArray?: string;
  /** Opacity of the lines. */
  opacity?: number;
}

/** Lines across the price axis, so a candle can be read against a number. */
function CandlestickChartGrid({ rows = 4, dashArray = '4 6', opacity = 1 }: CandlestickChartGridProps) {
  const { setSlot } = useChart('CandlestickChart.Grid');
  useEffect(() => {
    setSlot('grid', { rows, dashArray, opacity });
    return () => setSlot('grid', undefined);
  }, [rows, dashArray, opacity, setSlot]);
  return null;
}
CandlestickChartGrid.displayName = 'CandlestickChart.Grid';

export interface CandlestickChartCandlesProps {
  /** The theme role of a period that closed at or above its open. */
  risingColor?: CandlestickChartColor;
  /** The theme role of a period that closed below its open. */
  fallingColor?: CandlestickChartColor;
  /** Corner radius on a body. */
  cornerRadius?: number;
}

/** The candles: a wick from low to high, and a body from open to close over it. */
function CandlestickChartCandles({
  risingColor = DEFAULT_RISING,
  fallingColor = DEFAULT_FALLING,
  cornerRadius = 1.5,
}: CandlestickChartCandlesProps) {
  const { setSlot } = useChart('CandlestickChart.Candles');
  useEffect(() => {
    setSlot('candles', { rising: risingColor, falling: fallingColor, cornerRadius });
    return () => setSlot('candles', undefined);
  }, [risingColor, fallingColor, cornerRadius, setSlot]);
  return null;
}
CandlestickChartCandles.displayName = 'CandlestickChart.Candles';

export interface CandlestickChartXAxisProps {
  /** How many labels to show. Derived from the room available when omitted. */
  ticks?: number;
  /** Format a row's label. Defaults to the value at `xDataKey`. */
  format?: (datum: CandlestickChartDatum, index: number) => string;
}

/** The period labels, one under each candle there is room to name. */
function CandlestickChartXAxis({ ticks, format }: CandlestickChartXAxisProps) {
  const { setSlot } = useChart('CandlestickChart.XAxis');
  useEffect(() => {
    setSlot('xAxis', { ticks, format });
    return () => setSlot('xAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
CandlestickChartXAxis.displayName = 'CandlestickChart.XAxis';

export interface CandlestickChartYAxisProps {
  /** How many intervals to divide the price axis into. Yields `ticks + 1` labels. */
  ticks?: number;
  /** Format a price for its label. Defaults to a compact number. */
  format?: (value: number) => string;
}

/** Price labels down the side, on the grid lines, with room made for them. */
function CandlestickChartYAxis({ ticks = 4, format }: CandlestickChartYAxisProps) {
  const { setSlot } = useChart('CandlestickChart.YAxis');
  useEffect(() => {
    setSlot('yAxis', { ticks, format });
    return () => setSlot('yAxis', undefined);
  }, [ticks, format, setSlot]);
  return null;
}
CandlestickChartYAxis.displayName = 'CandlestickChart.YAxis';

export interface CandlestickChartTooltipProps {
  /** Format one of the four prices. Defaults to a compact number. */
  formatValue?: (value: number, field: TooltipField) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: CandlestickChartDatum) => string;
  /** Show the period's change from open to close under the four prices. */
  showChange?: boolean;
  /** Added to the readout's surface. */
  className?: string;
}

/**
 * The readout, and what drives it: hovering a period, pressing or dragging across
 * them, or the arrow keys. A click or a tap pins the reading until the next press
 * elsewhere or Escape. The whole plot is the hit area, because candles are thin.
 */
function CandlestickChartTooltip({ formatValue, formatX, showChange = true, className }: CandlestickChartTooltipProps) {
  const { setSlot } = useChart('CandlestickChart.Tooltip');
  const latest = useLatest({ formatValue, formatX, showChange });
  useEffect(() => {
    setSlot('tooltip', { className, latest });
    return () => setSlot('tooltip', undefined);
  }, [className, latest, setSlot]);
  return null;
}
CandlestickChartTooltip.displayName = 'CandlestickChart.Tooltip';

/** A swatch and a name for each direction, in the colours the candles are drawn in. */
function useDirectionKey(risingLabel: string, fallingLabel: string, classes: ReturnType<typeof candlestickChartVariants>) {
  const { rising, falling } = useChart('CandlestickChart.Legend');
  const entries: [string, CandlestickChartColor][] = [
    [risingLabel, rising],
    [fallingLabel, falling],
  ];
  return entries.map(([name, color]) => (
    <span key={name} className={classes.legendItem()}>
      <span className={classes.legendSwatch()} style={{ background: COLOR_VAR[color] }} />
      {name}
    </span>
  ));
}

export interface CandlestickChartLegendProps extends ComponentProps<'div'> {
  /** What the rising colour is called. */
  risingLabel?: string;
  /** What the falling colour is called. */
  fallingLabel?: string;
}

/** The two colours and what they mean, over the top corner of the plot. */
function CandlestickChartLegend({
  risingLabel = 'Up',
  fallingLabel = 'Down',
  className,
  render,
  ...props
}: CandlestickChartLegendProps & RenderProp<'div'>) {
  const slots = candlestickChartVariants();
  const key = useDirectionKey(risingLabel, fallingLabel, slots);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'candlestick-chart-legend',
        'aria-hidden': true,
        className: slots.legend({ className }),
        children: key,
      },
      props
    ),
  });
}
CandlestickChartLegend.displayName = 'CandlestickChart.Legend';

export interface CandlestickChartHeaderProps extends Omit<ComponentProps<'div'>, 'title'> {
  /** Small line above the value: what the chart is of. */
  title?: ReactNode;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: ReactNode;
  /** One muted line under the value: a period, a comparison, a change. */
  caption?: ReactNode;
  /** Name the two colours along the trailing edge. */
  legend?: boolean;
  /** What the rising colour is called. */
  risingLabel?: string;
  /** What the falling colour is called. */
  fallingLabel?: string;
  /** Trailing slot: a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it reads and what the two
 * colours mean. The value is not derived here. A readout that follows the pointer
 * takes it from `onActiveIndexChange` and passes the string down, so one header
 * can show the latest close at rest and a period's close while one is read.
 */
function CandlestickChartHeader({
  title,
  value,
  caption,
  legend = false,
  risingLabel = 'Up',
  fallingLabel = 'Down',
  className,
  children,
  render,
  ...props
}: CandlestickChartHeaderProps & RenderProp<'div'>) {
  const slots = candlestickChartVariants();
  const key = useDirectionKey(risingLabel, fallingLabel, slots);
  const trailing = children ?? (legend ? key : null);

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        'data-slot': 'candlestick-chart-header',
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
CandlestickChartHeader.displayName = 'CandlestickChart.Header';

export const CandlestickChart = Object.assign(CandlestickChartRoot, {
  Header: CandlestickChartHeader,
  Grid: CandlestickChartGrid,
  Candles: CandlestickChartCandles,
  XAxis: CandlestickChartXAxis,
  YAxis: CandlestickChartYAxis,
  Tooltip: CandlestickChartTooltip,
  Legend: CandlestickChartLegend,
});

/* By name as well, for a Server Component, which cannot dot into a client
   module. */
export {
  CandlestickChartHeader,
  CandlestickChartGrid,
  CandlestickChartCandles,
  CandlestickChartXAxis,
  CandlestickChartYAxis,
  CandlestickChartTooltip,
  CandlestickChartLegend,
};
