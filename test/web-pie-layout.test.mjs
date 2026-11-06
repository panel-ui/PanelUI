/**
 * How the web pie shares out its dial. The angles are what the chart claims
 * about the data, so they are checked as arithmetic rather than by drawing one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { pieKeyWalk, pieSliceAt, pieSlices, pieSlicesBetween, pieTotal } from '../packages/web/src/components/pie-chart/pie-layout.ts';

const CLOSED = { startAngle: 0, endAngle: 360, padAngle: 0, minAngle: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('slices split a closed turn by value, in order', () => {
  const slices = pieSlices([1, 3], CLOSED);
  close(slices[0].from, 0);
  close(slices[0].to, 0.25);
  close(slices[1].from, 0.25);
  close(slices[1].to, 1);
  close(slices[1].mid, 0.625);
  close(slices[1].fraction, 0.75);
});

test('a negative value is zero: no sweep, and left out of the total', () => {
  assert.equal(pieTotal([2, -5, 2]), 4);
  const slices = pieSlices([2, -5, 2], CLOSED);
  assert.equal(slices[1].to - slices[1].from, 0);
  assert.equal(slices[1].fraction, 0);
  close(slices[2].to, 1);
});

test('gaps come out of the turn, so a padded pie still closes', () => {
  const slices = pieSlices([1, 1, 1, 1], { ...CLOSED, padAngle: 9 });
  const pad = 9 / 360;
  close(slices[0].from, pad / 2);
  close(slices[3].to, 1 - pad / 2);
  close(slices[1].from - slices[0].to, pad);
});

test('minAngle lifts a small slice and takes the angle from the rest', () => {
  const slices = pieSlices([0.1, 99.9], { ...CLOSED, minAngle: 18 });
  assert.ok(slices[0].to - slices[0].from >= 18 / 360);
  close(slices[1].to, 1);
});

test('minAngle does not give a zero slice any width', () => {
  const slices = pieSlices([0, 5], { ...CLOSED, minAngle: 18 });
  assert.equal(slices[0].to - slices[0].from, 0);
});

test('an open dial starts where it was asked and stops short', () => {
  const slices = pieSlices([1, 1], { ...CLOSED, startAngle: -135, endAngle: 135 });
  close(slices[0].from, -135 / 360);
  close(slices[1].to, 135 / 360);
});

test('a span past one turn is clamped instead of lapping itself', () => {
  const slices = pieSlices([1, 1], { ...CLOSED, endAngle: 720 });
  close(slices[1].to, 1);
});

test('nothing to share draws nothing', () => {
  assert.deepEqual(pieSlices([], CLOSED), []);
  assert.deepEqual(pieSlices([0, -1], CLOSED), []);
  assert.deepEqual(pieSlices([1], { ...CLOSED, endAngle: 0 }), []);
});

test('a point finds its slice, clockwise from twelve', () => {
  const slices = pieSlices([1, 1, 2], CLOSED);
  assert.equal(pieSliceAt(slices, 50, -1, 0, 100), 0); // just before three o'clock
  assert.equal(pieSliceAt(slices, 50, 1, 0, 100), 1); // just past three o'clock
  assert.equal(pieSliceAt(slices, -50, 0, 0, 100), 2); // nine o'clock
});

test('the hole and the outside of the dial are no slice', () => {
  const slices = pieSlices([1, 1], CLOSED);
  assert.equal(pieSliceAt(slices, 10, 0, 40, 100), -1);
  assert.equal(pieSliceAt(slices, 120, 0, 40, 100), -1);
});

test('a dial starting before twelve still finds its slices, and its gap is empty', () => {
  const slices = pieSlices([1, 1], { ...CLOSED, startAngle: -90, endAngle: 90 });
  assert.equal(pieSliceAt(slices, -50, -1, 0, 100), 0); // just past nine o'clock
  assert.equal(pieSliceAt(slices, 1, -50, 0, 100), 1); // just past twelve
  assert.equal(pieSliceAt(slices, 0, 50, 0, 100), -1); // six o'clock, in the gap
});

test('a whole-turn slice takes every angle, and a zero slice takes none', () => {
  assert.equal(pieSliceAt(pieSlices([5], CLOSED), -30, 40, 0, 100), 0);
  assert.equal(pieSliceAt(pieSlices([0, 5], CLOSED), 30, 40, 0, 100), 1);
});

test('a data change moves angles in a line and lands exactly on the new dial', () => {
  const before = pieSlices([3, 1], CLOSED);
  const after = pieSlices([1, 3], CLOSED);
  assert.deepEqual(pieSlicesBetween(before, after, 1), after);
  const half = pieSlicesBetween(before, after, 0.5);
  assert.equal(half[0].to, 0.5);
  assert.equal(half[0].mid, 0.25);
});

test('a slice new to the data grows from its own start, and a removed one is dropped', () => {
  const before = pieSlices([1], CLOSED);
  const after = pieSlices([1, 1], CLOSED);
  const start = pieSlicesBetween(before, after, 0);
  assert.equal(start[1].to, start[1].from);
  assert.equal(pieSlicesBetween(after, before, 0.5).length, 1);
});

test('the keys walk from the reading and stop at the ends', () => {
  assert.equal(pieKeyWalk(-1, 3, 'ArrowRight'), 0);
  assert.equal(pieKeyWalk(2, 3, 'ArrowRight'), 2);
  assert.equal(pieKeyWalk(0, 3, 'ArrowLeft'), 0);
  assert.equal(pieKeyWalk(0, 3, 'End'), 2);
  assert.equal(pieKeyWalk(2, 3, 'Home'), 0);
  assert.equal(pieKeyWalk(0, 3, 'a'), undefined);
  assert.equal(pieKeyWalk(-1, 0, 'ArrowRight'), undefined);
});
