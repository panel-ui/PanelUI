/**
 * MirrorAreaChart — two readings of one timeline, one above a baseline and one
 * below it.
 *
 * ```tsx
 * <MirrorAreaChart data={load} xDataKey="time">
 *   <MirrorAreaChart.Grid />
 *   <MirrorAreaChart.Area dataKey="jobs" label="jobs" muted />
 *   <MirrorAreaChart.Area dataKey="high" label="high priority" />
 *   <MirrorAreaChart.Area dataKey="share" label="% high" side="bottom" />
 *   <MirrorAreaChart.Baseline />
 *   <MirrorAreaChart.Tooltip />
 * </MirrorAreaChart>
 * ```
 *
 * ## Two scales, one timeline
 *
 * Each half has its own scale, because the two readings are usually in
 * different units — a count above and a percentage below, or requests above
 * and errors below. Both grow away from the baseline, so a peak in one lines
 * up with whatever the other did at the same moment, and neither is squeezed
 * into the other's range.
 *
 * Areas on the same side overlay in the order they are declared. Declare the
 * whole first and the part of it second, so the part is drawn inside the whole.
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
import { ChartAccessibilityData, type ChartAccessibilityProps } from '../../primitives/chart-accessibility';
import { finiteChartDomain } from '../../primitives/finite-chart';
import {
  columnValues,
  compactNumber,
  dotsPath,
  segment,
  useSeriesColor,
  xOf,
  type ChartCurve,
  type ChartPoint,
  type Plot,
  type SeriesColorIndex,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/** Left gutter reserved when a `YAxis` is present. */
const Y_AXIS_WIDTH = 40;

/** Gap between the value labels and the plot. */
const Y_AXIS_GUTTER = 6;

/** Box each x label is centred in. */
const POINT_LABEL_WIDTH = 56;

/** Line height of an `xs` label, for centring one on the line it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Width of the scrub readout. */
const READOUT_WIDTH = 168;

/** Diameter of the dot riding the top edge under the crosshair. */
const DOT = 9;

type Layer = 'svg' | 'series' | 'overlay' | 'header';

export type MirrorAreaChartStatus = 'loading' | 'ready';
export type MirrorAreaChartSide = 'top' | 'bottom';
export type MirrorAreaChartDatum = Record<string, string | number | null | undefined>;

interface MirrorSeries {
  key: string;
  color: string;
  label: string;
  side: MirrorAreaChartSide;
}

interface MirrorAreaChartContextValue {
  data: MirrorAreaChartDatum[];
  xDataKey: string;
  plot: Plot;
  pad: typeof PADDING;
  /** The y of the line both halves grow away from. */
  baseline: number;
  status: MirrorAreaChartStatus;
  curve: ChartCurve;
  series: MirrorSeries[];
  registerSeries: (series: MirrorSeries) => void;
  unregisterSeries: (key: string) => void;
  /** The value drawn at the top and bottom edges of the plot, as they tween. */
  topMax: SharedValue<number>;
  bottomMax: SharedValue<number>;
  /** The same two, settled, for labels that should not count up. */
  topExtent: number;
  bottomExtent: number;
  /** `0` flat on the baseline, `1` drawn in full. */
  grow: SharedValue<number>;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
}

const MirrorAreaChartContext = createContext<MirrorAreaChartContextValue | null>(null);

function useChart(component: string): MirrorAreaChartContextValue {
  const context = useContext(MirrorAreaChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <MirrorAreaChart>`);
  }
  return context;
}

/** The row under the crosshair, for a header or a readout outside the chart. */
export function useMirrorAreaChart() {
  const { data, activeIndexJS, xDataKey } = useChart('useMirrorAreaChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

/**
 * A series' edge, `grow` of the way out from the baseline. `direction` is `-1`
 * for the top half and `1` for the bottom. A negative value is drawn on the
 * baseline: each half only grows away from it.
 */
function edgeRuns(
  values: (number | null)[],
  plot: Plot,
  baseline: number,
  height: number,
  max: number,
  grow: number,
  direction: number
): ChartPoint[][] {
  'worklet';
  const runs: ChartPoint[][] = [];
  let run: ChartPoint[] = [];
  const span = max > 0 ? max : 1;
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === null || value === undefined) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    const reach = (Math.max(value, 0) / span) * height * grow;
    run.push({ x: xOf(i, values.length, plot), y: baseline + direction * reach });
  }
  if (run.length) runs.push(run);
  return runs;
}

function edgePath(runs: ChartPoint[][], curve: ChartCurve): string {
  'worklet';
  let d = '';
  for (const run of runs) d += `${segment(run, curve)} `;
  return d;
}

function fillPath(runs: ChartPoint[][], curve: ChartCurve, baseline: number): string {
  'worklet';
  let d = '';
  for (const run of runs) {
    const edge = segment(run, curve);
    if (!edge) continue;
    const first = run[0]!;
    const last = run[run.length - 1]!;
    d += `${edge} L${last.x},${baseline} L${first.x},${baseline} Z `;
  }
  return d;
}

/** The largest value on one side, padded so a peak does not touch the edge. */
function sideExtent(
  data: MirrorAreaChartDatum[],
  keys: string[],
  explicit: [number, number] | undefined
): number {
  if (explicit) return Math.max(explicit[1], 0) || 1;
  let max = 0;
  for (const row of data) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > max) max = value;
    }
  }
  return max > 0 ? max * 1.08 : 1;
}

export interface MirrorAreaChartProps
  extends ViewProps,
    ChartAccessibilityProps<MirrorAreaChartDatum> {
  className?: string;
  /** The rows. Each one is a point along the x-axis. */
  data: MirrorAreaChartDatum[];
  /** Key holding the x label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * How much of the plot's height sits above the baseline, from `0` to `1`.
   * Give the half you want read first the larger share.
   */
  split?: number;
  /**
   * Fix the top half's scale instead of deriving it from the data. Only the
   * upper end is used: the baseline is always zero.
   */
  topDomain?: [number, number];
  /** Fix the bottom half's scale. Only the upper end is used. */
  bottomDomain?: [number, number];
  /** `monotone` never overshoots between points; `linear` joins them straight. */
  curve?: ChartCurve;
  /**
   * `loading` holds the bands flat on the baseline and grows them out when it
   * turns `ready`. Add a `MirrorAreaChart.Skeleton` to show something meanwhile.
   */
  status?: MirrorAreaChartStatus;
  /** Width ÷ height. */
  aspectRatio?: number;
  /** Milliseconds for the bands to grow out on mount. */
  animationDuration?: number;
  /** Milliseconds for either scale to settle after the data changes. */
  domainDuration?: number;
  /**
   * The point under the crosshair as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: MirrorAreaChartDatum | null) => void;
  /** Drop the axis padding so the bands reach the edges, for a sparkline. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal on demand, for a "replay" control. */
export interface MirrorAreaChartHandle {
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

const MirrorAreaChartRoot = forwardRef<MirrorAreaChartHandle, MirrorAreaChartProps>(
  function MirrorAreaChartRoot(
    {
      className,
      data,
      xDataKey = 'date',
      split = 0.55,
      topDomain,
      bottomDomain,
      curve = 'monotone',
      status = 'ready',
      aspectRatio = 1.6,
      animationDuration = 700,
      domainDuration = 500,
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
    const [registered, setRegistered] = useState<MirrorSeries[]>([]);
    const [activeIndexJS, setActiveIndexJS] = useState(-1);

    const grow = useSharedValue(0);
    const topMax = useSharedValue(0);
    const bottomMax = useSharedValue(0);
    const activeIndex = useSharedValue(-1);
    const reducedMotion = useReducedMotion();

    const registerSeries = useMemo(
      () => (entry: MirrorSeries) =>
        setRegistered((current) => {
          const existing = current.find((item) => item.key === entry.key);
          if (
            existing &&
            existing.color === entry.color &&
            existing.label === entry.label &&
            existing.side === entry.side
          ) {
            return current;
          }
          return [...current.filter((item) => item.key !== entry.key), entry];
        }),
      []
    );

    const unregisterSeries = useMemo(
      () => (key: string) =>
        setRegistered((current) => current.filter((item) => item.key !== key)),
      []
    );

    /*
     * The order the areas were declared in, read from the children rather than
     * from registration: an area re-registers when its colour resolves, and
     * appending it again would reorder the legend and the readout.
     */
    const { hasYAxis, order } = useMemo(() => {
      let axis = false;
      const keys: string[] = [];
      Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const type = child.type as { axis?: string; area?: boolean };
        const childProps = child.props as { dataKey?: string };
        if (type.axis === 'y') axis = true;
        if (type.area && typeof childProps.dataKey === 'string') keys.push(childProps.dataKey);
      });
      return { hasYAxis: axis, order: keys.join('|') };
    }, [children]);

    const series = useMemo(() => {
      const declared = order ? order.split('|') : [];
      const position = (key: string) => {
        const index = declared.indexOf(key);
        return index === -1 ? declared.length : index;
      };
      return [...registered].sort((a, b) => position(a.key) - position(b.key));
    }, [registered, order]);

    const pad = compact
      ? { top: 2, right: 1, bottom: 2, left: 1 }
      : { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };
    const share = Math.min(Math.max(Number.isFinite(split) ? split : 0.55, 0.1), 0.9);
    const baseline = plot.top + plot.height * share;

    const topKeys = series.filter((item) => item.side === 'top').map((item) => item.key).join('|');
    const bottomKeys = series
      .filter((item) => item.side === 'bottom')
      .map((item) => item.key)
      .join('|');
    const safeTop = finiteChartDomain(topDomain);
    const safeBottom = finiteChartDomain(bottomDomain);
    const topExtent = useMemo(
      () => sideExtent(data, topKeys ? topKeys.split('|') : [], safeTop),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [data, topKeys, safeTop?.[0], safeTop?.[1]]
    );
    const bottomExtent = useMemo(
      () => sideExtent(data, bottomKeys ? bottomKeys.split('|') : [], safeBottom),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [data, bottomKeys, safeBottom?.[0], safeBottom?.[1]]
    );

    const loading = status === 'loading';

    useEffect(() => {
      if (loading) return;
      const first = topMax.value === 0 && bottomMax.value === 0;
      if (first || reducedMotion) {
        topMax.value = topExtent;
        bottomMax.value = bottomExtent;
        return;
      }
      topMax.value = withTiming(topExtent, { duration: domainDuration });
      bottomMax.value = withTiming(bottomExtent, { duration: domainDuration });
    }, [topExtent, bottomExtent, loading, reducedMotion, domainDuration, topMax, bottomMax]);

    const revealed = useRef(false);
    const playReveal = useMemo(
      () => () => {
        if (reducedMotion) {
          grow.value = 1;
          return;
        }
        grow.value = 0;
        grow.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
      },
      [reducedMotion, animationDuration, grow]
    );

    useEffect(() => {
      // Going back to `loading` lays the bands flat again, so a refetch grows
      // them out from the baseline instead of appearing complete.
      if (loading) {
        revealed.current = false;
        cancelAnimation(grow);
        grow.value = 0;
        return;
      }
      if (revealed.current || plot.width <= 0 || !data.length) return;
      revealed.current = true;
      playReveal();
    }, [loading, plot.width, data.length, playReveal, grow]);

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

    const context = useMemo<MirrorAreaChartContextValue>(
      () => ({
        data,
        xDataKey,
        plot,
        pad,
        baseline,
        status,
        curve,
        series,
        registerSeries,
        unregisterSeries,
        topMax,
        bottomMax,
        topExtent,
        bottomExtent,
        grow,
        activeIndex,
        activeIndexJS,
        setActiveIndexJS: handleActiveIndex,
      }),
      // `plot` and `pad` are rebuilt every render from `size`, so they are
      // compared by value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        data,
        xDataKey,
        plot.width,
        plot.height,
        plot.left,
        plot.top,
        pad.right,
        baseline,
        status,
        curve,
        series,
        registerSeries,
        unregisterSeries,
        topMax,
        bottomMax,
        topExtent,
        bottomExtent,
        grow,
        activeIndex,
        activeIndexJS,
        handleActiveIndex,
      ]
    );

    const { svg, series: seriesLayer, overlay, header } = partition(children);

    return (
      <MirrorAreaChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Mirror area chart"
            data={data}
            disabled={accessible === false || loading}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
            valueOf={(datum) => [
              [xDataKey, datum[xDataKey]],
              ...series.map((item) => [item.label, datum[item.key]] as [string, unknown]),
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
                {/*
                 * One drawing, with the bands in their own group above the grid.
                 * The bands grow out from the baseline by redrawing their paths
                 * on the UI thread, so there is no clip to animate — and so
                 * nothing that Android's SVG clip handling can drop.
                 */}
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  {svg}
                  <G>{seriesLayer}</G>
                </Svg>
                {overlay}
              </>
            ) : null}
          </View>
        </View>
      </MirrorAreaChartContext.Provider>
    );
  }
);
MirrorAreaChartRoot.displayName = 'MirrorAreaChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface MirrorAreaChartGridProps {
  /** `dots` is a field of points; `lines` is dashed rules across each half. */
  variant?: 'dots' | 'lines';
  /** Distance between dots, or how many rules each half gets. */
  spacing?: number;
  color?: string;
  opacity?: number;
}

/**
 * The texture behind the bands. Dots by default, which mark the plot's extent
 * without drawing lines that compete with the baseline.
 */
function MirrorAreaChartGrid({ variant = 'dots', spacing, color, opacity = 1 }: MirrorAreaChartGridProps) {
  const { plot, baseline } = useChart('MirrorAreaChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.1)');

  const dots = useMemo(() => {
    if (variant !== 'dots') return '';
    const gap = Math.max(spacing ?? 12, 4);
    const points: ChartPoint[] = [];
    const columns = Math.floor(plot.width / gap);
    const offsetX = plot.left + (plot.width - columns * gap) / 2;
    // Rows are laid out from the baseline in both directions, so one row
    // always lies on it and the pattern is symmetrical about it.
    for (let y = baseline; y >= plot.top - 0.5; y -= gap) {
      for (let c = 0; c <= columns; c += 1) points.push({ x: offsetX + c * gap, y });
    }
    for (let y = baseline + gap; y <= plot.top + plot.height + 0.5; y += gap) {
      for (let c = 0; c <= columns; c += 1) points.push({ x: offsetX + c * gap, y });
    }
    return dotsPath(points, 0.9);
  }, [variant, spacing, plot.left, plot.top, plot.width, plot.height, baseline]);

  if (variant === 'dots') {
    return <Path d={dots} fill={stroke} opacity={opacity} />;
  }

  const rules = Math.max(Math.round(spacing ?? 2), 1);
  const lines: number[] = [];
  for (let i = 1; i <= rules; i += 1) {
    lines.push(baseline - ((baseline - plot.top) * i) / rules);
    lines.push(baseline + ((plot.top + plot.height - baseline) * i) / rules);
  }

  return (
    <G opacity={opacity}>
      {lines.map((y) => (
        <SvgLine
          key={y}
          x1={plot.left}
          x2={plot.left + plot.width}
          y1={y}
          y2={y}
          stroke={stroke}
          strokeDasharray="4,6"
          strokeWidth={1}
        />
      ))}
    </G>
  );
}
MirrorAreaChartGrid.displayName = 'MirrorAreaChart.Grid';
MirrorAreaChartGrid.layer = 'svg' as Layer;

export interface MirrorAreaChartBaselineProps {
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * The line both halves grow away from. Declare it after the areas so it is
 * drawn over their bases.
 */
function MirrorAreaChartBaseline({ color, strokeWidth = 1, opacity = 0.5 }: MirrorAreaChartBaselineProps) {
  const { plot, baseline } = useChart('MirrorAreaChart.Baseline');
  const token = useCSSVariable('--color-muted-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#737373');

  return (
    <SvgLine
      x1={plot.left}
      x2={plot.left + plot.width}
      y1={baseline}
      y2={baseline}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
    />
  );
}
MirrorAreaChartBaseline.displayName = 'MirrorAreaChart.Baseline';
MirrorAreaChartBaseline.layer = 'series' as Layer;

export interface MirrorAreaChartAreaProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Which half it is drawn in. */
  side?: MirrorAreaChartSide;
  /** The name shown by the readout and the legend. Defaults to `dataKey`. */
  label?: string;
  /** Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. */
  color?: string;
  /** Which of the five chart tokens to take. */
  colorIndex?: SeriesColorIndex;
  /**
   * Draw it in the muted foreground colour instead, for a total that the
   * coloured areas are parts of.
   */
  muted?: boolean;
  /** Opacity of the fill at the band's outer edge. */
  fillOpacity?: number;
  /** Opacity of the fill at the baseline. Defaults to `fillOpacity`, a flat fill. */
  gradientToOpacity?: number;
  /** Draw the line along the band's outer edge. */
  showLine?: boolean;
  /** Thickness of that line. */
  strokeWidth?: number;
}

/**
 * One band, growing away from the baseline on its side. Areas on one side
 * overlay in declaration order, so a whole declared first is drawn behind a
 * part of it declared second.
 */
function MirrorAreaChartArea({
  dataKey,
  side = 'top',
  label,
  color,
  colorIndex = 1,
  muted = false,
  fillOpacity,
  gradientToOpacity,
  showLine = true,
  strokeWidth = 1.5,
}: MirrorAreaChartAreaProps) {
  const {
    data,
    plot,
    baseline,
    curve,
    registerSeries,
    unregisterSeries,
    topMax,
    bottomMax,
    grow,
  } = useChart('MirrorAreaChart.Area');

  const seriesColor = useSeriesColor(color, colorIndex);
  const mutedToken = useCSSVariable('--color-muted-foreground');
  const stroke = muted && !color ? (typeof mutedToken === 'string' ? mutedToken : '#737373') : seriesColor;
  const name = label ?? dataKey;
  const gradientId = `panelui-mirror-fill-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const outer = fillOpacity ?? (muted ? 0.22 : 0.3);
  const inner = gradientToOpacity ?? outer;

  useEffect(() => {
    registerSeries({ key: dataKey, color: stroke, label: name, side });
  }, [dataKey, stroke, name, side, registerSeries]);

  useEffect(() => () => unregisterSeries(dataKey), [dataKey, unregisterSeries]);

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);
  const top = side === 'top';
  const height = top ? baseline - plot.top : plot.top + plot.height - baseline;

  const fillProps = useAnimatedProps(() => {
    const runs = edgeRuns(
      values,
      plot,
      baseline,
      height,
      top ? topMax.value : bottomMax.value,
      grow.value,
      top ? -1 : 1
    );
    return { d: fillPath(runs, curve, baseline) };
  });

  const lineProps = useAnimatedProps(() => {
    const runs = edgeRuns(
      values,
      plot,
      baseline,
      height,
      top ? topMax.value : bottomMax.value,
      grow.value,
      top ? -1 : 1
    );
    return { d: edgePath(runs, curve) };
  });

  return (
    <G>
      <Defs>
        {/* Top to bottom in the band's own box: the outer edge is at the top
            of a top band and at the bottom of a bottom one. */}
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={top ? outer : inner} />
          <Stop offset="1" stopColor={stroke} stopOpacity={top ? inner : outer} />
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
MirrorAreaChartArea.displayName = 'MirrorAreaChart.Area';
MirrorAreaChartArea.layer = 'series' as Layer;
// Read by the root, for the order the areas were declared in.
MirrorAreaChartArea.area = true as const;

export interface MirrorAreaChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
}

/**
 * The loading state: a low band either side of the baseline with a highlight
 * travelling across it. Flat, so it says where the bands will be and nothing
 * about their shape.
 */
function MirrorAreaChartSkeleton({ duration = 1400, color }: MirrorAreaChartSkeletonProps) {
  const { plot, baseline, status } = useChart('MirrorAreaChart.Skeleton');
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

  const animatedProps = useAnimatedProps(() => ({
    x1: `${(sweep.value * 1.4 - 0.4) * 100}%`,
    x2: `${(sweep.value * 1.4 - 0.4 + 0.4) * 100}%`,
  }));

  if (!loading) return null;

  const above = (baseline - plot.top) * 0.18;
  const below = (plot.top + plot.height - baseline) * 0.18;
  const gradientId = 'panelui-mirror-skeleton';

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
        y={baseline - above}
        width={plot.width}
        height={above + below}
        fill={`url(#${gradientId})`}
      />
    </G>
  );
}
MirrorAreaChartSkeleton.displayName = 'MirrorAreaChart.Skeleton';
MirrorAreaChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface MirrorAreaChartXAxisProps {
  ticks?: number;
  format?: (datum: MirrorAreaChartDatum, index: number) => string;
  className?: string;
}

/** The x labels. Real text, so they follow the theme's font and text scaling. */
function MirrorAreaChartXAxis({ ticks = 4, format, className }: MirrorAreaChartXAxisProps) {
  const { data, xDataKey, plot, pad } = useChart('MirrorAreaChart.XAxis');

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
            left: Math.max(
              0,
              Math.min(
                xOf(label.key, data.length, plot) - POINT_LABEL_WIDTH / 2,
                plot.left + plot.width + pad.right - POINT_LABEL_WIDTH
              )
            ),
            width: POINT_LABEL_WIDTH,
            textAlign: 'center',
          }}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}
MirrorAreaChartXAxis.displayName = 'MirrorAreaChart.XAxis';
MirrorAreaChartXAxis.layer = 'overlay' as Layer;

export interface MirrorAreaChartYAxisProps {
  /** Format a value in the top half. */
  formatTop?: (value: number) => string;
  /** Format a value in the bottom half. */
  formatBottom?: (value: number) => string;
  className?: string;
}

/**
 * Three labels down the side: the top half's maximum, zero on the baseline,
 * and the bottom half's maximum. Two scales need two labels, and a column of
 * evenly spaced numbers would suggest one.
 */
function MirrorAreaChartYAxis({ formatTop, formatBottom, className }: MirrorAreaChartYAxisProps) {
  const { plot, baseline, topExtent, bottomExtent } = useChart('MirrorAreaChart.YAxis');
  const width = Math.max(plot.left - Y_AXIS_GUTTER, 0);
  const fmtTop = formatTop ?? compactNumber;
  const fmtBottom = formatBottom ?? compactNumber;

  const labels = [
    { key: 'top', y: plot.top, text: fmtTop(topExtent) },
    { key: 'zero', y: baseline, text: '0' },
    { key: 'bottom', y: plot.top + plot.height, text: fmtBottom(bottomExtent) },
  ];

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
            left: 0,
            top: label.y - AXIS_LABEL_HEIGHT / 2,
            width,
            textAlign: 'right',
          }}
        >
          {label.text}
        </Text>
      ))}
    </View>
  );
}
MirrorAreaChartYAxis.displayName = 'MirrorAreaChart.YAxis';
MirrorAreaChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which leaves room for the labels before laying the plot out.
MirrorAreaChartYAxis.axis = 'y' as const;

export interface MirrorAreaChartTooltipProps {
  /** Colour of the crosshair and the dot. Defaults to the foreground token. */
  color?: string;
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: MirrorAreaChartDatum) => string;
  /**
   * One line to show instead of a row per series — "1,120 jobs · 78% high".
   * Use it when the series only make sense read together.
   */
  formatSummary?: (datum: MirrorAreaChartDatum) => string;
  className?: string;
}

/**
 * A dashed crosshair, a dot on the outer edge of the top half, and a readout
 * beside them. The hit area is the whole plot.
 */
function MirrorAreaChartTooltip({
  color,
  formatValue,
  formatX,
  formatSummary,
  className,
}: MirrorAreaChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    baseline,
    series,
    topMax,
    bottomMax,
    grow,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('MirrorAreaChart.Tooltip');

  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');
  const background = useCSSVariable('--color-background');
  const ring = typeof background === 'string' ? background : 'white';

  const total = data.length;
  const left = plot.left;
  const width = plot.width;

  // Declared inside the memo, next to its callers: a worklet may only call
  // another worklet.
  const pan = useMemo(() => {
    const resolve = (x: number) => {
      'worklet';
      if (total < 1 || width <= 0) return;
      const ratio = total < 2 ? 0 : (x - left) / width;
      const next = Math.round(Math.min(1, Math.max(0, ratio)) * (total - 1));
      if (next === activeIndex.value) return;
      activeIndex.value = next;
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

  /*
   * The dot sits on the outermost edge on the top half — the largest value of
   * any top area at that point — or on the bottom half's when there is no top.
   */
  const topSeries = series.filter((item) => item.side === 'top');
  const dotSide: MirrorAreaChartSide = topSeries.length ? 'top' : 'bottom';
  const dotValues = useMemo(() => {
    const keys = series.filter((item) => item.side === dotSide).map((item) => item.key);
    return data.map((row) => {
      let most: number | null = null;
      for (const key of keys) {
        const value = row[key];
        if (typeof value === 'number' && Number.isFinite(value) && (most === null || value > most)) {
          most = value;
        }
      }
      return most;
    });
  }, [data, series, dotSide]);

  const topHeight = baseline - plot.top;
  const bottomHeight = plot.top + plot.height - baseline;

  const dotProps = useAnimatedProps(() => {
    const index = activeIndex.value;
    const value = index >= 0 ? dotValues[index] : null;
    if (index < 0 || value === null || value === undefined) return { opacity: 0, cx: 0, cy: 0 };
    const up = dotSide === 'top';
    const max = up ? topMax.value : bottomMax.value;
    const reach = (Math.max(value, 0) / (max > 0 ? max : 1)) * (up ? topHeight : bottomHeight) * grow.value;
    return { opacity: 1, cx: xOf(index, total, plot), cy: baseline + (up ? -reach : reach) };
  });

  const crosshairProps = useAnimatedProps(() => {
    const index = activeIndex.value;
    const x = index < 0 ? 0 : xOf(index, total, plot);
    return { x1: x, x2: x, opacity: index < 0 ? 0 : 0.6 };
  });

  // Beside the crosshair, on whichever side has room, so it never covers the
  // point it describes.
  const readoutStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = xOf(index, total, plot);
    const gap = 10;
    const fitsLeft = x - gap - READOUT_WIDTH >= plot.left;
    const at = fitsLeft ? x - gap - READOUT_WIDTH : Math.min(x + gap, plot.left + plot.width - READOUT_WIDTH);
    return { opacity: 1, transform: [{ translateX: at }] };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: MirrorAreaChartDatum) => String(datum[xDataKey] ?? ''));

  if (status === 'loading') return null;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedLine
            animatedProps={crosshairProps}
            y1={plot.top}
            y2={plot.top + plot.height}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray="3,4"
          />
          <AnimatedCircle
            animatedProps={dotProps}
            r={DOT / 2}
            fill={stroke}
            stroke={ring}
            strokeWidth={2}
          />
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: plot.top, width: READOUT_WIDTH },
            readoutStyle,
          ]}
        >
          {active ? (
            <View
              className={cn(
                'gap-0.5 rounded-xl border border-border bg-popover px-2.5 py-1.5 shadow-lg',
                className
              )}
            >
              <Text size="xs" muted numberOfLines={1}>
                {fmtX(active)}
              </Text>
              {formatSummary ? (
                <Text size="xs" weight="semibold" numberOfLines={2}>
                  {formatSummary(active)}
                </Text>
              ) : (
                series.map((item) => {
                  const value = active[item.key];
                  if (typeof value !== 'number') return null;
                  return (
                    <View key={item.key} className="flex-row items-center gap-1.5">
                      <View
                        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }}
                      />
                      <Text size="xs" weight="medium">
                        {fmtValue(value, item.key)}
                      </Text>
                      <Text size="xs" muted numberOfLines={1} className="shrink">
                        {item.label}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
MirrorAreaChartTooltip.displayName = 'MirrorAreaChart.Tooltip';
MirrorAreaChartTooltip.layer = 'overlay' as Layer;

export interface MirrorAreaChartLegendProps extends ViewProps {
  className?: string;
}

/** A swatch and a name per area, top half first. */
function MirrorAreaChartLegend({ className, ...props }: MirrorAreaChartLegendProps) {
  const { series } = useChart('MirrorAreaChart.Legend');
  if (!series.length) return null;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-0 flex-row flex-wrap gap-3', className)}
    >
      {sidesInOrder(series).map((item) => (
        <SeriesSwatch key={item.key} color={item.color} label={item.label} />
      ))}
    </View>
  );
}
MirrorAreaChartLegend.displayName = 'MirrorAreaChart.Legend';
MirrorAreaChartLegend.layer = 'overlay' as Layer;

/** Top-half areas first, then the bottom half's, each in declaration order. */
function sidesInOrder(series: MirrorSeries[]): MirrorSeries[] {
  return [
    ...series.filter((item) => item.side === 'top'),
    ...series.filter((item) => item.side === 'bottom'),
  ];
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

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface MirrorAreaChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the chart is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a total. */
  caption?: string;
  /** Draw a swatch and a name per area along the trailing edge. */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of and what it currently reads.
 * The value is not derived here — pass the formatted string, from
 * `onActiveIndexChange` if it follows the finger.
 */
function MirrorAreaChartHeader({
  className,
  title,
  value,
  caption,
  legend = false,
  children,
  ...props
}: MirrorAreaChartHeaderProps) {
  const { series } = useChart('MirrorAreaChart.Header');
  const trailing =
    children ??
    (legend && series.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {sidesInOrder(series).map((item) => (
          <SeriesSwatch key={item.key} color={item.color} label={item.label} />
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
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
MirrorAreaChartHeader.displayName = 'MirrorAreaChart.Header';
MirrorAreaChartHeader.layer = 'header' as Layer;

export const MirrorAreaChart = Object.assign(MirrorAreaChartRoot, {
  Header: MirrorAreaChartHeader,
  Grid: MirrorAreaChartGrid,
  Area: MirrorAreaChartArea,
  Baseline: MirrorAreaChartBaseline,
  Skeleton: MirrorAreaChartSkeleton,
  XAxis: MirrorAreaChartXAxis,
  YAxis: MirrorAreaChartYAxis,
  Tooltip: MirrorAreaChartTooltip,
  Legend: MirrorAreaChartLegend,
});
