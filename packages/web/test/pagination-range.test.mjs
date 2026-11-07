/**
 * The page-run arithmetic, on its own. These are the answers that go wrong
 * quietly in a pager: a gap that hides one number, a run that changes width
 * as it moves, a page left past the end when the set shrinks.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampPage,
  paginationRange,
  paginationSpan,
} from '../src/components/pagination/pagination-range.ts';

const START = 'start-ellipsis';
const END = 'end-ellipsis';

test('the run keeps its width as the page moves', () => {
  const widths = new Set();
  for (let page = 1; page <= 12; page += 1) {
    const run = paginationRange({ count: 12, page });
    widths.add(run.length);
    assert.ok(run.includes(page), `page ${page} is in its own run`);
  }
  assert.deepEqual([...widths], [7], 'every page draws the same number of targets');
});

test('the first page shows its neighbours and folds the far end', () => {
  assert.deepEqual(paginationRange({ count: 12, page: 1 }), [1, 2, 3, 4, 5, END, 12]);
});

test('a page in the middle folds both ends', () => {
  assert.deepEqual(paginationRange({ count: 12, page: 5 }), [1, START, 4, 5, 6, END, 12]);
});

test('the last page keeps the end visible and folds towards the start', () => {
  assert.deepEqual(paginationRange({ count: 12, page: 12 }), [1, START, 8, 9, 10, 11, 12]);
});

test('boundaries pin a wider strip at each end', () => {
  assert.deepEqual(paginationRange({ count: 20, page: 10, boundaries: 2 }), [
    1,
    2,
    START,
    9,
    10,
    11,
    END,
    19,
    20,
  ]);
});

test('siblings widen the middle', () => {
  assert.deepEqual(paginationRange({ count: 20, page: 10, siblings: 2 }), [
    1,
    START,
    8,
    9,
    10,
    11,
    12,
    END,
    20,
  ]);
});

test('a run that fits is drawn whole, with no gap to fold', () => {
  assert.deepEqual(paginationRange({ count: 7, page: 1 }), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(paginationRange({ count: 6, page: 3 }), [1, 2, 3, 4, 5, 6]);
});

test('a gap of one page is drawn as that page, not as a gap marker', () => {
  assert.deepEqual(paginationRange({ count: 10, page: 8 }), [1, START, 6, 7, 8, 9, 10]);
});

test('a set with no pages draws no run', () => {
  assert.deepEqual(paginationRange({ count: 0, page: 1 }), []);
  assert.deepEqual(paginationRange({ count: -4, page: 1 }), []);
  assert.deepEqual(paginationRange({ count: Number.NaN, page: 1 }), []);
});

test('a short run is every page, in order', () => {
  assert.deepEqual(paginationRange({ count: 1, page: 1 }), [1]);
  assert.deepEqual(paginationRange({ count: 3, page: 2 }), [1, 2, 3]);
});

test('page is clamped into the run before the numbers are chosen', () => {
  assert.deepEqual(paginationRange({ count: 12, page: 0 }), paginationRange({ count: 12, page: 1 }));
  assert.deepEqual(paginationRange({ count: 12, page: 99 }), paginationRange({ count: 12, page: 12 }));
  assert.deepEqual(paginationRange({ count: 12, page: 3.9 }), paginationRange({ count: 12, page: 3 }));
});

test('clampPage holds a page inside a set, in both directions', () => {
  assert.equal(clampPage(0, 12), 1);
  assert.equal(clampPage(-3, 12), 1);
  assert.equal(clampPage(13, 12), 12);
  assert.equal(clampPage(1, 12), 1);
  assert.equal(clampPage(12, 12), 12);
  assert.equal(clampPage(3.9, 12), 3);
});

test('a set with no pages has no page to be on', () => {
  assert.equal(clampPage(5, 0), 0);
  assert.equal(clampPage(5, -3), 0);
  assert.equal(clampPage(Number.NaN, 12), 1);
});

test('count shrinking under a controlled page clamps instead of pointing past the end', () => {
  const page = clampPage(12, 5);
  assert.equal(page, 5);
  assert.deepEqual(paginationRange({ count: 5, page }), [1, 2, 3, 4, 5]);
});

test('every number is unique, in range, and no two gaps sit together', () => {
  for (let count = 1; count <= 30; count += 1) {
    for (let siblings = 1; siblings <= 3; siblings += 1) {
      for (let boundaries = 1; boundaries <= 3; boundaries += 1) {
        for (let page = 1; page <= count; page += 1) {
          const run = paginationRange({ count, page, siblings, boundaries });
          const numbers = run.filter((item) => typeof item === 'number');
          assert.equal(new Set(numbers).size, numbers.length, `unique numbers for ${count}/${page}`);
          assert.ok(
            numbers.every((number) => number >= 1 && number <= count),
            `in range for ${count}/${page}`
          );
          assert.ok(numbers.includes(page), `the current page is drawn for ${count}/${page}`);
          for (let index = 1; index < run.length; index += 1) {
            assert.ok(
              typeof run[index] === 'number' || typeof run[index - 1] === 'number',
              `adjacent gaps for ${count}/${page}`
            );
          }
          assert.equal(typeof run[0], 'number', `starts on a number for ${count}/${page}`);
          assert.equal(typeof run[run.length - 1], 'number', `ends on a number for ${count}/${page}`);
        }
      }
    }
  }
});

test('a status span cuts the last page at the total', () => {
  assert.equal(paginationSpan({ page: 1, pageSize: 20, total: 143 }), '1–20 of 143');
  assert.equal(paginationSpan({ page: 8, pageSize: 20, total: 143 }), '141–143 of 143');
  assert.equal(paginationSpan({ page: 5, pageSize: 20, total: 100 }), '81–100 of 100');
});

test('a status span clamps a page past the end to the last one', () => {
  assert.equal(paginationSpan({ page: 99, pageSize: 20, total: 143 }), '141–143 of 143');
  assert.equal(paginationSpan({ page: 0, pageSize: 20, total: 143 }), '1–20 of 143');
});

test('an empty set says so, and a missing page size has no span', () => {
  assert.equal(paginationSpan({ page: 1, pageSize: 20, total: 0 }), 'No results');
  assert.equal(paginationSpan({ page: 1, pageSize: 0, total: 143 }), null);
});
