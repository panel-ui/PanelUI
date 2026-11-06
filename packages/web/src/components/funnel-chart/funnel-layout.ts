/**
 * The arithmetic behind a funnel, apart from anything drawn: how far each stage
 * reaches from the centre line, what it converted at, and which column a pointer
 * is over. No imports with a runtime, so a test can run it directly.
 */
import type { ChartCurve } from '@tanstack/charts';

/** How far the hue has faded by the end of the run. */
const FADE = 0.35;

/** The share of the height kept above the ribbon for the count, and below it for the name. */
const TEXT_BAND = 0.15;

export interface FunnelLayoutStage {
  value: number;
  /** A stage with its own colour is drawn at full strength instead of the fade. */
  color?: unknown;
}

/** One stage's band: where it sits along the run and how far it reaches at each end. */
export interface FunnelBand {
  /** Where it starts along the run, in pixels from the left. */
  offset: number;
  /** How wide it is, in pixels. */
  length: number;
  /** Half-height at its left end, in pixels. */
  head: number;
  /** Half-height at its right end, in pixels. */
  tail: number;
}

export interface FunnelLayoutOptions {
  width: number;
  height: number;
  /** Space between one stage and the next, in pixels. */
  gap: number;
  /** How wide one stage is. The stages divide the width when it is left out. */
  stageSize?: number;
  /** The shortest a non-zero stage is drawn, as a share of the tallest. */
  minWidth: number;
  /** Lay the bands from the right, for a right-to-left page. */
  mirrored?: boolean;
}

export interface FunnelLayout {
  bands: FunnelBand[];
  /** Each stage's share of the first stage, 0 to 1. */
  shares: number[];
  /** Each stage's share of the one above it, 0 to 1. The first is 1. */
  steps: number[];
  /** How far the hue has faded at each stage. `1` where a colour was given. */
  strengths: number[];
  /** Room kept above the ribbon and below it, in pixels. */
  textBand: number;
  /** The ribbon's centre line, in pixels. */
  middle: number;
}

const positive = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/**
 * Lays the stages out in the order given, without sorting. Heights are measured
 * against the largest value rather than the first, so a stage larger than the one
 * above it is drawn as given. The floor applies only to stages with something in
 * them, and a stage above it keeps its true height.
 */
export function funnelLayout(
  stages: readonly FunnelLayoutStage[],
  { width, height, gap, stageSize, minWidth, mirrored = false }: FunnelLayoutOptions
): FunnelLayout {
  const count = stages.length;
  const values = stages.map(({ value }) => positive(value));
  const peak = Math.max(0, ...values);
  const first = values[0] ?? 0;
  const spacing = Math.max(0, gap);
  const textBand = height * TEXT_BAND;
  const reach = Math.max(0, height / 2 - textBand);
  const floor = Math.max(0, Math.min(minWidth, 1));
  const size = stageSize ?? (count > 0 ? Math.max(0, (width - (count - 1) * spacing) / count) : 0);
  const extents = values.map((value) => (value > 0 && peak > 0 ? reach * Math.max(value / peak, floor) : 0));

  return {
    bands: extents.map((extent, index) => {
      const offset = index * (size + spacing);
      const next = extents[index + 1] ?? extent;
      return {
        offset: mirrored ? width - offset - size : offset,
        length: size,
        head: mirrored ? next : extent,
        tail: mirrored ? extent : next,
      };
    }),
    shares: values.map((value) => (first > 0 ? value / first : 0)),
    steps: values.map((value, index) => {
      if (index === 0) return 1;
      const previous = values[index - 1] ?? 0;
      return previous > 0 ? value / previous : 0;
    }),
    strengths: stages.map(({ color }, index) => {
      if (color !== undefined || count < 2) return 1;
      return 1 - (index / (count - 1)) * FADE;
    }),
    textBand,
    middle: height / 2,
  };
}

/** The stage whose column holds `x`. A pointer in a gap belongs to the nearer stage, and past the run to none. */
export function stageAt(bands: readonly FunnelBand[], x: number): number {
  let nearest = -1;
  let nearestGap = Infinity;
  bands.forEach(({ offset, length }, index) => {
    const distance = x < offset ? offset - x : x > offset + length ? x - offset - length : 0;
    if (distance < nearestGap) {
      nearest = index;
      nearestGap = distance;
    }
  });
  const spacing = bands.length > 1 ? Math.abs(bands[1]!.offset - bands[0]!.offset) - bands[0]!.length : 0;
  return nearestGap <= spacing / 2 ? nearest : -1;
}

/**
 * Sides that reach past each other, so consecutive bands meet flush and the run
 * reads as one channel. Past a half the control points overshoot, which flattens
 * the ends of the join and puts the whole slope in the middle. `0` draws straight
 * diagonals.
 */
export function ribbonCurve(reach: number): ChartCurve {
  const side = (from: readonly [number, number], to: readonly [number, number]) => {
    if (!(reach > 0)) return `L${to[0]},${to[1]}`;
    const pull = (to[0] - from[0]) * reach;
    return `C${from[0] + pull},${from[1]} ${to[0] - pull},${to[1]} ${to[0]},${to[1]}`;
  };
  const run = (points: readonly (readonly [number, number])[]) =>
    points.slice(1).map((point, index) => side(points[index]!, point)).join('');

  return {
    line: (points) => (points[0] ? `M${points[0][0]},${points[0][1]}${run(points)}` : ''),
    area: (top, bottom) => {
      const back = [...bottom].reverse();
      if (!top[0] || !back[0]) return '';
      return `M${top[0][0]},${top[0][1]}${run(top)}L${back[0][0]},${back[0][1]}${run(back)}Z`;
    },
  };
}
