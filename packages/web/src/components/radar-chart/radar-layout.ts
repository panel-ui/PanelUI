/** One row is one axis: its label, and one value per series. */
export type RadarChartDatum = Record<string, string | number | null | undefined>;

/** A number a series can draw, or null for an axis it has no reading on. */
export function radarValue(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/**
 * The scale. From zero unless told otherwise, because rings are read as fractions of
 * the whole and a floor above zero makes a small value look like a large one.
 */
export function radarDomain(
  data: readonly RadarChartDatum[],
  keys: readonly string[],
  domain?: readonly [number, number]
): readonly [number, number] {
  if (domain) return domain;
  let max = -Infinity;
  for (const row of data) {
    for (const key of keys) {
      const value = radarValue(row[key]);
      if (value !== null && value > max) max = value;
    }
  }
  if (max === -Infinity) return [0, 1];
  return [0, max <= 0 ? 1 : max * 1.05];
}

/** A value's distance from the centre as a share of the radius. A value past the domain draws past the outer ring, so a wrong `domain` shows. */
export function radarFraction(value: number, [min, max]: readonly [number, number]): number {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

/** Fractions part way through a change, `progress` running 0 to 1. A vertex with no earlier place grows from the centre. */
export function radarBetween(
  from: readonly (number | null)[] | undefined,
  to: readonly (number | null)[],
  progress: number
): (number | null)[] {
  return to.map((value, index) => {
    if (value === null) return null;
    const start = from?.[index] ?? 0;
    return start + (value - start) * progress;
  });
}

/** A point on the dial, measured from the top-left of the box. Axis `index` of `count` runs clockwise from twelve. */
export function radarPoint(cx: number, cy: number, radius: number, index: number, count: number): { x: number; y: number } {
  const angle = (index / count) * Math.PI * 2;
  return { x: cx + Math.sin(angle) * radius, y: cy - Math.cos(angle) * radius };
}

/** The axis nearest a point measured from the centre, or -1 past `reach` or on a chart too small to have a shape. */
export function radarAxisAt(x: number, y: number, count: number, reach: number): number {
  if (count < 3 || Math.hypot(x, y) > reach) return -1;
  const turn = Math.atan2(x, -y) / (Math.PI * 2);
  return ((Math.round(turn * count) % count) + count) % count;
}

export type RadarLabelAlign = 'start' | 'middle' | 'end';

/**
 * Which way a label runs from its point. Close to the vertical it is centred. Either
 * side of that it runs away from the shape rather than across it, for as far as the
 * box lets it, so a long label ends in an ellipsis rather than being cut off.
 */
export function radarLabelPlacement(x: number, cx: number, radius: number, width: number): { align: RadarLabelAlign; maxWidth: number } {
  const dx = x - cx;
  if (Math.abs(dx) < radius * 0.15) return { align: 'middle', maxWidth: width };
  return dx > 0 ? { align: 'start', maxWidth: Math.max(width - x, 0) } : { align: 'end', maxWidth: Math.max(x, 0) };
}

/** Where a box goes over a point, pushed back inside the plot. */
export function radarBoxInside(point: number, boxSize: number, plot: number): number {
  return Math.max(0, Math.min(plot - boxSize, point - boxSize / 2));
}

/** The axis a navigation key moves the reading to, or undefined for any other key. Runs round, because the axes do. */
export function radarKeyWalk(current: number, count: number, key: string): number | undefined {
  if (count < 3) return undefined;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
