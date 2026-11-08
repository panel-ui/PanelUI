/**
 * PyramidChart — two series mirrored about a centre line, drawn and animated on
 * the UI thread.
 *
 * ```tsx
 * <PyramidChart data={penguins} xDataKey="species">
 *   <PyramidChart.Grid />
 *   <PyramidChart.Bar dataKey="male" side="start" />
 *   <PyramidChart.Bar dataKey="female" side="end" />
 *   <PyramidChart.XAxis />
 *   <PyramidChart.YAxis />
 *   <PyramidChart.Tooltip />
 * </PyramidChart>
 * ```
 *
 * ## The two wings share one scale
 *
 * This is the whole contract, and everything else here follows from it. The
 * domain is derived from the larger of the two series' extents and used by
 * both, so a bar twice as long as the one facing it means twice as much.
 * Scaling each side to its own maximum produces a chart whose halves cannot be
 * compared — which is the only thing a pyramid is for.
 *
 * For the same reason the centre is zero and stays there. There is no `yDomain`
 * that starts anywhere else, because a wing cropped at its base is a length
 * that lies.
 *
 * ## Lengths, not signed values
 *
 * Which side a series is on comes from `side`, not from the sign of its
 * numbers, so a value is a distance outward from the centre. A negative one has
 * no direction left to grow in and is drawn as nothing; it still appears in the
 * readout, so a data error shows up as a gap rather than as a bar pointing the
 * wrong way.
 *
 * ## Where the category names go
 *
 * `labelPlacement="above"`, the default, gives each row a line of its own over
 * its pair of bars. That leaves the two wings meeting in the middle with
 * nothing standing between them, and puts the name where it is read before the
 * lengths it belongs to rather than beside them.
 *
 * `"center"` puts the names in a gutter between the wings instead — taken off
 * the bars rather than off the edges, so both wings stay equal — and `"start"`
 * puts them down the left, for a chart with room to spare on that side.
 *
 * ## Every series is one path
 *
 * A `Bar` draws all its rectangles as subpaths of a single animated path, split
 * in two so the row under the finger keeps full ink while the rest fade. Thirty
 * rows is two animated props a frame rather than thirty.
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
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import {
  barPath,
  columnValues,
  compactNumber,
  niceDomain,
  useSeriesColor,
  type Plot,
  type SeriesColorIndex,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Room left around the plot for the value labels along the bottom. */
const PADDING = { top: 6, right: 10, bottom: 22, left: 10 };

/** Left gutter reserved for the category names when they sit at the start. */
const CATEGORY_GUTTER = 68;

/**
 * Middle gutter reserved for them when they sit between the wings. Taken off
 * the bars rather than off the edges, so the two wings stay equal.
 */
const CENTRE_GUTTER = 72;

/** Width the readout is laid out at, so it can be clamped inside the plot. */
const LABEL_WIDTH = 132;

/**
 * Box each value label is centred in. Narrow, because the outermost tick on
 * each wing sits on the plot's own edge — a box centred there hangs half its
 * width off the side of the chart, and the number is cropped away.
 */
const AXIS_LABEL_WIDTH = 56;

/** Line height of an `xs` label, for centring one on the tick it names. */
const AXIS_LABEL_HEIGHT = 16;

/**
 * Steps the value axis is rounded out to. Four rather than the two labels each
 * wing draws, so the halfway label lands on a round number too.
 */
const DOMAIN_STEPS = 4;

/**
 * Height taken off the top of every band for the name sitting over it. An `xs`
 * line plus the air that keeps it off the bar it belongs to.
 */
const LABEL_ROW = 20;

type Layer = 'svg' | 'overlay' | 'header';

export type PyramidChartStatus = 'loading' | 'ready';

/** Which wing a series grows into. */
export type PyramidChartSide = 'start' | 'end';

/** Where the category names sit. */
export type PyramidChartLabelPlacement = 'above' | 'center' | 'start';

export type PyramidChartDatum = Record<string, string | number | null | undefined>;

interface PyramidSeries {
  key: string;
  color: string;
  side: PyramidChartSide;
}

interface PyramidChartContextValue {
  data: PyramidChartDatum[];
  xDataKey: string;
  plot: Plot;
  status: PyramidChartStatus;
  /** Points held back in the middle for the category names. Zero otherwise. */
  gutter: number;
  /** Points taken off the top of every band for a name sitting over it. */
  labelInset: number;
  labelPlacement: PyramidChartLabelPlacement;
  barGap: number;
  barWidth: number | undefined;
  cornerRadius: number;
  minBarLength: number;
  fadedOpacity: number;
  series: PyramidSeries[];
  registerSeries: (series: PyramidSeries) => void;
  unregisterSeries: (key: string) => void;
  /** The far end of the shared scale. The near end is zero, always. */
  domainMax: SharedValue<number>;
  /** The settled maximum, for the parts that draw text rather than geometry. */
  extentMax: number;
  /** 0 to 1 as the bars grow out. Shared, so they arrive as one chart. */
  reveal: SharedValue<number>;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActiveIndexJS: (index: number) => void;
}

const PyramidChartContext = createContext<PyramidChartContextValue | null>(null);

function useChart(component: string): PyramidChartContextValue {
  const context = useContext(PyramidChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <PyramidChart>`);
  }
  return context;
}

/**
 * The row under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveIndexChange` for that.
 */
export function usePyramidChart() {
  const { data, activeIndexJS, xDataKey } = useChart('usePyramidChart');
  return {
    activeIndex: activeIndexJS,
    activePoint: activeIndexJS >= 0 ? (data[activeIndexJS] ?? null) : null,
    xDataKey,
  };
}

export interface PyramidChartProps
  extends ViewProps,
    ChartAccessibilityProps<PyramidChartDatum> {
  className?: string;
  /** The rows. Each one is a band across the chart, with a wing either side. */
  data: PyramidChartDatum[];
  /** Key holding the category label. Used by the axis and the readout. */
  xDataKey?: string;
  /**
   * `loading` holds the bars at the centre and grows them out into the real
   * ones when it turns `ready`. One component throughout, rather than a spinner
   * swapped for a chart — swapping loses the transition. Add a
   * `PyramidChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: PyramidChartStatus;
  /** Width ÷ height. `1.2` suits three or four rows in a card. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow out on mount. */
  animationDuration?: number;
  /** Milliseconds for the scale to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the far end of the shared scale instead of deriving it. The near end is
   * zero either way — a pyramid measures outward from its centre.
   */
  maxValue?: number;
  /**
   * Where the category names sit. `above`, the default, gives each row a line
   * of its own over its pair of bars, so the two wings meet in the middle with
   * nothing standing between them. `center` puts the names in a gutter between
   * the wings instead, and `start` down the left edge.
   */
  labelPlacement?: PyramidChartLabelPlacement;
  /**
   * Fraction of each band left empty, `0` to `1`. A fraction rather than a
   * pixel gap so the proportions hold at any height.
   */
  barGap?: number;
  /** Fixed bar thickness in points. Derived from the band when omitted. */
  barWidth?: number;
  /** Corner radius on the outward end of a bar. */
  cornerRadius?: number;
  /**
   * Smallest length a non-zero bar is drawn at, in points. A value that rounds
   * to nothing still happened, and a bar of zero length says it did not.
   */
  minBarLength?: number;
  /** Opacity of the rows that are not under the finger. */
  fadedOpacity?: number;
  /**
   * The row under the finger as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, datum: PyramidChartDatum | null) => void;
  children?: ReactNode;
}

/** Imperative handle: re-run the grow-out, for a "replay" control. */
export interface PyramidChartHandle {
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

const PyramidChartRoot = forwardRef<PyramidChartHandle, PyramidChartProps>(
  function PyramidChartRoot(
    {
      className,
      data,
      xDataKey = 'name',
      status = 'ready',
      aspectRatio = 1.2,
      animationDuration = 700,
      domainDuration = 500,
      maxValue,
      labelPlacement = 'above',
      barGap = 0.25,
      barWidth,
      cornerRadius = 4,
      minBarLength = 0,
      fadedOpacity = 0.3,
      onActiveIndexChange,
      accessible,
      accessibilityLabel,
      accessibilityHint,
      accessibilityLabelForDatum,
      onAccessibilityDatumPress,
      children,
      ...props
    },
    ref
  ) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [series, setSeries] = useState<PyramidSeries[]>([]);
    const [activeIndexJS, setActiveIndexJS] = useState(-1);

    const reveal = useSharedValue(0);
    const domainMax = useSharedValue(0);
    const activeIndex = useSharedValue(-1);
    const reducedMotion = useReducedMotion();

    const registerSeries = useMemo(
      () => (next: PyramidSeries) =>
        setSeries((current) => {
          const existing = current.find((entry) => entry.key === next.key);
          if (existing?.color === next.color && existing.side === next.side) return current;
          return [...current.filter((entry) => entry.key !== next.key), next];
        }),
      []
    );

    const unregisterSeries = useMemo(
      () => (key: string) =>
        setSeries((current) => current.filter((entry) => entry.key !== key)),
      []
    );

    /*
     * Whether the category names are asking for room. It has to be known before
     * the plot is laid out, and only the root sees the children early enough to
     * ask — the axis itself renders into a box that has already been decided.
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

    /*
     * Three places a name can go, and each takes its room from somewhere
     * different: `above` off the top of every band, `center` out of the middle
     * of the plot, `start` off the left edge.
     */
    const gutter = hasYAxis && labelPlacement === 'center' ? CENTRE_GUTTER : 0;
    const labelInset = hasYAxis && labelPlacement === 'above' ? LABEL_ROW : 0;
    const pad = {
      ...PADDING,
      left: hasYAxis && labelPlacement === 'start' ? CATEGORY_GUTTER : PADDING.left,
    };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };

    const seriesKeys = series.map((entry) => entry.key).join('|');
    const extentMax = useMemo(() => {
      if (maxValue !== undefined && maxValue > 0) return maxValue;
      const keys = seriesKeys ? seriesKeys.split('|') : [];
      let max = 0;
      /*
       * One number for both wings. Taking a maximum per side is what makes a
       * pyramid whose halves cannot be compared, so the largest value anywhere
       * in either series sets the scale for all of them.
       */
      for (const row of data) {
        for (const key of keys) {
          const value = row[key];
          if (typeof value !== 'number' || Number.isNaN(value)) continue;
          if (value > max) max = value;
        }
      }
      /*
       * Rounded out to a step a reader can divide in their head, rather than
       * padded by a fraction. A tenth added to 73 ends the axis at 80.3 and
       * labels the wings 40.2 and 80.3 — numbers that are true and that nobody
       * was looking for. The centre is left exactly where it is: rounding it
       * would lift the bars off their own baseline.
       *
       * Four steps, not two, so the halfway label the axis draws by default is
       * a round number as well as the end one.
       */
      return max === 0 ? 1 : niceDomain(0, max, DOMAIN_STEPS)[1];
    }, [data, maxValue, seriesKeys]);

    const loading = status === 'loading';

    useEffect(() => {
      if (loading) return;
      const first = domainMax.value === 0;
      if (first || reducedMotion) {
        domainMax.value = extentMax;
        return;
      }
      domainMax.value = withTiming(extentMax, { duration: domainDuration });
    }, [extentMax, loading, reducedMotion, domainDuration, domainMax]);

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

    const context = useMemo<PyramidChartContextValue>(
      () => ({
        data,
        xDataKey,
        plot,
        status,
        gutter,
        labelInset,
        labelPlacement,
        barGap,
        barWidth,
        cornerRadius,
        minBarLength,
        fadedOpacity,
        series,
        registerSeries,
        unregisterSeries,
        domainMax,
        extentMax,
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
        gutter,
        labelInset,
        labelPlacement,
        barGap,
        barWidth,
        cornerRadius,
        minBarLength,
        fadedOpacity,
        series,
        registerSeries,
        unregisterSeries,
        domainMax,
        extentMax,
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
      <PyramidChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Pyramid chart"
            data={data}
            disabled={accessible === false || loading}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
            valueOf={(datum) => [
              [xDataKey, datum[xDataKey]],
              ...series.map((entry) => [entry.key, datum[entry.key]] as [string, unknown]),
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
      </PyramidChartContext.Provider>
    );
  }
);
PyramidChartRoot.displayName = 'PyramidChart';

/**
 * Where the centre line is, and how much room one wing has. Every part needs
 * both and none of them should work it out twice.
 */
function geometry(plot: Plot, gutter: number) {
  'worklet';
  const centre = plot.left + plot.width / 2;
  return {
    centre,
    /** The inner edge of the start wing — where a left-growing bar begins. */
    innerStart: centre - gutter / 2,
    /** The inner edge of the end wing. */
    innerEnd: centre + gutter / 2,
    wing: Math.max((plot.width - gutter) / 2, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface PyramidChartGridProps {
  /** How many lines to draw per wing, not counting the centre. */
  columns?: number;
  color?: string;
  dashArray?: string;
  opacity?: number;
  /** Draw the solid line down the middle the wings are measured from. */
  centreLine?: boolean;
}

/**
 * Lines up the value axis, mirrored, so a bar can be read against a number
 * rather than only against the bar facing it.
 *
 * The centre line is drawn solid and undashed where the others are dashed: it
 * is not a tick, it is the zero both wings are measured from.
 */
function PyramidChartGrid({
  columns = 2,
  color,
  dashArray = '4,6',
  opacity = 1,
  centreLine = true,
}: PyramidChartGridProps) {
  const { plot, gutter } = useChart('PyramidChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.1)');
  const { innerStart, innerEnd, wing, centre } = geometry(plot, gutter);

  const ticks = Array.from({ length: columns }, (_unused, index) => (index + 1) / columns);

  return (
    <G opacity={opacity}>
      {ticks.map((fraction) => (
        <G key={fraction}>
          <SvgLine
            x1={innerStart - wing * fraction}
            x2={innerStart - wing * fraction}
            y1={plot.top}
            y2={plot.top + plot.height}
            stroke={stroke}
            strokeDasharray={dashArray}
            strokeWidth={1}
          />
          <SvgLine
            x1={innerEnd + wing * fraction}
            x2={innerEnd + wing * fraction}
            y1={plot.top}
            y2={plot.top + plot.height}
            stroke={stroke}
            strokeDasharray={dashArray}
            strokeWidth={1}
          />
        </G>
      ))}
      {centreLine ? (
        <SvgLine
          x1={centre}
          x2={centre}
          y1={plot.top}
          y2={plot.top + plot.height}
          stroke={stroke}
          strokeWidth={1}
        />
      ) : null}
    </G>
  );
}
PyramidChartGrid.displayName = 'PyramidChart.Grid';
PyramidChartGrid.layer = 'svg' as Layer;

export interface PyramidChartBarProps {
  /** Column in the data holding this series' values. */
  dataKey: string;
  /** Which wing it grows into. */
  side?: PyramidChartSide;
  /** Explicit colour. Defaults to the `--color-chart-*` token for `colorIndex`. */
  color?: string;
  /**
   * Which of the five chart tokens to take. Defaults to a different one per
   * side, so two bars declared with nothing but a `dataKey` and a `side` are
   * already told apart.
   */
  colorIndex?: SeriesColorIndex;
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/**
 * One wing.
 *
 * Drawn as two paths rather than one rectangle per row: the row under the
 * finger, and everything else. That is the fewest animated props that can still
 * dim the rest — one path could not, since a path has one opacity, and a view
 * per bar would be one animated prop per bar for the same picture.
 */
function PyramidChartBar({
  dataKey,
  side = 'end',
  color,
  colorIndex,
  cornerRadius,
}: PyramidChartBarProps) {
  const {
    data,
    plot,
    status,
    gutter,
    labelInset,
    barGap,
    barWidth,
    cornerRadius: chartRadius,
    minBarLength,
    fadedOpacity,
    registerSeries,
    unregisterSeries,
    domainMax,
    reveal,
    activeIndex,
  } = useChart('PyramidChart.Bar');

  const index: SeriesColorIndex = colorIndex ?? (side === 'start' ? 2 : 1);
  const fill = useSeriesColor(color, index);
  const radius = cornerRadius ?? chartRadius;

  useEffect(() => {
    registerSeries({ key: dataKey, color: fill, side });
    return () => unregisterSeries(dataKey);
  }, [dataKey, fill, side, registerSeries, unregisterSeries]);

  const values = useMemo(() => columnValues(data, dataKey), [data, dataKey]);

  const loading = status === 'loading';
  const total = data.length;
  const towards = side === 'start' ? 'left' : 'right';

  /*
   * Both paths come out of one builder, filtered by whether the row is the
   * active one. Two passes over the data a frame is still cheaper than the
   * bookkeeping needed to build both at once, and it keeps the geometry in
   * exactly one place.
   */
  const build = (wantActive: boolean) => () => {
    'worklet';
    if (!total || plot.width <= 0) {
      return { d: '', opacity: 1 };
    }

    const { innerStart, innerEnd, wing } = geometry(plot, gutter);
    const band = plot.height / total;
    // What is left of a band once the name over it has taken its line.
    const usable = Math.max(band - labelInset, 0);
    const thickness = Math.min(barWidth ?? usable * (1 - barGap), usable * (1 - barGap));

    const max = domainMax.value || 1;
    const grow = reveal.value;
    const active = activeIndex.value;

    let d = '';

    for (let i = 0; i < total; i++) {
      if ((i === active) !== wantActive) continue;

      const value = values[i];
      if (value === null || value === undefined) continue;

      /*
       * Staggered by row, but every bar still finishes inside the one duration:
       * the window each gets is what is left after the stagger, so a chart of
       * twenty rows does not take twenty times as long to arrive.
       */
      const start = total > 1 ? (i / total) * 0.45 : 0;
      const eased = Math.max(0, Math.min(1, (grow - start) / 0.55));
      // A length, so a negative number has no direction left to grow in. It is
      // still in the readout; it just cannot be drawn.
      const shown = loading ? 0 : Math.max(value, 0) * eased;

      let length = (shown / max) * wing;
      if (minBarLength > 0 && shown > 0 && length < minBarLength) length = minBarLength;
      if (length <= 0) continue;

      const lead = plot.top + i * band + labelInset + (usable - thickness) / 2;
      d +=
        side === 'start'
          ? barPath(innerStart - length, lead, length, thickness, radius, towards)
          : barPath(innerEnd, lead, length, thickness, radius, towards);
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
PyramidChartBar.displayName = 'PyramidChart.Bar';
PyramidChartBar.layer = 'svg' as Layer;

/** How much of one wing a placeholder bar takes. */
const SKELETON_LENGTH = 0.35;

/** Rows to draw when there is no data yet to count them from. */
const SKELETON_ROWS = 5;

export interface PyramidChartSkeletonProps {
  /**
   * How many placeholder rows to draw. Defaults to one per row of data, and to
   * five when the data has not arrived — the count is the one thing a loading
   * chart can be honest about only if it already has the rows.
   */
  rows?: number;
  /** Milliseconds for one pass of the sweep. */
  duration?: number;
  color?: string;
}

/**
 * The loading state: equal stubs either side of the centre, with a highlight
 * travelling across them.
 *
 * Equal on purpose. Placeholder wings of differing lengths are a distribution
 * the reader has no way to tell from the real one until it changes under them,
 * so these say only how many rows there will be and where the centre is.
 */
function PyramidChartSkeleton({ rows, duration = 1400, color }: PyramidChartSkeletonProps) {
  const { plot, status, gutter, labelInset, data, barGap, barWidth, cornerRadius } =
    useChart('PyramidChart.Skeleton');
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

  const total = Math.max(1, rows ?? (data.length || SKELETON_ROWS));

  const d = useMemo(() => {
    if (plot.width <= 0 || plot.height <= 0) return '';
    const { innerStart, innerEnd, wing } = geometry(plot, gutter);
    const band = plot.height / total;
    const usable = Math.max(band - labelInset, 0);
    const thickness = Math.min(barWidth ?? usable * (1 - barGap), usable * (1 - barGap));
    const length = wing * SKELETON_LENGTH;

    let path = '';
    for (let i = 0; i < total; i += 1) {
      const lead = plot.top + i * band + labelInset + (usable - thickness) / 2;
      path += barPath(innerStart - length, lead, length, thickness, cornerRadius, 'left');
      path += barPath(innerEnd, lead, length, thickness, cornerRadius, 'right');
    }
    return path;
  }, [plot, gutter, labelInset, total, barGap, barWidth, cornerRadius]);

  if (!loading || !d) return null;

  const gradientId = 'panelui-pyramid-skeleton';

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
PyramidChartSkeleton.displayName = 'PyramidChart.Skeleton';
PyramidChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface PyramidChartXAxisProps {
  /** How many labels per wing, not counting the zero in the middle. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/**
 * The value labels along the bottom, mirrored either side of a zero in the
 * middle — the same magnitudes twice, because both wings are read outward from
 * the centre rather than along one continuous axis.
 *
 * Real text rather than SVG text, so the labels follow the theme's font and the
 * platform's text scaling. SVG text does neither.
 */
function PyramidChartXAxis({ ticks = 2, format, className }: PyramidChartXAxisProps) {
  const { plot, gutter, extentMax } = useChart('PyramidChart.XAxis');
  const { innerStart, innerEnd, wing, centre } = geometry(plot, gutter);
  const fmt = format ?? compactNumber;

  const labels = useMemo(() => {
    const out: { key: string; text: string; x: number }[] = [
      { key: 'centre', text: fmt(0), x: centre },
    ];
    for (let index = 1; index <= ticks; index += 1) {
      const fraction = index / ticks;
      const text = fmt(extentMax * fraction);
      out.push({ key: `start-${index}`, text, x: innerStart - wing * fraction });
      out.push({ key: `end-${index}`, text, x: innerEnd + wing * fraction });
    }
    return out;
  }, [ticks, fmt, extentMax, innerStart, innerEnd, wing, centre]);

  if (wing <= 0) return null;

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
            // Centred on its tick, then held inside the chart. The outermost
            // tick of each wing is on the plot's own edge, so a box centred
            // there would hang half its width off the side and lose the number.
            left: Math.max(
              0,
              Math.min(
                label.x - AXIS_LABEL_WIDTH / 2,
                plot.left + plot.width + PADDING.right - AXIS_LABEL_WIDTH
              )
            ),
            width: AXIS_LABEL_WIDTH,
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
PyramidChartXAxis.displayName = 'PyramidChart.XAxis';
PyramidChartXAxis.layer = 'overlay' as Layer;

export interface PyramidChartYAxisProps {
  /** Turn a row into its label. Defaults to the value at `xDataKey`. */
  format?: (datum: PyramidChartDatum, index: number) => string;
  className?: string;
}

/**
 * The category names, one per row.
 *
 * `above` puts each name on its own line over the pair of bars it belongs to,
 * which leaves the two wings meeting in the middle — the name is read first and
 * the bars are then read outward from a centre nothing is standing in.
 *
 * One box per band rather than a spaced column, in every placement: a row owns
 * a *band*, so names spread evenly would be half a band out at the top and
 * bottom.
 */
function PyramidChartYAxis({ format, className }: PyramidChartYAxisProps) {
  const { data, xDataKey, plot, gutter, labelInset, labelPlacement } =
    useChart('PyramidChart.YAxis');
  const { centre } = geometry(plot, gutter);

  if (!data.length) return null;

  const label = (datum: PyramidChartDatum, index: number) =>
    format ? format(datum, index) : String(datum[xDataKey] ?? '');

  if (labelPlacement === 'above') {
    const band = plot.height / data.length;
    return (
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0 }}
        className={cn(className)}
      >
        {data.map((datum, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: plot.left,
              width: plot.width,
              top: plot.top + index * band,
              height: labelInset,
            }}
            className="justify-center"
          >
            <Text
              size="xs"
              muted
              numberOfLines={1}
              style={{ textAlign: 'center' }}
              maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
            >
              {label(datum, index)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  const centred = labelPlacement === 'center';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: centred ? centre - CENTRE_GUTTER / 2 : 0,
        top: plot.top,
        height: plot.height,
        width: centred ? CENTRE_GUTTER : Math.max(plot.left - 8, 0),
      }}
      className={cn(centred ? 'items-center' : 'items-end', className)}
    >
      {data.map((datum, index) => (
        <View key={index} className="flex-1 justify-center">
          <Text size="xs" muted numberOfLines={1} maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}>
            {label(datum, index)}
          </Text>
        </View>
      ))}
    </View>
  );
}
PyramidChartYAxis.displayName = 'PyramidChart.YAxis';
PyramidChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the names before it lays the
// plot out — a name drawn over a bar is unreadable, and makes the bar it is
// drawn over unreadable too.
PyramidChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface PyramidChartTooltipProps {
  /** Format one series' value. Defaults to a compact number. */
  formatValue?: (value: number, key: string) => string;
  /** Format the readout's heading from the row. Defaults to the value at xDataKey. */
  formatX?: (datum: PyramidChartDatum) => string;
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
 * There is no crosshair. A bar is already the thing being pointed at, so
 * highlighting its row and dimming the rest says the same thing without drawing
 * a line through the chart.
 *
 * The hit area is the whole plot. A readout you have to land on the bar to
 * summon is a readout nobody finds.
 */
function PyramidChartTooltip({
  formatValue,
  formatX,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: PyramidChartTooltipProps) {
  const {
    data,
    xDataKey,
    plot,
    series,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('PyramidChart.Tooltip');

  const total = data.length;
  const top = plot.top;
  const height = plot.height;

  /*
   * The readout's own height, measured rather than assumed. It has to be
   * clamped inside the plot, and how tall it is depends on how many series are
   * listed in it — a constant would either let a three-series readout hang off
   * the bottom or reserve room a one-series readout never uses.
   */
  const labelHeight = useSharedValue(0);

  /*
   * Declared inside the memo, next to its callers: a worklet may only call
   * another worklet, and the rule is enforced by crashing rather than warning.
   */
  const pan = useMemo(() => {
    const resolve = (y: number) => {
      'worklet';
      if (!total) return;
      const offset = (y - top) / (height || 1);
      // Bands, not points: the finger is inside whichever row it lands on,
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
        resolve(event.y);
      })
      .onUpdate((event) => {
        'worklet';
        resolve(event.y);
      })
      .onFinalize(() => {
        'worklet';
        // Fires whether or not the readout ever took the touch.
        if (activeIndex.value === -1) return;
        activeIndex.value = -1;
        runOnJS(setActiveIndexJS)(-1);
      });
  }, [total, top, height, activeIndex, setActiveIndexJS, activateAfterLongPress]);

  /*
   * The readout slides down to the row it is describing and sits centred over
   * the plot. Held at the top instead it would name the row under the finger
   * while covering the first one, which is the row a reader checks it against.
   */
  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0 || !total) return { opacity: 0 };
    const band = plot.height / total;
    const centre = plot.top + band * (index + 0.5);
    const x = plot.left + plot.width / 2 - LABEL_WIDTH / 2;

    // Until the first measurement lands the height is zero, which clamps to the
    // top of the plot — the same place it used to sit, rather than a jump from
    // somewhere it never was.
    const tall = labelHeight.value;
    const y = Math.min(
      plot.top + Math.max(plot.height - tall, 0),
      Math.max(plot.top, centre - tall / 2)
    );
    return { opacity: 1, transform: [{ translateX: x }, { translateY: y }] };
  });

  const active = activeIndexJS >= 0 ? data[activeIndexJS] : null;
  const fmtValue = formatValue ?? ((value: number) => compactNumber(value));
  const fmtX = formatX ?? ((datum: PyramidChartDatum) => String(datum[xDataKey] ?? ''));

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
              {series.map((entry) => {
                const value = active[entry.key];
                if (typeof value !== 'number') return null;
                return (
                  <View key={entry.key} className="flex-row items-center gap-1.5">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: entry.color,
                      }}
                    />
                    <Text size="xs" weight="medium">
                      {fmtValue(value, entry.key)}
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
PyramidChartTooltip.displayName = 'PyramidChart.Tooltip';
PyramidChartTooltip.layer = 'overlay' as Layer;

export interface PyramidChartLegendProps extends ViewProps {
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
function PyramidChartLegend({ className, labels, ...props }: PyramidChartLegendProps) {
  const { series } = useChart('PyramidChart.Legend');
  if (!series.length) return null;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-1 flex-row gap-3', className)}
    >
      {series.map((entry) => (
        <SeriesSwatch
          key={entry.key}
          color={entry.color}
          label={labels?.[entry.key] ?? entry.key}
        />
      ))}
    </View>
  );
}
PyramidChartLegend.displayName = 'PyramidChart.Legend';
PyramidChartLegend.layer = 'overlay' as Layer;

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface PyramidChartHeaderProps extends ViewProps {
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
   * `PyramidChart.Legend` on a chart that has a header: the legend floats over
   * the plot, where it competes with the bars for the same corner.
   */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it currently reads, and
 * what the two colours mean.
 *
 * It belongs to the chart rather than to the card around it because it is about
 * the *plot* — the number changes as a finger moves down the rows, and the
 * legend is the series list the chart itself is holding.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down.
 */
function PyramidChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: PyramidChartHeaderProps) {
  const { series } = useChart('PyramidChart.Header');
  const trailing =
    children ??
    (legend && series.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {series.map((entry) => (
          <SeriesSwatch
            key={entry.key}
            color={entry.color}
            label={labels?.[entry.key] ?? entry.key}
          />
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
          two-series key takes the width it wants and the caption underneath the
          value wraps to two lines to make room for it. */}
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
PyramidChartHeader.displayName = 'PyramidChart.Header';
PyramidChartHeader.layer = 'header' as Layer;

export const PyramidChart = Object.assign(PyramidChartRoot, {
  Header: PyramidChartHeader,
  Grid: PyramidChartGrid,
  Bar: PyramidChartBar,
  Skeleton: PyramidChartSkeleton,
  XAxis: PyramidChartXAxis,
  YAxis: PyramidChartYAxis,
  Tooltip: PyramidChartTooltip,
  Legend: PyramidChartLegend,
});
