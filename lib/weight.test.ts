import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextWeight, onRack, PLATE_THRESHOLD, weightStep } from './weight.ts';

test('dumbbell weights move by whole kilos', () => {
  assert.equal(weightStep(12, 1), 1);
  assert.equal(nextWeight(12, 1), 13);
  assert.equal(nextWeight(12, -1), 11);
});

test('loaded bars move by a pair of small plates', () => {
  assert.equal(weightStep(60, 1), 2.5);
  assert.equal(nextWeight(60, 1), 62.5);
  assert.equal(nextWeight(60, -1), 57.5);
});

test('the boundary reads the same from either side', () => {
  // Up from 20 loads a bar; down from 20 picks up a dumbbell.
  assert.equal(nextWeight(PLATE_THRESHOLD, 1), 22.5);
  assert.equal(nextWeight(PLATE_THRESHOLD, -1), 19);
  assert.equal(nextWeight(19, 1), 20);
});

test('coming down from just above the threshold lands on it', () => {
  // 21 − 2.5 would be 18.5, which is neither a dumbbell nor a loaded bar.
  assert.equal(nextWeight(21, -1), PLATE_THRESHOLD);
});

test('weight never goes below zero', () => {
  assert.equal(nextWeight(0, -1), 0);
  assert.equal(nextWeight(0.5, -1), 0);
});

test('a coarse jump lands on the rack, not between it', () => {
  // 11 + 10 was 21, and every 2.5 after it kept the error: 23.5, 26, 28.5.
  assert.equal(onRack(21), PLATE_THRESHOLD);
  assert.equal(onRack(23.5), 22.5);
  assert.equal(onRack(36), 35);
  assert.equal(onRack(32), 32.5);
});

test('below the bar, whole kilos is the whole rule', () => {
  assert.equal(onRack(11), 11);
  assert.equal(onRack(11.4), 11);
  assert.equal(onRack(19.6), 20);
});

test('a weight already on the rack is left exactly where it is', () => {
  for (const w of [0, 1, 19, 20, 22.5, 60, 62.5, 100]) assert.equal(onRack(w), w);
});

test('nothing on the rack weighs less than nothing', () => {
  assert.equal(onRack(-5), 0);
  assert.equal(onRack(Number.NaN), 0);
});
