/** A tile's box inside the chart, in pixels. */
export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The aspect ratio the row test aims each tile at. The golden ratio rather than
 * 1, because aiming at a perfect square closes rows early and leaves one badly
 * shaped row at the end. Aiming slightly wide spreads that cost over all of them.
 */
const TARGET_RATIO = (1 + Math.sqrt(5)) / 2;

function diceRow(
  values: readonly number[],
  from: number,
  to: number,
  sum: number,
  out: TreemapRect[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const scale = sum ? (x1 - x0) / sum : 0;
  let x = x0;
  for (let i = from; i < to; i += 1) {
    const width = values[i]! * scale;
    out[i] = { x, y: y0, width, height: y1 - y0 };
    x += width;
  }
}

function sliceRow(
  values: readonly number[],
  from: number,
  to: number,
  sum: number,
  out: TreemapRect[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const scale = sum ? (y1 - y0) / sum : 0;
  let y = y0;
  for (let i = from; i < to; i += 1) {
    const height = values[i]! * scale;
    out[i] = { x: x0, y, width: x1 - x0, height };
    y += height;
  }
}

function squarify(values: readonly number[], width: number, height: number, ratio: number): TreemapRect[] {
  const count = values.length;
  const out: TreemapRect[] = new Array(count);
  let remaining = 0;
  for (let i = 0; i < count; i += 1) remaining += values[i]!;

  let x0 = 0;
  let y0 = 0;
  let start = 0;
  let end = 0;

  while (start < count) {
    const dx = width - x0;
    const dy = height - y0;
    if (dx <= 0 || dy <= 0) break;

    // A run of zeros takes no area, and dividing by one would break the row test.
    let sum = 0;
    do {
      sum = values[end]!;
      end += 1;
    } while (!sum && end < count);

    let smallest = sum;
    let largest = sum;

    // Folds what does not change inside the row into one factor, so the test is
    // a couple of multiplications per tile.
    const alpha = Math.max(dy / dx, dx / dy) / (remaining * ratio);
    let beta = sum * sum * alpha;
    let worst = Math.max(largest / beta, beta / smallest);

    for (; end < count; end += 1) {
      const value = values[end]!;
      sum += value;
      if (value < smallest) smallest = value;
      if (value > largest) largest = value;
      beta = sum * sum * alpha;
      const next = Math.max(largest / beta, beta / smallest);
      // The first tile that makes the row worse is put back for the next one.
      if (next > worst) {
        sum -= value;
        break;
      }
      worst = next;
    }

    // Along the shorter side: dividing the long one gives thin tiles.
    if (dx < dy) {
      const edge = remaining ? y0 + (dy * sum) / remaining : height;
      diceRow(values, start, end, sum, out, x0, y0, width, edge);
      y0 = edge;
    } else {
      const edge = remaining ? x0 + (dx * sum) / remaining : width;
      sliceRow(values, start, end, sum, out, x0, y0, edge, height);
      x0 = edge;
    }

    remaining -= sum;
    start = end;
  }

  // A box that ran out of room before the tiles did leaves holes in the array.
  for (let i = 0; i < count; i += 1) {
    if (!out[i]) out[i] = { x: x0, y: y0, width: 0, height: 0 };
  }
  return out;
}

/**
 * Squarified treemap layout: values in, rectangles out, in the same order.
 *
 * `tileAspect` stretches the result sideways. The row test runs in a narrower box
 * and the tiles are widened afterwards, so `2` aims at tiles twice as wide as
 * they would have been, which leaves room for a name across a short chart.
 *
 * @param values Tile sizes. Negative and non-finite values count as zero. Should be descending.
 * @param ratio The aspect ratio the row test aims at.
 * @param tileAspect How much wider than the row test's shape each tile is drawn.
 */
export function squarifyLayout(
  values: readonly number[],
  width: number,
  height: number,
  ratio: number = TARGET_RATIO,
  tileAspect: number = 1
): TreemapRect[] {
  const clean = values.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  if (!clean.some((value) => value > 0) || width <= 0 || height <= 0) {
    return clean.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  }
  const stretch = tileAspect > 0 ? tileAspect : 1;
  return squarify(clean, width / stretch, height, ratio).map((rect) => ({
    ...rect,
    x: rect.x * stretch,
    width: rect.width * stretch,
  }));
}

/** How a tile's text fits: two lines, one line, its name alone, or not at all. */
export type TileLabelFit = 'stacked' | 'inline' | 'name' | 'none';

export const LABEL_PADDING_X = 8;
export const LABEL_PADDING_Y = 6;
export const LABEL_LINE = 16;

const NAME_SIZE = 12;
const VALUE_SIZE = 12;
const CHAR_WIDTH = 0.56;
const INLINE_GAP = 6;

// shortcut: an average character width rather than measuring, so an unusually wide name can still ellipsize; measure if that shows up.
const textWidth = (text: string, size: number) => text.length * size * CHAR_WIDTH;

/**
 * Which text a tile has room for. The value goes before the name does, and a
 * name that would not fit is left off, because a name cut to its first letters
 * reads as a different word. Those tiles are read through the tooltip.
 */
export function fitTileLabel(rect: Pick<TreemapRect, 'width' | 'height'>, name: string, value: string | null): TileLabelFit {
  const innerWidth = rect.width - LABEL_PADDING_X * 2;
  const innerHeight = rect.height - LABEL_PADDING_Y * 2;
  const nameWidth = textWidth(name, NAME_SIZE);
  if (innerHeight < LABEL_LINE || nameWidth > innerWidth) return 'none';
  if (value === null) return 'name';
  const valueWidth = textWidth(value, VALUE_SIZE);
  if (innerHeight >= LABEL_LINE * 2 && valueWidth <= innerWidth) return 'stacked';
  return nameWidth + INLINE_GAP + valueWidth <= innerWidth ? 'inline' : 'name';
}
