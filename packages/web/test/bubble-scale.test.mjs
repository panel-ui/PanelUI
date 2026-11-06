import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bubbleDomains,
  bubbleRadius,
  bubbleRows,
  fillOf,
  fitLabel,
  fitLine,
  quadrantCentre,
  roundExtent,
  skeletonField,
  trendSegment,
} from '../src/components/bubble-chart/bubble-scale.ts';

test('an extent widens to round numbers', () => {
  assert.deepEqual(roundExtent(3, 47), [0, 50]);
  assert.deepEqual(roundExtent(12.5, 31.5), [10, 35]);
});

test('an empty or flat extent still has width', () => {
  assert.deepEqual(roundExtent(Infinity, -Infinity), [0, 1]);
  assert.deepEqual(roundExtent(5, 5), [4, 6]);
});

test('area, not radius, is what follows the value', () => {
  const r = (value) => bubbleRadius(value, [0, 100], [0, 20]);
  assert.equal(r(100), 20);
  assert.ok(Math.abs(r(50) ** 2 - r(100) ** 2 / 2) < 1e-9);
  assert.equal(bubbleRadius(7, [7, 7], [10, 28]), 28);
});

test('a row missing a coordinate is not a bubble', () => {
  const rows = bubbleRows(
    [{ x: 1, y: 2 }, { x: null, y: 3 }, { x: 4 }, { x: 5, y: 6 }],
    { x: 'x', y: 'y' },
    [10, 30]
  );
  assert.deepEqual(rows.map(({ index }) => index), [0, 3]);
  assert.equal(rows[0].r, 20);
  assert.equal(rows[0].size, null);
});

test('a row without a size takes the middle when others have one', () => {
  const rows = bubbleRows([{ x: 1, y: 1, s: 0 }, { x: 2, y: 2 }, { x: 3, y: 3, s: 10 }], { x: 'x', y: 'y', size: 's' }, [10, 30]);
  assert.deepEqual(rows.map(({ r }) => Math.round(r)), [10, 20, 30]);
});

test('a colour is a role, a CSS colour, a numbered chart colour or the ramp', () => {
  assert.equal(fillOf('success', 0), 'var(--success)');
  assert.equal(fillOf('#123456', 0), '#123456');
  assert.equal(fillOf(3, 0), 'var(--chart-3)');
  assert.equal(fillOf(undefined, 6), 'var(--chart-2)');
});

test('a fixed domain wins over the data', () => {
  const rows = bubbleRows([{ x: 1, y: 2 }, { x: 9, y: 8 }], { x: 'x', y: 'y' }, [10, 30]);
  const domains = bubbleDomains(rows, [0, 100]);
  assert.deepEqual(domains.x, [0, 100]);
  assert.deepEqual(domains.y, [2, 8]);
});

const at = (points) => points.map(([x, y], index) => ({ index, x, y, r: 1, size: null, label: '', fill: '' }));

test('a straight cloud fits exactly and a vertical one has no line', () => {
  const fit = fitLine(at([[0, 1], [1, 3], [2, 5]]));
  assert.deepEqual([fit.slope, fit.intercept, fit.r], [2, 1, 1]);
  assert.equal(fitLine(at([[1, 1], [1, 5]])), null);
  assert.equal(fitLine(at([[1, 1]])), null);
});

test('the trend stops where it leaves the box', () => {
  const segment = trendSegment({ slope: 2, intercept: 0, r: 1 }, [0, 10], [0, 10]);
  assert.deepEqual(segment, [{ x: 0, y: 0 }, { x: 5, y: 10 }]);
  assert.equal(trendSegment({ slope: 0, intercept: 20, r: 0 }, [0, 10], [0, 10]), null);
  assert.equal(trendSegment({ slope: 1, intercept: 100, r: 1 }, [0, 10], [0, 10]), null);
});

test('the quadrants stand at the mean unless pinned', () => {
  const rows = at([[0, 0], [4, 8]]);
  assert.deepEqual(quadrantCentre(rows), { x: 2, y: 4 });
  assert.deepEqual(quadrantCentre(rows, 1), { x: 1, y: 4 });
  assert.equal(quadrantCentre([]), null);
});

test('a name longer than its circle is cut', () => {
  assert.equal(fitLabel('Ada', 28), 'Ada');
  assert.ok(fitLabel('A very long name', 14).endsWith('…'));
  assert.ok(fitLabel('A very long name', 14).length <= 4);
  assert.equal(fitLabel('Ada', 6), '');
});

test('the placeholder field shows no trend', () => {
  const fit = fitLine(skeletonField(12));
  assert.ok(fit.r < 0.4, `r ${fit.r}`);
});

test('only drawn rows set the sizes, and an infinite reading is not a position', () => {
  const rows = bubbleRows(
    [
      { x: 1, y: 1, s: 10 },
      { x: 2, y: 2, s: 20 },
      { x: null, y: 3, s: 10000 },
      { x: Infinity, y: 3, s: 10000 },
    ],
    { x: 'x', y: 'y', size: 's' },
    [10, 28]
  );
  assert.deepEqual(rows.map(({ index }) => index), [0, 1]);
  assert.equal(rows[0].r, 10);
  assert.equal(rows[1].r, 28);
});
