/**
 * The geometry behind HexChart: how big the cells are, how many fit, which series owns
 * each one, and which cell a point lands on.
 */

export type HexShape = 'blob' | 'grid';

export interface HexMetrics {
  radius: number;
  height: number;
  stepX: number;
  stepY: number;
}

/** One cell of the field, placed. `owner` is the index of its series, or -1 when unfilled. */
export interface HexCell {
  column: number;
  row: number;
  x: number;
  y: number;
  owner: number;
  /** Its place in the fill order among the filled cells, for the entrance. Unfilled cells are -1. */
  order: number;
}

export interface HexPlan {
  metrics: HexMetrics;
  columns: number;
  rows: number;
  left: number;
  top: number;
  cells: HexCell[];
  /** Cells each series took, by series. */
  counts: number[];
  /** The top middle of each series' cells, where a label is hung from. */
  anchors: { x: number; y: number }[];
}

/** How far off its ring a cell may be nudged, in field widths. About one cell. */
const BLOB_WOBBLE = 0.09;

export function hexMetrics(radius: number): HexMetrics {
  const width = Math.sqrt(3) * radius;
  return { radius, height: radius * 2, stepX: width, stepY: radius * 1.5 };
}

/** The cell radius that fits `columns` across `width`, leaving room for the offset rows' half cell. */
export function hexRadiusFor(width: number, columns: number): number {
  if (width <= 0 || columns <= 0) return 0;
  return width / (columns + 0.5) / Math.sqrt(3);
}

export function hexRowsFor(height: number, metrics: HexMetrics): number {
  if (height <= 0 || metrics.stepY <= 0) return 0;
  return Math.max(1, Math.floor((height - metrics.height / 4) / metrics.stepY));
}

/** The centre of a cell, with odd rows nested half a cell right. */
export function hexCenter(column: number, row: number, metrics: HexMetrics, left: number, top: number) {
  return {
    x: left + metrics.stepX / 2 + (row % 2 === 1 ? metrics.stepX / 2 : 0) + column * metrics.stepX,
    y: top + metrics.radius + row * metrics.stepY,
  };
}

/** A number in 0…1 from a pair of coordinates, the same one every time, so the same data draws the same edge. */
function hashUnit(a: number, b: number): number {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * How many cells each value gets out of `budget`, by largest remainder: rounding each
 * share on its own does not add up, and a spare cell is a cell of some colour that
 * nothing in the data accounts for.
 */
export function shareCounts(values: readonly number[], budget: number): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0 || budget <= 0) return values.map(() => 0);
  const exact = values.map((value) => (Math.max(0, value) / total) * budget);
  const counts = exact.map(Math.floor);
  const spare = budget - counts.reduce((sum, count) => sum + count, 0);
  exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, spare)
    .forEach(({ index }) => {
      counts[index]! += 1;
    });
  return counts;
}

/**
 * Every cell of the field, in the order the series fill it. `grid` is reading order,
 * which a reader can count off. `blob` grows out from the middle in the field's own
 * proportions, with each cell's distance nudged by a hash of its coordinates, so the
 * boundaries come out ragged and the same every time.
 */
export function hexFillOrder(columns: number, rows: number, shape: HexShape) {
  const cells: { column: number; row: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) cells.push({ column, row });
  }
  if (shape === 'grid' || columns < 2 || rows < 2) return cells;
  const midColumn = (columns - 1) / 2;
  const midRow = (rows - 1) / 2;
  return cells
    .map((cell) => {
      // Odd rows sit half a cell right, and a distance measured without that leans the blob.
      const dx = (cell.column + (cell.row % 2 === 1 ? 0.5 : 0) - midColumn) / columns;
      const dy = (cell.row - midRow) / rows;
      return { cell, key: Math.sqrt(dx * dx + dy * dy) + (hashUnit(cell.column, cell.row) - 0.5) * BLOB_WOBBLE };
    })
    .sort((a, b) => a.key - b.key)
    .map(({ cell }) => cell);
}

/** Lays the field out in a box and hands its cells to the series. */
export function hexPlan(
  values: readonly number[],
  box: { width: number; height: number },
  options: { columns: number; shape: HexShape; density: number; loading: boolean }
): HexPlan {
  const columns = Math.max(1, Math.round(options.columns));
  // A plot shorter than one cell gets smaller cells: the field would otherwise spill out of it.
  const metrics = hexMetrics(Math.min(hexRadiusFor(box.width, columns), box.height / 2));
  const rows = hexRowsFor(box.height, metrics);
  const fieldWidth = metrics.stepX * (columns + 0.5);
  const fieldHeight = rows > 0 ? (rows - 1) * metrics.stepY + metrics.height : 0;
  const left = (box.width - fieldWidth) / 2;
  const top = (box.height - fieldHeight) / 2;
  const capacity = columns * rows;

  // Loading has no split to show yet, so nothing is taken.
  const budget = options.loading
    ? 0
    : options.shape === 'grid'
      ? capacity
      : Math.max(0, Math.min(capacity, Math.round(capacity * options.density)));
  const counts = shareCounts(values, budget);

  // Smallest first for a blob, so the hardest series to find gets the middle. Data order
  // for a grid, because reordering it would break the count.
  const sequence = values.map((_unused, index) => index);
  if (options.shape === 'blob') sequence.sort((a, b) => counts[a]! - counts[b]! || a - b);

  const fill = hexFillOrder(columns, rows, options.shape);
  const claimed = new Map<string, { owner: number; order: number }>();
  let cursor = 0;
  for (const owner of sequence) {
    for (let taken = 0; taken < counts[owner]!; taken += 1) {
      const cell = fill[cursor];
      if (!cell) break;
      claimed.set(`${cell.column}:${cell.row}`, { owner, order: cursor });
      cursor += 1;
    }
  }

  const cells: HexCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const claim = claimed.get(`${column}:${row}`);
      cells.push({ column, row, ...hexCenter(column, row, metrics, left, top), owner: claim?.owner ?? -1, order: claim?.order ?? -1 });
    }
  }

  const anchors = values.map((_unused, index) => {
    const own = cells.filter(({ owner }) => owner === index);
    if (!own.length) return { x: left + fieldWidth / 2, y: top };
    return {
      x: own.reduce((sum, { x }) => sum + x, 0) / own.length,
      y: Math.min(...own.map(({ y }) => y)) - metrics.radius,
    };
  });

  return { metrics, columns, rows, left, top, cells, counts, anchors };
}

/** The cell under a point, or null outside the field. Only three rows can be near any y. */
export function hexAt(x: number, y: number, plan: Pick<HexPlan, 'metrics' | 'left' | 'top' | 'columns' | 'rows'>) {
  const { metrics, left, top, columns, rows } = plan;
  if (metrics.radius <= 0) return null;
  const nearRow = Math.round((y - top - metrics.radius) / metrics.stepY);
  let best: { column: number; row: number } | null = null;
  let bestDistance = Infinity;
  for (let row = nearRow - 1; row <= nearRow + 1; row += 1) {
    if (row < 0 || row >= rows) continue;
    const offset = row % 2 === 1 ? metrics.stepX / 2 : 0;
    const column = Math.round((x - left - metrics.stepX / 2 - offset) / metrics.stepX);
    if (column < 0 || column >= columns) continue;
    const centre = hexCenter(column, row, metrics, left, top);
    const distance = (x - centre.x) ** 2 + (y - centre.y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { column, row };
    }
  }
  return bestDistance <= metrics.radius ** 2 ? best : null;
}
