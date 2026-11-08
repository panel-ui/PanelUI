import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BAR_TITLE_ARRIVE,
  LARGE_EXIT,
  MINIMUM_SPAN,
  SURFACE_ARRIVE,
  bandHeight,
  clampOffset,
  collapseProgress,
  contentShift,
  hasSpan,
  isCrossing,
  ramp,
  snapTarget,
  stretchOf,
} from '../src/components/scroll-header/scroll-header-math.ts';

const BAR = 56;
const LARGE = 180;

test('the collapse runs from the first point of scroll to the last of the block', () => {
  assert.equal(collapseProgress(0, LARGE, 1), 0);
  assert.equal(collapseProgress(LARGE / 2, LARGE, 1), 0.5);
  assert.equal(collapseProgress(LARGE, LARGE, 1), 1);

  // Past either end it stays at that end rather than running on.
  assert.equal(collapseProgress(-200, LARGE, 1), 0);
  assert.equal(collapseProgress(LARGE * 4, LARGE, 1), 1);
});

test('a threshold shortens the collapse without moving the block', () => {
  assert.equal(collapseProgress(LARGE / 2, LARGE, 0.5), 1);
  assert.equal(collapseProgress(LARGE / 4, LARGE, 0.5), 0.5);

  // The floor is what keeps it a crossfade: at zero it would be a jump cut.
  assert.equal(collapseProgress(LARGE * 0.05, LARGE, 0), 1);
  assert.ok(collapseProgress(1, LARGE, 0) < 1);
});

test('with no large block the bar takes over on the first point of scroll', () => {
  assert.equal(collapseProgress(0, 0, 1), 0);
  assert.equal(collapseProgress(1, 0, 1), 1);
  // A block too short to measure is no block, not a division by nearly zero.
  assert.equal(collapseProgress(1, 0.4, 1), 1);
  assert.equal(collapseProgress(-1, 0, 1), 0);
});

test('the band is the bar plus whatever the block has left', () => {
  assert.equal(bandHeight(BAR, LARGE, 0), BAR + LARGE);
  assert.equal(bandHeight(BAR, LARGE, 40), BAR + LARGE - 40);
  assert.equal(bandHeight(BAR, LARGE, LARGE), BAR);
});

test('the band never shrinks past the bar, however far the content runs', () => {
  for (const offset of [LARGE, LARGE + 1, 5000]) {
    assert.equal(bandHeight(BAR, LARGE, offset), BAR);
    assert.equal(bandHeight(BAR, LARGE, offset, 0), BAR);
  }
});

test('the block is carried up exactly as far as the band shrank', () => {
  // The invariant the layout depends on: the block's bottom edge and the
  // band's bottom edge are the same line at every offset, so the article
  // underneath is never left with a gap or overlapped by the header.
  for (const offset of [-80, 0, 1, LARGE / 3, LARGE / 2, LARGE - 1, LARGE, LARGE + 90]) {
    for (const stretchPx of [0, 30]) {
      assert.equal(
        BAR + LARGE + contentShift(offset, LARGE, stretchPx),
        bandHeight(BAR, LARGE, offset, stretchPx),
        `offset ${offset}, stretch ${stretchPx}`
      );
    }
  }
});

test('the band shrinks as the content moves and never turns round', () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let offset = 0; offset <= LARGE; offset += 5) {
    const height = bandHeight(BAR, LARGE, offset);
    assert.ok(height <= previous, `height grew at ${offset}`);
    previous = height;
  }
});

test('stretch is the one thing that lets the band grow past its resting height', () => {
  assert.equal(stretchOf(-50, true), 50);
  assert.equal(stretchOf(-50, false), 0);
  assert.equal(stretchOf(0, true), 0);
  assert.equal(stretchOf(40, true), 0);

  assert.equal(bandHeight(BAR, LARGE, -50, stretchOf(-50, true)), BAR + LARGE + 50);
  assert.equal(bandHeight(BAR, LARGE, -50, 0), BAR + LARGE);
  // And with nothing to stretch it is still the bar, not a negative band.
  assert.equal(bandHeight(BAR, 0, 0, 30), BAR + 30);
});

test('an offset is travel only between the two ends of the block', () => {
  assert.equal(clampOffset(-40, LARGE), 0);
  assert.equal(clampOffset(0, LARGE), 0);
  assert.equal(clampOffset(90, LARGE), 90);
  assert.equal(clampOffset(LARGE + 40, LARGE), LARGE);
  // A block that has not measured yet cannot carry anything.
  assert.equal(clampOffset(90, 0), 0);
});

test('a part-scrolled band settles towards whichever end is nearer', () => {
  assert.equal(snapTarget(LARGE / 2 - 1, LARGE), 0);
  assert.equal(snapTarget(LARGE / 2, LARGE), LARGE);
  assert.equal(snapTarget(LARGE - 10, LARGE), LARGE);
});

test('a band already at an end, or with no block, is left alone', () => {
  assert.equal(snapTarget(0, LARGE), null);
  assert.equal(snapTarget(LARGE, LARGE), null);
  assert.equal(snapTarget(400, LARGE), null);
  assert.equal(snapTarget(-30, LARGE), null);

  assert.equal(snapTarget(20, 0), null);
  assert.equal(snapTarget(0.5, MINIMUM_SPAN * 0.6), null);
});

test('a header knows whether it has a block to cross', () => {
  assert.equal(hasSpan(0), false);
  assert.equal(hasSpan(MINIMUM_SPAN - 0.01), false);
  assert.equal(hasSpan(MINIMUM_SPAN), true);
  assert.equal(hasSpan(180), true);
});

test('a mount is not a crossing, and neither is a value that did not change', () => {
  assert.equal(isCrossing(false, null), false);
  assert.equal(isCrossing(true, null), false);

  assert.equal(isCrossing(false, false), false);
  assert.equal(isCrossing(true, true), false);

  // Both directions are reported, so a header coming back is as much a
  // crossing as one going.
  assert.equal(isCrossing(true, false), true);
  assert.equal(isCrossing(false, true), true);
});

test('a ramp is clamped at both ends and runs forwards', () => {
  assert.equal(ramp(0, [0.2, 0.8]), 0);
  assert.equal(ramp(0.2, [0.2, 0.8]), 0);
  assert.ok(Math.abs(ramp(0.5, [0.2, 0.8]) - 0.5) < 1e-9);
  assert.equal(ramp(0.8, [0.2, 0.8]), 1);
  assert.equal(ramp(1, [0.2, 0.8]), 1);

  // A zero-width step is a jump cut, not a division by zero.
  assert.equal(ramp(0.4, [0.5, 0.5]), 0);
  assert.equal(ramp(0.5, [0.5, 0.5]), 1);
});

test('the hand-over is ordered, so nothing is legible on top of anything else', () => {
  for (const step of [LARGE_EXIT, SURFACE_ARRIVE, BAR_TITLE_ARRIVE]) {
    assert.equal(step.length, 2);
    assert.ok(step[0] >= 0 && step[1] <= 1, 'a step stays inside the collapse');
    assert.ok(step[1] > step[0], 'a step runs forwards');
  }

  // The block is gone before the bar's surface has finished closing, so it is
  // never seen through a half-transparent bar.
  assert.ok(
    LARGE_EXIT[1] <= SURFACE_ARRIVE[1],
    'the large block leaves before the surface has closed'
  );

  // And the bar's title only starts once the block has gone, so the two titles
  // are never both legible — the defect this ordering exists to prevent.
  assert.ok(
    BAR_TITLE_ARRIVE[0] >= LARGE_EXIT[1],
    'the bar title waits for the large title to leave'
  );
});

test('the helpers leave the frame budget alone', () => {
  // The point of the pure module: every answer is arithmetic on its
  // arguments, so two calls with the same numbers give the same answer.
  assert.equal(collapseProgress(60, 120, 1), collapseProgress(60, 120, 1));
  assert.equal(bandHeight(56, 120, 30), bandHeight(56, 120, 30));
  assert.equal(contentShift(30, 120), contentShift(30, 120));
});
