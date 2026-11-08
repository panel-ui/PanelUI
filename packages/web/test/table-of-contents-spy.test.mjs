import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contourPath,
  contourWidth,
  hashTarget,
  sectionAt,
  sectionsInView,
} from '../src/components/table-of-contents/spy.ts';

const sections = (...list) => list.map(([value, top, bottom]) => ({ value, top, bottom }));

test('a hash names its element, from a fragment or a whole URL', () => {
  assert.equal(hashTarget('#install'), 'install');
  assert.equal(hashTarget('https://panelui.dev/docs/web/components/tabs#usage'), 'usage');
  assert.equal(hashTarget('#a%20b'), 'a b');
});

test('a link with no hash, an empty one, or no href names nothing', () => {
  assert.equal(hashTarget('/docs/web'), null);
  assert.equal(hashTarget('#'), null);
  assert.equal(hashTarget(''), null);
  assert.equal(hashTarget(undefined), null);
});

test('a malformed escape is still an id worth trying', () => {
  assert.equal(hashTarget('#%E0%A4%A'), '%E0%A4%A');
});

test('the reading line picks the section it falls through', () => {
  const page = sections(['one', 0, 100], ['two', 100, 220], ['three', 220, 400]);
  assert.equal(sectionAt(page, 0), 'one');
  assert.equal(sectionAt(page, 99), 'one');
  assert.equal(sectionAt(page, 100), 'two');
  assert.equal(sectionAt(page, 219), 'two');
  assert.equal(sectionAt(page, 220), 'three');
});

test('a line in a gap belongs to the section most recently passed', () => {
  const page = sections(['one', 0, 100], ['two', 140, 220]);
  assert.equal(sectionAt(page, 120), 'one');
});

test('a line above the page belongs to its first section, and one below to its last', () => {
  const page = sections(['one', 80, 160], ['two', 240, 320]);
  assert.equal(sectionAt(page, 0), 'one');
  assert.equal(sectionAt(page, 200), 'one');
  assert.equal(sectionAt(page, 900), 'two');
});

test('sections are ordered by where they start, not by how they were written', () => {
  const page = sections(['late', 200, 300], ['early', 0, 90]);
  assert.equal(sectionAt(page, 20), 'early');
  assert.equal(sectionAt(page, 250), 'late');
});

test('no sections, or a page of flat ones, resolves without inventing a section', () => {
  assert.equal(sectionAt([], 50), undefined);
  assert.equal(sectionAt(sections(['only', 100, 100]), 100), 'only');
});

test('the sections in view run from the one at the line to the last above the floor', () => {
  const page = sections(['a', -200, -180], ['b', 40, 60], ['c', 300, 320], ['d', 900, 920]);
  // The line is in `a`, whose heading has scrolled away; `b` and `c` are on screen.
  assert.deepEqual(sectionsInView(page, 16, 800), ['a', 'b', 'c']);
  // Past `b`'s heading, `a` is no longer read.
  assert.deepEqual(sectionsInView(page, 50, 800), ['b', 'c']);
  // A short viewport holds only the current section.
  assert.deepEqual(sectionsInView(page, 50, 200), ['b']);
  assert.deepEqual(sectionsInView([], 0, 800), []);
});

test('the contour runs straight down a level and bends where the level changes', () => {
  const rows = [
    { top: 0, bottom: 28, depth: 0 },
    { top: 28, bottom: 56, depth: 1 },
    { top: 56, bottom: 84, depth: 1 },
    { top: 84, bottom: 112, depth: 0 },
  ];
  assert.equal(
    contourPath(rows, 10, 5),
    'M0.5 0 L0.5 23 C0.5 28 10.5 28 10.5 33 L10.5 79 C10.5 84 0.5 84 0.5 89 L0.5 112'
  );
  // One level all the way down is one straight line.
  assert.equal(
    contourPath(
      [
        { top: 0, bottom: 20, depth: 0 },
        { top: 20, bottom: 40, depth: 0 },
      ],
      10,
      5
    ),
    'M0.5 0 L0.5 40'
  );
  assert.equal(contourPath([], 10, 5), '');
});

test('a bend is never taller than half of the rows it joins', () => {
  const rows = [
    { top: 0, bottom: 4, depth: 0 },
    { top: 4, bottom: 8, depth: 2 },
  ];
  assert.equal(contourPath(rows, 10, 5), 'M0.5 0 L0.5 2 C0.5 4 20.5 4 20.5 6 L20.5 8');
});

test('the drawing is as wide as the deepest level plus the stroke', () => {
  assert.equal(contourWidth([{ top: 0, bottom: 1, depth: 0 }], 10), 2);
  assert.equal(
    contourWidth(
      [
        { top: 0, bottom: 1, depth: 0 },
        { top: 1, bottom: 2, depth: 3 },
      ],
      10
    ),
    32
  );
});
