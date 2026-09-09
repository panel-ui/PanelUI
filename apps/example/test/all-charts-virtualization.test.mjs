import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';

const screen = await readFile(
  new URL('../app/components/all-charts.tsx', import.meta.url),
  'utf8'
);
const catalogue = await readFile(
  new URL('../src/data/components.tsx', import.meta.url),
  'utf8'
);

test('the chart gallery delegates rows to a bounded virtualized list', () => {
  assert.match(screen, /<FlatList/);
  assert.match(screen, /<FlatList\s+className="flex-1"/);
  assert.match(screen, /data=\{charts\}/);
  assert.match(screen, /renderItem=\{renderChart\}/);
  assert.match(screen, /initialNumToRender=\{2\}/);
  assert.match(screen, /maxToRenderPerBatch=\{2\}/);
  assert.match(screen, /windowSize=\{3\}/);
  // Detaching offscreen views blanks animated SVG on iOS, and every row here is
  // a chart. The window bounds the work without it.
  assert.doesNotMatch(screen, /^\s*removeClippedSubviews\b/m);
  assert.doesNotMatch(screen, /charts\.map/);
  assert.doesNotMatch(screen, /<ScrollView/);
  assert.match(screen, /Loading chart examples…/);
  assert.match(screen, /Chart examples could not be loaded/);
  assert.match(screen, /loadChartShowcase\(\)\.then\([\s\S]*?\(\) =>/);
});

test('renderItem mounts the existing first demo with stable slug keys', () => {
  assert.match(
    screen,
    /\(\{ item, index \}: ListRenderItemInfo<ComponentEntry>\) => \(\s*<ChartCard entry=\{item\} tint=\{tint\} first=\{index === 0\} \/>/
  );
  assert.match(screen, /const chartKey = \(entry: ComponentEntry\) => entry\.slug;/);
  assert.match(screen, /keyExtractor=\{chartKey\}/);
  assert.match(screen, /const version = entry\.demos\[0\];/);
  assert.match(screen, /<View style=\{\{ minHeight: 300 \}\}>\{version\.render\(\)\}<\/View>/);
});

test('every declared chart remains sourced from the catalogue', () => {
  const declaration = catalogue.match(/export const CHART_SLUGS = \[([\s\S]*?)\] as const;/);
  assert.ok(declaration, 'CHART_SLUGS declaration is present');
  const slugs = [...declaration[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

  assert.equal(slugs.length, 16);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    assert.match(catalogue, new RegExp(`ENTRIES_BY_SLUG\\['${slug}'\\]`));
  }
  assert.match(catalogue, /Promise\.all\(CHART_SLUGS\.map\(loadComponent\)\)/);
});

test('demo modules are bounded, lazy, and retain exact generated catalogue parity', async () => {
  const directory = new URL('../src/data/demos/', import.meta.url);
  const chunks = (await readdir(directory)).filter((file) => file.endsWith('.tsx')).sort();
  assert.equal(chunks.length, 15);
  assert.doesNotMatch(catalogue, /from ['"]\.\/demos\//);
  assert.equal([...catalogue.matchAll(/\(\) => import\('\.\/demos\/chunk-\d+'\)/g)].length, chunks.length);

  const sources = await Promise.all(chunks.map((file) => readFile(new URL(file, directory), 'utf8')));
  const sizes = await Promise.all(chunks.map((file) => stat(new URL(file, directory))));
  assert.ok(sizes.every(({ size }) => size < 90_000));
  const slugs = sources.flatMap((source) => [...source.matchAll(/\n\s*slug: '([^']+)'/g)].map((match) => match[1]));
  const metadata = JSON.parse(await readFile(new URL('../src/data/components.demo-signatures.generated.json', import.meta.url), 'utf8'));
  assert.deepEqual(slugs.sort(), metadata.entries.map((entry) => entry.slug).sort());
  // Distinct per entry, so a copy-pasted demo block cannot pass as its own
  // component. Compared against the entry count rather than a literal, which
  // would need editing every time a component is added.
  assert.equal(
    new Set(metadata.entries.map((entry) => entry.signature)).size,
    metadata.entries.length
  );
});
