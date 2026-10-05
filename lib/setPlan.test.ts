import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followOn, planFor, settle, PRESET_REPS, PRESET_SETS } from './setPlan.ts';

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

test('the sets still waiting follow today once today says something', () => {
  const set = (id: string, set_no: number, weight_kg: number, reps: number, done = false, warmup = false) => ({
    id,
    set_no,
    weight_kg,
    reps,
    done,
    warmup,
  });
  // 10kg for 12, then 10. The board had last time's 10×15 and 20×10 waiting.
  const curls = [
    set('a', 1, 10, 12, true),
    set('b', 2, 10, 10, true),
    set('c', 3, 10, 15),
    set('d', 4, 20, 10),
  ];
  assert.deepEqual(settle(curls, curls[1]), [
    { id: 'c', weight_kg: 10, reps: 10 },
    { id: 'd', weight_kg: 10, reps: 10 },
  ]);
  // After the first set nothing has fallen yet: the reps are capped, the
  // heavier set is still a plan.
  assert.deepEqual(settle(curls.map((s) => (s.id === 'b' ? { ...s, done: false } : s)), curls[0]), [
    { id: 'c', weight_kg: 10, reps: 12 },
  ]);
  // A pyramid is not tiredness: the reps fall because the weight rose.
  const pyramid = [set('a', 1, 40, 12, true), set('b', 2, 50, 10, true), set('c', 3, 60, 6)];
  assert.deepEqual(settle(pyramid, pyramid[1]), []);
  // A lighter set after a heavy one is a drop set: more reps is the point.
  const drop = [set('a', 1, 60, 6, true), set('b', 2, 50, 10), set('c', 3, 60, 8)];
  assert.deepEqual(settle(drop, drop[0]), [{ id: 'c', weight_kg: 60, reps: 6 }]);
  // Fewer is a plan and is left alone.
  const taper = [set('a', 1, 10, 12, true), set('b', 2, 10, 8), set('c', 3, 10, 12)];
  assert.deepEqual(settle(taper, taper[0]), []);
  // A warm-up measures nothing, and is not changed either.
  const ramp = [set('w', 1, 40, 3, true, true), set('a', 2, 60, 10), set('x', 3, 60, 12, false, true)];
  assert.deepEqual(settle(ramp, ramp[0]), []);
  assert.deepEqual(settle([set('a', 1, 60, 8, true), ramp[2]], set('a', 1, 60, 8, true)), []);
});
