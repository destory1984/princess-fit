import assert from 'node:assert/strict';
import test from 'node:test';
import { daysAgo, formatKm } from './format.ts';

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

test('daysAgo counts calendar days in the old words', () => {
  const now = new Date(2026, 8, 22, 1, 0);
  const at = (m: number, d: number, h = 12) => new Date(2026, m, d, h).toISOString();
  assert.equal(daysAgo(at(8, 22, 0), now), '오늘');
  assert.equal(daysAgo(at(8, 21, 20), now), '어제');
  assert.equal(daysAgo(at(8, 20), now), '이틀 전');
  assert.equal(daysAgo(at(8, 19), now), '사흘 전');
  assert.equal(daysAgo(at(8, 15), now), '이레 전');
  assert.equal(daysAgo(at(8, 12), now), '열흘 전');
  assert.equal(daysAgo(at(8, 9), now), '열흘 남짓 전');
  assert.equal(daysAgo(at(8, 1), now), '보름 남짓 전');
  assert.equal(daysAgo(at(7, 20), now), '한 달 전');
  assert.equal(daysAgo(at(5, 20), now), '석 달 전');
  assert.equal(daysAgo(new Date(2025, 5, 1).toISOString(), now), '해포 전');
});
