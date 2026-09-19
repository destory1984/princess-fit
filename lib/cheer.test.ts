import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cheerFor } from './cheer.ts';

test('an empty board asks for an exercise', () => {
  assert.match(cheerFor(0, 0).line, /골라/);
});

test('she counts down what is left', () => {
  assert.match(cheerFor(1, 5).line, /4세트 남았어요/);
  assert.match(cheerFor(3, 5).line, /2세트 남았어요/);
});

test('the halfway mark and the last set get their own words', () => {
  assert.match(cheerFor(3, 6).line, /절반 넘었어요/);
  assert.match(cheerFor(5, 6).line, /마지막 한 세트/);
});

test('finishing everything reads as finished', () => {
  const end = cheerFor(6, 6);
  assert.equal(end.done, true);
  assert.match(end.line, /다 끝냈어요/);
  // More sets ticked than laid out is still finished, not a negative count.
  assert.equal(cheerFor(8, 6).done, true);
});

test('the same board always says the same thing', () => {
  assert.deepEqual(cheerFor(2, 5), cheerFor(2, 5));
});
