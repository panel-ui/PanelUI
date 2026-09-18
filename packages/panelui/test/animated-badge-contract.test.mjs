import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/animated-badge/index.tsx', import.meta.url),
  'utf8'
);

test('the width spring is armed by a change, not by mounting', () => {
  /*
   * The pill's first *measured* layout lands a frame or two after the first
   * render, so a spring switched on at mount catches that settling: the badge
   * appears, drifts, and stops, on every screen that shows one. Reported twice.
   *
   * Arming on the first real change needs nothing guessed about when layout
   * has finished — until the status or the word moves there is nothing the
   * spring is for.
   */
  assert.match(source, /const \[armed, setArmed\] = useState\(false\)/);
  assert.match(source, /if \(key !== first\.current\) setArmed\(true\)/);
  assert.match(source, /reducedMotion \|\| !armed \|\| !animateLayout\s*\?\s*undefined/);
  assert.doesNotMatch(source, /!mounted\s*\?\s*undefined/);
});

test('the layout spring can be turned off, and is on until it is', () => {
  /*
   * The spring covers position as well as width, so a badge set inside a
   * paragraph slides across a line the text engine has already finished laying
   * out — the figure changes and the pill comes loose from the sentence.
   *
   * Off by opting out, not by opting in: a badge standing on its own is the
   * common case, and there the spring is what stops it shoving its neighbours
   * in a single frame.
   */
  assert.match(source, /animateLayout\?: boolean;/);
  assert.match(source, /animateLayout = true,/);
});

test('the pill draws no ring', () => {
  // A ring needs a colour per status and there is no token for one. `border`
  // alone resolves to the current text colour, which came out as a black
  // outline on every badge in every theme.
  assert.doesNotMatch(source, /root: '[^']*\bborder\b/);
  assert.doesNotMatch(source, /border-(info|success|warning|destructive)\//);
});

test('loading draws its own ring rather than borrowing one', () => {
  /*
   * It used to override `Spinner`'s size with an arbitrary border width. The
   * class merge dropped the base `border-2`, the arbitrary value did not
   * compile, and what was left was a ring with no border — an empty hole where
   * the glyph belongs.
   */
  assert.match(source, /function LoadingRing\(/);
  assert.doesNotMatch(source, /from '\.\.\/spinner'/);
  assert.doesNotMatch(source, /border-\[1\.5px\]/);

  // Sized and coloured from values, so nothing depends on a class compiling.
  const ring = source.slice(source.indexOf('function LoadingRing'));
  assert.match(ring.slice(0, 1600), /borderWidth: Math\.max\(1, Math\.round\(size \/ 8\)\)/);
  assert.match(ring.slice(0, 1600), /borderTopColor: color/);
});

test("a caller's glyph takes the status colour", () => {
  // An icon from any set reads the ambient colour, which is its own set's grey
  // unless the badge provides one.
  assert.match(source, /<IconColorProvider color=\{iconColor\}>/);
});

test('a roll interrupted by a change back is sent home', () => {
  // The swap that would bring the element back is never scheduled, so without
  // this the glyph stays parked outside the badge for as long as the status
  // holds — the same empty slot, from the other direction.
  assert.match(
    source,
    /if \(settled\) \{[\s\S]{0,400}if \(phase\.value !== 0\) phase\.value = withSpring\(0, ROLL_IN\)/
  );
});

test('a status outside the six is drawn as neutral rather than crashing', () => {
  /*
   * Every lookup is keyed on the status, so `status={item.synced}` found no
   * icon and rendered `undefined` as a component — "Element type is invalid",
   * with nothing naming the prop that caused it. Reported in #218.
   */
  assert.match(source, /status: statusProp = 'neutral'/);
  assert.match(source, /const status: AnimatedBadgeStatus = isStatus\(statusProp\) \? statusProp : 'neutral'/);
  assert.match(source, /hasOwnProperty\.call\(STATUS_ICON, value\)/);
  assert.match(source, /if \(__DEV__ && !isStatus\(statusProp\)\)/);
});

test('a boolean label gets no slot', () => {
  // `{flag && 'Label'}` leaves `true` or `false`, which React draws as nothing.
  assert.match(source, /children != null && typeof children !== 'boolean'/);
});
