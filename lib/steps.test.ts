import assert from 'node:assert/strict';
import test from 'node:test';
import { SATIETY_PER_DAY } from './economy.ts';
import {
  clampGoal,
  DEFAULT_STEP_GOAL,
  MAX_STEP_GOAL,
  MIN_STEP_GOAL,
  walkNote,
  walkOwed,
  walkSatiety,
  walkShare,
  walkWord,
  WALK_SATIETY,
} from './steps.ts';

test('a full day of walking is worth less than half a day of hunger', () => {
  // The whole point: walking softens a gap, it never stands in for a meal.
  assert.ok(WALK_SATIETY * 2 < SATIETY_PER_DAY);
});

test('credit is proportional, so nearly making the goal is nearly the reward', () => {
  assert.equal(walkSatiety(0), 0);
  assert.equal(walkSatiety(DEFAULT_STEP_GOAL), WALK_SATIETY);
  assert.equal(walkSatiety(DEFAULT_STEP_GOAL / 2), Math.floor(WALK_SATIETY / 2));
  assert.ok(walkSatiety(7900) > 0);
});

test('walking past the goal earns nothing extra', () => {
  assert.equal(walkSatiety(DEFAULT_STEP_GOAL * 4), WALK_SATIETY);
  assert.equal(walkShare(DEFAULT_STEP_GOAL * 4), 1);
});

test('credit only ever rises within a day', () => {
  let credited = 0;
  for (const steps of [1200, 3000, 5500, 9000, 12000]) {
    const owed = walkOwed(steps, credited);
    assert.ok(owed >= 0);
    credited += owed;
    assert.equal(credited, walkSatiety(steps));
  }
  assert.equal(credited, WALK_SATIETY);
});

test('a step count that goes backwards never takes food away', () => {
  // A new phone, a revoked permission, a reset counter — all of these can
  // report fewer steps than were already paid for.
  assert.equal(walkOwed(0, WALK_SATIETY), 0);
  assert.equal(walkOwed(100, WALK_SATIETY), 0);
});

test('a nonsense goal cannot make walking worth nothing or everything', () => {
  assert.equal(walkShare(5000, 0), 0);
  assert.equal(clampGoal(0), MIN_STEP_GOAL);
  assert.equal(clampGoal(1_000_000), MAX_STEP_GOAL);
  assert.equal(clampGoal(8400), 8000);
  assert.equal(clampGoal(8600), 9000);
});

test('she has something to say at every distance, and it changes', () => {
  const said = [0, 1000, 3000, 6000, 8000].map((s) => walkWord(s));
  for (const line of said) assert.ok(line.length > 0);
  assert.equal(new Set(said).size, said.length);
});

test('nothing is claimed when nothing was earned', () => {
  assert.equal(walkNote(0), null);
  assert.ok(walkNote(3)?.includes('3'));
});
