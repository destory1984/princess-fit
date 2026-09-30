import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';

const track = (name: string) => DEFAULT_EXERCISES.find((e) => e.name === name)?.track_type;

// Asking for kilometres nobody knows gets a 0 typed in, or the entry skipped.
test('walking and rowing are timed, not measured in kilometres', () => {
  assert.equal(track('걷기'), 'duration');
  assert.equal(track('로잉 머신'), 'duration');
});

// Most stairs climbed are an apartment stairwell, where the floor is known.
test('stairs are counted in floors', () => {
  assert.equal(track('계단 오르기'), 'floors');
});
