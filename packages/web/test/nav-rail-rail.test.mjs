import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  indicatorBox,
  isRovingKey,
  railWidth,
  rovingIndex,
  textOf,
} from '../src/components/nav-rail/rail.ts';

test('the rail takes the width its state asks for', () => {
  assert.equal(railWidth(false, '15rem', '3.5rem'), '15rem');
  assert.equal(railWidth(true, '15rem', '3.5rem'), '3.5rem');
  assert.equal(railWidth(false, 240, 56), '240px');
  assert.equal(railWidth(true, 240, 56), '56px');
  assert.equal(railWidth(true, 240, -20), '0px');
});

test('the indicator is placed in the scrolling content, not the viewport', () => {
  const rail = { top: 40, left: 100, width: 240, height: 400 };
  const item = { top: 128, left: 108, width: 224, height: 40 };
  assert.deepEqual(indicatorBox(rail, item), { x: 8, y: 88, width: 224, height: 40 });
  assert.deepEqual(indicatorBox(rail, item, { x: 0, y: 64 }), { x: 8, y: 152, width: 224, height: 40 });
});

test('the pill stays in the rail when a row is scrolled out of view', () => {
  const rail = { top: 40, left: 100, width: 240, height: 400 };
  const item = { top: 12, left: 108, width: 224, height: 40 };
  const box = indicatorBox(rail, item, { x: 0, y: 64 });
  assert.equal(box.y, 36);
});

test('arrows wrap, skip disabled rows and step over a gap', () => {
  assert.equal(rovingIndex('ArrowDown', 0, [false, false, false]), 1);
  assert.equal(rovingIndex('ArrowDown', 2, [false, false, false]), 0);
  assert.equal(rovingIndex('ArrowUp', 0, [false, false, false]), 2);
  assert.equal(rovingIndex('ArrowDown', 0, [false, true, false]), 2);
  assert.equal(rovingIndex('ArrowUp', 0, [false, true, false]), 2);
  assert.equal(rovingIndex('ArrowDown', 1, [false, false, false, true, false]), 2);
});

test('Home and End look inward past a disabled end', () => {
  assert.equal(rovingIndex('Home', 2, [true, false, false]), 1);
  assert.equal(rovingIndex('End', 0, [false, false, true]), 1);
  assert.equal(rovingIndex('Home', 2, [false, false, false]), 0);
  assert.equal(rovingIndex('End', 0, [false, false, false]), 2);
});

test('a rail with nothing reachable has nowhere to go', () => {
  assert.equal(rovingIndex('ArrowDown', 0, []), null);
  assert.equal(rovingIndex('ArrowDown', 0, [true, true]), null);
  assert.equal(rovingIndex('Home', 0, [true, true]), null);
  assert.equal(rovingIndex('Enter', 0, [false, false]), null);
});

test('only the four movement keys belong to the rail', () => {
  assert.ok(isRovingKey('ArrowDown'));
  assert.ok(isRovingKey('ArrowUp'));
  assert.ok(isRovingKey('Home'));
  assert.ok(isRovingKey('End'));
  assert.equal(isRovingKey('ArrowRight'), false);
  assert.equal(isRovingKey('Enter'), false);
});

test('a folded row keeps a name from its text children', () => {
  assert.equal(textOf('Inbox'), 'Inbox');
  assert.equal(textOf(['Inbox ', 12]), 'Inbox 12');
  assert.equal(textOf('   '), undefined);
  assert.equal(textOf({}), undefined);
});
