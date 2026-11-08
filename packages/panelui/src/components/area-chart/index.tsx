/**
 * AreaChart — filled bands over time, stacked or overlaid.
 *
 * ```tsx
 * <AreaChart data={traffic} xDataKey="date" stacked>
 *   <AreaChart.Grid />
 *   <AreaChart.Area dataKey="direct" />
 *   <AreaChart.Area dataKey="search" colorIndex={2} />
 *   <AreaChart.XAxis />
 *   <AreaChart.Tooltip />
 * </AreaChart>
 * ```
 *
 * ## Why this is not `LineChart.Area`
 *
 * `LineChart.Area` shades under a line, which is one series saying "this is
 * the shape of the thing". This chart answers a different question — *what is
 * it made of* — and that needs stacking: each band sits on the running total
 * of the ones below it, so the top edge is the whole and the thickness of each
 * band is its share.
 *
 * Stacking is not a flag that could be bolted on. It changes the y-domain from
 * the largest single series to the largest *sum*, it makes each area's
 * baseline a curve rather than the axis, and it makes the order the series are
 * declared in load-bearing. A chart where all of that is true of some children
 * and not others is a chart nobody can read, so it is a chart of its own.
 *
 * Unstacked, the bands overlay each other and the fills are drawn translucent,
 * which is the right reading when the series are alternatives rather than
 * parts — two plans compared, not two slices of one total.
 */
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useId,
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
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line as SvgLine,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import {
  areaPath,
  columnValues,
  compactNumber,
  linePath,
  useSeriesColor,
  xOf,
  yOf,
  type ChartCurve,
  type Plot,
  type SeriesColorIndex,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };
const LABEL_WIDTH = 132;

/**
 * Box each x label is centred in. Wide enough for a short label to sit over
 * its point without the neighbours colliding; a longer one is ellipsised
 * rather than allowed to push the others out of place.
 */
const POINT_LABEL_WIDTH = 56;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;
const DOT = 9;

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

type Layer = 'svg' | 'series' | 'overlay' | 'header';

export type AreaChartStatus = 'loading' | 'ready';
export type AreaChartDatum = Record<string, string | number | null | undefined>;

interface AreaChartContextValue {
  data: AreaChartDatum[];
  xDataKey: string;
  plot: Plot;
  status: AreaChartStatus;
  curve: ChartCurve;
  stacked: boolean;
  series: [string, string][];
  registerSeries: (key: string, color: string) => void;
  unregisterSeries: (key: string) => void;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  extent: [number, number];
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
}

const AreaChartContext = createContext<AreaChartContextValue | null>(null);

function useChart(component: string): AreaChartContextValue {
  const context = useContext(AreaChartContext);
  if (!context) {
    throw new Error(`${component} must be used within an <AreaChart>`);
  }
  return context;
}

/**
 * The point under the crosshair, for something rendered *inside* the chart.
 * A readout in the card's header is outside this provider — use
 * `onActiveIndexChange` for that.
 */
export function useAreaChart() {
  const { data, activeIndexJS, xDataKey } = useChart('useAreaChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

export interface AreaChartProps extends ViewProps, ChartAccessibilityProps<AreaChartDatum> {
  className?: string;
  /** The rows. Each one is a point along the x-axis. */
  data: AreaChartDatum[];
  /** Key holding the x label. Used by the axis and the crosshair readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bands flat and grows them into the real ones when it
   * turns `ready`. Add an `AreaChart.Skeleton` for something to stand in the
   * plot meanwhile.
   */
  status?: AreaChartStatus;
  /** Width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the reveal on mount. */
  animationDuration?: number;
  /** Milliseconds for the y-axis to settle after the data changes. */
  domainDuration?: number;
  /** Fix the y-axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /**
   * Sit each band on the running total of the ones below it, so the top edge
   * is the whole and each thickness is a share. The order the `Area` children
   * are declared in is the stacking order, bottom first.
   *
   * Unstacked, the bands overlay and their fills are translucent — the right
   * reading when the series are alternatives rather than parts of a total.
   */
  stacked?: boolean;
  /** `monotone` never overshoots between points; `linear` joins them straight. */
  curve?: ChartCurve;
  /**
   * The point under the crosshair as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: AreaChartDatum | null) => void;
  /** Drop the axis padding so the bands reach the edges, for a sparkline. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal on demand, for a "replay" control. */
export interface AreaChartHandle {
  replay: () => void;
}

function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const series: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    const slot = <ChildSlot key={index}>{child}</ChildSlot>;
    const bucket =
      layer === 'header'
        ? header
        : layer === 'overlay'
          ? overlay
          : layer === 'series'
            ? series
            : svg;
    bucket.push(slot);
  });
  return { svg, series, overlay, header };
}

const AreaChartRoot = forwardRef<AreaChartHandle, AreaChartProps>(function AreaChartRoot(
  {
    className,
    data,
    xDataKey = 'date',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    stacked = false,
    curve = 'monotone',
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
  const [series, setSeries] = useState<[string, string][]>([]);
  const [activeIndexJS, setActiveIndexJS] = useState(-1);

  const reveal = useSharedValue(0);
  const domainMin = useSharedValue(0);
  const domainMax = useSharedValue(0);
  const activeIndex = useSharedValue(-1);
  const reducedMotion = useReducedMotion();

  const registerSeries = useMemo(
    () => (key: string, color: string) =>
      setSeries((current) => {
        const existing = current.find(([k]) => k === key);
        if (existing?.[1] === color) return current;
        return [...current.filter(([k]) => k !== key), [key, color]];
      }),
    []
  );

  const unregisterSeries = useMemo(
    () => (key: string) => setSeries((current) => current.filter(([k]) => k !== key)),
    []
  );

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

  const seriesKeys = series.map(([key]) => key).join('|');
  const extent = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain;
    const keys = seriesKeys ? seriesKeys.split('|') : [];
    let min = Infinity;
    let max = -Infinity;

    for (const row of data) {
      /*
       * Stacked, the tall thing is the sum of the row; overlaid, it is the
       * largest single value in it. Reading the same number for both crops a
       * stack at its largest band and clips everything above it.
       */
      let rowTotal = 0;
      for (const key of keys) {
        const value = row[key];
        if (typeof value !== 'number' || Number.isNaN(value)) continue;
        if (stacked) {
          rowTotal += value;
        } else {
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
      if (stacked) {
        if (rowTotal < min) min = rowTotal;
        if (rowTotal > max) max = rowTotal;
      }
    }

    if (min === Infinity) return [0, 1];
    if (min === max) return [min - 1, max + 1];
    /*
     * An area is a filled region, and a region floating above the bottom of
     * the plot reads as a shape rather than as a quantity — so a series that
     * never goes below zero is drawn from zero. Padding only the top.
     */
    const floor = min >= 0 ? 0 : min - (max - min) * 0.1;
    return [floor, max + (max - min) * 0.1];
  }, [data, yDomain, seriesKeys, stacked]);

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
     * Going back to `loading` arms the reveal again. Without this a chart that
     * is refetched comes back fully drawn on the frame the data lands, which
     * reads as the loading state having been for nothing.
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

  const revealStyle = useAnimatedStyle(() => ({ width: plot.width * reveal.value }));

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

  const context = useMemo<AreaChartContextValue>(
    () => ({
      data,
      xDataKey,
      plot,
      status,
      curve,
      stacked,
      series,
      registerSeries,
      unregisterSeries,
      domainMin,
      domainMax,
      extent,
      activeIndex,
      activeIndexJS,
      setActiveIndexJS: handleActiveIndex,
    }),
    // `plot` is rebuilt every render from `size`, so it is compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data,
      xDataKey,
      plot.width,
      plot.height,
      plot.left,
      plot.top,
      status,
      curve,
      stacked,
      series,
      registerSeries,
      unregisterSeries,
      domainMin,
      domainMax,
      extent,
      activeIndex,
      activeIndexJS,
      handleActiveIndex,
    ]
  );

  const { svg, series: seriesLayer, overlay, header } = partition(children);

  /*
   * Two views, because the header is not part of the plot. `aspectRatio` and
   * the layout measurement belong to the drawing area alone — measured on the
   * outer view they would take in the header too, and the plot would lose as
   * much height as the readout took while still claiming the shape asked for.
   */
  return (
    <AreaChartContext.Provider value={context}>
      <View {...props} style={props.style} className={cn('w-full', className)}>
        {header}
        <ChartAccessibilityData
          chart="Area chart"
          data={data}
          disabled={accessible === false || loading}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityLabelForDatum={accessibilityLabelForDatum}
          onAccessibilityDatumPress={onAccessibilityDatumPress}
          valueOf={(datum) => [
            [xDataKey, datum[xDataKey]],
            ...series.map(([key]) => [key, datum[key]] as [string, unknown]),
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
              {/*
               * The reveal is a view that grows, not an SVG clip path.
               *
               * It used to be an animated `<Rect>` inside `<Defs>`, and on
               * Android those animated props never reach the native clip — the
               * rect keeps whatever width was declared on it, so the chart drew
               * complete and the reveal simply did not play. A view with
               * `overflow: 'hidden'` is clipped by the platform itself, which
               * both platforms agree on.
               *
               * Animating `width` is normally a layout pass per frame. Here the
               * view is absolutely positioned and its only child is an `<Svg>`
               * with an explicit width and height, so the work is one node and
               * nothing around it moves.
               *
               * The inner `<Svg>` is pulled back by `plot.left` so the bands
               * keep the same coordinate space as the grid underneath them.
               */}
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: 'absolute', top: 0, bottom: 0, left: plot.left, overflow: 'hidden' },
                  revealStyle,
                ]}
              >
                <Svg
                  width={size.width}
                  height={size.height}
                  style={{ position: 'absolute', top: 0, left: -plot.left }}
                >
                  {seriesLayer}
                </Svg>
              </Animated.View>
              {overlay}
            </>
          ) : null}
        </View>
      </View>
    </AreaChartContext.Provider>
  );
});
AreaChartRoot.displayName = 'AreaChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface AreaChartGridProps {
  rows?: number;
  color?: string;
  dashArray?: string;
  opacity?: number;
}

/** Horizontal rules, so a band can be read against a number. */
function AreaChartGrid({ rows = 4, color, dashArray = '4,6', opacity = 1 }: AreaChartGridProps) {
  const { plot } = useChart('AreaChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.1)');

  return (
    <G opacity={opacity}>
      {Array.from({ length: rows + 1 }, (_unused, index) => index / rows).map((fraction) => (
        <SvgLine
          key={fraction}
          x1={plot.left}
          x2={plot.left + plot.width}
          y1={plot.top + plot.height * fraction}
          y2={plot.top + plot.height * fraction}
          stroke={stroke}
          strokeDasharray={dashArray}
          strokeWidth={1}
        />
      ))}
    </G>
  );
}
AreaChartGrid.displayName = 'AreaChart.Grid';
AreaChartGrid.layer = 'svg' as Layer;

export interface AreaChartAreaProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. */
  color?: string;
  /** Which of the five chart tokens to take. */
  colorIndex?: SeriesColorIndex;
  /** Opacity of the fill at the top of the band. */
  fillOpacity?: number;
  /** Opacity at the bottom. `0` fades the band out; match `fillOpacity` for a flat fill. */
  gradientToOpacity?: number;
  /** Draw the line along the top edge of the band. */
  showLine?: boolean;
  /** Thickness of that line. */
  strokeWidth?: number;
}

/**
 * One filled band.
 *
 * The fill is a gradient by default rather than a flat wash, because a flat
 * fill of any weight competes with the line on top of it — fading it downward
 * keeps the top edge, which is the part carrying the numbers, the darkest
 * thing in the band.
 */
function AreaChartArea({
  dataKey,
  color,
  colorIndex = 1,
  fillOpacity,
  gradientToOpacity = 0,
  showLine = true,
  strokeWidth = 2,
}: AreaChartAreaProps) {
  const {
    data,
    plot,
    status,
    curve,
    stacked,
    series,
    registerSeries,
    unregisterSeries,
    domainMin,
    domainMax,
  } = useChart('AreaChart.Area');

  const stroke = useSeriesColor(color, colorIndex);
  const gradientId = `panelui-area-fill-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Stacked bands touch, so a translucent one shows the band beneath through
  // it and the two read as a third colour. Overlaid they must be translucent,
  // because the one in front would otherwise hide the ones behind entirely.
  const topOpacity = fillOpacity ?? (stacked ? 0.85 : 0.35);

  useEffect(() => {
    registerSeries(dataKey, stroke);
    return () => unregisterSeries(dataKey);
  }, [dataKey, stroke, registerSeries, unregisterSeries]);

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);

  /*
   * The running total of the series declared below this one, which is what
   * this band sits on. Registration order is declaration order, so the first
   * `Area` child is the bottom of the stack.
   */
  const baselines = useMemo(() => {
    if (!stacked) return undefined;
    const below = series.slice(0, series.findIndex(([key]) => key === dataKey));
    if (!below.length) return undefined;
    return data.map((row) => {
      let total = 0;
      for (const [key] of below) {
        const value = row[key];
        if (typeof value === 'number' && !Number.isNaN(value)) total += value;
      }
      return total;
    });
  }, [stacked, series, dataKey, data]);

  const loading = status === 'loading';

  const fillProps = useAnimatedProps(() => ({
    d: areaPath(values, plot, domainMin.value, domainMax.value, curve, loading, baselines),
  }));

  const lineProps = useAnimatedProps(() => ({
    d: linePath(values, plot, domainMin.value, domainMax.value, curve, loading, baselines),
  }));

  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={topOpacity} />
          <Stop offset="1" stopColor={stroke} stopOpacity={gradientToOpacity} />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={fillProps} fill={`url(#${gradientId})`} />
      {showLine ? (
        <AnimatedPath
          animatedProps={lineProps}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </G>
  );
}
AreaChartArea.displayName = 'AreaChart.Area';
AreaChartArea.layer = 'series' as Layer;

/** How much of the plot's height the resting band takes. */
const SKELETON_BAND = 0.18;

export interface AreaChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
}

/**
 * The loading state: a low band along the baseline with a highlight travelling
 * across it.
 *
 * Flat on purpose. A placeholder with a shape in it is a shape the reader has
 * no way to tell from the real one until it changes under them, so the band
 * says only where the series will be and how tall the plot is.
 *
 * The sweep is the part that carries the meaning. Without it a chart waiting
 * for data and a chart whose values are all zero draw the same picture, and
 * the reader is left to guess which one they are looking at.
 */
function AreaChartSkeleton({ duration = 1400, color }: AreaChartSkeletonProps) {
  const { plot, status } = useChart('AreaChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const base = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');
  const highlight = useSeriesColor(undefined, 1);

  const sweep = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const loading = status === 'loading';

  useEffect(() => {
    if (!loading || reducedMotion) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(sweep);
  }, [loading, reducedMotion, duration, sweep]);

  // The band travels by moving the gradient's own endpoints, so the whole
  // effect is two numbers changing on the UI thread.
  const animatedProps = useAnimatedProps(() => ({
    x1: `${(sweep.value * 1.4 - 0.4) * 100}%`,
    x2: `${(sweep.value * 1.4 - 0.4 + 0.4) * 100}%`,
  }));

  if (!loading) return null;

  const height = plot.height * SKELETON_BAND;
  const top = plot.top + plot.height - height;
  const gradientId = 'panelui-area-skeleton';

  return (
    <G>
      <Defs>
        <AnimatedLinearGradient id={gradientId} animatedProps={animatedProps} y1="0" y2="0">
          <Stop offset="0" stopColor={base} />
          <Stop offset="0.5" stopColor={highlight} stopOpacity={0.55} />
          <Stop offset="1" stopColor={base} />
        </AnimatedLinearGradient>
      </Defs>
      <Rect
        x={plot.left}
        y={top}
        width={plot.width}
        height={height}
        fill={`url(#${gradientId})`}
      />
    </G>
  );
}
AreaChartSkeleton.displayName = 'AreaChart.Skeleton';
AreaChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface AreaChartXAxisProps {
  ticks?: number;
  format?: (datum: AreaChartDatum, index: number) => string;
  className?: string;
}

/** The x labels. Real text, so they follow the theme's font and text scaling. */
function AreaChartXAxis({ ticks = 4, format, className }: AreaChartXAxisProps) {
  const { data, xDataKey, plot } = useChart('AreaChart.XAxis');

  const labels = useMemo(() => {
    if (!data.length) return [];
    const count = Math.min(ticks, data.length);
    const step = count > 1 ? (data.length - 1) / (count - 1) : 0;
    return Array.from({ length: count }, (_unused, index) => {
      const dataIndex = Math.round(index * step);
      const datum = data[dataIndex];
      if (!datum) return null;
      return {
        key: dataIndex,
        text: format ? format(datum, dataIndex) : String(datum[xDataKey] ?? ''),
      };
    }).filter((label): label is { key: number; text: string } => label !== null);
  }, [data, ticks, format, xDataKey]);

  /*
   * Each label sits on its own point rather than being spread along the axis.
   * The indices `ticks` picks are not evenly spaced — twelve months shown five
   * at a time gives 0,3,6,8,11 — so spreading them evenly put the ones in
   * between over the wrong part of the line.
   *
   * The box is backed off by half its own width rather than translated by
   * `-50%`, which is not reliable across React Native versions.
   */
  return (
    <View
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      className={cn(className)}
    >
      {labels.map((label) => (
        <Text
          key={label.key}
          size="xs"
          muted
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: 0,
            // Centred on its point, then held inside the chart. The first and
            // last points sit on the plot's own edges, so a box centred on
            // them hangs half its width off the side — the clamp slides those
            // two back in rather than letting the numbers leave the frame.
            left: Math.max(
              0,
              Math.min(
                xOf(label.key, data.length, plot) - POINT_LABEL_WIDTH / 2,
                plot.left + plot.width + PADDING.right - POINT_LABEL_WIDTH
              )
            ),
            width: POINT_LABEL_WIDTH,
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
AreaChartXAxis.displayName = 'AreaChart.XAxis';
AreaChartXAxis.layer = 'overlay' as Layer;

export interface AreaChartYAxisProps {
  ticks?: number;
  format?: (value: number) => string;
  className?: string;
}

/** Value labels down the side, aligned to the grid lines. */
function AreaChartYAxis({ ticks = 4, format, className }: AreaChartYAxisProps) {
  const { plot, extent } = useChart('AreaChart.YAxis');

  const labels = useMemo(() => {
    const [min, max] = extent;
    if (min === 0 && max === 0) return [];
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
        // Centred on the grid line each label names: the strip is lifted half
        // a label and grown by a whole one, so `justify-between` lands the
        // text's middle on the line rather than its top edge on the first line
        // and its bottom edge on the last.
        top: plot.top - AXIS_LABEL_HEIGHT / 2,
        height: plot.height + AXIS_LABEL_HEIGHT,
        // The gutter the root reserved, less a little breathing room, so the
        // numbers sit clear of the plot instead of against it.
        width: Math.max(plot.left - Y_AXIS_GUTTER, 0),
      }}
      className={cn('items-end justify-between', className)}
    >
      {labels.map((label) => (
        <Text
          key={label.key}
          size="xs"
          muted
          numberOfLines={1}
          maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}
AreaChartYAxis.displayName = 'AreaChart.YAxis';
AreaChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it
// lays the plot out — an axis drawn over the plot is unreadable, and
// makes what it is drawn over unreadable too.
AreaChartYAxis.axis = 'y' as const;

/** A dot riding the top edge of one band as the crosshair moves. */
function CrosshairDot({
  values,
  baselines,
  plot,
  domainMin,
  domainMax,
  activeIndex,
  total,
  color,
}: {
  values: (number | null)[];
  baselines: number[] | undefined;
  plot: Plot;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  activeIndex: SharedValue<number>;
  total: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const index = activeIndex.value;
    const value = index >= 0 ? values[index] : null;
    if (index < 0 || value === null || value === undefined) {
      return { opacity: 0, cx: 0, cy: 0 };
    }
    const stacked = value + (baselines?.[index] ?? 0);
    return {
      opacity: 1,
      cx: xOf(index, total, plot),
      cy: yOf(stacked, plot, domainMin.value, domainMax.value),
    };
  });

  return (
    <AnimatedCircle
      animatedProps={props}
      r={DOT / 2}
      fill={color}
      stroke="white"
      strokeWidth={2}
    />
  );
}

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface AreaChartTooltipProps {
  color?: string;
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: AreaChartDatum) => string;
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
 * The crosshair, the gesture that drives it, and the readout that rides it.
 *
 * The hit area is the whole plot. A crosshair you have to land on a band to
 * summon is a crosshair nobody finds.
 */
function AreaChartTooltip({
  color,
  formatValue,
  formatX,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: AreaChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    stacked,
    series,
    domainMin,
    domainMax,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('AreaChart.Tooltip');

  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');

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
      if (total < 2 || width <= 0) return;
      const ratio = (x - left) / width;
      const next = Math.round(Math.min(1, Math.max(0, ratio)) * (total - 1));
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

  const crosshairStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    return {
      opacity: index < 0 ? 0 : 0.45,
      transform: [{ translateX: index < 0 ? 0 : xOf(index, total, plot) }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = xOf(index, total, plot);
    const half = LABEL_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, x)
    );
    return { opacity: 1, transform: [{ translateX: clamped - half }] };
  });

  /*
   * The dots ride the *top edge* of each band, which for a stack is the
   * running total rather than the value — so the baselines are recomputed here
   * the same way the bands compute them, and for the same reason.
   */
  const stacks = useMemo(() => {
    return series.map(([key, seriesColor], index) => {
      const below = series.slice(0, index);
      const baselines =
        stacked && below.length
          ? data.map((row) => {
              let sum = 0;
              for (const [k] of below) {
                const value = row[k];
                if (typeof value === 'number' && !Number.isNaN(value)) sum += value;
              }
              return sum;
            })
          : undefined;
      return { key, color: seriesColor, values: columnValues(data, key), baselines };
    });
  }, [series, data, stacked]);

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: AreaChartDatum) => String(datum[xDataKey] ?? ''));

  if (status === 'loading') return null;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: plot.top,
              width: 1,
              height: plot.height,
              backgroundColor: stroke,
            },
            crosshairStyle,
          ]}
        />
        <Svg
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {stacks.map((stack) => (
            <CrosshairDot
              key={stack.key}
              values={stack.values}
              baselines={stack.baselines}
              plot={plot}
              domainMin={domainMin}
              domainMax={domainMax}
              activeIndex={activeIndex}
              total={total}
              color={stack.color}
            />
          ))}
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: 0, width: LABEL_WIDTH },
            labelStyle,
          ]}
        >
          {active ? (
            <View
              className={cn(
                'rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg',
                className
              )}
            >
              <Text size="xs" muted numberOfLines={1}>
                {fmtX(active)}
              </Text>
              {series.map(([key, seriesColor]) => {
                const value = active[key];
                if (typeof value !== 'number') return null;
                return (
                  <View key={key} className="flex-row items-center gap-1.5">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: seriesColor,
                      }}
                    />
                    <Text size="xs" weight="medium">
                      {fmtValue(value, key)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
AreaChartTooltip.displayName = 'AreaChart.Tooltip';
AreaChartTooltip.layer = 'overlay' as Layer;

export interface AreaChartLegendProps extends ViewProps {
  className?: string;
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

/**
 * A swatch and a name per series.
 *
 * Reversed for a stack, so the key reads in the order the bands appear on the
 * chart: the last one declared is the top band, and a legend listing it last
 * points at the bottom one.
 */
function AreaChartLegend({ className, labels, ...props }: AreaChartLegendProps) {
  const { series, stacked } = useChart('AreaChart.Legend');
  if (!series.length) return null;
  const ordered = stacked ? [...series].reverse() : series;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-1 flex-row gap-3', className)}
    >
      {ordered.map(([key, color]) => (
        <SeriesSwatch key={key} color={color} label={labels?.[key] ?? key} />
      ))}
    </View>
  );
}
AreaChartLegend.displayName = 'AreaChart.Legend';
AreaChartLegend.layer = 'overlay' as Layer;

/** One series' colour and name. Shared by the legend and the header. */
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

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface AreaChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the chart is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a total. */
  caption?: string;
  /** Prettier names for the series keys, as the legend takes. */
  labels?: Record<string, string>;
  /**
   * Draw a swatch and a name per series along the trailing edge, in the order
   * the bands appear on a stack. Prefer this to `AreaChart.Legend` on a chart
   * that has a header: the legend floats over the plot, where a tall band and a
   * key end up in the same corner.
   */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it currently reads, and
 * what the colours mean.
 *
 * It belongs to the chart rather than to the card around it because it is about
 * the *plot* — the number changes as a finger moves along the bands, and the
 * legend is the series list the chart itself is holding. The card's header is a
 * caption on the tray the chart sits in; this is the chart introducing itself.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down, so one header can show a total when nothing is pressed
 * and a point's value when something is.
 */
function AreaChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: AreaChartHeaderProps) {
  const { series, stacked } = useChart('AreaChart.Header');
  const ordered = stacked ? [...series].reverse() : series;
  const trailing =
    children ??
    (legend && ordered.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {ordered.map(([key, color]) => (
          <SeriesSwatch key={key} color={color} label={labels?.[key] ?? key} />
        ))}
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
      {/* Shrinkable, unlike a view's default in React Native. Held rigid, a
          three-series key takes the width it wants and the caption underneath
          the value wraps to two lines to make room for it. */}
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
AreaChartHeader.displayName = 'AreaChart.Header';
AreaChartHeader.layer = 'header' as Layer;

export const AreaChart = Object.assign(AreaChartRoot, {
  Header: AreaChartHeader,
  Grid: AreaChartGrid,
  Area: AreaChartArea,
  Skeleton: AreaChartSkeleton,
  XAxis: AreaChartXAxis,
  YAxis: AreaChartYAxis,
  Tooltip: AreaChartTooltip,
  Legend: AreaChartLegend,
});
