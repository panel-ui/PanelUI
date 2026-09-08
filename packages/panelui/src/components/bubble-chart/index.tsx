/**
 * BubbleChart — one labelled circle per row, on two measured axes, with a third
 * quantity on each circle's area.
 *
 * ```tsx
 * <BubbleChart data={teams} xDataKey="efficiency" yDataKey="performance"
 *   sizeKey="headcount" labelKey="team">
 *   <BubbleChart.Grid />
 *   <BubbleChart.Bubbles />
 *   <BubbleChart.Labels />
 *   <BubbleChart.XAxis />
 *   <BubbleChart.YAxis />
 *   <BubbleChart.Tooltip />
 * </BubbleChart>
 * ```
 *
 * ## When this and not a scatter plot
 *
 * `ScatterChart` also maps a third quantity onto point area, through `sizeKey`,
 * and it is the right component for a *series* of observations: many points of
 * one colour, where the shape of the cloud is the finding and no single dot
 * needs a name.
 *
 * This one is for a handful of named things. Each row is its own circle with
 * its own colour and its own label written inside it, so the chart can be read
 * entity by entity rather than as a distribution. Eight teams, twelve products,
 * six regions — where the reader wants to find one of them and see where it
 * sits.
 *
 * ## Area, not radius
 *
 * `sizeKey` maps to a circle's area. Doubling a radius quadruples the ink, so a
 * chart that scaled the radius would show a doubled value as four times the
 * size, and the reader would believe the picture. The scale runs over the whole
 * data set, so one bubble's size means the same thing as another's.
 *
 * ## Labels are text, not SVG
 *
 * The names inside the bubbles are React Native `Text` in a layer over the
 * plot, so they follow the theme's font and the platform's text scaling — SVG
 * text does neither. A bubble too small to hold its own label is left without
 * one rather than given an unreadable one; the readout still names it.
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
import { useSkeletonHandoff } from '../../hooks/use-skeleton-handoff';
import {
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import {
  bubbleRadius,
  compactNumber,
  niceDomain,
  useSeriesColor,
  xAt,
  yOf,
  type Plot,
} from '../../utils/chart';
import { cn } from '../../utils/cn';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(SvgLine);

/**
 * How much of the reveal is spent handing out the bubbles' start times. The
 * rest is the window each one gets, so the whole field still lands inside the
 * one duration however many there are.
 */
const STAGGER = 0.4;

/** Milliseconds for a bubble to swell as it is selected, and settle as it is not. */
const SELECT_DURATION = 140;

/**
 * A bubble arriving: up past its size and back to it.
 *
 * A circle that simply grows to its radius reads as the chart still loading
 * right up to the last frame. The small overshoot is what makes it read as
 * landing.
 */
function landing(t: number): number {
  'worklet';
  const back = 1.3;
  const u = t - 1;
  return 1 + (back + 1) * u * u * u + back * u * u;
}

/** Room left around the plot for the axis labels and the outermost bubbles. */
const PADDING = { top: 18, right: 18, bottom: 22, left: 18 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Box each axis label is centred in, so a long number is ellipsised not shoved. */
const AXIS_LABEL_WIDTH = 56;

/** Width of the readout that floats by the selected bubble. */
const LABEL_WIDTH = 132;

/** Gap between the readout and the edge of the bubble it describes. */
const LABEL_GAP = 10;

/** Line box a bubble's own label is laid out in. */
const BUBBLE_LABEL_HEIGHT = 16;

/**
 * Smallest radius a bubble may have and still be given its label. Below this
 * the name is wider than the circle and reads as text lying on the plot rather
 * than as the bubble's own.
 *
 * Ten points, which is a twenty-point circle: enough for the initial or the
 * short code a bubble chart's labels usually are. Set higher and the smallest
 * bubble in an ordinary set silently loses its name, which reads as a bug
 * rather than as a decision.
 */
const LABEL_MIN_RADIUS = 10;

/** Floor on the touch target, for a chart whose smallest bubbles are tiny. */
const HIT_RADIUS = 22;

/** How many colours the ramp cycles through. */
const PALETTE_SIZE = 5;

/** Steps each axis is rounded out to. Matches the labels an axis draws. */
const AXIS_STEPS = 4;

/** Room under the numbers for an axis's own name, when it is given one. */
const AXIS_TITLE_HEIGHT = 18;

/** Gap between a quadrant's caption and the corner it is written in. */
const QUADRANT_LABEL_INSET = 6;

/**
 * How strongly the overlays draw: the quadrant crosshair, and the size key's
 * rings.
 *
 * Both are furniture rather than data, and both were faint enough to be missed
 * — the crosshair at 0.4 and the rings at 0.6, on a token that is already a
 * mid-grey chosen to stay behind the circles. The restraint has to come from
 * the token, not from a second reduction on top of it, or the mark is one
 * nobody finds. `Trend` has drawn at 0.7 all along and reads correctly in both
 * themes, so that is the number.
 */
const CROSSHAIR_OPACITY = 0.7;
const KEY_RING_OPACITY = 0.85;

/** Column the size key's values are written in, beside its circles. */
const SIZE_KEY_LABEL_WIDTH = 44;

/** Gap between the size key's circles and the values naming them. */
const SIZE_KEY_GAP = 6;

/** Room beside the numbers for the y axis's name, which is turned on its side. */
const AXIS_TITLE_WIDTH = 18;

type Layer = 'svg' | 'overlay' | 'header' | 'footer';

export type BubbleChartStatus = 'loading' | 'ready';

export type BubbleChartDatum = Record<string, string | number | null | undefined>;

/** One bubble, resolved back to the row it came from. */
export interface BubbleChartPoint {
  /** Index into `data`. */
  index: number;
  x: number;
  y: number;
  /** The value behind the area, when `sizeKey` is set. */
  size: number | null;
  /** The name written inside the circle, when `labelKey` is set. */
  label: string;
  /** The colour it was drawn in. */
  color: string;
  datum: BubbleChartDatum;
}

/** A bubble with its geometry resolved. Shared by every part. */
interface ResolvedBubble extends BubbleChartPoint {
  /** Radius in points, off the area scale. */
  r: number;
}

interface BubbleChartContextValue {
  data: BubbleChartDatum[];
  xDataKey: string;
  yDataKey: string;
  labelKey: string | undefined;
  plot: Plot;
  status: BubbleChartStatus;
  bubbles: ResolvedBubble[];
  xMin: SharedValue<number>;
  xMax: SharedValue<number>;
  yMin: SharedValue<number>;
  yMax: SharedValue<number>;
  /** The settled domains, for the parts that draw text rather than geometry. */
  xExtent: [number, number];
  yExtent: [number, number];
  /** Lowest and highest value behind the areas, or null without a `sizeKey`. */
  sizeExtent: [number, number] | null;
  /** The radii those two values map onto. */
  sizeRange: [number, number];
  /** 0 to 1 as the bubbles grow in. Shared, so they arrive as one chart. */
  reveal: SharedValue<number>;
  activeIndex: SharedValue<number>;
  activeIndexJS: number;
  setActivePoint: (point: BubbleChartPoint | null) => void;
}

const BubbleChartContext = createContext<BubbleChartContextValue | null>(null);

function useChart(component: string): BubbleChartContextValue {
  const context = useContext(BubbleChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <BubbleChart>`);
  }
  return context;
}

/**
 * The bubble under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActivePointChange` for that.
 */
export function useBubbleChart() {
  const { bubbles, activeIndexJS } = useChart('useBubbleChart');
  const active = bubbles.find((bubble) => bubble.index === activeIndexJS) ?? null;
  return { activeIndex: activeIndexJS, activePoint: active };
}

/**
 * An extent widened out to round numbers, and a usable one for the degenerate
 * cases — no data at all, or every reading identical. A domain of zero width
 * divides by zero and puts every bubble on the same edge.
 *
 * Rounded rather than padded by a fraction: a fraction of the data's own span
 * ends the axis at 52.7, which is true and which nobody was looking for. Two
 * steps, matching the labels each axis draws by default, so the middle one is
 * round as well as the ends.
 */
function padExtent(min: number, max: number): [number, number] {
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return niceDomain(min, max, AXIS_STEPS);
}

export interface BubbleChartProps
  extends ViewProps,
    ChartAccessibilityProps<BubbleChartDatum> {
  className?: string;
  /** The rows. One bubble each. */
  data: BubbleChartDatum[];
  /** Key holding the horizontal value. */
  xDataKey?: string;
  /** Key holding the vertical value. */
  yDataKey?: string;
  /**
   * Key holding the third quantity, mapped to each bubble's *area*. Without it
   * every bubble is drawn at the middle of `sizeRange` and the chart is a
   * scatter plot with names on it.
   */
  sizeKey?: string;
  /** Key holding the name written inside the circle. */
  labelKey?: string;
  /**
   * Key holding a colour for the row — either a CSS colour or a number from 1
   * to 5 naming a `--color-chart-*` token. Without it the ramp cycles by row.
   */
  colorKey?: string;
  /**
   * Smallest and largest radius `sizeKey` maps onto, in points. The largest is
   * also what the plot holds back at every edge, so raising it costs room.
   */
  sizeRange?: [number, number];
  /**
   * `loading` shows a still field of muted circles and dissolves it as the real
   * bubbles grow in. One component throughout, rather than a spinner swapped
   * for a chart — swapping loses the transition. Add a `BubbleChart.Skeleton`
   * for something to stand in the plot meanwhile.
   */
  status?: BubbleChartStatus;
  /** Width ÷ height. `1` is the square shape a bubble field reads best in. */
  aspectRatio?: number;
  /** Milliseconds for the bubbles to grow in on mount. */
  animationDuration?: number;
  /** Milliseconds for the axes to settle after the data changes. */
  domainDuration?: number;
  /** Fix the horizontal axis instead of deriving it. */
  xDomain?: [number, number];
  /** Fix the vertical axis instead of deriving it. */
  yDomain?: [number, number];
  /** The bubble under the finger, and `null` when it lifts. */
  onActivePointChange?: (point: BubbleChartPoint | null) => void;
  children?: ReactNode;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface BubbleChartHandle {
  replay: () => void;
}

function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];
  const footer: ReactNode[] = [];
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'svg';
    const slot = <ChildSlot key={index}>{child}</ChildSlot>;
    const into =
      layer === 'header' ? header : layer === 'footer' ? footer : layer === 'overlay' ? overlay : svg;
    into.push(slot);
  });
  return { svg, overlay, header, footer };
}

function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const BubbleChartRoot = forwardRef<BubbleChartHandle, BubbleChartProps>(
  function BubbleChartRoot(
    {
      className,
      data,
      xDataKey = 'x',
      yDataKey = 'y',
      sizeKey,
      labelKey,
      colorKey,
      sizeRange = [10, 28],
      status = 'ready',
      aspectRatio = 1,
      animationDuration = 800,
      domainDuration = 500,
      xDomain,
      yDomain,
      onActivePointChange,
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
    const [activeIndexJS, setActiveIndexJS] = useState(-1);

    const reveal = useSharedValue(0);
    const xMin = useSharedValue(0);
    const xMax = useSharedValue(0);
    const yMin = useSharedValue(0);
    const yMax = useSharedValue(0);
    const activeIndex = useSharedValue(-1);
    const reducedMotion = useReducedMotion();

    /*
     * The whole ramp, resolved once. Every bubble is its own category here
     * rather than a member of a series, so the colour is chosen by row index
     * and there is nothing to register.
     */
    const chart1 = useSeriesColor(undefined, 1);
    const chart2 = useSeriesColor(undefined, 2);
    const chart3 = useSeriesColor(undefined, 3);
    const chart4 = useSeriesColor(undefined, 4);
    const chart5 = useSeriesColor(undefined, 5);
    const palette = useMemo(
      () => [chart1, chart2, chart3, chart4, chart5],
      [chart1, chart2, chart3, chart4, chart5]
    );

    /*
     * What the axes are going to need before anything has been laid out. The
     * gutter for the y labels and the strip under the x ones are the plot's
     * padding, so they have to be known here rather than by the parts that draw
     * them — a part that reserved its own room would be positioned against a
     * plot that had already been sized without it.
     */
    const axes = useMemo(() => {
      let y = false;
      let yTitle = false;
      let xTitle = false;
      Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const axis = (child.type as { axis?: string }).axis;
        const labelled = Boolean((child.props as { label?: string }).label);
        if (axis === 'y') {
          y = true;
          if (labelled) yTitle = true;
        }
        if (axis === 'x' && labelled) xTitle = true;
      });
      return { y, yTitle, xTitle };
    }, [children]);

    /*
     * A circle is drawn about its centre, so every edge of the plot has to hold
     * back the largest radius or the outermost bubble is cropped by it — and
     * the largest bubble is the one carrying the largest value, which is the
     * last one that should be half missing. `sizeRange` is the ceiling, so this
     * is known before anything is measured.
     */
    const reach = sizeRange[1];
    const pad = {
      top: Math.max(PADDING.top, reach),
      right: Math.max(PADDING.right, reach),
      bottom:
        Math.max(PADDING.bottom, reach) + (axes.xTitle ? AXIS_TITLE_HEIGHT : 0),
      left: Math.max(
        axes.y ? Y_AXIS_WIDTH + (axes.yTitle ? AXIS_TITLE_WIDTH : 0) : PADDING.left,
        reach
      ),
    };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };

    const extents = useMemo(() => {
      let lowX = Infinity;
      let highX = -Infinity;
      let lowY = Infinity;
      let highY = -Infinity;
      for (const row of data) {
        const x = row[xDataKey];
        const y = row[yDataKey];
        // A row missing either coordinate is not a bubble at all, and must not
        // stretch the axes towards an origin it never had.
        if (typeof x !== 'number' || Number.isNaN(x)) continue;
        if (typeof y !== 'number' || Number.isNaN(y)) continue;
        if (x < lowX) lowX = x;
        if (x > highX) highX = x;
        if (y < lowY) lowY = y;
        if (y > highY) highY = y;
      }
      return {
        x: xDomain ?? padExtent(lowX, highX),
        y: yDomain ?? padExtent(lowY, highY),
      };
    }, [data, xDataKey, yDataKey, xDomain, yDomain]);

    /*
     * The size scale runs over the whole data set, so one bubble's area means
     * the same thing as another's. Without a `sizeKey` there is nothing to
     * scale and every bubble takes the middle of the range — which is a
     * scatter plot with names on it, and an honest one.
     */
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

    /*
     * Resolved once, in the root, because four parts need exactly this list and
     * three of them would otherwise derive it again: the circles, the labels
     * over them, the hit test under them and the legend beside them all have to
     * agree about where a bubble is and how big it is.
     */
    const bubbles = useMemo<ResolvedBubble[]>(() => {
      const middle = (sizeRange[0] + sizeRange[1]) / 2;
      const out: ResolvedBubble[] = [];
      data.forEach((datum, index) => {
        const x = datum[xDataKey];
        const y = datum[yDataKey];
        if (typeof x !== 'number' || Number.isNaN(x)) return;
        if (typeof y !== 'number' || Number.isNaN(y)) return;

        const raw = sizeKey ? datum[sizeKey] : undefined;
        const value = typeof raw === 'number' && !Number.isNaN(raw) ? raw : null;
        const r =
          sizeExtent && value !== null
            ? bubbleRadius(value, sizeExtent, sizeRange)
            : middle;

        const explicit = colorKey ? datum[colorKey] : undefined;
        const color =
          typeof explicit === 'string'
            ? explicit
            : typeof explicit === 'number'
              ? (palette[(Math.round(explicit) - 1 + PALETTE_SIZE) % PALETTE_SIZE] ??
                palette[0]!)
              : (palette[index % PALETTE_SIZE] ?? palette[0]!);

        out.push({
          index,
          x,
          y,
          r,
          size: value,
          label: labelKey ? String(datum[labelKey] ?? '') : '',
          color,
          datum,
        });
      });
      return out;
    }, [data, xDataKey, yDataKey, sizeKey, labelKey, colorKey, sizeExtent, sizeRange, palette]);

    const loading = status === 'loading';

    useEffect(() => {
      if (loading) return;
      const [x0, x1] = extents.x;
      const [y0, y1] = extents.y;
      // The first domain lands without a tween: there is no previous scale to
      // move from, and animating up from zero reads as the numbers changing.
      const first =
        xMin.value === 0 && xMax.value === 0 && yMin.value === 0 && yMax.value === 0;
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
         * Eased out rather than in and out. Each bubble is given a slice of
         * this one clock, so an ease that dawdles at the start spends it on the
         * first few and leaves the rest to arrive in a rush.
         */
        reveal.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        });
      },
      [reducedMotion, animationDuration, reveal]
    );

    useEffect(() => {
      if (loading) {
        revealed.current = false;
        reveal.value = 0;
        return;
      }
      if (revealed.current || plot.width <= 0 || !bubbles.length) return;
      revealed.current = true;
      playReveal();
    }, [loading, plot.width, bubbles.length, playReveal, reveal]);

    useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

    // One place the selection lands, so the chart's own children and a readout
    // outside it never disagree about which bubble is active.
    const setActivePoint = useMemo(
      () => (point: BubbleChartPoint | null) => {
        setActiveIndexJS(point ? point.index : -1);
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

    const context = useMemo<BubbleChartContextValue>(
      () => ({
        data,
        xDataKey,
        yDataKey,
        labelKey,
        plot,
        status,
        bubbles,
        xMin,
        xMax,
        yMin,
        yMax,
        xExtent: extents.x,
        yExtent: extents.y,
        sizeExtent,
        sizeRange,
        reveal,
        activeIndex,
        activeIndexJS,
        setActivePoint,
      }),
      // `plot` is rebuilt every render from `size`, so it is compared by value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        data,
        xDataKey,
        yDataKey,
        labelKey,
        plot.width,
        plot.height,
        plot.left,
        plot.top,
        status,
        bubbles,
        xMin,
        xMax,
        yMin,
        yMax,
        extents,
        sizeExtent,
        sizeRange,
        reveal,
        activeIndex,
        activeIndexJS,
        setActivePoint,
      ]
    );

    const { svg, overlay, header, footer } = partition(children);

    /*
     * Two views, because the header is not part of the plot. `aspectRatio` and
     * the layout measurement belong to the drawing area alone — measured on the
     * outer view they would take in the header too, and the plot would lose as
     * much height as the readout took while still claiming the shape asked for.
     */
    return (
      <BubbleChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Bubble chart"
            data={data}
            disabled={accessible === false || loading}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
            valueOf={(datum) => {
              const pairs: [string, unknown][] = [
                [xDataKey, datum[xDataKey]],
                [yDataKey, datum[yDataKey]],
              ];
              if (labelKey) pairs.unshift([labelKey, datum[labelKey]]);
              if (sizeKey) pairs.push([sizeKey, datum[sizeKey]]);
              return pairs;
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
                {overlay}
              </>
            ) : null}
          </View>
          {footer}
        </View>
      </BubbleChartContext.Provider>
    );
  }
);
BubbleChartRoot.displayName = 'BubbleChart';

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface BubbleChartGridProps {
  /**
   * Horizontal rules across the plot.
   *
   * Eight, which is twice the four intervals an axis is divided into by
   * default, so every second line carries a number and the ones between it are
   * halves of a labelled step rather than an unrelated rhythm. Squares this
   * size recede behind the circles; the coarse grid a smaller number draws
   * reads as blocks laid over the plot.
   */
  rows?: number;
  /** Vertical rules up it. Both axes are measured, so both earn lines. */
  columns?: number;
  /** Dash pattern for the rules. Pass `undefined` for solid ones. */
  dashArray?: string;
  color?: string;
  opacity?: number;
}

/** Reference lines both ways, so a bubble can be placed against two numbers. */
function BubbleChartGrid({
  rows = 8,
  columns = 8,
  dashArray = '4,6',
  color,
  opacity = 1,
}: BubbleChartGridProps) {
  const { plot } = useChart('BubbleChart.Grid');
  const token = useCSSVariable('--color-border');
  // The fallback is grey rather than black: it stands in when the theme cannot
  // be read, and a black hairline is invisible on a dark background.
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  const horizontals = Array.from({ length: rows + 1 }, (_unused, i) => i / rows);
  const verticals = Array.from({ length: columns + 1 }, (_unused, i) => i / columns);

  return (
    <G opacity={opacity}>
      {horizontals.map((fraction) => (
        <SvgLine
          key={`h${fraction}`}
          x1={plot.left}
          x2={plot.left + plot.width}
          y1={plot.top + plot.height * fraction}
          y2={plot.top + plot.height * fraction}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray={dashArray}
        />
      ))}
      {verticals.map((fraction) => (
        <SvgLine
          key={`v${fraction}`}
          x1={plot.left + plot.width * fraction}
          x2={plot.left + plot.width * fraction}
          y1={plot.top}
          y2={plot.top + plot.height}
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray={dashArray}
        />
      ))}
    </G>
  );
}
BubbleChartGrid.displayName = 'BubbleChart.Grid';
BubbleChartGrid.layer = 'svg' as Layer;

export interface BubbleChartTrendProps {
  /**
   * The line's slope and intercept, and how tightly the cloud sits on it, once
   * they have been computed. `r` runs 0 to 1: 1 is every bubble on the line,
   * 0 is a cloud with no direction at all.
   *
   * Given here rather than left for the caller to work out, because the fit is
   * already being computed to draw the line and doing it twice invites the two
   * answers to disagree.
   *
   * It fires when the numbers change, not on every render that produced the
   * same ones, so putting the fit straight into state is safe.
   */
  onFit?: (fit: { slope: number; intercept: number; r: number }) => void;
  color?: string;
  strokeWidth?: number;
  /** Dash pattern. Dashed by default: the line is a reading, not a measurement. */
  dashArray?: string;
  opacity?: number;
}

/**
 * The straight line that fits the cloud best, drawn across the plot.
 *
 * It is dashed and drawn under the circles, because it is not data — it is a
 * summary of the data, and a solid rule through the middle of a field of
 * bubbles reads as a value somebody plotted.
 *
 * The fit is least squares on the raw values, so it moves with the data rather
 * than with the frame: resizing the chart never changes the line's meaning.
 * Fewer than two bubbles, or every bubble on one vertical, has no line to draw
 * and none is drawn.
 */
function BubbleChartTrend({
  onFit,
  color,
  strokeWidth = 1.5,
  dashArray = '6,5',
  opacity = 0.7,
}: BubbleChartTrendProps) {
  const { bubbles, plot, status, xMin, xMax, yMin, yMax, reveal } =
    useChart('BubbleChart.Trend');
  const token = useCSSVariable('--color-muted-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.8)');

  const fit = useMemo(() => {
    const n = bubbles.length;
    if (n < 2) return null;
    let sumX = 0;
    let sumY = 0;
    for (const bubble of bubbles) {
      sumX += bubble.x;
      sumY += bubble.y;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (const bubble of bubbles) {
      const dx = bubble.x - meanX;
      const dy = bubble.y - meanY;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    // Every bubble on one vertical: the best fit is that vertical, which has no
    // slope and nothing useful to draw.
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    const denominator = Math.sqrt(sxx * syy);
    return {
      slope,
      intercept: meanY - slope * meanX,
      r: denominator === 0 ? 0 : Math.abs(sxy / denominator),
    };
  }, [bubbles]);

  const fitRef = useRef(onFit);
  useEffect(() => {
    fitRef.current = onFit;
  });

  /*
   * Reported when the numbers change, not when the object does.
   *
   * `bubbles` is rebuilt whenever any of its inputs changes identity, and
   * `sizeRange={[14, 30]}` written at a call site is a new array every render —
   * so the fit is a new object every render even when the data has not moved.
   * Handing that to a caller who puts it in state is a render loop, and the
   * caller has no way to see that coming.
   */
  const reported = useRef<{ slope: number; intercept: number; r: number } | null>(null);
  useEffect(() => {
    if (!fit) return;
    const last = reported.current;
    if (
      last &&
      last.slope === fit.slope &&
      last.intercept === fit.intercept &&
      last.r === fit.r
    ) {
      return;
    }
    reported.current = fit;
    fitRef.current?.(fit);
  }, [fit]);

  const slope = fit?.slope ?? 0;
  const intercept = fit?.intercept ?? 0;

  const animatedProps = useAnimatedProps(() => {
    const x0 = xMin.value;
    const x1 = xMax.value;
    const lowY = yMin.value;
    const highY = yMax.value;

    /*
     * Solved in data space and then clipped there, rather than drawn across the
     * plot and clipped by the frame: a line that leaves the top of the chart
     * has to stop where it leaves it, and the x of that point is only knowable
     * from the equation.
     */
    let ax = x0;
    let bx = x1;
    if (slope !== 0) {
      const atLow = (lowY - intercept) / slope;
      const atHigh = (highY - intercept) / slope;
      const enter = Math.min(atLow, atHigh);
      const exit = Math.max(atLow, atHigh);
      ax = Math.max(ax, enter);
      bx = Math.min(bx, exit);
    }
    if (bx < ax) {
      // The line never crosses the visible box.
      return { x1: 0, x2: 0, y1: 0, y2: 0, opacity: 0 };
    }

    // Drawn out from the middle as the bubbles land, so the line arrives with
    // the field rather than being there waiting for it.
    const grown = Math.max(0, Math.min(1, reveal.value));
    const midpoint = (ax + bx) / 2;
    const half = ((bx - ax) / 2) * grown;

    const startX = midpoint - half;
    const endX = midpoint + half;
    return {
      x1: xAt(startX, plot, x0, x1),
      x2: xAt(endX, plot, x0, x1),
      y1: yOf(intercept + slope * startX, plot, lowY, highY),
      y2: yOf(intercept + slope * endX, plot, lowY, highY),
      opacity: opacity * grown,
    };
  });

  if (status === 'loading' || !fit) return null;

  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeLinecap="round"
    />
  );
}
BubbleChartTrend.displayName = 'BubbleChart.Trend';
BubbleChartTrend.layer = 'svg' as Layer;

export interface BubbleChartBubblesProps {
  /**
   * Fill opacity. Below 1 by default so that overlapping bubbles read as
   * denser rather than hiding each other — in a crowded corner that overlap
   * *is* the finding, and opaque circles erase it.
   */
  opacity?: number;
  /** One colour for every bubble, overriding the per-row ramp. */
  color?: string;
}

/** The circles. */
function BubbleChartBubbles({ opacity = 0.9, color }: BubbleChartBubblesProps) {
  const { bubbles, plot, status, xMin, xMax, yMin, yMax, reveal, activeIndex } =
    useChart('BubbleChart.Bubbles');

  if (status === 'loading') return null;

  return (
    <G>
      {bubbles.map((bubble, order) => (
        <Bubble
          key={bubble.index}
          bubble={bubble}
          plot={plot}
          xMin={xMin}
          xMax={xMax}
          yMin={yMin}
          yMax={yMax}
          fill={color ?? bubble.color}
          opacity={opacity}
          activeIndex={activeIndex}
          reveal={reveal}
          order={order}
          total={bubbles.length}
        />
      ))}
    </G>
  );
}
BubbleChartBubbles.displayName = 'BubbleChart.Bubbles';
BubbleChartBubbles.layer = 'svg' as Layer;

/**
 * One bubble. Its position follows both domain tweens, so a data change moves
 * the whole field to the new scale rather than cutting to it.
 *
 * It arrives by growing in place, on its own slice of the shared reveal. A wipe
 * across the plot — which is what the line and area charts do — gives the
 * reader a direction to read the arrival in, and a field of bubbles has none:
 * position is the whole message, so a bubble may only ever appear where it
 * belongs.
 */
function Bubble({
  bubble,
  plot,
  xMin,
  xMax,
  yMin,
  yMax,
  fill,
  opacity,
  activeIndex,
  reveal,
  order,
  total,
}: {
  bubble: ResolvedBubble;
  plot: Plot;
  xMin: SharedValue<number>;
  xMax: SharedValue<number>;
  yMin: SharedValue<number>;
  yMax: SharedValue<number>;
  fill: string;
  opacity: number;
  activeIndex: SharedValue<number>;
  reveal: SharedValue<number>;
  order: number;
  total: number;
}) {
  const { index, x, y, r } = bubble;

  /*
   * The selection, as something that moves. A hard switch made the bubble it
   * named jump between one frame and the next while every neighbour stayed put,
   * which reads as a glitch rather than as a response to the finger.
   */
  const selected = useDerivedValue(() =>
    withTiming(activeIndex.value === index ? 1 : 0, { duration: SELECT_DURATION })
  );

  // Where in the reveal this bubble starts. Spread over `STAGGER`, so the field
  // settles as a field rather than switching on all at once.
  const start = total > 1 ? (order / total) * STAGGER : 0;

  const animatedProps = useAnimatedProps(() => {
    const arrived = Math.max(0, Math.min(1, (reveal.value - start) / (1 - STAGGER)));
    // The selected bubble swells and goes solid. Both, rather than one: a size
    // change alone is easy to miss among neighbours, and an opacity change
    // alone is invisible wherever the circles already overlap.
    const swell = 1 + 0.12 * selected.value;
    return {
      cx: xAt(x, plot, xMin.value, xMax.value),
      cy: yOf(y, plot, yMin.value, yMax.value),
      r: r * landing(arrived) * swell,
      // Ahead of the size, so a bubble is legible by the time it stops moving
      // rather than fading in for the whole of its arrival.
      fillOpacity:
        Math.min(1, arrived * 2) * (opacity + (1 - opacity) * selected.value),
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill={fill} />;
}

export interface BubbleChartSkeletonProps {
  /** How many placeholder circles to scatter. */
  count?: number;
  color?: string;
}

/**
 * The loading state: a still field of muted circles where the data will be.
 *
 * Deliberately still. A shimmer over a field of circles reads as them *moving*,
 * which is the one thing this chart must never appear to do — position is the
 * entire message, and a loading state that implies it is changing is a loading
 * state that lies.
 *
 * The layout is deterministic rather than random, so it does not reshuffle on
 * every render of a component that may re-render several times while waiting.
 * It dissolves as the real bubbles grow in, and outlives the status change by
 * exactly that long: cut at the frame the data lands, the placeholder would
 * disappear before anything had replaced it.
 */
function BubbleChartSkeleton({ count = 7, color }: BubbleChartSkeletonProps) {
  const { plot, status } = useChart('BubbleChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const fill = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  const { mounted, opacity: fade } = useSkeletonHandoff(status === 'loading');

  const circles = useMemo(
    () =>
      // Two irrational-ish strides that do not share a factor, so the circles
      // spread instead of falling into a lattice.
      Array.from({ length: count }, (_unused, index) => ({
        key: index,
        fx: ((index * 0.618) % 1) * 0.84 + 0.08,
        fy: ((index * 0.379) % 1) * 0.84 + 0.08,
        r: 16 + ((index * 0.472) % 1) * 12,
      })),
    [count]
  );

  const animatedProps = useAnimatedProps(() => ({ opacity: fade.value }));

  if (!mounted) return null;

  return (
    <AnimatedG animatedProps={animatedProps}>
      {circles.map((circle) => (
        <Circle
          key={circle.key}
          cx={plot.left + circle.fx * plot.width}
          cy={plot.top + circle.fy * plot.height}
          r={circle.r}
          fill={fill}
        />
      ))}
    </AnimatedG>
  );
}
BubbleChartSkeleton.displayName = 'BubbleChart.Skeleton';
BubbleChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

export interface BubbleChartLabelsProps {
  /**
   * Smallest radius a bubble may have and still be given its label. Below it
   * the name is wider than the circle it names.
   */
  minRadius?: number;
  /** Turn a bubble into its label. Defaults to the value at `labelKey`. */
  format?: (point: BubbleChartPoint) => string;
  className?: string;
}

/**
 * The names, written inside the circles.
 *
 * Real text over the plot rather than SVG text, so they follow the theme's font
 * and the platform's text scaling. Each one rides the same domain tweens the
 * circle under it does, so a label never lags the bubble it belongs to.
 *
 * A bubble too small to hold its name is left without one. Shrinking the text
 * to fit would make it unreadable on exactly the bubbles the reader is
 * squinting at already; the readout names those instead.
 */
function BubbleChartLabels({
  minRadius = LABEL_MIN_RADIUS,
  format,
  className,
}: BubbleChartLabelsProps) {
  const { bubbles, plot, status, xMin, xMax, yMin, yMax, reveal } =
    useChart('BubbleChart.Labels');

  if (status === 'loading') return null;

  return (
    <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {bubbles
        .filter((bubble) => bubble.r >= minRadius && (format || bubble.label))
        .map((bubble, order) => (
          <BubbleLabel
            key={bubble.index}
            bubble={bubble}
            text={format ? format(bubble) : bubble.label}
            plot={plot}
            xMin={xMin}
            xMax={xMax}
            yMin={yMin}
            yMax={yMax}
            reveal={reveal}
            order={order}
            total={bubbles.length}
            className={className}
          />
        ))}
    </View>
  );
}
BubbleChartLabels.displayName = 'BubbleChart.Labels';
BubbleChartLabels.layer = 'overlay' as Layer;

export interface BubbleChartQuadrantsProps {
  /** Where the vertical rule stands. Defaults to the mean of the x values. */
  x?: number;
  /** Where the horizontal rule lies. Defaults to the mean of the y values. */
  y?: number;
  /** A word for each corner, written in the corner it belongs to. */
  labels?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  /** Tint the high-high and low-low corners. On by default. */
  tint?: boolean;
  color?: string;
  className?: string;
}

/**
 * A crosshair splitting the plot into four, with a name for each corner.
 *
 * A field of bubbles is usually read as four groups rather than as a cloud —
 * which of these is doing well on both counts, which on neither — and without
 * a divider the reader draws that line by eye, in a different place each time.
 * Putting it on the chart makes it one line everybody sees.
 *
 * It stands at the mean of each axis by default, because that is the split the
 * data itself argues for. Pass `x` and `y` for a target, a budget or last
 * year's number — a threshold somebody decided rather than one the data
 * produced.
 *
 * The tint marks the two corners a reading usually ends at. Turn it off where
 * all four corners matter equally.
 */
function BubbleChartQuadrants({
  x,
  y,
  labels,
  tint = true,
  color,
  className,
}: BubbleChartQuadrantsProps) {
  const { bubbles, plot, status, xMin, xMax, yMin, yMax } =
    useChart('BubbleChart.Quadrants');
  const token = useCSSVariable('--color-muted-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.8)');

  const centre = useMemo(() => {
    if (!bubbles.length) return null;
    let sumX = 0;
    let sumY = 0;
    for (const bubble of bubbles) {
      sumX += bubble.x;
      sumY += bubble.y;
    }
    return { x: x ?? sumX / bubbles.length, y: y ?? sumY / bubbles.length };
  }, [bubbles, x, y]);

  const atX = centre?.x ?? 0;
  const atY = centre?.y ?? 0;

  const verticalStyle = useAnimatedStyle(() => ({
    left: xAt(atX, plot, xMin.value, xMax.value),
  }));
  const horizontalStyle = useAnimatedStyle(() => ({
    top: yOf(atY, plot, yMin.value, yMax.value),
  }));
  /*
   * Two rectangles rather than four: the pair that is tinted is the pair the
   * reader is being pointed at, and shading all four would only be a checked
   * background.
   */
  const highStyle = useAnimatedStyle(() => {
    const cx = xAt(atX, plot, xMin.value, xMax.value);
    const cy = yOf(atY, plot, yMin.value, yMax.value);
    return {
      left: cx,
      top: plot.top,
      width: Math.max(plot.left + plot.width - cx, 0),
      height: Math.max(cy - plot.top, 0),
    };
  });
  const lowStyle = useAnimatedStyle(() => {
    const cx = xAt(atX, plot, xMin.value, xMax.value);
    const cy = yOf(atY, plot, yMin.value, yMax.value);
    return {
      left: plot.left,
      top: cy,
      width: Math.max(cx - plot.left, 0),
      height: Math.max(plot.top + plot.height - cy, 0),
    };
  });

  if (status === 'loading' || !centre) return null;

  const corner = {
    position: 'absolute' as const,
    width: plot.width / 2 - QUADRANT_LABEL_INSET,
  };

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0 }}
      className={cn(className)}
    >
      {tint ? (
        <>
          <Animated.View
            style={[{ position: 'absolute' }, highStyle]}
            className="bg-foreground/[0.04]"
          />
          <Animated.View
            style={[{ position: 'absolute' }, lowStyle]}
            className="bg-foreground/[0.04]"
          />
        </>
      ) : null}
      {/*
        The same weight `Trend` draws at, because it is the same kind of mark:
        a reference laid over the field rather than a reading taken from it.
        At 0.4 of a mid-grey the split was a line you had to already know was
        there, which leaves four labelled corners and nothing dividing them.
      */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: plot.top,
            height: plot.height,
            width: 1,
            backgroundColor: stroke,
            opacity: CROSSHAIR_OPACITY,
          },
          verticalStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: plot.left,
            width: plot.width,
            height: 1,
            backgroundColor: stroke,
            opacity: CROSSHAIR_OPACITY,
          },
          horizontalStyle,
        ]}
      />
      {/*
        Pinned to the plot's corners rather than to the crosshair. A caption
        names the region, and a region's name belongs at the far end of it —
        following the rules it would crowd them as the split moved.
      */}
      {labels?.topLeft ? (
        <Text
          size="xs"
          weight="medium"
          numberOfLines={1}
          style={{
            ...corner,
            left: plot.left + QUADRANT_LABEL_INSET,
            top: plot.top + QUADRANT_LABEL_INSET,
          }}
        >
          {labels.topLeft}
        </Text>
      ) : null}
      {labels?.topRight ? (
        <Text
          size="xs"
          weight="medium"
          numberOfLines={1}
          style={{
            ...corner,
            left: plot.left + plot.width / 2,
            top: plot.top + QUADRANT_LABEL_INSET,
            textAlign: 'right',
          }}
        >
          {labels.topRight}
        </Text>
      ) : null}
      {labels?.bottomLeft ? (
        <Text
          size="xs"
          weight="medium"
          numberOfLines={1}
          style={{
            ...corner,
            left: plot.left + QUADRANT_LABEL_INSET,
            top: plot.top + plot.height - QUADRANT_LABEL_INSET - AXIS_LABEL_HEIGHT,
          }}
        >
          {labels.bottomLeft}
        </Text>
      ) : null}
      {labels?.bottomRight ? (
        <Text
          size="xs"
          weight="medium"
          numberOfLines={1}
          style={{
            ...corner,
            left: plot.left + plot.width / 2,
            top: plot.top + plot.height - QUADRANT_LABEL_INSET - AXIS_LABEL_HEIGHT,
            textAlign: 'right',
          }}
        >
          {labels.bottomRight}
        </Text>
      ) : null}
    </View>
  );
}
BubbleChartQuadrants.displayName = 'BubbleChart.Quadrants';
BubbleChartQuadrants.layer = 'overlay' as Layer;

export interface BubbleChartSizeKeyProps {
  /** Which corner of the plot it sits in. */
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** A word for what the area means — "people", "revenue". */
  label?: string;
  className?: string;
}

/**
 * Three nested circles saying what a bubble's area is worth.
 *
 * A bubble chart's third quantity is the one it cannot state: position can be
 * read off the axes, but area has no axis, so a reader can see that one circle
 * is bigger than another and has no way to know by how much. This is the only
 * part of the chart that answers that.
 *
 * Nested and sharing a baseline, which is how a difference in area is compared
 * — three circles in a row are three sizes, three circles inside one another
 * are one scale.
 *
 * It needs a `sizeKey` on the chart. Without one every bubble is the same size
 * and there is no scale to key.
 */
function BubbleChartSizeKey({
  placement = 'bottom-right',
  format,
  label,
  className,
}: BubbleChartSizeKeyProps) {
  const { plot, status, sizeExtent, sizeRange } = useChart('BubbleChart.SizeKey');
  const token = useCSSVariable('--color-muted-foreground');
  const stroke = typeof token === 'string' ? token : 'rgba(128,128,128,0.8)';

  const steps = useMemo(() => {
    if (!sizeExtent) return null;
    const [min, max] = sizeExtent;
    const middle = (min + max) / 2;
    // Largest first, so the smallest is drawn last and stays visible inside it.
    return [max, middle, min].map((value) => ({
      value,
      r: bubbleRadius(value, sizeExtent, sizeRange),
    }));
  }, [sizeExtent, sizeRange]);

  if (status === 'loading' || !steps) return null;

  const outer = steps[0]!.r;
  const width = outer * 2 + SIZE_KEY_LABEL_WIDTH;
  const height = outer * 2 + (label ? AXIS_LABEL_HEIGHT : 0);
  const top = placement.startsWith('top')
    ? plot.top
    : plot.top + plot.height - height;
  const left = placement.endsWith('left')
    ? plot.left
    : plot.left + plot.width - width;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left, top, width, height }}
      className={cn(className)}
    >
      {label ? (
        <Text size="xs" weight="medium" numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View style={{ height: outer * 2, width }}>
        {steps.map((step) => (
          <View
            key={step.value}
            style={{
              position: 'absolute',
              // Shared bottom edge and shared centre line: the circles nest
              // rather than stack, so the areas are laid over one another.
              bottom: 0,
              left: outer - step.r,
              width: step.r * 2,
              height: step.r * 2,
              borderRadius: step.r,
              borderWidth: 1,
              borderColor: stroke,
              opacity: KEY_RING_OPACITY,
            }}
          />
        ))}
        {steps.map((step) => (
          <Text
            key={`v${step.value}`}
            size="xs"
            weight="medium"
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: outer * 2 + SIZE_KEY_GAP,
              // Level with the top of the circle it names, which is the only
              // edge the three do not share.
              top: outer * 2 - step.r * 2 - AXIS_LABEL_HEIGHT / 2,
              width: SIZE_KEY_LABEL_WIDTH - SIZE_KEY_GAP,
            }}
          >
            {format ? format(step.value) : compactNumber(step.value)}
          </Text>
        ))}
      </View>
    </View>
  );
}
BubbleChartSizeKey.displayName = 'BubbleChart.SizeKey';
BubbleChartSizeKey.layer = 'overlay' as Layer;

function BubbleLabel({
  bubble,
  text,
  plot,
  xMin,
  xMax,
  yMin,
  yMax,
  reveal,
  order,
  total,
  className,
}: {
  bubble: ResolvedBubble;
  text: string;
  plot: Plot;
  xMin: SharedValue<number>;
  xMax: SharedValue<number>;
  yMin: SharedValue<number>;
  yMax: SharedValue<number>;
  reveal: SharedValue<number>;
  order: number;
  total: number;
  className?: string;
}) {
  const { x, y, r } = bubble;
  const width = r * 2;
  const start = total > 1 ? (order / total) * STAGGER : 0;

  const style = useAnimatedStyle(() => {
    const arrived = Math.max(0, Math.min(1, (reveal.value - start) / (1 - STAGGER)));
    return {
      opacity: Math.max(0, arrived * 2 - 1),
      transform: [
        { translateX: xAt(x, plot, xMin.value, xMax.value) - width / 2 },
        { translateY: yOf(y, plot, yMin.value, yMax.value) - BUBBLE_LABEL_HEIGHT / 2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, top: 0, width, height: BUBBLE_LABEL_HEIGHT },
        style,
      ]}
    >
      <Text
        size="xs"
        weight="medium"
        numberOfLines={1}
        // White on the fill, which is a chart colour in every theme rather than
        // a surface — so this is the one place a literal is right: the token
        // that reads on a card would vanish on the bubble.
        className={cn('text-center text-white', className)}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

export interface BubbleChartXAxisProps {
  /**
   * How many intervals to divide the axis into. Yields `ticks + 1` labels.
   *
   * Four, and the domain is rounded out to four steps to match, so the numbers
   * come out round. Fewer leaves most of the grid unnamed — a line with nothing
   * beside it is a line the reader has to count their way to.
   */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** What the axis measures, written under the numbers. */
  label?: string;
  className?: string;
}

/**
 * The x labels, evenly along the axis.
 *
 * Evenly spaced, because this axis is a continuous scale rather than a list of
 * rows. There is no bubble for a label to sit under.
 */
function BubbleChartXAxis({ ticks = 4, format, label, className }: BubbleChartXAxisProps) {
  const { plot, xExtent } = useChart('BubbleChart.XAxis');

  const labels = useMemo(() => {
    const [min, max] = xExtent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = min + ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [xExtent, ticks, format]);

  return (
    <View
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      className={cn(className)}
    >
      {label ? (
        <Text
          size="xs"
          muted
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: 0,
            left: plot.left,
            width: plot.width,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      ) : null}
      {labels.map((tick) => (
        <Text
          key={tick.key}
          size="xs"
          muted
          numberOfLines={1}
          style={{
            position: 'absolute',
            bottom: label ? AXIS_TITLE_HEIGHT : 0,
            // Centred on its tick, then held inside the chart. The first and
            // last ticks sit on the plot's own edges, so a box centred on them
            // hangs half its width off the side — the clamp slides those two
            // back in rather than letting the numbers leave the frame.
            left: Math.max(
              0,
              Math.min(
                plot.left + (plot.width / ticks) * tick.key - AXIS_LABEL_WIDTH / 2,
                plot.left + plot.width + PADDING.right - AXIS_LABEL_WIDTH
              )
            ),
            width: AXIS_LABEL_WIDTH,
            textAlign: 'center',
          }}
        >
          {tick.text}
        </Text>
      ))}
    </View>
  );
}
BubbleChartXAxis.displayName = 'BubbleChart.XAxis';
BubbleChartXAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room under the numbers before it lays
// the plot out.
BubbleChartXAxis.axis = 'x' as const;

export interface BubbleChartYAxisProps {
  /**
   * How many intervals to divide the axis into. Yields `ticks + 1` labels.
   *
   * Four, matching the four steps the domain is rounded out to and every second
   * line of the default grid.
   */
  ticks?: number;
  /** Turn a value into its label. Defaults to a compact number. */
  format?: (value: number) => string;
  /** What the axis measures, written up the side of it. */
  label?: string;
  className?: string;
}

/**
 * Value labels down the side, evenly over the axis, and the gutter they sit in.
 *
 * They land on every second line of the default grid rather than on all of
 * them: a number beside every line of a grid fine enough to read against is a
 * column of numbers, and the reader stops seeing the chart.
 */
function BubbleChartYAxis({ ticks = 4, format, label, className }: BubbleChartYAxisProps) {
  const { plot, yExtent } = useChart('BubbleChart.YAxis');

  const labels = useMemo(() => {
    const [min, max] = yExtent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = max - ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [yExtent, ticks, format]);

  const titleWidth = label ? AXIS_TITLE_WIDTH : 0;

  return (
    <>
      {label ? (
        /*
         * Turned on its side, which is the only way a word fits in a gutter
         * sized for numbers. The box is laid out as tall as the plot and then
         * rotated about its own centre, so the text runs the length of the axis
         * it names rather than of whatever it happens to say.
         */
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: titleWidth / 2 - plot.height / 2,
            top: plot.top + plot.height / 2 - AXIS_LABEL_HEIGHT / 2,
            width: plot.height,
            height: AXIS_LABEL_HEIGHT,
            transform: [{ rotate: '-90deg' }],
          }}
        >
          <Text size="xs" muted numberOfLines={1} style={{ textAlign: 'center' }}>
            {label}
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: titleWidth,
          // Centred on the grid line each label names: the strip is lifted half
          // a label and grown by a whole one, so `justify-between` lands the
          // text's middle on the line rather than its top edge on the first.
          top: plot.top - AXIS_LABEL_HEIGHT / 2,
          height: plot.height + AXIS_LABEL_HEIGHT,
          width: Math.max(plot.left - Y_AXIS_GUTTER - titleWidth, 0),
        }}
        className={cn('items-end justify-between', className)}
      >
        {labels.map((tick) => (
          <Text key={tick.key} size="xs" muted numberOfLines={1}>
            {tick.text}
          </Text>
        ))}
      </View>
    </>
  );
}
BubbleChartYAxis.displayName = 'BubbleChart.YAxis';
BubbleChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out.
BubbleChartYAxis.axis = 'y' as const;

export interface BubbleChartTooltipProps {
  /** Float a small readout beside the selected bubble. On by default. */
  showLabel?: boolean;
  /** Format the x value for the readout. Defaults to a compact number. */
  formatX?: (value: number) => string;
  /** Format the y value for the readout. Defaults to a compact number. */
  formatY?: (value: number) => string;
  /** Format the size value for the readout. Defaults to a compact number. */
  formatSize?: (value: number) => string;
  /** Floor on the touch target, for a chart whose smallest bubbles are tiny. */
  hitRadius?: number;
  className?: string;
}

/**
 * The touch target, the selection it drives, and the readout that follows it.
 *
 * A touch picks the nearest bubble whose own circle — or the `hitRadius` floor,
 * whichever is larger — reaches the finger. Nearest rather than topmost,
 * because where bubbles overlap the one drawn last is not the one being aimed
 * at.
 *
 * The search runs on the UI thread over flat arrays of already-projected
 * coordinates, and only the *index* of the winner crosses back into JS, and
 * only when it changes. A drag across the plot therefore costs a handful of
 * re-renders rather than one per frame.
 *
 * Distances are compared squared. The nearest bubble by distance is the nearest
 * by distance-squared, and a square root per bubble per frame buys nothing.
 */
function BubbleChartTooltip({
  showLabel = true,
  formatX,
  formatY,
  formatSize,
  hitRadius = HIT_RADIUS,
  className,
}: BubbleChartTooltipProps) {
  const {
    bubbles,
    plot,
    xExtent,
    yExtent,
    activeIndex,
    activeIndexJS,
    setActivePoint,
    status,
  } = useChart('BubbleChart.Tooltip');

  /*
   * Every bubble, projected once, as parallel arrays.
   *
   * Parallel arrays rather than an array of objects because this is read inside
   * a worklet: Reanimated has to copy whatever the gesture captures across to
   * the UI thread, and four number arrays cross far more cheaply than a few
   * hundred small objects.
   *
   * Projected against the *settled* extents rather than the tweening shared
   * values. Hit-testing against a moving scale would mean rebuilding this on
   * every frame of a domain animation, and a bubble being half a second stale
   * during a transition is not something a finger can notice.
   */
  const hit = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    const rs: number[] = [];
    const limits: number[] = [];
    const indices: number[] = [];
    for (const bubble of bubbles) {
      xs.push(xAt(bubble.x, plot, xExtent[0], xExtent[1]));
      ys.push(yOf(bubble.y, plot, yExtent[0], yExtent[1]));
      rs.push(bubble.r);
      const reach = Math.max(bubble.r, hitRadius);
      limits.push(reach * reach);
      indices.push(bubble.index);
    }
    return { xs, ys, rs, limits, indices };
  }, [bubbles, plot, xExtent, yExtent, hitRadius]);

  const select = useMemo(
    () => (index: number) => {
      if (index < 0) {
        setActivePoint(null);
        return;
      }
      setActivePoint(bubbles.find((bubble) => bubble.index === index) ?? null);
    },
    [bubbles, setActivePoint]
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
    const limits = hit.limits;
    const indices = hit.indices;

    const resolve = (px: number, py: number) => {
      'worklet';
      let bestIndex = -1;
      let best = Infinity;
      for (let i = 0; i < xs.length; i += 1) {
        const dx = xs[i]! - px;
        const dy = ys[i]! - py;
        const distance = dx * dx + dy * dy;
        // Each bubble reaches as far as it is big, so a large one is not
        // beaten by a small one that happens to be marginally nearer.
        if (distance <= limits[i]! && distance < best) {
          best = distance;
          bestIndex = indices[i]!;
        }
      }
      if (bestIndex === activeIndex.value) return;
      activeIndex.value = bestIndex;
      runOnJS(select)(bestIndex);
    };

    const clear = () => {
      'worklet';
      if (activeIndex.value === -1) return;
      activeIndex.value = -1;
      runOnJS(select)(-1);
    };

    return Gesture.Pan()
      .minDistance(0)
      .onBegin((event) => {
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
  }, [hit, activeIndex, select]);

  /*
   * The readout's own height, measured rather than assumed. It decides whether
   * the readout fits above the bubble, and how tall it is depends on whether
   * the row has a label and a size — a constant would either overlap a
   * three-line readout or reserve room a one-line one never uses.
   */
  const labelHeight = useSharedValue(0);

  /*
   * Above the bubble, clear of its edge rather than of its centre, and clamped
   * inside the plot. Lifted by a constant it landed *on* the larger circles —
   * which are exactly the ones a finger is most likely to be resting on, so the
   * readout was hidden under the hand that summoned it.
   *
   * Where there is no room above, it goes below instead. Sliding it down to the
   * top edge of the plot would leave it over the bubble again.
   */
  const labelStyle = useAnimatedStyle(() => {
    const index = activeIndex.value;
    if (index < 0) return { opacity: 0 };
    const at = hit.indices.indexOf(index);
    if (at < 0) return { opacity: 0 };
    const x = hit.xs[at]!;
    const y = hit.ys[at]!;
    const r = hit.rs[at]!;
    const half = LABEL_WIDTH / 2;
    const tall = labelHeight.value;

    const above = y - r - LABEL_GAP - tall;
    const below = y + r + LABEL_GAP;
    const top = above >= plot.top ? above : below;

    return {
      opacity: 1,
      transform: [
        {
          translateX:
            Math.min(plot.left + plot.width - half, Math.max(plot.left + half, x)) - half,
        },
        { translateY: top },
      ],
    };
  });

  const active = bubbles.find((bubble) => bubble.index === activeIndexJS) ?? null;
  const fmtX = formatX ?? compactNumber;
  const fmtY = formatY ?? compactNumber;
  const fmtSize = formatSize ?? compactNumber;

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
                {active.label ? (
                  <View className="flex-row items-center gap-1.5">
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: active.color,
                      }}
                    />
                    <Text size="xs" weight="medium" numberOfLines={1}>
                      {active.label}
                    </Text>
                  </View>
                ) : null}
                <Text size="xs" muted numberOfLines={1}>
                  {fmtX(active.x)}, {fmtY(active.y)}
                </Text>
                {active.size !== null ? (
                  <Text size="xs" muted numberOfLines={1}>
                    {fmtSize(active.size)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
BubbleChartTooltip.displayName = 'BubbleChart.Tooltip';
BubbleChartTooltip.layer = 'overlay' as Layer;

export interface BubbleChartLegendProps extends ViewProps {
  className?: string;
  /** Cap on how many bubbles are named. The rest are left to the readout. */
  limit?: number;
}

/**
 * A swatch and a name per bubble, for a chart whose circles are too small to
 * carry their own labels.
 *
 * Drawn **under** the plot rather than floating in a corner of it. A key that
 * overlays the drawing area competes with the bubbles for the space they are
 * plotted in, and on a square chart there is no corner that is reliably empty —
 * the position of a bubble is the data, so nowhere can be reserved for it.
 *
 * It lists rows rather than series, because in this chart a row *is* a
 * category. Use it instead of `BubbleChart.Labels`, not beside it — the same
 * names twice is the legend telling the reader what the plot already says.
 */
function BubbleChartLegend({ className, limit = 8, ...props }: BubbleChartLegendProps) {
  const { bubbles } = useChart('BubbleChart.Legend');
  const shown = bubbles.filter((bubble) => bubble.label).slice(0, limit);
  if (!shown.length) return null;

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn(
        'flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-3',
        className
      )}
    >
      {shown.map((bubble) => (
        <View key={bubble.index} className="flex-row items-center gap-1.5">
          <View
            style={{ backgroundColor: bubble.color }}
            className="h-2 w-2 rounded-full"
          />
          <Text size="xs" muted>
            {bubble.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
BubbleChartLegend.displayName = 'BubbleChart.Legend';
BubbleChartLegend.layer = 'footer' as Layer;

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface BubbleChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the chart is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — what the area means, usually. */
  caption?: string;
  /** Trailing slot — a control, a badge, a range picker. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the chart is of, what it currently reads, and
 * what the size of a circle means.
 *
 * The caption earns its place here more than on most charts. Two axes and an
 * area is three quantities, and a reader who is not told what the area is has
 * no way to work it out from the picture.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActivePointChange` and pass the
 * formatted string down.
 */
function BubbleChartHeader({
  className,
  title,
  value,
  caption,
  children,
  ...props
}: BubbleChartHeaderProps) {
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
          control takes the width it wants and the caption underneath the value
          wraps to two lines to make room for it. */}
      {children ? <View className="shrink pt-1">{children}</View> : null}
    </View>
  );
}
BubbleChartHeader.displayName = 'BubbleChart.Header';
BubbleChartHeader.layer = 'header' as Layer;

export const BubbleChart = Object.assign(BubbleChartRoot, {
  Header: BubbleChartHeader,
  Grid: BubbleChartGrid,
  Quadrants: BubbleChartQuadrants,
  Trend: BubbleChartTrend,
  Bubbles: BubbleChartBubbles,
  Labels: BubbleChartLabels,
  SizeKey: BubbleChartSizeKey,
  Skeleton: BubbleChartSkeleton,
  XAxis: BubbleChartXAxis,
  YAxis: BubbleChartYAxis,
  Tooltip: BubbleChartTooltip,
  Legend: BubbleChartLegend,
});
