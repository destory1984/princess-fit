import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastReturn, sulkOf, whileShe, whoWasThere, type Pick } from './picks.ts';

const at = (day: string, hour = 9) => `${day}T${String(hour).padStart(2, '0')}:00:00`;
const pick = (girl: string, day: string, hour = 9): Pick => ({ girl, picked_at: new Date(at(day, hour)).toISOString() });
const iso = (day: string, hour = 12) => new Date(at(day, hour)).toISOString();

const picks = [pick('seora', '2026-09-01'), pick('dohwa', '2026-09-10'), pick('seora', '2026-09-20')];

test('whoever was chosen at the time was there', () => {
  assert.equal(whoWasThere(picks, iso('2026-09-05')), 'seora');
  assert.equal(whoWasThere(picks, iso('2026-09-15')), 'dohwa');
  assert.equal(whoWasThere(picks, iso('2026-09-22')), 'seora');
});

test('everything before the first pick belongs to the first girl', () => {
  assert.equal(whoWasThere(picks, iso('2025-01-01')), 'seora');
  assert.equal(whoWasThere([], iso('2025-01-01')), null);
});

test('closeness counts only the days she was there', () => {
  const sessions = ['2026-09-05', '2026-09-12', '2026-09-21'].map((d) => ({ started_at: iso(d) }));
  assert.equal(whileShe('seora', picks, sessions).length, 2);
  assert.equal(whileShe('dohwa', picks, sessions).length, 1);
  assert.equal(whileShe('geumhwa', picks, sessions).length, 0);
  // Before anyone was ever picked, there is only one of her.
  assert.equal(whileShe('geumhwa', [], sessions).length, 3);
});

test('the one who was left knows she was come back to, and for whom', () => {
  assert.deepEqual(lastReturn('seora', picks), { away: 10, other: 'dohwa', on: '2026-09-20' });
  assert.equal(lastReturn('dohwa', picks), null, 'she is not the one here');
  assert.equal(lastReturn('seora', [pick('seora', '2026-09-01')]), null, 'never left');
});

test('being come back to sulks, until a workout or a gift, or two days', () => {
  const on = (d: number) => new Date(2026, 8, d, 20);
  assert.equal(sulkOf('seora', picks, [], [], on(20))?.reason, 'returned');
  assert.equal(sulkOf('seora', picks, [], [], on(21))?.other, 'dohwa');
  assert.equal(sulkOf('seora', picks, [], [], on(22)), null, 'over on her own');
  assert.equal(sulkOf('seora', picks, ['2026-09-20'], [], on(21)), null, 'a workout makes up');
  assert.equal(sulkOf('seora', picks, [], ['2026-09-21'], on(21)), null, 'a gift makes up');
  assert.equal(sulkOf('seora', picks, ['2026-09-15'], [], on(20))?.reason, 'returned', 'a workout before does not count');
});

test('time away from training never sulks on its own', () => {
  const alone = [pick('geumhwa', '2026-08-01')];
  for (let d = 1; d < 60; d++) {
    assert.equal(sulkOf('geumhwa', alone, ['2026-08-01'], [], new Date(2026, 7, d, 20)), null);
  }
});

test('a quick look at another girl, the same day, is not being left', () => {
  const peek = [pick('seora', '2026-09-01'), pick('dohwa', '2026-09-20', 9), pick('seora', '2026-09-20', 10)];
  assert.equal(sulkOf('seora', peek, [], [], new Date(2026, 8, 20, 20)), null);
});

test('picked and dropped over and over, the latest one sulks for a day', () => {
  const fickle = [
    pick('seora', '2026-09-18'),
    pick('dohwa', '2026-09-19'),
    pick('geumhwa', '2026-09-20'),
    pick('dohwa', '2026-09-21'),
  ];
  // 피아 was also come back to; either way she sulks.
  assert.ok(sulkOf('dohwa', fickle, [], [], new Date(2026, 8, 21, 20)));
  const settled = fickle.slice(0, 3);
  assert.equal(sulkOf('geumhwa', settled, [], [], new Date(2026, 8, 20, 20)), null);
});
