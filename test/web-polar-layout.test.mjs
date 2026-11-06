// Polar Area Chart's scale and hit testing. The drawing itself is checked in a browser.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  polarBoxInside,
  polarNiceMax,
  polarPoint,
  polarRadiiBetween,
  polarReach,
  polarWedgeAt,
  polarWedges,
} from '../packages/web/src/components/polar-area-chart/polar-layout.ts';

const OPTIONS = { radius: 100, maxValue: 100, scale: 'radius', startAngle: 0, padAngle: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('the outer ring rounds up to a figure somebody would pick', () => {
  assert.equal(polarNiceMax(87), 100);
  assert.equal(polarNiceMax(1200), 1500);
  assert.equal(polarNiceMax(100), 100);
  assert.equal(polarNiceMax(0), 1);
  assert.equal(polarNiceMax(Number.NaN), 1);
});

test('radius is linear, area is the square root, and both stop at the maximum', () => {
  assert.equal(polarReach(25, OPTIONS), 25);
  assert.equal(polarReach(25, { ...OPTIONS, scale: 'area' }), 50);
  assert.equal(polarReach(400, OPTIONS), 100);
  assert.equal(polarReach(-5, OPTIONS), 0);
});

test('wedges share the turn equally, and the gap comes out of each', () => {
  const wedges = polarWedges([10, 20, 30, 40], { ...OPTIONS, padAngle: 18 });
  close(wedges[0].from, 0.025);
  close(wedges[0].to, 0.225);
  close(wedges[3].to, 0.975);
  assert.deepEqual(polarWedges([], OPTIONS), []);
});

test('a gap wider than a wedge leaves it no width rather than a negative one', () => {
  const [wedge] = polarWedges([10, 10], { ...OPTIONS, padAngle: 720 });
  close(wedge.to - wedge.from, 0.25);
});

test('the hit test goes by the angle and each wedge has its own reach', () => {
  const wedges = polarWedges([100, 50, 100, 50], OPTIONS);
  assert.equal(polarWedgeAt(wedges, 30, -30), 0);
  assert.equal(polarWedgeAt(wedges, 30, 30), 1);
  assert.equal(polarWedgeAt(wedges, 60, 60), -1);
  assert.equal(polarWedgeAt(wedges, -30, -30), 3);
});

test('the hit test still finds a wedge turned past twelve o\'clock', () => {
  const wedges = polarWedges([100, 100], { ...OPTIONS, startAngle: 270 });
  assert.equal(polarWedgeAt(wedges, 0, -50), 0);
  assert.equal(polarWedgeAt(wedges, 0, 50), 1);
});

test('radii move in a line, land exactly, and a new wedge grows from the centre', () => {
  assert.deepEqual(polarRadiiBetween([10, 20], [30, 40], 0.5), [20, 30]);
  assert.deepEqual(polarRadiiBetween([10], [30, 40], 1), [30, 40]);
  assert.deepEqual(polarRadiiBetween([], [30], 0), [0]);
});

test('points go clockwise from twelve, and a readout stays inside the plot', () => {
  const right = polarPoint(100, 50, 0.25);
  close(right.x, 150);
  close(right.y, 100);
  assert.equal(polarBoxInside(10, 60, 200), 0);
  assert.equal(polarBoxInside(190, 60, 200), 140);
  assert.equal(polarBoxInside(100, 60, 200), 70);
});
