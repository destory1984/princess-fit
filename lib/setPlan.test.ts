import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followOn, planFor, PRESET_REPS, PRESET_SETS } from './setPlan.ts';

test('an exercise never done before gets a plain preset', () => {
  const plan = planFor('weight_reps', undefined);
  assert.equal(plan.length, PRESET_SETS);
  assert.deepEqual(new Set(plan.map((s) => s.reps)), new Set([PRESET_REPS]));
  assert.ok(plan.every((s) => s.weight === 0));
});

test('an exercise done before comes back exactly as it was left', () => {
  const past = [
    { weight_kg: 40, reps: 12 },
    { weight_kg: 45, reps: 10 },
    { weight_kg: 45, reps: 8 },
    { weight_kg: 50, reps: 6 },
  ];
  assert.deepEqual(planFor('weight_reps', past), [
    { weight: 40, reps: 12 },
    { weight: 45, reps: 10 },
    { weight: 45, reps: 8 },
    { weight: 50, reps: 6 },
  ]);
});

test('an empty history is treated as no history', () => {
  assert.equal(planFor('weight_reps', []).length, PRESET_SETS);
});

test('cardio and timed work get one entry, not a list of sets', () => {
  assert.equal(planFor('cardio', undefined).length, 1);
  assert.equal(planFor('duration', [{ weight_kg: 0, reps: 0 }]).length, 1);
});

const s = (set_no: number, weight_kg: number, done = false) => ({
  id: `s${set_no}`,
  set_no,
  weight_kg,
  done,
});

test('later sets with no weight yet follow the one just finished', () => {
  const sets = [s(1, 10, true), s(2, 10, true), s(3, 0), s(4, 0)];
  const following = followOn(sets, sets[1]);
  assert.deepEqual(
    following.map((x) => x.id),
    ['s3', 's4']
  );
});

test('a set deliberately given a weight is left alone', () => {
  const sets = [s(1, 10, true), s(2, 0), s(3, 12)];
  assert.deepEqual(
    followOn(sets, sets[0]).map((x) => x.id),
    ['s2']
  );
});

test('earlier and finished sets are never touched', () => {
  const sets = [s(1, 0), s(2, 10, true), s(3, 0, true)];
  assert.deepEqual(followOn(sets, sets[1]), []);
});
