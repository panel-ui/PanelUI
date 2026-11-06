/** A slice's place on the dial, in turns clockwise from twelve o'clock. */
export interface PieSliceAngles {
  from: number;
  to: number;
  /** Halfway along it, which is the direction it lifts out in. */
  mid: number;
  /** Its share of the total, 0 to 1. */
  fraction: number;
}

export interface PieLayoutOptions {
  /** Where the first slice begins, in degrees clockwise from twelve o'clock. */
  startAngle: number;
  /** Where the last one ends, on the same clock. */
  endAngle: number;
  /** Gap between one slice and the next, in degrees. */
  padAngle: number;
  /** The smallest angle any non-zero slice is drawn at, in degrees. */
  minAngle: number;
}

/** Everything the values add up to. Negative values count as zero. */
export function pieTotal(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + Math.max(0, value), 0);
}

/**
 * Shares the dial out between the values, one entry per value, in order.
 *
 * The gaps and the floors come out of the turn first and what is left is shared
 * by value. Adding them on instead would push the last slice past the end of the
 * dial, which on a closed pie means over the first one. A span past one turn is
 * clamped for the same reason.
 */
export function pieSlices(
  values: readonly number[],
  { startAngle, endAngle, padAngle, minAngle }: PieLayoutOptions
): PieSliceAngles[] {
  const span = Math.min(Math.max(endAngle - startAngle, 0), 360) / 360;
  const total = pieTotal(values);
  const count = values.length;
  if (!count || total <= 0 || span <= 0) return [];

  const pad = Math.min(padAngle / 360, span / (count * 2));
  const gaps = count > 1 || span < 1 ? pad * count : 0;
  const floor = Math.min(minAngle / 360, (span - gaps) / (count * 2));
  const drawn = values.filter((value) => value > 0).length;
  const free = Math.max(span - gaps - floor * drawn, 0);

  let cursor = startAngle / 360 + pad / 2;
  return values.map((raw) => {
    const value = Math.max(0, raw);
    const fraction = value / total;
    const sweep = value > 0 ? floor + free * fraction : 0;
    const slice = { from: cursor, to: cursor + sweep, mid: cursor + sweep / 2, fraction };
    cursor += sweep + pad;
    return slice;
  });
}

/**
 * Which slice a point falls in, or `-1`. `x` and `y` are measured from the centre
 * of the dial, with `y` running down the screen.
 */
export function pieSliceAt(
  slices: readonly PieSliceAngles[],
  x: number,
  y: number,
  inner: number,
  outer: number
): number {
  const distance = Math.hypot(x, y);
  if (distance < inner || distance > outer) return -1;
  const turn = Math.atan2(x, -y) / (Math.PI * 2);
  return slices.findIndex(({ from, to }) => {
    const past = ((turn - from) % 1 + 1) % 1;
    return to > from && past < to - from;
  });
}

/**
 * The dial part way through a data change, `progress` running 0 to 1. A slice
 * with no earlier place grows from its own start, and the result always has the
 * shape of `to`.
 */
export function pieSlicesBetween(
  from: readonly PieSliceAngles[],
  to: readonly PieSliceAngles[],
  progress: number
): PieSliceAngles[] {
  const mix = (a: number, b: number) => a + (b - a) * progress;
  return to.map((slice, index) => {
    const start = from[index] ?? { ...slice, to: slice.from, fraction: 0 };
    const angles = { from: mix(start.from, slice.from), to: mix(start.to, slice.to) };
    return { ...angles, mid: (angles.from + angles.to) / 2, fraction: mix(start.fraction, slice.fraction) };
  });
}

/** The slice a navigation key moves the reading to, or undefined for any other key. Stops at the ends. */
export function pieKeyWalk(current: number, count: number, key: string): number | undefined {
  const last = count - 1;
  if (last < 0) return undefined;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(current + 1, last);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return undefined;
  }
}
