import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isQuiet, nextAudibleHour, whenAudible } from './quiet.ts';

test('a window that wraps midnight covers both sides of it', () => {
  assert.equal(isQuiet(23, 22, 7), true);
  assert.equal(isQuiet(3, 22, 7), true);
  assert.equal(isQuiet(12, 22, 7), false);
});

test('the boundaries belong to the hours they name', () => {
  assert.equal(isQuiet(22, 22, 7), true, 'quiet starts at 22');
  assert.equal(isQuiet(7, 22, 7), false, 'and is over at 7');
});

test('a window inside one day works too', () => {
  assert.equal(isQuiet(14, 13, 16), true);
  assert.equal(isQuiet(17, 13, 16), false);
});

test('an empty window silences nothing', () => {
  assert.equal(isQuiet(3, 9, 9), false);
});

test('a quiet hour is pushed to when she may speak again', () => {
  assert.equal(nextAudibleHour(3, 22, 7), 7);
  assert.equal(nextAudibleHour(12, 22, 7), 12);
});

test('a message at night waits for the morning, not for the past', () => {
  const night = new Date(2026, 8, 20, 23, 30);
  const moved = whenAudible(night, 22, 7);
  assert.equal(moved.getHours(), 7);
  assert.equal(moved.getDate(), 21, 'the next morning, not this one');
  assert.ok(moved > night);
});

test('an early-hours message waits for the same morning', () => {
  const small = new Date(2026, 8, 21, 3, 0);
  const moved = whenAudible(small, 22, 7);
  assert.equal(moved.getDate(), 21);
  assert.equal(moved.getHours(), 7);
});

test('a message in the day is left where it is', () => {
  const noon = new Date(2026, 8, 20, 12, 0);
  assert.equal(whenAudible(noon, 22, 7), noon);
});
