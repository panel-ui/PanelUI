import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashTarget, sectionAt } from '../src/components/table-of-contents/spy.ts';

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
