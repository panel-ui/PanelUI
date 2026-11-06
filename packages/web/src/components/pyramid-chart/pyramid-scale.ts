/**
 * The arithmetic of two wings on one scale, kept apart from the drawing so the
 * parts that are easy to get subtly wrong can be tested without a browser.
 *
 * Positions are in value units with the centre at zero, so a start wing runs
 * negative and an end wing positive. Pixels only come in where something is
 * fixed in pixels: the gutter between the wings and the floor under a small bar.
 */

export type PyramidSide = 'start' | 'end';

/** Four steps, not two, so the halfway label the axis draws is round as well. */
const DOMAIN_STEPS = 4;

/**
 * The far end of a scale that starts at zero, rounded out to a step of 1, 2 or 5
 * times a power of ten. A fraction of headroom would end the axis on 80.3.
 */
export function niceMax(max: number, steps = DOMAIN_STEPS): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const rough = max / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const error = rough / magnitude;
  // Geometric means, so each step wins over the span it is closest to.
  const multiple = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
  const step = multiple * magnitude;
  return Math.ceil(max / step) * step;
}

/**
 * The one maximum both wings are measured on, from every value in every series.
 * A maximum per side would give two halves that cannot be compared.
 */
export function sharedMax(
  rows: readonly Readonly<Record<string, unknown>>[],
  keys: readonly string[],
  maxValue?: number
): number {
  if (maxValue !== undefined && maxValue > 0) return maxValue;
  let largest = 0;
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'number' && !Number.isNaN(value) && value > largest) largest = value;
    }
  }
  return niceMax(largest);
}

/** Half the gutter in value units, so a wing's base sits at that distance from zero. */
export function gutterUnits(max: number, plotWidth: number, gutter: number): number {
  const wing = (plotWidth - gutter) / 2;
  return wing > 0 ? (max * (gutter / 2)) / wing : 0;
}

/**
 * A bar's two ends. A value is a distance outward, so a negative one has no
 * direction left to grow in and spans nothing. `floor` is the smallest length a
 * positive value is drawn at, in value units.
 */
export function wingSpan(value: number, side: PyramidSide, base: number, floor = 0): [number, number] {
  const length = value > 0 ? Math.max(value, floor) : 0;
  const sign = side === 'start' ? -1 : 1;
  return [sign * base, sign * (base + length)];
}

/** The thickness of a bar, from what is left of a band once its name has taken a line. */
export function barThickness(band: number, labelInset: number, barGap: number, barWidth?: number): number {
  const room = Math.max(band - labelInset, 0) * (1 - barGap);
  return barWidth === undefined ? room : Math.min(barWidth, room);
}

/** The value at each mark along one wing, nearest the centre first, leaving zero out. */
export function wingTicks(max: number, count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_unused, index) => (max * (index + 1)) / count);
}
