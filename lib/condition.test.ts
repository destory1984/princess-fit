import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONDITIONS,
  conditionLine,
  conditionNote,
  easeWeight,
  heavyRun,
  isCondition,
  shapePlan,
  TIRED_RUN,
  tiredWord,
  type Condition,
} from './condition.ts';
import { PLATE_THRESHOLD } from './weight.ts';

test('an eased weight is one the rack can make', () => {
  // 100 → 90 lands on a plate; nothing between 2.5kg steps exists up there.
  assert.equal(easeWeight(100), 90);
  // 54 is not a weight — plates come in 2.5s, so it lands on 52.5.
  assert.equal(easeWeight(60), 52.5);
  // Under the threshold dumbbells come in whole kilos.
  assert.equal(easeWeight(10), 9);
  assert.equal(easeWeight(5), 4);
});

test('easing rounds down, so a heavy day stays a heavy day', () => {
  for (const w of [7, 12.5, 22.5, 47.5, 82.5]) {
    assert.ok(easeWeight(w) <= w * 0.9 + 1e-9, `${w} eased up`);
  }
});

test('easing never erases a weight that exists', () => {
  // A tenth off 1kg rounds to nothing; lifting the 1kg is still the point.
  assert.equal(easeWeight(1), 1);
  assert.equal(easeWeight(0), 0);
});

test('an eased bar weight stays above the empty bar it sits on', () => {
  assert.ok(easeWeight(PLATE_THRESHOLD + 2.5) >= 20 * 0.9);
});

const plan = [
  { weight: 60, reps: 10 },
  { weight: 60, reps: 10 },
  { weight: 60, reps: 10 },
];

test('a normal day changes nothing', () => {
  assert.deepEqual(shapePlan(plan, 'normal'), plan);
});

test('a heavy day drops a set and takes weight off the rest', () => {
  const shaped = shapePlan(plan, 'heavy');
  assert.equal(shaped.length, 2);
  assert.ok(shaped.every((s) => s.weight === 52.5));
});

test('a light day adds a set at the same weight, never a heavier one', () => {
  const shaped = shapePlan(plan, 'light');
  assert.equal(shaped.length, 4);
  assert.ok(shaped.every((s) => s.weight === 60));
});

test('a single-entry plan is left alone — that shape is cardio, not a set', () => {
  const cardio = [{ weight: 0, reps: 0 }];
  assert.deepEqual(shapePlan(cardio, 'light'), cardio);
  assert.deepEqual(shapePlan(cardio, 'heavy'), cardio);
});

test('a lone weighted set loses weight rather than being deleted', () => {
  const one = [{ weight: 40, reps: 8 }];
  const shaped = shapePlan(one, 'heavy');
  assert.equal(shaped.length, 1);
  assert.equal(shaped[0].weight, 35);
});

test('shaping never mutates the plan it was given', () => {
  const original = plan.map((s) => ({ ...s }));
  shapePlan(plan, 'heavy');
  shapePlan(plan, 'light');
  assert.deepEqual(plan, original);
});

test('every adjustment says what it did, and no adjustment says nothing', () => {
  assert.equal(conditionNote('normal', 3), null);
  assert.ok(conditionNote('heavy', 3));
  assert.ok(conditionNote('light', 3));
  // Nothing was added to a cardio entry, so nothing is claimed.
  assert.equal(conditionNote('light', 1), null);
});

test('she has a word for each answer', () => {
  for (const { id } of CONDITIONS) assert.ok(conditionLine(id).length > 0);
});

test('every listed condition is a recognised one, and nothing else is', () => {
  for (const { id } of CONDITIONS) assert.ok(isCondition(id));
  for (const junk of [null, undefined, '', 'tired', 0]) assert.ok(!isCondition(junk));
});

test('a run of heavy days is counted from the most recent backwards', () => {
  const heavy: Condition = 'heavy';
  assert.equal(heavyRun([heavy, heavy, heavy]), 3);
  assert.equal(heavyRun([heavy, heavy, 'normal', heavy]), 2);
  assert.equal(heavyRun(['light', heavy, heavy]), 0);
  // Sessions from before the question existed break the run rather than
  // counting toward it: an unanswered day is not a heavy one.
  assert.equal(heavyRun([heavy, null, heavy]), 1);
  assert.equal(heavyRun([]), 0);
});

test('she mentions a run of heavy days, but not a single one', () => {
  const heavy: Condition = 'heavy';
  assert.equal(tiredWord([heavy]), null);
  assert.equal(tiredWord(Array(TIRED_RUN - 1).fill(heavy)), null);
  const word = tiredWord(Array(TIRED_RUN).fill(heavy));
  assert.ok(word && word.includes('쉬어도'));
});
