import assert from 'node:assert/strict';
import test from 'node:test';
import { chartAccessibilityModel } from '../src/primitives/chart-accessibility.ts';

test('chart data becomes one summary and one structured item per datum', () => {
  const data = [
    { month: 'Jan', revenue: 12, ignored: null },
    { month: 'Feb', revenue: 18, ignored: undefined },
  ];
  const model = chartAccessibilityModel(
    'Area chart',
    data,
    (row) => [
      ['month', row.month],
      ['revenue', row.revenue],
      ['ignored', row.ignored],
    ]
  );

  assert.equal(model.summary, 'Area chart, 2 data entries');
  assert.deepEqual(model.items.map(({ index, label }) => ({ index, label })), [
    { index: 0, label: 'month, Jan. revenue, 12' },
    { index: 1, label: 'month, Feb. revenue, 18' },
  ]);
});

test('a caller can provide domain language without replacing source data', () => {
  const datum = { date: new Date('2026-08-13T00:00:00Z'), count: 4 };
  const model = chartAccessibilityModel(
    'Heatmap chart',
    [datum],
    (row) => [['count', row.count]],
    (row) => `${row.count} contributions on ${row.date.toISOString().slice(0, 10)}`
  );

  assert.equal(model.summary, 'Heatmap chart, 1 data entry');
  assert.equal(model.items[0].datum, datum);
  assert.equal(model.items[0].label, '4 contributions on 2026-08-13');
});

test('semantic data keeps visual geometry decorative and activation opt-in', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../src/primitives/chart-accessibility.ts', import.meta.url), 'utf8')
  );
  assert.match(source, /accessibilityRole: onAccessibilityDatumPress \? 'button' : 'text'/);
  assert.match(source, /onPress: onAccessibilityDatumPress/);
  assert.match(source, /onAccessibilityDatumPress\(item\.datum, item\.index\)/);
});

test('all confirmed chart families use the shared semantic sibling', async () => {
  const readFile = (await import('node:fs/promises')).readFile;
  for (const name of ['area', 'bar', 'bubble', 'bump', 'candlestick', 'heatmap', 'line', 'mirror-area', 'pyramid', 'radar', 'scatter']) {
    const source = await readFile(new URL(`../src/components/${name}-chart/index.tsx`, import.meta.url), 'utf8');
    assert.match(source, /<ChartAccessibilityData/);
    assert.match(source, /importantForAccessibility="no-hide-descendants"/);
  }
});
