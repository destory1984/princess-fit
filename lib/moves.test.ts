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
  const press = moveOf('벤치프레스')!;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((t) => frameAt(press, t)), [0, 1, 2, 1, 0, 1]);
  const run = moveOf('러닝')!;
  assert.deepEqual([0, 1, 2, 3, 4].map((t) => frameAt(run, t)), [0, 1, 2, 0, 1]);
  assert.equal(frameAt(moveOf('플랭크')!, 7), 0);
});

test('an exercise made by hand has no drawing', () => {
  assert.equal(moveOf('한발 데드'), undefined);
});

test('a movement drawn in more than three frames plays them all', () => {
  // The burpee: standing, hands down, plank, push-up — then back up through
  // the plank and the crouch, gathering, the jump, the landing, and round again.
  const burpee = moveOf('버피')!;
  assert.equal(burpee.frames, 7);
  const played = Array.from({ length: 10 }, (_, t) => frameAt(burpee, t));
  assert.deepEqual(played, [0, 1, 2, 3, 2, 1, 4, 5, 6, 0]);
  assert.deepEqual([...new Set(played)].sort(), [0, 1, 2, 3, 4, 5, 6]);
  // One that goes there and back would not rest twice on either end.
  const five = { id: 'made-up', frames: 5 as const };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => frameAt(five, t)), [0, 1, 2, 3, 4, 3, 2, 1, 0]);
});
