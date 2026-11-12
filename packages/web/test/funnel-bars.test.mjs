import assert from 'node:assert/strict';
import { test } from 'node:test';
import { funnelBars, labelFits, rowAt } from '../src/components/funnel-chart/funnel-layout.ts';

const stages = (...values) => values.map((value) => ({ value }));

test('each bar is centred and as wide as its share of the largest stage', () => {
  const bars = funnelBars(stages(1000, 500, 250), { width: 400, rowHeight: 50, minWidth: 0 });
  assert.deepEqual(
    bars.map(({ x, width }) => [x, width]),
    [
      [0, 400],
      [100, 200],
      [150, 100],
    ]
  );
});

test('rows stack evenly, with the bar in the middle of its row', () => {
  const bars = funnelBars(stages(10, 5), { width: 100, rowHeight: 50, minWidth: 0, fill: 0.6 });
  assert.equal(bars[0].height, 30);
  assert.equal(bars[0].y, 10);
  assert.equal(bars[1].y, 60);
});

test('a small stage is held at the floor, and a zero draws nothing', () => {
  const bars = funnelBars(stages(1000, 5, 0), { width: 200, rowHeight: 40, minWidth: 0.1 });
  assert.equal(bars[1].width, 20);
  assert.equal(bars[2].width, 0);
});

test('a stage larger than the first is drawn as given, measured against the largest', () => {
  const bars = funnelBars(stages(500, 1000), { width: 200, rowHeight: 40, minWidth: 0 });
  assert.equal(bars[0].width, 100);
  assert.equal(bars[1].width, 200);
});

test('a label goes inside a bar only when it fits with room either side', () => {
  assert.equal(labelFits(3, 100), true);
  assert.equal(labelFits(3, 40), false);
});

test('a pointer reads the row it is over, and nothing outside the rows', () => {
  assert.equal(rowAt(0, 50, 4), 0);
  assert.equal(rowAt(149, 50, 4), 2);
  assert.equal(rowAt(200, 50, 4), -1);
  assert.equal(rowAt(-1, 50, 4), -1);
});
