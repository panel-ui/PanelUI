// Radar Chart's scale, label placement and reading. The drawing itself is checked in a browser.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  radarAxisAt,
  radarBetween,
  radarBoxInside,
  radarDomain,
  radarFraction,
  radarKeyWalk,
  radarLabelPlacement,
  radarPoint,
  radarValue,
} from '../packages/web/src/components/radar-chart/radar-layout.ts';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('only a real number is a reading', () => {
  assert.equal(radarValue(4), 4);
  assert.equal(radarValue(0), 0);
  assert.equal(radarValue(Number.NaN), null);
  assert.equal(radarValue('4'), null);
  assert.equal(radarValue(null), null);
});

test('the scale starts at zero, leaves headroom, and only reads the series drawn', () => {
  const data = [{ a: 10, b: 900 }, { a: 20, b: null }];
  assert.deepEqual(radarDomain(data, ['a']), [0, 21]);
  assert.deepEqual(radarDomain(data, []), [0, 1]);
  assert.deepEqual(radarDomain([{ a: 0 }], ['a']), [0, 1]);
  assert.deepEqual(radarDomain([{ a: -4 }], ['a']), [0, 1]);
  assert.deepEqual(radarDomain(data, ['a'], [5, 50]), [5, 50]);
});

test('a value is held inside the rings', () => {
  assert.equal(radarFraction(50, [0, 100]), 0.5);
  assert.equal(radarFraction(200, [0, 100]), 1);
  assert.equal(radarFraction(-5, [0, 100]), 0);
  assert.equal(radarFraction(5, [5, 5]), 0);
});

test('vertices move in a line, grow from the centre, and a gap stays a gap', () => {
  assert.deepEqual(radarBetween([0, 1], [1, 0], 0.5), [0.5, 0.5]);
  assert.deepEqual(radarBetween(undefined, [1], 0.25), [0.25]);
  assert.deepEqual(radarBetween([null], [1], 0.5), [0.5]);
  assert.deepEqual(radarBetween([0.5], [null], 0.5), [null]);
});

test('axes go clockwise from twelve', () => {
  const right = radarPoint(100, 100, 50, 1, 4);
  close(right.x, 150);
  close(right.y, 100);
});

test('the hit test takes the nearest axis, across twelve o\'clock too', () => {
  assert.equal(radarAxisAt(1, -40, 4, 50), 0);
  assert.equal(radarAxisAt(-1, -40, 4, 50), 0);
  assert.equal(radarAxisAt(40, 1, 4, 50), 1);
  assert.equal(radarAxisAt(-40, 1, 4, 50), 3);
  assert.equal(radarAxisAt(60, 0, 4, 50), -1);
  assert.equal(radarAxisAt(1, -40, 2, 50), -1);
});

test('labels are centred near the vertical and otherwise run away from the shape', () => {
  assert.deepEqual(radarLabelPlacement(101, 100, 50, 200), { align: 'middle', maxWidth: 200 });
  assert.deepEqual(radarLabelPlacement(150, 100, 50, 200), { align: 'start', maxWidth: 50 });
  assert.deepEqual(radarLabelPlacement(50, 100, 50, 200), { align: 'end', maxWidth: 50 });
});

test('a readout stays inside the plot', () => {
  assert.equal(radarBoxInside(10, 60, 200), 0);
  assert.equal(radarBoxInside(190, 60, 200), 140);
});

test('the keys go round, and only on a chart with a shape', () => {
  assert.equal(radarKeyWalk(-1, 5, 'ArrowRight'), 0);
  assert.equal(radarKeyWalk(4, 5, 'ArrowRight'), 0);
  assert.equal(radarKeyWalk(0, 5, 'ArrowUp'), 4);
  assert.equal(radarKeyWalk(-1, 5, 'ArrowLeft'), 4);
  assert.equal(radarKeyWalk(2, 5, 'Home'), 0);
  assert.equal(radarKeyWalk(2, 5, 'End'), 4);
  assert.equal(radarKeyWalk(2, 5, 'a'), undefined);
  assert.equal(radarKeyWalk(0, 2, 'ArrowRight'), undefined);
});
