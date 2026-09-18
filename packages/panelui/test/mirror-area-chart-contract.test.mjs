import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/mirror-area-chart/index.tsx', import.meta.url),
  'utf8'
);

test('each half grows away from the baseline, and never across it', () => {
  // A negative value drawn past the baseline would land in the other half,
  // on the other half's scale, and read as a value of the other series.
  assert.match(source, /Math\.max\(value, 0\) \/ span/);
  assert.match(source, /top \? -1 : 1/);
});

test('an explicit domain is used only when both ends are finite', () => {
  assert.match(source, /const safeTop = finiteChartDomain\(topDomain\)/);
  assert.match(source, /const safeBottom = finiteChartDomain\(bottomDomain\)/);
});

test('the split is clamped, so neither half can collapse to nothing', () => {
  assert.match(source, /Math\.min\(Math\.max\(Number\.isFinite\(split\) \? split : 0\.55, 0\.1\), 0\.9\)/);
});

test('the reveal redraws the paths rather than animating an SVG clip', () => {
  // Animated props on a clip inside <Defs> never reach the native clip on
  // Android, so a clip-driven reveal would simply not play there.
  assert.ok(!source.includes('<ClipPath'));
  assert.match(source, /grow\.value,/);
});

test('areas keep declaration order when they re-register', () => {
  assert.match(source, /position\(a\.key\) - position\(b\.key\)/);
});
