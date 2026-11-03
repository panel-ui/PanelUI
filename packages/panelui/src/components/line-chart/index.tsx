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
  Defs,
  G,
  Line as SvgLine,
  LinearGradient,
  Path,
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
  type Plot,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Room left around the plot for the axis labels and the marker rings. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/**
 * Which layer a part belongs to. Read off the component itself, so composition
 * stays a flat list of children instead of two nested slots the caller has to
 * remember the order of.
 */
type Layer = 'svg' | 'series' | 'overlay' | 'header';

export type LineChartStatus = 'loading' | 'ready';
export type LineChartCurve = 'monotone' | 'linear';
export type LineChartDatum = Record<string, string | number | null | undefined>;

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
  /**
   * The domain the tween is heading for. The axis labels read this rather than
   * the shared values: a number re-rendered on every frame of a 500ms tween is
   * 30 renders of a label that lands on the same string it started on.
   */
  extent: [number, number];
  /** Index under the finger, or -1 when nothing is being touched. */
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
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

export interface LineChartProps extends ViewProps, ChartAccessibilityProps<LineChartDatum> {
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
  /**
   * Drop the axis padding so the line reaches the edges — for a sparkline with
   * no grid, axis or crosshair, where the shape is the whole point.
   */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal on demand, for a "replay" control. */
export interface LineChartHandle {
  replay: () => void;
}

const LineChartRoot = forwardRef<LineChartHandle, LineChartProps>(function LineChartRoot(
  {
    className,
    data,
    xDataKey = 'date',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
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
   * Whether a `YAxis` was declared, read off the children before anything is
   * laid out. The gutter its labels sit in has to come off the plot's width
   * *before* the plot exists — an axis given no room is drawn over the series,
   * which loses both the numbers and the shape they were meant to explain.
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

  // A sparkline has no axis or grid to leave room for, so the line reaches the
  // edges; a stroke of a couple of pixels still needs a hair of inset not to be
  // clipped at the very top and bottom.
  const pad = compact
    ? { top: 2, right: 1, bottom: 2, left: 1 }
    : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
  const plot: Plot = {
    left: pad.left,
    top: pad.top,
    width: Math.max(size.width - pad.left - pad.right, 0),
    height: Math.max(size.height - pad.top - pad.bottom, 0),
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

  // `replay()` re-runs the reveal — for a control the caller wires up.
  useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

  const revealStyle = useAnimatedStyle(() => ({ width: plot.width * reveal.value }));

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
    <LineChartContext.Provider value={context}>
      <View {...props} style={props.style} className={cn('w-full', className)}>
        {header}
        <ChartAccessibilityData
          chart="Line chart"
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
               * The inner `<Svg>` is pulled back by `plot.left` so the series
               * keeps the same coordinate space as the grid underneath it —
               * otherwise every mark would shift by the y-axis gutter.
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
    </LineChartContext.Provider>
  );
});
LineChartRoot.displayName = 'LineChart';

/** Sorts the children into the SVG tree and the view layer over it. */
function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const series: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    const bucket =
      layer === 'header'
        ? header
        : layer === 'overlay'
          ? overlay
          : layer === 'series'
            ? series
            : svg;
    bucket.push(
      // Children of a `Children.forEach` need keys of their own once they are
      // put into a new array.
      <ChildSlot key={index}>{child}</ChildSlot>
    );
  });

  return { svg, series, overlay, header };
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
  const { data, plot, domainMin, domainMax, curve, status, registerSeries, unregisterSeries } =
    useChart('LineChart.Line');
  const stroke = useSeriesColor(color, colorIndex);

  useEffect(() => {
    registerSeries(dataKey, stroke);
    return () => unregisterSeries(dataKey);
  }, [dataKey, stroke, registerSeries, unregisterSeries]);

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const loading = status === 'loading';

  const animatedProps = useAnimatedProps(() => ({
    d: linePath(values, plot, domainMin.value, domainMax.value, curve, loading),
  }));

  return (
    <G>
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
LineChartLine.layer = 'series' as Layer;

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
  const { data, plot, domainMin, domainMax, curve, status } = useChart('LineChart.Area');
  const fill = useSeriesColor(color, colorIndex);
  const gradientId = `panelui-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const loading = status === 'loading';

  const animatedProps = useAnimatedProps(() => ({
    d: areaPath(values, plot, domainMin.value, domainMax.value, curve, loading),
  }));

  return (
    <G>
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
LineChartArea.layer = 'series' as Layer;

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
  // Unique per instance: a fixed id makes two of these on one screen share a
  // gradient, and the second one to mount wins.
  const gradientId = `panelui-chart-skeleton-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

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
LineChartXAxis.displayName = 'LineChart.XAxis';
LineChartXAxis.layer = 'overlay' as Layer;

export interface LineChartYAxisProps {
  /** How many intervals to divide the axis into. Yields `ticks + 1` labels. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/**
 * Value labels down the side, one per grid line.
 *
 * Give it the same `ticks` as the grid, or the numbers name lines that are not
 * there. Four is the default on both for that reason.
 *
 * The labels are the domain the data settles at, not the tweening one — a
 * number that counts up through every intermediate value while the axis
 * animates is noise, and the axis is the part of the chart that is supposed to
 * hold still enough to read.
 */
function LineChartYAxis({ ticks = 4, format, className }: LineChartYAxisProps) {
  const { plot, extent } = useChart('LineChart.YAxis');

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
LineChartYAxis.displayName = 'LineChart.YAxis';
LineChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out.
LineChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface LineChartTooltipProps {
  color?: string;
  /**
   * Float a small label at the crosshair showing the x-value and each series'
   * value at that point — the minimal readout a drag wants. On by default.
   */
  showLabel?: boolean;
  /** Format one series' value for the label. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the label's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: LineChartDatum) => string;
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
 * The crosshair, the gesture that drives it, and the label that rides it.
 *
 * They live in the view layer: a gesture handler cannot be attached to an SVG
 * node, and once the gesture is a view the crosshair may as well be one too —
 * a 1px view moved by `translateX` costs less than re-rendering an SVG line.
 * The label follows on the UI thread the same way; only its *text* crosses back
 * into JS, and only when the active index changes.
 *
 * The hit area is the whole plot. A crosshair you have to land on the line to
 * summon is a crosshair nobody finds.
 */
function LineChartTooltip({
  color,
  showLabel = true,
  formatValue,
  formatX,
  activateAfterLongPress = DEFAULT_HOLD,
}: LineChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    domainMin,
    domainMax,
    series,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('LineChart.Tooltip');
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

  // The label centres over the crosshair but is clamped inside the plot, so it
  // never runs off the edge at the first or last point.
  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = xOf(index, total, plot);
    const half = LABEL_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, x)
    );
    return {
      opacity: 1,
      transform: [{ translateX: clamped - half }],
    };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue =
    formatValue ?? ((value: number) => compactNumber(value));
  const fmtX =
    formatX ?? ((datum: LineChartDatum) => String(datum[xDataKey] ?? ''));

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
            values={columnValues(data, key)}
            plot={plot}
            domainMin={domainMin}
            domainMax={domainMax}
            activeIndex={activeIndex}
            color={seriesColor}
          />
        ))}

        {showLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: Math.max(plot.top - 4, 0),
                width: LABEL_WIDTH,
              },
              labelStyle,
            ]}
          >
            <View className="items-center rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg">
              {active ? (
                <>
                  <Text size="xs" muted numberOfLines={1}>
                    {fmtX(active)}
                  </Text>
                  {series.map(([key, seriesColor]) => {
                    const value = active[key];
                    if (typeof value !== 'number') return null;
                    return (
                      <View key={key} className="flex-row items-center gap-1.5">
                        {series.length > 1 ? (
                          <View
                            style={{ backgroundColor: seriesColor }}
                            className="h-1.5 w-1.5 rounded-full"
                          />
                        ) : null}
                        <Text size="sm" weight="semibold" numberOfLines={1}>
                          {fmtValue(value, key)}
                        </Text>
                      </View>
                    );
                  })}
                </>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
LineChartTooltip.displayName = 'LineChart.Tooltip';
LineChartTooltip.layer = 'overlay' as Layer;

const LABEL_WIDTH = 112;

/**
 * Box each x label is centred in. Wide enough for a short label to sit over
 * its point without the neighbours colliding; a longer one is ellipsised
 * rather than allowed to push the others out of place.
 */
const POINT_LABEL_WIDTH = 56;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Diameter of the dot that rides a series under the crosshair. */
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
  if (!series.length) return null;

  return (
    <View
      className={cn('absolute left-2.5 top-0 flex-row flex-wrap items-center gap-4', className)}
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
    >
      {series.map(([key, color]) => (
        <SeriesSwatch key={key} color={color} label={labels?.[key] ?? key} />
      ))}
    </View>
  );
}
LineChartLegend.displayName = 'LineChart.Legend';
LineChartLegend.layer = 'overlay' as Layer;

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

export interface LineChartHeaderProps extends ViewProps {
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
   * Draw a swatch and a name per series along the trailing edge. Prefer this to
   * `LineChart.Legend` on a chart that has a header: the legend floats over the
   * plot, where it competes with the lines for the same corner.
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
 * the *plot* — the number changes as a finger moves along the line, and the
 * legend is the series list the chart itself is holding. The card's header is a
 * caption on the tray the chart sits in; this is the chart introducing itself.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down, so one header can show a total when nothing is pressed
 * and a point's value when something is.
 */
function LineChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: LineChartHeaderProps) {
  const { series } = useChart('LineChart.Header');
  const trailing =
    children ??
    (legend && series.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {series.map(([key, color]) => (
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
LineChartHeader.displayName = 'LineChart.Header';
LineChartHeader.layer = 'header' as Layer;

export const LineChart = Object.assign(LineChartRoot, {
  Header: LineChartHeader,
  Grid: LineChartGrid,
  Area: LineChartArea,
  Line: LineChartLine,
  Skeleton: LineChartSkeleton,
  XAxis: LineChartXAxis,
  YAxis: LineChartYAxis,
  Tooltip: LineChartTooltip,
  Legend: LineChartLegend,
});
