import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLabel, COLLAPSE, MIN_SETS, progressWord, readiness } from './progress.ts';
import { nextWeight, PLATE_THRESHOLD } from './weight.ts';

const set = (weight_kg: number, reps: number) => ({ weight_kg, reps });

test('holding the last set against the first earns a step up', () => {
  const read = readiness([set(60, 10), set(60, 10), set(60, 10)])!;
  assert.equal(read.verdict, 'add');
  assert.equal(read.weight, nextWeight(60, 1));
  assert.ok(read.weight > 60);
});

test('beating the first set also earns it', () => {
  assert.equal(readiness([set(60, 8), set(60, 10)])!.verdict, 'add');
});

test('fading a little means the weight was right', () => {
  const read = readiness([set(60, 10), set(60, 9), set(60, 8)])!;
  assert.equal(read.verdict, 'hold');
  assert.equal(read.weight, 60);
});

test('collapsing means it was too much', () => {
  const read = readiness([set(60, 10), set(60, 8), set(60, 4)])!;
  assert.equal(read.verdict, 'ease');
  assert.ok(read.weight < 60);
  assert.equal(read.weight, nextWeight(60, -1));
});

test('the boundary of a collapse is where it is documented', () => {
  const first = 10;
  const justAbove = Math.ceil(first * COLLAPSE);
  assert.equal(readiness([set(60, first), set(60, justAbove)])!.verdict, 'hold');
  assert.equal(readiness([set(60, first), set(60, justAbove - 1)])!.verdict, 'ease');
});

test('the working weight is the heaviest set, not a back-off after it', () => {
  // 80 × 5, then a light 40 × 12 to finish: the session was about the 80.
  const read = readiness([set(80, 5), set(40, 12)])!;
  assert.equal(read.from, 80);
  assert.equal(read.verdict, 'add');
});

test('one set says nothing, and neither does none', () => {
  assert.equal(readiness([set(60, 10)]), null);
  assert.equal(readiness([]), null);
  assert.ok(MIN_SETS >= 2);
});

test('nothing is suggested for work that has no weight', () => {
  // Planks and running come through here too; there is no next plate for one.
  assert.equal(readiness([set(0, 0), set(0, 0), set(0, 0)]), null);
  assert.equal(readiness([set(0, 30), set(0, 30)]), null);
});

test('every suggested weight is one the rack can make', () => {
  for (const weight of [5, 10, 17, 20, 22.5, 47.5, 100]) {
    for (const reps of [[10, 10], [10, 3]]) {
      const read = readiness([set(weight, reps[0]), set(weight, reps[1])]);
      if (!read) continue;
      const step = read.weight >= PLATE_THRESHOLD ? 2.5 : 1;
      assert.ok(
        Math.abs(read.weight / step - Math.round(read.weight / step)) < 1e-9,
        `${read.weight}kg is not a real weight`
      );
    }
  }
});

test('easing never falls below zero', () => {
  const read = readiness([set(1, 10), set(1, 2)])!;
  assert.ok(read.weight >= 0);
});

test('holding is said silently, because it is what already happens', () => {
  assert.equal(progressWord(readiness([set(60, 10), set(60, 9)])), null);
  assert.equal(progressWord(null), null);
});

test('going up and coming down both get a sentence, and they differ', () => {
  const up = progressWord(readiness([set(60, 10), set(60, 10)]))!;
  const down = progressWord(readiness([set(60, 10), set(60, 3)]))!;
  assert.ok(up.length > 0 && down.length > 0);
  assert.notEqual(up, down);
  assert.ok(up.includes(`${nextWeight(60, 1)}kg`));
  assert.ok(down.includes(`${nextWeight(60, -1)}kg`));
});

test('nothing is said when the suggestion is the weight already on the bar', () => {
  // Easing from the lightest dumbbell there is has nowhere to go.
  const read = readiness([set(1, 10), set(1, 1)])!;
  if (read.weight === read.from) assert.equal(progressWord(read), null);
});

test('the button says the weight it will set', () => {
  const read = readiness([set(60, 10), set(60, 10)])!;
  assert.ok(applyLabel(read).startsWith(String(read.weight)));
});
