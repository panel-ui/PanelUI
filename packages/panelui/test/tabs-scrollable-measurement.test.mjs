/**
 * What a tab set must not do when there are more tabs than fit.
 *
 * Reported as a flicker on every switch in a long row: the tabs jump back
 * towards the first one and then return to the selected one. Four things in
 * this file could produce that, all of them only reachable once the row is long
 * enough to scroll or the panels are long enough to page, and each one is
 * checked here because none of them is visible in a tab set of three.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../src/components/tabs/index.tsx', import.meta.url),
  'utf8'
);

test('a trigger learns whether it scrolls from the row it is in', () => {
  // Not from the root: routed through root state it arrived a commit after the
  // row was laid out, so every trigger was measured once at its equal-share
  // width and the indicator snapped to that geometry before the real one
  // existed.
  assert.match(source, /const scrollable = useContext\(TabsListContext\);/);
  assert.doesNotMatch(source, /setScrollable/);
});

test('a trigger re-measuring does not hand every other trigger a new onLayout', () => {
  // `registerLayout` is stable; the context around it is not, and depending on
  // it made every measurement update every trigger's props.
  assert.match(source, /const \{ registerLayout \} = context;/);
  assert.match(source, /\[registerLayout, value\]\s*\);/);
});

test('the scroller is put back when its content is laid out again', () => {
  // A horizontal scroller does not reliably keep its offset across a re-layout
  // of its content, and the row is re-laid-out on every switch. Without this
  // the row can be left at zero — showing the first tab — with nothing in the
  // component disagreeing.
  assert.match(source, /onContentSizeChange=\{restore\}/);
  assert.match(source, /scroller\.current\?\.scrollTo\(\{ x: targetRef\.current, animated: false \}\)/);
});

test('the strip is in the right place on the frame it first appears', () => {
  // `widthValue` is mirrored from state in an effect, one commit late, and that
  // commit is the one where the strip mounts: the transform evaluated to
  // `-position × 0`, which is the first panel whichever tab is active.
  assert.match(source, /translateX: -position\.value \* width \* sign/);
  // The list is what the web build rebuilds on; native reads `width` through the worklet's closure.
  assert.match(source, /webDeps\(\[width, sign\]\)\s*\);/);
});

test('a value that is not among the panels holds its place', () => {
  // Falling back to zero springs the strip to the first panel and back for a
  // controlled parent mid-update, which was never a wrong selection.
  assert.match(source, /const resolved = order\.indexOf\(value\);/);
  assert.match(source, /if \(resolved >= 0\) lastResolved\.current = resolved;/);
  assert.doesNotMatch(source, /const active = Math\.max\(0, order\.indexOf\(value\)\);/);
});
