import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import {
  balanceOf,
  balanceWord,
  isUnilateral,
  nextSide,
  otherSide,
  UNILATERAL,
  type SidedSet,
} from './sides.ts';

test('every movement named as one-sided actually exists', () => {
  const names = new Set(DEFAULT_EXERCISES.map((e) => e.name));
  for (const name of UNILATERAL) assert.ok(names.has(name), name);
});

test('two-armed movements are not asked the question', () => {
  // A dumbbell press would answer 「같아요」 forever, and an answer that never
  // changes is one people stop reading.
  assert.ok(!isUnilateral('덤벨 프레스'));
  assert.ok(!isUnilateral('벤치프레스'));
  assert.ok(isUnilateral('원암 덤벨 로우'));
});

test('a hand-made movement can be told, since its name cannot be guessed', () => {
  // The person who typed this is the one who asked for the feature, and no
  // list would ever have held their spelling of it.
  assert.ok(isUnilateral('한발 데드', true));
  assert.ok(isUnilateral('싱글 레그 루마니안 데드리프트', true));
});

test('said aloud beats the list, in both directions', () => {
  // Off on a built-in is a decision, not a gap: someone doing split squats
  // with both feet loaded does not want to be asked every week.
  assert.ok(!isUnilateral('런지', false));
  assert.ok(isUnilateral('벤치프레스', true));
});

test('unsaid is not a no', () => {
  // A row written before the column existed comes back without it, and reading
  // that as 「아니오」 would quietly stop asking about the seven that worked.
  assert.ok(isUnilateral('런지', null));
  assert.ok(isUnilateral('런지', undefined));
  assert.ok(isUnilateral('런지'));
  assert.ok(!isUnilateral('벤치프레스', null));
});

test('a side needs both sides before it can be compared', () => {
  const onlyLeft: SidedSet[] = [{ side: 'L', weight_kg: 20, reps: 10 }];
  // Calling the untrained arm a total collapse would be the app inventing an
  // injury out of the order someone happened to work in.
  assert.equal(balanceOf(onlyLeft), null);
  assert.equal(balanceOf([]), null);
});

test('a gap is measured on the work done, not the weight alone', () => {
  // Same kilos, fewer reps on the left — a top-weight comparison calls this
  // even, and it is exactly the case worth catching.
  const sets: SidedSet[] = [
    { side: 'L', weight_kg: 20, reps: 6 },
    { side: 'R', weight_kg: 20, reps: 10 },
  ];
  const balance = balanceOf(sets)!;
  assert.equal(balance.weaker, 'L');
  assert.ok(Math.abs(balance.gap - 0.4) < 0.001);
});

test('bodyweight work still counts', () => {
  const sets: SidedSet[] = [
    { side: 'L', weight_kg: 0, reps: 8 },
    { side: 'R', weight_kg: 0, reps: 12 },
  ];
  assert.equal(balanceOf(sets)!.weaker, 'L');
});

test('warm-ups are not part of the comparison', () => {
  const sets: SidedSet[] = [
    { side: 'L', weight_kg: 20, reps: 10, warmup: true },
    { side: 'L', weight_kg: 20, reps: 10 },
    { side: 'R', weight_kg: 20, reps: 10 },
  ];
  assert.equal(balanceOf(sets)!.weaker, null);
});

test('small differences are left alone', () => {
  // A body is not symmetrical and never will be. Remarking on every three
  // percent is how an app gets ignored on the day it matters.
  const close: SidedSet[] = [
    { side: 'L', weight_kg: 20, reps: 10 },
    { side: 'R', weight_kg: 20, reps: 10.5 as number },
  ];
  const balance = balanceOf(close)!;
  assert.equal(balance.weaker, null);
  assert.equal(balanceWord(balance, '런지'), null);
});

test('she says more when the gap is large', () => {
  const wide: SidedSet[] = [
    { side: 'L', weight_kg: 10, reps: 6 },
    { side: 'R', weight_kg: 20, reps: 10 },
  ];
  const said = balanceWord(balanceOf(wide), '런지')!;
  assert.match(said, /왼쪽/);
  assert.match(said, /약한 쪽 먼저/);
});

test('nothing to report is reported as nothing', () => {
  assert.equal(balanceWord(null, '런지'), null);
});

test('sides alternate, starting on the left', () => {
  assert.equal(nextSide([]), 'L');
  assert.equal(nextSide([{ side: 'L', done: true }]), 'R');
  assert.equal(nextSide([{ side: 'L', done: true }, { side: 'R', done: true }]), 'L');
  // It follows what was actually done, so a set added or deleted out of order
  // does not make the board ask for the same arm twice.
  assert.equal(nextSide([{ side: 'R', done: true }, { side: 'L', done: false }]), 'L');
  assert.equal(otherSide('R'), 'L');
});
