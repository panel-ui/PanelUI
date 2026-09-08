/**
 * A sheet that cannot be dismissed cannot be dragged away either.
 *
 * Reported from the outside: a `dismissible={false}` sheet still followed the
 * finger and flung itself off the bottom of the screen. The close never
 * happened — a controlled caller declining `onOpenChange(false)` saw to that —
 * so the sheet stayed mounted and open with `translateY` parked at the screen's
 * height. At that position the backdrop interpolates to zero opacity, which
 * leaves a fully transparent overlay swallowing every touch on the screen
 * behind it, and nothing on screen to say why.
 *
 * The backdrop press and the Android back handler were both already gated on
 * `dismissible`, which is what made the drag an oversight rather than a
 * decision. Two guards go in, and both are needed: `.enabled()` keeps the
 * gesture from starting, and the check inside `onEnd` covers the touch that was
 * already in flight when the prop changed, since disabling a gesture does not
 * cancel one.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sheet = await readFile(
  new URL('../src/components/bottom-sheet/index.tsx', import.meta.url),
  'utf8'
);

/** The pan gesture, from `Gesture.Pan()` to the dependency array under it. */
const pan = sheet.slice(
  sheet.indexOf('const pan = useMemo('),
  sheet.indexOf('const sheetStyle = useAnimatedStyle(')
);

test('the drag is off while the sheet is locked', () => {
  assert.match(pan, /Gesture\.Pan\(\)(?:\s|\/\*[\s\S]*?\*\/)*\.enabled\(dismissible\)/);
});

test('a dismiss that reaches onEnd is still checked', () => {
  // Without this the sheet flings away on a decision the caller has revoked,
  // and lands in exactly the stranded state above.
  assert.match(pan, /if \(\s*dismissible &&\s*\(projected > DISMISS_DISTANCE/);
});

test('the gesture is rebuilt when the lock changes', () => {
  // `.enabled()` is read when the gesture is built. Left out of the deps the
  // memo hands back the gesture built under the previous value, and the guard
  // above is a guard on a stale prop.
  const deps = pan.slice(pan.lastIndexOf('['));
  assert.match(deps, /\bdismissible\b/);
});

test('the other two ways out stay gated', () => {
  // The drag was the odd one out. If either of these ever stops matching, the
  // inconsistency is back and the drag guard is no longer the whole fix.
  assert.match(sheet, /useBackHandler\(open && dismissible, close\)/);
  assert.match(sheet, /onPress=\{dismissible \? close : undefined\}/);
});
