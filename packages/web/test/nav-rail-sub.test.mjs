import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activeRowIndex,
  rovingRow,
  subKeyAction,
  visibleIndexes,
} from '../src/components/nav-rail/rail.ts';

/** A row with the quiet defaults, so each test names only what it is about. */
const row = (overrides = {}) => ({
  active: false,
  disabled: false,
  hidden: false,
  branch: false,
  expanded: false,
  childActive: false,
  nested: false,
  ...overrides,
});

/*
 * The rail reads a parent and its children as one list. A closed list is not
 * merely out of sight: its rows are not places the arrow keys can land, and
 * Home and End have to find the last row that is actually drawn.
 */
test('a closed child list is not part of the visible order', () => {
  const rows = [
    row({ branch: true }),
    row({ nested: true, hidden: true }),
    row({ nested: true, hidden: true }),
    row(),
    row(),
  ];
  assert.deepEqual(visibleIndexes(rows), [0, 3, 4]);
  assert.equal(rovingRow('ArrowDown', 0, rows), 3);
  assert.equal(rovingRow('ArrowUp', 3, rows), 0);
  assert.equal(rovingRow('End', 0, rows), 4);
  assert.equal(rovingRow('Home', 4, rows), 0);
});

test('an open child list joins the same arrow-key order', () => {
  const rows = [
    row({ branch: true, expanded: true }),
    row({ nested: true }),
    row({ nested: true, active: true }),
    row(),
  ];
  assert.deepEqual(visibleIndexes(rows), [0, 1, 2, 3]);
  assert.equal(rovingRow('ArrowDown', 0, rows), 1);
  assert.equal(rovingRow('ArrowDown', 2, rows), 3);
  assert.equal(rovingRow('ArrowUp', 3, rows), 2);
  assert.equal(rovingRow('End', 0, rows), 3);
});

test('disabled children are stepped over but hidden ones are not candidates', () => {
  const rows = [
    row({ branch: true }),
    row({ nested: true, hidden: true, disabled: true }),
    row({ nested: true, hidden: true }),
    row({ disabled: true }),
    row(),
  ];
  assert.equal(rovingRow('ArrowDown', 0, rows), 4);
  assert.equal(rovingRow('End', 0, rows), 4);
});

test('a row hidden on its own is still skipped', () => {
  const rows = [row(), row({ hidden: true }), row()];
  assert.equal(rovingRow('ArrowDown', 0, rows), 2);
  assert.deepEqual(visibleIndexes([]), []);
  assert.equal(rovingRow('ArrowDown', 0, []), null);
});

/*
 * There is one pill and it has to have a home. A visible active child wins; an
 * active child that is folded away hands the pill to its parent so the rail
 * still says where the reader is.
 */
test('the visible active child takes the pill', () => {
  const rows = [
    row({ branch: true, expanded: true, childActive: true }),
    row({ nested: true }),
    row({ nested: true, active: true }),
  ];
  assert.equal(activeRowIndex(rows), 2);
});

test('a parent holds the pill while its active child is closed away', () => {
  const rows = [
    row(),
    row({ branch: true, childActive: true }),
    row({ nested: true, active: true, hidden: true }),
  ];
  assert.equal(activeRowIndex(rows), 1);
});

test('a folded list hides even an open child, so the parent keeps the pill', () => {
  // Folded, the child list is a flyout: its rows are drawn outside the rail's
  // own order and the pill stays where the rail is.
  const rows = [
    row({ branch: true, expanded: true, childActive: true }),
    row({ nested: true, active: true, hidden: true }),
    row(),
  ];
  assert.equal(activeRowIndex(rows), 0);
});

test('a top-level active row beats a parent marker', () => {
  const rows = [row({ branch: true, childActive: true }), row({ active: true })];
  assert.equal(activeRowIndex(rows), 1);
  assert.equal(activeRowIndex([row(), row()]), null);
});

test('Right opens a closed list and steps into an open one', () => {
  assert.equal(subKeyAction('ArrowRight', row({ branch: true })), 'open');
  assert.equal(subKeyAction('ArrowRight', row({ branch: true, expanded: true })), 'enter');
  assert.equal(subKeyAction('ArrowRight', row()), null);
});

test('Left closes the list a child sits in and a parent owns', () => {
  assert.equal(subKeyAction('ArrowLeft', row({ nested: true })), 'close');
  assert.equal(subKeyAction('ArrowLeft', row({ branch: true, expanded: true })), 'close');
  assert.equal(subKeyAction('ArrowLeft', row({ branch: true })), null);
  assert.equal(subKeyAction('ArrowLeft', row()), null);
});

test('Escape closes a child list but leaves a plain destination alone', () => {
  assert.equal(subKeyAction('Escape', row({ nested: true })), 'close');
  assert.equal(subKeyAction('Escape', row({ branch: true })), 'close');
  assert.equal(subKeyAction('Escape', row()), null);
  assert.equal(subKeyAction('Enter', row({ branch: true, expanded: true })), null);
});
