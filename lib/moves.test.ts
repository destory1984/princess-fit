import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { frameAt, MOVE_NAMES, moveOf } from './moves.ts';

test('every drawn movement is an exercise the app ships with', () => {
  const names = new Set(DEFAULT_EXERCISES.map((e) => e.name));
  for (const name of MOVE_NAMES) assert.ok(names.has(name), name);
});

test('no two exercises share a drawing', () => {
  const ids = MOVE_NAMES.map((n) => moveOf(n)!.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a repetition goes down and comes back; a stride goes round; a hold stays', () => {
  const squat = moveOf('스쿼트')!;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((t) => frameAt(squat, t)), [0, 1, 2, 1, 0, 1]);
  const run = moveOf('러닝')!;
  assert.deepEqual([0, 1, 2, 3, 4].map((t) => frameAt(run, t)), [0, 1, 2, 0, 1]);
  assert.equal(frameAt(moveOf('플랭크')!, 7), 0);
});

test('an exercise made by hand has no drawing', () => {
  assert.equal(moveOf('한발 데드'), undefined);
});
