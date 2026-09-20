import assert from 'node:assert/strict';
import test from 'node:test';
import { isRotation, nextInSplit, type RoutineUse } from './split.ts';

const upper: RoutineUse = { routineId: 'up', lastOn: '2026-09-19' };
const lower: RoutineUse = { routineId: 'low', lastOn: '2026-09-17' };

test('one routine is offered again, because that is what one routine means', () => {
  assert.equal(nextInSplit([upper], ['up']), 'up');
});

test('two routines alternate, so yesterday is not offered again today', () => {
  assert.equal(nextInSplit([upper, lower], ['up', 'low']), 'low');
  // And after the lower day is done, it swings back.
  const done = [upper, { routineId: 'low', lastOn: '2026-09-20' }];
  assert.equal(nextInSplit(done, ['up', 'low']), 'up');
});

test('three routines rotate rather than ping-pong', () => {
  const uses: RoutineUse[] = [
    { routineId: 'a', lastOn: '2026-09-20' },
    { routineId: 'b', lastOn: '2026-09-18' },
    { routineId: 'c', lastOn: '2026-09-19' },
  ];
  assert.equal(nextInSplit(uses, ['a', 'b', 'c']), 'b');
});

test('a routine that was deleted is not offered on the strength of its history', () => {
  assert.equal(nextInSplit([upper, lower], ['up']), 'up');
});

test('nothing recent means nothing to say, and the caller decides', () => {
  assert.equal(nextInSplit([], ['up', 'low']), null);
  assert.equal(nextInSplit([lower], []), null);
});

test('the same history always produces the same button', () => {
  const sameDay: RoutineUse[] = [
    { routineId: 'b', lastOn: '2026-09-19' },
    { routineId: 'a', lastOn: '2026-09-19' },
  ];
  assert.equal(nextInSplit(sameDay, ['a', 'b']), 'a');
  assert.equal(nextInSplit([...sameDay].reverse(), ['b', 'a']), 'a');
});

test('a rotation is only called one when there is something to rotate', () => {
  assert.ok(!isRotation([upper], ['up', 'low']));
  assert.ok(isRotation([upper, lower], ['up', 'low']));
  assert.ok(!isRotation([upper, lower], ['up']));
});
