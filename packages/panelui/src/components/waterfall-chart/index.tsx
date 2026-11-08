/**
 * WaterfallChart — how a run of changes carried one total to another.
 *
 * Composed the same way the other charts are: the grid, the bars, the
 * connectors, the axes and the readout are separate children, so a chart that
 * wants no grid simply does not have one.
 *
 * ```tsx
 * <WaterfallChart data={bridge}>
 *   <WaterfallChart.Grid />
 *   <WaterfallChart.Connectors />
 *   <WaterfallChart.Bars />
 *   <WaterfallChart.XAxis />
 *   <WaterfallChart.Tooltip />
 * </WaterfallChart>
 * ```
 *
 * ## What the shape is asserting
 *
 * **Every bar but a total floats.** A step's bar starts where the previous one
 * ended and reaches as far as its own value carries it, so the gap under it is
 * the running total it is acting on. That floating is the entire point: a bar
 * chart of the same numbers would compare the changes against each other, and
 * this compares each of them against the balance it moved.
 *
 * **A total is anchored to zero.** It is a reading rather than a change, so it
 * is measured from the baseline like an ordinary bar and drawn in a neutral
 * colour. Marking the opening and closing steps `total` is what gives the run
 * two ends to be a bridge between.
 *
 * **Three colours, and no more.** Up, down, and total. A fourth would have to
 * mean something the reader has to be told, and the one thing this chart has
 * going for it is that the direction of a bar is legible before its label is.
 *
 * **The connectors are the sequence.** Without them the bars are a row of
 * floating rectangles at unexplained heights; the line from one bar's end to
 * the next bar's start is what says the second continues the first.
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
import Svg, { Defs, G, Line as SvgLine, LinearGradient, Path, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import {
  CHART_AXIS_MAX_FONT_SCALE,
  ChartAccessibilityData,
  type ChartAccessibilityProps,
} from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import {
  finiteChartDomain,
  finiteChartNumber,
} from '../../primitives/finite-chart';
import { barPath, compactNumber, type Plot } from '../../utils/chart';
import { cn } from '../../utils/cn';
import { useSkeletonHandoff } from '../../hooks/use-skeleton-handoff';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/** Room left around the plot for the axis labels. */
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };

/**
 * Sideways, the step names run down the left instead of along the bottom, so
 * the room has to come off that side. Reserved rather than overlaid: a name
 * drawn on top of the bars is unreadable against them and makes the bars
 * unreadable too.
 */
const PADDING_SIDEWAYS = { top: 6, right: 10, bottom: 6, left: 76 };

/** Width the readout is laid out at, so it can be clamped inside the plot. */
const LABEL_WIDTH = 148;

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Line height of an `xs` label, for centring one on the grid line it names. */
const AXIS_LABEL_HEIGHT = 16;

/** Fallbacks, only reached if the theme CSS was never imported. */
const FALLBACK_RISE = '#10b981';
const FALLBACK_FALL = '#ef4444';
const FALLBACK_TOTAL = '#262626';

type Layer = 'svg' | 'overlay' | 'header';

export type WaterfallChartStatus = 'loading' | 'ready';
export type WaterfallChartOrientation = 'vertical' | 'horizontal';

/** Which of the three roles a step's bar is drawn in. */
export type WaterfallKind = 'rise' | 'fall' | 'total';

export interface WaterfallDatum {
  /** Name of the step, as the axis and the readout show it. */
  label: string;
  /**
   * The change this step makes to the running total.
   *
   * On a `total` step it is added to the running total *before* the bar is
   * drawn, so `0` reads the balance as it stands and a non-zero one opens the
   * run at a starting balance.
   */
  value: number;
  /**
   * Draw this step as a reading rather than a change: measured from the
   * baseline, in the neutral colour, and counted in the legend as a total.
   */
  total?: boolean;
  /** Explicit colour for this one bar, overriding the role's. */
  color?: string;
}

/** One step, resolved against the running total it acts on. */
export interface WaterfallStep {
  datum: WaterfallDatum;
  label: string;
  value: number;
  kind: WaterfallKind;
  /** Value the bar is measured from — the running total before this step. */
  start: number;
  /** Value the bar reaches — the running total after it. */
  end: number;
}

interface WaterfallChartContextValue {
  data: WaterfallDatum[];
  steps: WaterfallStep[];
  plot: Plot;
  status: WaterfallChartStatus;
  orientation: WaterfallChartOrientation;
  barGap: number;
  barWidth: number | undefined;
  cornerRadius: number;
  minBarLength: number;
  fadedOpacity: number;
  colors: Record<WaterfallKind, string>;
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

const WaterfallChartContext = createContext<WaterfallChartContextValue | null>(null);

function useChart(component: string): WaterfallChartContextValue {
  const context = useContext(WaterfallChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <WaterfallChart>`);
  }
  return context;
}

/**
 * The step under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveIndexChange` for that.
 */
export function useWaterfallChart() {
  const { steps, activeIndexJS } = useChart('useWaterfallChart');
  return {
    activeIndex: activeIndexJS,
    activeStep: activeIndexJS >= 0 ? (steps[activeIndexJS] ?? null) : null,
  };
}

/**
 * The running totals every step sits on.
 *
 * Split out because it is the one piece of the chart that is pure arithmetic
 * over the data, and every part that draws anything needs the same answer —
 * two parts deriving it separately is two chances for the bars and the
 * connectors to disagree about where a step ended.
 */
export function waterfallSteps(data: WaterfallDatum[]): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let running = 0;

  for (const datum of data) {
    const value = finiteChartNumber(datum.value) ?? 0;

    if (datum.total) {
      // A total is a reading, so it is measured from the baseline and the
      // running figure becomes whatever it reads.
      running += value;
      steps.push({
        datum,
        label: datum.label,
        value: running,
        kind: 'total',
        start: 0,
        end: running,
      });
      continue;
    }

    const start = running;
    running += value;
    steps.push({
      datum,
      label: datum.label,
      value,
      kind: value < 0 ? 'fall' : 'rise',
      start,
      end: running,
    });
  }

  return steps;
}

export interface WaterfallChartProps extends ViewProps, ChartAccessibilityProps<WaterfallStep> {
  className?: string;
  /** The steps, in the order they happen. */
  data: WaterfallDatum[];
  /**
   * `loading` holds the bars at the baseline and grows them into the real ones
   * when it turns `ready`. One component throughout, rather than a spinner
   * swapped for a chart — swapping loses the transition. Add a
   * `WaterfallChart.Skeleton` for something to stand in the plot meanwhile.
   */
  status?: WaterfallChartStatus;
  /** Width ÷ height. `2` is the wide card shape. */
  aspectRatio?: number;
  /** Milliseconds for the bars to grow in on mount. */
  animationDuration?: number;
  /** Milliseconds for the value axis to settle after the data changes. */
  domainDuration?: number;
  /**
   * Fix the value axis instead of deriving it. The derived domain always
   * includes zero, and one that does not is a run whose bars cannot be
   * compared — pass this only when you mean it.
   */
  yDomain?: [number, number];
  /** `vertical` stands the bars up; `horizontal` lays the run down the side. */
  orientation?: WaterfallChartOrientation;
  /**
   * Fraction of each band left empty, `0` to `1`. A fraction rather than a
   * pixel gap so the proportions hold at any width.
   */
  barGap?: number;
  /** Fixed bar thickness in points. Derived from the band when omitted. */
  barWidth?: number;
  /** Corner radius on the ends of a bar. */
  cornerRadius?: number;
  /**
   * Smallest length a non-zero bar is drawn at, in points. A step that rounds
   * to nothing still happened, and a bar of zero length says it did not.
   */
  minBarLength?: number;
  /** Opacity of the bars that are not under the finger. */
  fadedOpacity?: number;
  /** Colour of a step that adds. Defaults to the success token. */
  riseColor?: string;
  /** Colour of a step that subtracts. Defaults to the destructive token. */
  fallColor?: string;
  /** Colour of a `total` step. Defaults to the first chart token. */
  totalColor?: string;
  /**
   * The step under the finger as it moves, and `-1`/`null` when it lifts.
   * Fires when the index changes, not per frame.
   */
  onActiveIndexChange?: (index: number, step: WaterfallStep | null) => void;
  /** Drop the axis padding, for a run with no axis or readout. */
  compact?: boolean;
  children?: ReactNode;
}

/** Imperative handle: re-run the grow-in, for a "replay" control. */
export interface WaterfallChartHandle {
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

const WaterfallChartRoot = forwardRef<WaterfallChartHandle, WaterfallChartProps>(
  function WaterfallChartRoot(
    {
      className,
      data,
      status = 'ready',
      aspectRatio = 2,
      animationDuration = 700,
      domainDuration = 500,
      yDomain,
      orientation = 'vertical',
      barGap = 0.34,
      barWidth,
      cornerRadius = 4,
      minBarLength = 2,
      fadedOpacity = 0.3,
      riseColor,
      fallColor,
      totalColor,
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
    const [activeIndexJS, setActiveIndexJS] = useState(-1);

    const reveal = useSharedValue(0);
    const domainMin = useSharedValue(0);
    const domainMax = useSharedValue(0);
    const activeIndex = useSharedValue(-1);
    const reducedMotion = useReducedMotion();

    const riseToken = useCSSVariable('--color-success');
    const fallToken = useCSSVariable('--color-destructive');
    const totalToken = useCSSVariable('--color-chart-1');

    const colors = useMemo<Record<WaterfallKind, string>>(
      () => ({
        rise: riseColor ?? (typeof riseToken === 'string' ? riseToken : FALLBACK_RISE),
        fall: fallColor ?? (typeof fallToken === 'string' ? fallToken : FALLBACK_FALL),
        total: totalColor ?? (typeof totalToken === 'string' ? totalToken : FALLBACK_TOTAL),
      }),
      [riseColor, fallColor, totalColor, riseToken, fallToken, totalToken]
    );

    const steps = useMemo(() => waterfallSteps(data), [data]);

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

    const extent = useMemo<[number, number]>(() => {
      const explicit = finiteChartDomain(yDomain);
      if (explicit) return explicit;

      /*
       * Both ends of every bar, not just the values. A step's bar occupies the
       * span between two running totals, and a domain taken from the changes
       * alone would be the range of the *deltas* — which on any run that
       * climbs before it falls is a fraction of the height the bars need.
       */
      let min = 0;
      let max = 0;
      for (const step of steps) {
        const low = Math.min(step.start, step.end);
        const high = Math.max(step.start, step.end);
        if (low < min) min = low;
        if (high > max) max = high;
      }

      if (min === 0 && max === 0) return [0, 1];
      // Headroom past the furthest bar only. The zero end is left exactly where
      // it is: padding it would lift the run off its own baseline.
      return [min === 0 ? 0 : min * 1.1, max === 0 ? 0 : max * 1.1];
    }, [steps, yDomain]);

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
      if (revealed.current || plot.width <= 0 || !steps.length) return;
      revealed.current = true;
      playReveal();
    }, [loading, plot.width, steps.length, playReveal, reveal]);

    useImperativeHandle(ref, () => ({ replay: playReveal }), [playReveal]);

    const handleActiveIndex = useMemo(
      () => (index: number) => {
        setActiveIndexJS(index);
        onActiveIndexChange?.(index, index >= 0 ? (steps[index] ?? null) : null);
      },
      [onActiveIndexChange, steps]
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

    const context = useMemo<WaterfallChartContextValue>(
      () => ({
        data,
        steps,
        plot,
        status,
        orientation,
        barGap,
        barWidth,
        cornerRadius,
        minBarLength,
        fadedOpacity,
        colors,
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
        steps,
        plot.width,
        plot.height,
        plot.left,
        plot.top,
        status,
        orientation,
        barGap,
        barWidth,
        cornerRadius,
        minBarLength,
        fadedOpacity,
        colors,
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
      <WaterfallChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          {header}
          <ChartAccessibilityData
            chart="Waterfall chart"
            data={steps}
            disabled={accessible === false || loading}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityLabelForDatum={accessibilityLabelForDatum}
            onAccessibilityDatumPress={onAccessibilityDatumPress}
            valueOf={(step) => [
              ['label', step.label],
              ['change', step.value],
              ['kind', step.kind],
              ['starts at', step.start],
              ['ends at', step.end],
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
      </WaterfallChartContext.Provider>
    );
  }
);
WaterfallChartRoot.displayName = 'WaterfallChart';

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

/** The band measurements every drawn part reads the same way. */
interface Bands {
  along: number;
  across: number;
  alongStart: number;
  acrossStart: number;
  band: number;
  thickness: number;
}

/**
 * How the plot divides between the steps.
 *
 * A worklet because the bars rebuild on the UI thread every frame the domain is
 * tweening, and shared with the parts that only run on JS so a label and the
 * bar it names can never land on different centres.
 */
function bandsOf(
  plot: Plot,
  total: number,
  horizontal: boolean,
  barGap: number,
  barWidth: number | undefined
): Bands {
  'worklet';
  const along = horizontal ? plot.height : plot.width;
  const across = horizontal ? plot.width : plot.height;
  const band = along / Math.max(1, total);
  const usable = band * (1 - barGap);
  return {
    along,
    across,
    alongStart: horizontal ? plot.top : plot.left,
    acrossStart: horizontal ? plot.left : plot.top,
    band,
    thickness: Math.min(barWidth ?? usable, usable),
  };
}

/* -------------------------------------------------------------------------- */
/* SVG layer                                                                  */
/* -------------------------------------------------------------------------- */

export interface WaterfallChartGridProps {
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
function WaterfallChartGrid({
  rows = 4,
  color,
  dashArray = '4,6',
  opacity = 1,
}: WaterfallChartGridProps) {
  const { plot, orientation } = useChart('WaterfallChart.Grid');
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
WaterfallChartGrid.displayName = 'WaterfallChart.Grid';
WaterfallChartGrid.layer = 'svg' as Layer;

export interface WaterfallChartBarsProps {
  /** Corner radius, overriding the chart's. */
  cornerRadius?: number;
}

/**
 * The bars.
 *
 * Six animated paths a frame rather than one per step: one per role, so the
 * three colours can be three fills, and each of those split into the bar under
 * the finger and the rest, so the others can dim without every bar carrying its
 * own opacity. A run of forty steps costs the same as a run of four.
 *
 * Each bar grows from its own `start` towards its `end` rather than up from the
 * baseline. A step is a movement from one balance to another, and growing it
 * from zero would animate a quantity the chart is not claiming.
 */
function WaterfallChartBars({ cornerRadius }: WaterfallChartBarsProps) {
  const {
    steps,
    plot,
    status,
    orientation,
    barGap,
    barWidth,
    cornerRadius: chartRadius,
    minBarLength,
    fadedOpacity,
    colors,
    domainMin,
    domainMax,
    reveal,
    activeIndex,
  } = useChart('WaterfallChart.Bars');

  const radius = cornerRadius ?? chartRadius;
  const loading = status === 'loading';
  const total = steps.length;
  const horizontal = orientation === 'horizontal';

  /*
   * All six paths come out of one builder, filtered by role and by whether the
   * bar is the active one. Six passes over the data a frame is still cheaper
   * than the bookkeeping needed to build them all at once, and it keeps the
   * geometry in exactly one place.
   */
  const build = (kind: WaterfallKind, wantActive: boolean) => () => {
    'worklet';
    if (!total || plot.width <= 0) {
      return { d: '', opacity: 1 };
    }

    const bands = bandsOf(plot, total, horizontal, barGap, barWidth);
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
        ? bands.acrossStart + fraction * bands.across
        : bands.acrossStart + bands.across - fraction * bands.across;
    };

    let d = '';

    for (let i = 0; i < total; i++) {
      const step = steps[i];
      if (!step || step.kind !== kind) continue;
      if ((i === active) !== wantActive) continue;

      /*
       * Staggered by step, but every bar still finishes inside the one
       * duration: the window each gets is what is left after the stagger, so a
       * run of forty steps does not take forty times as long to arrive.
       */
      const startAt = total > 1 ? (i / total) * 0.45 : 0;
      const eased = Math.max(0, Math.min(1, (grow - startAt) / 0.55));
      const reached = loading ? step.start : step.start + (step.end - step.start) * eased;

      const from = project(step.start);
      const to = project(reached);
      let length = Math.abs(to - from);
      // A step that rounds to nothing still happened, and a bar of zero length
      // says it did not. Held back until the grow-in has actually started, so
      // the stub does not appear before the bar it belongs to.
      if (minBarLength > 0 && eased > 0 && !loading && length < minBarLength) {
        length = minBarLength;
      }
      if (length <= 0) continue;

      const lead = bands.alongStart + i * bands.band + (bands.band - bands.thickness) / 2;
      // Which way the bar points is the direction of the change, not the sign
      // of the value — a fall from 900 to 400 points down whatever those two
      // numbers are, and a total always points away from the baseline.
      const forward = reached >= step.start;

      d += horizontal
        ? barPath(
            forward ? from : from - length,
            lead,
            length,
            bands.thickness,
            radius,
            forward ? 'right' : 'left'
          )
        : barPath(
            lead,
            forward ? from - length : from,
            bands.thickness,
            length,
            radius,
            forward ? 'up' : 'down'
          );
    }

    // Dimming only happens while something *is* active; with nothing under the
    // finger every bar is at full ink, which is the resting state.
    const dim = !wantActive && active >= 0 ? fadedOpacity : 1;
    return { d, opacity: dim };
  };

  const riseRest = useAnimatedProps(build('rise', false));
  const riseActive = useAnimatedProps(build('rise', true));
  const fallRest = useAnimatedProps(build('fall', false));
  const fallActive = useAnimatedProps(build('fall', true));
  const totalRest = useAnimatedProps(build('total', false));
  const totalActive = useAnimatedProps(build('total', true));

  return (
    <G>
      <AnimatedPath animatedProps={riseRest} fill={colors.rise} />
      <AnimatedPath animatedProps={riseActive} fill={colors.rise} />
      <AnimatedPath animatedProps={fallRest} fill={colors.fall} />
      <AnimatedPath animatedProps={fallActive} fill={colors.fall} />
      <AnimatedPath animatedProps={totalRest} fill={colors.total} />
      <AnimatedPath animatedProps={totalActive} fill={colors.total} />
    </G>
  );
}
WaterfallChartBars.displayName = 'WaterfallChart.Bars';
WaterfallChartBars.layer = 'svg' as Layer;

export interface WaterfallChartConnectorsProps {
  color?: string;
  dashArray?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * The lines from each bar's end to the next bar's start.
 *
 * Drawn under the bars, and reaching the full width of both bands rather than
 * only the gap between them, so the ends are hidden behind the bars they touch
 * and the line reads as passing behind the run instead of stopping short of it.
 *
 * They arrive with the reveal, each one held back until the bar on its left has
 * finished growing — a connector drawn to a bar that is not there yet points at
 * nothing.
 */
function WaterfallChartConnectors({
  color,
  dashArray = '3,4',
  strokeWidth = 1,
  opacity = 1,
}: WaterfallChartConnectorsProps) {
  const {
    steps,
    plot,
    status,
    orientation,
    barGap,
    barWidth,
    domainMin,
    domainMax,
    reveal,
  } = useChart('WaterfallChart.Connectors');

  const token = useCSSVariable('--color-muted-foreground');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(0,0,0,0.4)');

  const total = steps.length;
  const horizontal = orientation === 'horizontal';
  const loading = status === 'loading';

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    if (total < 2 || plot.width <= 0 || loading) return { d: '' };

    const bands = bandsOf(plot, total, horizontal, barGap, barWidth);
    const min = domainMin.value;
    const max = domainMax.value;
    const range = max - min || 1;
    const grow = reveal.value;

    const project = (value: number) => {
      'worklet';
      const fraction = (value - min) / range;
      return horizontal
        ? bands.acrossStart + fraction * bands.across
        : bands.acrossStart + bands.across - fraction * bands.across;
    };

    let d = '';

    for (let i = 0; i < total - 1; i++) {
      const step = steps[i];
      if (!step) continue;

      // The same window the bar on the left is growing in. The connector only
      // starts once that bar has arrived at the level it is drawn at.
      const startAt = total > 1 ? (i / total) * 0.45 : 0;
      const eased = Math.max(0, Math.min(1, (grow - startAt) / 0.55));
      if (eased <= 0) continue;

      const level = project(step.end);
      const from = bands.alongStart + i * bands.band + (bands.band - bands.thickness) / 2;
      const to = bands.alongStart + (i + 2) * bands.band - (bands.band - bands.thickness) / 2;
      // Extends as the next bar arrives, so the line and the bar it is
      // reaching for grow together rather than the line waiting drawn.
      const reach = from + (to - from) * eased;

      d += horizontal
        ? `M${level},${from}L${level},${reach}`
        : `M${from},${level}L${reach},${level}`;
    }

    return { d };
  });

  if (total < 2) return null;

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeOpacity={opacity}
      fill="none"
    />
  );
}
WaterfallChartConnectors.displayName = 'WaterfallChart.Connectors';
WaterfallChartConnectors.layer = 'svg' as Layer;

/** How much of the value axis a placeholder bar takes. */
const SKELETON_LENGTH = 0.18;

/** Steps to draw when there is no data yet to count them from. */
const SKELETON_BARS = 6;

export interface WaterfallChartSkeletonProps {
  /**
   * How many placeholder bars to draw. Defaults to one per step, and to six
   * when the data has not arrived — the count is the one thing a loading chart
   * can be honest about only if it already has the steps.
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
 * Equal and on the baseline on purpose. Placeholder bars at differing heights
 * are a run the reader has no way to tell from the real one until it changes
 * under them, and floating them would invent a set of running totals — which is
 * the one thing this chart exists to report.
 */
function WaterfallChartSkeleton({
  bars,
  duration = 1400,
  color,
}: WaterfallChartSkeletonProps) {
  const { plot, status, orientation, steps, barGap, barWidth, cornerRadius } = useChart(
    'WaterfallChart.Skeleton'
  );
  const token = useCSSVariable('--color-skeleton');
  const base = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');
  const highlightToken = useCSSVariable('--color-chart-1');
  const highlight = typeof highlightToken === 'string' ? highlightToken : FALLBACK_TOTAL;
  // Unique per instance: a fixed id makes two of these on one screen share a
  // gradient, and the second one to mount wins.
  const gradientId = `panelui-waterfall-skeleton-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

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
  const total = Math.max(1, bars ?? (steps.length || SKELETON_BARS));

  const d = useMemo(() => {
    if (plot.width <= 0 || plot.height <= 0) return '';

    const bands = bandsOf(plot, total, horizontal, barGap, barWidth);
    const length = bands.across * SKELETON_LENGTH;

    let path = '';
    for (let i = 0; i < total; i += 1) {
      const lead = bands.alongStart + i * bands.band + (bands.band - bands.thickness) / 2;
      path += horizontal
        ? barPath(plot.left, lead, length, bands.thickness, cornerRadius, 'right')
        : barPath(
            lead,
            plot.top + plot.height - length,
            bands.thickness,
            length,
            cornerRadius,
            'up'
          );
    }
    return path;
  }, [plot, horizontal, total, barGap, barWidth, cornerRadius]);

  // Held through the fade rather than to the frame the data lands: the bars
  // grow out of the stubs, and cutting the stubs at the status change leaves
  // the panel empty until the first bar has length.
  const { mounted, opacity } = useSkeletonHandoff(loading);
  const fadeProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  if (!mounted || !d) return null;

  return (
    <AnimatedG animatedProps={fadeProps}>
      <Defs>
        <AnimatedLinearGradient id={gradientId} animatedProps={animatedProps} y1="0" y2="0">
          <Stop offset="0" stopColor={base} />
          <Stop offset="0.5" stopColor={highlight} stopOpacity={0.35} />
          <Stop offset="1" stopColor={base} />
        </AnimatedLinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${gradientId})`} />
    </AnimatedG>
  );
}
WaterfallChartSkeleton.displayName = 'WaterfallChart.Skeleton';
WaterfallChartSkeleton.layer = 'svg' as Layer;

/* -------------------------------------------------------------------------- */
/* Overlay layer                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Narrowest a step label may be drawn before the axis starts dropping some.
 * Roughly three characters at `xs`, which is what a short name needs.
 */
const MIN_BAND_LABEL = 34;

export interface WaterfallChartXAxisProps {
  /**
   * How many labels to show. Every step by default, thinned only when the bands
   * get too narrow to read — pass a number to force it lower.
   */
  ticks?: number;
  /** Turn a step into its label. Defaults to its `label`. */
  format?: (step: WaterfallStep, index: number) => string;
  className?: string;
}

/**
 * The step names, one under each band it has room for. Real text rather than
 * SVG text, so they follow the theme's font and the platform's text scaling —
 * SVG text does neither.
 */
function WaterfallChartXAxis({ ticks, format, className }: WaterfallChartXAxisProps) {
  const { steps, plot, orientation } = useChart('WaterfallChart.XAxis');

  const labels = useMemo(() => {
    if (!steps.length) return [];

    /*
     * Every step, unless they will not fit. The axis asks the plot how much
     * room there is and only thins when the answer is not enough — a fixed tick
     * count drops names that had room to be drawn.
     */
    const room = Math.max(1, Math.floor(plot.width / MIN_BAND_LABEL));
    const count = Math.max(1, Math.min(ticks ?? room, steps.length));

    // Every nth band, rather than a fractional step rounded to the nearest
    // index — rounding lands on the same band twice and skips its neighbour.
    const stride = Math.ceil(steps.length / count);
    const picked: { key: number; text: string }[] = [];
    for (let index = 0; index < steps.length; index += stride) {
      const step = steps[index];
      if (!step) continue;
      picked.push({ key: index, text: format ? format(step, index) : step.label });
    }
    return picked;
  }, [steps, ticks, format, plot.width]);

  if (orientation === 'horizontal') return null;

  /*
   * One box per band, exactly the band's width. Tiling them rather than giving
   * each a fixed width means they can never overlap each other and the first
   * and last can never hang off the ends of the plot — the row of labels
   * occupies precisely the space the bars do.
   */
  const bandWidth = steps.length > 0 ? plot.width / steps.length : 0;

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
            left: plot.left + bandWidth * label.key,
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
WaterfallChartXAxis.displayName = 'WaterfallChart.XAxis';
WaterfallChartXAxis.layer = 'overlay' as Layer;

export interface WaterfallChartYAxisProps {
  /** How many labels to show along the value axis. */
  ticks?: number;
  /** Format a value for its label. Defaults to a compact number. */
  format?: (value: number) => string;
  className?: string;
}

/** Value labels down the side, aligned to the grid lines. */
function WaterfallChartYAxis({ ticks = 4, format, className }: WaterfallChartYAxisProps) {
  const { plot, steps, orientation, extent } = useChart('WaterfallChart.YAxis');

  const horizontal = orientation === 'horizontal';

  /*
   * Read off the settled domain rather than the shared values the paths use.
   * A label is text, and text is JS — following the tween would re-render on
   * every frame of it to redraw a number nobody can read while it moves.
   */
  const labels = useMemo(() => {
    if (horizontal) {
      // Sideways, the side of the chart is the step axis.
      return steps.map((step, index) => ({ key: index, text: step.label }));
    }
    const [min, max] = extent;
    if (min === 0 && max === 0) return [];
    return Array.from({ length: ticks + 1 }, (_unused, index) => {
      const value = max - ((max - min) * index) / ticks;
      return { key: index, text: format ? format(value) : compactNumber(value) };
    });
  }, [extent, ticks, format, horizontal, steps]);

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
        <View key={label.key} className={horizontal ? 'flex-1 justify-center' : undefined}>
          <Text size="xs" muted numberOfLines={1} maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}>
            {label.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
WaterfallChartYAxis.displayName = 'WaterfallChart.YAxis';
WaterfallChartYAxis.layer = 'overlay' as Layer;
// Read by the root, which has to leave room for the labels before it lays the
// plot out — an axis drawn over the plot is unreadable, and makes what it is
// drawn over unreadable too.
WaterfallChartYAxis.axis = 'y' as const;

export interface WaterfallChartValuesProps {
  /** Format a step's number. Defaults to a signed compact number. */
  format?: (step: WaterfallStep, index: number) => string;
  className?: string;
}

/**
 * The change each step made, written at the far end of its bar.
 *
 * Signed, because on this chart the sign is the reading: a bar's direction
 * already says which way it went, and a label that drops the sign makes the
 * two directions look like the same number twice.
 *
 * Only drawn upright. Sideways the bars run across a plot whose width is a
 * phone's, and a number at the end of one has nowhere to go that is not on top
 * of the bar or off the chart.
 */
function WaterfallChartValues({ format, className }: WaterfallChartValuesProps) {
  const { steps, plot, orientation, status, barGap, barWidth, extent } =
    useChart('WaterfallChart.Values');

  if (orientation === 'horizontal' || status === 'loading' || !steps.length) return null;
  if (plot.width <= 0 || plot.height <= 0) return null;

  const bands = bandsOf(plot, steps.length, false, barGap, barWidth);
  const [min, max] = extent;
  const range = max - min || 1;

  return (
    <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {steps.map((step, index) => {
        const fraction = (step.end - min) / range;
        const y = plot.top + plot.height - fraction * plot.height;
        const forward = step.end >= step.start;
        const text = format
          ? format(step, index)
          : step.kind === 'total'
            ? compactNumber(step.value)
            : `${step.value > 0 ? '+' : ''}${compactNumber(step.value)}`;

        return (
          <Text
            key={index}
            size="xs"
            weight="medium"
            numberOfLines={1}
            className={cn(className)}
            style={{
              position: 'absolute',
              // Sat off the growing end of the bar, on whichever side that is.
              // A label inside a bar is unreadable on a short one and a label
              // always above is inside the plot's ceiling on the tall one.
              top: forward ? y - AXIS_LABEL_HEIGHT - 2 : y + 2,
              left: plot.left + bands.band * index,
              width: bands.band,
              textAlign: 'center',
            }}
          >
            {text}
          </Text>
        );
      })}
    </View>
  );
}
WaterfallChartValues.displayName = 'WaterfallChart.Values';
WaterfallChartValues.layer = 'overlay' as Layer;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface WaterfallChartTooltipProps {
  /** Format the step's change. Defaults to a signed compact number. */
  formatValue?: (step: WaterfallStep) => string;
  /** Format the running total line. Return `null` to drop it. */
  formatTotal?: (step: WaterfallStep) => string | null;
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
 * The readout, and the drag that drives it.
 *
 * It reports two numbers, because a step on this chart has two: what it changed
 * by, and what the balance stood at afterwards. The second is the one a bar's
 * position encodes and its length does not, so a readout that only gave the
 * change would leave the reader converting the height back by eye.
 *
 * The hit area is the whole plot. A readout you have to land on the bar to
 * summon is a readout nobody finds — and the bars here are narrower than a bar
 * chart's, since the gap between them is what the connectors run through.
 */
function WaterfallChartTooltip({
  formatValue,
  formatTotal,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: WaterfallChartTooltipProps) {
  const {
    steps,
    plot,
    orientation,
    colors,
    activeIndex,
    activeIndexJS,
    setActiveIndexJS,
    status,
  } = useChart('WaterfallChart.Tooltip');

  const total = steps.length;
  const horizontal = orientation === 'horizontal';
  const left = plot.left;
  const top = plot.top;
  const width = plot.width;
  const height = plot.height;

  /*
   * The readout's own height, measured rather than assumed. Sideways it has to
   * be clamped inside the plot vertically, and how tall it is depends on
   * whether the running total line is shown.
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
      // With a hold, only the timer may start the readout: a distance of 0 would
      // activate on the first move event and take the touch from a Pressable above.
      .minDistance(activateAfterLongPress > 0 ? 10_000 : 0)
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

  // The readout centres over its band and is clamped inside the plot, so it
  // never runs off the edge at the first or last one. Which axis it follows is
  // the axis the bands run along.
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

    const tall = labelHeight.value;
    const y = Math.min(
      plot.top + Math.max(plot.height - tall, 0),
      Math.max(plot.top, centre - tall / 2)
    );
    return { opacity: 1, transform: [{ translateX: clamped - half }, { translateY: y }] };
  });

  const active = activeIndexJS >= 0 ? steps[activeIndexJS] : null;
  const fmtValue =
    formatValue ??
    ((step: WaterfallStep) =>
      step.kind === 'total'
        ? compactNumber(step.value)
        : `${step.value > 0 ? '+' : ''}${compactNumber(step.value)}`);
  const fmtTotal =
    formatTotal ??
    ((step: WaterfallStep) => (step.kind === 'total' ? null : compactNumber(step.end)));

  if (status === 'loading') return null;

  const runningTotal = active ? fmtTotal(active) : null;

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, top: 0, width: LABEL_WIDTH }, labelStyle]}
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
                {active.label}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: active.datum.color ?? colors[active.kind],
                  }}
                />
                <Text size="xs" weight="medium">
                  {fmtValue(active)}
                </Text>
              </View>
              {runningTotal ? (
                <Text size="xs" muted numberOfLines={1}>
                  {runningTotal}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
WaterfallChartTooltip.displayName = 'WaterfallChart.Tooltip';
WaterfallChartTooltip.layer = 'overlay' as Layer;

/** One role's colour and name. Shared by the legend and the header. */
function RoleSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-2 w-2 rounded-full" />
      <Text size="xs" muted>
        {label}
      </Text>
    </View>
  );
}

export interface WaterfallChartLegendProps extends ViewProps {
  className?: string;
  /** Names for the three roles. */
  labels?: Partial<Record<WaterfallKind, string>>;
}

/**
 * A swatch and a name for each role the run actually contains.
 *
 * Three entries at most, and only the ones present — a run with no totals in it
 * listing a "Total" colour is a key to a colour that is not on the chart.
 */
function WaterfallChartLegend({ className, labels, ...props }: WaterfallChartLegendProps) {
  const { steps, colors } = useChart('WaterfallChart.Legend');

  const present = useMemo(() => {
    const order: WaterfallKind[] = ['rise', 'fall', 'total'];
    const seen = new Set(steps.map((step) => step.kind));
    return order.filter((kind) => seen.has(kind));
  }, [steps]);

  if (!present.length) return null;

  const names: Record<WaterfallKind, string> = {
    rise: labels?.rise ?? 'Increase',
    fall: labels?.fall ?? 'Decrease',
    total: labels?.total ?? 'Total',
  };

  return (
    <View
      {...props}
      style={[{ pointerEvents: 'none' }, props.style]}
      className={cn('absolute right-2 top-1 flex-row gap-3', className)}
    >
      {present.map((kind) => (
        <RoleSwatch key={kind} color={colors[kind]} label={names[kind]} />
      ))}
    </View>
  );
}
WaterfallChartLegend.displayName = 'WaterfallChart.Legend';
WaterfallChartLegend.layer = 'overlay' as Layer;

/* -------------------------------------------------------------------------- */
/* Header layer                                                               */
/* -------------------------------------------------------------------------- */

export interface WaterfallChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what the run is of. */
  title?: string;
  /** The readout. The largest thing on the card, and the first thing read. */
  value?: string;
  /** One muted line under the value — a period, a comparison, a total. */
  caption?: string;
  /** Names for the three roles, as the legend takes. */
  labels?: Partial<Record<WaterfallKind, string>>;
  /**
   * Draw a swatch and a name per role along the trailing edge. Prefer this to
   * `WaterfallChart.Legend` on a chart that has a header: the legend floats
   * over the plot, where it competes with the bars for the same corner.
   */
  legend?: boolean;
  /** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what the run is of, what it currently reads, and
 * what the colours mean.
 *
 * The value is not derived here. A readout that follows the finger belongs to
 * whoever owns the data — take it from `onActiveIndexChange` and pass the
 * formatted string down, so one header can show the closing balance when
 * nothing is pressed and a step's change when something is.
 */
function WaterfallChartHeader({
  className,
  title,
  value,
  caption,
  labels,
  legend = false,
  children,
  ...props
}: WaterfallChartHeaderProps) {
  const { steps, colors } = useChart('WaterfallChart.Header');

  const present = useMemo(() => {
    const order: WaterfallKind[] = ['rise', 'fall', 'total'];
    const seen = new Set(steps.map((step) => step.kind));
    return order.filter((kind) => seen.has(kind));
  }, [steps]);

  const names: Record<WaterfallKind, string> = {
    rise: labels?.rise ?? 'Increase',
    fall: labels?.fall ?? 'Decrease',
    total: labels?.total ?? 'Total',
  };

  const trailing =
    children ??
    (legend && present.length ? (
      <View className="flex-row flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {present.map((kind) => (
          <RoleSwatch key={kind} color={colors[kind]} label={names[kind]} />
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
          three-role key takes the width it wants and the caption underneath the
          value wraps to two lines to make room for it. */}
      {trailing ? <View className="shrink pt-1">{trailing}</View> : null}
    </View>
  );
}
WaterfallChartHeader.displayName = 'WaterfallChart.Header';
WaterfallChartHeader.layer = 'header' as Layer;

export const WaterfallChart = Object.assign(WaterfallChartRoot, {
  Header: WaterfallChartHeader,
  Grid: WaterfallChartGrid,
  Connectors: WaterfallChartConnectors,
  Bars: WaterfallChartBars,
  Values: WaterfallChartValues,
  Skeleton: WaterfallChartSkeleton,
  XAxis: WaterfallChartXAxis,
  YAxis: WaterfallChartYAxis,
  Tooltip: WaterfallChartTooltip,
  Legend: WaterfallChartLegend,
});
