import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BREADCRUMB_ELLIPSIS,
  collapseBreadcrumbItems,
} from '../src/components/breadcrumb/collapse.ts';

const indexes = (count) => Array.from({ length: count }, (_, index) => index);

test('an unfixed trail keeps every crumb', () => {
  assert.deepEqual(collapseBreadcrumbItems(4), indexes(4));
  assert.deepEqual(collapseBreadcrumbItems(0), []);
});

test('a trail at or under the ceiling is left whole', () => {
  assert.deepEqual(collapseBreadcrumbItems(4, { maxItems: 4 }), indexes(4));
  assert.deepEqual(collapseBreadcrumbItems(3, { maxItems: 5 }), indexes(3));
});

test('a deep trail keeps its first and last crumb and folds the middle', () => {
  assert.deepEqual(collapseBreadcrumbItems(6, { maxItems: 4 }), [0, BREADCRUMB_ELLIPSIS, 5]);
});

test('the ends stay even when the ceiling is smaller than they are', () => {
  // maxItems says when to start folding, not how short the result must be.
  assert.deepEqual(collapseBreadcrumbItems(7, { maxItems: 2 }), [0, BREADCRUMB_ELLIPSIS, 6]);
});

test('the head and tail counts are honoured', () => {
  assert.deepEqual(collapseBreadcrumbItems(8, {
    maxItems: 5,
    itemsBeforeCollapse: 2,
    itemsAfterCollapse: 2,
  }), [0, 1, BREADCRUMB_ELLIPSIS, 6, 7]);
});

test('a fold that hides only one crumb saves nothing, so it does not happen', () => {
  // Three crumbs, a ceiling of two: keeping one at each end and an ellipsis is
  // the same three slots, and the hidden crumb is more useful than the dots.
  assert.deepEqual(collapseBreadcrumbItems(3, { maxItems: 2 }), indexes(3));
  assert.deepEqual(collapseBreadcrumbItems(3, {
    maxItems: 2,
    itemsBeforeCollapse: 1,
    itemsAfterCollapse: 1,
  }), indexes(3));
});

test('there is always a first and a last, whatever is asked for', () => {
  assert.deepEqual(collapseBreadcrumbItems(6, {
    maxItems: 3,
    itemsBeforeCollapse: 0,
    itemsAfterCollapse: 0,
  }), [0, BREADCRUMB_ELLIPSIS, 5]);
});

test('a trailing count that leaves no room is treated as a saved end', () => {
  // Four kept from the end of a five-crumb trail leaves no room for a fold.
  assert.deepEqual(collapseBreadcrumbItems(5, {
    maxItems: 1,
    itemsBeforeCollapse: 1,
    itemsAfterCollapse: 4,
  }), indexes(5));
});

test('a count that is not a whole number of crumbs is made safe', () => {
  assert.deepEqual(collapseBreadcrumbItems(3.9), indexes(3));
  assert.deepEqual(collapseBreadcrumbItems(Number.NaN), []);
  assert.deepEqual(collapseBreadcrumbItems(-2), []);
});
