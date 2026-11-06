import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildHeatmapCalendar,
  cellAtPoint,
  defaultCellLabel,
  deriveLevels,
  heatmapCells,
  heatmapGrid,
  levelFor,
  monthLabels,
  moveCell,
  normalizeWeekStart,
  weekdayLabel,
} from '../src/components/heatmap-chart/heatmap-calendar.ts';

const day = (month, date) => new Date(2026, month, date);

test('the calendar lines every row up with a weekday from the chosen start', () => {
  // 2026-03-04 is a Wednesday.
  const monday = buildHeatmapCalendar([{ date: day(2, 4), count: 3 }], { start: day(2, 4), end: day(2, 10), weekStartDay: 1 });
  assert.equal(monday.length, 2);
  assert.equal(monday[0].bins.length, 7);
  assert.equal(monday[0].bins[0].date, undefined, 'the Monday before the range has no date');
  assert.equal(monday[0].bins[2].date.getDate(), 4);
  assert.equal(monday[0].bins[2].count, 3);
  assert.equal(monday[1].bins[1].date.getDate(), 10);
  assert.equal(monday[1].bins[2].date, undefined, 'the days after the range have no date');
});

test('the calendar keeps the last day when end carries a time, and sums a repeated day', () => {
  const late = new Date(2026, 2, 7, 18, 30);
  const columns = buildHeatmapCalendar(
    [
      { date: new Date(2026, 2, 7, 9), count: 2 },
      { date: late, count: 5 },
    ],
    { start: day(2, 1), end: new Date(2026, 2, 7, 1) }
  );
  const last = columns.flatMap(({ bins }) => bins).find(({ date }) => date?.getDate() === 7);
  assert.equal(last.count, 7);
});

test('a calendar with a range and no entries is all empty cells, and with neither is nothing', () => {
  const empty = buildHeatmapCalendar([], { start: day(0, 4), end: day(0, 10) });
  assert.equal(empty.length, 1);
  assert.ok(empty[0].bins.every(({ count, date }) => count === 0 && date));
  assert.deepEqual(buildHeatmapCalendar([]), []);
  assert.equal(buildHeatmapCalendar([], { start: day(0, 4) }).length, 1);
});

test('week starts wrap into a week', () => {
  assert.equal(normalizeWeekStart(8), 1);
  assert.equal(normalizeWeekStart(-1), 6);
  assert.equal(normalizeWeekStart(Number.NaN), 0);
});

test('levels come from the non-zero quartiles and stay distinct when counts tie', () => {
  const column = (counts) => [{ bin: 0, bins: counts.map((count, bin) => ({ bin, count })) }];
  assert.deepEqual(deriveLevels(column([0, 0, 10, 20, 30, 40])), [1, 20, 30, 40]);
  assert.deepEqual(deriveLevels(column([5, 5, 5, 5])), [1, 5, 6, 7]);
  assert.deepEqual(deriveLevels([]), [1, 2, 3, 4]);
});

test('fractional counts still reach the ramp', () => {
  const thresholds = deriveLevels([{ bin: 0, bins: [0.2, 0.4, 0.6, 0.8].map((count, bin) => ({ bin, count })) }]);
  assert.equal(levelFor(0, thresholds), 0);
  assert.equal(levelFor(0.2, thresholds), 1);
  assert.equal(levelFor(0.8, thresholds), 4);
});

test('levels step up at each threshold, and nothing is level zero', () => {
  assert.deepEqual(
    [0, -2, 1, 19, 20, 30, 40, 900].map((count) => levelFor(count, [1, 20, 30, 40])),
    [0, 0, 1, 1, 2, 3, 4, 4]
  );
});

test('a missing bin is an empty cell, in the row it would have held', () => {
  const cells = heatmapCells([{ bin: 0, bins: [{ bin: 2, count: 9 }] }], 3, [1, 2, 3, 4]);
  assert.deepEqual(
    cells.map(({ row, count, level }) => [row, count, level]),
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 9, 4],
    ]
  );
});

test('fill divides the width between the columns, and fluid keeps the cell size', () => {
  const fill = heatmapGrid(10, 7, 300, { layout: 'fill', binSize: 12, gap: 3 });
  assert.equal(fill.width, 300);
  assert.equal(fill.size, 27.3);
  const fluid = heatmapGrid(10, 7, 300, { layout: 'fluid', binSize: 12, gap: 3 });
  assert.deepEqual([fluid.size, fluid.width, fluid.height], [12, 147, 102]);
  assert.equal(heatmapGrid(10, 7, null, { layout: 'fill', binSize: 12, gap: 3 }).size, 12, 'not measured yet');
  assert.equal(heatmapGrid(10, 7, 0, { layout: 'fill', binSize: 12, gap: 3 }).width, 0, 'measured, with no room');
  assert.equal(heatmapGrid(0, 7, 300, { layout: 'fill', binSize: 12, gap: 3 }).width, 0);
});

test('a point resolves to its cell, gaps to the cell before them, outside to nothing', () => {
  const grid = heatmapGrid(4, 7, 0, { layout: 'fluid', binSize: 10, gap: 2 });
  assert.deepEqual(cellAtPoint(0, 0, grid), { column: 0, row: 0 });
  assert.deepEqual(cellAtPoint(11, 25, grid), { column: 0, row: 2 });
  assert.deepEqual(cellAtPoint(12, 0, grid), { column: 1, row: 0 });
  assert.equal(cellAtPoint(48, 0, grid), null);
  assert.equal(cellAtPoint(-1, 0, grid), null);
});

test('keys walk the grid and stop at its edges', () => {
  const grid = { columns: 3, rows: 2 };
  assert.deepEqual(moveCell({ column: 2, row: 0 }, 'ArrowRight', grid), { column: 2, row: 0 });
  assert.deepEqual(moveCell({ column: 0, row: 0 }, 'ArrowLeft', grid), { column: 0, row: 0 });
  assert.deepEqual(moveCell({ column: 1, row: 0 }, 'ArrowDown', grid), { column: 1, row: 1 });
  assert.deepEqual(moveCell({ column: 1, row: 1 }, 'End', grid), { column: 2, row: 1 });
  assert.deepEqual(moveCell({ column: 1, row: 1 }, 'Home', grid), { column: 0, row: 1 });
  assert.equal(moveCell({ column: 1, row: 1 }, 'Enter', grid), null);
});

test('month labels land where the month changes, without the stub first month', () => {
  const weeks = buildHeatmapCalendar([], { start: day(0, 28), end: day(2, 10) });
  assert.deepEqual(monthLabels(weeks), [
    { column: 1, label: 'Feb' },
    { column: 5, label: 'Mar' },
  ]);
  assert.deepEqual(
    monthLabels(weeks, (date) => (date.getMonth() === 1 ? '' : `m${date.getMonth()}`)).map(({ label }) => label),
    ['m0', 'm2']
  );
});

test('weekday labels follow the start of the week', () => {
  assert.equal(weekdayLabel(0, 0, 'full'), 'Sun');
  assert.equal(weekdayLabel(0, 1, 'initial'), 'M');
  assert.equal(weekdayLabel(6, 1, 'full'), 'Sun');
});

test('the default label says the count, and the date when there is one', () => {
  assert.equal(defaultCellLabel({ column: 0, row: 0, level: 1, count: 1, date: day(2, 4) }), '1 contribution on Mar 4');
  assert.equal(defaultCellLabel({ column: 0, row: 0, level: 2, count: 7, date: day(2, 4) }), '7 contributions on Mar 4');
  assert.equal(defaultCellLabel({ column: 0, row: 0, level: 0, count: 0 }), '0');
});

test('a clock change that skips midnight does not cost the calendar its last day', () => {
  const zone = process.env.TZ;
  process.env.TZ = 'America/Santiago';
  try {
    const weeks = buildHeatmapCalendar([], { start: new Date(2026, 8, 5), end: new Date(2026, 8, 8) });
    const dated = weeks.flatMap(({ bins }) => bins).flatMap(({ date }) => (date ? [date.getDate()] : []));
    assert.deepEqual(dated, [5, 6, 7, 8]);
  } finally {
    process.env.TZ = zone;
  }
});

test('fill stays inside a space too narrow for the gaps', () => {
  const narrow = heatmapGrid(53, 7, 160, { layout: 'fill', binSize: 12, gap: 3 });
  assert.ok(Math.abs(narrow.width - 160) < 1e-9, `width ${narrow.width}`);
  assert.ok(Math.abs(narrow.size - 1) < 1e-9, `size ${narrow.size}`);
  const tiny = heatmapGrid(53, 7, 40, { layout: 'fill', binSize: 12, gap: 3 });
  assert.equal(tiny.gap, 0);
  assert.ok(Math.abs(tiny.width - 40) < 1e-9, `width ${tiny.width}`);
  assert.equal(heatmapGrid(1, 7, 40, { layout: 'fill', binSize: 12, gap: 3 }).width, 40);
});

test('a long list of entries on few days builds without running out of stack', () => {
  const entries = Array.from({ length: 300_000 }, (_unused, index) => ({ date: new Date(2026, 0, 1 + (index % 7)), count: 1 }));
  const days = buildHeatmapCalendar(entries).flatMap(({ bins }) => bins).filter(({ date }) => date);
  assert.equal(days.length, 7);
  assert.equal(days.reduce((sum, { count }) => sum + count, 0), 300_000);
});
