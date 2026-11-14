import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAmount } from '../src/components/currency-input/parse.ts';

test('a typed figure is read with or without grouping commas', () => {
  assert.equal(parseAmount('1,250.5'), 1250.5);
  assert.equal(parseAmount('40'), 40);
  assert.equal(parseAmount('.5'), 0.5);
  assert.equal(parseAmount('12.'), 12);
});

test('an empty field, a lone point or anything not a figure is no amount', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('.'), null);
  assert.equal(parseAmount('1.2.3'), null);
  assert.equal(parseAmount('-4'), null);
  assert.equal(parseAmount('12a'), null);
});
