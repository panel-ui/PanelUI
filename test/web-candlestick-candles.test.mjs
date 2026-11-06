/**
 * The arithmetic behind the web Candlestick Chart. A wrong domain or a skipped
 * period draws a plausible chart of the wrong prices, so it is pinned here.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  candleExtent,
  candlesOf,
  changeOf,
  labelledPeriods,
  priceTicks,
} from '../packages/web/src/components/candlestick-chart/candles.ts';

const KEYS = { open: 'o', high: 'h', low: 'l', close: 'c' };

test('a row missing a price is skipped and its neighbours keep their places', () => {
  const candles = candlesOf(
    [
      { o: 10, h: 12, l: 9, c: 11 },
      { o: 11, h: null, l: 10, c: 11 },
      { o: 11, h: 12, l: Number.NaN, c: 10 },
      { o: 11, h: 12, l: 9, c: 10 },
    ],
    KEYS
  );
  assert.deepEqual(candles.map(({ index }) => index), [0, 3]);
});

test('a period that closed where it opened counts as rising', () => {
  const [flat, falling] = candlesOf(
    [
      { o: 10, h: 11, l: 9, c: 10 },
      { o: 10, h: 11, l: 9, c: 9.5 },
    ],
    KEYS
  );
  assert.equal(flat.rising, true);
  assert.equal(falling.rising, false);
});

test('the domain runs low to high with a margin and does not reach for zero', () => {
  const candles = candlesOf([{ o: 180, h: 183, l: 178, c: 181 }], KEYS);
  assert.deepEqual(candleExtent(candles), [177.5, 183.5]);
});

test('a series too long to spread into arguments still has a domain', () => {
  const candles = Array.from({ length: 200_000 }, (_unused, index) => ({ index, open: 5, high: 11, low: 1, close: 5, rising: true }));
  assert.deepEqual(candleExtent(candles), [0, 12]);
});

test('a price that never moved still gets a span, including at zero', () => {
  const flat = (price) => candlesOf([{ o: price, h: price, l: price, c: price }], KEYS);
  assert.deepEqual(candleExtent(flat(100)), [95, 105]);
  assert.deepEqual(candleExtent(flat(0)), [-1, 1]);
  assert.deepEqual(candleExtent([]), [0, 1]);
});

test('price ticks divide the axis into equal intervals from the top down', () => {
  assert.deepEqual(priceTicks([100, 200], 4), [200, 175, 150, 125, 100]);
});

test('period labels are every nth, spaced by the width, with ticks taking precedence', () => {
  assert.deepEqual(labelledPeriods(30, 340), [0, 6, 12, 18, 24]);
  assert.deepEqual(labelledPeriods(10, 340, 4), [0, 3, 6, 9]);
  assert.deepEqual(labelledPeriods(3, 1000), [0, 1, 2]);
  assert.deepEqual(labelledPeriods(0, 340), []);
});

test('the change is measured from the open, and a zero open has no percentage', () => {
  assert.deepEqual(changeOf({ open: 200, close: 210 }), { change: 10, percent: 5 });
  assert.deepEqual(changeOf({ open: 0, close: 5 }), { change: 5, percent: 0 });
});
