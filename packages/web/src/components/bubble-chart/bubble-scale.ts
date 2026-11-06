/**
 * The arithmetic behind BubbleChart: which rows are bubbles, the domains they share,
 * the radius and colour each one takes, and the line that fits them.
 */

export type BubbleChartDatum = Record<string, string | number | null | undefined>;

/**
 * One drawn thing, carrying the row it came from by index. Every mark in the chart
 * takes this shape. `x2` and `y2` are the far corner of a quadrant's tint.
 */
export interface BubbleRow {
  index: number;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  r: number;
  /** The value behind the area, when the chart has a size key. */
  size: number | null;
  label: string;
  fill: string;
}

/** The straight line through a cloud. `r` runs from 0, no direction, to 1, every bubble on it. */
export interface BubbleFit {
  slope: number;
  intercept: number;
  r: number;
}

/** Steps each axis is rounded out to, matching the labels an axis draws by default. */
const AXIS_STEPS = 4;

const PALETTE_SIZE = 5;

/** About the width of a character of the chart's small label type, in pixels. */
const LABEL_CHAR_WIDTH = 6.2;

const ROLES = new Set(['primary', 'info', 'success', 'warning', 'destructive', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** A theme role by name, or anything else as the CSS colour it already is. */
export const colorOf = (color: string) => (ROLES.has(color) ? `var(--${color})` : color);

/**
 * A row's colour: a role or CSS colour by name, a number naming a chart colour from
 * 1 to 5, or the ramp in row order when the row says nothing.
 */
export function fillOf(explicit: unknown, index: number): string {
  if (typeof explicit === 'string') return colorOf(explicit);
  const step = isNumber(explicit) ? Math.round(explicit) - 1 : index;
  return `var(--chart-${(((step % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE) + 1})`;
}

/**
 * An extent widened to round numbers: 1, 2 or 5 times a power of ten, so the ends and
 * the steps between them are numbers a reader can divide in their head. No bubbles
 * gets a usable domain, and identical readings get a width, because a domain of zero
 * width puts every bubble on one edge.
 */
export function roundExtent(min: number, max: number): [number, number] {
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const rough = (max - min) / AXIS_STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const error = rough / magnitude;
  const step = (error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1) * magnitude;
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/**
 * A value's radius. Its place in the extent sets an area between the range's two ends,
 * and the radius is taken from that, so equal steps in value add equal ink. The range's
 * floor keeps small values visible, so two areas are not in the ratio of their values.
 */
export function bubbleRadius(value: number, extent: readonly [number, number], range: readonly [number, number]): number {
  const [min, max] = extent;
  const [smallest, largest] = range;
  const ratio = max === min ? 1 : (value - min) / (max - min);
  return Math.sqrt(smallest * smallest + ratio * (largest * largest - smallest * smallest));
}

/**
 * The lowest and highest value behind the areas, or null with nothing to scale. Only
 * rows that are drawn count, so a row with no position cannot flatten the others.
 */
export function sizeExtentOf(data: readonly BubbleChartDatum[], keys: { x: string; y: string; size?: string }): [number, number] | null {
  const sizeKey = keys.size;
  if (!sizeKey) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    const value = row[sizeKey];
    if (!isNumber(value) || !isNumber(row[keys.x]) || !isNumber(row[keys.y])) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Infinity ? null : [min, max];
}

/**
 * One row per bubble. A row missing either coordinate is left out rather than drawn
 * at the origin. Without a size, a bubble takes the middle of the range.
 */
export function bubbleRows(
  data: readonly BubbleChartDatum[],
  keys: { x: string; y: string; size?: string; label?: string; color?: string },
  sizeRange: readonly [number, number]
): BubbleRow[] {
  const extent = sizeExtentOf(data, keys);
  const middle = (sizeRange[0] + sizeRange[1]) / 2;
  return data.flatMap((datum, index) => {
    const x = datum[keys.x];
    const y = datum[keys.y];
    if (!isNumber(x) || !isNumber(y)) return [];
    const raw = keys.size ? datum[keys.size] : undefined;
    const size = isNumber(raw) ? raw : null;
    return [
      {
        index,
        x,
        y,
        size,
        r: extent && size !== null ? bubbleRadius(size, extent, sizeRange) : middle,
        label: keys.label ? String(datum[keys.label] ?? '') : '',
        fill: fillOf(keys.color ? datum[keys.color] : undefined, index),
      },
    ];
  });
}

/** Both domains, from the bubbles actually drawn. A fixed domain wins over the derived one. */
export function bubbleDomains(
  rows: readonly BubbleRow[],
  xDomain?: readonly [number, number],
  yDomain?: readonly [number, number]
): { x: [number, number]; y: [number, number] } {
  const xs = rows.map(({ x }) => x);
  const ys = rows.map(({ y }) => y);
  return {
    x: xDomain ? [xDomain[0], xDomain[1]] : roundExtent(Math.min(Infinity, ...xs), Math.max(-Infinity, ...xs)),
    y: yDomain ? [yDomain[0], yDomain[1]] : roundExtent(Math.min(Infinity, ...ys), Math.max(-Infinity, ...ys)),
  };
}

/** Least squares on the raw values. Fewer than two bubbles, or all on one vertical, has no line. */
export function fitLine(rows: readonly BubbleRow[]): BubbleFit | null {
  const n = rows.length;
  if (n < 2) return null;
  const meanX = rows.reduce((sum, { x }) => sum + x, 0) / n;
  const meanY = rows.reduce((sum, { y }) => sum + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const { x, y } of rows) {
    sxy += (x - meanX) * (y - meanY);
    sxx += (x - meanX) ** 2;
    syy += (y - meanY) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const denominator = Math.sqrt(sxx * syy);
  return { slope, intercept: meanY - slope * meanX, r: denominator === 0 ? 0 : Math.abs(sxy / denominator) };
}

/**
 * Where the line enters and leaves the visible box, solved in data space so a line
 * leaving by the top stops where it leaves. Null when it never crosses the box.
 */
export function trendSegment(
  { slope, intercept }: BubbleFit,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number]
): [{ x: number; y: number }, { x: number; y: number }] | null {
  let from = xDomain[0];
  let to = xDomain[1];
  if (slope !== 0) {
    const atLow = (yDomain[0] - intercept) / slope;
    const atHigh = (yDomain[1] - intercept) / slope;
    from = Math.max(from, Math.min(atLow, atHigh));
    to = Math.min(to, Math.max(atLow, atHigh));
  } else if (intercept < yDomain[0] || intercept > yDomain[1]) {
    return null;
  }
  if (to < from) return null;
  return [
    { x: from, y: intercept + slope * from },
    { x: to, y: intercept + slope * to },
  ];
}

/** Where the quadrants' rules stand: the mean of each axis, unless one is pinned. */
export function quadrantCentre(rows: readonly BubbleRow[], x?: number, y?: number): { x: number; y: number } | null {
  if (!rows.length) return null;
  return {
    x: x ?? rows.reduce((sum, row) => sum + row.x, 0) / rows.length,
    y: y ?? rows.reduce((sum, row) => sum + row.y, 0) / rows.length,
  };
}

/** A name cut to fit its circle, because a label running past the edge reads as lying on the plot. */
export function fitLabel(label: string, r: number): string {
  const room = Math.floor((r * 2 - 4) / LABEL_CHAR_WIDTH);
  if (label.length <= room) return label;
  // One letter and an ellipsis need two characters of room; with less, no name fits.
  return room >= 2 ? `${label.slice(0, room - 1)}…` : '';
}

/**
 * Where the placeholder circles go, as shares of the plot. The two strides stay out of
 * step, because a pair that moves together lays the circles along a diagonal, which
 * reads as a trend in data nobody has yet. The same count always lands the same way.
 */
export function skeletonField(count: number): BubbleRow[] {
  return Array.from({ length: Math.max(0, count) }, (_unused, index) => ({
    index,
    x: ((index * 0.7549) % 1) * 0.84 + 0.08,
    y: ((index * 0.5698) % 1) * 0.84 + 0.08,
    r: 16 + ((index * 0.472) % 1) * 12,
    size: null,
    label: '',
    fill: '',
  }));
}
