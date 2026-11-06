/**
 * The numbers behind a line chart's axes, apart from the drawing so they can be
 * checked without one.
 */
import { scaleLinear } from '@tanstack/charts/scales/linear';

type Cell = string | number | null | undefined;

/** A cell's value, or null for anything that cannot be drawn. */
export function readValue(cell: Cell): number | null {
  return typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
}

/**
 * The value axis for these rows, with one domain across every series so two
 * lines stay comparable. A little headroom keeps a peak off the top edge, a flat
 * series lands mid-plot, and the ends round to numbers worth labelling. Unlike a
 * bar, a line is read by its shape, so zero is not forced in.
 */
export function lineDomain(
  data: readonly Record<string, Cell>[],
  keys: readonly string[],
  ticks: number
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    for (const key of keys) {
      const value = readValue(row[key]);
      if (value === null) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (min === Infinity) return [0, 1];
  const pad = min === max ? 1 : (max - min) * 0.1;
  const [low, high] = scaleLinear([min - pad, max + pad], [0, 1]).nice(ticks).domain();
  return [low, high];
}

/** Which rows get an x label: evenly spaced, with both ends kept. */
export function tickIndexes(rows: number, ticks: number): number[] {
  const count = Math.min(Math.max(1, Math.floor(ticks)), rows);
  const step = count > 1 ? (rows - 1) / (count - 1) : 0;
  return Array.from({ length: count }, (_unused, index) => Math.round(index * step));
}
