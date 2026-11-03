/**
 * The Apparatus skill's geometry and tone core, checked in Node.
 *
 * `kit/iso.ts` and `kit/tones.ts` are pure TypeScript an agent copies into a
 * project and builds every figure on, so a wrong sign in the camera or the
 * light model would be in every figure anyone makes with the skill. They are
 * transpiled here rather than imported, because the Node this repository runs
 * on does not strip types by default.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const kit = path.resolve(import.meta.dirname, '../../../skills/apparatus/kit');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apparatus-kit-'));

function load(name) {
  const source = fs.readFileSync(path.join(kit, `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  // Imports between kit modules are extensionless in the source.
  fs.writeFileSync(path.join(out, `${name}.mjs`), outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'"));
}

load('iso');
load('tones');
const iso = await import(pathToFileURL(path.join(out, 'iso.mjs')).href);
const tones = await import(pathToFileURL(path.join(out, 'tones.mjs')).href);

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} ≠ ${expected}`);

test('the camera puts +y on the left, +x on the right and z up the screen', () => {
  const cam = iso.camera();
  const [xRight] = iso.project(cam, [1, 0, 0]);
  const [yLeft] = iso.project(cam, [0, 1, 0]);
  const [, zUp] = iso.project(cam, [0, 0, 1]);
  assert.ok(xRight > 0, '+x goes right');
  assert.ok(yLeft < 0, '+y goes left');
  assert.ok(zUp < 0, '+z goes up the screen');
});

test('depth grows towards the viewer, so painting by depth puts near parts on top', () => {
  const cam = iso.camera();
  assert.ok(iso.depthOf(cam, [10, 10, 0]) > iso.depthOf(cam, [0, 0, 0]));
  assert.ok(iso.depthOf(cam, [0, 0, 10]) > iso.depthOf(cam, [0, 0, 0]));
});

test('fitView fills the box it is given and stays inside it', () => {
  const cam = iso.camera();
  const points = [
    [0, 0, 0],
    [100, 0, 0],
    [0, 60, 0],
    [100, 60, 40],
  ];
  const view = iso.fitView(cam, points, 300, 200, 10);
  const screen = points.map((p) => view.point(p));
  const xs = screen.map((p) => p[0]);
  const ys = screen.map((p) => p[1]);
  assert.ok(Math.min(...xs) >= 10 - 1e-6 && Math.max(...xs) <= 290 + 1e-6);
  assert.ok(Math.min(...ys) >= 10 - 1e-6 && Math.max(...ys) <= 190 + 1e-6);
  // One axis is filled edge to edge.
  const filledX = Math.abs(Math.max(...xs) - Math.min(...xs) - 280) < 1e-6;
  const filledY = Math.abs(Math.max(...ys) - Math.min(...ys) - 180) < 1e-6;
  assert.ok(filledX || filledY);
});

test('delta is the linear part of point', () => {
  const view = iso.fitView(iso.camera(), [[0, 0, 0], [50, 50, 50]], 200, 200);
  const a = view.point([3, 4, 5]);
  const b = view.point([10, 2, 7]);
  const d = view.delta([7, -2, 2]);
  close(b[0] - a[0], d[0], 'dx');
  close(b[1] - a[1], d[1], 'dy');
});

test('planeMatrix maps a plane coordinate to the same screen point as the world point', () => {
  const view = iso.fitView(iso.camera(), [[0, 0, 0], [80, 80, 80]], 320, 320);
  const origin = [10, 20, 30];
  const u = [1, 0, 0];
  const v = [0, 0, 1];
  const [a, b, c, d, e, f] = iso.planeMatrix(view, origin, u, v);
  const [s, t] = [7, -3];
  const expected = view.point([origin[0] + s, origin[1], origin[2] + t]);
  close(a * s + c * t + e, expected[0], 'x');
  close(b * s + d * t + f, expected[1], 'y');
});

test('tops catch the most light, left sides more than right sides', () => {
  const cam = iso.camera();
  const top = iso.lightOf(cam, [0, 0, 1]);
  const left = iso.lightOf(cam, [0, 1, 0]);
  const right = iso.lightOf(cam, [1, 0, 0]);
  assert.ok(top > left && left > right, `${top} > ${left} > ${right}`);
});

test('a box shows a lit cap and a seam at the corner between its two visible sides', () => {
  const view = iso.fitView(iso.camera(), [[0, 0, 0], [40, 40, 40]], 200, 200);
  const solid = iso.box(view, { x: 0, y: 0, z: 0, w: 40, d: 40, h: 20 }, 'mid');
  assert.equal(solid.parts.length, 2);
  assert.equal(solid.parts[0].fill.kind, 'shaded');
  assert.equal(solid.parts[1].fill.kind, 'flat');
  assert.ok(solid.parts[1].fill.light > 0.9, 'the cap is the top');
  assert.equal((solid.seams.match(/M/g) ?? []).length, 1, 'one seam, at the front corner');
  const stops = solid.parts[0].fill.stops;
  assert.ok(stops.every((stop, i) => i === 0 || stop.offset >= stops[i - 1].offset), 'stops ascend');
});

test('a cylinder has no seams: its sides turn smoothly', () => {
  const view = iso.fitView(iso.camera(), [[0, 0, 0], [40, 40, 40]], 200, 200);
  const solid = iso.cylinder(view, { at: [20, 20, 0], axis: 'z', r: 10, length: 20 }, 'hi');
  assert.equal(solid.seams, '');
});

test('the hull of a square and a point inside it is the square', () => {
  const hull = iso.hull([
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [5, 5],
  ]);
  assert.equal(hull.length, 4);
});

test('tones brighten with light in both themes, and the hierarchy survives shading', () => {
  const dark = { card: '#161616', ink: '#fafafa', accent: '#3b82f6' };
  const light = { card: '#ffffff', ink: '#0a0a0a', accent: '#2563eb' };
  for (const palette of [dark, light]) {
    const bright = tones.luminance(tones.shade(palette, 'mid', 1));
    const dim = tones.luminance(tones.shade(palette, 'mid', 0));
    assert.ok(bright > dim, `light brightens a face on ${palette.card}`);
  }
  // In the dark theme a hi part in shadow still reads above a lo part in light.
  assert.ok(
    tones.luminance(tones.shade(dark, 'hi', 0)) > tones.luminance(tones.shade(dark, 'lo', 0.5)),
    'hi stays above lo'
  );
});

test('colour parsing accepts the formats the theme tokens use', () => {
  assert.deepEqual(tones.parse('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(tones.parse('#00000080').slice(0, 3), [0, 0, 0]);
  assert.deepEqual(tones.parse('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  assert.equal(tones.mix('#000000', '#ffffff', 0.5), '#808080');
});
