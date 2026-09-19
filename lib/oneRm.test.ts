import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curves, estimates, FORMULAS, MAX_REPS, spread } from './oneRm.ts';

// Several formulas are fitted for multi-rep sets and do not return the weight
// itself at one rep — Epley gives w × 31/30. The single is answered directly.
test('one rep of a weight is exactly a one-rep max of that weight', () => {
  for (const { name, kg } of estimates(100, 1)) {
    assert.equal(kg, 100, `${name} gave ${kg} for a single`);
  }
  assert.ok(curves(100).every((c) => c.points[0].kg === 100));
});

test('more reps at the same weight means a higher estimated max', () => {
  for (const f of FORMULAS) {
    assert.ok(f.estimate(100, 8) > f.estimate(100, 3), f.name);
  }
});

test('the formulas disagree, and that spread is the point', () => {
  const range = spread(100, 10)!;
  assert.ok(range.high > range.low, 'they should not all agree');
  assert.ok(range.high - range.low < 30, 'nor should they be wildly apart');
});

// Brzycki divides by (37 − reps): at 37 reps it divides by zero and past it
// the estimate goes negative. Capping is what keeps that off the screen.
test('absurd rep counts are capped instead of producing nonsense', () => {
  const many = estimates(100, 500);
  assert.deepEqual(many, estimates(100, MAX_REPS));
  assert.ok(many.every((e) => e.kg > 0));
});

test('nothing is estimated from nothing', () => {
  assert.deepEqual(estimates(0, 5), []);
  assert.deepEqual(estimates(60, 0), []);
  assert.equal(spread(0, 5), null);
});

test('every formula gets a curve over the whole rep range', () => {
  const all = curves(60);
  assert.equal(all.length, FORMULAS.length);
  for (const c of all) {
    assert.equal(c.points.length, MAX_REPS);
    assert.equal(c.points[0].reps, 1);
    assert.ok(c.points.every((p) => p.kg > 0), c.name);
  }
});
