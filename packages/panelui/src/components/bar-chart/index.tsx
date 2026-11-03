/**
 * BarChart — categories compared by length, drawn and animated on the UI thread.
 *
 * Composed the same way `LineChart` is: the grid, each series, the axes and the
 * readout are separate children, so a chart that wants no grid simply does not
 * have one.
 *
 * ```tsx
 * <BarChart data={revenue} xDataKey="month">
 *   <BarChart.Grid />
 *   <BarChart.Bar dataKey="revenue" />
 *   <BarChart.XAxis />
 *   <BarChart.Tooltip />
 * </BarChart>
 * ```
 *
 * ## What is different from a line
 *
 * **The baseline is zero, and not negotiable.** A line's job is to show change,
 * so it may crop its axis to the range the data actually occupies. A bar's job
 * is to compare *lengths*, and a bar cropped at the bottom is a length that
 * lies — twice as tall no longer means twice as much. So the domain always
 * reaches zero unless `yDomain` says otherwise, and saying otherwise is opting
 * into a chart that misreads.
 *
 * **Bands, not points.** A line has a point at each x; a bar owns a slice of
 * width around it. `barGap` is the fraction of that slice left empty, so bars
 * stay proportional at any width instead of needing a pixel gap that is wrong
 * on half of them.
 *
 * **Every series is one path.** A `Bar` draws all its rectangles as subpaths of
 * a single animated path, split in two so the band under the finger keeps full
 * ink while the rest fade. Fifty bars is two animated props a frame rather
 * than fifty, and the corners are drawn as a path because a bar is rounded on
 * the end it grows towards and square on the end it grows from — which `rx`
 * cannot express, since it rounds all four corners or none.
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
import Svg, { Defs, G, Line as SvgLine, LinearGradient, Path, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import {
  bandOf,
  barPath,
  columnValues,
  compactNumber,
  useSeriesColor,
  type Plot,
  type SeriesColorIndex,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Room left around the plot for the axis labels. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/**
 * Sideways, the category names run down the left instead of along the bottom,
 * so the room has to come off that side rather than off the bottom. Reserved
 * rather than overlaid: a name drawn on top of the bars is unreadable against
 * them and makes the bars unreadable too.
 */
const PADDING_SIDEWAYS = { top: 6, right: 10, bottom: 6, left: 68 };

/** Width the readout is laid out at, so it can be clamped inside the plot. */
const LABEL_WIDTH = 132;

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

type Layer = 'svg' | 'overlay' | 'header';

export type BarChartStatus = 'loading' | 'ready';
export type BarChartOrientation = 'vertical' | 'horizontal';
export type BarChartDatum = Record<string, string | number | null | undefined>;

interface BarChartContextValue {
  data: BarChartDatum[];
  xDataKey: string;
  plot: Plot;
  status: BarChartStatus;
  orientation: BarChartOrientation;
  stacked: boolean;
  barGap: number;
  barWidth: number | undefined;
  stackGap: number;
  cornerRadius: number;
  minBarLength: number;
  fadedOpacity: number;
  series: [string, string][];
  registerSeries: (key: string, color: string) => void;
  unregisterSeries: (key: string) => void;
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  /** The settled domain, for the parts that draw text rather than geometry. */
  extent: [number, number];
  /** 0 to 1 as the bars grow in. Shared, so they arrive as one chart. */
  reveal: SharedValue<number>;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
}

const BarChartContext = createContext<BarChartContextValue | null>(null);

function useChart(component: string): BarChartContextValue {
  const context = useContext(BarChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BarChart>`);
  }
  return context;
}

/**
 * The band under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveIndexChange` for that.
 */
export function useBarChart() {
  const { data, activeIndexJS, xDataKey } = useChart('useBarChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

export interface BarChartProps extends ViewProps, ChartAccessibilityProps<BarChartDatum> {
  className?: string;
  /** The rows. Each one is a band along the category axis. */
  data: BarChartDatum[];
  /** Key holding the category label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bars at the baseline and grows them into the real ones
   * when it turns `ready`. One component throughout, rather than a spinner
   * swapped for a chart — swapping loses the transition. Add a
   * `BarChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: BarChartStatus;
  /** Width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow in on mount. */
  animationDuration?: number;
  /** Milliseconds for the value axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the value axis instead of deriving it. Note that the derived domain
   * always includes zero, and a domain that does not is a bar chart whose
   * lengths cannot be compared — pass this only when you mean it.
   */
  yDomain?: [number, number];
  /** `vertical` grows the bars upward; `horizontal` grows them rightward. */
  orientation?: BarChartOrientation;
  /** Stack the series on each other instead of standing them side by side. */
  stacked?: boolean;
  /**
   * Fraction of each band left empty, `0` to `1`. A fraction rather than a
   * pixel gap so the proportions hold at any width.
   */
  barGap?: number;
  /** Fixed bar thickness in points. Derived from the band when omitted. */
  barWidth?: number;
  /** Points between the segments of a stack. */
  stackGap?: number;
  /** Corner radius on the growing end of a bar. */
  cornerRadius?: number;
  /**
   * Smallest length a non-zero bar is drawn at, in points. A value that rounds
   * to nothing still happened, and a bar of zero height says it did not.
   */
  minBarLength?: number;
  /** Opacity of the bars that are not under the finger. */
  fadedOpacity?: number;
  /**
   * The band under the finger as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: BarChartDatum | null) => void;
  /** Drop the axis padding, for a bar sparkline with no axis or readout. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface BarChartHandle {
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

function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const BarChartRoot = forwardRef<BarChartHandle, BarChartProps>(function BarChartRoot(
  {
    className,
    data,
    xDataKey = 'name',
    status = 'ready',
    aspectRatio = 2,
    animationDuration = 700,
    domainDuration = 500,
    yDomain,
    orientation = 'vertical',
    stacked = false,
    barGap = 0.2,
    barWidth,
    stackGap = 0,
    cornerRadius = 4,
    minBarLength = 0,
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
    : orientation === 'horizontal'
      ? PADDING_SIDEWAYS
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
    let min = 0;
    let max = 0;

    for (const row of data) {
      // Stacked, the tall thing is the total; grouped, it is the tallest bar.
      // Reading the same number for both would crop a stack at its largest
      // segment and clip everything above it.
      let positive = 0;
      let negative = 0;
      for (const key of keys) {
        const value = row[key];
        if (typeof value !== 'number' || Number.isNaN(value)) continue;
        if (stacked) {
          if (value >= 0) positive += value;
          else negative += value;
        } else {
          if (value > positive) positive = value;
          if (value < negative) negative = value;
        }
      }
      if (positive > max) max = positive;
      if (negative < min) min = negative;
    }

    if (min === 0 && max === 0) return [0, 1];
    // Headroom above the tallest bar only. The zero end is left exactly where
    // it is: padding it would lift the bars off their own baseline.
    return [min === 0 ? 0 : min * 1.1, max === 0 ? 0 : max * 1.1];
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

  const context = useMemo<BarChartContextValue>(
    () => ({
      data,
      xDataKey,
      plot,
      status,
      orientation,
      stacked,
      barGap,
      barWidth,
      stackGap,
      cornerRadius,
      minBarLength,
      fadedOpacity,
      series,
      registerSeries,
      unregisterSeries,
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
      plot.width,
      plot.height,
      plot.left,
      plot.top,
      status,
      orientation,
      stacked,
      barGap,
      barWidth,
      stackGap,
      cornerRadius,
      minBarLength,
      fadedOpacity,
      series,
      registerSeries,
      unregisterSeries,
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
    <BarChartContext.Provider value={context}>
      <View {...props} style={props.style} className={cn('w-full', className)}>
        {header}
        <ChartAccessibilityData
          chart="Bar chart"
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
              {overlay}
            </>
          ) : null}
        </View>
      </View>
    </BarChartContext.Provider>
  );
});
BarChartRoot.displayName = 'BarChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface BarChartGridProps {
  /** How many lines to draw across the value axis. */
  rows?: number;
  color?: string;
  dashArray?: string;
  opacity?: number;
}

/**
 * Lines across the value axis, so a bar can be read against a number rather
 * than only against the bar beside it.
 */
function BarChartGrid({ rows = 4, color, dashArray = '4,6', opacity = 1 }: BarChartGridProps) {
  const { plot, orientation } = useChart('BarChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.1)');

  const lines = Array.from({ length: rows + 1 }, (_unused, index) => index / rows);

  return (
    <G opacity={opacity}>
      {lines.map((fraction) =>
        orientation === 'vertical' ? (
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
        ) : (
          <SvgLine
            key={fraction}
            x1={plot.left + plot.width * fraction}
            x2={plot.left + plot.width * fraction}
            y1={plot.top}
            y2={plot.top + plot.height}
            stroke={stroke}
            strokeDasharray={dashArray}
            strokeWidth={1}
          />
        )
      )}
    </G>
  );
}
BarChartGrid.displayName = 'BarChart.Grid';
BarChartGrid.layer = 'svg' as Layer;

export interface BarChartBarProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. */
  color?: string;
  /** Which of the five chart tokens to take. */
  colorIndex?: SeriesColorIndex;
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/**
 * One series of bars.
 *
 * Drawn as two paths rather than one rectangle per band: the band under the
 * finger, and everything else. That is the fewest animated props that can
 * still dim the rest — one path could not, since a path has one opacity, and
 * a view per bar would be one animated prop per bar for the same picture.
 */
function BarChartBar({ dataKey, color, colorIndex = 1, cornerRadius }: BarChartBarProps) {
  const {
    data,
    plot,
    status,
    orientation,
    stacked,
    barGap,
    barWidth,
    stackGap,
    cornerRadius: chartRadius,
    minBarLength,
    fadedOpacity,
    series,
    registerSeries,
    unregisterSeries,
    domainMin,
    domainMax,
    reveal,
    activeIndex,
  } = useChart('BarChart.Bar');

  const fill = useSeriesColor(color, colorIndex);
  const radius = cornerRadius ?? chartRadius;

  useEffect(() => {
    registerSeries(dataKey, fill);
    return () => unregisterSeries(dataKey);
  }, [dataKey, fill, registerSeries, unregisterSeries]);

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);

  /*
   * What each bar in this series sits on. Grouped, that is nothing — every bar
   * starts at zero. Stacked, it is the running total of the series registered
   * *before* this one, which is why registration order is the stacking order.
   */
  const baselines = useMemo(() => {
    if (!stacked) return null;
    const below = series.slice(0, series.findIndex(([key]) => key === dataKey));
    if (!below.length) return null;
    return data.map((row) => {
      let total = 0;
      for (const [key] of below) {
        const value = row[key];
        if (typeof value === 'number' && !Number.isNaN(value)) total += value;
      }
      return total;
    });
  }, [stacked, series, dataKey, data]);

  const seriesIndex = Math.max(
    0,
    series.findIndex(([key]) => key === dataKey)
  );
  const seriesCount = Math.max(1, series.length);
  const loading = status === 'loading';
  const total = data.length;
  const horizontal = orientation === 'horizontal';

  /*
   * Both paths come out of one builder, filtered by whether the band is the
   * active one. Two passes over the data a frame is still cheaper than the
   * bookkeeping needed to build both at once, and it keeps the geometry in
   * exactly one place.
   */
  const build = (wantActive: boolean) => () => {
    'worklet';
    if (!total || plot.width <= 0) {
      return { d: '', opacity: 1 };
    }

    // The category axis runs across the plot when the bars grow up, and down
    // it when they grow right. `along` is that axis; `across` is the value one.
    const along = horizontal ? plot.height : plot.width;
    const across = horizontal ? plot.width : plot.height;
    const alongStart = horizontal ? plot.top : plot.left;
    const acrossStart = horizontal ? plot.left : plot.top;

    const band = along / total;
    // The slot a single bar gets: the band, less the gap, divided between the
    // series when they stand side by side.
    const usable = band * (1 - barGap);
    const slot = stacked ? usable : usable / seriesCount;
    const thickness = Math.min(barWidth ?? slot, slot);

    const min = domainMin.value;
    const max = domainMax.value;
    const range = max - min || 1;
    const grow = reveal.value;
    const active = activeIndex.value;

    /*
     * Where a value sits along the value axis. Vertical counts down from the
     * top, horizontal counts up from the left — the same scale read in
     * opposite directions, which is the only thing orientation changes.
     */
    const project = (value: number) => {
      'worklet';
      const fraction = (value - min) / range;
      return horizontal
        ? acrossStart + fraction * across
        : acrossStart + across - fraction * across;
    };

    let d = '';

    for (let i = 0; i < total; i++) {
      if ((i === active) !== wantActive) continue;

      const value = values[i];
      if (value === null || value === undefined) continue;

      const base = baselines?.[i] ?? 0;
      /*
       * Staggered by band, but every bar still finishes inside the one
       * duration: the window each gets is what is left after the stagger, so
       * a chart of fifty bands does not take fifty times as long to arrive.
       */
      const start = total > 1 ? (i / total) * 0.45 : 0;
      const eased = Math.max(0, Math.min(1, (grow - start) / 0.55));
      const shown = loading ? 0 : value * eased;

      const zero = project(base);
      const tip = project(base + shown);
      const shrink = stacked && stackGap > 0 ? stackGap : 0;
      let length = Math.abs(tip - zero) - shrink;
      // A value that rounds to nothing still happened, and a bar of zero
      // length says it did not.
      if (minBarLength > 0 && shown !== 0 && length < minBarLength) {
        length = minBarLength;
      }
      if (length <= 0) continue;

      const offset =
        (stacked ? 0 : seriesIndex * slot) + (band - usable) / 2 + (slot - thickness) / 2;
      const lead = alongStart + i * band + offset;
      const positive = shown >= 0;

      d += horizontal
        ? barPath(
            positive ? zero : zero - length,
            lead,
            length,
            thickness,
            radius,
            positive ? 'right' : 'left'
          )
        : barPath(
            lead,
            positive ? zero - length : zero,
            thickness,
            length,
            radius,
            positive ? 'up' : 'down'
          );
    }

    // Dimming only happens while something *is* active; with nothing under the
    // finger every bar is at full ink, which is the resting state.
    const dim = !wantActive && active >= 0 ? fadedOpacity : 1;
    return { d, opacity: dim };
  };

  const restProps = useAnimatedProps(build(false));
  const activeProps = useAnimatedProps(build(true));

  return (
    <G>
      <AnimatedPath animatedProps={restProps} fill={fill} />
      <AnimatedPath animatedProps={activeProps} fill={fill} />
    </G>
  );
}
BarChartBar.displayName = 'BarChart.Bar';
BarChartBar.layer = 'svg' as Layer;

/** How much of the value axis a placeholder bar takes. */
const SKELETON_LENGTH = 0.22;

/** Bands to draw when there is no data yet to count them from. */
const SKELETON_BARS = 7;

export interface BarChartSkeletonProps {
  /**
   * How many placeholder bars to draw. Defaults to one per row, and to seven
   * when the data has not arrived — the count is the one thing a loading
   * chart can be honest about only if it already has the rows.
   */
  bars?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
}

/**
 * The loading state: a row of short, equal stubs on the baseline, with a
 * highlight travelling across them.
 *
 * Equal on purpose. Placeholder bars of differing heights are a distribution
 * the reader has no way to tell from the real one until it changes under them,
 * so these say only how many bars there will be and where the baseline is.
 *
 * The sweep is the part that carries the meaning. Without it a chart waiting
 * for data and a chart whose values are all zero draw the same picture, and
 * the reader is left to guess which one they are looking at.
 */
function BarChartSkeleton({ bars, duration = 1400, color }: BarChartSkeletonProps) {
  const { plot, status, orientation, data, barGap, barWidth, cornerRadius } =
    useChart('BarChart.Skeleton');
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

  const horizontal = orientation === 'horizontal';
  const total = Math.max(1, bars ?? (data.length || SKELETON_BARS));

  const d = useMemo(() => {
    if (plot.width <= 0 || plot.height <= 0) return '';

    // The same two axes the bars use: `along` is the category one, `across`
    // the value one, so a sideways chart is this code with the pair swapped.
    const along = horizontal ? plot.height : plot.width;
    const alongStart = horizontal ? plot.top : plot.left;
    const across = horizontal ? plot.width : plot.height;

    const band = along / total;
    const usable = band * (1 - barGap);
    const thickness = Math.min(barWidth ?? usable, usable);
    const length = across * SKELETON_LENGTH;

    let path = '';
    for (let i = 0; i < total; i += 1) {
      const lead = alongStart + i * band + (band - thickness) / 2;
      path += horizontal
        ? barPath(plot.left, lead, length, thickness, cornerRadius, 'right')
        : barPath(lead, plot.top + plot.height - length, thickness, length, cornerRadius, 'up');
    }
    return path;
  }, [plot, horizontal, total, barGap, barWidth, cornerRadius]);

  if (!loading || !d) return null;

  const gradientId = 'panelui-bar-skeleton';

  return (
    <G>
      <Defs>
        <AnimatedLinearGradient id={gradientId} animatedProps={animatedProps} y1="0" y2="0">
          <Stop offset="0" stopColor={base} />
          <Stop offset="0.5" stopColor={highlight} stopOpacity={0.55} />
          <Stop offset="1" stopColor={base} />
        </AnimatedLinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${gradientId})`} />
    </G>
  );
}
BarChartSkeleton.displayName = 'BarChart.Skeleton';
BarChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Narrowest a category label may be drawn before the axis starts dropping
 * some. Roughly three characters at `xs`, which is what a month abbreviation
 * or a short name needs.
 */
const MIN_BAND_LABEL = 34;

export interface BarChartXAxisProps {
  /**
   * How many labels to show. Every category by default, thinned only when the
   * bands get too narrow to read — pass a number to force it lower.
   */
  ticks?: number;
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: BarChartDatum, index: number) => string;
  className?: string;
}

/**
 * The category labels, one under each band it has room for. Real text rather
 * than SVG text, so they follow the theme's font and the platform's text
 * scaling — SVG text does neither.
 */
function BarChartXAxis({ ticks, format, className }: BarChartXAxisProps) {
  const { data, xDataKey, plot, orientation } = useChart('BarChart.XAxis');

  const labels = useMemo(() => {
    if (!data.length) return [];

    /*
     * Every category, unless they will not fit. A fixed tick count dropped
     * names that had room to be drawn — eight months at six ticks lost March
     * and June for no reason anyone looking at the chart could see. The axis
     * asks the plot how much room there is instead, and only thins when the
     * answer is not enough.
     */
    const room = Math.max(1, Math.floor(plot.width / MIN_BAND_LABEL));
    const count = Math.max(1, Math.min(ticks ?? room, data.length));

    // Every nth band, rather than a fractional step rounded to the nearest
    // index — rounding lands on the same band twice and skips its neighbour.
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

  if (orientation === 'horizontal') return null;

  /*
   * Each label is placed on its own band's centre, not spaced evenly along the
   * axis. Two things went wrong when they were spread with `justify-between`:
   * a bar owns a *band* rather than sitting on a point, so the first and last
   * labels were half a band out at the edges; and the indices `ticks` picks
   * are not evenly spaced (eight months shown six at a time gives 0,1,3,4,6,7),
   * so the ones between were spread evenly over gaps that are not.
   *
   * The box is backed off by half its own width rather than translated by
   * `-50%`, which is not reliable across React Native versions.
   */
  /*
   * One box per band, exactly the band's width. Tiling them rather than giving
   * each a fixed width means they can never overlap each other and the first
   * and last can never hang off the ends of the plot — the row of labels
   * occupies precisely the space the bars do.
   */
  const bandWidth = data.length > 0 ? plot.width / data.length : 0;

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
            left: bandOf(label.key, data.length, plot) - bandWidth / 2,
            width: bandWidth,
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
BarChartXAxis.displayName = 'BarChart.XAxis';
BarChartXAxis.layer = 'overlay' as Layer;

export interface BarChartYAxisProps {
  /** How many labels to show along the value axis. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/** Value labels down the side, aligned to the grid lines. */
function BarChartYAxis({ ticks = 4, format, className }: BarChartYAxisProps) {
  const { plot, data, xDataKey, orientation, extent } = useChart('BarChart.YAxis');

  /*
   * Read off the settled domain rather than the shared values the paths use.
   * A label is text, and text is JS — following the tween would re-render on
   * every frame of it to redraw a number nobody can read while it moves.
   */
  const horizontal = orientation === 'horizontal';

  const labels = useMemo(() => {
    if (horizontal) {
      // Sideways, the side of the chart is the category axis.
      return data.map((row, index) => ({
        key: index,
        text: String(row[xDataKey] ?? ''),
      }));
    }
    const [min, max] = extent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = max - ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [extent, ticks, format, horizontal, data, xDataKey]);

  /*
   * Sideways the labels sit in the gutter the plot already left for them, one
   * band each — `flex-1` per row rather than spacing them edge to edge, so
   * every name lands beside its own bar instead of only the first and last
   * doing so. Upright there are no bands to line up with, so the ticks space
   * themselves against the grid.
   */
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        // Upright, each label is centred on the grid line it names: the strip
        // is lifted half a label and grown by a whole one, so `justify-between`
        // lands the text's middle on the line rather than its top edge on the
        // first and its bottom edge on the last.
        top: horizontal ? plot.top : plot.top - AXIS_LABEL_HEIGHT / 2,
        height: horizontal ? plot.height : plot.height + AXIS_LABEL_HEIGHT,
        width: horizontal ? Math.max(plot.left - 8, 0) : undefined,
      }}
      className={cn(horizontal ? 'items-end' : 'justify-between', className)}
    >
      {labels.map((label) => (
        <View
          key={label.key}
          className={horizontal ? 'flex-1 justify-center' : undefined}
        >
          <Text size="xs" muted numberOfLines={1} maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}>
            {label.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
BarChartYAxis.displayName = 'BarChart.YAxis';
BarChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it
// lays the plot out — an axis drawn over the plot is unreadable, and
// makes what it is drawn over unreadable too.
BarChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface BarChartTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: BarChartDatum) => string;
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
 * There is no crosshair. A line needs one because a point on a line has no
 * width of its own to point at; a bar is already the thing being pointed at,
 * so highlighting it and dimming the rest says the same thing without drawing
 * a line through the chart.
 *
 * The hit area is the whole plot. A readout you have to land on the bar to
 * summon is a readout nobody finds — and the thinner the bars, the truer that
 * gets.
 */
function BarChartTooltip({
  formatValue,
  formatX,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: BarChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    series,
    orientation,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('BarChart.Tooltip');

  const total = data.length;
  const horizontal = orientation === 'horizontal';
  const left = plot.left;
  const top = plot.top;
  const width = plot.width;
  const height = plot.height;

  /*
   * The readout's own height, measured rather than assumed. Sideways it has to
   * be clamped inside the plot vertically, and how tall it is depends on how
   * many series are listed in it — a constant here would either let a
   * three-series readout hang off the bottom or reserve room a one-series
   * readout never uses.
   */
  const labelHeight = useSharedValue(0);

  /*
   * Declared inside the memo, next to its callers: a worklet may only call
   * another worklet, and the rule is enforced by crashing rather than warning.
   */
  const pan = useMemo(() => {
    const resolve = (x: number, y: number) => {
      'worklet';
      if (!total) return;
      const span = horizontal ? height : width;
      const offset = (horizontal ? y - top : x - left) / (span || 1);
      // Bands, not points: the finger is inside whichever slice it lands on,
      // which is a floor rather than a round to the nearest centre.
      const next = Math.max(0, Math.min(total - 1, Math.floor(offset * total)));
      if (next === activeIndex.value) return;
      activeIndex.value = next;
      runOnJS(setActiveIndexJS)(next);
    };

    return Gesture.Pan()
      .minDistance(0)
      .activateAfterLongPress(activateAfterLongPress)
      .onStart((event) => {
        'worklet';
        resolve(event.x, event.y);
      })
      .onUpdate((event) => {
        'worklet';
        resolve(event.x, event.y);
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
    top,
    width,
    height,
    horizontal,
    activeIndex,
    setActiveIndexJS,
    activateAfterLongPress,
  ]);

  /*
   * The readout centres over its band and is clamped inside the plot, so it
   * never runs off the edge at the first or last one.
   *
   * Which axis the band runs along is the whole difference between the two
   * orientations. Upright, the bands are side by side, so the readout slides
   * across and sits above them all. Sideways, the bands are stacked down the
   * plot, so it slides *down* to the row it is describing and stays centred
   * across — held at the top instead, it would name the row under the finger
   * while covering the first one, which is the row a reader checks it against.
   */
  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0 || !total) return { opacity: 0 };
    const band = (horizontal ? plot.height : plot.width) / total;
    const centre = (horizontal ? plot.top : plot.left) + band * (index + 0.5);
    const half = LABEL_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, horizontal ? plot.left + plot.width / 2 : centre)
    );

    if (!horizontal) {
      return { opacity: 1, transform: [{ translateX: clamped - half }] };
    }

    // Until the first measurement lands the height is zero, which clamps to
    // the top of the plot — the same place it used to sit, rather than a jump
    // from somewhere it never was.
    const tall = labelHeight.value;
    const y = Math.min(
      plot.top + Math.max(plot.height - tall, 0),
      Math.max(plot.top, centre - tall / 2)
    );
    return {
      opacity: 1,
      transform: [{ translateX: clamped - half }, { translateY: y }],
    };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: BarChartDatum) => String(datum[xDataKey] ?? ''));

  if (status === 'loading') return null;

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
          {active ? (
            <View
              onLayout={(event) => {
                labelHeight.value = event.nativeEvent.layout.height;
              }}
              className={cn(
                'rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg',
                className
              )}
            >
              <Text size="xs" muted numberOfLines={1}>
                {fmtX(active)}
              </Text>
              {series.map(([key, color]) => {
                const value = active[key];
                if (typeof value !== 'number') return null;
                return (
                  <View key={key} className="flex-row items-center gap-1.5">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: color,
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
BarChartTooltip.displayName = 'BarChart.Tooltip';
BarChartTooltip.layer = 'overlay' as Layer;

export interface BarChartLegendProps extends ViewProps {
  className?: string;
  /** Prettier names for the series keys. */
  labels?: Record<string, string>;
}

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

/** A swatch and a name per series, in the order the series were declared. */
function BarChartLegend({ className, labels, ...props }: BarChartLegendProps) {
  const { series } = useChart('BarChart.Legend');
  if (!series.length) return null;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-1 flex-row gap-3', className)}
    >
      {series.map(([key, color]) => (
        <SeriesSwatch key={key} color={color} label={labels?.[key] ?? key} />
      ))}
    </View>
  );
}
BarChartLegend.displayName = 'BarChart.Legend';
BarChartLegend.layer = 'overlay' as Layer;

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface BarChartHeaderProps extends ViewProps {
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
   * `BarChart.Legend` on a chart that has a header: the legend floats over the
   * plot, where it competes with the bars for the same corner.
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
 * the *plot* — the number changes as a finger moves along the bars, and the
 * legend is the series list the chart itself is holding. The card's header is a
 * caption on the tray the chart sits in; this is the chart introducing itself.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down, so one header can show a total when nothing is pressed
 * and a band's value when something is.
 */
function BarChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: BarChartHeaderProps) {
  const { series } = useChart('BarChart.Header');
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
BarChartHeader.displayName = 'BarChart.Header';
BarChartHeader.layer = 'header' as Layer;

export const BarChart = Object.assign(BarChartRoot, {
  Header: BarChartHeader,
  Grid: BarChartGrid,
  Bar: BarChartBar,
  Skeleton: BarChartSkeleton,
  XAxis: BarChartXAxis,
  YAxis: BarChartYAxis,
  Tooltip: BarChartTooltip,
  Legend: BarChartLegend,
});
