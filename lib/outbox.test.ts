import assert from 'node:assert/strict';
import test from 'node:test';
import {
  drain,
  MAX_PENDING,
  mergedPatch,
  overlay,
  parse,
  pendingRows,
  pendingWord,
  queue,
  settle,
  type PendingWrite,
} from './outbox.ts';

const NOW = '2026-09-20T10:00:00';

test('an edit to a set already waiting folds into it', () => {
  let pending: PendingWrite[] = [];
  pending = queue(pending, 's1', { weight_kg: 40 }, NOW);
  pending = queue(pending, 's1', { weight_kg: 50, reps: 8 }, NOW);
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].patch, { weight_kg: 50, reps: 8 });
});

test('different sets keep their own place, in the order they were made', () => {
  let pending: PendingWrite[] = [];
  pending = queue(pending, 's1', { done: true }, NOW);
  pending = queue(pending, 's2', { done: true }, NOW);
  pending = queue(pending, 's1', { reps: 10 }, NOW);
  assert.deepEqual(
    pending.map((p) => p.setId),
    ['s1', 's2']
  );
});

test('a week offline does not fill the phone', () => {
  let pending: PendingWrite[] = [];
  for (let i = 0; i < MAX_PENDING + 50; i += 1) {
    pending = queue(pending, `s${i}`, { done: true }, NOW);
  }
  assert.equal(pending.length, MAX_PENDING);
  // The newest survive: the oldest edits are the ones already superseded.
  assert.equal(pending[pending.length - 1].setId, `s${MAX_PENDING + 49}`);
});

test('what went out is dropped and the rest keeps its order', () => {
  const pending: PendingWrite[] = [
    { setId: 'a', patch: { done: true }, at: NOW },
    { setId: 'b', patch: { done: true }, at: NOW },
    { setId: 'c', patch: { done: true }, at: NOW },
  ];
  assert.deepEqual(
    settle(pending, ['b']).map((p) => p.setId),
    ['a', 'c']
  );
  assert.deepEqual(settle(pending, ['a', 'b', 'c']), []);
});

test('a reload no longer costs you the set you just typed', () => {
  // This is the bug the whole file exists for: the server still has 40kg,
  // the 50 was typed in a basement, and the reload must not win.
  const fromServer = [{ id: 's1', weight_kg: 40, reps: 8, done: false }];
  const pending: PendingWrite[] = [{ setId: 's1', patch: { weight_kg: 50, done: true }, at: NOW }];
  assert.deepEqual(overlay(fromServer, pending), [
    { id: 's1', weight_kg: 50, reps: 8, done: true },
  ]);
});

test('rows nobody is waiting on are returned untouched', () => {
  const rows = [{ id: 'a', reps: 1 }];
  assert.equal(overlay(rows, []), rows);
  assert.deepEqual(overlay(rows, [{ setId: 'zzz', patch: { reps: 9 }, at: NOW }]), rows);
});

test('she says nothing while everything is landing', () => {
  assert.equal(pendingWord([]), null);
  assert.match(pendingWord([{ setId: 'a', patch: {}, at: NOW }])!, /1개/);
});

test('a queue survives storage, and rubbish in storage is treated as empty', () => {
  const pending: PendingWrite[] = [{ setId: 'a', patch: { reps: 5 }, at: NOW }];
  assert.deepEqual(parse(JSON.stringify(pending)), pending);
  assert.deepEqual(parse(null), []);
  assert.deepEqual(parse('not json at all'), []);
  assert.deepEqual(parse('{"not":"an array"}'), []);
  assert.deepEqual(parse('[{"setId":3},null,{"patch":{}}]'), []);
});

test('a new save carries out whatever was already stuck for that set', () => {
  const pending: PendingWrite[] = [{ setId: 's1', patch: { reps: 10 }, at: NOW }];
  // The 10 reps typed in the basement must not be left behind by the 50kg.
  assert.deepEqual(mergedPatch(pending, 's1', { weight_kg: 50 }), {
    reps: 10,
    weight_kg: 50,
  });
  assert.deepEqual(mergedPatch(pending, 'other', { done: true }), { done: true });
  // The newer value wins where they disagree.
  assert.deepEqual(mergedPatch(pending, 's1', { reps: 12 }), { reps: 12 });
});

test('draining sends the oldest first and clears what landed', async () => {
  const pending: PendingWrite[] = [
    { setId: 'a', patch: { done: true }, at: NOW },
    { setId: 'b', patch: { reps: 5 }, at: NOW },
  ];
  const seen: string[] = [];
  const left = await drain(pending, async (setId) => {
    seen.push(setId);
  });
  assert.deepEqual(seen, ['a', 'b']);
  assert.deepEqual(left, []);
});

test('a basement stops the drain rather than burning the battery on it', async () => {
  const pending: PendingWrite[] = [
    { setId: 'a', patch: { done: true }, at: NOW },
    { setId: 'b', patch: { reps: 5 }, at: NOW },
    { setId: 'c', patch: { reps: 6 }, at: NOW },
  ];
  let tries = 0;
  const left = await drain(pending, async (setId) => {
    tries += 1;
    if (setId !== 'a') throw new Error('no signal');
  });
  assert.equal(tries, 2);
  // What landed is gone; what did not is still there, in order, for next time.
  assert.deepEqual(
    left.map((p) => p.setId),
    ['b', 'c']
  );
});

test('nothing waiting is not an error', async () => {
  assert.deepEqual(await drain([], async () => {}), []);
});

const ROW = {
  id: 'new1',
  workout_id: 'w1',
  exercise_id: 'e1',
  position: 0,
  set_no: 3,
};

test('a set added offline stays an insert, however many edits land on it', () => {
  let pending = queue([], 'new1', { weight_kg: 40 }, NOW, ROW);
  pending = queue(pending, 'new1', { reps: 10 }, NOW);
  pending = queue(pending, 'new1', { done: true }, NOW);
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].row, ROW);
  // One insert carrying every number, not an insert plus three updates each
  // of which could fail on its own.
  assert.deepEqual(pending[0].patch, { weight_kg: 40, reps: 10, done: true });
});

test('a set added offline still shows on the board after a reload', () => {
  // There is no server row to lay the edit over — this is the same bug in a
  // new place, and the answer is to append rather than to overlay.
  const pending = queue([], 'new1', { weight_kg: 40, reps: 10 }, NOW, ROW);
  assert.deepEqual(pendingRows(pending), [
    {
      ...ROW,
      weight_kg: 40,
      reps: 10,
      duration_sec: 0,
      distance_km: 0,
      done: false,
    },
  ]);
});

test('edits to sets that do exist add no rows of their own', () => {
  const pending = queue([], 's1', { done: true }, NOW);
  assert.deepEqual(pendingRows(pending), []);
});

test('the whole row goes out for an insert, and only the patch for an edit', async () => {
  const pending = [
    { setId: 'new1', patch: { reps: 5 }, at: NOW, row: ROW },
    { setId: 's1', patch: { done: true }, at: NOW },
  ];
  const seen: (string | undefined)[] = [];
  await drain(pending, async (_id, _patch, row) => {
    seen.push(row?.id);
  });
  assert.deepEqual(seen, ['new1', undefined]);
});

test('a half-written row in storage is dropped, not retried forever', () => {
  const good = JSON.stringify([{ setId: 'new1', patch: {}, at: NOW, row: ROW }]);
  assert.equal(parse(good).length, 1);
  // Without the columns to insert with, the database would refuse it on every
  // flush for as long as the app is installed.
  const bad = JSON.stringify([{ setId: 'new1', patch: {}, at: NOW, row: { id: 'new1' } }]);
  assert.deepEqual(parse(bad), []);
});
