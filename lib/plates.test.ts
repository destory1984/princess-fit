import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAR, BARS, nextBar, PLATES, plateWord, platesFor } from './plates.ts';
import { nextWeight, PLATE_THRESHOLD } from './weight.ts';

test('the plates go on one side, heaviest first', () => {
  assert.deepEqual(platesFor(60)?.perSide, [20]);
  assert.deepEqual(platesFor(62.5)?.perSide, [20, 1.25]);
  assert.deepEqual(platesFor(100)?.perSide, [25, 15]);
  assert.deepEqual(platesFor(140)?.perSide, [25, 25, 10]);
});

test('the bar alone is a weight, with nothing on it', () => {
  assert.deepEqual(platesFor(BAR), { perSide: [], loaded: BAR });
  assert.equal(plateWord(BAR), '빈 봉');
});

test('lighter than the bar is not a bar', () => {
  assert.equal(platesFor(15), null);
  assert.equal(platesFor(0), null);
  assert.equal(plateWord(15), null);
});

test('every weight the stepper can reach above the bar can be loaded exactly', () => {
  // The stepper and the plates must agree on what exists, or the number on
  // screen is one the card then says cannot be made.
  for (let w = PLATE_THRESHOLD; w <= 300; w = nextWeight(w, 1)) {
    const load = platesFor(w);
    assert.ok(load, `${w}kg`);
    assert.equal(load.loaded, w, `${w}kg`);
    const side = load.perSide.reduce((sum, p) => sum + p, 0);
    assert.equal(BAR + side * 2, w, `${w}kg`);
  }
});

test('a weight no plates make says what the bar will really weigh', () => {
  // 21kg came in from an old record or an import. Half a kilo a side does
  // not exist, so the bar stays empty and the card says 20.
  assert.deepEqual(platesFor(21), { perSide: [], loaded: 20 });
  assert.deepEqual(platesFor(63), { perSide: [20, 1.25], loaded: 62.5 });
  assert.equal(plateWord(63), '한쪽에 20 · 1.25 — 그러면 62.5kg');
});

test('it never loads more than was asked for', () => {
  for (let w = BAR; w <= 200; w += 0.5) {
    const load = platesFor(w);
    assert.ok(load && load.loaded <= w, `${w}kg`);
    assert.ok(load && w - load.loaded < PLATES[PLATES.length - 1] * 2, `${w}kg`);
  }
});

test('the same plate twice is written once, with a count', () => {
  assert.equal(plateWord(60), '한쪽에 20');
  assert.equal(plateWord(140), '한쪽에 25×2 · 10');
  assert.equal(plateWord(62.5), '한쪽에 20 · 1.25');
});

test('nonsense is not a weight', () => {
  assert.equal(platesFor(Number.NaN), null);
  assert.equal(platesFor(-40), null);
});

test('the bars go round, and start from the full-size one', () => {
  assert.equal(BARS[0], BAR);
  let bar = BAR;
  const seen = [];
  for (let i = 0; i < BARS.length; i++) seen.push((bar = nextBar(bar)));
  assert.deepEqual(seen, [15, 10, 20]);
  // A weight nobody offered (an old stored value) starts again from the top.
  assert.equal(nextBar(7), BAR);
});

test('a lighter bar takes more plates for the same number', () => {
  assert.equal(plateWord(40), '한쪽에 10');
  assert.equal(plateWord(40, 15), '한쪽에 10 · 2.5');
  assert.equal(plateWord(40, 10), '한쪽에 15');
  // And is a bar at a weight the full-size one is not.
  assert.equal(plateWord(15), null);
  assert.equal(plateWord(15, 15), '빈 봉');
});
