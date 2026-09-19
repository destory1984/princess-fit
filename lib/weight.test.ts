import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextWeight, PLATE_THRESHOLD, weightStep } from './weight.ts';

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
