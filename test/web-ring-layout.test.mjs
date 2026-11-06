// Ring Chart's geometry and keyboard walk. The drawing itself is checked in a browser.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ringAfterKey,
  ringFraction,
  ringPercent,
  ringRadius,
  ringSpan,
  ringStagger,
  ringTick,
} from '../packages/web/src/components/ring-chart/ring-layout.ts';

test('a ring fills at its target and stops, while the percent keeps counting', () => {
  assert.equal(ringFraction(5, 10), 0.5);
  assert.equal(ringFraction(12, 10), 1);
  assert.equal(ringPercent(12, 10), 120);
});

test('a negative value or a target of zero draws nothing', () => {
  assert.equal(ringFraction(-3, 10), 0);
  assert.equal(ringFraction(3, 0), 0);
  assert.equal(ringPercent(3, 0), 0);
});

test('the span is a share of a turn and never laps', () => {
  assert.equal(ringSpan(0, 360), 1);
  assert.equal(ringSpan(-90, 90), 0.5);
  assert.equal(ringSpan(0, 720), 1);
  assert.equal(ringSpan(90, 0), 0);
});

test('rings step in by thickness and gap, and an impossible one stays on its own width', () => {
  assert.equal(ringRadius(200, 12, 6, 0), 94);
  assert.equal(ringRadius(200, 12, 6, 1), 76);
  assert.equal(ringRadius(40, 12, 6, 5), 6);
});

test('ticks and their gaps span exactly the arc', () => {
  const { slot, dash } = ringTick(120, 12, 3);
  assert.equal(slot * 12, 120);
  assert.equal(dash, 7);
  assert.equal(ringTick(10, 10, 3).dash, 0.5);
});

test('the last ring still has the sweep window left, however many there are', () => {
  assert.equal(ringStagger(0, 3), 0);
  assert.ok(ringStagger(4, 5) + 0.6 <= 1);
});

test('the keys walk in data order and stop at the ends', () => {
  assert.equal(ringAfterKey('ArrowRight', -1, 3), 0);
  assert.equal(ringAfterKey('ArrowDown', 2, 3), 2);
  assert.equal(ringAfterKey('ArrowLeft', 0, 3), 0);
  assert.equal(ringAfterKey('End', 0, 3), 2);
  assert.equal(ringAfterKey('Home', 2, 3), 0);
  assert.equal(ringAfterKey('a', 1, 3), 1);
  assert.equal(ringAfterKey('End', -1, 0), -1);
});
