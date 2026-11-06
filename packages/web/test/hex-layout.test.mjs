import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hexAt, hexCenter, hexFillOrder, hexMetrics, hexPlan, shareCounts } from '../src/components/hex-chart/hex-layout.ts';

const BOX = { width: 420, height: 260 };
const options = { columns: 21, shape: 'blob', density: 0.55, loading: false };

test('shares spend the budget exactly, by largest remainder', () => {
  assert.deepEqual(shareCounts([1, 1, 1], 100), [34, 33, 33]);
  assert.deepEqual(shareCounts([70, 25, 5], 10), [7, 3, 0]);
  assert.deepEqual(shareCounts([0, 0], 10), [0, 0]);
  assert.deepEqual(shareCounts([-5, 5], 4), [0, 4]);
});

test('a blob takes the density of the field, and every series its count', () => {
  const plan = hexPlan([60, 30, 10], BOX, options);
  const capacity = plan.columns * plan.rows;
  assert.equal(plan.cells.length, capacity);
  const filled = plan.cells.filter(({ owner }) => owner >= 0);
  assert.equal(filled.length, Math.round(capacity * 0.55));
  plan.counts.forEach((count, index) => {
    assert.equal(plan.cells.filter(({ owner }) => owner === index).length, count);
  });
});

test('the smallest series of a blob sits in the middle', () => {
  const plan = hexPlan([60, 30, 10], BOX, options);
  const distance = (owner) => {
    const own = plan.cells.filter((cell) => cell.owner === owner);
    return own.reduce((sum, { x, y }) => sum + Math.hypot(x - BOX.width / 2, y - BOX.height / 2), 0) / own.length;
  };
  assert.ok(distance(2) < distance(1));
  assert.ok(distance(1) < distance(0));
});

test('a grid fills the whole field in reading order, in data order', () => {
  const plan = hexPlan([1, 1], BOX, { ...options, shape: 'grid' });
  assert.ok(plan.cells.every(({ owner }) => owner >= 0));
  assert.equal(plan.cells[0].owner, 0);
  assert.equal(plan.cells.at(-1).owner, 1);
});

test('loading divides nothing', () => {
  const plan = hexPlan([60, 40], BOX, { ...options, loading: true });
  assert.ok(plan.cells.length > 0);
  assert.ok(plan.cells.every(({ owner }) => owner === -1));
});

test('the same data lays out the same way', () => {
  assert.deepEqual(hexFillOrder(9, 7, 'blob'), hexFillOrder(9, 7, 'blob'));
});

test('a label hangs from the top of its series', () => {
  const plan = hexPlan([60, 40], BOX, options);
  const own = plan.cells.filter(({ owner }) => owner === 1);
  assert.equal(plan.anchors[1].y, Math.min(...own.map(({ y }) => y)) - plan.metrics.radius);
});

test('a point finds its cell, and a point outside finds none', () => {
  const plan = hexPlan([1], BOX, options);
  const centre = hexCenter(4, 3, plan.metrics, plan.left, plan.top);
  assert.deepEqual(hexAt(centre.x, centre.y, plan), { column: 4, row: 3 });
  assert.equal(hexAt(-50, -50, plan), null);
  assert.equal(hexAt(0, 0, { ...plan, metrics: hexMetrics(0) }), null);
});

test('a plot shorter than one cell keeps the field inside it', () => {
  const plan = hexPlan([1, 1], { width: 400, height: 20 }, { columns: 14, shape: 'grid', density: 1, loading: false });
  assert.equal(plan.rows, 1);
  assert.ok(plan.top >= 0, `top ${plan.top}`);
  assert.ok(plan.metrics.height <= 20, `cell ${plan.metrics.height}`);
});
