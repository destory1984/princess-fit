import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKm } from './format.ts';

test('the float tail never reaches the screen', () => {
  // This is the actual sum of two sets logged in the app's own tenths, and
  // the app used to print all of it.
  assert.equal(formatKm(0.1 + 1.3), '1.4');
  assert.equal(formatKm(0.1 + 0.2), '0.3');
  assert.equal(formatKm(0.1 + 0.7), '0.8');
});

test('a whole number of kilometres has no trailing zero', () => {
  // Nobody writing it by hand adds the zero.
  assert.equal(formatKm(5), '5');
  assert.equal(formatKm(5.0), '5');
  assert.equal(formatKm(0), '0');
});

test('one decimal place, rounded', () => {
  assert.equal(formatKm(5.24), '5.2');
  assert.equal(formatKm(5.25), '5.3');
  assert.equal(formatKm(5.96), '6');
});

test('every sum of tenths comes out short', () => {
  // The whole point: not one of these may print a tail.
  for (let a = 1; a <= 60; a += 1) {
    for (let b = 1; b <= 60; b += 1) {
      const out = formatKm(a / 10 + b / 10);
      assert.ok(out.length <= 4, `${a / 10} + ${b / 10} → ${out}`);
    }
  }
});
