import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RESTING_VELOCITY,
  bandHeight,
  collapseProgress,
  snapTarget,
} from '../src/components/scroll-header/scroll-header-math.ts';

const BAR = 92;
const LARGE = 120;

test('the crossfade runs from the first point of scroll to the last of the block', () => {
  assert.equal(collapseProgress(0, LARGE, 1), 0);
  assert.equal(collapseProgress(60, LARGE, 1), 0.5);
  assert.equal(collapseProgress(LARGE, LARGE, 1), 1);

  // Past either end it stays at that end rather than running on.
  assert.equal(collapseProgress(-200, LARGE, 1), 0);
  assert.equal(collapseProgress(LARGE * 4, LARGE, 1), 1);
});

test('a threshold shortens the crossfade without moving the block', () => {
  assert.equal(collapseProgress(60, LARGE, 0.5), 1);
  assert.equal(collapseProgress(30, LARGE, 0.5), 0.5);

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
  assert.equal(bandHeight(BAR, LARGE, 0, false), BAR + LARGE);
  assert.equal(bandHeight(BAR, LARGE, 40, false), BAR + 80);
  assert.equal(bandHeight(BAR, LARGE, LARGE, false), BAR);
});

test('the band never collapses past the bar, however far the content runs', () => {
  for (const offset of [LARGE, LARGE + 1, 5000]) {
    assert.equal(bandHeight(BAR, LARGE, offset, true), BAR);
    assert.equal(bandHeight(BAR, LARGE, offset, false), BAR);
  }
});

test('stretch is the only thing that lets the band grow past its resting height', () => {
  assert.equal(bandHeight(BAR, LARGE, -50, true), BAR + LARGE + 50);
  assert.equal(bandHeight(BAR, LARGE, -50, false), BAR + LARGE);
  // And with nothing to stretch it is still the bar, not a negative band.
  assert.equal(bandHeight(BAR, 0, 0, true), BAR);
});

test('a part-scrolled band settles towards whichever end is nearer', () => {
  assert.equal(snapTarget(LARGE / 2 - 1, LARGE, 0), 0);
  assert.equal(snapTarget(LARGE / 2, LARGE, 0), LARGE);
  assert.equal(snapTarget(LARGE - 10, LARGE, 0), LARGE);
});

test('a band that is already at an end, or still moving, is left alone', () => {
  assert.equal(snapTarget(0, LARGE, 0), null);
  assert.equal(snapTarget(LARGE, LARGE, 0), null);
  assert.equal(snapTarget(400, LARGE, 0), null);
  assert.equal(snapTarget(-30, LARGE, 0), null);

  // A fling has momentum still to run, and settling under it fights the
  // gesture rather than finishing it.
  assert.equal(snapTarget(LARGE / 2, LARGE, RESTING_VELOCITY * 20), null);
  assert.equal(snapTarget(LARGE / 2, LARGE, -RESTING_VELOCITY * 20), null);
  assert.equal(snapTarget(LARGE / 2, LARGE, RESTING_VELOCITY / 2), LARGE);
});

test('there is nothing to settle when there is no large block', () => {
  assert.equal(snapTarget(20, 0, 0), null);
  assert.equal(snapTarget(0.5, 0.6, 0), null);
});

test('a header knows whether it has a block to cross', async () => {
  const { MINIMUM_SPAN, hasSpan } = await import(
    '../src/components/scroll-header/scroll-header-math.ts'
  );
  assert.equal(hasSpan(0), false);
  assert.equal(hasSpan(MINIMUM_SPAN - 0.01), false);
  assert.equal(hasSpan(MINIMUM_SPAN), true);
  assert.equal(hasSpan(180), true);

  // The two agree: where there is no span, the crossing is the step that
  // `collapseProgress` returns, and it is timed rather than interpolated.
  for (const height of [0, MINIMUM_SPAN / 2]) {
    assert.equal(hasSpan(height), false);
    assert.equal(collapseProgress(1, height, 1), 1);
  }
});

test('a mount is not a crossing, and neither is a value that did not change', async () => {
  const { isCrossing } = await import(
    '../src/components/scroll-header/scroll-header-math.ts'
  );
  // The reaction's first run carries null, and a header that has never been
  // anywhere else has not crossed anything.
  assert.equal(isCrossing(false, null), false);
  assert.equal(isCrossing(true, null), false);

  assert.equal(isCrossing(false, false), false);
  assert.equal(isCrossing(true, true), false);

  // Both directions are reported, so a header coming back is as much a
  // crossing as one going.
  assert.equal(isCrossing(true, false), true);
  assert.equal(isCrossing(false, true), true);
});

test('the hand-over is ordered, so nothing is ever legible on top of anything else', async () => {
  const { LARGE_EXIT, SURFACE_ARRIVE, BAR_TITLE_ARRIVE } = await import(
    '../src/components/scroll-header/scroll-header-math.ts'
  );

  // Each step runs forwards over a real distance. A zero-width step is a jump
  // cut, and a reversed one animates backwards.
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

test('the content inset carries the caller\'s own top padding as well as the band', async () => {
  const { contentInset } = await import(
    '../src/components/scroll-header/scroll-header-math.ts'
  );
  // Nothing asked for: the inset is the band, exactly.
  assert.equal(contentInset(BAR + LARGE, undefined), BAR + LARGE);
  assert.equal(contentInset(BAR, null), BAR);

  // A style array overrides rather than adds, so the sum has to be made here
  // or one of the two is lost.
  assert.equal(contentInset(BAR + LARGE, 16), BAR + LARGE + 16);
  assert.equal(contentInset(BAR, 0), BAR);
});

test('padding that cannot be added to leaves the inset alone rather than being guessed at', async () => {
  const { contentInset } = await import(
    '../src/components/scroll-header/scroll-header-math.ts'
  );
  // A percentage is a real thing to write and not a number to add.
  assert.equal(contentInset(BAR, '10%'), BAR);
  assert.equal(contentInset(BAR, Number.NaN), BAR);
  assert.equal(contentInset(BAR, Number.POSITIVE_INFINITY), BAR);
  // Padding is never negative, and an inset shorter than the band would put
  // content under the bar.
  assert.equal(contentInset(BAR, -40), BAR);
});
