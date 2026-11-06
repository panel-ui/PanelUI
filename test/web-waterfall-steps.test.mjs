import assert from 'node:assert/strict';
import test from 'node:test';

import {
  waterfallExtent,
  waterfallKinds,
  waterfallSteps,
} from '../packages/web/src/components/waterfall-chart/waterfall-steps.ts';

const ends = (data) => waterfallSteps(data).map(({ start, end }) => [start, end]);

test('a step floats from where the last one ended', () => {
  assert.deepEqual(
    ends([
      { label: 'open', value: 100, total: true },
      { label: 'up', value: 40 },
      { label: 'down', value: -60 },
      { label: 'close', value: 0, total: true },
    ]),
    [
      [0, 100],
      [100, 140],
      [140, 80],
      [0, 80],
    ]
  );
});

test('a total reads the balance and carries a non-zero value into it', () => {
  const steps = waterfallSteps([
    { label: 'up', value: 10 },
    { label: 'reading', value: 5, total: true },
    { label: 'after', value: 1 },
  ]);
  assert.equal(steps[1].value, 15);
  assert.equal(steps[1].kind, 'total');
  assert.equal(steps[2].start, 15);
});

test('the kind follows the sign, and zero is a rise', () => {
  const kinds = waterfallSteps([
    { label: 'a', value: 1 },
    { label: 'b', value: -1 },
    { label: 'c', value: 0 },
  ]).map(({ kind }) => kind);
  assert.deepEqual(kinds, ['rise', 'fall', 'rise']);
});

test('a value that is not finite keeps its step and spares later totals', () => {
  const steps = waterfallSteps([
    { label: 'a', value: 10 },
    { label: 'bad', value: Number.NaN },
    { label: 'c', value: 5 },
  ]);
  assert.equal(steps[1].value, 0);
  assert.equal(steps[2].end, 15);
});

test('the axis spans both ends of every bar and always includes zero', () => {
  assert.deepEqual(waterfallExtent([{ start: 100, end: 200 }]).map(Math.round), [0, 220]);
  assert.deepEqual(waterfallExtent([{ start: 0, end: -50 }]).map(Math.round), [-55, 0]);
  assert.deepEqual(waterfallExtent([]), [0, 1]);
});

test('an explicit domain wins only when both ends are finite', () => {
  assert.deepEqual(waterfallExtent([{ start: 0, end: 10 }], [5, 20]), [5, 20]);
  assert.deepEqual(waterfallExtent([{ start: 0, end: 10 }], [Number.NaN, 20]).map(Math.round), [0, 11]);
});

test('a legend lists only the kinds the run contains', () => {
  assert.deepEqual(waterfallKinds([{ kind: 'total' }, { kind: 'rise' }]), ['rise', 'total']);
});
