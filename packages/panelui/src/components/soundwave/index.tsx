/**
 * Soundwave — what a voice looks like while an app is listening to it.
 *
 * ```tsx
 * <Soundwave variant="pills" state="listening" level={level} />
 * ```
 *
 * Four looks, because a voice screen needs different ones in different places:
 * `pills` for the few big capsules over a microphone button, `bars` for a
 * metering strip in a transcript, `line` for a travelling wave while the
 * assistant talks back, and `ambient` for a glow that takes the whole screen.
 *
 * ## It draws a level; it does not record one
 *
 * Nothing here touches the microphone. The app owns the recorder — the
 * permission prompt, the session, the platform quirks — and hands over a number
 * between 0 and 1, which keeps this component free of an audio dependency and
 * usable against a real meter, a synthesised one, or a remote peer's.
 *
 * With no `level` at all it animates its own plausible motion for the current
 * `state`, so a screen can be built and reviewed before any audio exists.
 *
 * ## Levels arrive faster than React should re-render
 *
 * A recorder reports every 30–60ms. Setting that in state is dozens of renders
 * a second for a number that only moves pixels, so `level` also accepts a
 * `SharedValue`: write metering straight into it and nothing above this
 * component ever re-renders. A plain number works too and is smoothed the same
 * way — it is the right choice when the level comes from something slow, like a
 * server-side speaking flag.
 *
 * Either way the value is smoothed with a fast attack and a slow release, which
 * is what makes a meter read as a meter: it snaps up on a syllable and falls
 * back gently, instead of chattering around every sample.
 *
 * ## How each one is drawn
 *
 * `bars` and `line` are a *single* animated SVG path — one vertical segment per
 * bar with a round cap, or one polyline — so forty bars cost one animated prop
 * a frame rather than forty animated views, and the capsule ends come free from
 * the stroke cap. `pills` is a handful of views, where that machinery would be
 * more expensive than the thing it saves. Everything runs in a worklet on the
 * UI thread; React renders on a resize and otherwise not at all.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { cn } from '../../utils/cn';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type SoundwaveVariant = 'pills' | 'bars' | 'line' | 'ambient';

export type SoundwaveState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** What each state is doing, for anyone who cannot see it. */
const STATE_LABEL: Record<SoundwaveState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

/**
 * How fast the smoothed level rises and falls, per second.
 *
 * Wildly asymmetric on purpose. A meter that rises and falls at the same rate
 * either lags the syllable that caused it or flickers on every sample; snapping
 * up and easing down tracks speech the way an ear expects it to.
 */
const ATTACK = 16;
const RELEASE = 5;

/** Never quite silent: a wave flat at zero reads as broken rather than quiet. */
const FLOOR = 0.04;

/* -------------------------------------------------------------------------- */
/* Worklet maths                                                              */
/* -------------------------------------------------------------------------- */

function clamp01(value: number): number {
  'worklet';
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Deterministic hash in `[0, 1)`. Stable across frames and across mounts. */
function hashD(a: number, b: number): number {
  'worklet';
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** One decimal place. Path strings are rebuilt every frame; every digit costs. */
function q(value: number): number {
  'worklet';
  return Math.round(value * 10) / 10;
}

/**
 * The motion a state runs on its own, with no level supplied.
 *
 * Layered at unrelated tempi so it never repeats on a beat — a single sine
 * reads as a pulse, and a pulse reads as a progress indicator rather than as a
 * voice.
 */
function idleEnergy(state: SoundwaveState, t: number): number {
  'worklet';
  if (state === 'listening') {
    return clamp01(
      0.34 +
        0.22 * Math.sin(t * 2.3) +
        0.16 * Math.sin(t * 3.9 + 1.3) +
        0.1 * Math.sin(t * 7.1 + 0.6)
    );
  }
  if (state === 'speaking') {
    return clamp01(
      0.46 +
        0.27 * Math.sin(t * 3.1) +
        0.18 * Math.sin(t * 5.7 + 0.8) +
        0.09 * Math.sin(t * 9.3)
    );
  }
  if (state === 'thinking') {
    return clamp01(0.18 + 0.1 * Math.sin(t * 1.6) + 0.05 * Math.sin(t * 2.9 + 2.1));
  }
  return clamp01(0.07 + 0.05 * Math.sin(t * 1.1));
}

/* -------------------------------------------------------------------------- */
/* The clock every variant shares                                             */
/* -------------------------------------------------------------------------- */

interface Engine {
  /** Seconds since mount, scaled by `speed`. */
  clock: SharedValue<number>;
  /** Smoothed level, 0–1. What every variant actually draws. */
  energy: SharedValue<number>;
  /** Newest first is at the end. Only filled in `scrolling` mode. */
  samples: SharedValue<number[]>;
}

const isShared = (value: unknown): value is SharedValue<number> =>
  typeof value === 'object' && value !== null && 'value' in value;

/** How often `scrolling` mode takes a sample, in seconds. */
const SAMPLE_INTERVAL = 1 / 24;

interface EngineOptions {
  level?: number | SharedValue<number>;
  state: SoundwaveState;
  sensitivity: number;
  speed: number;
  paused: boolean;
  /** Sample count to keep for `scrolling` mode. Zero keeps none. */
  history: number;
}

function useEngine({
  level,
  state,
  sensitivity,
  speed,
  paused,
  history,
}: EngineOptions): Engine {
  const reducedMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const energy = useSharedValue(0);
  const samples = useSharedValue<number[]>([]);
  const nextSample = useSharedValue(0);

  // A plain number is copied into a shared value so the worklet has one thing
  // to read either way. An external SharedValue is read directly — that is the
  // whole point of accepting one.
  const own = useSharedValue(0);
  const external = isShared(level) ? level : null;
  const source = external ?? own;
  const driven = level !== undefined;

  useEffect(() => {
    if (typeof level === 'number') own.value = level;
  }, [level, own]);

  const running = !paused && !reducedMotion;

  const frame = useFrameCallback((info) => {
    'worklet';
    // Elapsed time is accumulated rather than read off the total, so `speed`
    // can change mid-animation without the wave jumping to wherever the new
    // rate would have put it. A dropped frame is clamped rather than honoured —
    // a 300ms hitch played back at full rate is a lurch.
    const delta = Math.min(info.timeSincePreviousFrame ?? 16, 48) / 1000;
    clock.value += delta * speed;

    const target = driven
      ? clamp01(source.value * sensitivity)
      : idleEnergy(state, clock.value);

    const rate = target > energy.value ? ATTACK : RELEASE;
    energy.value += (target - energy.value) * Math.min(1, delta * rate);

    if (history > 0 && clock.value >= nextSample.value) {
      nextSample.value = clock.value + SAMPLE_INTERVAL;
      // A little per-sample texture, so a held note is a band of varying bars
      // rather than a solid block — real speech never gives two equal samples.
      const jitter = 0.82 + 0.36 * hashD(clock.value, 3.3);
      const next = samples.value.slice(samples.value.length >= history ? 1 : 0);
      next.push(clamp01(energy.value * jitter));
      samples.value = next;
    }
  }, false);

  const { setActive } = frame;
  useEffect(() => {
    setActive(running);
    return () => setActive(false);
  }, [running, setActive]);

  // Stopped is not empty: reduced motion and `paused` both get a representative
  // frame rather than a flat line, which is the difference between "not
  // animating" and "broken".
  useEffect(() => {
    if (running) return;
    const still = driven ? clamp01(own.value * sensitivity) : 0.42;
    energy.value = still;
    if (history > 0) {
      samples.value = Array.from({ length: history }, (_unused, index) =>
        clamp01(still * (0.45 + 0.55 * Math.abs(Math.sin(index * 0.7))))
      );
    }
  }, [running, driven, sensitivity, history, own, energy, samples]);

  return { clock, energy, samples };
}

/* -------------------------------------------------------------------------- */
/* pills                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One capsule.
 *
 * A component rather than a loop of `useAnimatedStyle` in the parent, because
 * the count is a prop — hooks in a loop is a rule waiting to be broken by
 * whoever changes the default.
 */
function Pill({
  index,
  count,
  engine,
  width,
  minHeight,
  maxHeight,
  color,
}: {
  index: number;
  count: number;
  engine: Engine;
  width: number;
  minHeight: number;
  maxHeight: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    /*
     * Each capsule runs at its own tempo and phase, hashed off its index. Give
     * them one tempo and they rise and fall as a block, which reads as a
     * loading bar; detune them and the group reads as something responding to a
     * voice, even though they all follow the same level.
     */
    const rate = 2.2 + hashD(index, 1.7) * 2.6;
    const phase = hashD(index, 5.1) * Math.PI * 2;
    const wobble = 0.55 + 0.45 * Math.sin(engine.clock.value * rate + phase);

    // The middle capsules lead. A voice meter with a flat profile looks like a
    // level indicator; a slight hump looks like a mouth.
    const centre = count > 1 ? 1 - Math.abs((index / (count - 1)) * 2 - 1) : 1;
    const shape = 0.68 + 0.32 * centre;

    const value = clamp01(Math.max(FLOOR, engine.energy.value) * wobble * shape);
    return { height: minHeight + (maxHeight - minHeight) * value };
  });

  return (
    <Animated.View
      style={[
        { width, borderRadius: width / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

function PillsWave({
  engine,
  count,
  barWidth,
  barGap,
  height,
  color,
}: {
  engine: Engine;
  count: number;
  barWidth: number;
  barGap: number;
  height: number;
  color: string;
}) {
  // Never shorter than a circle: a capsule squashed past its own width stops
  // being a capsule.
  const minHeight = barWidth * 1.35;

  return (
    <View
      style={{ height, columnGap: barGap }}
      className="flex-row items-center justify-center"
    >
      {Array.from({ length: count }, (_unused, index) => (
        <Pill
          key={index}
          index={index}
          count={count}
          engine={engine}
          width={barWidth}
          minHeight={minHeight}
          maxHeight={height}
          color={color}
        />
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* bars                                                                       */
/* -------------------------------------------------------------------------- */

function BarsWave({
  engine,
  bands,
  count,
  barWidth,
  height,
  width,
  centered,
  scrolling,
  color,
  fadeId,
}: {
  engine: Engine;
  bands: SharedValue<number[]>;
  count: number;
  barWidth: number;
  height: number;
  width: number;
  centered: boolean;
  scrolling: boolean;
  color: string;
  fadeId: string | null;
}) {
  const animatedProps = useAnimatedProps(() => {
    const step = count > 1 ? (width - barWidth) / (count - 1) : 0;
    const span = height - barWidth;
    const supplied = bands.value;
    const history = engine.samples.value;
    let d = '';

    for (let i = 0; i < count; i++) {
      let value: number;
      if (scrolling) {
        // The buffer fills from empty, so the newest sample sits at the right
        // edge from the first frame rather than the wave sliding in from
        // nowhere.
        const offset = i - (count - history.length);
        value = offset >= 0 ? (history[offset] ?? 0) : 0;
      } else if (supplied.length) {
        // Real bands, resampled to the bar count — an FFT rarely hands back
        // exactly as many numbers as there are bars.
        value = supplied[Math.floor((i / count) * supplied.length)] ?? 0;
      } else {
        const rate = 2.1 + hashD(i, 1.3) * 2.9;
        const phase = hashD(i, 4.7) * Math.PI * 2;
        const wobble = 0.5 + 0.5 * Math.sin(engine.clock.value * rate + phase);
        const centre = count > 1 ? Math.sin((Math.PI * (i + 0.5)) / count) : 1;
        value = engine.energy.value * wobble * (0.45 + 0.55 * centre);
      }

      const length = span * clamp01(Math.max(FLOOR, value));
      const x = q(barWidth / 2 + i * step);
      if (centered) {
        const half = length / 2;
        d += `M${x} ${q(height / 2 - half)}L${x} ${q(height / 2 + half)}`;
      } else {
        d += `M${x} ${q(height - barWidth / 2)}L${x} ${q(height - barWidth / 2 - length)}`;
      }
    }

    return { d };
  });

  return (
    <Svg width={width} height={height}>
      {fadeId ? (
        <Defs>
          {/*
           * The fade is on the stroke, not an overlay in the background colour.
           * A strip like this often sits on a card or a photo, and an overlay
           * only disappears against the one surface it was told about.
           */}
          <SvgGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.12" stopColor={color} stopOpacity="1" />
            <Stop offset="0.88" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
      ) : null}
      <AnimatedPath
        animatedProps={animatedProps}
        stroke={fadeId ? `url(#${fadeId})` : color}
        strokeWidth={barWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* line                                                                       */
/* -------------------------------------------------------------------------- */

/** Points along the wave. Enough to read as a curve, few enough to rebuild. */
const LINE_POINTS = 56;

function LineWave({
  engine,
  width,
  height,
  strokeWidth,
  color,
  fadeId,
}: {
  engine: Engine;
  width: number;
  height: number;
  strokeWidth: number;
  color: string;
  fadeId: string | null;
}) {
  const animatedProps = useAnimatedProps(() => {
    const mid = height / 2;
    const amplitude = (height / 2 - strokeWidth) * clamp01(Math.max(FLOOR, engine.energy.value));
    const t = engine.clock.value;
    let d = '';

    for (let i = 0; i <= LINE_POINTS; i++) {
      const f = i / LINE_POINTS;
      const x = f * width;
      /*
       * Three waves at unrelated wavelengths, tapered to nothing at both ends.
       * The taper is what makes it a wave and not a rope: the line leaves and
       * meets the edges flat, so there is no hard stop where it is cut off.
       */
      const taper = Math.sin(Math.PI * f);
      const y =
        mid -
        amplitude *
          taper *
          (0.62 * Math.sin(f * 12.6 - t * 3.1) +
            0.26 * Math.sin(f * 21.4 - t * 4.7 + 1.1) +
            0.12 * Math.sin(f * 33.2 - t * 2.3));
      d += `${i === 0 ? 'M' : 'L'}${q(x)} ${q(y)}`;
    }

    return { d };
  });

  return (
    <Svg width={width} height={height}>
      {fadeId ? (
        <Defs>
          <SvgGradient id={fadeId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.18" stopColor={color} stopOpacity="1" />
            <Stop offset="0.82" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </SvgGradient>
        </Defs>
      ) : null}
      <AnimatedPath
        animatedProps={animatedProps}
        stroke={fadeId ? `url(#${fadeId})` : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/* ambient                                                                    */
/* -------------------------------------------------------------------------- */

/** Turns any resolved colour into the same colour at a given alpha. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if (Number.isNaN(r + g + b)) return color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
  if (channels) {
    const [r, g, b] = channels.split(',').map((part) => part.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
}

/**
 * The glow that fills a screen: a bloom rising off the bottom edge and a rim of
 * light around the rest.
 *
 * Both breathe on the level rather than only fading in and out — a glow that
 * changes opacity alone reads as a screen dimming, where one that also grows
 * reads as something in the room getting louder.
 */
function AmbientWave({
  engine,
  color,
  radius,
}: {
  engine: Engine;
  color: string;
  radius: number;
}) {
  const bloom = useAnimatedStyle(() => {
    const e = clamp01(Math.max(FLOOR, engine.energy.value));
    const breath = 0.94 + 0.06 * Math.sin(engine.clock.value * 1.7);
    return {
      opacity: 0.25 + 0.75 * e,
      transform: [{ scaleY: (0.72 + 0.4 * e) * breath }],
    };
  });

  const rim = useAnimatedStyle(() => {
    const e = clamp01(Math.max(FLOOR, engine.energy.value));
    return { opacity: 0.12 + 0.5 * e };
  });

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {/* The rim, as three rings of falling alpha. Three flat borders read as a
          soft edge where one crisp border reads as a frame around the screen. */}
      <Animated.View style={[StyleSheet.absoluteFill, rim]}>
        {[0, 1, 2].map((ring) => (
          <View
            key={ring}
            style={[
              StyleSheet.absoluteFill,
              {
                margin: ring * 3,
                borderRadius: Math.max(0, radius - ring * 3),
                borderWidth: 3,
                borderColor: withAlpha(color, 0.4 - ring * 0.13),
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
          // Anchored to the bottom so growing pushes the bloom up the screen
          // rather than pulling it off the edge.
          { transformOrigin: 'bottom' },
          bloom,
        ]}
      >
        <LinearGradient
          colors={[withAlpha(color, 0), withAlpha(color, 0.16), withAlpha(color, 0.5)]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

/** Per-variant geometry, so a bare `<Soundwave variant="bars" />` looks right. */
const DEFAULTS: Record<
  SoundwaveVariant,
  { bars: number; barWidth: number; barGap: number; height: number }
> = {
  pills: { bars: 4, barWidth: 28, barGap: 10, height: 96 },
  bars: { bars: 40, barWidth: 3, barGap: 3, height: 56 },
  line: { bars: 0, barWidth: 3, barGap: 0, height: 72 },
  ambient: { bars: 0, barWidth: 0, barGap: 0, height: 0 },
};

export interface SoundwaveProps extends Omit<ViewProps, 'children'> {
  className?: string;
  /**
   * Which look to draw: `pills` for a few capsules over a microphone button,
   * `bars` for a metering strip, `line` for a travelling wave, `ambient` for a
   * glow that fills its parent.
   */
  variant?: SoundwaveVariant;
  /**
   * What the app is doing. With no `level` supplied this picks the motion the
   * wave runs on its own; it always sets what a screen reader announces.
   */
  state?: SoundwaveState;
  /**
   * Input level, 0–1, from your own recorder's metering. Pass a `SharedValue`
   * to keep updates off the JS thread entirely. Omit it and the wave animates
   * plausible motion for the current `state`.
   */
  level?: number | SharedValue<number>;
  /**
   * Per-band levels, 0–1 each, for `bars` in `static` mode when the app has a
   * real frequency analysis. Resampled to the bar count.
   */
  levels?: number[];
  /** How many capsules (`pills`) or bars (`bars`) to draw. */
  bars?: number;
  /** Capsule width, or bar stroke width. Also the stroke width of `line`. */
  barWidth?: number;
  /** Gap between capsules. `bars` spaces itself evenly across the width. */
  barGap?: number;
  /** Drawing height. `ambient` ignores it and fills its parent. */
  height?: number;
  /**
   * `static` gives every bar a band of the current level; `scrolling` keeps a
   * history that slides across, newest at the trailing edge. `bars` only.
   */
  mode?: 'static' | 'scrolling';
  /** Grow bars from the middle out rather than up from the baseline. */
  centered?: boolean;
  /** Fade the wave out at both ends, so it does not stop at a hard edge. */
  fadeEdges?: boolean;
  /** Multiplier on the incoming level, applied before it is clamped to 1. */
  sensitivity?: number;
  /** Multiplier on the wave's own tempo, including how fast history scrolls. */
  speed?: number;
  /**
   * Ink. Defaults to the theme foreground, or to `--color-info` for `ambient`,
   * so a wave inverts with the theme and needs no palette of its own.
   */
  color?: string;
  /** Freeze on the current frame. */
  paused?: boolean;
  /** Corner radius `ambient` traces. Match it to the screen it sits on. */
  radius?: number;
  /** Overrides the per-state default announced to screen readers. */
  accessibilityLabel?: string;
}

export function Soundwave({
  className,
  variant = 'pills',
  state = 'listening',
  level,
  levels,
  bars,
  barWidth,
  barGap,
  height,
  mode = 'static',
  centered = true,
  fadeEdges,
  sensitivity = 1,
  speed = 1,
  color,
  paused = false,
  radius = 44,
  accessibilityLabel,
  style,
  ...props
}: SoundwaveProps) {
  const defaults = DEFAULTS[variant];
  const count = bars ?? defaults.bars;
  const stroke = barWidth ?? defaults.barWidth;
  const gap = barGap ?? defaults.barGap;
  const box = height ?? defaults.height;
  const scrolling = variant === 'bars' && mode === 'scrolling';
  const fade = fadeEdges ?? (variant === 'line' || scrolling);

  const foreground = useCSSVariable('--color-foreground');
  const info = useCSSVariable('--color-info');
  const themed = variant === 'ambient' ? info : foreground;
  const ink = color ?? (typeof themed === 'string' ? themed : '#0a0a0a');

  const engine = useEngine({
    level,
    state,
    sensitivity,
    speed,
    paused,
    history: scrolling ? count : 0,
  });

  // Supplied bands are copied into a shared value so the drawing worklet has a
  // single place to read from, whichever way the level arrived.
  const bands = useSharedValue<number[]>([]);
  useEffect(() => {
    bands.value = levels ?? [];
  }, [levels, bands]);

  // `bars` and `line` are drawn to the width they are given, which is only
  // known after layout — a metering strip is nearly always as wide as its row.
  const [measured, setMeasured] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== measured) setMeasured(next);
  };

  // Two Defs in one tree cannot share an id, and a screen can hold more than
  // one wave.
  const gradientId = `panelui-soundwave-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fadeId = fade ? gradientId : null;

  let content: ReactNode = null;
  if (variant === 'pills') {
    content = (
      <PillsWave
        engine={engine}
        count={count}
        barWidth={stroke}
        barGap={gap}
        height={box}
        color={ink}
      />
    );
  } else if (variant === 'ambient') {
    content = <AmbientWave engine={engine} color={ink} radius={radius} />;
  } else if (measured > 0) {
    content =
      variant === 'bars' ? (
        <BarsWave
          engine={engine}
          bands={bands}
          count={count}
          barWidth={stroke}
          height={box}
          width={measured}
          centered={centered}
          scrolling={scrolling}
          color={ink}
          fadeId={fadeId}
        />
      ) : (
        <LineWave
          engine={engine}
          width={measured}
          height={box}
          strokeWidth={stroke}
          color={ink}
          fadeId={fadeId}
        />
      );
  }

  return (
    <View
      {...props}
      onLayout={variant === 'bars' || variant === 'line' ? onLayout : undefined}
      pointerEvents={variant === 'ambient' ? 'none' : props.pointerEvents}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? STATE_LABEL[state]}
      className={cn(
        variant === 'ambient' ? 'absolute inset-0' : 'w-full justify-center',
        className
      )}
      style={[variant === 'ambient' ? null : { height: box }, style]}
    >
      {content}
    </View>
  );
}

Soundwave.displayName = 'Soundwave';
