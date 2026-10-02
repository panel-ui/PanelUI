import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeSeconds,
  msUntilNextTick,
  secondsLeft,
  splitSeconds,
  trimLeading,
} from '../src/components/countdown/countdown-time.ts';

test('seconds round up, so zero arrives when the target does', () => {
  assert.equal(secondsLeft(10_000, 9_001), 1);
  assert.equal(secondsLeft(10_000, 9_999), 1);
  assert.equal(secondsLeft(10_000, 10_000), 0);
  assert.equal(secondsLeft(10_000, 50_000), 0);
});

test('a target that is not a number is already over', () => {
  assert.equal(secondsLeft(Number.NaN, 0), 0);
});

test('the next tick lands when the second turns over', () => {
  assert.equal(msUntilNextTick(10_000, 8_750), 250);
  assert.equal(msUntilNextTick(10_000, 8_000), 1000);
  assert.equal(msUntilNextTick(10_000, 12_000), 0);
});

test('seconds split across every unit', () => {
  const total = 2 * 86400 + 14 * 3600 + 3 * 60 + 22;
  assert.deepEqual(
    splitSeconds(total).map((p) => p.value),
    [2, 14, 3, 22]
  );
});

test('the largest unit asked for absorbs the rest', () => {
  assert.deepEqual(
    splitSeconds(2 * 86400 + 90, ['hours', 'minutes', 'seconds']).map((p) => p.value),
    [48, 1, 30]
  );
});

test('units come back largest first whatever order they were passed in', () => {
  assert.deepEqual(
    splitSeconds(125, ['seconds', 'minutes']).map((p) => p.unit),
    ['minutes', 'seconds']
  );
});

test('leading zero units drop, keeping the smallest two', () => {
  const parts = splitSeconds(3 * 3600 + 5);
  assert.deepEqual(
    trimLeading(parts).map((p) => p.unit),
    ['hours', 'minutes', 'seconds']
  );
  assert.deepEqual(
    trimLeading(splitSeconds(7)).map((p) => p.unit),
    ['minutes', 'seconds']
  );
});

test('the spoken label stays at minutes until the last minute', () => {
  assert.equal(describeSeconds(2 * 86400 + 3600 + 59), '2 days, 1 hour left');
  assert.equal(describeSeconds(61), '1 minute left');
  assert.equal(describeSeconds(59), '59 seconds left');
  assert.equal(describeSeconds(1), '1 second left');
  assert.equal(describeSeconds(0), 'Time is up');
});
