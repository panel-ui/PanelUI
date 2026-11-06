/**
 * The arithmetic behind HeatmapChart: bucketing dated counts into weeks, the ramp's
 * thresholds, the grid's geometry, and walking it from the keyboard.
 */

const DAYS_IN_WEEK = 7;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** One bin inside a column, usually a single day. */
export interface HeatmapBin {
  /** Row index within the column, from `0`. */
  bin: number;
  /** How much happened. The ramp is derived from these across the whole chart. */
  count: number;
  /** The day this bin stands for. Used by the axis labels and the tooltip. */
  date?: Date;
}

/** One column, usually a week. Missing bins are drawn as empty cells. */
export interface HeatmapColumn {
  /** Column index across the chart. */
  bin: number;
  bins: HeatmapBin[];
}

/** A cell resolved to its place in the grid, as the tooltip and the labels receive it. */
export interface HeatmapCell {
  column: number;
  row: number;
  count: number;
  /** Which step of the ramp it is drawn in, `0` for empty to `4` for the busiest. */
  level: number;
  date?: Date;
}

/** The measured grid, in pixels. */
export interface HeatmapGrid {
  size: number;
  gap: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

/** Any whole number of days, wrapped into `0` to `6`. Anything else is Sunday. */
export function normalizeWeekStart(day: number): number {
  if (!Number.isFinite(day)) return 0;
  return ((Math.trunc(day) % DAYS_IN_WEEK) + DAYS_IN_WEEK) % DAYS_IN_WEEK;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/**
 * Builds a calendar of columns from a flat list of dated counts. Days with no entry are
 * still cells, and the days before `start` and after `end` that complete a week are cells
 * with no date, so every row lines up with one weekday for the whole chart.
 */
export function buildHeatmapCalendar(
  entries: readonly { date: Date; count: number }[],
  options: { start?: Date; end?: Date; weekStartDay?: number } = {}
): HeatmapColumn[] {
  const weekStartDay = normalizeWeekStart(options.weekStartDay ?? 0);
  if (!entries.length && !options.start) return [];

  // One pass rather than a spread, which throws on a long enough list of entries.
  let first = Infinity;
  let last = -Infinity;
  for (const { date } of entries) {
    const time = date.getTime();
    if (time < first) first = time;
    if (time > last) last = time;
  }
  // Both bounds at local midnight: a raw `end` would drop its own day whenever it
  // carries a time earlier than the cell being tested.
  const start = startOfDay(options.start ?? new Date(first));
  const end = startOfDay(options.end ?? (entries.length ? new Date(last) : start));

  const byDay = new Map<string, number>();
  for (const { date, count } of entries) {
    const key = dayKey(date);
    byDay.set(key, (byDay.get(key) ?? 0) + count);
  }

  // Each day is built from the calendar rather than by stepping the last one: where a
  // clock change skips midnight, a stepped date would keep the shifted hour from then on
  // and fall past `end` a day early.
  const lead = (start.getDay() - weekStartDay + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const dayAt = (offset: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset - lead);

  const columns: HeatmapColumn[] = [];
  let column: HeatmapBin[] = [];
  for (let offset = 0; dayAt(offset) <= end || column.length; offset += 1) {
    const date = dayAt(offset);
    const row = (date.getDay() - weekStartDay + DAYS_IN_WEEK) % DAYS_IN_WEEK;
    const inRange = date >= start && date <= end;
    column.push({ bin: row, count: inRange ? (byDay.get(dayKey(date)) ?? 0) : 0, date: inRange ? date : undefined });
    if (row === DAYS_IN_WEEK - 1) {
      columns.push({ bin: columns.length, bins: column });
      column = [];
    }
  }
  return columns;
}

/**
 * Four thresholds from the data's own quartiles, so single digits and thousands both use
 * the whole ramp. Only non-zero counts are measured: zero is its own level, and counting
 * it would drag every threshold down on a sparse chart.
 */
export function deriveLevels(data: readonly HeatmapColumn[]): number[] {
  const counts = data.flatMap(({ bins }) => bins.flatMap(({ count }) => (count > 0 ? [count] : []))).sort((a, b) => a - b);
  if (!counts.length) return [1, 2, 3, 4];
  const at = (share: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * share))] ?? 0;
  const thresholds = [Math.min(1, counts[0] ?? 1), at(0.25), at(0.5), at(0.75)];
  // Ties would collapse the ramp, so each is nudged past the one below it.
  for (let index = 1; index < thresholds.length; index += 1) {
    const below = thresholds[index - 1] ?? 0;
    if ((thresholds[index] ?? 0) <= below) thresholds[index] = below + 1;
  }
  return thresholds;
}

/** The step of the ramp a count is drawn in. */
export function levelFor(count: number, thresholds: readonly number[]): number {
  if (count <= 0) return 0;
  let level = 1;
  thresholds.forEach((threshold, index) => {
    if (index > 0 && count >= threshold) level = index + 1;
  });
  return Math.min(level, 4);
}

/** Every cell the grid draws, in column order. A missing bin is an empty cell, never a hole. */
export function heatmapCells(data: readonly HeatmapColumn[], rows: number, thresholds: readonly number[]): HeatmapCell[] {
  return data.flatMap(({ bins }, column) =>
    Array.from({ length: rows }, (_unused, row) => {
      const bin = bins.find((candidate) => candidate.bin === row);
      const count = bin?.count ?? 0;
      return { column, row, count, level: levelFor(count, thresholds), date: bin?.date };
    })
  );
}

/**
 * The grid's geometry. `fill` divides the available width between the columns, and until
 * that width is known (`null`), or under `fluid`, a cell is `binSize`. In a space too narrow for
 * the gaps, the gaps give way first, so `fill` never overflows what it was given.
 */
export function heatmapGrid(
  columns: number,
  rows: number,
  available: number | null,
  { layout, binSize, gap: wantedGap }: { layout: 'fluid' | 'fill'; binSize: number; gap: number }
): HeatmapGrid {
  if (!columns) return { size: 0, gap: wantedGap, columns: 0, rows, width: 0, height: 0 };
  if (layout === 'fluid' || available === null) {
    const width = columns * binSize + (columns - 1) * wantedGap;
    return { size: binSize, gap: wantedGap, columns, rows, width, height: rows * binSize + (rows - 1) * wantedGap };
  }
  const room = Math.max(0, available);
  const gap = columns > 1 ? Math.min(wantedGap, Math.max(0, (room - columns) / (columns - 1))) : wantedGap;
  const size = (room - (columns - 1) * gap) / columns;
  return { size, gap, columns, rows, width: columns * size + (columns - 1) * gap, height: rows * size + (rows - 1) * gap };
}

/** The cell at a point in the grid. A gap belongs to the cell before it, so the reading never drops out between two. */
export function cellAtPoint(x: number, y: number, { size, gap, columns, rows }: HeatmapGrid): { column: number; row: number } | null {
  const step = size + gap;
  if (step <= 0) return null;
  const column = Math.floor(x / step);
  const row = Math.floor(y / step);
  return column >= 0 && column < columns && row >= 0 && row < rows ? { column, row } : null;
}

/** Where an arrow, Home or End key lands from a cell. It stops at the edges rather than wrapping, as a grid does. */
export function moveCell(
  { column, row }: { column: number; row: number },
  key: string,
  { columns, rows }: Pick<HeatmapGrid, 'columns' | 'rows'>
): { column: number; row: number } | null {
  switch (key) {
    case 'ArrowRight':
      return { column: Math.min(columns - 1, column + 1), row };
    case 'ArrowLeft':
      return { column: Math.max(0, column - 1), row };
    case 'ArrowDown':
      return { column, row: Math.min(rows - 1, row + 1) };
    case 'ArrowUp':
      return { column, row: Math.max(0, row - 1) };
    case 'Home':
      return { column: 0, row };
    case 'End':
      return { column: columns - 1, row };
    default:
      return null;
  }
}

/**
 * The month labels: one where the month changes, because months are not the same length.
 * The first month is usually a stub of a week or two, and is dropped when its label would
 * run into the next.
 */
export function monthLabels(
  data: readonly HeatmapColumn[],
  formatLabel?: (date: Date, column: number) => string
): { column: number; label: string }[] {
  const labels: { column: number; label: string }[] = [];
  let lastMonth = -1;
  data.forEach(({ bins }, column) => {
    const date = bins.find((bin) => bin.date)?.date;
    if (!date || date.getMonth() === lastMonth) return;
    lastMonth = date.getMonth();
    const label = formatLabel ? formatLabel(date, column) : (MONTHS[lastMonth] ?? '');
    if (label) labels.push({ column, label });
  });
  const [first, second] = labels;
  if (first && second && second.column - first.column < 3) labels.shift();
  return labels;
}

/** A row's weekday from where the week starts, as its initial or its short name. */
export function weekdayLabel(row: number, weekStartDay: number, format: 'initial' | 'full'): string {
  const name = WEEKDAYS[(row + weekStartDay) % DAYS_IN_WEEK] ?? '';
  return format === 'initial' ? name.slice(0, 1) : name.slice(0, 3);
}

/** A cell in words. A cell with no date has a count and nothing else to say about it. */
export function defaultCellLabel({ count, date }: HeatmapCell): string {
  if (!date) return `${count}`;
  return `${count} ${count === 1 ? 'contribution' : 'contributions'} on ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
