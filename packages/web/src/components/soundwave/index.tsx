'use client';

/**
 * Soundwave — what a voice looks like while an app listens to it.
 *
 * ```tsx
 * <Soundwave variant="dots" state="listening" level={level} />
 *
 * <Soundwave variant="radial" state="speaking">
 *   <Soundwave.Center>
 *     <Avatar name="Khalid Abdi" size="xl" />
 *   </Soundwave.Center>
 * </Soundwave>
 * ```
 *
 * Seven looks. Four are the app's: `pills` over a microphone button, `bars`
 * for a metering strip, `line` for a travelling wave, `ambient` for a glow
 * behind a whole screen. Three are drawn in dots and spokes: `dots`, a field
 * of dots lit into a wave; `radial`, spokes around a person; and `ring`,
 * rings of dots lit outward by angle.
 *
 * ## It draws a level; it does not record one
 *
 * Nothing here touches the microphone. The app owns the recorder and hands
 * over a number from 0 to 1, so the same wave works against a real meter, a
 * synthesised one or a remote peer's. With no level it runs its own motion
 * for the current `state`, so a voice screen can be built before any audio
 * exists.
 *
 * ## Levels arrive faster than React should render
 *
 * A meter reports dozens of times a second. `level` takes a ref as well as a
 * number: write each reading into `ref.current` and the wave picks it up on
 * its next frame with nothing above it rendering. Each frame writes the `d`
 * of one or two SVG paths, never React state, and the dots are zero-length
 * round-capped segments, so a field of four hundred dots is a single path.
 *
 * Either way the level is smoothed with a fast attack and a slow release,
 * which is what makes it read as a meter: it snaps up on a syllable and falls
 * back gently instead of chattering on every sample.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { tv } from 'tailwind-variants';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ElementType as RenderElementType } from 'react';

/** Draws a part as another element, or composes it with a component: `render={<a href="/" />}`. */
type RenderProp<Tag extends RenderElementType> = { render?: useRender.ComponentProps<Tag>['render'] };

export type SoundwaveVariant = 'pills' | 'bars' | 'line' | 'ambient' | 'dots' | 'radial' | 'ring';

export type SoundwaveState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** A role from the theme. The wave never carries a colour of its own. */
export type SoundwaveColor =
  | 'foreground'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';

/** What each state is doing, for anyone who cannot see it. */
const STATE_LABEL: Record<SoundwaveState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

/**
 * How fast the smoothed level rises and falls, per second. Lopsided on
 * purpose: snapping up and easing down is how an ear expects a meter to move.
 */
const ATTACK = 16;
const RELEASE = 5;

/** Never quite silent: a wave flat at zero reads as broken rather than quiet. */
const FLOOR = 0.04;

/** How often `scrolling` takes a sample, in seconds. */
const SAMPLE_INTERVAL = 1 / 24;

/** Opacity of the part of a recording that has not played yet. */
const UNPLAYED = 0.3;

/* -------------------------------------------------------------------------- */
/* Maths                                                                      */
/* -------------------------------------------------------------------------- */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Deterministic hash in `[0, 1)`, the same on the server and in the browser. */
function hash(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** One decimal place. Paths are rebuilt every frame, and every digit costs. */
const q = (value: number) => Math.round(value * 10) / 10;

/**
 * The motion a state runs with no level supplied. Layered at unrelated tempi
 * so it never repeats on a beat; a single sine reads as a progress pulse.
 */
function idleEnergy(state: SoundwaveState, t: number): number {
  if (state === 'listening') {
    return clamp01(0.34 + 0.22 * Math.sin(t * 2.3) + 0.16 * Math.sin(t * 3.9 + 1.3) + 0.1 * Math.sin(t * 7.1 + 0.6));
  }
  if (state === 'speaking') {
    return clamp01(0.46 + 0.27 * Math.sin(t * 3.1) + 0.18 * Math.sin(t * 5.7 + 0.8) + 0.09 * Math.sin(t * 9.3));
  }
  if (state === 'thinking') {
    return clamp01(0.18 + 0.1 * Math.sin(t * 1.6) + 0.05 * Math.sin(t * 2.9 + 2.1));
  }
  return clamp01(0.07 + 0.05 * Math.sin(t * 1.1));
}

/** A supplied series read at `i` of `count`, so the two lengths need not match. */
const resample = (values: readonly number[], i: number, count: number) =>
  clamp01(values[Math.floor((i / count) * values.length)] ?? 0);

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

interface Frame {
  /** Seconds since mount, scaled by `speed`. */
  clock: number;
  /** Smoothed level, 0–1. */
  energy: number;
  /** Newest last. Only kept in `scrolling` mode. */
  samples: number[];
  /** When `scrolling` takes its next sample, on `clock`. */
  nextSample: number;
}

interface Geometry {
  variant: SoundwaveVariant;
  width: number;
  height: number;
  count: number;
  barWidth: number;
  barGap: number;
  centered: boolean;
  scrolling: boolean;
  levels: readonly number[] | undefined;
  progress: number | undefined;
}

/** Path data for each layer a look draws, and the glow's strength. */
interface Paint {
  ink?: string;
  rest?: string;
  edge?: string;
  tip?: string;
  track?: string;
  glow?: number;
}

/** One strip bar's height, 0–1, from whichever source drives the wave. */
function stripValue(i: number, count: number, g: Geometry, f: Frame): number {
  if (g.scrolling) {
    // The buffer fills from empty, so the newest sample sits at the trailing
    // edge from the first frame rather than sliding in from nowhere.
    const offset = i - (count - f.samples.length);
    return offset >= 0 ? (f.samples[offset] ?? 0) : 0;
  }
  if (g.levels?.length) return resample(g.levels, i, count);
  const rate = 2.1 + hash(i, 1.3) * 2.9;
  const phase = hash(i, 4.7) * Math.PI * 2;
  const wobble = 0.5 + 0.5 * Math.sin(f.clock * rate + phase);
  // The middle leads. A flat profile reads as a progress bar, not a voice.
  const centre = count > 1 ? Math.sin((Math.PI * (i + 0.5)) / count) : 1;
  // A slow swell travelling along the strip, so neighbouring bars rise
  // together into a shape rather than each one flickering on its own.
  const swell = 0.7 + 0.3 * Math.sin((i / count) * 7 - f.clock * 1.3);
  return clamp01(f.energy * 1.8 * (0.3 + 0.7 * wobble) * (0.35 + 0.65 * centre) * swell);
}

/** One spoke's or angle's value for the round looks, which have no middle to lead. */
function roundValue(i: number, count: number, g: Geometry, f: Frame): number {
  if (g.levels?.length) return resample(g.levels, i, count);
  const angle = (i / count) * Math.PI * 2;
  const rate = 1.8 + hash(i, 2.1) * 3.2;
  const phase = hash(i, 6.3) * Math.PI * 2;
  const wobble = 0.5 + 0.5 * Math.sin(f.clock * rate + phase);
  // Two slow lobes travelling round, so the outline swells unevenly rather
  // than every spoke breathing as one.
  const lobe = 0.72 + 0.28 * Math.sin(angle * 3 + f.clock * 0.9) * Math.cos(angle * 2 - f.clock * 0.6);
  return clamp01(f.energy * 1.6 * (0.3 + 0.7 * wobble) * lobe);
}

const dot = (x: number, y: number) => `M${q(x)} ${q(y)}h0`;
const segment = (x1: number, y1: number, x2: number, y2: number) => `M${q(x1)} ${q(y1)}L${q(x2)} ${q(y2)}`;

function paintPills(g: Geometry, f: Frame): Paint {
  const { count, barWidth: w, barGap: gap, height: h } = g;
  let ink = '';
  for (let i = 0; i < count; i++) {
    // Each capsule keeps its own tempo and phase, so the group answers one
    // level without moving as a block.
    const rate = 2.2 + hash(i, 1.7) * 2.6;
    const phase = hash(i, 5.1) * Math.PI * 2;
    const wobble = 0.55 + 0.45 * Math.sin(f.clock * rate + phase);
    const centre = count > 1 ? Math.sin((Math.PI * (i + 0.5)) / count) : 1;
    const value = g.levels?.length
      ? resample(g.levels, i, count)
      : clamp01(Math.max(FLOOR, f.energy * 1.5 * wobble * (0.6 + 0.4 * centre)));
    const length = (h - w) * value;
    const x = w / 2 + i * (w + gap);
    ink += segment(x, (h - length) / 2, x, (h + length) / 2);
  }
  return { ink };
}

function paintBars(g: Geometry, f: Frame): Paint {
  const { count, width, height: h, barWidth: w } = g;
  if (!width) return {};
  const pitch = width / count;
  const played = g.progress === undefined ? count : clamp01(g.progress) * count;
  let ink = '';
  let rest = '';
  for (let i = 0; i < count; i++) {
    const value = Math.max(FLOOR, stripValue(i, count, g, f));
    const length = Math.max(0, value * h - w);
    const x = pitch * (i + 0.5);
    const y1 = g.centered ? (h - length) / 2 : h - w / 2 - length;
    const path = segment(x, y1, x, y1 + length);
    if (i < played) ink += path;
    else rest += path;
  }
  return { ink, rest };
}

const LINE_POINTS = 56;

function paintLine(g: Geometry, f: Frame): Paint {
  const { width, height: h, barWidth: w } = g;
  if (!width) return {};
  const amplitude = h / 2 - w;
  let ink = '';
  for (let j = 0; j < LINE_POINTS; j++) {
    const u = j / (LINE_POINTS - 1);
    // Tapered to nothing at both ends, so it leaves the edges flat instead of
    // stopping at a hard cut.
    const taper = Math.pow(Math.sin(Math.PI * u), 1.6);
    const wave = 0.62 * Math.sin(u * 9 - f.clock * 3.4) + 0.38 * Math.sin(u * 15.5 + f.clock * 2.3 + 1.1);
    const y = h / 2 + amplitude * taper * Math.max(FLOOR, f.energy * 1.3) * wave;
    ink += `${j ? 'L' : 'M'}${q(u * width)} ${q(y)}`;
  }
  return { ink };
}

function paintDots(g: Geometry, f: Frame): Paint {
  const { width, height, barWidth: size, barGap: gap } = g;
  if (!width) return {};
  const pitch = size + gap;
  const columns = Math.max(1, Math.floor((width + gap) / pitch));
  let rows = Math.max(3, Math.floor((height + gap) / pitch));
  if (g.centered && rows % 2 === 0) rows -= 1;
  const left = (width - (columns * pitch - gap)) / 2 + size / 2;
  const top = (height - (rows * pitch - gap)) / 2 + size / 2;
  const half = (rows - 1) / 2;
  const played = g.progress === undefined ? columns : clamp01(g.progress) * columns;
  let ink = '';
  let rest = '';
  let edge = '';
  let track = '';
  for (let c = 0; c < columns; c++) {
    const raw = Math.max(FLOOR, stripValue(c, columns, g, f));
    /*
     * A live wave is eased up, because a field of dots has few steps and on a
     * straight scale an ordinary voice lit only the middle row or two. Easing
     * flattens the shape as well, so the middle is made to lead again after
     * it. Supplied `levels` are drawn as given.
     */
    const centre = Math.sin((Math.PI * (c + 0.5)) / columns);
    const value = g.levels?.length || g.scrolling ? raw : Math.pow(raw, 0.6) * (0.3 + 0.7 * Math.pow(centre, 0.7));
    // How many dots out from the middle (or up from the bottom) are lit. The
    // part of a dot left over lights the next one faintly, so the outline
    // moves smoothly rather than a whole dot at a time.
    const reach = value * (g.centered ? half : rows - 1);
    const full = Math.floor(reach);
    const partial = reach - full > 0.35;
    const x = left + c * pitch;
    for (let r = 0; r < rows; r++) {
      const out = g.centered ? Math.abs(r - half) : rows - 1 - r;
      const path = dot(x, top + r * pitch);
      if (out <= full) {
        if (c < played) ink += path;
        else rest += path;
      } else if (out === full + 1 && partial) edge += path;
      else track += path;
    }
  }
  return { ink, rest, edge, track };
}

/** Where the ring sits for `radial` and `ring`, as a fraction of the diameter. */
const HOLE = 0.3;

function paintRadial(g: Geometry, f: Frame): Paint {
  const { count, height: size, barWidth: w } = g;
  const c = size / 2;
  const start = size * (HOLE + 0.05);
  const reach = c - start - w / 2 - 1;
  let ink = '';
  let tip = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const value = roundValue(i, count, g, f);
    const length = reach * (0.1 + 0.9 * value);
    // The inner part carries the ink and the outer part is fainter, so a
    // spoke reads as a level with a softer reach beyond it.
    const split = start + length * 0.58;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ink += segment(c + cos * start, c + sin * start, c + cos * split, c + sin * split);
    tip += segment(c + cos * split, c + sin * split, c + cos * (start + length), c + sin * (start + length));
  }
  return { ink, tip, glow: g.levels?.length ? 0.4 : f.energy };
}

function paintRing(g: Geometry, f: Frame): Paint {
  const { count, height: size, barWidth: d, barGap: gap } = g;
  const c = size / 2;
  const pitch = d + gap;
  const inner = size * HOLE;
  const outer = c - d / 2 - 0.5;
  const rings = Math.max(2, Math.floor((outer - inner) / pitch) + 1);
  let ink = '';
  let edge = '';
  let track = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const reach = Math.max(FLOOR, roundValue(i, count, g, f)) * rings;
    const full = Math.floor(reach);
    const partial = reach - full > 0.35;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let k = 0; k < rings; k++) {
      const r = inner + k * pitch;
      const path = dot(c + cos * r, c + sin * r);
      if (k < full) ink += path;
      else if (k === full && partial) edge += path;
      else track += path;
    }
  }
  return { ink, edge, track };
}

function paint(g: Geometry, f: Frame): Paint {
  switch (g.variant) {
    case 'pills':
      return paintPills(g, f);
    case 'bars':
      return paintBars(g, f);
    case 'line':
      return paintLine(g, f);
    case 'dots':
      return paintDots(g, f);
    case 'radial':
      return paintRadial(g, f);
    case 'ring':
      return paintRing(g, f);
    default:
      return { glow: f.energy };
  }
}

/** How many bars the strip keeps in its history, for `scrolling`. */
function historyLength(g: Geometry): number {
  if (!g.scrolling) return 0;
  if (g.variant === 'bars') return g.count;
  if (g.variant === 'dots' && g.width) return Math.max(1, Math.floor((g.width + g.barGap) / (g.barWidth + g.barGap)));
  return 0;
}

/**
 * A frame that still looks like a wave, for the first render, `paused` and
 * reduced motion. A stopped wave is not an empty one.
 */
function stillFrame(level: number | undefined, history: number): Frame {
  const energy = level === undefined ? 0.42 : clamp01(level);
  return {
    clock: 0,
    energy,
    nextSample: 0,
    samples: Array.from({ length: history }, (_, i) => clamp01(energy * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.7))))),
  };
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                      */
/* -------------------------------------------------------------------------- */

const REDUCE = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCE).matches,
    () => false
  );
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const isRef = (value: unknown): value is RefObject<number | null> =>
  typeof value === 'object' && value !== null && 'current' in value;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

/** Per-look geometry, so a bare `<Soundwave variant="…" />` looks right. */
const DEFAULTS: Record<SoundwaveVariant, { bars: number; barWidth: number; barGap: number; height: number }> = {
  pills: { bars: 4, barWidth: 28, barGap: 10, height: 96 },
  bars: { bars: 40, barWidth: 3, barGap: 3, height: 56 },
  line: { bars: 0, barWidth: 3, barGap: 0, height: 72 },
  ambient: { bars: 0, barWidth: 0, barGap: 0, height: 0 },
  dots: { bars: 0, barWidth: 4, barGap: 3, height: 60 },
  radial: { bars: 60, barWidth: 3, barGap: 0, height: 176 },
  ring: { bars: 72, barWidth: 3.5, barGap: 3, height: 208 },
};

const COLOR_VAR: Record<SoundwaveColor, string> = {
  foreground: 'var(--foreground)',
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
  'chart-4': 'var(--chart-4)',
  'chart-5': 'var(--chart-5)',
};

const soundwaveVariants = tv({
  slots: {
    root: 'relative text-(--sw-color,currentColor)',
    svg: 'absolute inset-0 overflow-visible',
    // Behind the spokes, in the wave's own colour, and only as strong as the voice.
    glow: 'pointer-events-none absolute inset-[4%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--sw-color,currentColor)_30%,transparent)_30%,transparent_70%)]',
    center:
      'absolute top-1/2 left-1/2 flex size-(--sw-hole) -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
    // Ambient: a bloom off the bottom edge and a rim round the rest, both on the level.
    // Drawn with gradients rather than blur filters, which are costly to
    // repaint every frame and band badly at this size.
    bloom: [
      'absolute inset-x-[-20%] bottom-0 h-[85%] origin-bottom bg-(--sw-fill,var(--sw-color))',
      '[mask-image:radial-gradient(ellipse_50%_100%_at_50%_100%,black,transparent)]',
      'opacity-[calc(0.18+var(--sw-e,0.4)*0.5)] [scale:1_calc(0.55+var(--sw-e,0.4)*0.6)]',
    ],
    rim: 'absolute inset-0 rounded-[inherit] opacity-[calc(0.25+var(--sw-e,0.4)*0.75)] shadow-[inset_0_0_28px_color-mix(in_oklab,var(--sw-color)_45%,transparent)]',
  },
  variants: {
    variant: {
      pills: { root: 'inline-block shrink-0' },
      bars: { root: 'block w-full' },
      line: { root: 'block w-full' },
      dots: { root: 'block w-full' },
      radial: { root: 'inline-block shrink-0' },
      ring: { root: 'inline-block shrink-0' },
      ambient: { root: 'pointer-events-none absolute inset-0 overflow-hidden' },
    },
    fadeEdges: {
      true: {
        svg: '[mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)]',
      },
    },
  },
});

export interface SoundwaveProps extends Omit<ComponentProps<'div'>, 'color' | 'children'> {
  /**
   * Which look to draw: `pills` for a few capsules over a microphone button,
   * `bars` for a metering strip, `line` for a travelling wave, `ambient` for a
   * glow that fills its parent, `dots` for a field of dots lit into a wave,
   * `radial` for spokes around a centre, and `ring` for rings of dots lit
   * outward by angle.
   */
  variant?: SoundwaveVariant;
  /**
   * What the app is doing. With no `level` it picks the motion the wave runs
   * on its own, and it always sets what a screen reader announces.
   */
  state?: SoundwaveState;
  /**
   * How loud the input is now, from 0 to 1. Pass a ref and write each
   * reading into `ref.current` to keep updates out of React entirely. Leave
   * it out and the wave runs its own motion for `state`.
   */
  level?: number | RefObject<number | null>;
  /**
   * Sound to draw, in place of `level`: a `MediaStream` from a microphone or
   * a call, or an `<audio>` or `<video>` element. A media file has to be on
   * the same site or sent with CORS headers, or the browser hides its sound
   * from the page and the wave stays still.
   */
  source?: SoundwaveSource | null;
  /**
   * Fixed values, 0 to 1 each: the stored shape of a recording, a frequency
   * analysis, or one value per angle for `ring` (24 for the hours of a day).
   * Resampled to the bar count, and drawn still rather than animated.
   */
  levels?: readonly number[];
  /**
   * How far a recording has played, from 0 to 1. Bars and dots behind it keep
   * full ink and the rest are dimmed. `bars` and `dots`, with `levels`.
   */
  progress?: number;
  /** How many capsules, bars or spokes, or how many angles for `ring`. `dots` fits as many columns as the width allows. */
  bars?: number;
  /** Capsule or bar width, the stroke of `line` and `radial`, or the size of a dot. */
  barWidth?: number;
  /** Space between capsules, or between dots. `bars` spaces itself across the width. */
  barGap?: number;
  /** Drawing height. For `radial` and `ring` it is the diameter. `ambient` fills its parent instead. */
  height?: number;
  /**
   * `static` gives every bar a share of the current level; `scrolling` keeps a
   * history that slides across, newest at the trailing edge. `bars` and `dots`.
   */
  mode?: 'static' | 'scrolling';
  /** Grow bars and dots from the middle out rather than up from the bottom. */
  centered?: boolean;
  /** Fade a strip out at both ends, so it does not stop at a hard edge. */
  fadeEdges?: boolean;
  /** Multiplier on the incoming level, applied before it is capped at 1. */
  sensitivity?: number;
  /** Multiplier on the wave's own tempo, including how fast a history scrolls. */
  speed?: number;
  /**
   * The ink, as a role from the theme. Left unset the wave is drawn in the
   * text colour of whatever it sits in, which is right on most surfaces;
   * `ambient` defaults to `info`, since a glow in the text colour reads as a
   * shadow.
   */
  color?: SoundwaveColor;
  /**
   * Colours across the wave instead of one ink, as theme roles: left to right
   * for the strips, up from the bottom for `ambient`.
   */
  gradient?: readonly SoundwaveColor[];
  /**
   * The colour of the unlit dots in `dots` and `ring`, and of the part of a
   * recording not yet played in `bars`. Defaults to the ink, faint.
   */
  trackColor?: SoundwaveColor;
  /** Hold the current frame. */
  paused?: boolean;
  /** What a screen reader calls it. Defaults to the state: "Listening". */
  label?: string;
  /** For `radial` and `ring`: a `Soundwave.Center` holding what sits in the middle. */
  children?: ReactNode;
}

/** A voice as a wave. Draws a `level` it is handed, or runs its own motion for `state`. */
function SoundwaveRoot({
  variant = 'pills',
  state = 'listening',
  level: levelProp,
  source,
  levels,
  progress,
  bars,
  barWidth,
  barGap,
  height,
  mode = 'static',
  centered = true,
  fadeEdges = false,
  sensitivity = 1,
  speed = 1,
  color,
  gradient,
  trackColor,
  paused = false,
  label,
  className,
  style,
  children,
  render,
  ...props
}: SoundwaveProps & RenderProp<'div'>) {
  const sourceLevel = useAudioLevel(source);
  const level = source ? sourceLevel : levelProp;
  const defaults = DEFAULTS[variant];
  const count = bars ?? defaults.bars;
  const w = barWidth ?? defaults.barWidth;
  const gap = barGap ?? defaults.barGap;
  const h = height ?? defaults.height;
  const strip = variant === 'bars' || variant === 'line' || variant === 'dots';
  const round = variant === 'radial' || variant === 'ring';
  const scrolling = mode === 'scrolling' && (variant === 'bars' || variant === 'dots');

  const root = useRef<HTMLDivElement>(null);
  const layers = useRef<Partial<Record<keyof Paint, SVGPathElement | null>>>({});
  const glow = useRef<HTMLDivElement>(null);
  // `useId` can hold characters a `url(#…)` reference does not survive.
  const gradientId = `sw-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const reducedMotion = useReducedMotion();

  // Strips take the width of their container; the rest know their own.
  const [measured, setMeasured] = useState(0);
  const width = variant === 'pills' ? count * w + (count - 1) * gap : round ? h : strip ? measured : 0;

  useIsomorphicLayoutEffect(() => {
    const node = root.current;
    if (!strip || !node) return;
    setMeasured(Math.round(node.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setMeasured(Math.round(entry!.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [strip]);

  const geometry: Geometry = {
    variant,
    width,
    height: h,
    count,
    barWidth: w,
    barGap: gap,
    centered,
    scrolling,
    levels: scrolling ? undefined : levels,
    progress,
  };

  const readLevel = () => {
    if (level === undefined) return undefined;
    const value = isRef(level) ? level.current : level;
    return value === null || value === undefined ? undefined : value * sensitivity;
  };

  // Fixed `levels` need no clock; neither does a held frame.
  const fixed = !scrolling && !!levels?.length && variant !== 'ambient' && variant !== 'line';
  const animate = !fixed && !paused && !reducedMotion;

  // What the first render and any held frame draw.
  const still = stillFrame(readLevel(), historyLength(geometry));
  const painted = paint(geometry, still);

  /*
   * Everything the frame loop reads, refreshed on each render, so a prop
   * change reaches the next frame without restarting the loop.
   */
  const live = useRef({ geometry, state, speed, readLevel });
  live.current = { geometry, state, speed, readLevel };
  const frame = useRef<Frame>(still);

  useEffect(() => {
    if (!animate) return;
    const node = root.current;
    let raf = 0;
    let last = 0;
    let visible = true;

    const draw = (f: Frame) => {
      const next = paint(live.current.geometry, f);
      for (const key of ['ink', 'rest', 'edge', 'tip', 'track'] as const) {
        const path = layers.current[key];
        if (path && next[key] !== undefined) path.setAttribute('d', next[key]!);
      }
      if (next.glow !== undefined) {
        if (glow.current) glow.current.style.opacity = String(0.25 + next.glow * 0.75);
        node?.style.setProperty('--sw-e', String(q(next.glow * 100) / 100));
      }
    };

    const tick = (now: number) => {
      raf = 0;
      // A long gap (a hidden tab, a slow frame) is clamped rather than
      // honoured: a 300ms hitch played back at full speed is a lurch.
      const delta = Math.min(last ? now - last : 16, 48) / 1000;
      last = now;
      const { state: current, speed: rate, readLevel: read, geometry: g } = live.current;
      const f = frame.current;
      f.clock += delta * rate;
      const driven = read();
      const target = driven === undefined ? idleEnergy(current, f.clock) : clamp01(driven);
      const smoothing = target > f.energy ? ATTACK : RELEASE;
      f.energy += (target - f.energy) * Math.min(1, delta * smoothing);
      const history = historyLength(g);
      if (history > 0) {
        while (f.samples.length > history) f.samples.shift();
        if (f.clock >= f.nextSample) {
          f.nextSample = f.clock + SAMPLE_INTERVAL;
          // A little texture per sample, so a held note is a band of
          // varying bars rather than a solid block.
          const jitter = 0.82 + 0.36 * hash(f.clock, 3.3);
          if (f.samples.length >= history) f.samples.shift();
          f.samples.push(clamp01(f.energy * jitter));
        }
      }
      draw(f);
      schedule();
    };

    const schedule = () => {
      if (raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    // Off screen, or in a background tab, nothing is drawn.
    const observer =
      node && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = !!entry?.isIntersecting;
            if (visible) schedule();
            else stop();
          })
        : null;
    if (node) observer?.observe(node);
    const onVisibility = () => (document.hidden ? stop() : schedule());
    document.addEventListener('visibilitychange', onVisibility);
    schedule();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [animate]);

  const slots = soundwaveVariants({ variant, fadeEdges: fadeEdges && strip });
  const ink = color ? COLOR_VAR[color] : variant === 'ambient' ? COLOR_VAR.info : undefined;
  // Unlit dots are the track turned well down, so a field stays a quiet
  // ground under the wave whichever colour it is given.
  const track =
    variant === 'dots' || variant === 'ring'
      ? `color-mix(in oklab, ${trackColor ? COLOR_VAR[trackColor] : 'var(--sw-color, currentColor)'} ${trackColor ? 30 : 14}%, transparent)`
      : trackColor
        ? COLOR_VAR[trackColor]
        : undefined;
  const stroke = gradient?.length ? `url(#${gradientId})` : 'currentColor';
  const ambientFill = gradient?.length
    ? `linear-gradient(to top, ${gradient.map((role) => COLOR_VAR[role]).join(', ')})`
    : undefined;

  const rootStyle: CSSProperties = {
    ...(ink ? { ['--sw-color' as string]: ink } : null),
    ...(ambientFill ? { ['--sw-fill' as string]: ambientFill } : null),
    ...(variant === 'ambient' ? null : { height: h }),
    ...(variant === 'pills' || round ? { width } : null),
    ...(round ? { ['--sw-hole' as string]: `${q(h * HOLE * 2 - (variant === 'ring' ? w + gap : h * 0.04))}px` } : null),
    ...(painted.glow !== undefined ? { ['--sw-e' as string]: q(painted.glow * 10) / 10 } : null),
    ...style,
  };

  const layer = (key: keyof Paint, extra: { opacity?: number; stroke?: string; strokeWidth?: number } = {}) => (
    <path
      ref={(node) => {
        layers.current[key] = node;
      }}
      d={(painted[key] as string | undefined) ?? ''}
      fill="none"
      stroke={extra.stroke ?? stroke}
      strokeOpacity={extra.opacity}
      strokeWidth={extra.strokeWidth ?? w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(
      {
        ref: root,
        role: 'img',
        'aria-label': label ?? STATE_LABEL[state],
        'data-slot': 'soundwave',
        'data-variant': variant,
        'data-state': state,
        className: slots.root({ className }),
        style: rootStyle,
        children: (
          <>
            {variant === 'ambient' ? (
              <>
                <div aria-hidden="true" className={slots.bloom()} />
                <div aria-hidden="true" className={slots.rim()} />
              </>
            ) : (
              <>
                {variant === 'radial' ? (
                  <div
                    ref={glow}
                    aria-hidden="true"
                    className={slots.glow()}
                    style={{ opacity: 0.25 + (painted.glow ?? 0) * 0.75 }}
                  />
                ) : null}
                {width > 0 ? (
                  <svg
                    aria-hidden="true"
                    width={width}
                    height={h}
                    viewBox={`0 0 ${width} ${h}`}
                    className={slots.svg()}
                  >
                    {gradient?.length ? (
                      <defs>
                        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                          {gradient.map((role, index) => (
                            <stop
                              key={`${role}-${index}`}
                              offset={gradient.length === 1 ? 0 : index / (gradient.length - 1)}
                              style={{ stopColor: COLOR_VAR[role] }}
                            />
                          ))}
                        </linearGradient>
                      </defs>
                    ) : null}
                    {variant === 'dots' || variant === 'ring' ? layer('track', { stroke: track }) : null}
                    {variant === 'radial' ? (
                      <circle
                        cx={h / 2}
                        cy={h / 2}
                        r={h * HOLE}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.22}
                        strokeWidth={1.5}
                      />
                    ) : null}
                    {variant === 'radial' ? layer('tip', { opacity: 0.42 }) : null}
                    {variant === 'dots' || variant === 'ring' ? layer('edge', { opacity: 0.45 }) : null}
                    {variant === 'bars' || variant === 'dots'
                      ? layer('rest', trackColor && variant === 'bars' ? { stroke: track } : { opacity: UNPLAYED })
                      : null}
                    {layer('ink')}
                  </svg>
                ) : null}
                {children}
              </>
            )}
          </>
        ),
      },
      props
    ),
  });
}
SoundwaveRoot.displayName = 'Soundwave';

export interface SoundwaveCenterProps extends ComponentProps<'div'> {}

/**
 * What sits in the hole of a `radial` or `ring` wave: a person's avatar, a
 * figure, a button. It is sized to the hole and centred in it.
 */
function SoundwaveCenter({ className, render, ...props }: SoundwaveCenterProps & RenderProp<'div'>) {
  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps({ 'data-slot': 'soundwave-center', className: soundwaveVariants().center({ className }) }, props),
  });
}
SoundwaveCenter.displayName = 'Soundwave.Center';

export const Soundwave = Object.assign(SoundwaveRoot, { Center: SoundwaveCenter });

export { SoundwaveCenter };

/* -------------------------------------------------------------------------- */
/* Audio                                                                      */
/* -------------------------------------------------------------------------- */

/** Something with sound in it: a microphone or call stream, or an `<audio>` or `<video>` element. */
export type SoundwaveSource = MediaStream | HTMLMediaElement;

export interface AudioLevelOptions {
  /**
   * The quietest sound that still moves the wave, in decibels below full
   * scale. Default `-60`. Raise it towards `-45` in a noisy room.
   */
  floor?: number;
  /** The loudness that fills the wave, in decibels below full scale. Default `-12`. */
  ceiling?: number;
}

let sharedContext: AudioContext | null = null;

/** One audio context for every wave on the page. Browsers limit how many may run. */
function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedContext) {
    const Context =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    sharedContext = new Context();
  }
  // Created or resumed outside a click, it starts suspended. Asking again is harmless.
  if (sharedContext.state === 'suspended') void sharedContext.resume().catch(() => {});
  return sharedContext;
}

/*
 * An element can be routed into an audio graph only once, so its node is
 * kept. The node is wired to the speakers as well as to the analyser, since
 * routing an element through the graph otherwise takes its sound away.
 */
const elementNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function sourceNode(context: AudioContext, source: SoundwaveSource): AudioNode {
  if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) {
    // Not wired to the speakers: a microphone played back is feedback.
    return context.createMediaStreamSource(source);
  }
  const element = source as HTMLMediaElement;
  let node = elementNodes.get(element);
  if (!node) {
    node = context.createMediaElementSource(element);
    node.connect(context.destination);
    elementNodes.set(element, node);
  }
  return node;
}

/**
 * How loud `source` is, from 0 to 1, kept in a ref that is updated every
 * frame. Pass the ref to `Soundwave` as `level`, or read `ref.current`
 * yourself. With no source the ref holds 0.
 */
export function useAudioLevel(
  source: SoundwaveSource | null | undefined,
  { floor = -60, ceiling = -12 }: AudioLevelOptions = {}
): RefObject<number> {
  const level = useRef(0);
  useEffect(() => {
    level.current = 0;
    if (!source) return;
    const context = audioContext();
    if (!context) return;
    let input: AudioNode;
    try {
      input = sourceNode(context, source);
    } catch {
      return;
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    input.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const resume = () => void context.resume().catch(() => {});
    const element =
      typeof MediaStream !== 'undefined' && source instanceof MediaStream ? null : (source as HTMLMediaElement);
    element?.addEventListener('play', resume);
    let frame = 0;
    const read = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
      // Loudness in decibels is negative and logarithmic; the wave wants 0 to 1.
      const db = 20 * Math.log10(Math.sqrt(sum / samples.length) || 1e-9);
      level.current = clamp01((db - floor) / (ceiling - floor));
      frame = requestAnimationFrame(read);
    };
    read();
    return () => {
      cancelAnimationFrame(frame);
      element?.removeEventListener('play', resume);
      try {
        input.disconnect(analyser);
      } catch {
        // Already gone with its context.
      }
      if (!element) input.disconnect();
      level.current = 0;
    };
  }, [source, floor, ceiling]);
  return level;
}

export type MicrophoneStatus = 'idle' | 'requesting' | 'listening' | 'denied' | 'unsupported';

export interface UseMicrophoneOptions extends AudioLevelOptions {
  /** Passed to `getUserMedia` as `audio`, to pick a device or change its processing. */
  constraints?: MediaTrackConstraints;
}

export interface MicrophoneControls {
  /** How loud the microphone is, from 0 to 1. Pass it to `Soundwave` as `level`. */
  level: RefObject<number>;
  /** The live stream while listening, for a recorder or a call. `null` otherwise. */
  stream: MediaStream | null;
  /** `requesting` while the browser asks for permission, `denied` if it was refused or there is no microphone. */
  status: MicrophoneStatus;
  /** Whether it is listening now. */
  active: boolean;
  /** Ask for the microphone and start listening. Call it from a click: browsers only allow sound to start from one. */
  start: () => Promise<void>;
  /** Stop listening and release the microphone, which turns the browser's recording light off. */
  stop: () => void;
  /** `start` when stopped, `stop` when listening. */
  toggle: () => void;
}

/**
 * The microphone, ready to draw. Nothing is asked for until `start`, and the
 * microphone is released on `stop` and when the component unmounts.
 *
 * ```tsx
 * const mic = useMicrophone();
 * <Soundwave level={mic.active ? mic.level : undefined} />
 * <Button onClick={mic.toggle}>{mic.active ? 'Stop' : 'Speak'}</Button>
 * ```
 */
export function useMicrophone({ constraints, ...options }: UseMicrophoneOptions = {}): MicrophoneControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MicrophoneStatus>('idle');
  const level = useAudioLevel(stream, options);
  const current = useRef<MediaStream | null>(null);
  const asking = useRef(false);

  const stop = () => {
    current.current?.getTracks().forEach((track) => track.stop());
    current.current = null;
    setStream(null);
    setStatus((value) => (value === 'listening' || value === 'requesting' ? 'idle' : value));
  };

  const start = async () => {
    if (current.current || asking.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    asking.current = true;
    setStatus('requesting');
    // Made here, inside the click, so the browser lets it run.
    audioContext();
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...constraints },
      });
      current.current = next;
      setStream(next);
      setStatus('listening');
    } catch {
      setStatus('denied');
    } finally {
      asking.current = false;
    }
  };

  useEffect(() => () => current.current?.getTracks().forEach((track) => track.stop()), []);

  const active = status === 'listening' && stream !== null;
  return { level, stream, status, active, start, stop, toggle: () => (active ? stop() : void start()) };
}
