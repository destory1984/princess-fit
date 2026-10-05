import assert from 'node:assert/strict';
import test from 'node:test';
import { BEGUN, CHANGELOG, dayOfMaking } from './changelog.ts';
import { APP_VERSION } from './version.ts';

test('the newest day says which version it brought', () => {
  assert.equal(CHANGELOG[0].version, APP_VERSION);
});

test('days are real, newest first, and none is written twice', () => {
  const days = CHANGELOG.map((d) => d.day);
  for (const day of days) assert.match(day, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(days, [...new Set(days)].sort().reverse());
});

test('every day has something to say, and nothing a blog editor would strike through', () => {
  for (const d of CHANGELOG) {
    assert.ok(d.changes.length > 0, d.day);
    for (const line of d.changes) assert.doesNotMatch(line, /~/, line);
  }
});

test('the day it was begun is the first day of the making', () => {
  assert.equal(BEGUN, '2026-09-19');
  assert.equal(dayOfMaking(new Date(2026, 8, 19, 23, 50)), 1);
  assert.equal(dayOfMaking(new Date(2026, 9, 5, 0, 10)), 17);
});
