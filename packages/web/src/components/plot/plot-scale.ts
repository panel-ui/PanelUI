/**
 * The arithmetic behind Plot, apart from the drawing so it can be tested on its
 * own: the one y-domain every mark shares, and how a row or a value becomes a
 * position. The same functions are exported for a mark written outside the chart.
 */

/** The drawable box inside a chart, after its padding is taken off. */
export interface PlotBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface PlotPoint {
  x: number;
  y: number;
}

/**
 * How a series is joined between its points. `step` holds each value until the next
 * point and then moves straight to it, for a balance that only changes on the day it does.
 */
export type PlotCurve = 'monotone' | 'linear' | 'step';

/** One end of the y-domain: a number to pin it at, or `auto` to derive it. */
export type PlotBound = number | 'auto';

const MAGNITUDES = ['k', 'M', 'B', 'T'];

const trimZeros = (text: string) => (text.includes('.') ? text.replace(/\.?0+$/, '') : text);

const mantissa = (value: number) => trimZeros(value.toFixed(1));

/** `12k` rather than `12400`, because a readout has one line to say it in. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);

  const abs = Math.abs(value);
  if (abs < 1_000) {
    if (Number.isInteger(value)) return String(value);
    // Below one, a single decimal rounds most values to `0`.
    return trimZeros(value.toFixed(abs < 1 ? 2 : 1));
  }

  let index = 0;
  let scaled = value / 1_000;
  while (Math.abs(scaled) >= 1_000 && index < MAGNITUDES.length - 1) {
    scaled /= 1_000;
    index += 1;
  }

  // Rounding can carry a mantissa to a thousand: 999,999 has to read `1M`.
  let text = mantissa(scaled);
  if (Math.abs(Number(text)) >= 1_000 && index < MAGNITUDES.length - 1) {
    index += 1;
    text = mantissa(scaled / 1_000);
  }

  return `${text}${MAGNITUDES[index]}`;
}

/** A point's x, spreading `total` of them evenly from one edge of the plot to the other. */
export function xOf(index: number, total: number, plot: PlotBox): number {
  if (total <= 1) return plot.left + plot.width / 2;
  return plot.left + (plot.width * index) / (total - 1);
}

/** The centre of the `index`th of `total` equal slices of the plot. */
export function bandOf(index: number, total: number, plot: PlotBox): number {
  if (total <= 0) return plot.left + plot.width / 2;
  return plot.left + (plot.width / total) * (index + 0.5);
}

/** A value's y, with `min` at the bottom of the plot and `max` at the top. */
export function yOf(value: number, plot: PlotBox, min: number, max: number): number {
  const span = max - min || 1;
  return plot.top + plot.height - ((value - min) / span) * plot.height;
}

/** A value's x on a measured axis, with `min` at the left edge and `max` at the right. */
export function xAt(value: number, plot: PlotBox, min: number, max: number): number {
  const span = max - min || 1;
  return plot.left + ((value - min) / span) * plot.width;
}

/**
 * Widens a domain out to a step of 1, 2 or 5 times a power of ten. It can only
 * add room, and zero survives, because any step divides it.
 */
export function niceDomain(min: number, max: number, ticks = 5): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min, max];

  const rough = (max - min) / Math.max(1, ticks);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const error = rough / magnitude;
  // The thresholds are geometric means, so each step wins the span it is closest to.
  const step =
    (error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1) * magnitude;

  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** The numbers of one column, with anything unusable left as a gap. */
export function columnValues(data: readonly Record<string, unknown>[], key: string): (number | null)[] {
  return data.map((row) => finite(row[key]) ?? null);
}

export interface PlotExtentOptions {
  yDomain?: readonly [PlotBound, PlotBound];
  /** A bar is a length from zero, so a plot with bars keeps zero on its axis. */
  hasBars?: boolean;
  nice?: boolean;
}

/**
 * The y-domain, across every column a mark draws.
 *
 * Headroom of a tenth of the span goes on the derived ends only: a pinned end
 * stays where it was pinned, and so does a zero under bars, because room under a
 * baseline lifts the bars off what they are measured from. `nice` replaces the
 * headroom, since rounding out to a whole step is already room.
 */
export function plotExtent(
  data: readonly Record<string, unknown>[],
  keys: readonly string[],
  { yDomain, hasBars = false, nice = false }: PlotExtentOptions = {}
): [number, number] {
  const lowPin = finite(yDomain?.[0]);
  const highPin = finite(yDomain?.[1]);
  if (lowPin !== undefined && highPin !== undefined) return [lowPin, highPin];

  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const key of keys) {
      const value = finite(row[key]);
      if (value === undefined) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  if (min === Infinity) {
    // Nothing to measure, and a span of zero would draw marks at infinity.
    const low = lowPin ?? (highPin !== undefined ? highPin - 1 : 0);
    return [low, highPin ?? low + 1];
  }

  let lowRoom = 1;
  let highRoom = 1;
  if (hasBars) {
    if (min > 0) min = 0;
    if (max < 0) max = 0;
    if (min === 0) lowRoom = 0;
    if (max === 0) highRoom = 0;
  }

  // A flat series has no span of its own, so it lands on the middle of the plot.
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const headroom = (max - min) * 0.1;
  const [niceLow, niceHigh] = nice ? niceDomain(min, max) : [min, max];
  const low = lowPin ?? (nice ? niceLow : min - headroom * lowRoom);
  const high = highPin ?? (nice ? niceHigh : max + headroom * highRoom);
  if (low < high) return [low, high];
  // A pin past all the data would flip the axis, so the derived end keeps to its side.
  const span = max - min;
  return lowPin !== undefined ? [low, low + span] : [high - span, high];
}

/**
 * The domain partway through a change, `t` from `0` to `1`.
 *
 * The chart moves a mark's pixels in a straight line from where the old domain put
 * them to where the new one does. Moving the two ends of the domain would not keep
 * up, because a position divides by the span. Blending the two scales is still a
 * straight line in the value, so it is exactly one domain: this one, and anything
 * drawn against it stays on the marks all the way across.
 */
export function domainBetween(
  [fromMin, fromMax]: readonly [number, number],
  [toMin, toMax]: readonly [number, number],
  t: number
): [number, number] {
  if (t >= 1) return [toMin, toMax];
  const fromSpan = fromMax - fromMin || 1;
  const toSpan = toMax - toMin || 1;
  const slope = (1 - t) / fromSpan + t / toSpan;
  const offset = -((1 - t) * fromMin) / fromSpan - (t * toMin) / toSpan;
  return [-offset / slope, (1 - offset) / slope];
}

/**
 * Monotone cubic tangents. The tangent at each point is clamped against the
 * slopes either side of it, so a curve cannot overshoot between two points and
 * draw a dip that is not in the data.
 */
function tangents(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    slopes.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]! || 1));
  }

  const result: number[] = new Array(n).fill(0);
  result[0] = slopes[0] ?? 0;
  result[n - 1] = slopes[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i += 1) {
    const previous = slopes[i - 1]!;
    const next = slopes[i]!;
    result[i] = previous * next <= 0 ? 0 : (previous + next) / 2;
  }

  // Pull any tangent back inside the circle of radius 3, which keeps the segment monotone.
  for (let i = 0; i < n - 1; i += 1) {
    const slope = slopes[i]!;
    if (slope === 0) {
      result[i] = 0;
      result[i + 1] = 0;
      continue;
    }
    const a = result[i]! / slope;
    const b = result[i + 1]! / slope;
    const magnitude = Math.sqrt(a * a + b * b);
    if (magnitude > 3) {
      result[i] = (3 / magnitude) * a * slope;
      result[i + 1] = (3 / magnitude) * b * slope;
    }
  }
  return result;
}

/** One unbroken run of points as a path, curved or straight. */
export function segment(points: readonly PlotPoint[], curve: PlotCurve): string {
  if (!points.length) return '';
  if (curve === 'step') {
    return points
      .map(({ x, y }, index) => (index === 0 ? `M${x},${y}` : `L${x},${points[index - 1]!.y} L${x},${y}`))
      .join(' ');
  }
  if (points.length < 3 || curve === 'linear') {
    return points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  }

  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const ms = tangents(xs, ys);
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = (xs[i + 1]! - xs[i]!) / 3;
    d += ` C${xs[i]! + dx},${ys[i]! + ms[i]! * dx} ${xs[i + 1]! - dx},${ys[i + 1]! - ms[i + 1]! * dx} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

/** Points, split at the gaps. A null breaks the series rather than crossing it. */
function runsOf(
  values: readonly (number | null)[],
  plot: PlotBox,
  min: number,
  max: number,
  banded: boolean
): PlotPoint[][] {
  const runs: PlotPoint[][] = [];
  let run: PlotPoint[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({
      x: banded ? bandOf(index, values.length, plot) : xOf(index, values.length, plot),
      y: yOf(value, plot, min, max),
    });
  });
  if (run.length) runs.push(run);
  return runs;
}

/** A column as a stroked line. `banded` puts its points at slice centres, to sit over bars. */
export function linePath(
  values: readonly (number | null)[],
  plot: PlotBox,
  min: number,
  max: number,
  curve: PlotCurve = 'monotone',
  banded = false
): string {
  return runsOf(values, plot, min, max, banded)
    .map((run) => segment(run, curve))
    .join(' ');
}

/** A column as a fill down to the bottom of the plot. */
export function areaPath(
  values: readonly (number | null)[],
  plot: PlotBox,
  min: number,
  max: number,
  curve: PlotCurve = 'monotone',
  banded = false
): string {
  const bottom = plot.top + plot.height;
  return runsOf(values, plot, min, max, banded)
    .map((run) => `${segment(run, curve)} L${run[run.length - 1]!.x},${bottom} L${run[0]!.x},${bottom} Z`)
    .join(' ');
}

/** One bar, rounded on the end it grows towards and square on the end it grows from. */
export function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  towards: 'up' | 'down'
): string {
  if (width <= 0 || height <= 0) return '';
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;
  return towards === 'up'
    ? `M${x},${bottom}L${x},${y + r}Q${x},${y} ${x + r},${y}L${right - r},${y}Q${right},${y} ${right},${y + r}L${right},${bottom}Z`
    : `M${x},${y}L${x},${bottom - r}Q${x},${bottom} ${x + r},${bottom}L${right - r},${bottom}Q${right},${bottom} ${right},${bottom - r}L${right},${y}Z`;
}

/**
 * Where a bar ends once it is at least `minHeight` pixels long. A value on the
 * baseline stays there, because no bar is the honest drawing of nothing.
 */
export function barEnd(
  value: number,
  baseline: number,
  minHeight: number,
  plotHeight: number,
  [min, max]: readonly [number, number]
): number {
  if (value === baseline || plotHeight <= 0) return value;
  const least = (minHeight / plotHeight) * (max - min);
  return Math.abs(value - baseline) >= least ? value : baseline + Math.sign(value - baseline) * least;
}

/** Which rows get an x label: `ticks` of them, as evenly spread as whole rows allow. */
export function labelledRows(total: number, ticks: number): number[] {
  const count = Math.min(Math.max(1, Math.round(ticks)), total);
  if (count <= 0) return [];
  const step = count > 1 ? (total - 1) / (count - 1) : 0;
  return Array.from({ length: count }, (_unused, index) => Math.round(index * step));
}

/** A path builder for the chart's marks, in the shape of one of the two curves. */
export function plotCurve(curve: PlotCurve) {
  const join = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => ({ x, y }));
  return {
    line: (points: readonly (readonly [number, number])[]) => segment(join(points), curve),
    area: (top: readonly (readonly [number, number])[], bottom: readonly (readonly [number, number])[]) => {
      const under = segment(join([...bottom].reverse()), curve);
      return `${segment(join(top), curve)} ${under.replace('M', 'L')} Z`;
    },
  };
}
