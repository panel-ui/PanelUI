import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  areaPath,
  bandOf,
  domainBetween,
  labelledRows,
  linePath,
  niceDomain,
  plotCurve,
  plotExtent,
  xOf,
  yOf,
} from '../packages/web/src/components/plot/plot-scale.ts';

const box = { left: 0, top: 0, width: 100, height: 100 };
const rows = [{ a: 10, b: 30 }, { a: 20, b: 40 }];

test('the domain spans every column, with a tenth of the span as headroom', () => {
  assert.deepEqual(plotExtent(rows, ['a', 'b']), [7, 43]);
});

test('bars bring zero in and leave no room under it', () => {
  assert.deepEqual(plotExtent(rows, ['a'], { hasBars: true }), [0, 22]);
  assert.deepEqual(plotExtent([{ a: -10 }], ['a'], { hasBars: true }), [-11, 0]);
});

test('a pinned end stays where it was pinned, and the other is derived', () => {
  assert.deepEqual(plotExtent(rows, ['a'], { yDomain: [0, 'auto'] }), [0, 21]);
  assert.deepEqual(plotExtent(rows, ['a'], { yDomain: [5, 50] }), [5, 50]);
});

test('a non-finite pin is auto, and non-finite values are not measured', () => {
  assert.deepEqual(plotExtent(rows, ['a'], { yDomain: [Number.NaN, 'auto'] }), [9, 21]);
  assert.deepEqual(plotExtent([{ a: 10 }, { a: Infinity }, { a: 20 }], ['a']), [9, 21]);
});

test('nice replaces the headroom and leaves a pinned end alone', () => {
  assert.deepEqual(plotExtent([{ a: 13 }, { a: 87 }], ['a'], { nice: true }), niceDomain(13, 87));
  assert.deepEqual(niceDomain(13, 87), [0, 100]);
  assert.deepEqual(plotExtent([{ a: 13 }, { a: 87 }], ['a'], { nice: true, yDomain: [5, 'auto'] }), [5, 100]);
});

test('a domain always has a span to divide by', () => {
  assert.deepEqual(plotExtent([], ['a']), [0, 1]);
  assert.deepEqual(plotExtent([], ['a'], { yDomain: ['auto', 10] }), [9, 10]);
  assert.deepEqual(plotExtent([{ a: 5 }], ['a']), [3.8, 6.2]);
});

test('a value on the domain between two others sits on a straight line between its two positions', () => {
  const from = [0, 100];
  const to = [-20, 400];
  const [min, max] = domainBetween(from, to, 0.25);
  for (const value of [-20, 0, 37, 100, 400]) {
    const expected = 0.75 * yOf(value, box, ...from) + 0.25 * yOf(value, box, ...to);
    assert.ok(Math.abs(yOf(value, box, min, max) - expected) < 1e-9);
  }
  assert.deepEqual(domainBetween(from, to, 1), to);
});

test('a point scale reaches the edges and a band scale centres in its slice', () => {
  assert.equal(xOf(0, 5, box), 0);
  assert.equal(xOf(4, 5, box), 100);
  assert.equal(bandOf(0, 5, box), 10);
  assert.equal(bandOf(4, 5, box), 90);
});

test('a gap breaks a line and an area into separate runs', () => {
  const values = [1, 2, null, 3, 4];
  assert.equal(linePath(values, box, 0, 4, 'linear').match(/M/g)?.length, 2);
  assert.equal(areaPath(values, box, 0, 4, 'linear').match(/Z/g)?.length, 2);
});

test('a monotone curve does not overshoot its points', () => {
  const points = [[0, 50], [10, 50], [20, 0], [30, 0]];
  const numbers = plotCurve('monotone').line(points).match(/-?\d+(\.\d+)?/g).map(Number);
  const ys = numbers.filter((_value, index) => index % 2 === 1);
  assert.ok(Math.max(...ys) <= 50 && Math.min(...ys) >= 0);
});

test('an area closes back along its floor, right to left', () => {
  const path = plotCurve('linear').area([[0, 10], [10, 20]], [[0, 50], [10, 50]]);
  assert.equal(path, 'M0,10 L10,20 L10,50 L0,50 Z');
});

test('x labels land on whole rows, first and last included', () => {
  assert.deepEqual(labelledRows(12, 5), [0, 3, 6, 8, 11]);
  assert.deepEqual(labelledRows(3, 6), [0, 1, 2]);
  assert.deepEqual(labelledRows(0, 4), []);
});
