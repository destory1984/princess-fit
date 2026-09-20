import assert from 'node:assert/strict';
import test from 'node:test';
import { rackable, warmupFor, warmupWord, WARMUP_FLOOR, workingWeightOf } from './warmup.ts';

test('a light movement is not offered a ramp', () => {
  // Three preparatory sets for a 15kg curl is how a useful suggestion becomes
  // one people dismiss without reading.
  assert.deepEqual(warmupFor(15), []);
  assert.deepEqual(warmupFor(0), []);
  assert.deepEqual(warmupFor(WARMUP_FLOOR - 2.5), []);
});

test('the ramp climbs to the working weight without reaching it', () => {
  const sets = warmupFor(100);
  assert.deepEqual(sets, [
    { weight: 40, reps: 8 },
    { weight: 60, reps: 5 },
    { weight: 80, reps: 3 },
  ]);
  for (const s of sets) assert.ok(s.weight < 100);
});

test('every suggested weight exists on the rack', () => {
  for (let working = WARMUP_FLOOR; working <= 200; working += 2.5) {
    for (const s of warmupFor(working)) {
      assert.equal(s.weight % (s.weight >= 20 ? 2.5 : 1), 0, `${working} → ${s.weight}`);
      assert.ok(s.weight < working);
    }
  }
});

test('rounding goes down, because a heavy warmup is the one real harm', () => {
  assert.equal(rackable(41.3), 40);
  assert.equal(rackable(19.6), 19);
  assert.equal(rackable(0), 0);
});

test('two steps that land on the same weight are one step', () => {
  // 「20kg × 8 · 20kg × 5」 reads as a bug, and is one.
  for (let working = WARMUP_FLOOR; working <= 200; working += 2.5) {
    const weights = warmupFor(working).map((s) => s.weight);
    assert.equal(new Set(weights).size, weights.length, String(working));
  }
});

test('the ramp leads to the heaviest set, not the first', () => {
  const climbing = [{ weight_kg: 60 }, { weight_kg: 70 }, { weight_kg: 80 }];
  assert.equal(workingWeightOf(climbing), 80);
});

test('a ramp does not lead up to another ramp', () => {
  // Counting the warmups would compound downward until it suggested the bar.
  const board = [
    { weight_kg: 40, warmup: true },
    { weight_kg: 60, warmup: true },
    { weight_kg: 80 },
  ];
  assert.equal(workingWeightOf(board), 80);
});

test('the offer says the weights, so it can be refused knowingly', () => {
  assert.equal(warmupWord(warmupFor(100)), '40kg × 8회 · 60kg × 5회 · 80kg × 3회');
  assert.equal(warmupWord([]), null);
});
