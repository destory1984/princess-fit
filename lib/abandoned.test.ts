import assert from 'node:assert/strict';
import test from 'node:test';
import { abandonedEnd, isAbandoned } from './abandoned.ts';

const now = new Date('2026-09-22T09:00:00Z');

test('yesterday evening, forgotten, is closed by morning', () => {
  const s = { started_at: '2026-09-21T10:00:00Z', lastDoneAt: '2026-09-21T11:10:00Z' };
  assert.equal(isAbandoned(s, now), true);
  assert.equal(abandonedEnd(s), '2026-09-21T11:10:00Z');
});

test('a session going past midnight is left alone', () => {
  const s = { started_at: '2026-09-21T23:30:00Z', lastDoneAt: '2026-09-22T08:50:00Z' };
  assert.equal(isAbandoned(s, now), false);
});

test('an old backdated session being filled in now is not abandoned', () => {
  const s = { started_at: '2026-09-15T09:00:00Z', lastDoneAt: '2026-09-22T08:55:00Z' };
  assert.equal(isAbandoned(s, now), false);
});

test('an empty session is judged by its start and ends where it began', () => {
  const old = { started_at: '2026-09-21T08:00:00Z', lastDoneAt: null };
  assert.equal(isAbandoned(old, now), true);
  assert.equal(abandonedEnd(old), '2026-09-21T08:00:00Z');
  assert.equal(isAbandoned({ started_at: '2026-09-22T08:00:00Z', lastDoneAt: null }, now), false);
});

test('exactly six hours is still open', () => {
  assert.equal(isAbandoned({ started_at: '2026-09-22T03:00:00Z', lastDoneAt: null }, now), false);
});
