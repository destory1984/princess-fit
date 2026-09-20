import assert from 'node:assert/strict';
import test from 'node:test';
import { byLastUsed, isRotation, nextInSplit, type RoutineUse } from './split.ts';

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

const made = (id: string, name: string, created_at: string) => ({ id, name, created_at });

test('a routine is listed by when it was last used', () => {
  const routines = [
    made('old', '작년 것', '2025-01-01T00:00:00'),
    made('new', '어제 것', '2026-09-19T00:00:00'),
  ];
  const done = new Map([['old', '2026-09-20T10:00:00']]);
  // Made in January, done yesterday — it belongs at the top.
  assert.deepEqual(byLastUsed(routines, done).map((r) => r.id), ['old', 'new']);
});

test('a routine never used counts as used the day it was made', () => {
  // Otherwise the one created a minute ago sinks to the bottom, which is the
  // opposite of where its owner is looking.
  const routines = [
    made('stale', '묵은 것', '2025-01-01T00:00:00'),
    made('fresh', '방금 만든 것', '2026-09-21T09:00:00'),
  ];
  const done = new Map([['stale', '2026-01-05T10:00:00']]);
  assert.deepEqual(byLastUsed(routines, done).map((r) => r.id), ['fresh', 'stale']);
});

test('the same routines always list the same way', () => {
  const same = '2026-09-20T10:00:00';
  const routines = [made('b', '하체 날', same), made('a', '상체 날', same)];
  // Broken by name, so 상체 날 leads 하체 날 whichever order they arrive in.
  assert.deepEqual(byLastUsed(routines, new Map()).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(byLastUsed([...routines].reverse(), new Map()).map((r) => r.id), ['a', 'b']);
});

test('nothing to order is not an error', () => {
  assert.deepEqual(byLastUsed([], new Map()), []);
});
