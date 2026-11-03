/**
 * ScatterChart — two quantities against each other, drawn on the UI thread.
 *
 * Every other chart in this library spaces its points evenly along the x-axis,
 * because their x is a position: twelve months are twelve equal steps whatever
 * the gaps between the dates behind them. A scatter plot is the one shape where
 * that is wrong. Both coordinates are *measured*, and the reader is being asked
 * to look for a relationship between them — spread the points evenly and the
 * relationship is the one thing you have thrown away.
 *
 * So this chart carries an x-domain as well as a y-domain, and both are tweened
 * when the data changes.
 *
 * ```tsx
 * <ScatterChart data={sessions} xDataKey="spend">
 *   <ScatterChart.Grid />
 *   <ScatterChart.Points dataKey="revenue" />
 *   <ScatterChart.XAxis />
 *   <ScatterChart.YAxis />
 *   <ScatterChart.Tooltip />
 * </ScatterChart>
 * ```
 *
 * As elsewhere, there are two layers and the parts sort themselves into the
 * right one: the geometry is SVG, and anything with text or a gesture on it is
 * a React Native view over the top. SVG text ignores the platform's text
 * scaling and the theme's font, and a gesture handler cannot be attached to an
 * SVG node at all.
 *
 * **Finding a point.** A crosshair that snaps to an x index — the way a line
 * chart's does — has nothing to snap to here, because there is no shared x and
 * two points can sit at the same one. Instead the nearest point to the finger
 * is resolved by distance, on the UI thread, and only within a radius: a touch
 * in an empty corner of the plot selects nothing rather than lighting up
 * whichever point happens to be least far away. The radius is generous, because
 * the points are a few pixels across and a fingertip is not.
 *
 * Colours come from the `--color-chart-*` tokens, so a chart follows the active
 * theme. Nothing here hardcodes a hex.
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
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line as SvgLine } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { compactNumber, useSeriesColor, xAt, yOf, type Plot } from '../../utils/chart';
import { cn } from '../../utils/cn';
import { useSkeletonHandoff } from '../../hooks/use-skeleton-handoff';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * How much of the reveal is spent handing out the points' start times. The rest
 * is the window each one gets, so the whole field still lands inside the one
 * duration however many points there are.
 */
const STAGGER = 0.4;

/** Milliseconds for a point to swell as it is selected, and settle as it is not. */
const SELECT_DURATION = 140;

/**
 * A point arriving: up past its size and back to it.
 *
 * A dot that simply grows to its radius reads as the chart still loading right
 * up to the last frame. The small overshoot is what makes it read as landing.
 */
function landing(t: number): number {
  'worklet';
  const back = 1.3;
  const u = t - 1;
  return 1 + (back + 1) * u * u * u + back * u * u;
}

/** Room left around the plot for the axis labels and the outermost dots. */
const PADDING = { top: 14, right: 14, bottom: 22, left: 14 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Box each x label is centred in, so a long number is ellipsised not shoved. */
const POINT_LABEL_WIDTH = 56;

/** Width of the readout that floats by the selected point. */
const LABEL_WIDTH = 132;

/** How far the readout is lifted, to clear the point it describes. */
const LABEL_HEIGHT = 52;

/**
 * How far from a point a touch still counts as being on it, in points.
 *
 * Sized for a fingertip rather than for the dot. Apple and Android both put the
 * minimum comfortable target at around 44pt, and a scatter point is nearer 7 —
 * without a hit radius the chart is only usable with a mouse it will never see.
 */
const HIT_RADIUS = 32;

type Layer = 'svg' | 'overlay' | 'header';

export type ScatterChartStatus = 'loading' | 'ready';
export type ScatterChartDatum = Record<string, string | number | null | undefined>;

/** One plotted point, resolved back to the row it came from. */
export interface ScatterChartPoint {
  /** Index into `data`. */
  index: number;
  /** The series key this point belongs to. */
  dataKey: string;
  x: number;
  y: number;
  datum: ScatterChartDatum;
}

interface ScatterChartContextValue {
  data: ScatterChartDatum[];
  xDataKey: string;
  plot: Plot;
  status: ScatterChartStatus;
  series: [string, string][];
  registerSeries: (key: string, color: string) => void;
  unregisterSeries: (key: string) => void;
  /** Tweened domains. Read inside worklets to place the points. */
  xMin: SharedValue<number>;
  xMax: SharedValue<number>;
  yMin: SharedValue<number>;
  yMax: SharedValue<number>;
  /** The domains the tweens are heading for, for the axis labels. */
  xExtent: [number, number];
  yExtent: [number, number];
  /** The selected point, as `"<dataKey>:<index>"`, or `''` for none. */
  activeId: SharedValue<string>;
  activePoint: ScatterChartPoint | null;
  setActivePoint: (point: ScatterChartPoint | null) => void;
  /** 0 to 1 as the field arrives. Each point reads its own slice of it. */
  reveal: SharedValue<number>;
}

const ScatterChartContext = createContext<ScatterChartContextValue | null>(null);

function useChart(component: string): ScatterChartContextValue {
  const context = useContext(ScatterChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <ScatterChart>`);
  }
  return context;
}

/**
 * The selected point, for something rendered *inside* the chart.
 *
 * A readout usually belongs in the card's header, which is outside this
 * provider — use `onActivePointChange` for that. A hook cannot reach up out of
 * the subtree it is called in.
 */
export function useScatterChart() {
  const { activePoint, xDataKey } = useChart('useScatterChart');
  return { activePoint, xDataKey };
}

export interface ScatterChartProps extends ViewProps, ChartAccessibilityProps<ScatterChartDatum> {
  className?: string;
  /** The rows. Each one is a point, placed by two of its values. */
  data: ScatterChartDatum[];
  /** Key holding the x value. Unlike the other charts, this must be a number. */
  xDataKey?: string;
  /**
   * `loading` draws a still field of muted dots and settles into the real ones
   * when it turns `ready`. One component throughout, rather than a spinner
   * swapped for a chart — swapping loses the transition.
   */
  status?: ScatterChartStatus;
  /** Width ÷ height. `1` suits a scatter plot: neither axis is the important one. */
  aspectRatio?: number;
  /** Milliseconds for the reveal on mount. Defaults to `650`. */
  animationDuration?: number;
  /** Milliseconds for the axes to settle after the data changes. */
  domainDuration?: number;
  /** Fix the x-axis instead of deriving it from the data. */
  xDomain?: [number, number];
  /** Fix the y-axis instead of deriving it from the data. */
  yDomain?: [number, number];
  /**
   * The point under the finger, and `null` when it lifts. This is how a readout
   * in the card's header gets its value — that header is outside the chart, so
   * it cannot use `useScatterChart`.
   *
   * Fires when the selection changes, not per frame.
   */
  onActivePointChange?: (point: ScatterChartPoint | null) => void;
  /** Drop the axis padding so the field reaches the edges, for a thumbnail. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal on demand, for a "replay" control. */
export interface ScatterChartHandle {
  replay: () => void;
}

const ScatterChartRoot = forwardRef<ScatterChartHandle, ScatterChartProps>(
  function ScatterChartRoot(
    {
      className,
      data,
      xDataKey = 'x',
      status = 'ready',
      aspectRatio = 1,
      animationDuration = 650,
      domainDuration = 500,
      xDomain,
      yDomain,
      onActivePointChange,
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
    const [activePoint, setActivePointState] = useState<ScatterChartPoint | null>(null);

    const reveal = useSharedValue(0);
    const xMin = useSharedValue(0);
    const xMax = useSharedValue(0);
    const yMin = useSharedValue(0);
    const yMax = useSharedValue(0);
    const activeId = useSharedValue('');
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
      ? { top: 4, right: 4, bottom: 4, left: 4 }
      : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };

    const seriesKeys = series.map(([key]) => key).join('|');

    /*
     * Both extents in one pass. A scatter plot's x is a measured quantity, so
     * unlike the rest of the family it needs a domain of its own rather than a
     * count of positions.
     *
     * Neither axis is floored at zero. An area chart is floored because a
     * filled region floating above the baseline reads as a shape rather than a
     * quantity — but a scatter plot's subject is the *spread*, and forcing a
     * cluster of values between 80 and 90 to share a frame with zero squashes
     * it into a smudge in one corner and hides the very thing being plotted.
     */
    const extents = useMemo<{ x: [number, number]; y: [number, number] }>(() => {
      const keys = seriesKeys ? seriesKeys.split('|') : [];
      let lowX = Infinity;
      let highX = -Infinity;
      let lowY = Infinity;
      let highY = -Infinity;

      for (const row of data) {
        const x = row[xDataKey];
        if (typeof x !== 'number' || Number.isNaN(x)) continue;
        for (const key of keys) {
          const y = row[key];
          // A row with no reading for this series is not a point at the
          // origin — it is not a point at all, and must not stretch the axes.
          if (typeof y !== 'number' || Number.isNaN(y)) continue;
          if (x < lowX) lowX = x;
          if (x > highX) highX = x;
          if (y < lowY) lowY = y;
          if (y > highY) highY = y;
        }
      }

      return {
        x: xDomain ?? padExtent(lowX, highX),
        y: yDomain ?? padExtent(lowY, highY),
      };
    }, [data, xDataKey, seriesKeys, xDomain, yDomain]);

    const loading = status === 'loading';

    useEffect(() => {
      if (loading) return;
      const [x0, x1] = extents.x;
      const [y0, y1] = extents.y;
      // The first domain lands without a tween: there is no previous scale to
      // move from, and animating up from zero reads as the numbers changing.
      const first = xMin.value === 0 && xMax.value === 0 && yMin.value === 0 && yMax.value === 0;
      if (first || reducedMotion) {
        xMin.value = x0;
        xMax.value = x1;
        yMin.value = y0;
        yMax.value = y1;
        return;
      }
      xMin.value = withTiming(x0, { duration: domainDuration });
      xMax.value = withTiming(x1, { duration: domainDuration });
      yMin.value = withTiming(y0, { duration: domainDuration });
      yMax.value = withTiming(y1, { duration: domainDuration });
    }, [extents, loading, reducedMotion, domainDuration, xMin, xMax, yMin, yMax]);

    const revealed = useRef(false);
    const playReveal = useMemo(
      () => () => {
        if (reducedMotion) {
          reveal.value = 1;
          return;
        }
        reveal.value = 0;
        /*
         * Eased out rather than in and out. Each point is given a slice of this
         * one clock, so an ease that dawdles at the start spends it on the
         * first few points and leaves the rest to arrive in a rush.
         */
        reveal.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
      },
      [reducedMotion, animationDuration, reveal]
    );

    /*
     * Armed again every time the chart goes back to loading, so a chart that
     * reloads animates on the second pass as well as the first. Left latched,
     * the guard made "loading" a state the chart could only leave once.
     */
    useEffect(() => {
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

    // One place the selection lands, so the chart's own children and a readout
    // outside it never disagree about which point is active.
    const setActivePoint = useMemo(
      () => (point: ScatterChartPoint | null) => {
        setActivePointState(point);
        onActivePointChange?.(point);
      },
      [onActivePointChange]
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

    const context = useMemo<ScatterChartContextValue>(
      () => ({
        data,
        xDataKey,
        plot,
        status,
        series,
        registerSeries,
        unregisterSeries,
        xMin,
        xMax,
        yMin,
        yMax,
        xExtent: extents.x,
        yExtent: extents.y,
        activeId,
        activePoint,
        setActivePoint,
        reveal,
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
        series,
        registerSeries,
        unregisterSeries,
        xMin,
        xMax,
        yMin,
        yMax,
        extents,
        activeId,
        activePoint,
        setActivePoint,
        reveal,
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
      <ScatterChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Scatter chart"
            data={data}
            disabled={accessible === false || status === 'loading'}
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
      </ScatterChartContext.Provider>
    );
  }
);
ScatterChartRoot.displayName = 'ScatterChart';

/**
 * An extent with a little air around it, and a usable one for the degenerate
 * cases — no data at all, or every reading identical. A domain of zero width
 * divides by zero and puts every point on the same edge.
 */
function padExtent(min: number, max: number): [number, number] {
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

/** Sorts the children into the SVG tree and the view layer over it. */
function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    (layer === 'header' ? header : layer === 'overlay' ? overlay : svg).push(
      // Children of a `Children.forEach` need keys of their own once they are
      // put into a new array.
      <ChildSlot key={index}>{child}</ChildSlot>
    );
  });

  return { svg, overlay, header };
}

/** Identity wrapper, purely so the partitioned arrays can carry keys. */
function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface ScatterChartGridProps {
  /** Horizontal rules across the plot. */
  rows?: number;
  /**
   * Vertical rules down it. A scatter plot's x is a quantity, so it earns a
   * grid in both directions — a line chart's does not, because its x is a
   * label and a rule under a label divides nothing.
   */
  columns?: number;
  color?: string;
  /** Dash pattern, e.g. `"4,6"`. Omit for a solid rule. */
  dashArray?: string;
  opacity?: number;
}

/** Reference lines both ways. Drawn under everything, and not part of the reveal. */
function ScatterChartGrid({
  rows = 4,
  columns = 4,
  color,
  dashArray = '4,6',
  opacity = 1,
}: ScatterChartGridProps) {
  const { plot } = useChart('ScatterChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  return (
    <G opacity={opacity}>
      {Array.from({ length: rows + 1 }, (_unused, index) => {
        const y = plot.top + (plot.height / rows) * index;
        return (
          <SvgLine
            key={`r${index}`}
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
      {Array.from({ length: columns + 1 }, (_unused, index) => {
        const x = plot.left + (plot.width / columns) * index;
        return (
          <SvgLine
            key={`c${index}`}
            x1={x}
            x2={x}
            y1={plot.top}
            y2={plot.top + plot.height}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray={dashArray}
          />
        );
      })}
    </G>
  );
}
ScatterChartGrid.displayName = 'ScatterChart.Grid';
ScatterChartGrid.layer = 'svg' as Layer;

export interface ScatterChartPointsProps {
  /** Key holding this series' y values. */
  dataKey: string;
  /**
   * Fill colour. Defaults to the `--color-chart-*` token at `colorIndex`, so a
   * series follows the theme without the call site naming a colour.
   */
  color?: string;
  /** Which `--color-chart-*` token to take when `color` is not given. */
  colorIndex?: 1 | 2 | 3 | 4 | 5;
  /** Radius of a point, in points. Ignored when `sizeKey` is given. */
  size?: number;
  /**
   * Key holding a third quantity, mapped to each point's *area* — a bubble
   * chart. Area rather than radius, because doubling a radius quadruples the
   * ink and the reader sees four times the value that is there.
   */
  sizeKey?: string;
  /** Smallest and largest radius `sizeKey` maps onto. */
  sizeRange?: [number, number];
  /**
   * Fill opacity. Below 1 by default so that overlapping points read as denser
   * rather than hiding each other — in a crowded region that overlap *is* the
   * finding, and opaque dots erase it.
   */
  opacity?: number;
}

/** One series, as a field of dots. */
function ScatterChartPoints({
  dataKey,
  color,
  colorIndex = 1,
  size = 4.5,
  sizeKey,
  sizeRange = [3, 14],
  opacity = 0.75,
}: ScatterChartPointsProps) {
  const {
    data,
    xDataKey,
    plot,
    xMin,
    xMax,
    yMin,
    yMax,
    status,
    activeId,
    registerSeries,
    unregisterSeries,
    reveal,
  } = useChart('ScatterChart.Points');
  const fill = useSeriesColor(color, colorIndex);

  useEffect(() => {
    registerSeries(dataKey, fill);
    return () => unregisterSeries(dataKey);
  }, [dataKey, fill, registerSeries, unregisterSeries]);

  const loading = status === 'loading';

  // The size scale is over the whole series, so one row's bubble means the same
  // thing as another's. Recomputed only when the data or the key changes.
  const sizeExtent = useMemo<[number, number] | null>(() => {
    if (!sizeKey) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      const value = row[sizeKey];
      if (typeof value !== 'number' || Number.isNaN(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return min === Infinity ? null : [min, max];
  }, [data, sizeKey]);

  const points = useMemo(
    () =>
      data
        .map((row, index) => {
          const x = row[xDataKey];
          const y = row[dataKey];
          if (typeof x !== 'number' || Number.isNaN(x)) return null;
          if (typeof y !== 'number' || Number.isNaN(y)) return null;
          return { index, x, y, r: radiusFor(row[sizeKey ?? ''], sizeExtent, sizeRange, size) };
        })
        .filter((point): point is { index: number; x: number; y: number; r: number } =>
          point !== null
        ),
    [data, xDataKey, dataKey, sizeKey, sizeExtent, sizeRange, size]
  );

  if (loading) return null;

  return (
    <G>
      {points.map((point, order) => (
        <Dot
          key={point.index}
          id={`${dataKey}:${point.index}`}
          x={point.x}
          y={point.y}
          r={point.r}
          plot={plot}
          xMin={xMin}
          xMax={xMax}
          yMin={yMin}
          yMax={yMax}
          fill={fill}
          opacity={opacity}
          activeId={activeId}
          reveal={reveal}
          order={order}
          total={points.length}
        />
      ))}
    </G>
  );
}
ScatterChartPoints.displayName = 'ScatterChart.Points';
ScatterChartPoints.layer = 'svg' as Layer;

/**
 * A value's radius on the bubble scale.
 *
 * The value maps to *area* and the radius is taken from it, so a point holding
 * twice the value carries twice the ink rather than four times it.
 */
function radiusFor(
  value: string | number | null | undefined,
  extent: [number, number] | null,
  range: [number, number],
  fallback: number
): number {
  if (!extent || typeof value !== 'number' || Number.isNaN(value)) return fallback;
  const [min, max] = extent;
  const [rMin, rMax] = range;
  const ratio = max === min ? 1 : (value - min) / (max - min);
  const area = rMin * rMin + ratio * (rMax * rMax - rMin * rMin);
  return Math.sqrt(area);
}

/**
 * One point. Its position follows both domain tweens, so a data change moves
 * the whole field to the new scale rather than cutting to it.
 *
 * It arrives by growing in place, on its own slice of the shared reveal. The
 * alternative — sweeping a clip across the plot, which is what the line and
 * area charts do — is right for a series read along the x-axis and wrong here:
 * a wipe gives the reader a direction to read the arrival in, and a scatter
 * plot has none. Position is the whole message, so a point may only ever appear
 * where it belongs.
 */
function Dot({
  id,
  x,
  y,
  r,
  plot,
  xMin,
  xMax,
  yMin,
  yMax,
  fill,
  opacity,
  activeId,
  reveal,
  order,
  total,
}: {
  id: string;
  x: number;
  y: number;
  r: number;
  plot: Plot;
  xMin: SharedValue<number>;
  xMax: SharedValue<number>;
  yMin: SharedValue<number>;
  yMax: SharedValue<number>;
  fill: string;
  opacity: number;
  activeId: SharedValue<string>;
  reveal: SharedValue<number>;
  order: number;
  total: number;
}) {
  /*
   * The selection, as something that moves. It was a hard switch on
   * `activeId`, so the point it named jumped half as big again between one
   * frame and the next while every neighbour stayed put — read as a glitch
   * rather than as a response to the finger.
   */
  const selected = useDerivedValue(() =>
    withTiming(activeId.value === id ? 1 : 0, { duration: SELECT_DURATION })
  );

  // Where in the reveal this point starts. Spread over `STAGGER`, so the field
  // settles as a field rather than switching on all at once.
  const start = total > 1 ? (order / total) * STAGGER : 0;

  const animatedProps = useAnimatedProps(() => {
    const arrived = Math.max(0, Math.min(1, (reveal.value - start) / (1 - STAGGER)));
    // The selected point swells and goes solid. Both, rather than one: a size
    // change alone is easy to miss among neighbours, and an opacity change
    // alone is invisible wherever the points already overlap.
    const swell = 1 + 0.5 * selected.value;
    return {
      cx: xAt(x, plot, xMin.value, xMax.value),
      cy: yOf(y, plot, yMin.value, yMax.value),
      r: r * landing(arrived) * swell,
      // Ahead of the size, so a point is legible by the time it stops moving
      // rather than fading in for the whole of its arrival.
      fillOpacity:
        Math.min(1, arrived * 2) * (opacity + (1 - opacity) * selected.value),
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill={fill} />;
}

export interface ScatterChartSkeletonProps {
  /** How many placeholder dots to scatter. */
  count?: number;
  color?: string;
}

/**
 * The loading state: a still field of muted dots where the data will be.
 *
 * Deliberately still. A shimmer over a field of dots reads as the points
 * *moving*, which is the one thing a scatter plot must never appear to do —
 * position is the entire message, and a loading state that implies it is
 * changing is a loading state that lies.
 *
 * The layout is deterministic rather than random, so it does not reshuffle on
 * every render of a component that may re-render several times while waiting.
 *
 * Still is not the same as abrupt, though. It dissolves as the real points grow
 * in, and outlives the status change by exactly that long — cut at the frame the
 * data lands, the placeholder disappears before anything has replaced it and the
 * plot is briefly empty.
 */
function ScatterChartSkeleton({ count = 24, color }: ScatterChartSkeletonProps) {
  const { plot, status } = useChart('ScatterChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const fill = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  const { mounted, opacity: fade } = useSkeletonHandoff(status === 'loading');

  const dots = useMemo(() => {
    // A cheap deterministic scatter: two irrational-ish strides that do not
    // share a factor, so the points spread instead of falling into a lattice.
    return Array.from({ length: count }, (_unused, index) => ({
      key: index,
      fx: ((index * 0.618) % 1) * 0.92 + 0.04,
      fy: ((index * 0.379) % 1) * 0.92 + 0.04,
    }));
  }, [count]);

  const animatedProps = useAnimatedProps(() => ({ opacity: fade.value }));

  if (!mounted) return null;

  return (
    <AnimatedG animatedProps={animatedProps}>
      {dots.map((dot) => (
        <Circle
          key={dot.key}
          cx={plot.left + dot.fx * plot.width}
          cy={plot.top + dot.fy * plot.height}
          r={4.5}
          fill={fill}
        />
      ))}
    </AnimatedG>
  );
}
ScatterChartSkeleton.displayName = 'ScatterChart.Skeleton';
ScatterChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface ScatterChartXAxisProps {
  /** How many intervals to divide the axis into. Yields `ticks + 1` labels. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/**
 * The x labels, evenly along the axis.
 *
 * Evenly spaced here — unlike a line chart's, where each label sits on the point
 * it names — because this axis is a continuous scale rather than a list of
 * rows. There is no point to sit on.
 */
function ScatterChartXAxis({ ticks = 4, format, className }: ScatterChartXAxisProps) {
  const { plot, xExtent } = useChart('ScatterChart.XAxis');

  const labels = useMemo(() => {
    const [min, max] = xExtent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = min + ((max - min) * index) / ticks;
      return { key: index, value, text: format ? format(value) : compactNumber(value) };
    });
  }, [xExtent, ticks, format]);

  return (
    <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} className={cn(className)}>
      {labels.map((label) => (
        <Text
          key={label.key}
          size="xs"
          muted
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: 0,
            // Centred on its tick, then held inside the chart. The first and
            // last ticks sit on the plot's own edges, so a box centred on them
            // hangs half its width off the side — the clamp slides those two
            // back in rather than letting the numbers leave the frame.
            left: Math.max(
              0,
              Math.min(
                plot.left + (plot.width / ticks) * label.key - POINT_LABEL_WIDTH / 2,
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
ScatterChartXAxis.displayName = 'ScatterChart.XAxis';
ScatterChartXAxis.layer = 'overlay' as Layer;

export interface ScatterChartYAxisProps {
  /** How many intervals to divide the axis into. Yields `ticks + 1` labels. */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/** Value labels down the side, one per grid line. */
function ScatterChartYAxis({ ticks = 4, format, className }: ScatterChartYAxisProps) {
  const { plot, yExtent } = useChart('ScatterChart.YAxis');

  const labels = useMemo(() => {
    const [min, max] = yExtent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = max - ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [yExtent, ticks, format]);

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
ScatterChartYAxis.displayName = 'ScatterChart.YAxis';
ScatterChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out.
ScatterChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface ScatterChartTooltipProps {
  /** Float a small readout beside the selected point. On by default. */
  showLabel?: boolean;
  /** Format the x value for the readout. Defaults to a compact number. */
  formatX?: (value: number) => string;
  /** Format the y value for the readout. Defaults to a compact number. */
  formatY?: (value: number, key: string) => string;
  /** A heading for the readout, from the row — a name, a label, a category. */
  formatTitle?: (datum: ScatterChartDatum) => string;
  /** How far from a point a touch still counts as being on it, in points. */
  hitRadius?: number;
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
 * The touch target, the selection it drives, and the readout that follows it.
 *
 * A line chart's crosshair snaps to an x index. That is not available here:
 * there is no shared x, and two points can sit on the same one. So the nearest
 * point is found by distance instead — and only within `hitRadius`, so a touch
 * in an empty corner selects nothing rather than lighting up whichever point is
 * least far away.
 *
 * The search runs on the UI thread over a flat array of already-projected
 * coordinates, and only the *identity* of the winner crosses back into JS, and
 * only when it changes. A drag across the plot therefore costs a handful of
 * re-renders rather than one per frame.
 *
 * Distances are compared squared. The nearest point by distance is the nearest
 * by distance-squared, and a square root per point per frame buys nothing.
 */
function ScatterChartTooltip({
  showLabel = true,
  formatX,
  formatY,
  formatTitle,
  hitRadius = HIT_RADIUS,
  activateAfterLongPress = DEFAULT_HOLD,
}: ScatterChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    series,
    xExtent,
    yExtent,
    activeId,
    activePoint,
    setActivePoint,
    status,
  } = useChart('ScatterChart.Tooltip');

  const seriesKeys = series.map(([key]) => key).join('|');

  /*
   * Every point in the chart, projected once, as parallel arrays.
   *
   * Parallel arrays rather than an array of objects because this is read inside
   * a worklet: Reanimated has to copy whatever the gesture captures across to
   * the UI thread, and three number arrays cross far more cheaply than a few
   * hundred small objects.
   *
   * Projected against the *settled* extents rather than the tweening shared
   * values. Hit-testing against a moving scale would mean rebuilding this on
   * every frame of a domain animation, and a point being half a second stale
   * during a transition is not something a finger can notice.
   */
  const hit = useMemo(() => {
    const keys = seriesKeys ? seriesKeys.split('|') : [];
    const xs: number[] = [];
    const ys: number[] = [];
    const ids: string[] = [];
    const indices: number[] = [];
    const owners: string[] = [];

    for (const key of keys) {
      for (let index = 0; index < data.length; index += 1) {
        const row = data[index]!;
        const x = row[xDataKey];
        const y = row[key];
        if (typeof x !== 'number' || Number.isNaN(x)) continue;
        if (typeof y !== 'number' || Number.isNaN(y)) continue;
        xs.push(xAt(x, plot, xExtent[0], xExtent[1]));
        ys.push(yOf(y, plot, yExtent[0], yExtent[1]));
        ids.push(`${key}:${index}`);
        indices.push(index);
        owners.push(key);
      }
    }

    return { xs, ys, ids, indices, owners };
  }, [data, xDataKey, seriesKeys, plot, xExtent, yExtent]);

  // Resolves an id, which is all the worklet can cheaply hand back. JS turns it
  // into the row it came from.
  const select = useMemo(
    () => (id: string) => {
      if (!id) {
        setActivePoint(null);
        return;
      }
      const at = hit.ids.indexOf(id);
      if (at < 0) {
        setActivePoint(null);
        return;
      }
      const index = hit.indices[at]!;
      const key = hit.owners[at]!;
      const datum = data[index];
      if (!datum) {
        setActivePoint(null);
        return;
      }
      setActivePoint({
        index,
        dataKey: key,
        x: datum[xDataKey] as number,
        y: datum[key] as number,
        datum,
      });
    },
    [hit, data, xDataKey, setActivePoint]
  );

  /*
   * Built in one closure, and everything it captures is a plain array, a number
   * or a shared value. A worklet may only call another worklet, and the rule is
   * enforced by crashing rather than by warning — so the resolver is declared
   * here, next to its callers, rather than as a helper elsewhere in the file
   * where it would be easy to leave un-workletised.
   */
  const pan = useMemo(() => {
    const xs = hit.xs;
    const ys = hit.ys;
    const ids = hit.ids;
    const limit = hitRadius * hitRadius;

    const resolve = (px: number, py: number) => {
      'worklet';
      let bestId = '';
      let best = limit;
      for (let i = 0; i < xs.length; i += 1) {
        const dx = xs[i]! - px;
        const dy = ys[i]! - py;
        const distance = dx * dx + dy * dy;
        if (distance <= best) {
          best = distance;
          bestId = ids[i]!;
        }
      }
      if (bestId === activeId.value) return;
      activeId.value = bestId;
      runOnJS(select)(bestId);
    };

    const clear = () => {
      'worklet';
      if (activeId.value === '') return;
      activeId.value = '';
      runOnJS(select)('');
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
        clear();
      });
  }, [hit, hitRadius, activeId, select, activateAfterLongPress]);

  // The readout sits above the point and is clamped inside the plot, so it
  // never runs off an edge at an extreme value.
  const labelStyle = useAnimatedStyle(() => {
    const id = activeId.value;
    if (!id) return { opacity: 0 };
    const at = hit.ids.indexOf(id);
    if (at < 0) return { opacity: 0 };
    const x = hit.xs[at]!;
    const y = hit.ys[at]!;
    const half = LABEL_WIDTH / 2;
    return {
      opacity: 1,
      transform: [
        {
          translateX: Math.min(
            plot.left + plot.width - half,
            Math.max(plot.left + half, x)
          ) - half,
        },
        // Above the point, and pushed below it near the top of the plot where
        // there is no room above.
        { translateY: y - plot.top < LABEL_HEIGHT ? y + 16 : y - LABEL_HEIGHT },
      ],
    };
  });

  const fmtX = formatX ?? ((value: number) => compactNumber(value));
  const fmtY = formatY ?? ((value: number) => compactNumber(value));

  if (status === 'loading') return null;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        {showLabel ? (
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', left: 0, top: 0, width: LABEL_WIDTH },
              labelStyle,
            ]}
          >
            <View className="items-center rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg">
              {activePoint ? (
                <>
                  {formatTitle ? (
                    <Text size="xs" muted numberOfLines={1}>
                      {formatTitle(activePoint.datum)}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center gap-1.5">
                    {series.length > 1 ? (
                      <View
                        style={{
                          backgroundColor:
                            series.find(([key]) => key === activePoint.dataKey)?.[1] ?? undefined,
                        }}
                        className="h-1.5 w-1.5 rounded-full"
                      />
                    ) : null}
                    <Text size="sm" weight="semibold" numberOfLines={1}>
                      {fmtX(activePoint.x)} · {fmtY(activePoint.y, activePoint.dataKey)}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
ScatterChartTooltip.displayName = 'ScatterChart.Tooltip';
ScatterChartTooltip.layer = 'overlay' as Layer;

export interface ScatterChartLegendProps extends ViewProps {
  className?: string;
  /** Label per series key. A key with no label falls back to the key itself. */
  labels?: Record<string, string>;
}

/**
 * A swatch and a name per registered series. Sits in the top-left of the plot
 * by default — move it with `className`.
 */
function ScatterChartLegend({ className, labels, ...props }: ScatterChartLegendProps) {
  const { series } = useChart('ScatterChart.Legend');
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
ScatterChartLegend.displayName = 'ScatterChart.Legend';
ScatterChartLegend.layer = 'overlay' as Layer;

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

export interface ScatterChartHeaderProps extends ViewProps {
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
   * `ScatterChart.Legend` on a chart that has a header: the legend floats over
   * the plot, where it competes with the points for the same corner.
   */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it currently reads, and
 * what the colours mean.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActivePointChange` and pass the
 * formatted string down, so one header can show a summary when nothing is
 * pressed and a point's values when something is.
 */
function ScatterChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: ScatterChartHeaderProps) {
  const { series } = useChart('ScatterChart.Header');
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
    <View {...props} className={cn('flex-row items-start justify-between gap-3 pb-3', className)}>
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
ScatterChartHeader.displayName = 'ScatterChart.Header';
ScatterChartHeader.layer = 'header' as Layer;

export const ScatterChart = Object.assign(ScatterChartRoot, {
  Header: ScatterChartHeader,
  Grid: ScatterChartGrid,
  Points: ScatterChartPoints,
  Skeleton: ScatterChartSkeleton,
  XAxis: ScatterChartXAxis,
  YAxis: ScatterChartYAxis,
  Tooltip: ScatterChartTooltip,
  Legend: ScatterChartLegend,
});
