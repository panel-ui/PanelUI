import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/components/number-input/number-input-repeat.ts', import.meta.url),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createRepeater } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

const DELAY = 400;
const INTERVAL = 80;

// Advance in small increments: a timer scheduled inside one `tick` does not
// fire within that same tick, so one large jump would skip the intervals the
// delay timer schedules.
function advance(t, ms) {
  for (let elapsed = 0; elapsed < ms; elapsed += 10) t.mock.timers.tick(10);
}

function counter(limit = Infinity) {
  const state = { steps: 0 };
  state.step = () => {
    state.steps += 1;
    return state.steps < limit;
  };
  return state;
}

test('a tap steps once and nothing follows the release', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter();

  repeater.start(c.step);
  repeater.stop();
  advance(t, 5000);

  assert.equal(c.steps, 1);
});

test('holding repeats after the delay, then stops on release', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter();

  repeater.start(c.step);
  advance(t, DELAY + INTERVAL * 3);
  assert.equal(c.steps, 4);

  repeater.stop();
  advance(t, 5000);
  assert.equal(c.steps, 4);
});

test('press-ins with no release between them leave no timer behind', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter();

  // Five quick taps where only the last one's release arrives.
  for (let i = 0; i < 5; i++) {
    repeater.start(c.step);
    advance(t, 100);
  }
  repeater.stop();
  advance(t, 5000);

  assert.equal(c.steps, 5);
});

test('a second press-in replaces a repeat that is already running', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter();

  repeater.start(c.step);
  advance(t, DELAY + INTERVAL);
  assert.equal(c.steps, 2);

  repeater.start(c.step);
  repeater.stop();
  advance(t, 5000);
  assert.equal(c.steps, 3);
});

test('the repeat stops itself when no further step is possible', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter(3);

  // No release at all, as from a button that disabled mid-hold.
  repeater.start(c.step);
  advance(t, DELAY + INTERVAL * 20);

  assert.equal(c.steps, 3);
});

test('a first step that cannot move starts no timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const repeater = createRepeater(DELAY, INTERVAL);
  const c = counter(1);

  repeater.start(c.step);
  advance(t, 5000);

  assert.equal(c.steps, 1);
});
