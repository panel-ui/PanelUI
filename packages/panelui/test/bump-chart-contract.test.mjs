import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/bump-chart/index.tsx', import.meta.url),
  'utf8'
);
const chart = await readFile(new URL('../src/utils/chart.ts', import.meta.url), 'utf8');

test('a rank that is not a finite place is a gap, not a point at the bottom', () => {
  assert.match(source, /const rank = finiteChartNumber\(row\[key\]\)/);
  assert.match(source, /rank !== undefined && rank >= 1 \? rank : null/);
});

test('scores are ranked highest first, and a tie keeps declaration order', () => {
  // Two equal scores given the same place would draw one line exactly over
  // the other, and the one underneath would vanish.
  assert.match(source, /\.sort\(\(a, b\) => b\.score - a\.score \|\| a\.order - b\.order\)/);
});

test('the lines are ordered by declaration, not by when they registered', () => {
  // A line re-registers when its colour resolves; appending it again would
  // reorder the legend and change how score ties break.
  assert.match(source, /Declaration order, not registration order/);
  assert.match(source, /position\(a\.key\) - position\(b\.key\)/);
});

test('the picked-out line is drawn last, so it sits over every crossing', () => {
  assert.match(
    source,
    /\.\.\.series\.filter\(\(item\) => item\.key !== highlight\), \.\.\.series\.filter\(\(item\) => item\.key === highlight\)/
  );
});

test('a data change starts from where the lines are drawn, on the UI thread', () => {
  assert.match(source, /runOnUI\(\(next: BumpRanks, duration: number\) => \{/);
  assert.match(source, /start \+ \(end - start\) \* progress/);
});

test('each join leaves one point level and arrives at the next level', () => {
  assert.match(chart, /export function bumpSegment/);
  assert.match(chart, /d \+= ` C\$\{mid\},\$\{from\.y\} \$\{mid\},\$\{to\.y\} \$\{to\.x\},\$\{to\.y\}`/);
});
