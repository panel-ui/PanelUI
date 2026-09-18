/**
 * BumpChart — how a set of things ranked against each other over time.
 *
 * ```tsx
 * <BumpChart data={standings} xDataKey="week" defaultHighlight="harbour">
 *   <BumpChart.Grid />
 *   <BumpChart.Line dataKey="harbour" label="Harbour" />
 *   <BumpChart.Line dataKey="northside" label="Northside" />
 *   <BumpChart.YAxis />
 *   <BumpChart.XAxis />
 *   <BumpChart.Labels />
 *   <BumpChart.Tooltip />
 * </BumpChart>
 * ```
 *
 * ## Positions, not values
 *
 * The y-axis is the rank, so the rows are evenly spaced whatever the gap
 * between the underlying scores. That is the point of the chart: who passed
 * whom, and when. A line chart of the same scores answers how far apart they
 * were, and loses the order wherever two lines run close together.
 *
 * Pass the ranks directly, or pass the scores with `values="score"` and each
 * column is ranked for you, highest first. `bumpRanks` is exported so a header
 * or a table beside the chart can read the same order the chart drew.
 *
 * ## One line at a time
 *
 * Past three or four series, every line in its own colour is a tangle. The
 * chart reads best with one line picked out: `highlight` draws that one in its
 * colour and on top, and the rest in a muted grey. Tapping a name in
 * `BumpChart.Labels` picks that line, and tapping it again clears it.
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
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, G, Line as SvgLine, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { Text } from '../../primitives/text';
import { ChartAccessibilityData, type ChartAccessibilityProps } from '../../primitives/chart-accessibility';
import { useControllableState } from '../../primitives/controllable-state';
import { finiteChartNumber } from '../../primitives/finite-chart';
import {
  bumpSegment,
  colorStop,
  dotsPath,
  useSeriesColor,
  xOf,
  type ChartPoint,
  type Plot,
  type SeriesColorIndex,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const PADDING = { top: 8, right: 10, bottom: 32, left: 10 };

/** Left gutter reserved when a `YAxis` is present, for `#1`…`#12`. */
const Y_AXIS_WIDTH = 34;

/** Gap between the rank labels and the first column. */
const Y_AXIS_GUTTER = 8;

/** Gap between the last column and the series names. */
const LABELS_GAP = 12;

/** Box each x label is centred in. */
const POINT_LABEL_WIDTH = 56;

/** Line height of an `xs` label, for centring one on the row it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Width of the scrub readout. */
const READOUT_WIDTH = 148;

/** How far the lines that are not picked out fade back. */
const DIMMED_OPACITY = 0.5;

type Layer = 'svg' | 'series' | 'overlay' | 'header';

export type BumpChartStatus = 'loading' | 'ready';
export type BumpChartDatum = Record<string, string | number | null | undefined>;

/** Ranks per series key, one entry per row. `null` where a series has none. */
export type BumpRanks = Record<string, (number | null)[]>;

/**
 * Each series' rank in every row.
 *
 * With `values: 'rank'` the rows already hold ranks and they are only
 * validated. With `values: 'score'` each row is ranked highest first; a tie
 * keeps the order the keys are passed in, so two equal scores never draw on
 * top of each other.
 */
export function bumpRanks(
  data: BumpChartDatum[],
  keys: string[],
  options: { values?: 'rank' | 'score' } = {}
): BumpRanks {
  const ranks: BumpRanks = {};
  for (const key of keys) ranks[key] = [];

  for (const row of data) {
    if (options.values === 'score') {
      const scored = keys
        .map((key, order) => ({ key, order, score: finiteChartNumber(row[key]) }))
        .filter((entry): entry is { key: string; order: number; score: number } =>
          entry.score !== undefined
        )
        .sort((a, b) => b.score - a.score || a.order - b.order);
      const place = new Map(scored.map((entry, index) => [entry.key, index + 1]));
      for (const key of keys) ranks[key]!.push(place.get(key) ?? null);
    } else {
      for (const key of keys) {
        const rank = finiteChartNumber(row[key]);
        ranks[key]!.push(rank !== undefined && rank >= 1 ? rank : null);
      }
    }
  }
  return ranks;
}

/**
 * Ranks as a fraction of the plot's height: `0` is the top row, `1` the
 * bottom. Stored this way so a line can travel between two charts with a
 * different number of rows without a jump.
 */
function rankFractions(ranks: BumpRanks, rows: number): BumpRanks {
  const out: BumpRanks = {};
  for (const key of Object.keys(ranks)) {
    out[key] = ranks[key]!.map((rank) =>
      rank === null ? null : rows <= 1 ? 0.5 : (rank - 1) / (rows - 1)
    );
  }
  return out;
}

/** A line's points at `progress` of the way between two sets of positions. */
function pointsAt(
  key: string,
  from: BumpRanks,
  to: BumpRanks,
  progress: number,
  plot: Plot
): ChartPoint[][] {
  'worklet';
  const target = to[key];
  if (!target) return [];
  const origin = from[key];
  const runs: ChartPoint[][] = [];
  let run: ChartPoint[] = [];
  for (let i = 0; i < target.length; i += 1) {
    const end = target[i];
    if (end === null || end === undefined) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    const start = origin?.[i];
    const fraction =
      start === null || start === undefined ? end : start + (end - start) * progress;
    run.push({ x: xOf(i, target.length, plot), y: plot.top + fraction * plot.height });
  }
  if (run.length) runs.push(run);
  return runs;
}

interface BumpSeries {
  key: string;
  color: string;
  label: string;
  strokeWidth: number;
  showDots: boolean;
}

interface BumpChartContextValue {
  data: BumpChartDatum[];
  xDataKey: string;
  plot: Plot;
  pad: typeof PADDING;
  status: BumpChartStatus;
  series: BumpSeries[];
  ranks: BumpRanks;
  rows: number;
  registerSeries: (series: BumpSeries) => void;
  unregisterSeries: (key: string) => void;
  from: SharedValue<BumpRanks>;
  to: SharedValue<BumpRanks>;
  morph: SharedValue<number>;
  highlight: string | null;
  setHighlight: (key: string | null) => void;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
}

const BumpChartContext = createContext<BumpChartContextValue | null>(null);

function useChart(component: string): BumpChartContextValue {
  const context = useContext(BumpChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BumpChart>`);
  }
  return context;
}

/** The row under the scrub, and which line is picked out. */
export function useBumpChart() {
  const { data, activeIndexJS, xDataKey, ranks, highlight, setHighlight } =
    useChart('useBumpChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
    ranks,
    highlight,
    setHighlight,
  };
}

export interface BumpChartProps extends ViewProps, ChartAccessibilityProps<BumpChartDatum> {
  className?: string;
  /** The rows. Each one is a column: a week, a round, a release. */
  data: BumpChartDatum[];
  /** Key holding the column's label. */
  xDataKey?: string;
  /**
   * What the series columns hold. `rank` (the default) takes them as places,
   * `1` at the top. `score` ranks every row for you, highest first.
   */
  values?: 'rank' | 'score';
  /**
   * The series drawn in its colour and on top, with the rest muted. `null`
   * picks none, and every line keeps its own colour. Controlled — pair it with
   * `onHighlightChange`.
   */
  highlight?: string | null;
  /** The series picked out on first render, when `highlight` is not passed. */
  defaultHighlight?: string | null;
  /** Called when a name in `BumpChart.Labels` is tapped. */
  onHighlightChange?: (key: string | null) => void;
  /**
   * `loading` hides the lines and shows `BumpChart.Skeleton` if there is one.
   * The lines are revealed when it turns `ready`.
   */
  status?: BumpChartStatus;
  /** Width ÷ height. */
  aspectRatio?: number;
  /** Milliseconds for the reveal on mount. */
  animationDuration?: number;
  /** Milliseconds for the lines to move to new places when the data changes. */
  morphDuration?: number;
  /**
   * The column under the scrub as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: BumpChartDatum | null) => void;
  /** Drop the axis padding, for a chart with no axes. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the reveal on demand, for a "replay" control. */
export interface BumpChartHandle {
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

/**
 * What the root needs to know about its children before it lays the plot out:
 * whether an axis or the names want room at the sides, and the order the lines
 * were declared in.
 */
function survey(children: ReactNode) {
  let hasYAxis = false;
  let labelsWidth = 0;
  const order: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = child.type as { axis?: string; labels?: boolean; line?: boolean };
    const props = child.props as { dataKey?: string; width?: number };
    if (type.axis === 'y') hasYAxis = true;
    if (type.labels) labelsWidth = props.width ?? DEFAULT_LABELS_WIDTH;
    if (type.line && typeof props.dataKey === 'string') order.push(props.dataKey);
  });
  return { hasYAxis, labelsWidth, order };
}

const BumpChartRoot = forwardRef<BumpChartHandle, BumpChartProps>(function BumpChartRoot(
  {
    className,
    data,
    xDataKey = 'date',
    values = 'rank',
    highlight: highlightProp,
    defaultHighlight = null,
    onHighlightChange,
    status = 'ready',
    aspectRatio = 1.7,
    animationDuration = 700,
    morphDuration = 500,
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
  const [registered, setRegistered] = useState<BumpSeries[]>([]);
  const [activeIndexJS, setActiveIndexJS] = useState(-1);

  const reveal = useSharedValue(0);
  const morph = useSharedValue(1);
  const activeIndex = useSharedValue(-1);
  const reducedMotion = useReducedMotion();

  const { value: highlight, setValue: setHighlight } = useControllableState<string | null>({
    value: highlightProp,
    defaultValue: defaultHighlight,
    onChange: onHighlightChange,
  });

  const registerSeries = useMemo(
    () => (entry: BumpSeries) =>
      setRegistered((current) => {
        const existing = current.find((item) => item.key === entry.key);
        if (
          existing &&
          existing.color === entry.color &&
          existing.label === entry.label &&
          existing.strokeWidth === entry.strokeWidth &&
          existing.showDots === entry.showDots
        ) {
          return current;
        }
        return [...current.filter((item) => item.key !== entry.key), entry];
      }),
    []
  );

  const unregisterSeries = useMemo(
    () => (key: string) => setRegistered((current) => current.filter((item) => item.key !== key)),
    []
  );

  const { hasYAxis, labelsWidth, order } = survey(children);
  const orderKey = order.join('|');

  /*
   * Declaration order, not registration order. A line re-registers when its
   * colour resolves or its label changes, which would otherwise move it to the
   * end of the list — and in `score` mode the order breaks ties.
   */
  const series = useMemo(() => {
    const declared = orderKey ? orderKey.split('|') : [];
    const position = (key: string) => {
      const index = declared.indexOf(key);
      return index === -1 ? declared.length : index;
    };
    return [...registered].sort((a, b) => position(a.key) - position(b.key));
  }, [registered, orderKey]);

  const pad = compact
    ? { top: 6, right: 6, bottom: 6, left: 6 }
    : {
        ...PADDING,
        left: hasYAxis ? Y_AXIS_WIDTH + Y_AXIS_GUTTER : PADDING.left,
        right: labelsWidth ? labelsWidth + LABELS_GAP : PADDING.right,
      };
  const plot: Plot = {
    left: pad.left,
    top: pad.top,
    width: Math.max(size.width - pad.left - pad.right, 0),
    height: Math.max(size.height - pad.top - pad.bottom, 0),
  };

  const seriesKeys = series.map((item) => item.key).join('|');
  const ranks = useMemo(
    () => bumpRanks(data, seriesKeys ? seriesKeys.split('|') : [], { values }),
    [data, seriesKeys, values]
  );

  /** How many places there are: the lowest rank anybody holds. */
  const rows = useMemo(() => {
    let most = 0;
    for (const key of Object.keys(ranks)) {
      for (const rank of ranks[key]!) {
        if (rank !== null && rank > most) most = rank;
      }
    }
    return Math.max(most, 1);
  }, [ranks]);

  const fractions = useMemo(() => rankFractions(ranks, rows), [ranks, rows]);
  const from = useSharedValue<BumpRanks>(fractions);
  const to = useSharedValue<BumpRanks>(fractions);

  /*
   * A change of data moves every line from where it is drawn now to its new
   * place. "Where it is drawn now" is read on the UI thread, inside the same
   * worklet that starts the move, so a change landing mid-move carries on from
   * the lines' actual positions instead of snapping back to the last target.
   */
  const loading = status === 'loading';
  const settledOnce = useRef(false);
  useEffect(() => {
    if (!settledOnce.current || reducedMotion) {
      settledOnce.current = true;
      from.value = fractions;
      to.value = fractions;
      morph.value = 1;
      return;
    }
    runOnUI((next: BumpRanks, duration: number) => {
      'worklet';
      const progress = morph.value;
      const current: BumpRanks = {};
      const previousTo = to.value;
      const previousFrom = from.value;
      for (const key of Object.keys(next)) {
        const target = previousTo[key];
        const origin = previousFrom[key];
        current[key] = next[key]!.map((_unused, index) => {
          const end = target?.[index];
          if (end === null || end === undefined) return null;
          const start = origin?.[index];
          return start === null || start === undefined ? end : start + (end - start) * progress;
        });
      }
      from.value = current;
      to.value = next;
      morph.value = 0;
      morph.value = withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) });
    })(fractions, morphDuration);
  }, [fractions, reducedMotion, morphDuration, from, to, morph]);

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
    // Going back to `loading` arms the reveal again, so a refetched chart
    // draws itself in rather than appearing complete on the frame it lands.
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

  /*
   * The reveal widens past the plot's right edge by the dots' radius, so the
   * last column's dots are not cut in half when it finishes.
   */
  const revealWidth = plot.width + 8;
  const revealStyle = useAnimatedStyle(() => ({ width: revealWidth * reveal.value + 8 }));

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

  const context = useMemo<BumpChartContextValue>(
    () => ({
      data,
      xDataKey,
      plot,
      pad,
      status,
      series,
      ranks,
      rows,
      registerSeries,
      unregisterSeries,
      from,
      to,
      morph,
      highlight,
      setHighlight,
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
      pad.bottom,
      status,
      series,
      ranks,
      rows,
      registerSeries,
      unregisterSeries,
      from,
      to,
      morph,
      highlight,
      setHighlight,
      activeIndex,
      activeIndexJS,
      handleActiveIndex,
    ]
  );

  const { svg, series: seriesLayer, overlay, header } = partition(children);

  return (
    <BumpChartContext.Provider value={context}>
      <View {...props} style={props.style} className={cn('w-full', className)}>
        {header}
        <ChartAccessibilityData
          chart="Bump chart"
          data={data}
          disabled={accessible === false || loading}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityLabelForDatum={accessibilityLabelForDatum}
          onAccessibilityDatumPress={onAccessibilityDatumPress}
          valueOf={(datum) => {
            const index = data.indexOf(datum);
            return [
              [xDataKey, datum[xDataKey]],
              ...series.map((item) => {
                const rank = ranks[item.key]?.[index];
                return [item.label, rank == null ? null : `rank ${rank}`] as [string, unknown];
              }),
            ];
          }}
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
               * The reveal is a view that grows, not an SVG clip path: animated
               * props on a clip inside `<Defs>` never reach the native clip on
               * Android, and the lines would simply appear complete there.
               * Started 8pt left of the plot so the first column's dots are
               * whole from the first frame.
               */}
              {loading ? null : (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: plot.left - 8,
                      overflow: 'hidden',
                    },
                    revealStyle,
                  ]}
                >
                  <Svg
                    width={size.width}
                    height={size.height}
                    style={{ position: 'absolute', top: 0, left: -(plot.left - 8) }}
                  >
                    {seriesLayer}
                    <BumpLines />
                  </Svg>
                </Animated.View>
              )}
              {overlay}
            </>
          ) : null}
        </View>
      </View>
    </BumpChartContext.Provider>
  );
});
BumpChartRoot.displayName = 'BumpChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface BumpChartGridProps {
  /** A guide down every column. */
  vertical?: boolean;
  /** A guide across every rank. */
  horizontal?: boolean;
  color?: string;
  dashArray?: string;
  opacity?: number;
}

/** Guides down each column, so a dot can be read against the label below it. */
function BumpChartGrid({
  vertical = true,
  horizontal = false,
  color,
  dashArray = '3,5',
  opacity = 1,
}: BumpChartGridProps) {
  const { plot, data, rows } = useChart('BumpChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.1)');

  return (
    <G opacity={opacity}>
      {vertical
        ? data.map((_unused, index) => {
            const x = xOf(index, data.length, plot);
            return (
              <SvgLine
                key={`x${index}`}
                x1={x}
                x2={x}
                y1={plot.top}
                y2={plot.top + plot.height}
                stroke={stroke}
                strokeDasharray={dashArray}
                strokeWidth={1}
              />
            );
          })
        : null}
      {horizontal
        ? Array.from({ length: rows }, (_unused, index) => {
            const y = plot.top + (rows <= 1 ? plot.height / 2 : (plot.height * index) / (rows - 1));
            return (
              <SvgLine
                key={`y${index}`}
                x1={plot.left}
                x2={plot.left + plot.width}
                y1={y}
                y2={y}
                stroke={stroke}
                strokeDasharray={dashArray}
                strokeWidth={1}
              />
            );
          })
        : null}
    </G>
  );
}
BumpChartGrid.displayName = 'BumpChart.Grid';
BumpChartGrid.layer = 'svg' as Layer;

export interface BumpChartLineProps {
  /** Column in the data holding this series' rank, or its score with `values="score"`. */
  dataKey: string;
  /** The name shown by `Labels`, the tooltip and the legend. Defaults to `dataKey`. */
  label?: string;
  /** Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. */
  color?: string;
  /** Which of the five chart tokens to take. */
  colorIndex?: SeriesColorIndex;
  /** Thickness of the line. The picked-out line is drawn one point thicker. */
  strokeWidth?: number;
  /** Draw a dot at every column. */
  showDots?: boolean;
}

/**
 * One series. It draws nothing itself: the lines are drawn together, so the
 * one picked out can be drawn last and sit on top of every crossing.
 */
function BumpChartLine({
  dataKey,
  label,
  color,
  colorIndex = 1,
  strokeWidth = 1.5,
  showDots = true,
}: BumpChartLineProps) {
  const { registerSeries, unregisterSeries } = useChart('BumpChart.Line');
  const stroke = useSeriesColor(color, colorIndex);
  const name = label ?? dataKey;

  useEffect(() => {
    registerSeries({ key: dataKey, color: stroke, label: name, strokeWidth, showDots });
  }, [dataKey, stroke, name, strokeWidth, showDots, registerSeries]);

  useEffect(() => () => unregisterSeries(dataKey), [dataKey, unregisterSeries]);

  return null;
}
BumpChartLine.displayName = 'BumpChart.Line';
BumpChartLine.layer = 'series' as Layer;
// Read by the root, for the order the lines were declared in.
BumpChartLine.line = true as const;

/** Every line, the picked-out one last. */
function BumpLines() {
  const { series, highlight } = useChart('BumpChart');
  const muted = useCSSVariable('--color-muted-foreground');
  const mutedColor = typeof muted === 'string' ? muted : '#737373';

  const ordered = highlight
    ? [...series.filter((item) => item.key !== highlight), ...series.filter((item) => item.key === highlight)]
    : series;

  return (
    <G>
      {ordered.map((item) => {
        const picked = highlight === item.key;
        const dimmed = highlight !== null && !picked;
        return (
          <BumpLine
            key={item.key}
            series={item}
            color={dimmed ? mutedColor : item.color}
            opacity={dimmed ? DIMMED_OPACITY : 1}
            strokeWidth={picked ? item.strokeWidth + 1 : item.strokeWidth}
            dotRadius={picked ? 3.5 : 2.5}
          />
        );
      })}
    </G>
  );
}

function BumpLine({
  series,
  color,
  opacity,
  strokeWidth,
  dotRadius,
}: {
  series: BumpSeries;
  color: string;
  opacity: number;
  strokeWidth: number;
  dotRadius: number;
}) {
  const { plot, from, to, morph } = useChart('BumpChart.Line');
  const key = series.key;

  const lineProps = useAnimatedProps(() => ({
    d: pointsAt(key, from.value, to.value, morph.value, plot)
      .map((run) => bumpSegment(run))
      .join(' '),
  }));

  const dotProps = useAnimatedProps(() => {
    let d = '';
    for (const run of pointsAt(key, from.value, to.value, morph.value, plot)) {
      d += dotsPath(run, dotRadius);
    }
    return { d };
  });

  return (
    <G opacity={opacity}>
      <AnimatedPath
        animatedProps={lineProps}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {series.showDots ? <AnimatedPath animatedProps={dotProps} fill={color} /> : null}
    </G>
  );
}

export interface BumpChartSkeletonProps {
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
  /** How many rank rows to stand in for. */
  rows?: number;
}

/**
 * The loading state: a thin bar on every rank row with a highlight travelling
 * across them. Flat, so it says where the lines will be and nothing about
 * where they go.
 */
function BumpChartSkeleton({ duration = 1400, color, rows: rowsProp }: BumpChartSkeletonProps) {
  const { plot, status, rows: dataRows } = useChart('BumpChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const base = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');
  const highlight = useSeriesColor(undefined, 1);
  const rows = rowsProp ?? Math.max(dataRows, 4);

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

  const gradientId = 'panelui-bump-skeleton';
  const thickness = 4;

  return (
    <G>
      <Defs>
        <AnimatedLinearGradient id={gradientId} animatedProps={animatedProps} y1="0" y2="0">
          <Stop offset="0" {...colorStop(base)} />
          <Stop offset="0.5" stopColor={highlight} stopOpacity={0.3} />
          <Stop offset="1" {...colorStop(base)} />
        </AnimatedLinearGradient>
      </Defs>
      {Array.from({ length: rows }, (_unused, index) => {
        const y = plot.top + (rows <= 1 ? plot.height / 2 : (plot.height * index) / (rows - 1));
        return (
          <Rect
            key={index}
            x={plot.left}
            y={y - thickness / 2}
            width={plot.width}
            height={thickness}
            rx={thickness / 2}
            fill={`url(#${gradientId})`}
          />
        );
      })}
    </G>
  );
}
BumpChartSkeleton.displayName = 'BumpChart.Skeleton';
BumpChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface BumpChartXAxisProps {
  /** How many columns to label, spread across the run. */
  ticks?: number;
  format?: (datum: BumpChartDatum, index: number) => string;
  className?: string;
}

/** The column labels. Real text, so they follow the theme's font and text scaling. */
function BumpChartXAxis({ ticks = 4, format, className }: BumpChartXAxisProps) {
  const { data, xDataKey, plot, pad } = useChart('BumpChart.XAxis');

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
BumpChartXAxis.displayName = 'BumpChart.XAxis';
BumpChartXAxis.layer = 'overlay' as Layer;

export interface BumpChartYAxisProps {
  /** Format a rank. Defaults to `#1`, `#2`… */
  format?: (rank: number) => string;
  className?: string;
}

/** The ranks down the side, one on every row. */
function BumpChartYAxis({ format, className }: BumpChartYAxisProps) {
  const { plot, rows } = useChart('BumpChart.YAxis');

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: plot.top - AXIS_LABEL_HEIGHT / 2,
        height: plot.height + AXIS_LABEL_HEIGHT,
        width: Math.max(plot.left - Y_AXIS_GUTTER, 0),
      }}
      className={cn(rows <= 1 ? 'items-end justify-center' : 'items-end justify-between', className)}
    >
      {Array.from({ length: rows }, (_unused, index) => (
        <Text key={index} size="xs" muted numberOfLines={1}>
          {format ? format(index + 1) : `#${index + 1}`}
        </Text>
      ))}
    </View>
  );
}
BumpChartYAxis.displayName = 'BumpChart.YAxis';
BumpChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which leaves room for the ranks before laying the plot out.
BumpChartYAxis.axis = 'y' as const;

const DEFAULT_LABELS_WIDTH = 84;

export interface BumpChartLabelsProps {
  /** Room kept to the right of the plot for the names. Longer names are cut short. */
  width?: number;
  /** Let a tap on a name pick that line out, and a second tap clear it. */
  pressable?: boolean;
  className?: string;
}

/**
 * Each series' name beside its last point, so the lines can be told apart
 * without a legend to look across to. The names move with their lines when
 * the data changes.
 */
function BumpChartLabels({ pressable = true, className }: BumpChartLabelsProps) {
  const { series, plot, pad, highlight, setHighlight, from, to, morph, status } =
    useChart('BumpChart.Labels');
  if (status === 'loading') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {series.map((item) => (
        <BumpLabel
          key={item.key}
          series={item}
          left={plot.left + plot.width + LABELS_GAP}
          width={pad.right - LABELS_GAP}
          plot={plot}
          from={from}
          to={to}
          morph={morph}
          picked={highlight === item.key}
          dimmed={highlight !== null && highlight !== item.key}
          onPress={
            pressable ? () => setHighlight(highlight === item.key ? null : item.key) : undefined
          }
          className={className}
        />
      ))}
    </View>
  );
}
BumpChartLabels.displayName = 'BumpChart.Labels';
BumpChartLabels.layer = 'overlay' as Layer;
// Read by the root, which keeps room for the names to the right of the plot.
BumpChartLabels.labels = true as const;

function BumpLabel({
  series,
  left,
  width,
  plot,
  from,
  to,
  morph,
  picked,
  dimmed,
  onPress,
  className,
}: {
  series: BumpSeries;
  left: number;
  width: number;
  plot: Plot;
  from: SharedValue<BumpRanks>;
  to: SharedValue<BumpRanks>;
  morph: SharedValue<number>;
  picked: boolean;
  dimmed: boolean;
  onPress?: () => void;
  className?: string;
}) {
  const key = series.key;

  // The name sits level with the line's last point, wherever that is drawn.
  const style = useAnimatedStyle(() => {
    const runs = pointsAt(key, from.value, to.value, morph.value, plot);
    const run = runs[runs.length - 1];
    const last = run?.[run.length - 1];
    if (!last) return { opacity: 0, transform: [{ translateY: 0 }] };
    return { opacity: 1, transform: [{ translateY: last.y - LABEL_ROW / 2 }] };
  });

  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left, width, height: LABEL_ROW }, style]}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityState={{ selected: picked }}
        accessibilityLabel={series.label}
        className="h-full justify-center"
      >
        <Text
          size="xs"
          weight={picked ? 'semibold' : undefined}
          muted={!picked}
          numberOfLines={1}
          // With nothing picked out, each name takes its line's colour, which
          // is the only thing tying it to that line across the crossings.
          style={dimmed ? { opacity: 0.8 } : picked ? undefined : { color: series.color }}
          className={className}
        >
          {series.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Height of one name's hit box. */
const LABEL_ROW = 20;

export interface BumpChartTooltipProps {
  color?: string;
  /** Format a rank in the readout. Defaults to `#1`, `#2`… */
  formatRank?: (rank: number) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: BumpChartDatum) => string;
  className?: string;
}

/**
 * A scrub across the columns, and a readout listing every series in the order
 * it stood at the column under the finger.
 */
function BumpChartTooltip({ color, formatRank, formatX, className }: BumpChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    series,
    ranks,
    highlight,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('BumpChart.Tooltip');

  const token = useCSSVariable('--color-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : '#888888');
  const muted = useCSSVariable('--color-muted-foreground');
  const mutedColor = typeof muted === 'string' ? muted : '#737373';

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

  const crosshairStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    return {
      opacity: index < 0 ? 0 : 0.45,
      transform: [{ translateX: index < 0 ? 0 : xOf(index, total, plot) }],
    };
  });

  /*
   * The readout sits beside the crosshair rather than over it, on whichever
   * side has room, so it never hides the column it is describing.
   */
  const readoutStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const x = xOf(index, total, plot);
    const gap = 10;
    const right = x + gap;
    const fits = right + READOUT_WIDTH <= plot.left + plot.width;
    const at = fits ? right : Math.max(plot.left, x - gap - READOUT_WIDTH);
    return { opacity: 1, transform: [{ translateX: at }] };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const standings = useMemo(() => {
    if (activeIndexJS < 0) return [];
    return series
      .map((item) => ({ item, rank: ranks[item.key]?.[activeIndexJS] ?? null }))
      .filter((entry): entry is { item: BumpSeries; rank: number } => entry.rank !== null)
      .sort((a, b) => a.rank - b.rank);
  }, [series, ranks, activeIndexJS]);

  const fmtRank = formatRank ?? ((rank: number) => `#${rank}`);
  const fmtX = formatX ?? ((datum: BumpChartDatum) => String(datum[xDataKey] ?? ''));

  if (status === 'loading') return null;

  return (
    <GestureDetector gesture={pan}>
      {/* Stops short of the names, so a tap there picks a line rather than
          starting a scrub. */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: plot.left + plot.width + 8 }}>
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
              {standings.map(({ item, rank }) => (
                <View key={item.key} className="flex-row items-center gap-1.5">
                  <Text size="xs" muted style={{ minWidth: 20 }}>
                    {fmtRank(rank)}
                  </Text>
                  {/* The colour the line is drawn in, so a muted line has a
                      muted swatch rather than its unused series colour. */}
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        highlight !== null && highlight !== item.key ? mutedColor : item.color,
                    }}
                  />
                  <Text
                    size="xs"
                    weight={highlight === item.key ? 'semibold' : 'medium'}
                    numberOfLines={1}
                    className="shrink"
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
BumpChartTooltip.displayName = 'BumpChart.Tooltip';
BumpChartTooltip.layer = 'overlay' as Layer;

export interface BumpChartLegendProps extends ViewProps {
  className?: string;
}

/** A swatch and a name per series, in declaration order. */
function BumpChartLegend({ className, ...props }: BumpChartLegendProps) {
  const { series } = useChart('BumpChart.Legend');
  if (!series.length) return null;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-0 flex-row flex-wrap gap-3', className)}
    >
      {series.map((item) => (
        <SeriesSwatch key={item.key} color={item.color} label={item.label} />
      ))}
    </View>
  );
}
BumpChartLegend.displayName = 'BumpChart.Legend';
BumpChartLegend.layer = 'overlay' as Layer;

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

export interface BumpChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the chart is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a total. */
  caption?: string;
  /** Draw a swatch and a name per series along the trailing edge. */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of and what it currently reads.
 * The value is not derived here — pass the formatted string, from
 * `onActiveIndexChange` or `onHighlightChange` if it follows the chart.
 */
function BumpChartHeader({
  className,
  title,
  value,
  caption,
  legend = false,
  children,
  ...props
}: BumpChartHeaderProps) {
  const { series } = useChart('BumpChart.Header');
  const trailing =
    children ??
    (legend && series.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {series.map((item) => (
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
BumpChartHeader.displayName = 'BumpChart.Header';
BumpChartHeader.layer = 'header' as Layer;

export const BumpChart = Object.assign(BumpChartRoot, {
  Header: BumpChartHeader,
  Grid: BumpChartGrid,
  Line: BumpChartLine,
  Skeleton: BumpChartSkeleton,
  XAxis: BumpChartXAxis,
  YAxis: BumpChartYAxis,
  Labels: BumpChartLabels,
  Tooltip: BumpChartTooltip,
  Legend: BumpChartLegend,
});
