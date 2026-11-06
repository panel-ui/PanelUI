import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const body = (path) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  return source.slice(source.indexOf('*/') + 2);
};

test('the app and the web arrange a flow with the same layout code', () => {
  assert.equal(
    body('packages/web/src/components/sankey-chart/sankey-layout.ts'),
    body('packages/panelui/src/components/sankey-chart/sankey-layout.ts')
  );
});
