import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afterWorkout,
  conditionFactor,
  DAILY_UPKEEP,
  messageFor,
  moodOf,
  newHousehold,
  settle,
  STARTING_GOLD,
  tomorrowsMessage,
  thanksFor,
  workoutGold,
  type GiftKind,
  type Household,
} from './economy.ts';
import type { WorkoutFact } from './gamification.ts';

function fact(partial: Partial<WorkoutFact> = {}): WorkoutFact {
  return {
    id: 'w',
    started_at: '2026-09-20T10:00:00',
    groups: ['가슴'],
    doneSets: 0,
    volume: 0,
    durationSec: 0,
    distanceKm: 0,
    ...partial,
  };
}

test('showing up pays, and doing more pays more', () => {
  assert.equal(workoutGold(fact()), 75);
  assert.equal(workoutGold(fact({ doneSets: 12 })), 111);
  assert.equal(workoutGold(fact({ volume: 3000 })), 90);
  assert.equal(workoutGold(fact({ durationSec: 1800 })), 105);
});

// The whole economy is tuned around this one promise, so it is asserted rather
// than left to a comment: a year of three-a-week pays for the wardrobe.
test('a year of steady training funds a full wardrobe', () => {
  const typical = fact({ doneSets: 12, volume: 3000 });
  const sessions = 156;
  const earned = workoutGold(typical) * sessions;
  const upkeep = DAILY_UPKEEP * 365;
  assert.ok(earned - upkeep >= 10_000, `left over: ${earned - upkeep}`);
});

test('a day away costs upkeep, hunger and a little wear', () => {
  const start: Household = { gold: 100, satiety: 100, attire: 100, settledOn: '2026-09-18' };
  const after = settle(start, new Date(2026, 8, 20));
  assert.equal(after.gold, 100 - DAILY_UPKEEP * 2);
  assert.equal(after.satiety, 100 - 14 * 2);
  assert.equal(after.attire, 100 - 2 * 2);
});

test('settling twice in one day charges once', () => {
  const start = newHousehold(new Date(2026, 8, 20));
  const once = settle({ ...start, gold: 50 }, new Date(2026, 8, 21));
  assert.deepEqual(settle(once, new Date(2026, 8, 21)), once);
});

test('nothing goes below zero, however long the absence', () => {
  const start: Household = { gold: 10, satiety: 20, attire: 5, settledOn: '2025-01-01' };
  const after = settle(start, new Date(2026, 8, 20));
  assert.equal(after.gold, 0);
  assert.equal(after.satiety, 0);
  assert.equal(after.attire, 0);
});

test('a bad stretch costs ground but never erases the year', () => {
  assert.equal(conditionFactor({ gold: 0, satiety: 100, attire: 100, settledOn: 'x' }), 1);
  assert.equal(conditionFactor({ gold: 0, satiety: 0, attire: 0, settledOn: 'x' }), 0.7);
});

test('hunger speaks before loneliness does', () => {
  const house: Household = { gold: 0, satiety: 10, attire: 100, settledOn: '2026-09-20' };
  assert.equal(moodOf(house, [], new Date(2026, 8, 20)), 'hungry');
});

test('a long absence with a full belly reads as lonely', () => {
  const house: Household = { gold: 0, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  const old = [fact({ started_at: '2026-09-10T10:00:00' })];
  assert.equal(moodOf(house, old, new Date(2026, 8, 20)), 'lonely');
});

test('the same day always says the same thing', () => {
  const day = new Date(2026, 8, 20);
  assert.equal(messageFor('hungry', day), messageFor('hungry', day));
});

test('a workout pays into the purse and feeds her a little', () => {
  const house: Household = { gold: 0, satiety: 50, attire: 50, settledOn: '2026-09-20' };
  const after = afterWorkout(house, fact({ doneSets: 10 }));
  assert.equal(after.gold, 105);
  assert.equal(after.satiety, 54);
});

test('the scheduled line speaks for tomorrow, not for today', () => {
  // Settled tonight at 44, hungry tomorrow at 30 once the day is charged.
  const house: Household = { gold: 100, satiety: 44, attire: 100, settledOn: '2026-09-20' };
  const today = new Date(2026, 8, 20);
  const fresh = [fact({ started_at: '2026-09-20T10:00:00' })];
  assert.equal(moodOf(house, fresh, today), 'fine');
  assert.equal(tomorrowsMessage(house, fresh, today), messageFor('hungry', new Date(2026, 8, 21)));
});

test('she does not start penniless and hungry', () => {
  const fresh = newHousehold(new Date(2026, 8, 20));
  assert.equal(fresh.gold, STARTING_GOLD);
  assert.equal(fresh.satiety, 100);
  // Enough for a few real meals before the first workout is banked.
  assert.ok(STARTING_GOLD >= 25 * 3);
});

test('she says something about every kind of thing bought for her', () => {
  const kinds: GiftKind[] = ['food', 'clothes', 'accessory', 'furniture', 'lesson'];
  for (const kind of kinds) {
    assert.ok(thanksFor(kind, 'bread').length > 0, kind);
  }
});

test('the same purchase always draws the same line', () => {
  assert.equal(thanksFor('clothes', 'gown'), thanksFor('clothes', 'gown'));
});
