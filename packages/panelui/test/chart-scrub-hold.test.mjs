/**
 * A chart's readout waits for a held press before it takes the touch.
 *
 * Each chart reads values with a pan gesture over the whole plot. Started with
 * `minDistance(0)` alone, that gesture activates on contact, and an active
 * gesture cancels the touch for everything else under the finger: a Pressable
 * floating over the chart never fires, and a swipe that meant to scroll the
 * screen reads the chart instead. Reported as #260.
 *
 * The contract is the one HeatmapChart already kept: every chart pan that
 * starts on contact also waits for `activateAfterLongPress`, selects in
 * `onStart` (which runs only once the gesture has activated) rather than in
 * `onBegin` (which runs on every touch-down), and is configurable from props.
 */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const COMPONENTS = new URL('../src/components/', import.meta.url);

/** Every pan chain in a source file, from `Gesture.Pan()` to the end of its statement. */
function panChains(source) {
  const chains = [];
  let at = source.indexOf('Gesture.Pan()');
  while (at !== -1) {
    const end = source.indexOf(';', at);
    chains.push(source.slice(at, end === -1 ? undefined : end));
    at = source.indexOf('Gesture.Pan()', at + 1);
  }
  return chains;
}

/** Whether a pan starts on contact: a distance of 0, at least when the hold is off. */
const scrubs = (chain) =>
  chain.includes('.minDistance(0)') || chain.includes('.minDistance(activateAfterLongPress > 0 ?');

async function chartSources() {
  const entries = await readdir(COMPONENTS, { withFileTypes: true });
  const charts = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('-chart') || name === 'plot');
  return Promise.all(
    charts.map(async (name) => ({
      name,
      source: await readFile(new URL(`${name}/index.tsx`, COMPONENTS), 'utf8'),
    }))
  );
}

test('every chart pan that starts on contact waits for a held press', async () => {
  const sources = await chartSources();
  let checked = 0;
  for (const { name, source } of sources) {
    for (const chain of panChains(source)) {
      if (!scrubs(chain)) continue;
      checked += 1;
      // A bare distance of 0 is met by the first move event, which activates
      // the pan before the hold has run and cancels the Pressable above it.
      assert.doesNotMatch(
        chain,
        /\.minDistance\(0\)/,
        `${name}: with a hold, the distance must not let the pan activate on its own`
      );
      assert.match(
        chain,
        /\.activateAfterLongPress\(activateAfterLongPress\)/,
        `${name}: a chart pan with minDistance(0) must wait for activateAfterLongPress`
      );
      assert.doesNotMatch(
        chain,
        /\.onBegin\(/,
        `${name}: select in onStart, not onBegin, or touch-down selects before the hold`
      );
    }
  }
  // Thirteen charts read values this way today. A count that falls means a
  // chain stopped matching, not that the charts stopped scrubbing.
  assert.ok(checked >= 13, `expected at least 13 chart pans, found ${checked}`);
});

test('the hold is a prop with a default on every chart that scrubs', async () => {
  for (const { name, source } of await chartSources()) {
    if (!panChains(source).some(scrubs)) continue;
    assert.match(source, /activateAfterLongPress\?: number;/, `${name}: missing the prop`);
    assert.match(
      source,
      /activateAfterLongPress = DEFAULT_HOLD/,
      `${name}: the prop needs DEFAULT_HOLD as its default`
    );
    assert.match(source, /const DEFAULT_HOLD = \d+;/, `${name}: missing DEFAULT_HOLD`);
  }
});
