/**
 * LiveLineChart — a reading that keeps arriving, against a window that keeps
 * moving.
 *
 * ```tsx
 * <LiveLineChart data={points} window={30}>
 *   <LiveLineChart.Grid />
 *   <LiveLineChart.Area />
 *   <LiveLineChart.Line />
 *   <LiveLineChart.Tip />
 *   <LiveLineChart.XAxis />
 * </LiveLineChart>
 * ```
 *
 * ## What it is, against the line chart beside it
 *
 * `LineChart` places a point by its position in the list, which is right for a
 * series of twelve months whatever the gaps between the dates behind them. Here
 * a point is placed at the time it carries, against a domain that runs from
 * `window` seconds ago to now — so the gaps are the subject, and a reading that
 * arrived late sits where it arrived rather than one slot along.
 *
 * ## The clock, and what it costs
 *
 * This is the only thing in the library that animates without an interaction or
 * a change of data. The window is tied to the wall clock, so the line drifts
 * left whether or not anything is arriving, and a feed that stalls shows as a
 * flat run reaching back from the tip rather than as a chart that has frozen.
 * Those two look identical if the window only moves when a point lands, and
 * they mean opposite things.
 *
 * The cost is a frame callback for as long as the chart is mounted. It is
 * stopped by `paused`, by `status="loading"`, while the app is backgrounded
 * and on unmount, and it is never started when the platform asks for reduced
 * motion — in that case the window advances as each point arrives instead,
 * which is the same picture sampled less often.
 *
 * Screen readers receive one image-role snapshot: its name, current or
 * selected value, direction, time window and paused state. It changes when the
 * React data changes, never on the UI-thread clock frame, and requests no live
 * announcement. The visual axes, badges and tooltip repeat that snapshot and
 * stay out of the accessibility tree; controls placed in Header remain normal
 * controls.
 *
 * ## Colour follows the recent direction
 *
 * With `momentumColors` set, the line, the fill and the tip take their colour
 * from where the reading has been going rather than from a fixed hue. It is the
 * one thing on the chart readable without looking at the axis, which is what a
 * number being watched out of the corner of an eye needs.
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
import {
  AppState,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewProps,
  type AppStateStatus,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Line as SvgLine,
} from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { CHART_AXIS_MAX_FONT_SCALE } from '../../primitives/chart-accessibility';
import { Text } from '../../primitives/text';
import {
  compactNumber,
  segment,
  useSeriesColor,
  xAt,
  yOf,
  type ChartCurve,
  type ChartPoint,
  type Plot,
} from '../../utils/chart';
import { cn } from '../../utils/cn';
import { liveLineAccessibility } from './live-line-accessibility';
import {
  liveLineClockRuns,
  normalizeLiveLinePoints,
  normalizeLiveLineWindow,
  reconcileLiveLineActivePoint,
} from './live-line-lifecycle';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Room left around the plot for the axis labels. */
const PADDING = { top: 12, right: 14, bottom: 22, left: 10 };

/** Left gutter reserved when a `YAxis` is present, for its labels to sit in. */
const Y_AXIS_WIDTH = 44;

/** Gap between the value labels and the plot they sit beside. */
const Y_AXIS_GUTTER = 6;

/** Diameter of the dot at the leading end of the line. */
const TIP = 8;

/** How far the pulse ring grows past the dot. */
const PULSE = 3.2;

/** Line height of an `xs` label, for centring one on the line it names. */
const AXIS_LABEL_HEIGHT = 16;

const READOUT_WIDTH = 116;

/** Which layer a part belongs to. Read off the component itself. */
type Layer = 'svg' | 'overlay' | 'header';

/** Whether the chart is showing data or waiting for it. */
export type LiveLineChartStatus = 'loading' | 'ready';

/** Where the reading has been going, over the last few points. */
export type LiveLineMomentum = 'up' | 'down' | 'flat';

/** A colour per direction, for a chart that is read by its colour. */
export interface LiveLineMomentumColors {
  up?: string;
  down?: string;
  flat?: string;
}

/** One reading. `time` is a timestamp in milliseconds, as `Date.now()` gives. */
export interface LiveLinePoint {
  time: number;
  value: number;
}

interface LiveLineChartContextValue {
  plot: Plot;
  status: LiveLineChartStatus;
  curve: ChartCurve;
  /** Timestamps and readings, as two number arrays — cheaper to hand the UI
   * thread than an array of objects, and every worklet here walks them in step. */
  times: SharedValue<number[]>;
  values: SharedValue<number[]>;
  /** The right-hand edge of the window, in milliseconds. */
  now: SharedValue<number>;
  /** How much time the plot spans, in milliseconds. */
  windowMs: number;
  /** Tweened y-domain. Read inside worklets to build the paths. */
  domainMin: SharedValue<number>;
  domainMax: SharedValue<number>;
  /** What the tween is heading for. The axis labels read this rather than the
   * shared values, which would re-render a label on every frame of a tween. */
  extent: [number, number];
  /** The moment under the finger, or -1. Pinned to a time rather than to a
   * position, so the crosshair travels with the reading it named. */
  activeTime: SharedValue<number>;
  activePoint: LiveLinePoint | null;
  setActivePoint: (point: LiveLinePoint | null) => void;
  /** The latest reading, for anything drawing the leading end. */
  latest: LiveLinePoint | null;
  momentum: LiveLineMomentum;
  color: string;
  clipId: string;
}

const LiveLineChartContext = createContext<LiveLineChartContextValue | null>(null);

function useChart(component: string): LiveLineChartContextValue {
  const context = useContext(LiveLineChartContext);
  if (!context) {
    throw new Error(`${component} must be used within a <LiveLineChart>`);
  }
  return context;
}

/** The reading under the crosshair, for something rendered inside the chart. */
export function useLiveLineChart() {
  const { activePoint, latest, momentum, color } = useChart('useLiveLineChart');
  return { activePoint, latest, momentum, color };
}

/**
 * The visible run of readings, as coordinates.
 *
 * It starts one point *before* the window rather than at the first one inside
 * it, so the line enters from the left edge instead of beginning wherever the
 * oldest surviving reading happens to sit. The plot is clipped, so the part
 * hanging off the edge is never drawn.
 */
function runOf(
  times: number[],
  values: number[],
  plot: Plot,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): ChartPoint[] {
  'worklet';
  const out: ChartPoint[] = [];
  const count = times.length;
  if (!count) return out;

  let start = 0;
  for (let i = 0; i < count; i += 1) {
    if (times[i]! >= xMin) break;
    start = i;
  }

  for (let i = start; i < count; i += 1) {
    const time = times[i]!;
    if (time > xMax) break;
    out.push({
      x: xAt(time, plot, xMin, xMax),
      y: yOf(values[i]!, plot, yMin, yMax),
    });
  }
  return out;
}

export interface LiveLineChartProps extends ViewProps {
  className?: string;
  /**
   * Names the chart's single screen-reader snapshot. Falls back to the Header
   * title, then to "Live line chart".
   */
  accessibilityLabel?: string;
  /** Additional guidance after the snapshot. No gesture is invented for it. */
  accessibilityHint?: string;
  /** The readings so far. Invalid values are dropped and timestamps are ordered. */
  data: LiveLinePoint[];
  /** How much time the plot spans, in seconds. Invalid values use 30. */
  window?: number;
  /** Freeze the window where it is. The readings still arrive; the clock stops. */
  paused?: boolean;
  /** Fix the y-axis instead of deriving it from what is visible. */
  yDomain?: [number, number];
  /** Milliseconds for the y-axis to settle after the range changes. */
  domainDuration?: number;
  /** `monotone` never overshoots between readings; `linear` joins them straight. */
  curve?: ChartCurve;
  /**
   * The most readings kept. Older ones are dropped, since they are off the
   * window and cannot come back — an unbounded feed otherwise grows an array
   * for as long as the screen is open. Must be positive and finite.
   */
  maxPoints?: number;
  /** Width ÷ height of the plot. */
  aspectRatio?: number;
  /** `loading` draws a flat placeholder and holds the clock. */
  status?: LiveLineChartStatus;
  /** Colour per direction. Left out, the chart draws in one hue throughout. */
  momentumColors?: LiveLineMomentumColors;
  /** Overrides the `--color-chart-1` token. Ignored when `momentumColors` is set. */
  color?: string;
  /** The reading under the crosshair as it moves, and `null` when the finger lifts. */
  onActivePointChange?: (point: LiveLinePoint | null) => void;
  children?: ReactNode;
}

export interface LiveLineChartHandle {
  /** Jump the window to the current moment — after a pause, or a background. */
  sync: () => void;
}

const LiveLineChartRoot = forwardRef<LiveLineChartHandle, LiveLineChartProps>(
  function LiveLineChartRoot(
    {
      className,
      data,
      window: windowSeconds = 30,
      paused = false,
      yDomain,
      domainDuration = 420,
      curve = 'monotone',
      maxPoints = 500,
      aspectRatio = 2,
      status = 'ready',
      momentumColors,
      color,
      onActivePointChange,
      accessibilityLabel,
      accessibilityHint,
      children,
      ...props
    },
    ref
  ) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [activePoint, setActivePointState] = useState<LiveLinePoint | null>(null);
    const times = useSharedValue<number[]>([]);
    const values = useSharedValue<number[]>([]);
    const now = useSharedValue(Date.now());
    const domainMin = useSharedValue(0);
    const domainMax = useSharedValue(0);
    const activeTime = useSharedValue(-1);
    const reducedMotion = useReducedMotion();
    const [appState, setAppState] = useState(AppState.currentState ?? 'active');
    // Stripped of punctuation: `useId` returns something like `:r1:`, and a
    // colon inside a `url(#…)` reference does not resolve — which in RN SVG is
    // a clip that silently does nothing rather than an error.
    const clipId = `panelui-live-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

    const windowMs = normalizeLiveLineWindow(windowSeconds) * 1000;
    const loading = status === 'loading';

    const hasYAxis = useMemo(() => {
      let found = false;
      Children.forEach(children, (child) => {
        if (isValidElement(child) && (child.type as { axis?: string }).axis === 'y') {
          found = true;
        }
      });
      return found;
    }, [children]);

    const semanticParts = useMemo(() => {
      let title: string | undefined;
      let value: string | undefined;
      let headerFormat: ((reading: number) => string) | undefined;
      let tipFormat: ((reading: number) => string) | undefined;
      let tooltipFormat: ((reading: number) => string) | undefined;
      Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        const part = (child.type as { displayName?: string }).displayName;
        if (part === 'LiveLineChart.Header') {
          const header = child.props as LiveLineChartHeaderProps;
          title ??= header.title;
          value ??= header.value;
          headerFormat ??= header.formatValue;
        } else if (part === 'LiveLineChart.Tip') {
          tipFormat ??= (child.props as LiveLineChartTipProps).formatValue;
        } else if (part === 'LiveLineChart.Tooltip') {
          tooltipFormat ??= (child.props as LiveLineChartTooltipProps).formatValue;
        }
      });
      return {
        title,
        value,
        formatLatest: headerFormat ?? tipFormat,
        formatActive: tooltipFormat ?? headerFormat ?? tipFormat,
      };
    }, [children]);

    const pad = { ...PADDING, left: hasYAxis ? Y_AXIS_WIDTH : PADDING.left };
    const plot: Plot = {
      left: pad.left,
      top: pad.top,
      width: Math.max(size.width - pad.left - pad.right, 0),
      height: Math.max(size.height - pad.top - pad.bottom, 0),
    };

    /*
     * Trimmed here rather than by the caller. A live feed is written by whoever
     * owns the socket, and asking them to also bound the array is asking for
     * the one chart nobody bounded to be the one left running overnight.
     */
    const points = useMemo(
      () => normalizeLiveLinePoints(data, maxPoints),
      [data, maxPoints]
    );

    useEffect(() => {
      times.value = points.map((point) => point.time);
      values.value = points.map((point) => point.value);
    }, [points, times, values]);

    useEffect(() => {
      const subscription = AppState.addEventListener('change', setAppState);
      return () => subscription.remove();
    }, []);

    const liveLatest = points.length ? points[points.length - 1]! : null;

    /*
     * The extent of what is *visible*, not of everything kept: a spike that has
     * scrolled off the left edge should stop holding the axis open, or a feed
     * settles back to a flat line squeezed against the bottom of a plot scaled
     * for something that happened a minute ago.
     */
    const liveExtent = useMemo<[number, number]>(() => {
      if (yDomain) return yDomain;
      const from = (liveLatest?.time ?? Date.now()) - windowMs;
      let min = Infinity;
      let max = -Infinity;
      for (const point of points) {
        if (point.time < from) continue;
        if (point.value < min) min = point.value;
        if (point.value > max) max = point.value;
      }
      if (min === Infinity) return [0, 1];
      if (min === max) return [min - 1, max + 1];
      const headroom = (max - min) * 0.12;
      return [min - headroom, max + headroom];
    }, [points, liveLatest, windowMs, yDomain]);

    /*
     * `paused` has to hold the whole picture still, not only the clock.
     *
     * Readings keep arriving while it is held — that is the point of holding it
     * — and both of these are derived from the newest one. Left live, the axis
     * goes on rescaling under a frozen line and the tip goes on chasing a
     * reading that is now off the right-hand edge, so a held chart carries on
     * moving in two of the three ways it can.
     */
    const held = useRef<{ extent: [number, number]; latest: LiveLinePoint | null } | null>(
      null
    );
    const heldMomentum = useRef<LiveLineMomentum>('flat');
    if (!paused) held.current = { extent: liveExtent, latest: liveLatest };

    const extent = paused && held.current ? held.current.extent : liveExtent;
    const latest = paused && held.current ? held.current.latest : liveLatest;

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

    const frame = useFrameCallback(() => {
      'worklet';
      now.value = Date.now();
    }, false);

    const running = liveLineClockRuns({ paused, loading, reducedMotion, appState: appState as AppStateStatus });

    useEffect(() => {
      frame.setActive(running);
      return () => frame.setActive(false);
    }, [frame, running]);

    /*
     * The reduced-motion path, and the pause that ends: the window still has to
     * land on the present, it just does it when something arrives rather than
     * sixty times a second.
     */
    useEffect(() => {
      if (running) return;
      if (paused) return;
      now.value = Date.now();
    }, [running, paused, points, now]);

    // A frame callback is suspended with the app. Land on the wall clock as
    // soon as it becomes active instead of showing the backgrounded window for
    // one frame and relying on the platform to schedule a callback promptly.
    useEffect(() => {
      if (appState === 'active' && !paused) now.value = Date.now();
    }, [appState, paused, now]);

    useImperativeHandle(
      ref,
      () => ({
        sync: () => {
          now.value = Date.now();
        },
      }),
      [now]
    );

    const liveMomentum = useMemo<LiveLineMomentum>(() => {
      if (points.length < 2) return 'flat';
      const recent = points.slice(-6);
      const span = Math.abs(liveExtent[1] - liveExtent[0]) || 1;
      const change = (recent[recent.length - 1]!.value - recent[0]!.value) / span;
      return change > 0.04 ? 'up' : change < -0.04 ? 'down' : 'flat';
    }, [points, liveExtent]);

    // Held with the rest of the picture: a frozen line changing colour under
    // readings that are not on it is the same bug wearing a different coat.
    if (!paused) heldMomentum.current = liveMomentum;
    const momentum = paused ? heldMomentum.current : liveMomentum;

    const defaultFormat = (reading: number) => compactNumber(reading);
    const semantic = liveLineAccessibility({
      name: accessibilityLabel ?? semanticParts.title,
      status,
      latest,
      activePoint,
      momentum,
      windowSeconds: windowMs / 1000,
      paused,
      now: Date.now(),
      valueOverride: semanticParts.value,
      formatLatest: semanticParts.formatLatest ?? defaultFormat,
      formatActive: semanticParts.formatActive ?? defaultFormat,
    });

    const base = useSeriesColor(color, 1);
    const successToken = useCSSVariable('--color-success');
    const destructiveToken = useCSSVariable('--color-destructive');
    const up =
      momentumColors?.up ?? (typeof successToken === 'string' ? successToken : '#10b981');
    const down =
      momentumColors?.down ??
      (typeof destructiveToken === 'string' ? destructiveToken : '#ef4444');
    const resolved = momentumColors
      ? momentum === 'up'
        ? up
        : momentum === 'down'
          ? down
          : (momentumColors.flat ?? base)
      : base;

    const setActivePoint = useMemo(
      () => (point: LiveLinePoint | null) => {
        setActivePointState(point);
        onActivePointChange?.(point);
      },
      [onActivePointChange]
    );

    useEffect(() => {
      const next = reconcileLiveLineActivePoint(activePoint, points);
      if (next === activePoint) return;
      if (!next) activeTime.value = -1;
      setActivePoint(next);
    }, [activePoint, points, activeTime, setActivePoint]);

    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize((current) =>
        Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height }
      );
      props.onLayout?.(event);
    };

    const context = useMemo<LiveLineChartContextValue>(
      () => ({
        plot,
        status,
        curve,
        times,
        values,
        now,
        windowMs,
        domainMin,
        domainMax,
        extent,
        activeTime,
        activePoint,
        setActivePoint,
        latest,
        momentum,
        color: resolved,
        clipId,
      }),
      // `plot` is rebuilt every render from `size`, so it is compared by value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        plot.width,
        plot.height,
        plot.left,
        plot.top,
        status,
        curve,
        times,
        values,
        now,
        windowMs,
        domainMin,
        domainMax,
        extent,
        activeTime,
        activePoint,
        setActivePoint,
        latest,
        momentum,
        resolved,
        clipId,
      ]
    );

    const { svg, overlay, header } = partition(children);

    return (
      <LiveLineChartContext.Provider value={context}>
        <View {...props} style={props.style} className={cn('w-full', className)}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={semantic.label}
            accessibilityHint={accessibilityHint}
            style={{ position: 'absolute', left: -10_000, width: 1, height: 1 }}
          />
          {header}
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
                  <Defs>
                    {/*
                     * The run starts one reading outside the window so the line
                     * enters from the edge rather than starting inside the plot.
                     * This is what keeps that overhang from being drawn.
                     */}
                    <ClipPath id={clipId}>
                      <Rect
                        x={plot.left}
                        y={0}
                        width={plot.width}
                        height={plot.top + plot.height}
                      />
                    </ClipPath>
                  </Defs>
                  {svg}
                </Svg>
                {overlay}
              </>
            ) : null}
          </View>
        </View>
      </LiveLineChartContext.Provider>
    );
  }
);
LiveLineChartRoot.displayName = 'LiveLineChart';

/** Sorts the children into the SVG tree and the view layer over it. */
function partition(children: ReactNode) {
  const svg: ReactNode[] = [];
  const overlay: ReactNode[] = [];
  const header: ReactNode[] = [];

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const layer = (child.type as { layer?: Layer }).layer ?? 'overlay';
    const bucket = layer === 'svg' ? svg : layer === 'header' ? header : overlay;
    bucket.push(<Slot key={index}>{child}</Slot>);
  });

  return { svg, overlay, header };
}

function Slot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export interface LiveLineChartGridProps {
  /** How many bands the plot is divided into. */
  rows?: number;
  color?: string;
  dashArray?: string;
}

/** The horizontal rules the readings are judged against. */
function LiveLineChartGrid({ rows = 4, color, dashArray = '4,6' }: LiveLineChartGridProps) {
  const { plot } = useChart('LiveLineChart.Grid');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  return (
    <G>
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
LiveLineChartGrid.displayName = 'LiveLineChart.Grid';
LiveLineChartGrid.layer = 'svg' as Layer;

export interface LiveLineChartLineProps {
  strokeWidth?: number;
  /** Overrides the chart's colour, momentum included. */
  color?: string;
}

/** The line itself, rebuilt on the UI thread every frame the window moves. */
function LiveLineChartLine({ strokeWidth = 2, color }: LiveLineChartLineProps) {
  const {
    plot,
    times,
    values,
    now,
    windowMs,
    domainMin,
    domainMax,
    curve,
    status,
    color: themed,
    clipId,
  } = useChart('LiveLineChart.Line');

  const animatedProps = useAnimatedProps(() => {
    const xMax = now.value;
    const run = runOf(
      times.value,
      values.value,
      plot,
      xMax - windowMs,
      xMax,
      domainMin.value,
      domainMax.value
    );
    return { d: run.length > 1 ? segment(run, curve) : '' };
  });

  if (status === 'loading') return null;

  return (
    <G clipPath={`url(#${clipId})`}>
      <AnimatedPath
        animatedProps={animatedProps}
        fill="none"
        stroke={color ?? themed}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}
LiveLineChartLine.displayName = 'LiveLineChart.Line';
LiveLineChartLine.layer = 'svg' as Layer;

export interface LiveLineChartAreaProps {
  /** Opacity at the top of the fill, fading to nothing at the baseline. */
  opacity?: number;
  /** Overrides the chart's colour, momentum included. */
  color?: string;
}

/**
 * The fill under the line.
 *
 * Its own part rather than a flag on the line, so a chart that wants the shape
 * without the weight of a filled band simply does not have one.
 */
function LiveLineChartArea({ opacity = 0.22, color }: LiveLineChartAreaProps) {
  const {
    plot,
    times,
    values,
    now,
    windowMs,
    domainMin,
    domainMax,
    curve,
    status,
    color: themed,
    clipId,
  } = useChart('LiveLineChart.Area');
  const gradientId = `panelui-live-fill-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = color ?? themed;

  const animatedProps = useAnimatedProps(() => {
    const xMax = now.value;
    const run = runOf(
      times.value,
      values.value,
      plot,
      xMax - windowMs,
      xMax,
      domainMin.value,
      domainMax.value
    );
    if (run.length < 2) return { d: '' };

    const bottom = plot.top + plot.height;
    const first = run[0]!;
    const last = run[run.length - 1]!;
    return { d: `${segment(run, curve)} L${last.x},${bottom} L${first.x},${bottom} Z` };
  });

  if (status === 'loading') return null;

  return (
    <G clipPath={`url(#${clipId})`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fill} stopOpacity={opacity} />
          <Stop offset="1" stopColor={fill} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={animatedProps} fill={`url(#${gradientId})`} />
    </G>
  );
}
LiveLineChartArea.displayName = 'LiveLineChart.Area';
LiveLineChartArea.layer = 'svg' as Layer;

export interface LiveLineChartTipProps {
  /**
   * Show the current reading in a badge beside the dot.
   *
   * Off by default. The badge is a floating card, which is the shape a reader
   * has learnt means "you touched something" — sitting there unasked it reads
   * as a tooltip nobody opened. Turn it on where the chart has no header to put
   * the reading in, and it becomes the only place the number is written.
   */
  badge?: boolean;
  /** Ring the dot with a repeating pulse. */
  pulse?: boolean;
  /** Format the badge. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * The dot at the leading end, and what it currently reads.
 *
 * It rides the newest reading rather than the right-hand edge, so a feed that
 * stops is a dot drifting left with the rest of the line. Pinning it to the
 * edge would hold it still and steady, which is the picture of a feed that is
 * working.
 *
 * A view rather than an SVG node: it carries text and a pulse, and SVG text
 * ignores the platform's text scaling and the theme's font.
 */
function LiveLineChartTip({
  badge = false,
  pulse = true,
  formatValue,
  className,
}: LiveLineChartTipProps) {
  const {
    plot,
    times,
    values,
    now,
    windowMs,
    domainMin,
    domainMax,
    status,
    color,
    latest,
    activePoint,
  } = useChart('LiveLineChart.Tip');
  const reducedMotion = useReducedMotion();
  const beat = useSharedValue(0);

  useEffect(() => {
    if (!pulse || reducedMotion || status === 'loading') {
      beat.value = 0;
      return;
    }
    beat.value = 0;
    beat.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [pulse, reducedMotion, status, beat]);

  const tipStyle = useAnimatedStyle(() => {
    const count = times.value.length;
    if (!count) return { opacity: 0 };

    const xMax = now.value;
    const xMin = xMax - windowMs;

    // The newest reading *on the plot*, which is not the newest reading held: a
    // paused window keeps taking them in behind its right-hand edge, and the
    // line stops at the edge, so a tip tracking the array would walk away from
    // the end of the line it is supposed to be the end of.
    let index = -1;
    for (let i = count - 1; i >= 0; i -= 1) {
      if (times.value[i]! <= xMax) {
        index = i;
        break;
      }
    }
    if (index < 0) return { opacity: 0 };

    const time = times.value[index]!;
    // A feed that stopped longer ago than the window is wide has nothing left
    // on the plot. The line is clipped away at that point, and a dot left
    // hanging past the edge would be the only mark still claiming otherwise.
    if (time < xMin) return { opacity: 0 };

    const x = xAt(time, plot, xMin, xMax);
    const y = yOf(values.value[index]!, plot, domainMin.value, domainMax.value);
    return {
      opacity: 1,
      transform: [{ translateX: x - TIP / 2 }, { translateY: y - TIP / 2 }],
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: (1 - beat.value) * 0.55,
    transform: [{ scale: 1 + beat.value * (PULSE - 1) }],
  }));

  if (status === 'loading' || !latest) return null;

  const format = formatValue ?? ((value: number) => compactNumber(value));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, top: 0, width: TIP, height: TIP },
        tipStyle,
      ]}
    >
      {pulse ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: TIP,
              height: TIP,
              borderRadius: TIP / 2,
              backgroundColor: color,
            },
            pulseStyle,
          ]}
        />
      ) : null}
      <View
        style={{
          width: TIP,
          height: TIP,
          borderRadius: TIP / 2,
          backgroundColor: color,
        }}
      />
      {/*
       * Never while the crosshair is out. That readout is the reading being
       * asked for, and a second card a finger's width away answering a
       * different question is two answers to one gesture.
       */}
      {badge && !activePoint ? (
        <View
          style={{ position: 'absolute', right: TIP + 8, top: -6 }}
          className={cn('rounded-md border border-border bg-popover px-1.5 py-0.5', className)}
        >
          <Text size="xs" weight="medium" numberOfLines={1}>
            {format(latest.value)}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}
LiveLineChartTip.displayName = 'LiveLineChart.Tip';
LiveLineChartTip.layer = 'overlay' as Layer;

export interface LiveLineChartXAxisProps {
  /** How many labels along the bottom. */
  ticks?: number;
  /** Rewrites a label. Given how many seconds back the tick is. */
  formatTick?: (secondsAgo: number) => string;
  className?: string;
}

/**
 * How far back the plot reaches, labelled along the bottom.
 *
 * The labels are offsets from now — `-30s`, `-15s`, `now` — rather than clock
 * times, and they never change. A moving window labelled with wall-clock times
 * would rewrite every one of them on every frame, which is a row of digits
 * churning under a chart that is trying to be read.
 */
function LiveLineChartXAxis({ ticks = 4, formatTick, className }: LiveLineChartXAxisProps) {
  const { plot, windowMs, status } = useChart('LiveLineChart.XAxis');

  if (status === 'loading' || ticks < 1) return null;

  const seconds = windowMs / 1000;
  const format =
    formatTick ?? ((secondsAgo: number) => (secondsAgo <= 0 ? 'now' : `-${Math.round(secondsAgo)}s`));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: ticks + 1 }, (_, index) => {
        const fraction = index / ticks;
        const x = plot.left + plot.width * fraction;
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: plot.top + plot.height + 4,
              left: x - 28,
              width: 56,
            }}
            className={cn('items-center', className)}
          >
            <Text
              size="xs"
              muted
              numberOfLines={1}
              maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
            >
              {format(seconds * (1 - fraction))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
LiveLineChartXAxis.displayName = 'LiveLineChart.XAxis';
LiveLineChartXAxis.layer = 'overlay' as Layer;

export interface LiveLineChartYAxisProps {
  /** How many labels up the side. */
  ticks?: number;
  /** Format a value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * The scale up the left-hand side.
 *
 * Declaring one widens the left gutter, which the root reads off the children
 * before anything is laid out — an axis given no room is drawn over the line,
 * which loses both the numbers and the shape they were there to explain.
 *
 * The labels follow the domain the tween is heading for rather than the tween
 * itself. A number re-rendered on every frame of a settle is thirty renders
 * landing on the string it started on.
 */
function LiveLineChartYAxis({ ticks = 4, formatValue, className }: LiveLineChartYAxisProps) {
  const { plot, extent, status } = useChart('LiveLineChart.YAxis');

  if (status === 'loading' || ticks < 1) return null;

  const [min, max] = extent;
  const format = formatValue ?? ((value: number) => compactNumber(value));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: ticks + 1 }, (_, index) => {
        const fraction = index / ticks;
        const y = plot.top + plot.height * fraction;
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: y - AXIS_LABEL_HEIGHT / 2,
              left: 0,
              width: plot.left - Y_AXIS_GUTTER,
            }}
            className={cn('items-end', className)}
          >
            <Text
              size="xs"
              muted
              numberOfLines={1}
              maxFontSizeMultiplier={CHART_AXIS_MAX_FONT_SCALE}
            >
              {format(max - (max - min) * fraction)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
LiveLineChartYAxis.displayName = 'LiveLineChart.YAxis';
LiveLineChartYAxis.layer = 'overlay' as Layer;
LiveLineChartYAxis.axis = 'y' as const;

/**
 * How long the readout waits before claiming the touch, in milliseconds.
 *
 * Long enough that a tap reaches a button drawn over the chart and a swipe
 * scrolls the screen, short enough that a deliberate press does not feel
 * ignored.
 */
const DEFAULT_HOLD = 180;

export interface LiveLineChartTooltipProps {
  /** Format the value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
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
 * Drag back through the window to read a reading that has already gone past.
 *
 * The crosshair is pinned to the *moment* it was put on rather than to the
 * place on screen, so it travels left with the reading it named instead of
 * sitting still while the line slides out from under it.
 */
function LiveLineChartTooltip({
  formatValue,
  className,
  activateAfterLongPress = DEFAULT_HOLD,
}: LiveLineChartTooltipProps) {
  const {
    plot,
    times,
    values,
    now,
    windowMs,
    domainMin,
    domainMax,
    activeTime,
    activePoint,
    setActivePoint,
    status,
    color,
  } = useChart('LiveLineChart.Tooltip');

  const report = useMemo(
    () => (time: number, value: number) => {
      setActivePoint(Number.isFinite(time) && time > 0 ? { time, value } : null);
    },
    [setActivePoint]
  );

  useEffect(
    () => () => {
      activeTime.value = -1;
      setActivePoint(null);
    },
    [activeTime, setActivePoint]
  );

  const pan = useMemo(() => {
    const resolve = (x: number) => {
      'worklet';
      const count = times.value.length;
      if (!count || plot.width <= 0) return;

      const xMax = now.value;
      const xMin = xMax - windowMs;
      const clamped = Math.min(Math.max(x, plot.left), plot.left + plot.width);
      const at = xMin + ((clamped - plot.left) / plot.width) * windowMs;

      // The nearest reading to the moment touched, which on a feed with gaps in
      // it is not the same as the one nearest in screen distance.
      let best = 0;
      let bestGap = Infinity;
      for (let i = 0; i < count; i += 1) {
        const gap = Math.abs(times.value[i]! - at);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      }

      const time = times.value[best]!;
      if (time === activeTime.value) return;
      activeTime.value = time;
      runOnJS(report)(time, values.value[best]!);
    };

    return Gesture.Pan()
      // With a hold, only the timer may start the readout: a distance of 0 would
      // activate on the first move event and take the touch from a Pressable above.
      .minDistance(activateAfterLongPress > 0 ? 10_000 : 0)
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
        if (activeTime.value === -1) return;
        activeTime.value = -1;
        runOnJS(report)(-1, 0);
      });
  }, [times, values, now, windowMs, plot, activeTime, report, activateAfterLongPress]);

  const crosshairStyle = useAnimatedStyle(() => {
    const time = activeTime.value;
    if (time < 0) return { opacity: 0 };
    const xMax = now.value;
    return {
      opacity: 0.45,
      transform: [{ translateX: xAt(time, plot, xMax - windowMs, xMax) }],
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    const time = activeTime.value;
    const count = times.value.length;
    if (time < 0 || !count) return { opacity: 0 };

    // The reading the crosshair named can be trimmed away under it on a long
    // enough feed. Nothing to point at then, rather than the oldest one.
    let best = -1;
    for (let i = 0; i < count; i += 1) {
      if (times.value[i] === time) {
        best = i;
        break;
      }
    }
    if (best < 0) return { opacity: 0 };

    const xMax = now.value;
    return {
      opacity: 1,
      transform: [
        { translateX: xAt(time, plot, xMax - windowMs, xMax) - TIP / 2 },
        { translateY: yOf(values.value[best]!, plot, domainMin.value, domainMax.value) - TIP / 2 },
      ],
    };
  });

  const readoutStyle = useAnimatedStyle(() => {
    const time = activeTime.value;
    if (time < 0) return { opacity: 0 };
    const xMax = now.value;
    const x = xAt(time, plot, xMax - windowMs, xMax);
    const half = READOUT_WIDTH / 2;
    const clamped = Math.min(
      plot.left + plot.width - half,
      Math.max(plot.left + half, x)
    );
    return { opacity: 1, transform: [{ translateX: clamped - half }] };
  });

  const format = formatValue ?? ((value: number) => compactNumber(value));
  const secondsAgo = activePoint ? Math.max(0, Math.round((Date.now() - activePoint.time) / 1000)) : 0;

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
              backgroundColor: color,
            },
            crosshairStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: TIP,
              height: TIP,
              borderRadius: TIP / 2,
              backgroundColor: color,
            },
            dotStyle,
          ]}
        />
        {activePoint ? (
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', left: 0, top: 0, width: READOUT_WIDTH },
              readoutStyle,
            ]}
            className={cn(
              'items-center rounded-lg border border-border bg-popover px-2 py-1 shadow-sm',
              className
            )}
          >
            <Text size="xs" weight="medium" numberOfLines={1}>
              {format(activePoint.value)}
            </Text>
            <Text size="xs" muted numberOfLines={1}>
              {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}
LiveLineChartTooltip.displayName = 'LiveLineChart.Tooltip';
LiveLineChartTooltip.layer = 'overlay' as Layer;

export interface LiveLineChartSkeletonProps {
  color?: string;
}

/**
 * The waiting state: a flat line down the middle of the plot.
 *
 * The shape the real line grows out of once readings arrive, rather than a
 * placeholder series — an invented run of readings is indistinguishable from a
 * real one until it changes under the reader.
 */
function LiveLineChartSkeleton({ color }: LiveLineChartSkeletonProps) {
  const { plot, status } = useChart('LiveLineChart.Skeleton');
  const token = useCSSVariable('--color-skeleton');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.2)');

  if (status !== 'loading' || plot.width <= 0) return null;

  const y = plot.top + plot.height / 2;

  return (
    <SvgLine
      x1={plot.left}
      x2={plot.left + plot.width}
      y1={y}
      y2={y}
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}
LiveLineChartSkeleton.displayName = 'LiveLineChart.Skeleton';
LiveLineChartSkeleton.layer = 'svg' as Layer;

export interface LiveLineChartHeaderProps extends ViewProps {
  className?: string;
  /** Small line above the value — what is being watched. */
  title?: string;
  /** The readout. Left out, it shows the current reading. */
  value?: string;
  /** One muted line under the value. */
  caption?: string;
  /** Format the derived value. Defaults to a compact number. */
  formatValue?: (value: number) => string;
  /** Trailing slot — a pause control, a badge, a unit. */
  children?: ReactNode;
}

/**
 * The strip above the plot: what is being watched and what it currently reads.
 *
 * The value falls back to the reading under the crosshair, then to the latest
 * one, so a drag back through the window reads out here without the caller
 * wiring anything up.
 */
function LiveLineChartHeader({
  className,
  title,
  value,
  caption,
  formatValue,
  children,
  ...props
}: LiveLineChartHeaderProps) {
  const { activePoint, latest } = useChart('LiveLineChart.Header');
  const format = formatValue ?? ((reading: number) => compactNumber(reading));
  const shown = activePoint ?? latest;

  return (
    <View
      {...props}
      className={cn('flex-row items-start justify-between gap-3 pb-3', className)}
    >
      <View
        className="flex-1 gap-0.5"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {title ? (
          <Text size="xs" muted>
            {title}
          </Text>
        ) : null}
        <Text size="xl" weight="bold">
          {value ?? (shown ? format(shown.value) : '—')}
        </Text>
        {caption ? (
          <Text size="xs" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      {children ? <View className="max-w-[55%] shrink pt-1">{children}</View> : null}
    </View>
  );
}
LiveLineChartHeader.displayName = 'LiveLineChart.Header';
LiveLineChartHeader.layer = 'header' as Layer;

export const LiveLineChart = Object.assign(LiveLineChartRoot, {
  Header: LiveLineChartHeader,
  Grid: LiveLineChartGrid,
  Area: LiveLineChartArea,
  Line: LiveLineChartLine,
  Tip: LiveLineChartTip,
  XAxis: LiveLineChartXAxis,
  YAxis: LiveLineChartYAxis,
  Tooltip: LiveLineChartTooltip,
  Skeleton: LiveLineChartSkeleton,
});
