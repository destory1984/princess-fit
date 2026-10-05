import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampTextScale,
  DEFAULT_TEXT_SCALE,
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  scaledSize,
  TEXT_SCALE_MARKS,
  textScaleOf,
  valueAt,
} from './textScale.ts';

test('a chosen size lands on a step inside the range', () => {
  assert.equal(clampTextScale(103), 105);
  assert.equal(clampTextScale(10), MIN_TEXT_SCALE);
  assert.equal(clampTextScale(900), MAX_TEXT_SCALE);
  assert.equal(clampTextScale(Number.NaN), DEFAULT_TEXT_SCALE);
});

test('nothing stored, or nonsense, is the size the screens were drawn at', () => {
  assert.equal(textScaleOf(null), 100);
  assert.equal(textScaleOf(''), 100);
  assert.equal(textScaleOf('big'), 100);
  assert.equal(textScaleOf('120'), 120);
  assert.equal(textScaleOf('500'), MAX_TEXT_SCALE);
});

test('at 100 a size is untouched, and otherwise a whole number of points', () => {
  assert.equal(scaledSize(15, 100), 15);
  assert.equal(scaledSize(15, 120), 18);
  assert.equal(scaledSize(13, 110), 14);
  assert.equal(scaledSize(13, 80), 10);
});

test('a touch on the slider is the nearest step, and never off either end', () => {
  assert.equal(valueAt(0, 300, 80, 140, 5), 80);
  assert.equal(valueAt(300, 300, 80, 140, 5), 140);
  assert.equal(valueAt(100, 300, 80, 140, 5), 100);
  assert.equal(valueAt(-40, 300, 80, 140, 5), 80);
  assert.equal(valueAt(999, 300, 80, 140, 5), 140);
  // A track not measured yet has no along to speak of.
  assert.equal(valueAt(50, 0, 80, 140, 5), 80);
});

test('the marks under the slider are values it can reach', () => {
  for (const mark of TEXT_SCALE_MARKS) assert.equal(clampTextScale(mark), mark);
  assert.equal(TEXT_SCALE_MARKS[0], MIN_TEXT_SCALE);
  assert.equal(TEXT_SCALE_MARKS.at(-1), MAX_TEXT_SCALE);
});
