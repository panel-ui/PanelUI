export type MirrorAreaChartSide = 'top' | 'bottom';

/** A finite number, or null for a gap: a missing or non-numeric value leaves one in the band. */
export function readValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** How much of the plot sits above the baseline, kept to where both halves can still be read. */
export function mirrorShare(split: number): number {
  return Math.min(Math.max(Number.isFinite(split) ? split : 0.55, 0.1), 0.9);
}

/**
 * The value at one half's outer edge: the largest on that side plus 8%, so a peak
 * does not touch the edge of the plot. A fixed domain gives only its upper end,
 * because the baseline is always zero, and counts only when both ends are finite.
 */
export function sideExtent(
  data: readonly Record<string, unknown>[],
  keys: readonly string[],
  explicit: readonly [number, number] | undefined
): number {
  if (explicit && Number.isFinite(explicit[0]) && Number.isFinite(explicit[1])) return Math.max(explicit[1], 0) || 1;
  let max = 0;
  for (const row of data) {
    for (const key of keys) {
      const value = readValue(row[key]);
      if (value !== null && value > max) max = value;
    }
  }
  return max > 0 ? max * 1.08 : 1;
}

/**
 * Both halves on one axis, in shares of the plot. The baseline is zero, the top
 * edge is `share` and the bottom edge is `share - 1`, so a value's height is a
 * fraction of its own half. A negative value is drawn on the baseline, because
 * each half only grows away from it.
 */
export function mirrorPosition(value: number, side: MirrorAreaChartSide, extent: number, share: number): number {
  const reach = Math.max(value, 0) / extent;
  return side === 'top' ? reach * share : -reach * (1 - share);
}

/** The largest value in a row among some keys, or null if it has none. */
export function outerValue(row: Record<string, unknown>, keys: readonly string[]): number | null {
  let most: number | null = null;
  for (const key of keys) {
    const value = readValue(row[key]);
    if (value !== null && (most === null || value > most)) most = value;
  }
  return most;
}

/** Which rows get an x label: `ticks` of them, evenly spaced, with both ends kept. */
export function tickIndexes(rows: number, ticks: number): number[] {
  if (rows < 1) return [];
  const count = Math.max(1, Math.min(Math.floor(ticks), rows));
  const step = count > 1 ? (rows - 1) / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}
