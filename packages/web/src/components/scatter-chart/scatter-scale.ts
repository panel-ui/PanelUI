/**
 * The arithmetic behind ScatterChart: which rows are points, the two domains they
 * share, and the radius a third quantity gives each one.
 */

export type ScatterChartDatum = Record<string, string | number | null | undefined>;

/** One drawn dot, carrying the row it came from by index. */
export interface ScatterRow {
  index: number;
  series: string;
  x: number;
  y: number;
  r: number;
}

/** What a series asks for, as far as the scale is concerned. */
export interface ScatterSeriesScale {
  key: string;
  size: number;
  sizeKey: string | undefined;
  sizeRange: readonly [number, number];
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * A domain with some air around it. No points gets a usable domain, and identical
 * readings get a width, because a domain of zero width puts every point on one edge.
 */
export function padExtent(min: number, max: number): [number, number] {
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

/**
 * A value's radius. Its place in the extent sets an area between the range's two ends,
 * and the radius is taken from that, so equal steps in value add equal ink. The range's
 * floor keeps small values visible, so two areas are not in the ratio of their values.
 */
export function radiusFor(
  value: unknown,
  extent: readonly [number, number] | null,
  range: readonly [number, number],
  fallback: number
): number {
  if (!extent || !isNumber(value)) return fallback;
  const [min, max] = extent;
  const [smallest, largest] = range;
  const ratio = max === min ? 1 : (value - min) / (max - min);
  return Math.sqrt(smallest * smallest + ratio * (largest * largest - smallest * smallest));
}

/** The lowest and highest of one key, over every row, so a size means the same on all of them. */
function sizeExtent(data: readonly ScatterChartDatum[], key: string | undefined): [number, number] | null {
  if (!key) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    const value = row[key];
    if (!isNumber(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Infinity ? null : [min, max];
}

/**
 * One row per dot, in series order. A row missing either reading is not a point:
 * it is left out rather than drawn at the origin.
 */
export function scatterRows(
  data: readonly ScatterChartDatum[],
  xDataKey: string,
  series: readonly ScatterSeriesScale[]
): ScatterRow[] {
  return series.flatMap(({ key, size, sizeKey, sizeRange }) => {
    const extent = sizeExtent(data, sizeKey);
    return data.flatMap((datum, index) => {
      const x = datum[xDataKey];
      const y = datum[key];
      if (!isNumber(x) || !isNumber(y)) return [];
      return [{ index, series: key, x, y, r: radiusFor(sizeKey ? datum[sizeKey] : undefined, extent, sizeRange, size) }];
    });
  });
}

/** Both domains, from the dots actually drawn. A fixed domain wins over the derived one. */
export function scatterDomains(
  rows: readonly ScatterRow[],
  xDomain?: readonly [number, number],
  yDomain?: readonly [number, number]
): { x: [number, number]; y: [number, number] } {
  let lowX = Infinity;
  let highX = -Infinity;
  let lowY = Infinity;
  let highY = -Infinity;
  for (const { x, y } of rows) {
    if (x < lowX) lowX = x;
    if (x > highX) highX = x;
    if (y < lowY) lowY = y;
    if (y > highY) highY = y;
  }
  return {
    x: xDomain ? [xDomain[0], xDomain[1]] : padExtent(lowX, highX),
    y: yDomain ? [yDomain[0], yDomain[1]] : padExtent(lowY, highY),
  };
}

/**
 * Where the placeholder dots go, as shares of the plot. The two strides are chosen to
 * stay out of step: a pair that moves together lays the dots along a diagonal, which
 * reads as a trend in data nobody has yet. The same count always lands the same way.
 */
export function skeletonField(count: number): ScatterRow[] {
  return Array.from({ length: Math.max(0, count) }, (_unused, index) => ({
    index,
    series: '',
    x: ((index * 0.7549) % 1) * 0.92 + 0.04,
    y: ((index * 0.5698) % 1) * 0.92 + 0.04,
    r: 4.5,
  }));
}
