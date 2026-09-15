import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  coverSize,
  dragFade,
  dragScale,
  fitContain,
  fitWithin,
  focalTranslation,
  hitsRect,
  lerpRect,
  panBound,
  rubberBandClamp,
  shouldDismiss,
  snapPage,
} from '../src/components/image-viewer/image-viewer-geometry.ts';

const screen = { width: 400, height: 800 };

test('ImageViewer fits a picture inside the screen, centred, keeping its proportions', () => {
  assert.deepEqual(fitContain({ width: 1600, height: 900 }, screen), {
    x: 0,
    y: 287.5,
    width: 400,
    height: 225,
  });
  assert.deepEqual(fitContain({ width: 1000, height: 4000 }, screen), {
    x: 100,
    y: 0,
    width: 200,
    height: 800,
  });
  // An image whose size is not known yet fills the screen rather than vanishing.
  assert.deepEqual(fitContain({ width: 0, height: 0 }, screen), { x: 0, y: 0, ...screen });
});

test('ImageViewer fits the open picture inside its margins, still centred on the screen', () => {
  const box = { x: 16, y: 78, width: 370, height: 718 };
  const fitted = fitWithin({ width: 1600, height: 900 }, box);
  assert.equal(fitted.x, 16);
  assert.equal(fitted.width, 370);
  assert.equal(fitted.y + fitted.height / 2, 78 + 718 / 2);
  const tall = fitWithin({ width: 1000, height: 4000 }, box);
  assert.equal(tall.y, 78);
  assert.equal(tall.height, 718);
  assert.equal(tall.x + tall.width / 2, 16 + 370 / 2);
});

test('ImageViewer draws the picture at the size that covers its frame, so a crop opens out', () => {
  // A square thumbnail of a wide photo: height matches, width overflows.
  assert.deepEqual(coverSize({ width: 1600, height: 900 }, { width: 90, height: 90 }), {
    width: 160,
    height: 90,
  });
  // At the fitted frame the cover size is the frame itself — no crop is left.
  const fitted = fitContain({ width: 1600, height: 900 }, screen);
  const cover = coverSize({ width: 1600, height: 900 }, fitted);
  assert.equal(cover.width, fitted.width);
  assert.equal(cover.height, fitted.height);
});

test('ImageViewer interpolates the flight between the thumbnail and the fitted rect', () => {
  const from = { x: 20, y: 500, width: 100, height: 100 };
  const to = { x: 0, y: 287.5, width: 400, height: 225 };
  assert.deepEqual(lerpRect(from, to, 0), from);
  assert.deepEqual(lerpRect(from, to, 1), to);
  assert.deepEqual(lerpRect(from, to, 0.5), { x: 10, y: 393.75, width: 250, height: 162.5 });
});

test('ImageViewer stretches past a limit with resistance and never reaches the dimension', () => {
  assert.equal(rubberBandClamp(50, 0, 100, 400), 50);
  const past = rubberBandClamp(300, 0, 100, 400);
  assert.ok(past > 100 && past < 300, `expected resistance, got ${past}`);
  const below = rubberBandClamp(-1000, 0, 100, 400);
  assert.ok(below < 0 && below > -400, `expected resistance below, got ${below}`);
});

test('ImageViewer only lets a zoomed image move as far as its edges', () => {
  assert.equal(panBound(400, 1, 400), 0);
  assert.equal(panBound(400, 2, 400), 200);
  assert.equal(panBound(225, 2, 800), 0);
});

test('ImageViewer keeps the point under the fingers still while the scale changes', () => {
  // Pinching at 100pt right of centre from scale 1 to 2 moves the image 100pt left.
  assert.equal(focalTranslation(100, 100, 1, 2), -100);
  // The same point, already offset, keeps tracking the fingers as they move.
  assert.equal(focalTranslation(150, 100, 1, 2), -50);
});

test('ImageViewer turns at most one page, from where a flick was heading', () => {
  const width = 416;
  assert.equal(snapPage(-100, 0, 0, 5, width), 0);
  assert.equal(snapPage(-100, -1200, 0, 5, width), 1);
  assert.equal(snapPage(-300, 0, 0, 5, width), 1);
  assert.equal(snapPage(-width * 3, -8000, 1, 5, width), 2);
  assert.equal(snapPage(50, 900, 0, 5, width), 0);
  assert.equal(snapPage(-width * 4 - 50, -900, 4, 5, width), 4);
  assert.equal(snapPage(0, 0, 0, 1, width), 0);
});

test('ImageViewer closes on a long drag or a flick, and not on a throw back', () => {
  assert.equal(shouldDismiss(40, 0), false);
  assert.equal(shouldDismiss(140, 0), true);
  assert.equal(shouldDismiss(40, 900), true);
  assert.equal(shouldDismiss(-140, 0), true);
  assert.equal(shouldDismiss(120, -1200), false);
});

test('ImageViewer fades the backdrop and shrinks the picture as it is dragged away', () => {
  assert.equal(dragFade(0, 800), 1);
  assert.ok(dragFade(320, 800) < 0.2);
  assert.equal(dragScale(0, 800), 1);
  assert.equal(dragScale(800, 800), 0.8);
  assert.equal(dragScale(-4000, 800), 0.8);
});

test('ImageViewer tells a tap on the picture from a tap on the backdrop', () => {
  const rect = { x: 0, y: 287.5, width: 400, height: 225 };
  assert.equal(hitsRect(200, 400, rect, 1, 0, 0), true);
  assert.equal(hitsRect(200, 100, rect, 1, 0, 0), false);
  assert.equal(hitsRect(200, 100, rect, 3, 0, 0), true);
});

test('ImageViewer gestures stay whole chains so every handler runs on the UI thread', () => {
  const source = fs.readFileSync(
    fileURLToPath(new URL('../src/components/image-viewer/index.tsx', import.meta.url)),
    'utf8'
  );
  for (const type of ['Pinch', 'Pan', 'Tap']) {
    assert.doesNotMatch(
      source,
      new RegExp(`=\\s*Gesture\\.${type}\\(\\);`),
      `Gesture.${type}() must not be assigned before its handlers are chained`
    );
  }
  const handlers = source.match(/\.on(Start|Update|End)\(\(/g) ?? [];
  const worklets = source.match(/\.on(Start|Update|End)\(\([^)]*\)\s*=>\s*\{\s*'worklet';/g) ?? [];
  assert.ok(handlers.length > 0);
  assert.equal(worklets.length, handlers.length, 'every gesture handler declares itself a worklet');
  assert.match(source, /accessibilityRole="imagebutton"/);
  assert.match(source, /accessibilityViewIsModal/);
  assert.match(source, /useBackHandler\(isOpen, requestClose\)/);
});
