/**
 * Plot — a chart you assemble, for the chart that is not in the box.
 *
 * The other charts in this library each answer one question and answer it
 * completely: a line chart knows it is drawing a series over time, and every
 * decision inside it follows from that. This one knows nothing. It measures a
 * box, resolves a scale, and hands both to whatever marks you put in it — so a
 * combination nothing here ships as its own component is still a chart you can
 * build rather than a chart you have to go without.
 *
 * ```tsx
 * <Plot data={months} xDataKey="month">
 *   <Plot.Grid />
 *   <Plot.Bars dataKey="orders" colorIndex={2} />
 *   <Plot.Line dataKey="revenue" />
 *   <Plot.YAxis />
 *   <Plot.XAxis />
 *   <Plot.Cursor />
 *   <Plot.Tooltip />
 * </Plot>
 * ```
 *
 * ## One scale, however many marks
 *
 * Every mark reads the same plot box and the same y-domain, and the domain is
 * derived from all of them together. That is the whole reason to compose rather
 * than to stack two charts on top of each other: two scales drawn over each
 * other look like a comparison and are not one.
 *
 * ## Where your own marks go
 *
 * `Plot.Layer` drops its children into the SVG tree, and `usePlot()` gives them
 * the resolved geometry — the box, the tweening domain, the reveal, the palette.
 * The scale functions are worklets exported alongside this component, so a mark
 * of your own is rebuilt on the UI thread on the same frames these are:
 *
 * ```tsx
 * function Threshold({ value }: { value: number }) {
 *   const { plot, domainMin, domainMax } = usePlot();
 *   const props = useAnimatedProps(() => {
 *     const y = yOf(value, plot, domainMin.value, domainMax.value);
 *     return { d: `M${plot.left},${y}H${plot.left + plot.width}` };
 *   });
 *   return <AnimatedPath animatedProps={props} stroke="red" />;
 * }
 *
 * <Plot data={rows}>
 *   <Plot.Layer><Threshold value={80} /></Plot.Layer>
 * </Plot>
 * ```
 *
 * Anything that is text or takes a touch goes in `Plot.Overlay` instead, which
 * is a React Native view over the drawing. That split is not a preference: SVG
 * text ignores the platform's text scaling and the theme's font, and a gesture
 * handler cannot be attached to an SVG node at all.
 *
 * ## What it will not do for you
 *
 * There is no `type` prop and no set of defaults that guess at one. A chart
 * assembled here is exactly the marks you wrote, in the order you wrote them —
 * which is also the order they are drawn in, so a line over bars is a line
 * written after them.
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
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line as SvgLine,
  Path,
  Rect,
} from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import { finiteChartNumber } from '../../primitives/finite-chart';
import {
  areaPath,
  bandOf,
  barPath,
  columnValues,
  compactNumber,
  linePath,
  niceDomain,
  useSeriesColor,
  xOf,
  yOf,
  type Plot as PlotBox,
} from '../../utils/chart';
import { cn } from '../../utils/cn';
import {
  registerPlotSeries,
  unregisterPlotSeries,
  visiblePlotSeries,
  type PlotSeriesRegistration,
} from './plot-series-registry';

/*
 * The scale functions, re-exported so a mark written outside this file can sit
 * on the same geometry the built-in ones do. Every one of them is a worklet, so
 * a custom mark is rebuilt on the UI thread on the frames these are — which is
 * the difference between an escape hatch and a second, slower chart drawn on
 * top of the first.
 */
export {
  areaPath,
  bandOf,
  barPath,
  compactNumber,
  linePath,
  segment,
  xAt,
  xOf,
  yOf,
} from '../../utils/chart';
export type { Plot as PlotBox, ChartPoint } from '../../utils/chart';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Room left around the plot for the axis labels and the markers' rings. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Line height of an `xs` label, for centring one on the rule it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Box each x label is centred in; a longer one is ellipsised rather than shoving. */
const POINT_LABEL_WIDTH = 56;

/** Width of the readout that rides the cursor. */
const LABEL_WIDTH = 120;

/**
 * Which layer a part belongs to. Read off the component itself, so composition
 * stays a flat list of children instead of three nested slots whose order the
 * caller has to remember.
 */
type Layer = 'svg' | 'series' | 'overlay' | 'header';

export type PlotStatus = 'loading' | 'ready';
export type PlotCurve = 'monotone' | 'linear';
export type PlotDatum = Record<string, string | number | null | undefined>;

/**
 * How the index of a row becomes an x.
 *
 * `point` puts the first and last rows on the plot's own edges, which is what a
 * series wants — the line should reach the frame. `band` gives every row an
 * equal slice and centres it in the middle of that, which is what anything with
 * width wants: a bar sitting on the edge of the plot is a bar half of which is
 * outside it.
 *
 * Resolved from the marks by default, so a chart with bars in it is banded
 * without being told.
 */
export type PlotScale = 'point' | 'band';

/** One end of the y-domain: a number to pin it at, or `auto` to derive it. */
export type PlotBound = number | 'auto';

/** Everything a mark needs to draw itself. Read it with `usePlot()`. */
export interface PlotGeometry {
  /** The rows, in order. */
  data: PlotDatum[];
  /** Key holding the x label. */
  xDataKey: string;
  /** The drawable box, after the padding and any axis gutter are taken off. */
  plot: PlotBox;
  /** How an index becomes an x. */
  xScale: PlotScale;
  /** `loading` draws nothing but the frame. */
  status: PlotStatus;
  /**
   * The y-domain, tweened. Read these inside worklets — they are what makes a
   * chart whose numbers changed redraw against a moving axis rather than jump.
   */
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  /**
   * The domain the tween is heading for. Labels read this rather than the shared
   * values: a number re-rendered on every frame of a tween is thirty renders of
   * a label that lands on the string it started on.
   */
  extent: [number, number];
  /** `0` to `1` as the plot is uncovered on mount. */
  reveal: SharedValue<number>;
  /** The five theme series colours, in order of prominence. */
  palette: string[];
  /** Every mark that registered itself, as `[dataKey, colour]`. */
  series: [string, string][];
  registerSeries: (key: string, color: string) => void;
  unregisterSeries: (key: string, color?: string) => void;
  /** Row under the cursor, or `-1`. On the UI thread. */
  activeIndex: SharedValue<number>;
  /** The same index on the JS thread, for anything that has to re-render. */
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
  /** The clip every mark shares, so they are revealed as one drawing. */
}

const PlotContext = createContext<PlotGeometry | null>(null);

function useChart(component: string): PlotGeometry {
  const context = useContext(PlotContext);
  if (!context) {
    throw new Error(`${component} must be used within a <Plot>`);
  }
  return context;
}

/**
 * The resolved geometry, for a mark of your own.
 *
 * Everything in it is either a plain number that changes on layout or a shared
 * value that changes every frame, so a mark built from it animates with the
 * rest of the chart rather than beside it.
 */
export function usePlot(): PlotGeometry {
  return useChart('usePlot');
}

/** The row under the cursor, for a readout drawn inside the plot. */
export function usePlotCursor(): { activeIndex: number; activePoint: PlotDatum | null } {
  const { data, activeIndexJS } = useChart('usePlotCursor');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
  };
}

export interface PlotProps extends ViewProps, ChartAccessibilityProps<PlotDatum> {
  className?: string;
  /** The rows. Each one is a position along the x-axis. */
  data: PlotDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` draws the frame and nothing in it, and reveals the marks when it
   * turns `ready`. One component throughout rather than a spinner swapped for a
   * chart — swapping loses the transition.
   */
  status?: PlotStatus;
  /** Width ÷ height. `2` is the wide card shape; `1.6` suits a narrow column. */
  aspectRatio?: number;
  /** Milliseconds for the plot to be uncovered on mount. */
  animationDuration?: number;
  /** Milliseconds for the y-axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * The y-domain, as `[low, high]`. Either end may be a number to pin it there
   * or `auto` to take it from the data.
   *
   * Pinning one end is the case this exists for: `[0, 'auto']` keeps the
   * baseline at zero, which a chart of lengths needs — a bar cropped at the
   * bottom is a length that lies — while still letting the top follow whatever
   * arrives.
   */
  yDomain?: [PlotBound, PlotBound];
  /**
   * Round the derived ends of the y-domain out to whole numbers.
   *
   * Left off, an axis ends a tenth of the span past the largest value, so it
   * gets labelled 34,650 — true, and not a number anybody was looking for. On,
   * the ends move out to a step of 1, 2 or 5 times a power of ten, and the
   * labels become values a reader can measure against.
   *
   * It only ever widens the axis, and a pinned end is left alone.
   */
  nice?: boolean;
  /**
   * How an index becomes an x. Derived from the marks when left out: a plot
   * with bars in it is banded, and anything else is on points.
   */
  xScale?: PlotScale;
  /** How series are joined between points, unless a mark overrides it. */
  curve?: PlotCurve;
  /**
   * The row under the cursor as it moves, and `-1`/`null` when the finger
   * lifts. This is how a readout *outside* the plot gets its value — that
   * header is not inside this provider, so it cannot use `usePlotCursor`.
   */
  onActiveIndexChange?: (index: number, datum: PlotDatum | null) => void;
  /**
   * Drop the padding so the marks reach the edges — for a plot with no axis,
   * grid or cursor, where the shape is the whole point.
   */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal, for a "replay" control. */
export interface PlotHandle {
  replay: () => void;
}

const PlotRoot = forwardRef<PlotHandle, PlotProps>(function PlotRoot(
  {
    className,
    data,
    xDataKey = 'label',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    nice = false,
    xScale: xScaleProp,
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
  const [registrations, setRegistrations] = useState<PlotSeriesRegistration[]>([]);
  const [activeIndexJS, setActiveIndexJS] = useState(-1);

  const reveal = useSharedValue(0);
  const domainMin = useSharedValue(0);
  const domainMax = useSharedValue(0);
  const activeIndex = useSharedValue(-1);
  const reducedMotion = useReducedMotion();

  const registerSeries = useMemo(
    () => (key: string, color: string) =>
      setRegistrations((current) => registerPlotSeries(current, key, color)),
    []
  );

  const unregisterSeries = useMemo(
    () => (key: string, color?: string) =>
      setRegistrations((current) => unregisterPlotSeries(current, key, color)),
    []
  );

  const series = useMemo(() => visiblePlotSeries(registrations), [registrations]);

  /*
   * What the children need decided before anything is laid out.
   *
   * Both have to be known *before* the plot box exists, and neither can be
   * asked of the parts themselves — a part renders into a box that has already
   * been decided. An axis given no gutter is drawn over the marks; a bar placed
   * on a point scale hangs half of itself off the frame, and a bar on an axis
   * that skips zero is drawn at a length the data does not support.
   */
  const { hasYAxis, hasBars } = useMemo(() => {
    let axis = false;
    let bars = false;
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const type = child.type as { axis?: string; mark?: string };
      if (type.axis === 'y') axis = true;
      if (type.mark === 'band') bars = true;
    });
    return { hasYAxis: axis, hasBars: bars };
  }, [children]);

  const xScale: PlotScale = xScaleProp ?? (hasBars ? 'band' : 'point');

  const pad = compact
    ? { top: 2, right: 1, bottom: 2, left: 1 }
    : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
  const plot: PlotBox = {
    left: pad.left,
    top: pad.top,
    width: Math.max(size.width - pad.left - pad.right, 0),
    height: Math.max(size.height - pad.top - pad.bottom, 0),
  };

  /*
   * One extent across every registered mark, so two series share one axis and
   * stay comparable. A scale per series makes two quantities orders of
   * magnitude apart look alike, which is the chart lying rather than the chart
   * being convenient.
   */
  const seriesKeys = useMemo(() => series.map(([key]) => key), [series]);
  const extent = useMemo<[number, number]>(() => {
    const lowPin = finiteChartNumber(yDomain?.[0]);
    const highPin = finiteChartNumber(yDomain?.[1]);
    if (lowPin !== undefined && highPin !== undefined) {
      return [lowPin, highPin];
    }

    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      for (const key of seriesKeys) {
        const value = finiteChartNumber(row[key]);
        if (value === undefined) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    if (min === Infinity) {
      // Nothing to measure. Fall back to whatever was pinned, and to a unit
      // domain when nothing was — dividing by a span of zero is how a mark
      // ends up drawn at infinity.
      const low = lowPin ?? 0;
      const high = highPin ?? low + 1;
      return [low, high];
    }

    /*
     * A bar's length is measured from zero, so an axis that does not contain
     * zero makes every bar on it a lie about its own size — six columns of
     * near-identical height standing for numbers that differ by half. So a plot
     * with bars in it gets zero whether the data reaches it or not, and that end
     * is then left exactly where it is: headroom under a baseline lifts the bars
     * off the thing they are measured from.
     */
    let lowRoom = 1;
    let highRoom = 1;
    if (hasBars) {
      if (min > 0) min = 0;
      if (max < 0) max = 0;
      if (min === 0) lowRoom = 0;
      if (max === 0) highRoom = 0;
    }

    // A flat series has no extent of its own; give it one so it lands on the
    // middle of the plot instead of dividing by zero.
    if (min === max) {
      min -= 1;
      max += 1;
    }

    /*
     * Headroom goes on the derived ends only. A pinned zero that got a tenth of
     * the span subtracted from it is not a pinned zero, and the baseline
     * drifting off the axis is exactly what pinning it was for.
     */
    const headroom = (max - min) * 0.1;
    /*
     * `nice` replaces the headroom rather than adding to it: rounding out to a
     * whole step is already room, and doing both would leave a tenth of the
     * span of empty axis above a top the reader was told is round.
     */
    const [niceLow, niceHigh] = nice ? niceDomain(min, max) : [min, max];
    const derivedLow = nice ? niceLow : min - headroom * lowRoom;
    const derivedHigh = nice ? niceHigh : max + headroom * highRoom;

    return [
      lowPin ?? derivedLow,
      highPin ?? derivedHigh,
    ];
  }, [data, yDomain, seriesKeys, hasBars, nice]);

  const loading = status === 'loading';
  // Nothing has said what the axis is yet — no mark has registered and no
  // domain was given. Assigning one now would tween the real domain up out of a
  // placeholder on the frame the first mark mounts.
  const hasDomain = seriesKeys.length > 0 || yDomain !== undefined;

  useEffect(() => {
    if (loading || !hasDomain) return;
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
  }, [extent, loading, hasDomain, reducedMotion, domainDuration, domainMin, domainMax]);

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
    // Going back to `loading` arms the reveal again, so a refetch is uncovered
    // rather than appearing whole on the frame the data lands.
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

  const c1 = useSeriesColor(undefined, 1);
  const c2 = useSeriesColor(undefined, 2);
  const c3 = useSeriesColor(undefined, 3);
  const c4 = useSeriesColor(undefined, 4);
  const c5 = useSeriesColor(undefined, 5);
  const palette = useMemo(() => [c1, c2, c3, c4, c5], [c1, c2, c3, c4, c5]);

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

  const context = useMemo<PlotGeometry>(
    () => ({
      data,
      xDataKey,
      plot,
      xScale,
      status,
      domainMin,
      domainMax,
      extent,
      reveal,
      palette,
      series,
      registerSeries,
      unregisterSeries,
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
      xScale,
      status,
      domainMin,
      domainMax,
      extent,
      reveal,
      palette,
      series,
      registerSeries,
      unregisterSeries,
      activeIndex,
      activeIndexJS,
      handleActiveIndex,
    ]
  );

  const revealStyle = useAnimatedStyle(() => ({ width: plot.width * reveal.value }));

  const { svg, series: seriesLayer, overlay, header } = partition(children);

  /*
   * Two views, because the header is not part of the plot. `aspectRatio` and
   * the layout measurement belong to the drawing area alone — measured on the
   * outer view they would take the header in too, and the plot would lose as
   * much height as the readout took while still claiming the shape asked for.
   */
  return (
    <PlotContext.Provider value={context}>
      <View {...props} style={props.style} className={cn('w-full', className)}>
        {header}
        <ChartAccessibilityData
          chart="Plot"
          data={data}
          disabled={accessible === false || status === 'loading'}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityLabelForDatum={accessibilityLabelForDatum}
          onAccessibilityDatumPress={onAccessibilityDatumPress}
          valueOf={(datum) => [
            [xDataKey, datum[xDataKey]],
            ...seriesKeys.map((key) => [key, datum[key]] as [string, unknown]),
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
               * One reveal for every mark, and it is a view that grows rather
               * than an SVG clip path. Sharing it is what makes the reveal read
               * as the chart arriving, rather than as four separate things
               * animating in at once — which is the thing a composed chart is
               * most at risk of looking like.
               *
               * It used to be an animated `<Rect>` inside `<Defs>`, and on
               * Android those animated props never reach the native clip — the
               * rect keeps whatever width was declared on it, so the marks drew
               * complete and the reveal simply did not play. A view with
               * `overflow: 'hidden'` is clipped by the platform itself, which
               * both platforms agree on.
               *
               * Animating `width` is normally a layout pass per frame. Here the
               * view is absolutely positioned and its only child is an `<Svg>`
               * with an explicit width and height, so the work is one node and
               * nothing around it moves.
               *
               * The inner `<Svg>` is pulled back by `plot.left` so the marks
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
    </PlotContext.Provider>
  );
});
PlotRoot.displayName = 'Plot';

/** Sorts the children into the SVG tree, the view layer over it, and the header. */
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

/**
 * A mark's colour: the one it was given, else the theme token at its index.
 *
 * Registration happens here rather than in each mark, because every mark that
 * registers does it for the same two reasons — the domain has to take it in,
 * and the legend has to name it.
 */
function useMark(dataKey: string, color: string | undefined, colorIndex: number) {
  const { palette, registerSeries, unregisterSeries } = useChart('Plot mark');
  const resolved = color ?? palette[(colorIndex - 1) % palette.length] ?? palette[0]!;

  useEffect(() => {
    registerSeries(dataKey, resolved);
    return () => unregisterSeries(dataKey, resolved);
  }, [dataKey, resolved, registerSeries, unregisterSeries]);

  return resolved;
}

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface PlotGridProps {
  /** Horizontal rules across the plot. */
  rows?: number;
  color?: string;
  /** Dash pattern, e.g. `"4,6"`. Omit for a solid rule. */
  dashArray?: string;
  opacity?: number;
}

/**
 * Horizontal reference lines.
 *
 * Outside the reveal clip on purpose: the grid is the frame the chart arrives
 * into, so it is already there when the marks start being uncovered.
 */
function PlotGrid({ rows = 4, color, dashArray = '4,6', opacity = 1 }: PlotGridProps) {
  const { plot } = useChart('Plot.Grid');
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
PlotGrid.displayName = 'Plot.Grid';
PlotGrid.layer = 'svg' as Layer;

export interface PlotSeriesProps {
  /** Column of `data` this mark draws. */
  dataKey: string;
  /** Overrides the theme token. */
  color?: string;
  /** Which `--color-chart-*` token to take, `1` to `5`. */
  colorIndex?: number;
}

export interface PlotLineProps extends PlotSeriesProps {
  strokeWidth?: number;
  /** `monotone` never overshoots between points; `linear` joins them straight. */
  curve?: PlotCurve;
  /** Dash pattern, e.g. `"6,4"` — for a forecast, or a series that is not real. */
  dashArray?: string;
}

/** A series as a stroked line. */
function PlotLine({
  dataKey,
  color,
  colorIndex = 1,
  strokeWidth = 2.5,
  curve = 'monotone',
  dashArray,
}: PlotLineProps) {
  const { data, plot, xScale, domainMin, domainMax, status } =
    useChart('Plot.Line');
  const stroke = useMark(dataKey, color, colorIndex);

  /*
   * Pulled out of the worklet as a plain array. A worklet may close over numbers
   * and arrays of them freely, but reading `data`'s rows — objects of mixed
   * types, keyed by strings the caller chose — inside one on every frame is work
   * that belongs on the JS side once.
   */
  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const banded = xScale === 'band';

  const animatedProps = useAnimatedProps(() => {
    const min = domainMin.value;
    const max = domainMax.value;
    if (max === min || plot.width <= 0) return { d: '' };

    /*
     * `banded` moves the points to the middle of their own slice, which is
     * where a line drawn over columns has to sit — spread edge to edge it
     * starts half a slice left of the bar it is describing.
     */
    return { d: linePath(values, plot, min, max, curve, false, undefined, banded) };
  });

  if (status === 'loading') return null;

  return (
    <G>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}
PlotLine.displayName = 'Plot.Line';
PlotLine.layer = 'series' as Layer;

export interface PlotAreaProps extends PlotSeriesProps {
  opacity?: number;
  curve?: PlotCurve;
}

/**
 * A series as a fill down to the baseline.
 *
 * Written before the line it belongs under, since the order the marks are
 * written is the order they are drawn.
 */
function PlotArea({
  dataKey,
  color,
  colorIndex = 1,
  opacity = 0.18,
  curve = 'monotone',
}: PlotAreaProps) {
  const { data, plot, xScale, domainMin, domainMax, status } =
    useChart('Plot.Area');
  const fill = useMark(dataKey, color, colorIndex);
  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const banded = xScale === 'band';

  const animatedProps = useAnimatedProps(() => {
    const min = domainMin.value;
    const max = domainMax.value;
    if (max === min || plot.width <= 0) return { d: '' };
    // Band-aware for the same reason the line is: an area on a plot that also
    // carries columns has to close over the same slices they occupy.
    return { d: areaPath(values, plot, min, max, curve, false, undefined, banded) };
  });

  if (status === 'loading') return null;

  return (
    <G>
      <AnimatedPath animatedProps={animatedProps} fill={fill} fillOpacity={opacity} />
    </G>
  );
}
PlotArea.displayName = 'Plot.Area';
PlotArea.layer = 'series' as Layer;

export interface PlotBarsProps extends PlotSeriesProps {
  /** Fraction of each slice left empty, `0` to `1`. */
  gap?: number;
  /** Rounds the end the bar grows towards, in points. */
  radius?: number;
  opacity?: number;
  /**
   * The value the columns grow from. Zero by default, and zero is nearly always
   * right — a bar is a length, and a length has to start where the quantity
   * does.
   *
   * Set it for the case where the reader is being shown movement rather than
   * size: temperatures against a seasonal average, a score against a pass mark.
   * Columns then run up and down from that line instead of all standing on the
   * floor. It is clamped into the axis, so a baseline the domain does not cover
   * falls back to the nearer edge.
   */
  baseline?: number;
}

/**
 * A series as columns.
 *
 * One path for all of them rather than one node per bar: a plot of two hundred
 * periods is the same single animated prop a frame as a plot of twenty.
 *
 * A bar has width, so its presence puts the whole plot on a band scale unless
 * the root was told otherwise — see `xScale`.
 */
function PlotBars({
  dataKey,
  color,
  colorIndex = 1,
  gap = 0.35,
  radius = 4,
  opacity = 1,
  baseline = 0,
}: PlotBarsProps) {
  const { data, plot, domainMin, domainMax, status } = useChart('Plot.Bars');
  const fill = useMark(dataKey, color, colorIndex);
  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);

  const total = values.length;
  const slice = total > 0 ? plot.width / total : 0;
  const width = Math.max(1, slice * (1 - Math.min(Math.max(gap, 0), 0.95)));

  const animatedProps = useAnimatedProps(() => {
    const min = domainMin.value;
    const max = domainMax.value;
    if (max === min || plot.width <= 0 || total === 0) return { d: '' };

    /*
     * Bars grow from the baseline — zero unless the caller moved it — clamped
     * into the domain where the axis does not reach it. A bar drawn from the
     * bottom of a plot whose axis starts at 40 is a length that is not in the
     * data.
     */
    const base = yOf(Math.min(Math.max(baseline, min), max), plot, min, max);
    let path = '';

    for (let index = 0; index < total; index += 1) {
      const value = values[index];
      if (value === null || value === undefined) continue;
      const y = yOf(value, plot, min, max);
      const top = Math.min(y, base);
      const height = Math.abs(base - y);
      if (height <= 0) continue;
      path += barPath(
        bandOf(index, total, plot) - width / 2,
        top,
        width,
        height,
        radius,
        y <= base ? 'up' : 'down'
      );
    }
    return { d: path };
  });

  if (status === 'loading') return null;

  return (
    <G>
      <AnimatedPath animatedProps={animatedProps} fill={fill} fillOpacity={opacity} />
    </G>
  );
}
PlotBars.displayName = 'Plot.Bars';
PlotBars.layer = 'series' as Layer;
// Read by the root before it resolves the scale: a mark with width cannot sit
// on a point scale without half of the first and last one leaving the plot.
PlotBars.mark = 'band' as const;

export interface PlotDotsProps extends PlotSeriesProps {
  /** Radius, in points. */
  size?: number;
  /** Ring around each dot, so it reads on top of the line rather than in it. */
  ringWidth?: number;
}

/** A dot per row — for a series short enough that its points are worth marking. */
function PlotDots({
  dataKey,
  color,
  colorIndex = 1,
  size = 3.5,
  ringWidth = 2,
}: PlotDotsProps) {
  const { data, plot, xScale, domainMin, domainMax, status } =
    useChart('Plot.Dots');
  const fill = useMark(dataKey, color, colorIndex);
  const ringToken = useCSSVariable('--color-background');
  const ring = typeof ringToken === 'string' ? ringToken : '#000000';
  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const banded = xScale === 'band';

  return (
    <G>
      {status === 'loading'
        ? null
        : values.map((value, index) =>
            value === null || value === undefined ? null : (
              <Dot
                key={index}
                value={value}
                x={
                  banded
                    ? bandOf(index, values.length, plot)
                    : xOf(index, values.length, plot)
                }
                plot={plot}
                domainMin={domainMin}
                domainMax={domainMax}
                fill={fill}
                ring={ring}
                size={size}
                ringWidth={ringWidth}
              />
            )
          )}
    </G>
  );
}
PlotDots.displayName = 'Plot.Dots';
PlotDots.layer = 'series' as Layer;

/** One dot, whose y follows the domain tween. */
function Dot({
  value,
  x,
  plot,
  domainMin,
  domainMax,
  fill,
  ring,
  size,
  ringWidth,
}: {
  value: number;
  x: number;
  plot: PlotBox;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  fill: string;
  ring: string;
  size: number;
  ringWidth: number;
}) {
  const animatedProps = useAnimatedProps(() => ({
    cy: yOf(value, plot, domainMin.value, domainMax.value),
  }));

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={x}
      r={size}
      fill={fill}
      stroke={ring}
      strokeWidth={ringWidth}
    />
  );
}

export interface PlotLayerProps {
  children?: ReactNode;
}

/**
 * Marks of your own, in the SVG tree.
 *
 * Whatever is inside is drawn where it is written — before the marks written
 * after it, after the ones before it — and reaches the geometry through
 * `usePlot()`. It is not given the geometry as an argument, because a mark that
 * animates has to hold hooks of its own and a render prop is not a component.
 */
function PlotLayer({ children }: PlotLayerProps) {
  useChart('Plot.Layer');
  return <G>{children}</G>;
}
PlotLayer.displayName = 'Plot.Layer';
PlotLayer.layer = 'series' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface PlotOverlayProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Anything of your own that is text or takes a touch, laid over the drawing.
 *
 * SVG text ignores the platform's text scaling and the theme's font, and a
 * gesture handler cannot be attached to an SVG node at all — so those two go
 * here rather than in `Plot.Layer`.
 */
function PlotOverlay({ className, children }: PlotOverlayProps) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} className={className}>
      {children}
    </View>
  );
}
PlotOverlay.displayName = 'Plot.Overlay';
PlotOverlay.layer = 'overlay' as Layer;

export interface PlotRuleProps {
  /**
   * Where to draw it, in the data's own units. Omit it and pass `x` instead for
   * a rule down the plot rather than across it.
   */
  y?: number;
  /**
   * A row to draw a vertical rule at, by index — the release the numbers are
   * read against, the day a change landed.
   *
   * The x axis here carries positions rather than quantities, so this is which
   * row rather than what value. Exactly one of `y` and `x` is drawn; `y` wins
   * if both are given.
   */
  x?: number;
  /** A name for what the line means. Nothing is drawn without one. */
  label?: string;
  /** Overrides the line *and* its caption, so the two cannot drift apart. */
  color?: string;
  /** Thickness in points. */
  strokeWidth?: number;
  /**
   * Break the line into dashes, for a rule that should read as an annotation
   * rather than as a series the chart is drawing.
   */
  dashed?: boolean;
  /** Fades the line and its caption together. */
  opacity?: number;
  /** Which end of the rule the caption sits at. */
  labelPlacement?: 'start' | 'end';
  labelClassName?: string;
  className?: string;
}

/**
 * A reference line across the plot — a target, a limit, an average.
 *
 * A view rather than an SVG line, so its label is real text and follows the
 * theme. Its thickness is a border and its position is a transform, so it costs
 * no more than the SVG line would while gaining a legible caption.
 *
 * It is drawn at full strength in the foreground colour, and it is meant to be.
 * A reference line is the number the series is being judged against — a target
 * nobody can read is a target the chart is not actually stating — so what keeps
 * it from being mistaken for a series is that it is neutral and optionally
 * dashed, not that it is faint.
 */
function PlotRule({
  y,
  x,
  label,
  color,
  strokeWidth = 1,
  dashed = false,
  opacity = 1,
  labelPlacement = 'end',
  labelClassName,
  className,
}: PlotRuleProps) {
  const { plot, domainMin, domainMax, status, data } = useChart('Plot.Rule');
  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');
  const vertical = y === undefined && x !== undefined;

  const horizontalStyle = useAnimatedStyle(() => {
    if (vertical || y === undefined) return { opacity: 0 };
    const min = domainMin.value;
    const max = domainMax.value;
    if (max === min) return { opacity: 0 };
    const at = yOf(y, plot, min, max);
    // Off the top or bottom of the plot is out of the chart's range, and a rule
    // pinned to the edge would claim a value the axis does not cover.
    const inside = at >= plot.top - 0.5 && at <= plot.top + plot.height + 0.5;
    return { opacity: inside ? opacity : 0, transform: [{ translateY: at }] };
  });

  if (status === 'loading') return null;

  const line = dashed
    ? {
        borderColor: stroke,
        borderStyle: 'dashed' as const,
        borderTopWidth: strokeWidth,
      }
    : { backgroundColor: stroke, height: strokeWidth };

  if (vertical) {
    /*
     * The x axis carries positions, not quantities, so a vertical rule is
     * placed from the row's own geometry rather than from the tweening domain —
     * there is nothing on this axis for it to tween against.
     */
    const total = data.length;
    const at =
      total > 0
        ? xOf(Math.max(0, Math.min(total - 1, x!)), total, plot)
        : plot.left + plot.width / 2;

    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: at,
          top: plot.top,
          height: plot.height,
          opacity,
        }}
        className={className}
      >
        <View
          style={
            dashed
              ? {
                  borderColor: stroke,
                  borderStyle: 'dashed',
                  borderLeftWidth: strokeWidth,
                  flex: 1,
                }
              : { backgroundColor: stroke, width: strokeWidth, flex: 1 }
          }
        />
        {label ? (
          <Text
            size="xs"
            weight="medium"
            numberOfLines={1}
            style={color ? { color } : undefined}
            className={cn('absolute left-1 top-0', labelClassName)}
          >
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: plot.left, width: plot.width, top: 0 },
        horizontalStyle,
      ]}
      className={className}
    >
      <View style={line} />
      {label ? (
        <Text
          size="xs"
          weight="medium"
          numberOfLines={1}
          style={color ? { color } : undefined}
          className={cn(
            'pt-0.5',
            labelPlacement === 'start' ? 'self-start' : 'self-end',
            labelClassName
          )}
        >
          {label}
        </Text>
      ) : null}
    </Animated.View>
  );
}
PlotRule.displayName = 'Plot.Rule';
PlotRule.layer = 'overlay' as Layer;

export interface PlotXAxisProps {
  /** How many labels to show. The rest are dropped, evenly. */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: PlotDatum, index: number) => string;
  className?: string;
}

/**
 * The x labels. Real text rather than SVG text, so they follow the theme's font
 * and the platform's text scaling — SVG text does neither.
 */
function PlotXAxis({ ticks = 4, format, className }: PlotXAxisProps) {
  const { data, xDataKey, plot, xScale } = useChart('Plot.XAxis');

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
   * at a time gives 0, 3, 6, 8, 11 — so spreading them evenly put the ones in
   * between over the wrong part of the plot.
   */
  return (
    <View
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      className={cn(className)}
    >
      {labels.map((label) => {
        const x =
          xScale === 'band'
            ? bandOf(label.key, data.length, plot)
            : xOf(label.key, data.length, plot);
        return (
          <Text
            key={label.key}
            size="xs"
            muted
            numberOfLines={1}
            style={{
              position: 'absolute',
              bottom: 0,
              // Centred on its point, then held inside the chart. On a point
              // scale the first and last sit on the plot's own edges, so a box
              // centred on them hangs half its width off the side.
              left: Math.max(
                0,
                Math.min(
                  x - POINT_LABEL_WIDTH / 2,
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
        );
      })}
    </View>
  );
}
PlotXAxis.displayName = 'Plot.XAxis';
PlotXAxis.layer = 'overlay' as Layer;

export interface PlotYAxisProps {
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
 * number counting through every intermediate value while the axis animates is
 * noise, and the axis is the part of a chart that has to hold still enough to
 * be read.
 */
function PlotYAxis({ ticks = 4, format, className }: PlotYAxisProps) {
  const { plot, extent } = useChart('Plot.YAxis');

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
        // Centred on the grid line each label names: the strip is lifted half a
        // label and grown by a whole one, so `justify-between` lands the text's
        // middle on the line rather than its top edge on the first.
        top: plot.top - AXIS_LABEL_HEIGHT / 2,
        height: plot.height + AXIS_LABEL_HEIGHT,
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
PlotYAxis.displayName = 'Plot.YAxis';
PlotYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out.
PlotYAxis.axis = 'y' as const;

/**
 * How long the cursor waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface PlotCursorProps {
  color?: string;
  /** Hide the vertical line and keep only the touch handling. */
  showLine?: boolean;
  /**
   * How long a press has to be held before the cursor takes the touch, in
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
 * The touch handling, and the line that follows it.
 *
 * Split from the readout next door because they are separately useful: a plot
 * whose value is shown in its own header wants this and no label, and a plot
 * that highlights a bar wants this and nothing else at all. Both read the same
 * index.
 *
 * The hit area is the whole plot. A cursor you have to land on the line to
 * summon is a cursor nobody finds.
 */
function PlotCursor({
  color,
  showLine = true,
  activateAfterLongPress = DEFAULT_HOLD,
}: PlotCursorProps) {
  const { data, plot, xScale, activeIndex, setActiveIndexJS, status } =
    useChart('Plot.Cursor');
  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');

  const total = data.length;
  const left = plot.left;
  const width = plot.width;
  const banded = xScale === 'band';

  /*
   * Built in one closure, and everything it captures is a number or a shared
   * value. A worklet may only call another worklet, and the rule is enforced by
   * crashing rather than by warning — so the resolver is declared next to its
   * callers instead of as a helper further down the file where it would be easy
   * to leave un-workletised.
   */
  const pan = useMemo(() => {
    const resolve = (x: number) => {
      'worklet';
      if (total < 1 || width <= 0) return;
      const ratio = (x - left) / width;
      const clamped = Math.min(1, Math.max(0, ratio));
      // A band scale divides the plot into `total` slices and the finger is in
      // one of them; a point scale has `total - 1` gaps between marks and the
      // finger rounds to the nearest.
      const next = banded
        ? Math.min(total - 1, Math.floor(clamped * total))
        : Math.round(clamped * Math.max(total - 1, 0));
      if (next === activeIndex.value) return;
      activeIndex.value = next;
      // Only the index needs JS, and only when it changes — a drag across a
      // hundred rows costs a hundred re-renders at most, not one per frame for
      // the length of the gesture.
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
  }, [
    total,
    left,
    width,
    banded,
    activeIndex,
    setActiveIndexJS,
    activateAfterLongPress,
  ]);

  const lineStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = banded ? bandOf(index, total, plot) : xOf(index, total, plot);
    return { opacity: 0.45, transform: [{ translateX: x }] };
  });

  if (status === 'loading') return null;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        {showLine ? (
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
              lineStyle,
            ]}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
}
PlotCursor.displayName = 'Plot.Cursor';
PlotCursor.layer = 'overlay' as Layer;

export interface PlotTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the heading from the row. Defaults to the value at `xDataKey`. */
  formatX?: (datum: PlotDatum) => string;
  /** Draw the readout yourself, given the row under the cursor. */
  children?: (datum: PlotDatum, index: number) => ReactNode;
  className?: string;
}

/**
 * The readout that rides the cursor.
 *
 * Needs a `Plot.Cursor` beside it — the cursor owns the gesture and this only
 * reads the index it resolves. On its own it never appears, which is the right
 * failure: a label with no way to move is worse than no label.
 */
function PlotTooltip({ formatValue, formatX, children, className }: PlotTooltipProps) {
  const { data, xDataKey, plot, xScale, series, activeIndex, activeIndexJS, status } =
    useChart('Plot.Tooltip');

  const total = data.length;
  const banded = xScale === 'band';

  // Centred over the cursor but clamped inside the plot, so it never runs off
  // the edge at the first or last row.
  const style = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = banded ? bandOf(index, total, plot) : xOf(index, total, plot);
    const half = LABEL_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, x)
    );
    return { opacity: 1, transform: [{ translateX: clamped - half }] };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: PlotDatum) => String(datum[xDataKey] ?? ''));

  if (status === 'loading') return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: Math.max(plot.top - 4, 0),
          width: LABEL_WIDTH,
        },
        style,
      ]}
    >
      <View
        className={cn(
          'items-center rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg',
          className
        )}
      >
        {active ? (
          children ? (
            children(active, activeIndexJS)
          ) : (
            <>
              <Text size="xs" muted numberOfLines={1}>
                {fmtX(active)}
              </Text>
              {series.map(([key, color]) => {
                const value = active[key];
                if (typeof value !== 'number') return null;
                return (
                  <View key={key} className="flex-row items-center gap-1.5">
                    {series.length > 1 ? (
                      <View
                        style={{ backgroundColor: color }}
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
          )
        ) : null}
      </View>
    </Animated.View>
  );
}
PlotTooltip.displayName = 'Plot.Tooltip';
PlotTooltip.layer = 'overlay' as Layer;

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface PlotHeaderProps extends ViewProps {
  className?: string;
  /** A word for what the plot is of. */
  title?: string;
  /** The figure, large. Usually the total, or the row under the cursor. */
  value?: string;
  /** A line under the value. */
  caption?: string;
  /** Replaces the whole header, keeping only its place above the drawing. */
  children?: ReactNode;
}

/** The row above the drawing: what it is, and the one number worth reading. */
function PlotHeader({
  className,
  title,
  value,
  caption,
  children,
  ...props
}: PlotHeaderProps) {
  return (
    <View className={cn('gap-0.5', className)} {...props}>
      {children ?? (
        <>
          {title ? (
            <Text size="sm" muted numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {value ? (
            <Text size="2xl" weight="semibold" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {caption ? (
            <Text size="xs" muted numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
PlotHeader.displayName = 'Plot.Header';
PlotHeader.layer = 'header' as Layer;

export interface PlotLegendProps extends ViewProps {
  className?: string;
  /** Names for the columns, keyed by `dataKey`. Falls back to the key itself. */
  labels?: Record<string, string>;
}

/**
 * A swatch and a name per mark, taken from the marks that registered.
 *
 * In the header rather than over the drawing, because a key laid inside the
 * plot either covers a mark or is squeezed to one word a line.
 */
function PlotLegend({ className, labels, ...props }: PlotLegendProps) {
  const { series } = useChart('Plot.Legend');
  if (!series.length) return null;

  return (
    <View
      className={cn('flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-1', className)}
      {...props}
    >
      {series.map(([key, color]) => (
        <View key={key} className="flex-row items-center gap-1.5">
          <View
            style={{ backgroundColor: color }}
            className="h-2 w-2 rounded-full"
          />
          <Text size="xs" muted numberOfLines={1}>
            {labels?.[key] ?? key}
          </Text>
        </View>
      ))}
    </View>
  );
}
PlotLegend.displayName = 'Plot.Legend';
PlotLegend.layer = 'header' as Layer;

export const Plot = Object.assign(PlotRoot, {
  Header: PlotHeader,
  Legend: PlotLegend,
  Grid: PlotGrid,
  Area: PlotArea,
  Bars: PlotBars,
  Line: PlotLine,
  Dots: PlotDots,
  Rule: PlotRule,
  Layer: PlotLayer,
  Overlay: PlotOverlay,
  XAxis: PlotXAxis,
  YAxis: PlotYAxis,
  Cursor: PlotCursor,
  Tooltip: PlotTooltip,
});
