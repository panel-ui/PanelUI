/**
 * The maths every chart shares.
 *
 * Scales, monotone tangents and path building, in one place because four
 * charts need them and a copy per chart is four chances for two charts to
 * disagree about where a point goes. A line and an area drawn from different
 * code do not lie on top of each other, and that is exactly the pair most
 * often drawn together.
 *
 * Everything here is a worklet. The paths are rebuilt on the UI thread on
 * every frame a domain is tweening, so none of it can be allowed to need the
 * JS thread — which also rules out reaching for a charting dependency, since
 * that is the one thing none of them are written to survive.
 */

import { useCSSVariable } from 'uniwind';

/** Only reached if the theme CSS was never imported. */
const FALLBACK_SERIES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

/** Which of the five chart tokens a series takes. */
export type SeriesColorIndex = 1 | 2 | 3 | 4 | 5;

/**
 * A series' colour: an explicit one, else the `--color-chart-*` token.
 *
 * Shared so every chart draws its first series in the same colour. Two charts
 * on one screen disagreeing about what "series one" looks like is the kind of
 * thing nobody reports and everybody notices.
 */
export function useSeriesColor(
  explicit: string | undefined,
  index: SeriesColorIndex
): string {
  const token = useCSSVariable(`--color-chart-${index}`);
  return explicit ?? (typeof token === 'string' ? token : FALLBACK_SERIES[index - 1]!);
}

/**
 * The `r, g, b` of a colour string, or `null` for one that cannot be read.
 *
 * Hex and `rgb()` / `rgba()` only, which is every form a theme token and a
 * series colour take. A `null` is the caller's signal to keep whatever it
 * would have used anyway, rather than a guess that could be the wrong end of
 * the scale.
 */
function channelsOf(color: string): [number, number, number] | null {
  const value = color.trim().toLowerCase();

  if (value.startsWith('#')) {
    const body =
      value.length === 4 || value.length === 5
        ? value
            .slice(1, 4)
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : value.slice(1, 7);
    if (body.length !== 6 || /[^0-9a-f]/.test(body)) return null;
    return [
      parseInt(body.slice(0, 2), 16),
      parseInt(body.slice(2, 4), 16),
      parseInt(body.slice(4, 6), 16),
    ];
  }

  const fn = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!fn) return null;

  const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const channels = parts.slice(0, 3).map((raw) => {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return null;
    return raw.endsWith('%') ? (n / 100) * 255 : n;
  });

  return channels.some((c) => c === null)
    ? null
    : (channels as [number, number, number]);
}

/** One channel, undone from the sRGB transfer curve. */
function linear(value: number): number {
  const c = Math.min(1, Math.max(0, value / 255));
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance, 0 for black and 1 for white. */
function luminanceOf(rgb: [number, number, number]): number {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

/** Text laid over a fill: the solid colour and the softer one under it. */
export interface ChartInk {
  color: string;
  muted: string;
}

const LIGHT_INK: ChartInk = { color: '#ffffff', muted: 'rgba(255,255,255,0.82)' };
const DARK_INK: ChartInk = { color: '#0a0a0a', muted: 'rgba(10,10,10,0.82)' };

/**
 * The contrast ratio white keeps on a fill before the label is turned over.
 *
 * 3:1, which is the bar for bold text at this size. Higher and the mid-tone
 * hues every theme uses for its second series onwards flip to dark text as
 * well, which is a different chart rather than a legible one; lower and the
 * pale fills this exists for stay unreadable.
 */
const INK_FLOOR = 3;

/**
 * The text colour to lay over `fill`: white while white can be read on it,
 * near-black once it cannot.
 *
 * Neither the fill nor the theme can decide this on its own. A series colour is
 * a colour, not a mode — a theme is free to make it near-white, and a fixed
 * white label on it disappears while the foreground token would be just as
 * wrong on the next tile along.
 *
 * White is kept wherever it holds up, rather than always taking whichever ink
 * scores higher. Charts are drawn white-on-hue, and turning over every tile
 * that a darker label would technically suit changes what the chart looks like
 * to fix the two that were unreadable.
 *
 * `behind` and `opacity` are for a fill drawn part-transparent: what the reader
 * sees is the blend, and a half-strength tile on a pale ground is lighter than
 * the colour it was given. Compositing happens in gamma space, the way the
 * renderer does it, before the luminance is taken.
 */
/** A colour moved `amount` of the way towards white, or towards black when negative. */
function tone(color: string, amount: number): string {
  const rgb = channelsOf(color);
  if (!rgb) return color;

  const target = amount >= 0 ? 255 : 0;
  const t = Math.min(Math.abs(amount), 0.85);
  const [r, g, b] = rgb.map((c) => Math.round(c + (target - c) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * The colour for the `index`th thing in a chart that draws an unbounded number
 * of them.
 *
 * There are five series tokens, and a chart is routinely asked to draw six
 * things. Taking the palette modulo its length hands two of them the identical
 * colour, which in a chart whose whole job is telling parts apart is a bug the
 * theme decides the severity of — on a theme whose first token is green, the
 * sixth wedge is a second green one.
 *
 * So each further lap through the palette is drawn a step further along a tone
 * run, keeping the theme's own hues rather than inventing new ones.
 *
 * The run goes *away* from whichever end the colour already sits near, and
 * always in that one direction. Alternating lighter and darker would be the
 * obvious thing and it reintroduces the bug on the themes that matter: a token
 * of `#fafafa` lightened is `#fafafa` back again, so the second lap of a
 * near-white palette entry is the same colour it was trying not to be.
 */
export function seriesColorAt(palette: string[], index: number): string {
  if (!palette.length) return FALLBACK_SERIES[0]!;

  const base = palette[index % palette.length]!;
  const lap = Math.floor(index / palette.length);
  if (lap <= 0) return base;

  const rgb = channelsOf(base);
  const away = rgb && luminanceOf(rgb) > 0.4 ? -1 : 1;
  // Each lap covers two thirds of what is left, so every one lands somewhere
  // the last did not.
  return tone(base, away * (1 - 0.66 ** lap));
}

export function inkOn(fill: string, behind?: string, opacity = 1): ChartInk {
  const front = channelsOf(fill);
  if (!front) return LIGHT_INK;

  const alpha = Math.min(1, Math.max(0, opacity));
  const ground = alpha < 1 && behind ? channelsOf(behind) : null;
  const seen: [number, number, number] = ground
    ? [
        alpha * front[0] + (1 - alpha) * ground[0],
        alpha * front[1] + (1 - alpha) * ground[1],
        alpha * front[2] + (1 - alpha) * ground[2],
      ]
    : front;

  return 1.05 / (luminanceOf(seen) + 0.05) >= INK_FLOOR ? LIGHT_INK : DARK_INK;
}

/** The suffixes, smallest first. Each one is a thousand of the one before it. */
const MAGNITUDES = ['k', 'M', 'B', 'T'] as const;

/** Drop the zeros a fixed decimal count left behind: `12.0` is `12`. */
function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/**
 * One decimal while the mantissa is a single digit, none after that.
 *
 * `1.2k` and `12k` rather than `1.2k` and `12.4k`: the second decimal place is
 * spurious precision on a tick, and the label has one line to fit in.
 */
function mantissa(value: number): string {
  return trimZeros(value.toFixed(Math.abs(value) < 10 ? 1 : 0));
}

/**
 * A value's radius on a bubble scale, in points.
 *
 * The value maps to *area* and the radius is taken from it, so a bubble holding
 * twice the value carries twice the ink. Mapping it to the radius instead
 * quadruples the ink for a doubled value, and the reader believes the larger
 * number by four times.
 *
 * `extent` is the smallest and largest value in the whole set, so one bubble's
 * size means the same thing as another's. A degenerate extent — one row, or
 * every value identical — puts everything at the top of the range rather than
 * dividing by zero.
 */
export function bubbleRadius(
  value: number,
  extent: readonly [number, number],
  range: readonly [number, number]
): number {
  'worklet';
  const [min, max] = extent;
  const [rMin, rMax] = range;
  const ratio = max === min ? 1 : (value - min) / (max - min);
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  const area = rMin * rMin + clamped * (rMax * rMax - rMin * rMin);
  return Math.sqrt(area);
}

/** `12k` rather than `12400` — a readout has one line to say it in. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);

  const abs = Math.abs(value);
  if (abs < 1_000) {
    if (Number.isInteger(value)) return String(value);
    // Below one, a single decimal rounds most values to `0`, which reads as
    // nothing rather than as a small number.
    return trimZeros(value.toFixed(abs < 1 ? 2 : 1));
  }

  let index = 0;
  let scaled = value / 1_000;
  while (Math.abs(scaled) >= 1_000 && index < MAGNITUDES.length - 1) {
    scaled /= 1_000;
    index += 1;
  }

  /*
   * Rounding can push a mantissa over a thousand — 999,999 is `1000.0k` on the
   * way in, which is a thousand thousands written the long way. Formatting
   * first and promoting after is what makes it `1M`.
   */
  let text = mantissa(scaled);
  if (Math.abs(Number(text)) >= 1_000 && index < MAGNITUDES.length - 1) {
    index += 1;
    text = mantissa(scaled / 1_000);
  }

  return `${text}${MAGNITUDES[index]}`;
}

/** The drawable box inside a chart, after its padding is taken off. */
export interface Plot {
  width: number;
  height: number;
  left: number;
  top: number;
}

/** A point's x, spreading `total` of them evenly across the plot. */
export function xOf(index: number, total: number, plot: Plot): number {
  'worklet';
  if (total <= 1) return plot.left + plot.width / 2;
  return plot.left + (plot.width * index) / (total - 1);
}

/** A value's y, with `min` at the bottom of the plot and `max` at the top. */
export function yOf(value: number, plot: Plot, min: number, max: number): number {
  'worklet';
  const span = max - min || 1;
  return plot.top + plot.height - ((value - min) / span) * plot.height;
}

/**
 * Widens a domain out to round numbers.
 *
 * An axis derived from the data ends wherever the data happened to end, so it
 * gets labelled 34,650 — a number that is true and that nobody was looking for.
 * Rounding the ends out to a step of 1, 2 or 5 times a power of ten gives the
 * axis labels somebody can actually read a value off, and it can only ever add
 * room, never crop.
 *
 * Zero survives: any step divides it, so a baseline pinned there stays there.
 */
export function niceDomain(
  min: number,
  max: number,
  ticks = 5
): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return [min, max];
  }

  const rough = (max - min) / Math.max(1, ticks);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const error = rough / magnitude;

  /*
   * 1, 2, 5 or 10 times the magnitude — the steps a reader can divide in their
   * head. The thresholds are geometric means rather than the steps themselves,
   * so each candidate wins over the span it is genuinely closest to. Rounding at
   * the steps instead pushes anything above 5 up to a full decade, which turns a
   * top of 31,500 into an axis ending at 40,000 and hands a quarter of the plot
   * to empty space.
   */
  const step =
    (error >= Math.sqrt(50)
      ? 10
      : error >= Math.sqrt(10)
        ? 5
        : error >= Math.sqrt(2)
          ? 2
          : 1) * magnitude;

  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/**
 * A value's x on a *measured* axis, with `min` at the left edge and `max` at
 * the right.
 *
 * The counterpart to `xOf`, and not a replacement for it. `xOf` spreads points
 * evenly by position, which is what a time series wants — twelve months are
 * twelve equal steps whatever the gaps between the dates behind them. This one
 * places a point at the value it holds, which is what a scatter plot needs: the
 * whole claim of a scatter plot is that both coordinates are quantities, and
 * spacing its points evenly would throw away the one axis the reader is being
 * asked to look for a relationship along.
 */
export function xAt(value: number, plot: Plot, min: number, max: number): number {
  'worklet';
  const span = max - min || 1;
  return plot.left + ((value - min) / span) * plot.width;
}

/** The centre of the `index`th of `total` bands, as used for bars and columns. */
export function bandOf(index: number, total: number, plot: Plot): number {
  'worklet';
  if (total <= 0) return plot.left + plot.width / 2;
  const width = plot.width / total;
  return plot.left + width * (index + 0.5);
}

/**
 * Monotone cubic tangents.
 *
 * Written out rather than taken from a charting dependency, because it is forty
 * lines and it has to run inside a worklet.
 *
 * Monotone is the right default for a time series. A plain cubic spline
 * overshoots between points, so a series that never goes below zero draws a dip
 * under the axis between two low values — a shape that is not in the data. This
 * one cannot, because the tangent at each point is clamped against the slopes
 * either side of it, and a local peak or trough is given a flat one.
 */
export function tangents(xs: number[], ys: number[]): number[] {
  'worklet';
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

  // Fritsch–Carlson: pull any tangent back inside the circle of radius 3, which
  // is the condition for the segment to stay monotone.
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

/** How a series is joined between its points. */
export type ChartCurve = 'monotone' | 'linear';

export interface ChartPoint {
  x: number;
  y: number;
}

/** Points, split at the gaps — a null breaks the series rather than crossing it. */
export function runsOf(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number,
  /** Baselines to stack each point on top of, for a stacked area. */
  baselines?: number[],
  /**
   * Place points at band centres rather than spreading them edge to edge.
   *
   * A line drawn over columns has to agree with them about where a row sits,
   * and a column owns a slice of the axis rather than a position on it. Spread
   * evenly, the first point lands half a slice left of the bar it describes and
   * every point after it is wrong by the same amount.
   */
  banded?: boolean
): ChartPoint[][] {
  'worklet';
  const runs: ChartPoint[][] = [];
  let run: ChartPoint[] = [];

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === null || value === undefined) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    const stacked = value + (baselines?.[i] ?? 0);
    const x = banded ? bandOf(i, values.length, plot) : xOf(i, values.length, plot);
    run.push({ x, y: yOf(stacked, plot, min, max) });
  }
  if (run.length) runs.push(run);
  return runs;
}

/** One unbroken run of points as a path, curved or straight. */
export function segment(points: ChartPoint[], curve: ChartCurve): string {
  'worklet';
  if (!points.length) return '';
  if (points.length < 3 || curve === 'linear') {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const ms = tangents(xs, ys);

  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = (xs[i + 1]! - xs[i]!) / 3;
    d += ` C${xs[i]! + dx},${ys[i]! + ms[i]! * dx} ${xs[i + 1]! - dx},${ys[i + 1]! - ms[i + 1]! * dx} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

/** A series as a stroked line. Flat down the middle while it is still loading. */
export function linePath(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number,
  curve: ChartCurve,
  loading: boolean,
  baselines?: number[],
  /** Place points at band centres, for a line drawn over columns. */
  banded?: boolean
): string {
  'worklet';
  if (loading || plot.width <= 0) {
    // Flat down the middle: the shape the skeleton holds, and the shape the
    // real series grows out of once the data arrives.
    const y = plot.top + plot.height / 2;
    return `M${plot.left},${y} L${plot.left + plot.width},${y}`;
  }
  return runsOf(values, plot, min, max, baselines, banded)
    .map((run) => segment(run, curve))
    .join(' ');
}

/**
 * A series as a filled area.
 *
 * `floors` is what makes a stack: without it every run is closed against the
 * bottom of the plot, and with it each run is closed against the series below,
 * so the bands sit on each other rather than overlapping. The floor is walked
 * backwards because the fill has to trace its underside right to left to close.
 */
export function areaPath(
  values: (number | null)[],
  plot: Plot,
  min: number,
  max: number,
  curve: ChartCurve,
  loading: boolean,
  baselines?: number[],
  /** Place points at band centres, for an area drawn against columns. */
  banded?: boolean
): string {
  'worklet';
  if (loading || plot.width <= 0) return '';

  const bottom = plot.top + plot.height;
  const runs = runsOf(values, plot, min, max, baselines, banded);

  if (!baselines) {
    return runs
      .map((run) => {
        const top = segment(run, curve);
        if (!top) return '';
        const first = run[0]!;
        const last = run[run.length - 1]!;
        return `${top} L${last.x},${bottom} L${first.x},${bottom} Z`;
      })
      .join(' ');
  }

  // Stacked: the underside is the baseline itself, drawn as its own curve so
  // the two edges of a band meet cleanly at both ends.
  const floors = runsOf(
    values.map((value) => (value === null || value === undefined ? null : 0)),
    plot,
    min,
    max,
    baselines,
    banded
  );

  return runs
    .map((run, index) => {
      const top = segment(run, curve);
      const floor = floors[index];
      if (!top || !floor?.length) return '';
      const under = segment([...floor].reverse(), curve).replace('M', 'L');
      return `${top} ${under} Z`;
    })
    .join(' ');
}

/**
 * A colour as a gradient stop: the colour without its alpha, and the alpha as
 * the stop's opacity. A `<Stop>` given `rgba(255,255,255,0.13)` as its colour
 * draws it opaque on native, so a translucent token such as `--color-skeleton`
 * comes out solid white in a dark theme.
 */
export function colorStop(color: string): { stopColor: string; stopOpacity: number } {
  const value = color.trim();
  const clamp = (alpha: number) => (Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 1);

  // #rgba and #rrggbbaa
  if (/^#([0-9a-f]{4}|[0-9a-f]{8})$/i.test(value)) {
    const body =
      value.length === 5
        ? value
            .slice(1)
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : value.slice(1);
    return {
      stopColor: `#${body.slice(0, 6)}`,
      stopOpacity: clamp(parseInt(body.slice(6, 8), 16) / 255),
    };
  }

  // rgba(r, g, b, a) and rgb(r g b / a)
  const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*[,/]\s*([\d.]+%?)\s*\)$/i.exec(value);
  if (match) {
    const raw = match[4]!;
    const alpha = raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
    return { stopColor: `rgb(${match[1]}, ${match[2]}, ${match[3]})`, stopOpacity: clamp(alpha) };
  }

  return { stopColor: value, stopOpacity: 1 };
}

/**
 * One unbroken run of points joined by S-curves, for a chart of positions.
 *
 * Each join leaves one point level and arrives at the next one level, with
 * both control points at the midpoint between them. A line that holds its
 * position stays flat, and a line that changes position crosses over in the
 * middle of the gap. The monotone curve suits values, not places: it bends
 * through every point, so a series holding its rank would still look like it
 * was moving.
 */
export function bumpSegment(points: ChartPoint[]): string {
  'worklet';
  if (!points.length) return '';
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]!;
    const to = points[i]!;
    const mid = (from.x + to.x) / 2;
    d += ` C${mid},${from.y} ${mid},${to.y} ${to.x},${to.y}`;
  }
  return d;
}

/** A dot at every point, as one path, so a series' markers cost one node. */
export function dotsPath(points: ChartPoint[], radius: number): string {
  'worklet';
  let d = '';
  for (const point of points) {
    d += `M${point.x - radius},${point.y} a${radius},${radius} 0 1,0 ${radius * 2},0 a${radius},${radius} 0 1,0 ${-radius * 2},0 `;
  }
  return d;
}

/**
 * A rounded rectangle, built as a path rather than drawn as a `Rect`.
 *
 * A bar is rounded on the end it grows towards and square on the end it grows
 * from, so it reads as sitting on the axis rather than floating above it —
 * which `rx` cannot express, since it rounds all four corners or none.
 */
export function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  /** Which end is the growing one. */
  towards: 'up' | 'down' | 'left' | 'right'
): string {
  'worklet';
  if (width <= 0 || height <= 0) return '';
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

  if (towards === 'up') {
    return (
      `M${x},${bottom}L${x},${y + r}Q${x},${y} ${x + r},${y}` +
      `L${right - r},${y}Q${right},${y} ${right},${y + r}L${right},${bottom}Z`
    );
  }
  if (towards === 'down') {
    return (
      `M${x},${y}L${x},${bottom - r}Q${x},${bottom} ${x + r},${bottom}` +
      `L${right - r},${bottom}Q${right},${bottom} ${right},${bottom - r}L${right},${y}Z`
    );
  }
  if (towards === 'right') {
    return (
      `M${x},${y}L${right - r},${y}Q${right},${y} ${right},${y + r}` +
      `L${right},${bottom - r}Q${right},${bottom} ${right - r},${bottom}L${x},${bottom}Z`
    );
  }
  return (
    `M${right},${y}L${x + r},${y}Q${x},${y} ${x},${y + r}` +
    `L${x},${bottom - r}Q${x},${bottom} ${x + r},${bottom}L${right},${bottom}Z`
  );
}

/**
 * An arc of a circle, as a path.
 *
 * Angles are in turns from twelve o'clock, clockwise, because that is how a
 * ring chart is described — "sixty percent of the way round" — and converting
 * at every call site is where the sign errors live.
 */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number
): string {
  'worklet';
  const sweep = to - from;
  if (radius <= 0 || sweep <= 0) return '';

  // A full turn cannot be drawn as one arc — start and end are the same point,
  // and the renderer draws nothing rather than everything. Two halves can.
  if (sweep >= 1) {
    const top = `${cx},${cy - radius}`;
    const bottomPoint = `${cx},${cy + radius}`;
    return (
      `M${top}A${radius},${radius} 0 0 1 ${bottomPoint}` +
      `A${radius},${radius} 0 0 1 ${top}`
    );
  }

  const angle = (turn: number) => (turn - 0.25) * Math.PI * 2;
  const x1 = cx + radius * Math.cos(angle(from));
  const y1 = cy + radius * Math.sin(angle(from));
  const x2 = cx + radius * Math.cos(angle(to));
  const y2 = cy + radius * Math.sin(angle(to));

  return `M${x1},${y1}A${radius},${radius} 0 ${sweep > 0.5 ? 1 : 0} 1 ${x2},${y2}`;
}

/**
 * A filled slice of an annulus, as a path.
 *
 * `arcPath` above cannot express this: it draws a line to be stroked, and a
 * stroke is a band of even thickness with no ends of its own. A slice is a
 * region — bounded by two arcs and two radial edges — and only a closed path
 * can be filled as one.
 *
 * `inner` of zero gives the pie's wedge, closing on the centre rather than on a
 * second arc. Anything above it gives the donut's, and the two are worth being
 * one function: a donut is not a pie with a circle painted over the middle,
 * because a slice pushed out of a donut has to be hollow along its whole length.
 *
 * `corner` rounds the four turns of a slice, and rounds them with a quadratic
 * through the sharp corner rather than with a true fillet arc. The two are
 * indistinguishable at the radii a slice is drawn at, and the quadratic cannot
 * degenerate at a narrow slice the way solving for tangent points does — which
 * matters here, because the narrow slices are exactly the ones a reader is
 * least able to check.
 */
export function wedgePath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  from: number,
  to: number,
  corner: number
): string {
  'worklet';
  const sweep = to - from;
  if (outer <= 0 || sweep <= 0) return '';

  const at = (turn: number, radius: number) => {
    const angle = (turn - 0.25) * Math.PI * 2;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  };

  const ring = Math.max(0, Math.min(inner, outer));

  /*
   * A full turn cannot be drawn as one arc — its start and end are the same
   * point, and the renderer draws nothing rather than everything. Two halves
   * can, and the hole in a full donut comes from tracing the inner circle the
   * other way round: under the nonzero fill rule an opposed subpath is a hole,
   * with no fill rule to set and no second element to keep in step.
   */
  if (sweep >= 1) {
    const disc =
      `M${at(0, outer)}A${outer},${outer} 0 1 1 ${at(0.5, outer)}` +
      `A${outer},${outer} 0 1 1 ${at(0, outer)}Z`;
    if (ring <= 0) return disc;
    return (
      `${disc}M${at(0, ring)}A${ring},${ring} 0 1 0 ${at(0.5, ring)}` +
      `A${ring},${ring} 0 1 0 ${at(0, ring)}Z`
    );
  }

  // Never more than half the slice from each end, or the two roundings meet in
  // the middle and cross; never more than half the band, or the outer rounding
  // reaches past the inner edge.
  const band = ring > 0 ? outer - ring : outer;
  const k = Math.max(0, Math.min(corner, band / 2, sweep * outer * Math.PI));
  const outerInset = Math.min(k / (outer * Math.PI * 2), sweep / 2);
  const innerInset = ring > 0 ? Math.min(k / (ring * Math.PI * 2), sweep / 2) : 0;
  const large = sweep - 2 * outerInset > 0.5 ? 1 : 0;

  const outerStart = from + outerInset;
  const outerEnd = to - outerInset;

  if (ring <= 0) {
    // A wedge closes on the centre, and its apex stays sharp: rounding a point
    // that three slices share opens a hole in the middle of the chart.
    return (
      `M${cx},${cy}L${at(from, outer - k)}Q${at(from, outer)} ${at(outerStart, outer)}` +
      `A${outer},${outer} 0 ${large} 1 ${at(outerEnd, outer)}` +
      `Q${at(to, outer)} ${at(to, outer - k)}Z`
    );
  }

  return (
    `M${at(outerStart, outer)}A${outer},${outer} 0 ${large} 1 ${at(outerEnd, outer)}` +
    `Q${at(to, outer)} ${at(to, outer - k)}` +
    `L${at(to, ring + k)}` +
    `Q${at(to, ring)} ${at(to - innerInset, ring)}` +
    `A${ring},${ring} 0 ${large} 0 ${at(from + innerInset, ring)}` +
    `Q${at(from, ring)} ${at(from, ring + k)}` +
    `L${at(from, outer - k)}` +
    `Q${at(from, outer)} ${at(outerStart, outer)}Z`
  );
}

/**
 * A point at `radius` from the centre, `turn` of the way round.
 *
 * Turns from twelve o'clock, clockwise, matching `arcPath` — a radar's axes
 * and a ring's arcs are described the same way, and two polar conventions in
 * one file is how a spoke ends up a quarter turn from its own label.
 */
export function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  turn: number
): { x: number; y: number } {
  'worklet';
  const angle = (turn - 0.25) * Math.PI * 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * A closed polygon through evenly spaced spokes.
 *
 * `values` are already scaled to 0…1 — the fraction of the full radius each
 * axis reaches. A `null` is a missing reading rather than a zero: a radar with
 * a hole punched through to its centre says "none of this" when what happened
 * was "we did not measure this", so the gap is bridged by its neighbours and
 * the shape stays a shape.
 */
export function radarPath(
  values: (number | null)[],
  cx: number,
  cy: number,
  radius: number
): string {
  'worklet';
  const count = values.length;
  if (count < 3 || radius <= 0) return '';

  let path = '';
  let drawn = 0;

  for (let index = 0; index < count; index += 1) {
    const value = values[index];
    if (value === null || value === undefined) continue;
    const point = polarPoint(cx, cy, radius * value, index / count);
    path += `${drawn === 0 ? 'M' : 'L'}${point.x},${point.y}`;
    drawn += 1;
  }

  if (drawn < 3) return '';
  return `${path}Z`;
}

/**
 * A pointy-top hexagon's metrics, from the radius of the circle through its
 * corners.
 *
 * Pointy-top rather than flat-top because it is the rows that have to tile: a
 * row of pointy-top cells has a straight top and bottom edge, so the next row
 * nests into it by half a cell and the field reads as a honeycomb. Flat-top
 * cells tile by column instead, which gives the same shape turned a quarter
 * turn and a field that is taller than it is wide for the same cell count.
 */
export interface HexMetrics {
  /** Centre to corner. */
  radius: number;
  /** Across the flats — the full width of one cell. */
  width: number;
  /** Point to point — the full height of one cell. */
  height: number;
  /** Centre to centre along a row. */
  stepX: number;
  /**
   * Centre to centre between rows. Three quarters of the height, not all of
   * it: consecutive rows interlock, and each one only costs the height of the
   * cell less the point it slots into.
   */
  stepY: number;
}

export function hexMetrics(radius: number): HexMetrics {
  'worklet';
  const width = Math.sqrt(3) * radius;
  return { radius, width, height: radius * 2, stepX: width, stepY: radius * 1.5 };
}

/** The cell radius that fits `columns` of them across `width`. */
export function hexRadiusFor(width: number, columns: number): number {
  'worklet';
  if (width <= 0 || columns <= 0) return 0;
  // Half a cell wider than the columns alone: the odd rows are offset by that
  // much, and a radius derived without it runs them off the right edge.
  return width / (columns + 0.5) / Math.sqrt(3);
}

/** How many rows of cells fit in `height`. */
export function hexRowsFor(height: number, metrics: HexMetrics): number {
  'worklet';
  if (height <= 0 || metrics.stepY <= 0) return 0;
  return Math.max(1, Math.floor((height - metrics.height / 4) / metrics.stepY));
}

/** The centre of the cell at `column`, `row`, with odd rows nested half a cell right. */
export function hexCenter(
  column: number,
  row: number,
  metrics: HexMetrics,
  left: number,
  top: number
): ChartPoint {
  'worklet';
  const offset = row % 2 === 1 ? metrics.stepX / 2 : 0;
  return {
    x: left + metrics.stepX / 2 + offset + column * metrics.stepX,
    y: top + metrics.radius + row * metrics.stepY,
  };
}

/**
 * One hexagon as a closed path.
 *
 * Corners are turns from twelve o'clock like everything else polar in this
 * file, which puts the first one straight up — the definition of pointy-top.
 *
 * The coordinates are rounded to two decimals because these paths are
 * concatenated by the hundred: a field is one path string per series rather
 * than one node per cell, and full float precision would make each of those
 * strings several times longer for a difference no display can resolve.
 */
export function hexPath(cx: number, cy: number, radius: number): string {
  'worklet';
  if (radius <= 0) return '';
  let d = '';
  for (let corner = 0; corner < 6; corner += 1) {
    const point = polarPoint(cx, cy, radius, corner / 6);
    d += `${corner === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/**
 * A number in 0…1 from a pair of coordinates, the same one every time.
 *
 * `Math.random` would give the honeycomb a different edge on every render,
 * which turns a re-render into an animation nobody asked for and means the
 * same data never screenshots twice.
 */
export function hashUnit(a: number, b: number): number {
  'worklet';
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * How many cells each value gets out of `budget`, by largest remainder.
 *
 * Rounding each share on its own does not add up — three equal parts of a
 * hundred round to 33 each and leave one over — and a spare cell in a
 * honeycomb is not a rounding error the reader can shrug off, it is a cell of
 * some colour that nothing in the data accounts for. Flooring every share and
 * then handing the leftovers to the largest fractions spends the budget
 * exactly, and spends it on the series with the strongest claim to each one.
 */
export function shareCounts(values: number[], budget: number): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0 || budget <= 0) return values.map(() => 0);

  const exact = values.map((value) => (Math.max(0, value) / total) * budget);
  const counts = exact.map((value) => Math.floor(value));
  // Every fraction is under one, so there is always less than one cell per
  // series left over and a single pass down the order places all of them. The
  // clamp is against float drift in the sum rather than against the maths.
  const spare = Math.min(
    budget - counts.reduce((sum, count) => sum + count, 0),
    values.length
  );

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let i = 0; i < spare; i += 1) {
    const index = byFraction[i]!.index;
    counts[index] = counts[index]! + 1;
  }
  return counts;
}

/** How the filled cells are arranged in the field. */
export type HexShape = 'blob' | 'grid';

export interface HexCell {
  column: number;
  row: number;
}

/** How far off its ring a cell may be nudged, in field widths. About one cell. */
const BLOB_WOBBLE = 0.09;

/**
 * Every cell of the field, in the order the series fill it.
 *
 * `grid` is reading order, which is the honest arrangement: counting cells off
 * a row is something a reader can actually do. `blob` grows out from the middle
 * instead, which counts for nothing but shows the shape of the split at a
 * glance — the smallest series in the centre with each larger one wrapped
 * around it.
 *
 * Two things make the blob look grown rather than stamped. Distance is measured
 * in the field's own proportions, so a wide field grows a wide blob instead of
 * a circle with empty shoulders either side of it; and each cell's distance is
 * nudged by a hash of its own coordinates, so the boundary between two series
 * comes out ragged instead of as a clean arc. The nudge is a hash and not a
 * random number, so the same data draws the same honeycomb every time.
 *
 * Computed once per layout rather than per frame, so it is a plain function.
 */
export function hexFillOrder(columns: number, rows: number, shape: HexShape): HexCell[] {
  const cells: HexCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({ column, row });
    }
  }
  if (shape === 'grid' || columns < 2 || rows < 2) return cells;

  const midColumn = (columns - 1) / 2;
  const midRow = (rows - 1) / 2;

  return cells
    .map((cell) => {
      // Odd rows sit half a cell right, and a distance measured without that
      // leans the whole blob to one side.
      const column = cell.column + (cell.row % 2 === 1 ? 0.5 : 0);
      const dx = (column - midColumn) / columns;
      const dy = (cell.row - midRow) / rows;
      const wobble = (hashUnit(cell.column, cell.row) - 0.5) * BLOB_WOBBLE;
      return { cell, key: Math.sqrt(dx * dx + dy * dy) + wobble };
    })
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.cell);
}

/**
 * The cell under a point, or null when the point is between cells or outside
 * the field.
 *
 * Only three rows can be near any y, and one column near any x within a row, so
 * this checks six candidates rather than solving the cube-rounding — the same
 * answer, and short enough to read.
 */
export function hexAt(
  x: number,
  y: number,
  metrics: HexMetrics,
  left: number,
  top: number,
  columns: number,
  rows: number
): HexCell | null {
  'worklet';
  if (metrics.radius <= 0) return null;

  const approximateRow = Math.round((y - top - metrics.radius) / metrics.stepY);
  let best: HexCell | null = null;
  let bestDistance = Infinity;

  for (let row = approximateRow - 1; row <= approximateRow + 1; row += 1) {
    if (row < 0 || row >= rows) continue;
    const offset = row % 2 === 1 ? metrics.stepX / 2 : 0;
    const column = Math.round((x - left - metrics.stepX / 2 - offset) / metrics.stepX);
    if (column < 0 || column >= columns) continue;

    const centre = hexCenter(column, row, metrics, left, top);
    const dx = x - centre.x;
    const dy = y - centre.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { column, row };
    }
  }

  // Further than a radius from the nearest centre is outside the honeycomb, not
  // a near miss worth rounding into it.
  return best !== null && bestDistance <= metrics.radius * metrics.radius ? best : null;
}

/** The numbers of one column, with anything unusable left as a gap. */
export function columnValues(
  data: Record<string, unknown>[],
  key: string
): (number | null)[] {
  'worklet';
  return data.map((row) => {
    const value = row[key];
    return typeof value === 'number' && !Number.isNaN(value) ? value : null;
  });
}

/**
 * One length of a funnel: a band symmetrical about a centre line, `head` wide
 * at one end and `tail` wide at the other.
 *
 * Given as two half-extents about a middle rather than as four corners, because
 * that is the shape of the data — a stage knows what it is worth and what the
 * next one is worth, and the taper between them is the drop.
 *
 * `curve` is how far along the band the control points reach, as a fraction of
 * its length. Past `0.5` the two reach beyond each other, which is what turns
 * the join from a diagonal into the S the eye reads as a single continuous
 * funnel rather than a stack of separate trapezoids; `0` gives the straight
 * diagonal. The sides are the only curved part — the ends stay square, so a
 * band's end lines up exactly with the next band's start.
 *
 * The run goes across, so `offset` and `length` are horizontal and the band is
 * `head` and `tail` tall about `middle`.
 */
export function ribbonPath(
  offset: number,
  length: number,
  head: number,
  tail: number,
  middle: number,
  curve: number
): string {
  'worklet';
  if (length <= 0 || (head <= 0 && tail <= 0)) return '';

  const start = offset;
  const end = offset + length;
  const topStart = middle - head;
  const topEnd = middle - tail;
  const bottomStart = middle + head;
  const bottomEnd = middle + tail;

  if (!(curve > 0)) {
    return `M${start},${topStart}L${end},${topEnd}L${end},${bottomEnd}L${start},${bottomStart}Z`;
  }

  const near = start + length * curve;
  const far = end - length * curve;

  return (
    `M${start},${topStart}` +
    `C${near},${topStart},${far},${topEnd},${end},${topEnd}` +
    `L${end},${bottomEnd}` +
    `C${far},${bottomEnd},${near},${bottomStart},${start},${bottomStart}` +
    `Z`
  );
}

/**
 * One ribbon of a flow diagram: a band of constant thickness running from a
 * centre at one end to a different centre at the other.
 *
 * Given by centres rather than edges because that is what the layout produces
 * — a ribbon is stacked against its node's edge and then recorded by its
 * middle, so that growing it in place thickens it about its own centre line
 * instead of sliding it down the node.
 *
 * The ends stay vertical whatever the two centres are, so a ribbon meets the
 * flat side of a node exactly rather than at the angle it happened to arrive.
 * `curve` is how far the control points reach towards the middle, as a
 * fraction of the horizontal run: `0.5` puts both on the halfway line, which
 * is the S that reads as one continuous flow, and `0` gives a straight
 * diagonal.
 */
/**
 * The same ribbon, running down the screen instead of across it.
 *
 * Written out rather than produced by swapping the arguments of `flowPath`,
 * because the coordinates in a path string are ordered and a worklet cannot
 * reorder them after the fact without building the string twice. The shape is
 * identical, reflected about the diagonal: the ends stay horizontal so a
 * ribbon still meets the flat side of a node, and `curve` reaches down the run
 * rather than along it.
 */
export function flowPathVertical(
  y0: number,
  cx0: number,
  y1: number,
  cx1: number,
  thickness: number,
  curve: number
): string {
  'worklet';
  if (!(thickness > 0)) return '';

  const half = thickness / 2;
  const leftStart = cx0 - half;
  const leftEnd = cx1 - half;
  const rightStart = cx0 + half;
  const rightEnd = cx1 + half;

  const run = y1 - y0;
  const near = y0 + run * curve;
  const far = y1 - run * curve;

  return (
    `M${leftStart},${y0}` +
    `C${leftStart},${near},${leftEnd},${far},${leftEnd},${y1}` +
    `L${rightEnd},${y1}` +
    `C${rightEnd},${far},${rightStart},${near},${rightStart},${y0}` +
    `Z`
  );
}

export function flowPath(
  x0: number,
  cy0: number,
  x1: number,
  cy1: number,
  thickness: number,
  curve: number
): string {
  'worklet';
  if (!(thickness > 0)) return '';

  const half = thickness / 2;
  const topStart = cy0 - half;
  const topEnd = cy1 - half;
  const bottomStart = cy0 + half;
  const bottomEnd = cy1 + half;

  const run = x1 - x0;
  const near = x0 + run * curve;
  const far = x1 - run * curve;

  return (
    `M${x0},${topStart}` +
    `C${near},${topStart},${far},${topEnd},${x1},${topEnd}` +
    `L${x1},${bottomEnd}` +
    `C${far},${bottomEnd},${near},${bottomStart},${x0},${bottomStart}` +
    `Z`
  );
}
