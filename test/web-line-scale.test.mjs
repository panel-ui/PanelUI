import assert from 'node:assert/strict';
import test from 'node:test';
import { lineDomain, tickIndexes } from '../packages/web/src/components/line-chart/line-scale.ts';

test('the domain spans every series and leaves zero out', () => {
  const [low, high] = lineDomain(
    [
      { a: 200, b: 310 },
      { a: 240, b: 280 },
    ],
    ['a', 'b'],
    4
  );
  assert.ok(low > 0 && low < 200);
  assert.ok(high > 310);
});

test('a peak is never welded to the top edge', () => {
  const [, high] = lineDomain([{ a: 0 }, { a: 100 }], ['a'], 4);
  assert.ok(high > 100);
});

test('a flat series sits inside its domain', () => {
  const [low, high] = lineDomain([{ a: 5 }, { a: 5 }], ['a'], 4);
  assert.ok(low < 5 && high > 5);
});

test('gaps and text are skipped, and nothing to draw has a domain', () => {
  const [low, high] = lineDomain([{ a: null }, { a: 'x' }, { a: Number.NaN }, { a: 10 }, { a: 20 }], ['a'], 4);
  assert.ok(low <= 10 && high >= 20 && high < 100);
  assert.deepEqual(lineDomain([{ a: null }], ['a'], 4), [0, 1]);
  assert.deepEqual(lineDomain([], ['a'], 4), [0, 1]);
});

test('x labels keep both ends and never outnumber the rows', () => {
  assert.deepEqual(tickIndexes(12, 5), [0, 3, 6, 8, 11]);
  assert.deepEqual(tickIndexes(3, 8), [0, 1, 2]);
  assert.deepEqual(tickIndexes(10, 1), [0]);
  assert.deepEqual(tickIndexes(0, 4), []);
});

test('a flat series keeps its value on the axis at any size', () => {
  for (const value of [5_000_000, 0.001, 0]) {
    const [low, high] = lineDomain([{ a: value }], ['a'], 4);
    assert.ok(low < value && value < high);
    assert.ok(high - low <= Math.max(Math.abs(value), 1));
  }
});
