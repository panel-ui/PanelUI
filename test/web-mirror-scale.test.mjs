import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mirrorPosition,
  mirrorShare,
  outerValue,
  sideExtent,
  tickIndexes,
} from '../packages/web/src/components/mirror-area-chart/mirror-scale.ts';

test('split falls back when it is not a number, and stays where both halves can be read', () => {
  assert.equal(mirrorShare(Number.NaN), 0.55);
  assert.equal(mirrorShare(0), 0.1);
  assert.equal(mirrorShare(1), 0.9);
  assert.equal(mirrorShare(0.7), 0.7);
});

test('a side reaches past its peak, and an empty side still has a scale', () => {
  const rows = [{ a: 100, b: -5 }, { a: 'n/a', b: null }];
  assert.equal(sideExtent(rows, ['a'], undefined), 108);
  assert.equal(sideExtent(rows, ['b'], undefined), 1);
  assert.equal(sideExtent(rows, [], undefined), 1);
});

test('a fixed domain uses its upper end, and only when both ends are finite', () => {
  const rows = [{ a: 100 }];
  assert.equal(sideExtent(rows, ['a'], [0, 400]), 400);
  assert.equal(sideExtent(rows, ['a'], [0, 0]), 1);
  assert.equal(sideExtent(rows, ['a'], [Number.NaN, 400]), 108);
});

test('each half fills its own share of the plot, away from a baseline at zero', () => {
  assert.equal(mirrorPosition(50, 'top', 100, 0.6), 0.3);
  assert.equal(mirrorPosition(100, 'top', 100, 0.6), 0.6);
  assert.equal(mirrorPosition(0, 'top', 100, 0.6), 0);
  assert.equal(mirrorPosition(100, 'bottom', 100, 0.75), -0.25);
  assert.equal(mirrorPosition(-40, 'top', 100, 0.6), 0);
});

test('the outer value ignores gaps', () => {
  assert.equal(outerValue({ a: 3, b: 9, c: null }, ['a', 'b', 'c']), 9);
  assert.equal(outerValue({ a: null }, ['a']), null);
});

test('ticks keep both ends and survive more ticks than rows', () => {
  assert.deepEqual(tickIndexes(7, 4), [0, 2, 4, 6]);
  assert.deepEqual(tickIndexes(2, 4), [0, 1]);
  assert.deepEqual(tickIndexes(0, 4), []);
});
