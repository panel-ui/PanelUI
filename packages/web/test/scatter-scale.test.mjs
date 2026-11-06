import assert from 'node:assert/strict';
import test from 'node:test';
import {
  padExtent,
  radiusFor,
  scatterDomains,
  scatterRows,
  skeletonField,
} from '../src/components/scatter-chart/scatter-scale.ts';

const series = (key, extra = {}) => ({ key, size: 4.5, sizeKey: undefined, sizeRange: [3, 14], ...extra });

test('a domain has air around the data, and a width even when the readings do not', () => {
  assert.deepEqual(padExtent(0, 100), [-8, 108]);
  assert.deepEqual(padExtent(5, 5), [4, 6]);
  assert.deepEqual(padExtent(Infinity, -Infinity), [0, 1]);
});

test('a size is spaced by area between the two ends of the range', () => {
  const area = (value) => radiusFor(value, [100, 200], [3, 14], 1) ** 2;
  assert.ok(Math.abs(area(150) - (3 ** 2 + 14 ** 2) / 2) < 1e-9);
  assert.equal(radiusFor(100, [0, 100], [3, 14], 1), 14);
  assert.equal(radiusFor(0, [0, 100], [3, 14], 1), 3);
});

test('a size without a usable reading falls back, and equal readings all take the largest', () => {
  assert.equal(radiusFor(null, [0, 10], [3, 14], 4.5), 4.5);
  assert.equal(radiusFor(5, null, [3, 14], 4.5), 4.5);
  assert.equal(radiusFor(7, [7, 7], [3, 14], 4.5), 14);
});

test('a row missing a reading is no point at all, and does not stretch the axes', () => {
  const data = [
    { x: 1, a: 10, b: null },
    { x: null, a: 900, b: 900 },
    { x: 3, a: Number.NaN, b: 30 },
    { x: 'label', a: 900, b: 900 },
  ];
  const rows = scatterRows(data, 'x', [series('a'), series('b')]);
  assert.deepEqual(
    rows.map(({ series: key, index }) => `${key}:${index}`),
    ['a:0', 'b:2']
  );
  const { x, y } = scatterDomains(rows);
  assert.ok(x[1] < 4 && y[1] < 40);
});

test('the size scale runs over the whole data set', () => {
  const data = [
    { x: 1, y: 1, size: 0 },
    { x: 2, y: null, size: 100 },
    { x: 3, y: 3, size: 100 },
  ];
  const rows = scatterRows(data, 'x', [series('y', { sizeKey: 'size' })]);
  assert.deepEqual(rows.map(({ r }) => r), [3, 14]);
});

test('a fixed domain wins over the derived one, axis by axis', () => {
  const rows = [{ index: 0, series: 'a', x: 5, y: 500, r: 3 }];
  const { x, y } = scatterDomains(rows, [0, 10]);
  assert.deepEqual(x, [0, 10]);
  assert.deepEqual(y, [499, 501]);
});

test('the placeholder field stays inside the plot and lands the same way every time', () => {
  const field = skeletonField(24);
  assert.equal(field.length, 24);
  assert.deepEqual(field, skeletonField(24));
  for (const { x, y } of field) {
    assert.ok(x >= 0.04 && x <= 0.96 && y >= 0.04 && y <= 0.96);
  }
  assert.ok(new Set(field.map(({ x, y }) => `${x},${y}`)).size === 24);
});

test('the placeholder field shows no trend', () => {
  const field = skeletonField(24);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const xs = field.map(({ x }) => x);
  const ys = field.map(({ y }) => y);
  const [mx, my] = [mean(xs), mean(ys)];
  const across = mean(xs.map((x, index) => (x - mx) * (ys[index] - my)));
  const spread = Math.sqrt(mean(xs.map((x) => (x - mx) ** 2)) * mean(ys.map((y) => (y - my) ** 2)));
  assert.ok(Math.abs(across / spread) < 0.3, `correlation ${across / spread}`);
});

test('an infinite reading is not a point, and does not break the domain', () => {
  const rows = scatterRows([{ x: 1, y: 2 }, { x: Infinity, y: 3 }, { x: 2, y: -Infinity }, { x: 3, y: 4 }], 'x', [
    { key: 'y', size: 4, sizeKey: undefined, sizeRange: [3, 14] },
  ]);
  assert.deepEqual(rows.map(({ index }) => index), [0, 3]);
  assert.ok(scatterDomains(rows).x.every(Number.isFinite));
});
