/**
 * LineChart — a time series, drawn and animated on the UI thread.
 *
 * The chart is composed rather than configured: the grid, each series, the
 * axis and the crosshair are separate children, so a chart that wants no grid
 * simply does not have one. A single component with twenty booleans is how
 * charts end up unreadable at the call site.
 *
 * ```tsx
 * <LineChart data={visits} xDataKey="date">
 *   <LineChart.Grid />
 *   <LineChart.Area dataKey="visits" />
 *   <LineChart.Line dataKey="visits" />
 *   <LineChart.XAxis />
 *   <LineChart.Tooltip />
 * </LineChart>
 * ```
 *
 * Internally there are two layers, and the parts sort themselves into the
 * right one: the geometry is SVG, and anything with text or a gesture on it is
 * a React Native view laid over the top. That split is not a detail — SVG text
 * ignores the platform's text scaling and the theme's font, and a gesture
 * handler cannot be attached to an SVG node at all.
 *
 * Three things animate, each for a different reason:
 *
 * - **The reveal.** On mount the plot is uncovered left to right by an animated
 *   clip rectangle. Everything inside shares that clip, so the line, its fill
 *   and its markers arrive together rather than as three separate effects.
 * - **The y-domain.** When the data changes the *scale* is tweened rather than
 *   the path swapped, so a series that grows is redrawn against a moving axis
 *   instead of jumping to a new shape. The reveal does not replay — it happened
 *   once, and repeating it on every refresh turns a data update into an
 *   animation.
 * - **The crosshair.** A drag resolves the nearest index on the UI thread and
 *   moves the line and the dots from there. Only the index crosses back into
 *   JS, and only when it changes, so a drag costs a handful of re-renders
 *   rather than one per frame.
 *
 * Colours come from the `--color-chart-*` tokens, so a chart follows the active
 * theme and is put on brand by overriding those five in the app's own
 * global.css. Nothing here hardcodes a hex.
 */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
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
  ClipPath,
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
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Room left around the plot for the axis labels and the marker rings. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/**
 * Which layer a part belongs to. Read off the component itself, so composition
 * stays a flat list of children instead of two nested slots the caller has to
 * remember the order of.
 */
type Layer = 'svg' | 'overlay';

export type LineChartStatus = 'loading' | 'ready';
export type LineChartCurve = 'monotone' | 'linear';
export type LineChartDatum = Record<string, string | number | null | undefined>;

interface Plot {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface LineChartContextValue {
  data: LineChartDatum[];
  xDataKey: string;
  plot: Plot;
  status: LineChartStatus;
  curve: LineChartCurve;
  /** Series registered by the `Line` children, so the tooltip can read them. */
  series: [string, string][];
  registerSeries: (key: string, color: string) => void;
  unregisterSeries: (key: string) => void;
  /** Tweened y-domain. Read inside worklets to build the paths. */
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  /** Index under the finger, or -1 when nothing is being touched. */
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
  clipId: string;
}

const LineChartContext = createContext<LineChartContextValue | null>(null);

function useChart(component: string): LineChartContextValue {
  const context = useContext(LineChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <LineChart>`);
  }
  return context;
}

/**
 * The point under the crosshair, for something rendered *inside* the chart.
 *
 * A readout usually belongs in the card's header, which is outside this
 * provider — use `onActiveIndexChange` for that. A hook cannot reach up out of
 * the subtree it is called in, and pretending otherwise is how a component
 * ends up with a context that has to wrap half the screen.
 */
export function useLineChart() {
  const { data, activeIndexJS, xDataKey } = useChart('useLineChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

export interface LineChartProps extends ViewProps {
  className?: string;
  /** The rows. Each one is a point along the x-axis. */
  data: LineChartDatum[];
  /** Key holding the x label. Used by the axis and the crosshair readout. */
  xDataKey?: string;
  /**
   * `loading` draws a flat skeleton with a sweep running along it, and morphs
   * into the real series when it turns `ready`. One component throughout,
   * rather than a spinner swapped for a chart — swapping loses the transition.
   */
  status?: LineChartStatus;
  /** Width ÷ height. `2` is the wide card shape; `1.6` suits a narrow column. */
  aspectRatio?: number;
  /** Milliseconds for the reveal on mount. */
  animationDuration?: number;
  /** Milliseconds for the y-axis to settle after the data changes. */
  domainDuration?: number;
  /** Fix the y-axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /** `monotone` never overshoots between points; `linear` joins them straight. */
  curve?: LineChartCurve;
  /**
   * The point under the crosshair as it moves, and `-1`/`null` when the finger
   * lifts. This is how a readout in the card's header gets its value — that
   * header is outside the chart, so it cannot use `useLineChart`.
   *
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: LineChartDatum | null) => void;
  children?: ReactNode;
}

function LineChartRoot({
  className,
  data,
  xDataKey = 'date',
  status = 'ready',
  aspectRatio = 2,
  animationDuration = 1100,
  domainDuration = 500,
  yDomain,
  curve = 'monotone',
  onActiveIndexChange,
  children,
  ...props
}: LineChartProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [series, setSeries] = useState<[string, string][]>([]);
  const [activeIndexJS, setActiveIndexJS] = useState(-1);
  const clipId = useRef(`panelui-clip-${Math.random().toString(36).slice(2, 9)}`).current;

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

  const plot: Plot = {
    left: PADDING.left,
    top: PADDING.top,
    width: Math.max(size.width - PADDING.left - PADDING.right, 0),
    height: Math.max(size.height - PADDING.top - PADDING.bottom, 0),
  };

  // One extent across every registered series, so two series share one axis
  // and stay comparable — a per-series scale makes them look alike when they
  // are orders of magnitude apart.
  const seriesKeys = series.map(([key]) => key).join('|');
  const extent = useMemo<[number, number]>(() => {
    if (yDomain) return yDomain;
    const keys = seriesKeys ? seriesKeys.split('|') : [];
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      for (const key of keys) {
        const value = row[key];
        if (typeof value !== 'number' || Number.isNaN(value)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    if (min === Infinity) return [0, 1];
    // A flat series has no extent of its own; give it one so it lands on the
    // middle of the plot instead of dividing by zero.
    if (min === max) return [min - 1, max + 1];
    // A little headroom, so the peak is not welded to the top edge.
    const pad = (max - min) * 0.1;
    return [min - pad, max + pad];
  }, [data, yDomain, seriesKeys]);

  const loading = status === 'loading';

  useEffect(() => {
    if (loading) return;
    const [min, max] = extent;
    // The first domain lands without a tween: there is no previous scale to
    // move from, and animating up from zero reads as the numbers changing.
    const first = domainMin.value === 0 && domainMax.value === 0;
    if (first || reducedMotion) {
      domainMin.value = min;
      domainMax.value = max;
      return;
    }
    domainMin.value = withTiming(min, { duration: domainDuration });
    domainMax.value = withTiming(max, { duration: domainDuration });
  }, [extent, loading, reducedMotion, domainDuration, domainMin, domainMax]);

  // Plays once, when there is both a plot to reveal and data to reveal in it.
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current || loading || plot.width <= 0 || !data.length) return;
    revealed.current = true;
    if (reducedMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = withTiming(1, {
      duration: animationDuration,
      easing: Easing.bezier(0.85, 0, 0.15, 1),
    });
  }, [loading, plot.width, data.length, reducedMotion, animationDuration, reveal]);

  const clipProps = useAnimatedProps(() => ({ width: plot.width * reveal.value }));

  // One place the crosshair index lands, so the chart's own children and a
  // readout outside it never disagree about which point is active.
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

  const context = useMemo<LineChartContextValue>(
    () => ({
      data,
      xDataKey,
      plot,
      status,
      curve,
      series,
      registerSeries,
      unregisterSeries,
      domainMin,
      domainMax,
      activeIndex,
      activeIndexJS,
      setActiveIndexJS: handleActiveIndex,
      clipId,
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
      series,
      registerSeries,
      unregisterSeries,
      domainMin,
      domainMax,
      activeIndex,
      activeIndexJS,
      handleActiveIndex,
      clipId,
    ]
  );

  const { svg, overlay } = partition(children);

  return (
    <LineChartContext.Provider value={context}>
      <View
        {...props}
        onLayout={onLayout}
        style={[{ aspectRatio }, props.style]}
        className={cn('w-full', className)}
      >
        {plot.width > 0 ? (
          <>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                {/*
                 * One clip for everything in the plot. Sharing it is what makes
                 * the reveal read as the chart arriving, rather than as three
                 * separate things animating in at once.
                 */}
                <ClipPath id={clipId}>
                  <AnimatedRect
                    x={plot.left}
                    y={0}
                    height={size.height}
                    animatedProps={clipProps}
                  />
                </ClipPath>
              </Defs>
              {svg}
            </Svg>
            {overlay}
          </>
        ) : null}
      </View>
    </LineChartContext.Provider>
  );
}
LineChartRoot.displayName = 'LineChart';

/** Sorts the children into the SVG tree and the view layer over it. */
function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const overlay: ReactNode[] = [];

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    (layer === 'overlay' ? overlay : svg).push(
      // Children of a `Children.forEach` need keys of their own once they are
      // put into a new array.
      <ChildSlot key={index}>{child}</ChildSlot>
    );
  });

  return { svg, overlay };
}

/** Identity wrapper, purely so the partitioned arrays can carry keys. */
function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface LineChartGridProps {
  /** Horizontal rules across the plot. */
  rows?: number;
  color?: string;
  /** Dash pattern, e.g. `"4,6"`. Omit for a solid rule. */
  dashArray?: string;
  opacity?: number;
}

/** Horizontal reference lines. Drawn under everything, outside the reveal clip. */
function LineChartGrid({ rows = 4, color, dashArray = '4,6', opacity = 1 }: LineChartGridProps) {
  const { plot } = useChart('LineChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  return (
    <G opacity={opacity}>
      {Array.from({ length: rows + 1 }, (_, index) => {
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
LineChartGrid.displayName = 'LineChart.Grid';
LineChartGrid.layer = 'svg' as Layer;

export interface LineChartLineProps {
  /** Key holding this series' y values. */
  dataKey: string;
  /**
   * Stroke colour. Defaults to the `--color-chart-*` token at `colorIndex`, so
   * a series follows the theme without the call site naming a colour.
   */
  color?: string;
  /** Which `--color-chart-*` token to take when `color` is not given. */
  colorIndex?: 1 | 2 | 3 | 4 | 5;
  strokeWidth?: number;
  /** Dash pattern, e.g. `"6,4"` — for a projection or a secondary series. */
  dashArray?: string;
  /** A dot at every point. Best kept for short series. */
  showMarkers?: boolean;
}

/** One series. */
function LineChartLine({
  dataKey,
  color,
  colorIndex = 1,
  strokeWidth = 2.5,
  dashArray,
  showMarkers = false,
}: LineChartLineProps) {
  const { data, plot, domainMin, domainMax, curve, status, registerSeries, unregisterSeries, clipId } =
    useChart('LineChart.Line');
  const stroke = useSeriesColor(color, colorIndex);

  useEffect(() => {
    registerSeries(dataKey, stroke);
    return () => unregisterSeries(dataKey);
  }, [dataKey, stroke, registerSeries, unregisterSeries]);

  const values = useMemo(() => numbersOf(data, dataKey), [data, dataKey]);
  const loading = status === 'loading';

  const animatedProps = useAnimatedProps(() => ({
    d: linePath(values, plot, domainMin.value, domainMax.value, curve, loading),
  }));

  return (
    <G clipPath={`url(#${clipId})`}>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="none"
        stroke={loading ? 'transparent' : stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showMarkers && !loading
        ? values.map((value, index) =>
            value === null ? null : (
              <PointMarker
                key={index}
                index={index}
                total={values.length}
                value={value}
                plot={plot}
                domainMin={domainMin}
                domainMax={domainMax}
                color={stroke}
              />
            )
          )
        : null}
    </G>
  );
}
LineChartLine.displayName = 'LineChart.Line';
LineChartLine.layer = 'svg' as Layer;

/** A dot at one point. Follows the y-domain tween exactly as the line does. */
function PointMarker({
  index,
  total,
  value,
  plot,
  domainMin,
  domainMax,
  color,
}: {
  index: number;
  total: number;
  value: number;
  plot: Plot;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    cy: yOf(value, plot, domainMin.value, domainMax.value),
  }));

  return (
    <AnimatedCircle animatedProps={animatedProps} cx={xOf(index, total, plot)} r={3} fill={color} />
  );
}

export interface LineChartAreaProps {
  dataKey: string;
  color?: string;
  colorIndex?: 1 | 2 | 3 | 4 | 5;
  /** Opacity at the line. Fades to nothing at the baseline. */
  opacity?: number;
}

/**
 * The fill under a series. A separate child from the line, because a chart with
 * two series usually wants the fill on only one of them — two translucent
 * fills over each other make a third colour that means nothing.
 */
function LineChartArea({ dataKey, color, colorIndex = 1, opacity = 0.18 }: LineChartAreaProps) {
  const { data, plot, domainMin, domainMax, curve, status, clipId } = useChart('LineChart.Area');
  const fill = useSeriesColor(color, colorIndex);
  const gradientId = useRef(`panelui-area-${Math.random().toString(36).slice(2, 9)}`).current;

  const values = useMemo(() => numbersOf(data, dataKey), [data, dataKey]);
  const loading = status === 'loading';

  const animatedProps = useAnimatedProps(() => ({
    d: areaPath(values, plot, domainMin.value, domainMax.value, curve, loading),
  }));

  return (
    <G clipPath={`url(#${clipId})`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fill} stopOpacity={opacity} />
          <Stop offset="1" stopColor={fill} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={animatedProps} fill={`url(#${gradientId})`} stroke="none" />
    </G>
  );
}
LineChartArea.displayName = 'LineChart.Area';
LineChartArea.layer = 'svg' as Layer;

export interface LineChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
}

/**
 * The loading state: a flat rule where the series will be, with a highlight
 * travelling along it. Drawn inside the same SVG rather than as an overlay, so
 * arriving data is one tree changing rather than one view replacing another —
 * which is what lets the flat line become the series instead of cutting to it.
 */
function LineChartSkeleton({ duration = 1400, color }: LineChartSkeletonProps) {
  const { plot, status } = useChart('LineChart.Skeleton');
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

  const y = plot.top + plot.height / 2;
  const gradientId = 'panelui-chart-skeleton';

  return (
    <G>
      <Defs>
        <AnimatedLinearGradient id={gradientId} animatedProps={animatedProps} y1="0" y2="0">
          <Stop offset="0" stopColor={base} />
          <Stop offset="0.5" stopColor={highlight} stopOpacity={0.55} />
          <Stop offset="1" stopColor={base} />
        </AnimatedLinearGradient>
      </Defs>
      <SvgLine
        x1={plot.left}
        x2={plot.left + plot.width}
        y1={y}
        y2={y}
        stroke={`url(#${gradientId})`}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </G>
  );
}
LineChartSkeleton.displayName = 'LineChart.Skeleton';
LineChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface LineChartXAxisProps {
  /** How many labels to show. The rest are dropped, evenly. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: LineChartDatum, index: number) => string;
  className?: string;
}

/**
 * The x labels. Real text rather than SVG text, so they follow the theme's font
 * and the platform's text scaling — SVG text does neither.
 */
function LineChartXAxis({ ticks = 4, format, className }: LineChartXAxisProps) {
  const { data, xDataKey, plot } = useChart('LineChart.XAxis');

  const labels = useMemo(() => {
    if (!data.length) return [];
    const count = Math.min(ticks, data.length);
    const step = count > 1 ? (data.length - 1) / (count - 1) : 0;
    return Array.from({ length: count }, (_, index) => {
      const dataIndex = Math.round(index * step);
      const datum = data[dataIndex];
      if (!datum) return null;
      return {
        key: dataIndex,
        text: format ? format(datum, dataIndex) : String(datum[xDataKey] ?? ''),
      };
    }).filter((label): label is { key: number; text: string } => label !== null);
  }, [data, ticks, format, xDataKey]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: plot.left,
        right: PADDING.right,
        bottom: 0,
        height: PADDING.bottom,
      }}
      className={cn('flex-row items-center justify-between', className)}
    >
      {labels.map((label) => (
        <Text key={label.key} size="xs" muted>
          {label.text}
        </Text>
      ))}
    </View>
  );
}
LineChartXAxis.displayName = 'LineChart.XAxis';
LineChartXAxis.layer = 'overlay' as Layer;

export interface LineChartTooltipProps {
  color?: string;
}

/**
 * The crosshair, and the gesture that drives it.
 *
 * Both live in the view layer: a gesture handler cannot be attached to an SVG
 * node, and once the gesture is a view the crosshair may as well be one too —
 * a 1px view moved by `translateX` costs less than re-rendering an SVG line.
 *
 * The hit area is the whole plot. A crosshair you have to land on the line to
 * summon is a crosshair nobody finds.
 */
function LineChartTooltip({ color }: LineChartTooltipProps) {
  const { data, plot, domainMin, domainMax, series, activeIndex, setActiveIndexJS, status } =
    useChart('LineChart.Tooltip');
  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');

  const total = data.length;
  const left = plot.left;
  const width = plot.width;

  /*
   * Built in one closure, and everything it captures is a number or a shared
   * value. A worklet may only call another worklet, and the rule is enforced by
   * crashing the app rather than by warning — so the resolver is declared here,
   * next to its callers, instead of as a helper further down the file where it
   * would be easy to leave un-workletised.
   */
  const pan = useMemo(() => {
    const resolve = (x: number) => {
      'worklet';
      if (total < 2 || width <= 0) return;
      const ratio = (x - left) / width;
      const next = Math.round(Math.min(1, Math.max(0, ratio)) * (total - 1));
      if (next === activeIndex.value) return;
      activeIndex.value = next;
      // Only the index needs JS, and only when it changes — a drag across a
      // hundred points costs a hundred re-renders at most, not one per frame
      // for the length of the gesture.
      runOnJS(setActiveIndexJS)(next);
    };

    return Gesture.Pan()
      .minDistance(0)
      .onBegin((event) => {
        'worklet';
        resolve(event.x);
      })
      .onUpdate((event) => {
        'worklet';
        resolve(event.x);
      })
      .onFinalize(() => {
        'worklet';
        activeIndex.value = -1;
        runOnJS(setActiveIndexJS)(-1);
      });
  }, [total, left, width, activeIndex, setActiveIndexJS]);

  const crosshairStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    return {
      opacity: index < 0 ? 0 : 0.45,
      transform: [{ translateX: index < 0 ? 0 : xOf(index, total, plot) }],
    };
  });

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
        {series.map(([key, seriesColor]) => (
          <TooltipDot
            key={key}
            values={numbersOf(data, key)}
            plot={plot}
            domainMin={domainMin}
            domainMax={domainMax}
            activeIndex={activeIndex}
            color={seriesColor}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
LineChartTooltip.displayName = 'LineChart.Tooltip';
LineChartTooltip.layer = 'overlay' as Layer;

const DOT = 9;

/** The dot riding one series under the crosshair. */
function TooltipDot({
  values,
  plot,
  domainMin,
  domainMax,
  activeIndex,
  color,
}: {
  values: (number | null)[];
  plot: Plot;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  activeIndex: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const index = activeIndex.value;
    const value = index < 0 ? null : values[index];
    if (index < 0 || value === null || value === undefined) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        { translateX: xOf(index, values.length, plot) - DOT / 2 },
        { translateY: yOf(value, plot, domainMin.value, domainMax.value) - DOT / 2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export interface LineChartLegendProps extends ViewProps {
  className?: string;
  /** Label per series key. A key with no label falls back to the key itself. */
  labels?: Record<string, string>;
}

/**
 * A swatch and a name per registered series. Sits in the top-left of the plot
 * by default — move it with `className`.
 */
function LineChartLegend({ className, labels, ...props }: LineChartLegendProps) {
  const { series } = useChart('LineChart.Legend');

  return (
    <View
      pointerEvents="none"
      className={cn('absolute left-2.5 top-0 flex-row flex-wrap items-center gap-4', className)}
      {...props}
    >
      {series.map(([key, color]) => (
        <View key={key} className="flex-row items-center gap-1.5">
          <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />
          <Text size="xs" muted>
            {labels?.[key] ?? key}
          </Text>
        </View>
      ))}
    </View>
  );
}
LineChartLegend.displayName = 'LineChart.Legend';
LineChartLegend.layer = 'overlay' as Layer;

/* -------------------------------------------------------------------------- */
/* Scales and paths                                                           */
/* -------------------------------------------------------------------------- */

/** Only reached if the theme CSS was never imported. */
const FALLBACK_SERIES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

/** Series colour: an explicit one, else the `--color-chart-*` token. */
function useSeriesColor(explicit: string | undefined, index: 1 | 2 | 3 | 4 | 5): string {
  const token = useCSSVariable(`--color-chart-${index}`);
  return explicit ?? (typeof token === 'string' ? token : FALLBACK_SERIES[index - 1]!);
}

function numbersOf(data: LineChartDatum[], key: string): (number | null)[] {
  return data.map((row) => {
    const value = row[key];
    return typeof value === 'number' && !Number.isNaN(value) ? value : null;
  });
}

function xOf(index: number, total: number, plot: Plot): number {
  'worklet';
  if (total <= 1) return plot.left + plot.width / 2;
  return plot.left + (plot.width * index) / (total - 1);
}

function yOf(value: number, plot: Plot, min: number, max: number): number {
  'worklet';
  const span = max - min || 1;
  return plot.top + plot.height - ((value - min) / span) * plot.height;
}

/**
 * Monotone cubic tangents.
 *
 * Written out rather than taken from a charting dependency, because it is forty
 * lines and it has to run inside a worklet — the path is rebuilt on the UI
 * thread on every frame the y-domain is tweening.
 *
 * Monotone is the right default for a time series. A plain cubic spline
 * overshoots between points, so a series that never goes below zero draws a dip
 * under the axis between two low values — a shape that is not in the data. This
 * one cannot, because the tangent at each point is clamped against the slopes
 * either side of it, and a local peak or trough is given a flat one.
 */
function tangents(xs: number[], ys: number[]): number[] {
  'worklet';
  const n = xs.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    slopes.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]! || 1));
  }

  const result: number[] = new Array(n).fill(0);
  result[0] = slopes[0] ?? 0;
  result[n - 1] = slopes[n - 2] ?? 0;

  for (let i = 1; i < n - 1; i += 1) {
    const previous = slopes[i - 1]!;
    const next = slopes[i]!;
    result[i] = previous * next <= 0 ? 0 : (previous + next) / 2;
  }

  // Fritsch–Carlson: pull any tangent back inside the circle of radius 3, which
  // is the condition for the segment to stay monotone.
  for (let i = 0; i < n - 1; i += 1) {
    const slope = slopes[i]!;
    if (slope === 0) {
      result[i] = 0;
      result[i + 1] = 0;
      continue;
    }
    const a = result[i]! / slope;
    const b = result[i + 1]! / slope;
    const magnitude = Math.sqrt(a * a + b * b);
    if (magnitude > 3) {
      result[i] = (3 / magnitude) * a * slope;
      result[i + 1] = (3 / magnitude) * b * slope;
    }
  }

  return result;
}

/** Points, split at the gaps — a null breaks the series rather than crossing it. */
function runsOf(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number
): { x: number; y: number }[][] {
  'worklet';
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === null || value === undefined) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    run.push({ x: xOf(i, values.length, plot), y: yOf(value, plot, min, max) });
  }
  if (run.length) runs.push(run);
  return runs;
}

function segment(points: { x: number; y: number }[], curve: LineChartCurve): string {
  'worklet';
  if (!points.length) return '';
  if (points.length < 3 || curve === 'linear') {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const ms = tangents(xs, ys);

  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = (xs[i + 1]! - xs[i]!) / 3;
    d += ` C${xs[i]! + dx},${ys[i]! + ms[i]! * dx} ${xs[i + 1]! - dx},${ys[i + 1]! - ms[i + 1]! * dx} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

function linePath(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number,
  curve: LineChartCurve,
  loading: boolean
): string {
  'worklet';
  if (loading || plot.width <= 0) {
    // Flat down the middle: the shape the skeleton holds, and the shape the
    // real series grows out of once the data arrives.
    const y = plot.top + plot.height / 2;
    return `M${plot.left},${y} L${plot.left + plot.width},${y}`;
  }
  return runsOf(values, plot, min, max)
    .map((run) => segment(run, curve))
    .join(' ');
}

function areaPath(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number,
  curve: LineChartCurve,
  loading: boolean
): string {
  'worklet';
  if (loading || plot.width <= 0) return '';

  const baseline = plot.top + plot.height;
  return runsOf(values, plot, min, max)
    .map((run) => {
      const top = segment(run, curve);
      if (!top) return '';
      const first = run[0]!;
      const last = run[run.length - 1]!;
      return `${top} L${last.x},${baseline} L${first.x},${baseline} Z`;
    })
    .join(' ');
}

export const LineChart = Object.assign(LineChartRoot, {
  Grid: LineChartGrid,
  Area: LineChartArea,
  Line: LineChartLine,
  Skeleton: LineChartSkeleton,
  XAxis: LineChartXAxis,
  Tooltip: LineChartTooltip,
  Legend: LineChartLegend,
});
