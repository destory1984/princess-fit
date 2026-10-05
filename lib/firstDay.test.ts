import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cheapestGift,
  firstDayStep,
  goldAfterSmallestFirstSession,
  hasEarlierDay,
  isFirstWorkout,
} from './firstDay.ts';
import type { WorkoutFact } from './gamification.ts';

const fact = (id: string, doneSets = 5): WorkoutFact => ({
  id,
  started_at: '2026-10-03T18:00:00',
  groups: ['가슴'],
  doneSets,
  volume: 1000,
  durationSec: 0,
  distanceKm: 0,
  cardioSec: 0,
});

// The whole first day rests on this sum. If a price rises or the opening
// purse shrinks, this is the line that says the first gift went out of reach.
test('one real session reaches the cheapest gift without a top-up', () => {
  assert.ok(
    goldAfterSmallestFirstSession() >= cheapestGift().price,
    `${goldAfterSmallestFirstSession()}G against ${cheapestGift().price}G`
  );
});

test('the cheapest gift is something given, not something free', () => {
  assert.ok(cheapestGift().price > 0);
});

test('the first session is the only one there has been', () => {
  assert.equal(isFirstWorkout([fact('a')], 'a'), true);
  assert.equal(isFirstWorkout([fact('a'), fact('b')], 'b'), false);
  assert.equal(isFirstWorkout([fact('a')], 'b'), false);
});

test('empty sessions do not use up the first day', () => {
  // Opened, closed, nothing done — and then the real one.
  assert.equal(isFirstWorkout([fact('empty', 0), fact('a')], 'a'), true);
  assert.equal(isFirstWorkout([fact('empty', 0)], 'empty'), false);
});

test('a year of imported history has had its first day elsewhere', () => {
  const imported = Array.from({ length: 100 }, (_, i) => fact(`old-${i}`));
  assert.deepEqual(firstDayStep([...imported, fact('today')], 'today', 9999, false), {
    step: 'none',
  });
});

test('with gold and nothing given, she is one tap from her first gift', () => {
  const said = firstDayStep([fact('a')], 'a', 240, false);
  assert.equal(said.step, 'invite');
  assert.equal(said.step === 'invite' && said.gift.id, cheapestGift().id);
});

test('short of gold there is no invitation to a shop that refuses', () => {
  assert.deepEqual(firstDayStep([fact('a')], 'a', cheapestGift().price - 1, false), {
    step: 'none',
  });
});

test('once given, the card says so instead of asking again', () => {
  assert.deepEqual(firstDayStep([fact('a')], 'a', 0, true), { step: 'given' });
});

test('a second session on the first day has no yesterday behind it', () => {
  const again = { ...fact('b'), started_at: '2026-10-03T21:00:00' };
  assert.equal(hasEarlierDay([fact('a'), again], 'b'), false);
  const nextDay = { ...fact('c'), started_at: '2026-10-04T08:00:00' };
  assert.equal(hasEarlierDay([fact('a'), nextDay], 'c'), true);
  // An empty session the day before was not a day of training.
  const empty = { ...fact('e', 0), volume: 0, started_at: '2026-10-02T08:00:00' };
  assert.equal(hasEarlierDay([empty, fact('a')], 'a'), false);
});
