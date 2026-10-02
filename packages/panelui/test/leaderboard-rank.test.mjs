import assert from 'node:assert/strict';
import test from 'node:test';
import {
  podiumHeights,
  rankEntries,
} from '../src/components/leaderboard/leaderboard-rank.ts';

const e = (id, value) => ({ id, value });
const places = (ranked) => ranked.map(({ entry, rank }) => `${entry.id}:${rank}`);

test('highest value first by default', () => {
  const ranked = rankEntries([e('a', 10), e('b', 30), e('c', 20)]);
  assert.deepEqual(places(ranked), ['b:1', 'c:2', 'a:3']);
});

test('asc puts the smallest value first', () => {
  const ranked = rankEntries([e('a', 61.2), e('b', 58.9), e('c', 60.4)], 'asc');
  assert.deepEqual(places(ranked), ['b:1', 'c:2', 'a:3']);
});

test('ties share a place and skip the next one', () => {
  const ranked = rankEntries([e('a', 50), e('b', 40), e('c', 40), e('d', 30)]);
  assert.deepEqual(places(ranked), ['a:1', 'b:2', 'c:2', 'd:4']);
  assert.deepEqual(
    ranked.map((r) => r.tied),
    [false, true, true, false]
  );
});

test('equal values keep the order they were passed in', () => {
  const ranked = rankEntries([e('x', 5), e('y', 5), e('z', 5)]);
  assert.deepEqual(places(ranked), ['x:1', 'y:1', 'z:1']);
});

test('a value that is not a finite number has no place', () => {
  const ranked = rankEntries([e('a', 1), e('b', Number.NaN), e('c', Infinity)]);
  assert.deepEqual(places(ranked), ['a:1']);
});

test('the input array is left alone', () => {
  const data = [e('a', 1), e('b', 2)];
  rankEntries(data);
  assert.deepEqual(data.map((d) => d.id), ['a', 'b']);
});

test('value-scaled bars keep a floor and give the leader the full height', () => {
  const [first, second, third] = podiumHeights([100, 50, 1], [1, 2, 3], 'value');
  assert.equal(first, 1);
  assert.equal(second, 0.7);
  assert.ok(third >= 0.4 && third < 0.41);
});

test('rank-scaled bars step by place, ties at the same height', () => {
  assert.deepEqual(podiumHeights([9, 9, 3], [1, 1, 3], 'rank'), [1, 1, 0.56]);
});

test('an all-zero podium does not divide by zero', () => {
  assert.deepEqual(podiumHeights([0, 0], [1, 1], 'value'), [1, 1]);
});
