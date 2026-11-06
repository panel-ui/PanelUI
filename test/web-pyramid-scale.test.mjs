import assert from 'node:assert/strict';
import test from 'node:test';

import {
  barThickness,
  gutterUnits,
  niceMax,
  sharedMax,
  wingSpan,
  wingTicks,
} from '../packages/web/src/components/pyramid-chart/pyramid-scale.ts';

test('the scale rounds out to a step a reader can halve', () => {
  assert.equal(niceMax(73), 80);
  assert.equal(niceMax(31_500), 40_000);
  assert.equal(niceMax(0), 1);
});

test('one maximum comes from either series, ignoring what is not a number', () => {
  const rows = [
    { name: 'a', left: 10, right: 73 },
    { name: 'b', left: Number.NaN, right: null },
  ];
  assert.equal(sharedMax(rows, ['left', 'right']), 80);
  assert.equal(sharedMax(rows, ['left']), 10);
  assert.equal(sharedMax(rows, ['left', 'right'], 200), 200);
  assert.equal(sharedMax([], ['left']), 1);
});

test('the gutter comes off the bars, leaving both wings equal in value', () => {
  // 400 wide with an 80 gutter leaves 160 per wing, so 40px is a quarter of a wing.
  assert.equal(gutterUnits(100, 400, 80), 25);
  assert.equal(gutterUnits(100, 400, 0), 0);
  assert.equal(gutterUnits(100, 60, 80), 0);
});

test('wings grow outward from their base on their own side', () => {
  assert.deepEqual(wingSpan(30, 'end', 5), [5, 35]);
  assert.deepEqual(wingSpan(30, 'start', 5), [-5, -35]);
});

test('a negative value spans nothing, and only a positive one takes the floor', () => {
  assert.deepEqual(wingSpan(-10, 'end', 5, 2), [5, 5]);
  assert.deepEqual(wingSpan(0, 'end', 5, 2), [5, 5]);
  assert.deepEqual(wingSpan(1, 'end', 5, 2), [5, 7]);
});

test('a name takes its line before the gap is worked out', () => {
  assert.equal(barThickness(60, 20, 0.25), 30);
  assert.equal(barThickness(60, 20, 0.25, 12), 12);
  assert.equal(barThickness(60, 20, 0.25, 90), 30);
  assert.equal(barThickness(10, 20, 0.25), 0);
});

test('ticks end on the far end of the wing', () => {
  assert.deepEqual(wingTicks(80, 2), [40, 80]);
  assert.deepEqual(wingTicks(80, 0), []);
});
