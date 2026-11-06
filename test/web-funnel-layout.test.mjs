import assert from 'node:assert/strict';
import test from 'node:test';
import {
  funnelLayout,
  ribbonCurve,
  stageAt,
} from '../packages/web/src/components/funnel-chart/funnel-layout.ts';

const BOX = { width: 400, height: 200, gap: 4, minWidth: 0.1 };

test('bands divide the width, and each ends at the height the next one starts', () => {
  const { bands } = funnelLayout([{ value: 100 }, { value: 50 }, { value: 25 }, { value: 10 }], BOX);
  assert.equal(bands[3].offset + bands[3].length, 400);
  assert.equal(bands[0].head, 70);
  assert.equal(bands[0].tail, bands[1].head);
  assert.equal(bands[1].tail, bands[2].head);
  assert.equal(bands[3].tail, bands[3].head);
});

test('a stage larger than the one above it is drawn as given, and the shares say so', () => {
  const { bands, shares, steps } = funnelLayout([{ value: 50 }, { value: 100 }], BOX);
  assert.ok(bands[1].head > bands[0].head);
  assert.deepEqual(shares, [1, 2]);
  assert.deepEqual(steps, [1, 2]);
});

test('the floor lifts a sliver, leaves larger stages true, and leaves a zero at nothing', () => {
  const { bands } = funnelLayout([{ value: 1000 }, { value: 500 }, { value: 1 }, { value: 0 }, { value: -5 }], BOX);
  assert.equal(bands[1].head, 35);
  assert.equal(bands[2].head, 7);
  assert.equal(bands[3].head, 0);
  assert.equal(bands[4].head, 0);
});

test('shares survive a first stage of zero and a stage after a zero', () => {
  const { shares, steps } = funnelLayout([{ value: 0 }, { value: 10 }], BOX);
  assert.deepEqual(shares, [0, 0]);
  assert.deepEqual(steps, [1, 0]);
});

test('the hue fades along the run, except on a stage with its own colour', () => {
  const { strengths } = funnelLayout([{ value: 3 }, { value: 2, color: 'success' }, { value: 1 }], BOX);
  assert.deepEqual(strengths, [1, 1, 0.65]);
});

test('a mirrored run starts at the right edge with its heights swapped', () => {
  const { bands } = funnelLayout([{ value: 100 }, { value: 50 }], { ...BOX, mirrored: true });
  assert.equal(bands[0].offset + bands[0].length, 400);
  assert.equal(bands[1].offset, 0);
  assert.equal(bands[0].tail, 70);
  assert.equal(bands[0].head, 35);
});

test('a gap belongs to the nearer stage, and past a short run there is none', () => {
  const { bands } = funnelLayout([{ value: 2 }, { value: 1 }], { ...BOX, gap: 10, stageSize: 100 });
  assert.equal(stageAt(bands, 50), 0);
  assert.equal(stageAt(bands, 104), 0);
  assert.equal(stageAt(bands, 106), 1);
  assert.equal(stageAt(bands, 300), -1);
  assert.equal(stageAt([], 10), -1);
});

test('the ribbon closes through both sides, with curves or with diagonals', () => {
  const top = [[0, 10], [100, 40]];
  const bottom = [[0, 90], [100, 60]];
  assert.equal(ribbonCurve(0.5).area(top, bottom), 'M0,10C50,10 50,40 100,40L100,60C50,60 50,90 0,90Z');
  assert.equal(ribbonCurve(0).area(top, bottom), 'M0,10L100,40L100,60L0,90Z');
});
