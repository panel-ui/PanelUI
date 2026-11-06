import assert from 'node:assert/strict';
import test from 'node:test';
import { liveLineAccessibility } from '../packages/web/src/components/live-line-chart/live-line-accessibility.ts';
import {
  liveLineClockRuns,
  liveLineExtent,
  liveLineMomentum,
  liveLineOnPlot,
  liveLineRun,
  nearestReading,
  newestOnPlot,
  normalizeLiveLinePoints,
  normalizeLiveLineWindow,
  reconcileLiveLineActivePoint,
} from '../packages/web/src/components/live-line-chart/live-line-lifecycle.ts';

const at = (time, value = 1) => ({ time, value });

test('the buffer is ordered, finite and bounded, and the later duplicate wins', () => {
  const points = normalizeLiveLinePoints([at(3, 3), at(1, 1), at(Number.NaN, 9), at(2, Infinity), at(3, 30)], 500);
  assert.deepEqual(points, [at(1, 1), at(3, 30)]);
  assert.deepEqual(normalizeLiveLinePoints([at(1), at(2), at(3)], 2), [at(2), at(3)]);
  assert.equal(normalizeLiveLinePoints([at(1), at(2)], Number.NaN).length, 2);
});

test('an invalid window falls back', () => {
  assert.equal(normalizeLiveLineWindow(-5), 30);
  assert.equal(normalizeLiveLineWindow(0.2), 1);
  assert.equal(normalizeLiveLineWindow(60), 60);
});

test('the clock runs only when nothing holds it', () => {
  const free = { paused: false, loading: false, reducedMotion: false, visible: true };
  assert.equal(liveLineClockRuns(free), true);
  for (const key of ['paused', 'loading', 'reducedMotion']) {
    assert.equal(liveLineClockRuns({ ...free, [key]: true }), false, key);
  }
  assert.equal(liveLineClockRuns({ ...free, visible: false }), false);
});

test('the extent ignores what has left the window and pads what is in it', () => {
  assert.deepEqual(liveLineExtent([at(0, 999), at(10, 100), at(20, 200)], 5), [88, 212]);
  assert.deepEqual(liveLineExtent([at(10, 5)], 0), [4, 6]);
  assert.deepEqual(liveLineExtent([at(0, 5)], 10), [0, 1]);
});

test('momentum reads the last six readings against the axis', () => {
  const rising = [at(1, 0), at(2, 50)];
  assert.equal(liveLineMomentum(rising, [0, 100]), 'up');
  assert.equal(liveLineMomentum([at(1, 50), at(2, 0)], [0, 100]), 'down');
  assert.equal(liveLineMomentum([at(1, 50), at(2, 52)], [0, 100]), 'flat');
  assert.equal(liveLineMomentum([at(1, 50)], [0, 100]), 'flat');
  // The seventh back is out of it.
  const old = [at(0, 0), ...[1, 2, 3, 4, 5, 6].map((time) => at(time, 50))];
  assert.equal(liveLineMomentum(old, [0, 100]), 'flat');
});

test('a run enters from before the window and stops at its end', () => {
  const points = [at(0), at(5), at(10), at(15), at(20)];
  assert.deepEqual(liveLineRun(points, 7, 16).map(({ time }) => time), [5, 10, 15]);
  assert.deepEqual(liveLineRun(points, 0, 100).map(({ time }) => time), [0, 5, 10, 15, 20]);
  assert.deepEqual(liveLineRun(points, 100, 130).map(({ time }) => time), [20]);
});

test('the dot rides the newest reading on the plot, and leaves with it', () => {
  const points = [at(0), at(10), at(20)];
  assert.equal(newestOnPlot(points, 5, 15)?.time, 10);
  assert.equal(newestOnPlot(points, 30, 40), null);
  assert.equal(newestOnPlot(points, -10, -5), null);
});

test('a reading is found by time and lost when trimmed', () => {
  const points = [at(0), at(10), at(100)];
  assert.equal(nearestReading(points, 40)?.time, 10);
  assert.equal(nearestReading([], 40), null);
  assert.equal(reconcileLiveLineActivePoint(at(10), points)?.time, 10);
  assert.equal(reconcileLiveLineActivePoint(at(11), points), null);
});

test('the snapshot says what state the chart is in', () => {
  const base = {
    status: 'ready',
    latest: at(1000, 12),
    activePoint: null,
    momentum: 'up',
    windowSeconds: 30,
    paused: false,
    now: 5000,
    formatLatest: String,
    formatActive: String,
  };
  assert.equal(liveLineAccessibility(base), 'Live line chart. Current value, 12. Trend, rising. 30-second window');
  assert.equal(liveLineAccessibility({ ...base, status: 'loading', paused: true }), 'Live line chart. Loading. Paused');
  assert.equal(liveLineAccessibility({ ...base, latest: null, name: 'Queue' }), 'Queue. No readings');
  assert.equal(
    liveLineAccessibility({ ...base, activePoint: at(2000, 9), paused: true }),
    'Live line chart. Selected value, 9. 3 seconds ago. 30-second window. Paused'
  );
});

test('only readings inside the window can be read', () => {
  const points = [{ time: 90, value: 1 }, { time: 100, value: 2 }, { time: 200, value: 3 }, { time: 210, value: 4 }];
  assert.deepEqual(liveLineOnPlot(points, 100, 200).map(({ time }) => time), [100, 200]);
  assert.deepEqual(liveLineOnPlot(points, 300, 400), []);
});
