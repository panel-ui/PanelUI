/**
 * CandlestickChart — four numbers a period, drawn as one mark.
 *
 * Composed the same way every chart here is: the grid, the candles, the axes
 * and the readout are separate children, so a chart that wants no grid simply
 * does not have one.
 *
 * ```tsx
 * <CandlestickChart data={session} xDataKey="day">
 *   <CandlestickChart.Grid />
 *   <CandlestickChart.Candles />
 *   <CandlestickChart.XAxis />
 *   <CandlestickChart.Tooltip />
 * </CandlestickChart>
 * ```
 *
 * ## One mark, four numbers
 *
 * A row is `{ open, high, low, close }`. The body spans open to close and is
 * filled by direction — rising when the close is at or above the open, falling
 * when it is below — and the wick spans low to high behind it. Colour is
 * therefore the *sign* of the period rather than a series identity, which is
 * why this chart has no series list and no legend: there is only ever one
 * thing plotted, and the two colours are its two states.
 *
 * ## The baseline is not zero, and must not be
 *
 * A bar compares lengths, so its axis has to reach zero or twice as tall stops
 * meaning twice as much. A candle compares nothing to zero. What is being read
 * is the distance between four numbers that sit close together and far from the
 * origin — a share at 180 that moved between 178 and 183 is a chart of that
 * five-point span, and forcing zero onto the axis turns every candle in it into
 * a dash. So the domain is derived from the lowest low and the highest high,
 * with a margin so the extremes are not drawn on the frame.
 *
 * ## Two paths, not two per candle
 *
 * Every rising body is a subpath of one path and every falling body of another,
 * and the wicks likewise — four animated props a frame whether the chart holds
 * twenty candles or two hundred. A candle also cannot be drawn as a rectangle
 * element and animated: the grow-in scales each body about its own middle, and
 * that is a path rebuilt per frame on the UI thread rather than a transform
 * that would take the wick and the neighbours with it.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Line as SvgLine, Path } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { bandOf, compactNumber, yOf, type Plot } from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Room left around the plot for the axis labels. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/** Width the readout is laid out at, so it can be clamped inside the plot. */
const LABEL_WIDTH = 148;

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 48;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

/**
 * Closest two date labels may be placed, in points.
 *
 * Wider than the text needs, and that is the whole job of it. A candlestick
 * chart holds far more periods than a bar chart holds categories — thirty
 * sessions across a phone is eleven points each — so the axis is always
 * thinning, and how much it thins is set here. Spacing them at the width of the
 * text alone leaves every label touching its neighbour, which reads as one long
 * smear rather than as a row of dates.
 */
const MIN_BAND_LABEL = 68;

/**
 * Width one date label is drawn in.
 *
 * Deliberately narrower than the spacing above, so there is always a gap
 * between one label and the next. It is also what each is centred in, so a
 * label sits over its own candle rather than over the slice it shares.
 */
const LABEL_BOX = 52;

/** Thinnest a wick is drawn, in points. Below about this it stops being visible. */
const WICK_WIDTH = 1.5;

/**
 * Shortest a body is drawn, in points.
 *
 * A period that opened and closed at the same number is the one case where the
 * body has no height of its own, and it is not the same event as no period at
 * all — a flat body says the price came back to where it started, which is
 * worth seeing. It is also what a doji is.
 */
const MIN_BODY_HEIGHT = 1.5;

type Layer = 'svg' | 'overlay' | 'header';

/** Green and red before the stylesheet has been read. */
const FALLBACK_RISING = '#10b981';
const FALLBACK_FALLING = '#ef4444';

/**
 * A candle's colour, which is its *direction* rather than a series identity.
 *
 * The chart-series tokens are wrong here on purpose. They are a palette meant
 * to tell several things apart, and are picked to be distinguishable rather
 * than to mean anything; up and down are not two series, they are two states of
 * one, and the convention for them is older than any palette. So this reaches
 * for the success and destructive tokens, which are the theme's green and red
 * and already carry that sense everywhere else in the library.
 */
function useDirectionColor(
  explicit: string | undefined,
  direction: 'rising' | 'falling'
): string {
  const token = useCSSVariable(
    direction === 'rising' ? '--color-success' : '--color-destructive'
  );
  const fallback = direction === 'rising' ? FALLBACK_RISING : FALLBACK_FALLING;
  return explicit ?? (typeof token === 'string' ? token : fallback);
}

export type CandlestickChartStatus = 'loading' | 'ready';

/**
 * One period. `open`, `high`, `low` and `close` are required to be numbers —
 * unlike a line, a candle cannot be drawn from some of them.
 */
export interface CandlestickChartDatum {
  [key: string]: string | number | null | undefined;
}

interface CandlestickChartContextValue {
  data: CandlestickChartDatum[];
  xDataKey: string;
  openKey: string;
  highKey: string;
  lowKey: string;
  closeKey: string;
  plot: Plot;
  status: CandlestickChartStatus;
  candleGap: number;
  candleWidth: number | undefined;
  fadedOpacity: number;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  /** The settled domain, for the parts that draw text rather than geometry. */
  extent: [number, number];
  /** 0 to 1 as the candles grow in. Shared, so they arrive as one chart. */
  reveal: SharedValue<number>;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
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
 * The candle under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveIndexChange` for that.
 */
export function useCandlestickChart() {
  const { data, activeIndexJS, xDataKey } = useChart('useCandlestickChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

/** Reads one row's four numbers, or `null` if any of them is missing. */
function ohlcOf(
  row: CandlestickChartDatum | undefined,
  openKey: string,
  highKey: string,
  lowKey: string,
  closeKey: string
): { open: number; high: number; low: number; close: number } | null {
  'worklet';
  if (!row) return null;
  const open = row[openKey];
  const high = row[highKey];
  const low = row[lowKey];
  const close = row[closeKey];
  if (
    typeof open !== 'number' ||
    typeof high !== 'number' ||
    typeof low !== 'number' ||
    typeof close !== 'number' ||
    Number.isNaN(open) ||
    Number.isNaN(high) ||
    Number.isNaN(low) ||
    Number.isNaN(close)
  ) {
    return null;
  }
  return { open, high, low, close };
}

export interface CandlestickChartProps extends ViewProps, ChartAccessibilityProps<CandlestickChartDatum> {
  className?: string;
  /** The rows. Each one is a period along the x-axis. */
  data: CandlestickChartDatum[];
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
   * `loading` leaves the plot empty — the frame, the grid and the header stay,
   * and no candles are drawn. Turning `ready` grows them in left to right.
   *
   * Nothing stands in for the candles while they are missing. A placeholder
   * candle is four made-up prices, and a reader has no way to tell an invented
   * one from a real one until it changes under them.
   */
  status?: CandlestickChartStatus;
  /** Width ÷ height. `1.6` suits a chart this dense better than `2`. */
  aspectRatio?: number;
  /** Milliseconds for the candles to grow in on mount. */
  animationDuration?: number;
  /** Milliseconds for the price axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the price axis instead of deriving it from the lows and highs. Note
   * that the derived domain deliberately does *not* include zero — see the
   * notes on why a candle's axis is not a bar's.
   */
  yDomain?: [number, number];
  /**
   * Fraction of each period's slice left empty, `0` to `1`. A fraction rather
   * than a pixel gap so the proportions hold at any width.
   */
  candleGap?: number;
  /** Fixed body width in points. Derived from the slice when omitted. */
  candleWidth?: number;
  /** Opacity of the candles that are not under the finger. */
  fadedOpacity?: number;
  /**
   * The candle under the finger as it moves, and `-1`/`null` when it lifts.
   * This is how a readout in the card's header gets its value — that header is
   * outside the chart, so it cannot use `useCandlestickChart`.
   *
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: CandlestickChartDatum | null) => void;
  /** Drop the axis padding, for a dense strip with no axis or readout. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface CandlestickChartHandle {
  replay: () => void;
}

function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    const slot = <ChildSlot key={index}>{child}</ChildSlot>;
    (layer === 'header' ? header : layer === 'overlay' ? overlay : svg).push(slot);
  });
  return { svg, overlay, header };
}

/** Identity wrapper, purely so the partitioned arrays can carry keys. */
function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const CandlestickChartRoot = forwardRef<CandlestickChartHandle, CandlestickChartProps>(
  function CandlestickChartRoot(
    {
      className,
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
      accessible,
      accessibilityLabel,
      accessibilityHint,
      accessibilityLabelForDatum,
      onAccessibilityDatumPress,
      compact = false,
      children,
      ...props
    },
    ref
  ) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [activeIndexJS, setActiveIndexJS] = useState(-1);

    const reveal = useSharedValue(0);
    const domainMin = useSharedValue(0);
    const domainMax = useSharedValue(0);
    const activeIndex = useSharedValue(-1);
    const reducedMotion = useReducedMotion();

    /*
     * Whether an axis is asking for room. It has to be known before the plot is
     * laid out, and only the root sees the children early enough to ask — the
     * axis itself renders into a box that has already been decided.
     */
    const hasYAxis = useMemo(() => {
      let found = false;
      Children.forEach(children, (child) => {
        if (isValidElement(child) && (child.type as { axis?: string }).axis === 'y') {
          found = true;
        }
      });
      return found;
    }, [children]);

    const pad = compact
      ? { top: 2, right: 1, bottom: 2, left: 1 }
      : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };

    /*
     * The lowest low to the highest high, with a tenth of the span as margin at
     * each end so the extremes are not drawn on the frame.
     *
     * Nothing here reaches for zero, and that is the point. A candle's four
     * numbers sit close together and usually far from the origin; including
     * zero would compress the whole chart into a band at the top and every
     * candle in it into a dash.
     */
    const extent = useMemo<[number, number]>(() => {
      if (yDomain) return yDomain;
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      for (const row of data) {
        const ohlc = ohlcOf(row, openDataKey, highDataKey, lowDataKey, closeDataKey);
        if (!ohlc) continue;
        if (ohlc.low < min) min = ohlc.low;
        if (ohlc.high > max) max = ohlc.high;
      }

      if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
      // A span of nothing — one period, or a price that never moved — still
      // needs a domain to divide by, so it is given a little room either side.
      if (min === max) {
        const nudge = Math.abs(min) * 0.05 || 1;
        return [min - nudge, max + nudge];
      }
      const margin = (max - min) * 0.1;
      return [min - margin, max + margin];
    }, [data, yDomain, openDataKey, highDataKey, lowDataKey, closeDataKey]);

    const loading = status === 'loading';

    useEffect(() => {
      if (loading) return;
      const [min, max] = extent;
      const first = domainMin.value === 0 && domainMax.value === 0;
      if (first || reducedMotion) {
        domainMin.value = min;
        domainMax.value = max;
        return;
      }
      domainMin.value = withTiming(min, { duration: domainDuration });
      domainMax.value = withTiming(max, { duration: domainDuration });
    }, [extent, loading, reducedMotion, domainDuration, domainMin, domainMax]);

    const revealed = useRef(false);
    const playReveal = useMemo(
      () => () => {
        if (reducedMotion) {
          reveal.value = 1;
          return;
        }
        reveal.value = 0;
        reveal.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
      },
      [reducedMotion, animationDuration, reveal]
    );

    useEffect(() => {
      /*
       * Going back to `loading` arms the reveal again. Without this a chart
       * that is refetched comes back fully drawn on the frame the data lands,
       * which reads as the loading state having been for nothing.
       */
      if (loading) {
        revealed.current = false;
        reveal.value = 0;
        return;
      }
      if (revealed.current || plot.width <= 0 || !data.length) return;
      revealed.current = true;
      playReveal();
    }, [loading, plot.width, data.length, playReveal, reveal]);

    useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

    const handleActiveIndex = useMemo(
      () => (index: number) => {
        setActiveIndexJS(index);
        onActiveIndexChange?.(index, index >= 0 ? (data[index] ?? null) : null);
      },
      [onActiveIndexChange, data]
    );

    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize((current) =>
        Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height }
      );
      props.onLayout?.(event);
    };

    const context = useMemo<CandlestickChartContextValue>(
      () => ({
        data,
        xDataKey,
        openKey: openDataKey,
        highKey: highDataKey,
        lowKey: lowDataKey,
        closeKey: closeDataKey,
        plot,
        status,
        candleGap,
        candleWidth,
        fadedOpacity,
        domainMin,
        domainMax,
        extent,
        reveal,
        activeIndex,
        activeIndexJS,
        setActiveIndexJS: handleActiveIndex,
      }),
      // `plot` is rebuilt every render from `size`, so it is compared by value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        data,
        xDataKey,
        openDataKey,
        highDataKey,
        lowDataKey,
        closeDataKey,
        plot.width,
        plot.height,
        plot.left,
        plot.top,
        status,
        candleGap,
        candleWidth,
        fadedOpacity,
        domainMin,
        domainMax,
        extent,
        reveal,
        activeIndex,
        activeIndexJS,
        handleActiveIndex,
      ]
    );

    const { svg, overlay, header } = partition(children);

    /*
     * Two views, because the header is not part of the plot. `aspectRatio` and
     * the layout measurement belong to the drawing area alone — measured on the
     * outer view they would take in the header too, and the plot would lose as
     * much height as the readout took while still claiming the shape asked for.
     */
    return (
      <CandlestickChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Candlestick chart"
            data={data}
            disabled={accessible === false || loading}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
            valueOf={(datum) => [
              [xDataKey, datum[xDataKey]],
              [openDataKey, datum[openDataKey]],
              [highDataKey, datum[highDataKey]],
              [lowDataKey, datum[lowDataKey]],
              [closeDataKey, datum[closeDataKey]],
            ]}
          />
          <View
            onLayout={onLayout}
            style={{ aspectRatio }}
            className="w-full"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {plot.width > 0 ? (
              <>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  {svg}
                </Svg>
                {overlay}
              </>
            ) : null}
          </View>
        </View>
      </CandlestickChartContext.Provider>
    );
  }
);
CandlestickChartRoot.displayName = 'CandlestickChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface CandlestickChartGridProps {
  /** How many lines to draw across the price axis. */
  rows?: number;
  color?: string;
  dashArray?: string;
  opacity?: number;
}

/**
 * Lines across the price axis, so a candle can be read against a number rather
 * than only against the candle beside it.
 */
function CandlestickChartGrid({
  rows = 4,
  color,
  dashArray = '4,6',
  opacity = 1,
}: CandlestickChartGridProps) {
  const { plot } = useChart('CandlestickChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  return (
    <G opacity={opacity}>
      {Array.from({ length: rows + 1 }, (_unused, index) => {
        const y = plot.top + (plot.height / rows) * index;
        return (
          <SvgLine
            key={index}
            x1={plot.left}
            x2={plot.left + plot.width}
            y1={y}
            y2={y}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray={dashArray}
          />
        );
      })}
    </G>
  );
}
CandlestickChartGrid.displayName = 'CandlestickChart.Grid';
CandlestickChartGrid.layer = 'svg' as Layer;

export interface CandlestickChartCandlesProps {
  /** Colour of a period that closed at or above its open. Green by default. */
  risingColor?: string;
  /** Colour of a period that closed below its open. Red by default. */
  fallingColor?: string;
  /** Corner radius on a body. */
  cornerRadius?: number;
}

/**
 * The candles.
 *
 * Four paths, not four per candle: rising bodies, falling bodies, and the wicks
 * behind each. A chart of two hundred periods is the same four animated props
 * a frame as a chart of twenty, and the split by direction is what lets each
 * half carry its own fill without a fill per mark.
 *
 * The wicks are drawn first so the bodies sit over them, which is what makes a
 * body with a wick behind it read as one mark rather than as a line crossing a
 * rectangle.
 */
function CandlestickChartCandles({
  risingColor,
  fallingColor,
  cornerRadius = 1.5,
}: CandlestickChartCandlesProps) {
  const {
    data,
    openKey,
    highKey,
    lowKey,
    closeKey,
    plot,
    candleGap,
    candleWidth,
    fadedOpacity,
    domainMin,
    domainMax,
    reveal,
    activeIndex,
    status,
  } = useChart('CandlestickChart.Candles');

  const rising = useDirectionColor(risingColor, 'rising');
  const falling = useDirectionColor(fallingColor, 'falling');

  const total = data.length;
  const slice = total > 0 ? plot.width / total : 0;
  const width = Math.max(
    1,
    Math.min(candleWidth ?? slice * (1 - candleGap), Math.max(slice - 1, 1))
  );

  /*
   * Pulled out of the worklet as plain arrays. A worklet may close over numbers
   * and arrays of them freely, but reading `data`'s rows — objects of mixed
   * types, keyed by strings the caller chose — inside one every frame is the
   * kind of work that belongs on the JS side once rather than on the UI thread
   * sixty times a second.
   */
  const columns = useMemo(() => {
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const usable: boolean[] = [];
    for (const row of data) {
      const ohlc = ohlcOf(row, openKey, highKey, lowKey, closeKey);
      opens.push(ohlc?.open ?? 0);
      highs.push(ohlc?.high ?? 0);
      lows.push(ohlc?.low ?? 0);
      closes.push(ohlc?.close ?? 0);
      usable.push(ohlc !== null);
    }
    return { opens, highs, lows, closes, usable };
  }, [data, openKey, highKey, lowKey, closeKey]);

  /*
   * The four builders share this. Declared as a worklet at this scope so each
   * `useAnimatedProps` below can call it — a worklet may only call another
   * worklet, and the rule is enforced by crashing rather than by warning.
   */
  const build = (wantRising: boolean, wicks: boolean) => () => {
    'worklet';
    const min = domainMin.value;
    const max = domainMax.value;
    if (max === min || total === 0 || plot.width <= 0) return { d: '' };

    const grow = reveal.value;
    let path = '';

    for (let index = 0; index < total; index += 1) {
      if (!columns.usable[index]) continue;
      const open = columns.opens[index] ?? 0;
      const close = columns.closes[index] ?? 0;
      const up = close >= open;
      if (up !== wantRising) continue;

      /*
       * Staggered, so the chart fills in left to right rather than every
       * candle inflating at once. Each one gets the back half of the run,
       * which leaves the last candle finishing with the animation.
       */
      const start = total > 1 ? (index / total) * 0.45 : 0;
      const eased = Math.max(0, Math.min(1, (grow - start) / 0.55));
      if (eased <= 0) continue;

      const centre = bandOf(index, total, plot);
      const half = width / 2;

      if (wicks) {
        const high = columns.highs[index] ?? 0;
        const low = columns.lows[index] ?? 0;
        const yHigh = yOf(high, plot, min, max);
        const yLow = yOf(low, plot, min, max);
        // Grown about the body's middle rather than from the low, so the wick
        // opens out in both directions the way the body does.
        const mid = (yHigh + yLow) / 2;
        const top = mid + (yHigh - mid) * eased;
        const bottom = mid + (yLow - mid) * eased;
        const x = centre - WICK_WIDTH / 2;
        path += `M${x} ${top}h${WICK_WIDTH}V${bottom}h${-WICK_WIDTH}Z`;
        continue;
      }

      const yOpen = yOf(open, plot, min, max);
      const yClose = yOf(close, plot, min, max);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyBottom = Math.max(yOpen, yClose);
      const height = Math.max(bodyBottom - bodyTop, MIN_BODY_HEIGHT);
      const mid = bodyTop + height / 2;
      const grown = height * eased;
      const top = mid - grown / 2;

      // The radius can never exceed half the shortest side, or the two corners
      // on one edge overlap and the arc turns itself inside out.
      const r = Math.max(0, Math.min(cornerRadius, width / 2, grown / 2));
      const x = centre - half;

      if (r <= 0) {
        path += `M${x} ${top}h${width}v${grown}h${-width}Z`;
      } else {
        path +=
          `M${x + r} ${top}` +
          `h${width - r * 2}a${r} ${r} 0 0 1 ${r} ${r}` +
          `v${grown - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}` +
          `h${-(width - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
          `v${-(grown - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
      }
    }

    return { d: path };
  };

  /*
   * The builder is curried and its result handed straight to
   * `useAnimatedProps`, rather than being called from inside another worklet.
   * That is not a style choice: the hook works out what to re-run on by reading
   * the closure of the worklet it is given, and a shared value read one level
   * down is not in that closure. Wrapped, the paths were built once and then
   * never again — the chart drew nothing until some unrelated re-render
   * happened to rebuild them, which looked like a chart that only appeared once
   * it was touched.
   */
  const risingBodies = useAnimatedProps(build(true, false));
  const fallingBodies = useAnimatedProps(build(false, false));
  const risingWicks = useAnimatedProps(build(true, true));
  const fallingWicks = useAnimatedProps(build(false, true));

  /*
   * Dimming is a group opacity driven from the active index, rather than a
   * second pair of paths for the candle under the finger. A candle is one mark
   * of one colour, so there is nothing to keep at full ink separately — the
   * whole group fades and the active candle is redrawn over it at full
   * strength by `Highlight` below.
   */
  const dim = useAnimatedProps(() => ({
    opacity: activeIndex.value >= 0 ? fadedOpacity : 1,
  }));

  if (status === 'loading') return null;

  return (
    <>
      <AnimatedGroup animatedProps={dim}>
        <AnimatedPath animatedProps={risingWicks} fill={rising} />
        <AnimatedPath animatedProps={fallingWicks} fill={falling} />
        <AnimatedPath animatedProps={risingBodies} fill={rising} />
        <AnimatedPath animatedProps={fallingBodies} fill={falling} />
      </AnimatedGroup>
      <CandlestickHighlight
        rising={rising}
        falling={falling}
        width={width}
        cornerRadius={cornerRadius}
        columns={columns}
      />
    </>
  );
}
CandlestickChartCandles.displayName = 'CandlestickChart.Candles';
CandlestickChartCandles.layer = 'svg' as Layer;

const AnimatedGroup = Animated.createAnimatedComponent(G);

/**
 * The candle under the finger, drawn again at full strength over the dimmed
 * rest.
 *
 * Redrawing one mark is cheaper than splitting every path in two and rebuilding
 * both whenever the finger moves to the next candle, and it keeps the grow-in
 * builder above to a single shape.
 */
function CandlestickHighlight({
  rising,
  falling,
  width,
  cornerRadius,
  columns,
}: {
  rising: string;
  falling: string;
  width: number;
  cornerRadius: number;
  columns: {
    opens: number[];
    highs: number[];
    lows: number[];
    closes: number[];
    usable: boolean[];
  };
}) {
  const { data, plot, domainMin, domainMax, activeIndex } = useChart(
    'CandlestickChart.Candles'
  );
  const total = data.length;

  /*
   * The fill cannot be crossfaded between two colours on the UI thread, so both
   * paths are drawn and the one that does not apply is emptied. An empty path
   * costs nothing to render, and the swap never touches JS.
   */
  const build = (wantRising: boolean) => () => {
    'worklet';
    const index = activeIndex.value;
    const min = domainMin.value;
    const max = domainMax.value;
    if (index < 0 || index >= total || max === min || !columns.usable[index]) {
      return { d: '' };
    }

    const open = columns.opens[index] ?? 0;
    const close = columns.closes[index] ?? 0;
    if (close >= open !== wantRising) return { d: '' };

    const high = columns.highs[index] ?? 0;
    const low = columns.lows[index] ?? 0;

    const centre = bandOf(index, total, plot);
    const yOpen = yOf(open, plot, min, max);
    const yClose = yOf(close, plot, min, max);
    const bodyTop = Math.min(yOpen, yClose);
    const height = Math.max(Math.abs(yClose - yOpen), MIN_BODY_HEIGHT);
    const x = centre - width / 2;
    const r = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));

    const wickX = centre - WICK_WIDTH / 2;
    const wick =
      `M${wickX} ${yOf(high, plot, min, max)}h${WICK_WIDTH}` +
      `V${yOf(low, plot, min, max)}h${-WICK_WIDTH}Z`;

    const body =
      r <= 0
        ? `M${x} ${bodyTop}h${width}v${height}h${-width}Z`
        : `M${x + r} ${bodyTop}` +
          `h${width - r * 2}a${r} ${r} 0 0 1 ${r} ${r}` +
          `v${height - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}` +
          `h${-(width - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
          `v${-(height - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;

    return { d: `${wick}${body}` };
  };

  const risingShape = useAnimatedProps(build(true));
  const fallingShape = useAnimatedProps(build(false));

  return (
    <>
      <AnimatedPath animatedProps={risingShape} fill={rising} />
      <AnimatedPath animatedProps={fallingShape} fill={falling} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface CandlestickChartXAxisProps {
  /** How many labels to show. Derived from the room available when omitted. */
  ticks?: number;
  /** Format a row's label. Defaults to the value at `xDataKey`. */
  format?: (datum: CandlestickChartDatum, index: number) => string;
  className?: string;
}

/**
 * The period labels, one under each candle it has room for. Real text rather
 * than SVG text, so they follow the theme's font and the platform's text
 * scaling — SVG text does neither.
 */
function CandlestickChartXAxis({
  ticks,
  format,
  className,
}: CandlestickChartXAxisProps) {
  const { data, xDataKey, plot } = useChart('CandlestickChart.XAxis');

  const labels = useMemo(() => {
    if (!data.length) return [];

    // The axis asks the plot how much room there is and only thins when the
    // answer is not enough, rather than dropping labels that would have fitted.
    const room = Math.max(1, Math.floor(plot.width / MIN_BAND_LABEL));
    const count = Math.max(1, Math.min(ticks ?? room, data.length));

    // Every nth period, rather than a fractional step rounded to the nearest
    // index — rounding lands on the same one twice and skips its neighbour.
    const stride = Math.ceil(data.length / count);
    const picked: { key: number; text: string }[] = [];
    for (let index = 0; index < data.length; index += stride) {
      const datum = data[index];
      if (!datum) continue;
      picked.push({
        key: index,
        text: format ? format(datum, index) : String(datum[xDataKey] ?? ''),
      });
    }
    return picked;
  }, [data, ticks, format, xDataKey, plot.width]);

  /*
   * Each label is boxed at a readable width and centred on its own candle, not
   * at the width of the slice that candle occupies.
   *
   * A bar chart can tile its labels one band each, because a chart of eight
   * months has bands wide enough to write a month in. Thirty sessions across a
   * phone gives each one about eleven points, and a date boxed at eleven points
   * is a date clipped to nothing — which is what was happening. The axis has
   * already thinned the labels so the ones it kept are at least this far apart,
   * so a box this wide cannot collide with its neighbour; it is clamped inside
   * the plot so the first and last do not hang off the ends.
   */
  const boxes = useMemo(() => {
    const half = LABEL_BOX / 2;
    return labels.map((label) => {
      const centre = bandOf(label.key, data.length, plot);
      const clamped = Math.min(
        plot.left + plot.width - half,
        Math.max(plot.left + half, centre)
      );
      return { ...label, left: clamped - half };
    });
  }, [labels, data.length, plot]);

  return (
    <View
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      className={cn(className)}
    >
      {boxes.map((label) => (
        <Text
          key={label.key}
          size="xs"
          muted
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: 0,
            left: label.left,
            width: LABEL_BOX,
            textAlign: 'center',
          }}
          maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}
CandlestickChartXAxis.displayName = 'CandlestickChart.XAxis';
CandlestickChartXAxis.layer = 'overlay' as Layer;

export interface CandlestickChartYAxisProps {
  /** How many labels to show along the price axis. */
  ticks?: number;
  /** Format a price for its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/** Price labels down the side, aligned to the grid lines. */
function CandlestickChartYAxis({
  ticks = 4,
  format,
  className,
}: CandlestickChartYAxisProps) {
  const { plot, extent } = useChart('CandlestickChart.YAxis');

  /*
   * Read off the settled domain rather than the shared values the paths use.
   * A label is text, and text is JS — following the tween would re-render on
   * every frame of it to redraw a number nobody can read while it moves.
   */
  const labels = useMemo(() => {
    const [min, max] = extent;
    if (min === max) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = max - ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [extent, ticks, format]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        // Each label is centred on the grid line it names: the strip is lifted
        // half a label and grown by a whole one, so `justify-between` lands the
        // text's middle on the line rather than its top edge on the first and
        // its bottom edge on the last.
        top: plot.top - AXIS_LABEL_HEIGHT / 2,
        height: plot.height + AXIS_LABEL_HEIGHT,
        width: Math.max(Y_AXIS_WIDTH - 6, 0),
        justifyContent: 'space-between',
      }}
      className={cn(className)}
    >
      {labels.map((label) => (
        <Text
          key={label.key}
          size="xs"
          muted
          numberOfLines={1}
          className="text-right"
          maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}
CandlestickChartYAxis.displayName = 'CandlestickChart.YAxis';
CandlestickChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out — an axis drawn over the plot is unreadable, and makes what it is
// drawn over unreadable too.
CandlestickChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface CandlestickChartTooltipProps {
  /** Format one of the four prices. Defaults to a compact number. */
  formatValue?: (value: number, field: 'open' | 'high' | 'low' | 'close') => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: CandlestickChartDatum) => string;
  /** Show the period's change from open to close under the four prices. */
  showChange?: boolean;
  className?: string;
  /**
   * How long a press has to be held before the readout takes the touch, in
   * milliseconds.
   *
   * Until then the touch belongs to whatever else wants it: a quick tap still
   * reaches a button floating over the chart, and a swipe still scrolls the
   * screen the chart sits in. Set `0` to read on contact, only for a chart with
   * nothing over it and no scroll view around it.
   */
  activateAfterLongPress?: number;
}

/**
 * The readout, and the gesture that drives it.
 *
 * There is no crosshair. A candle is already the thing being pointed at, so
 * highlighting it and dimming the rest says the same thing without drawing a
 * line through the chart.
 *
 * The hit area is the whole plot. A readout you have to land on a candle to
 * summon is a readout nobody finds — and candles are thin.
 */
function CandlestickChartTooltip({
  formatValue,
  formatX,
  showChange = true,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: CandlestickChartTooltipProps) {
  const {
    data,
    xDataKey,
    openKey,
    highKey,
    lowKey,
    closeKey,
    plot,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('CandlestickChart.Tooltip');

  const total = data.length;
  const left = plot.left;
  const width = plot.width;

  /*
   * Declared inside the memo, next to its callers: a worklet may only call
   * another worklet, and the rule is enforced by crashing rather than warning.
   */
  const pan = useMemo(() => {
    const resolve = (x: number) => {
      'worklet';
      if (!total) return;
      const offset = (x - left) / (width || 1);
      // Slices, not points: the finger is inside whichever one it lands on,
      // which is a floor rather than a round to the nearest centre.
      const next = Math.max(0, Math.min(total - 1, Math.floor(offset * total)));
      if (next === activeIndex.value) return;
      activeIndex.value = next;
      runOnJS(setActiveIndexJS)(next);
    };

    return Gesture.Pan()
      // With a hold, only the timer may start the readout: a distance of 0 would
      // activate on the first move event and take the touch from a Pressable above.
      .minDistance(activateAfterLongPress > 0 ? 10_000 : 0)
      .activateAfterLongPress(activateAfterLongPress)
      .onStart((event) => {
        'worklet';
        resolve(event.x);
      })
      .onUpdate((event) => {
        'worklet';
        resolve(event.x);
      })
      .onFinalize(() => {
        'worklet';
        // Fires whether or not the readout ever took the touch.
        if (activeIndex.value === -1) return;
        activeIndex.value = -1;
        runOnJS(setActiveIndexJS)(-1);
      });
  }, [total, left, width, activeIndex, setActiveIndexJS, activateAfterLongPress]);

  // The readout centres over its candle and is clamped inside the plot, so it
  // never runs off the edge at the first or last one.
  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0 || !total) return { opacity: 0 };
    const slice = plot.width / total;
    const centre = plot.left + slice * (index + 0.5);
    const half = LABEL_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, centre)
    );
    return { opacity: 1, transform: [{ translateX: clamped - half }] };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const ohlc = ohlcOf(active ?? undefined, openKey, highKey, lowKey, closeKey);
  const fmt = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: CandlestickChartDatum) => String(datum[xDataKey] ?? ''));

  const rising = useDirectionColor(undefined, 'rising');
  const falling = useDirectionColor(undefined, 'falling');

  if (status === 'loading') return null;

  const change = ohlc ? ohlc.close - ohlc.open : 0;
  const percent = ohlc && ohlc.open !== 0 ? (change / ohlc.open) * 100 : 0;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: 0, width: LABEL_WIDTH },
            labelStyle,
          ]}
        >
          {active && ohlc ? (
            <View
              className={cn(
                'gap-0.5 rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg',
                className
              )}
            >
              <Text size="xs" muted numberOfLines={1}>
                {fmtX(active)}
              </Text>
              {/* Two columns of two. Four prices stacked one per line makes a
                  readout taller than the plot it is floating over. */}
              <View className="flex-row gap-3">
                <View className="flex-1 gap-0.5">
                  <OhlcRow label="O" value={fmt(ohlc.open, 'open')} />
                  <OhlcRow label="H" value={fmt(ohlc.high, 'high')} />
                </View>
                <View className="flex-1 gap-0.5">
                  <OhlcRow label="L" value={fmt(ohlc.low, 'low')} />
                  <OhlcRow label="C" value={fmt(ohlc.close, 'close')} />
                </View>
              </View>
              {showChange ? (
                <Text
                  size="xs"
                  weight="medium"
                  numberOfLines={1}
                  style={{ color: change >= 0 ? rising : falling }}
                >
                  {change >= 0 ? '+' : ''}
                  {compactNumber(change)} ({percent >= 0 ? '+' : ''}
                  {percent.toFixed(2)}%)
                </Text>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
CandlestickChartTooltip.displayName = 'CandlestickChart.Tooltip';
CandlestickChartTooltip.layer = 'overlay' as Layer;

/** One of the four prices in the readout, named by its initial. */
function OhlcRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-1">
      <Text size="xs" muted>
        {label}
      </Text>
      <Text size="xs" weight="medium" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface CandlestickChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the chart is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a change. */
  caption?: string;
  /** Name the two colours, for a reader who has not met the convention. */
  legend?: boolean;
  /** What the rising colour is called. */
  risingLabel?: string;
  /** What the falling colour is called. */
  fallingLabel?: string;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it currently reads, and
 * what the two colours mean.
 *
 * It belongs to the chart rather than to the card around it because it is about
 * the *plot* — the number changes as a finger moves along the candles. The
 * card's header is a caption on the tray the chart sits in; this is the chart
 * introducing itself.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down, so one header can show the latest close when nothing
 * is pressed and a period's close when something is.
 */
function CandlestickChartHeader({
  className,
  title,
  value,
  caption,
  legend = false,
  risingLabel = 'Up',
  fallingLabel = 'Down',
  children,
  ...props
}: CandlestickChartHeaderProps) {
  const rising = useDirectionColor(undefined, 'rising');
  const falling = useDirectionColor(undefined, 'falling');

  const trailing =
    children ??
    (legend ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <SeriesSwatch color={rising} label={risingLabel} />
        <SeriesSwatch color={falling} label={fallingLabel} />
      </View>
    ) : null);

  return (
    <View
      {...props}
      className={cn('flex-row items-start justify-between gap-3 pb-3', className)}
    >
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text size="xs" muted>
            {title}
          </Text>
        ) : null}
        {value ? (
          <Text size="xl" weight="bold">
            {value}
          </Text>
        ) : null}
        {caption ? (
          <Text size="xs" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      {/* Shrinkable, unlike a view's default in React Native. Held rigid, the
          key takes the width it wants and the caption under the value wraps to
          two lines to make room for it. */}
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
CandlestickChartHeader.displayName = 'CandlestickChart.Header';
CandlestickChartHeader.layer = 'header' as Layer;

/** One colour and what it means. Shared by the legend and the header. */
function SeriesSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />
      <Text size="xs" muted>
        {label}
      </Text>
    </View>
  );
}

export interface CandlestickChartLegendProps extends ViewProps {
  className?: string;
  /** What the rising colour is called. */
  risingLabel?: string;
  /** What the falling colour is called. */
  fallingLabel?: string;
}

/** The two colours and what they mean, floated over the plot. */
function CandlestickChartLegend({
  className,
  risingLabel = 'Up',
  fallingLabel = 'Down',
  ...props
}: CandlestickChartLegendProps) {
  const rising = useDirectionColor(undefined, 'rising');
  const falling = useDirectionColor(undefined, 'falling');

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-1 flex-row gap-3', className)}
    >
      <SeriesSwatch color={rising} label={risingLabel} />
      <SeriesSwatch color={falling} label={fallingLabel} />
    </View>
  );
}
CandlestickChartLegend.displayName = 'CandlestickChart.Legend';
CandlestickChartLegend.layer = 'overlay' as Layer;

export const CandlestickChart = Object.assign(CandlestickChartRoot, {
  Header: CandlestickChartHeader,
  Grid: CandlestickChartGrid,
  Candles: CandlestickChartCandles,
  XAxis: CandlestickChartXAxis,
  YAxis: CandlestickChartYAxis,
  Tooltip: CandlestickChartTooltip,
  Legend: CandlestickChartLegend,
});
