import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { adaptStyleForNative } from '../src/components/map/native-style.ts';

/*
 * The native renderer drops a whole layer when one of its properties is one it
 * cannot parse, and logs a warning for it. A hosted street style reached the
 * device without its station, bus-stop and sea labels, and the terminal filled
 * with `layer doesn't support this property`.
 */

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const hosted = () =>
  deepFreeze({
    version: 8,
    sources: {
      attribution: { type: 'vector', attribution: '© Provider' },
      planet: { type: 'vector', url: 'https://tiles.example/tiles.json' },
      imagery: { type: 'raster', tiles: ['https://tiles.example/{z}/{x}/{y}.png'] },
      points: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': '#fff' } },
      {
        id: 'stations',
        type: 'symbol',
        source: 'planet',
        layout: { 'icon-overlap': 'never', 'text-overlap': 'never', 'text-allow-overlap': true },
      },
      {
        id: 'capitals',
        type: 'symbol',
        source: 'planet',
        layout: { 'icon-overlap': 'always', 'text-field': ['get', 'name'] },
      },
      { id: 'pois', type: 'symbol', source: 'planet', layout: { 'icon-overlap': 'cooperative' } },
      {
        id: 'stepped',
        type: 'symbol',
        source: 'planet',
        layout: {
          'text-overlap': ['step', ['zoom'], 'never', 12, 'always'],
          'text-allow-overlap': true,
        },
      },
      { id: 'imagery', type: 'raster', source: 'imagery', paint: { resampling: 'nearest' } },
      { id: 'relief', type: 'hillshade', source: 'imagery', paint: { resampling: 'nearest' } },
    ],
  });

const layer = (style, id) => style.layers.find((entry) => entry.id === id);

test('a tiled source with nothing to fetch is removed', () => {
  const adapted = adaptStyleForNative(hosted());
  assert.deepEqual(Object.keys(adapted.sources), ['planet', 'imagery', 'points']);
});

test('overlap modes become the older allow-overlap booleans', () => {
  const adapted = adaptStyleForNative(hosted());

  // The newer property wins where a layer sets both, as it does in a browser.
  assert.deepEqual(layer(adapted, 'stations').layout, {
    'icon-allow-overlap': false,
    'text-allow-overlap': false,
  });
  assert.deepEqual(layer(adapted, 'capitals').layout, {
    'text-field': ['get', 'name'],
    'icon-allow-overlap': true,
  });
  assert.deepEqual(layer(adapted, 'pois').layout, { 'icon-allow-overlap': false });

  // An expression has no direct translation, so the older property decides.
  assert.deepEqual(layer(adapted, 'stepped').layout, { 'text-allow-overlap': true });
});

test('resampling keeps its older name on raster and is dropped elsewhere', () => {
  const adapted = adaptStyleForNative(hosted());
  assert.deepEqual(layer(adapted, 'imagery').paint, { 'raster-resampling': 'nearest' });
  assert.deepEqual(layer(adapted, 'relief').paint, {});
});

test('untouched layers are passed through as they are', () => {
  const style = hosted();
  const adapted = adaptStyleForNative(style);
  assert.equal(layer(adapted, 'ground'), layer(style, 'ground'));
});

test('a style with nothing to change comes back as the same object', () => {
  const style = deepFreeze({
    version: 8,
    sources: { planet: { type: 'vector', url: 'https://tiles.example/tiles.json' } },
    layers: [
      { id: 'labels', type: 'symbol', source: 'planet', layout: { 'text-allow-overlap': true } },
    ],
  });
  assert.equal(adaptStyleForNative(style), style);
});

test('every property the spec lists as unsupported on native is handled', async () => {
  /*
   * When the renderer's spec gains a property native cannot parse, this fails
   * and names it, rather than a hosted style quietly losing layers again.
   */
  const require = createRequire(import.meta.url);
  const specPath = require.resolve('@maplibre/maplibre-gl-style-spec/dist/latest.json', {
    paths: [new URL('../../../node_modules/@maplibre/maplibre-react-native/', import.meta.url).pathname],
  });
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const isVersion = (value) => typeof value === 'string' && /^\d/.test(value);

  const unsupported = [];
  for (const [group, properties] of Object.entries(spec)) {
    const scope = /^(paint|layout)_(.+)$/.exec(group);
    if (!scope) continue;
    for (const [name, definition] of Object.entries(properties)) {
      const support = definition['sdk-support']?.['basic functionality'];
      if (!support || (isVersion(support.android) && isVersion(support.ios))) continue;
      unsupported.push({ scope: scope[1], type: scope[2], name });
    }
  }
  assert.ok(unsupported.length > 0, 'expected the spec to list at least one property');

  for (const { scope, type, name } of unsupported) {
    const style = adaptStyleForNative({
      version: 8,
      sources: {},
      layers: [{ id: 'probe', type, [scope]: { [name]: 'never' } }],
    });
    assert.ok(
      !(name in (style.layers[0][scope] ?? {})),
      `${scope} property '${name}' on ${type} layers is unsupported on native and is not translated`
    );
  }
});
