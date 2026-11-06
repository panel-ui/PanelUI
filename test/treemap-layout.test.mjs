/**
 * The web Treemap Chart's arithmetic: the layout cuts the whole box in proportion
 * and a label is left off rather than clipped.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { fitTileLabel, squarifyLayout } from '../packages/web/src/components/treemap-chart/squarify.ts';

const VALUES = [38, 17, 13, 11, 8, 6, 4, 3];
const area = ({ width, height }) => width * height;

for (const tileAspect of [1, 2.6]) {
  test(`tiles fill the box in proportion, at tileAspect ${tileAspect}`, () => {
    const rects = squarifyLayout(VALUES, 500, 300, undefined, tileAspect);
    const box = 500 * 300;
    rects.forEach((rect, index) => {
      assert.ok(Math.abs(area(rect) - (VALUES[index] / 100) * box) < 1e-6);
      assert.ok(rect.x >= -1e-9 && rect.x + rect.width <= 500 + 1e-9);
      assert.ok(rect.y >= -1e-9 && rect.y + rect.height <= 300 + 1e-9);
    });
  });
}

test('tileAspect widens the tiles', () => {
  const ratio = (rects) => rects.reduce((sum, rect) => sum + rect.width / rect.height, 0) / rects.length;
  assert.ok(ratio(squarifyLayout(VALUES, 500, 300, undefined, 2.6)) > ratio(squarifyLayout(VALUES, 500, 300)));
});

test('nothing to draw gives empty boxes, one per value', () => {
  assert.deepEqual(squarifyLayout([0, -4, Number.NaN], 500, 300).map(area), [0, 0, 0]);
  assert.deepEqual(squarifyLayout([1], 0, 300).map(area), [0]);
  assert.deepEqual(squarifyLayout([], 500, 300), []);
});

test('zeros and negatives take no area between real tiles', () => {
  const rects = squarifyLayout([6, 0, -1, 4], 100, 100);
  assert.equal(area(rects[1]), 0);
  assert.equal(area(rects[2]), 0);
  assert.ok(Math.abs(area(rects[0]) + area(rects[3]) - 10_000) < 1e-6);
});

test('a label loses its value before its name, and never clips the name', () => {
  assert.equal(fitTileLabel({ width: 120, height: 60 }, 'Storage', '$8,200'), 'stacked');
  assert.equal(fitTileLabel({ width: 120, height: 30 }, 'Storage', '$8,200'), 'inline');
  assert.equal(fitTileLabel({ width: 80, height: 30 }, 'Storage', '$8,200'), 'name');
  assert.equal(fitTileLabel({ width: 40, height: 60 }, 'Storage', '$8,200'), 'none');
  assert.equal(fitTileLabel({ width: 120, height: 10 }, 'Storage', '$8,200'), 'none');
  assert.equal(fitTileLabel({ width: 120, height: 60 }, 'Storage', null), 'name');
});
