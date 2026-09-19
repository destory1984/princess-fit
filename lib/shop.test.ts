import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buy, CLOTHES, FOOD, refusalFor, WARDROBE_TOTAL, wardrobeProgress } from './shop.ts';
import { DAILY_UPKEEP, workoutGold, type Household } from './economy.ts';
import type { WorkoutFact } from './gamification.ts';

const rich: Household = { gold: 10_000, satiety: 50, attire: 10, settledOn: '2026-09-20' };

test('food fills her up and is gone', () => {
  const stew = FOOD.find((f) => f.id === 'stew')!;
  const { house, wardrobe } = buy(stew, rich, []);
  assert.equal(house.gold, 10_000 - stew.price);
  assert.equal(house.satiety, 90);
  assert.deepEqual(wardrobe, []);
});

test('food cannot overfill her', () => {
  const feast = FOOD.find((f) => f.id === 'feast')!;
  const { house } = buy(feast, { ...rich, satiety: 80 }, []);
  assert.equal(house.satiety, 100);
});

test('clothes are kept, and turn her out properly again', () => {
  const linen = CLOTHES[0];
  const { house, wardrobe } = buy(linen, rich, []);
  assert.equal(house.attire, 100);
  assert.deepEqual(wardrobe, ['linen']);
});

test('the same outfit cannot be bought twice', () => {
  const linen = CLOTHES[0];
  assert.equal(refusalFor(linen, rich, ['linen']), 'owned');
  assert.throws(() => buy(linen, rich, ['linen']), /이미/);
});

test('an empty purse refuses before anything is spent', () => {
  const poor: Household = { ...rich, gold: 5 };
  assert.equal(refusalFor(CLOTHES[0], poor, []), 'poor');
  assert.throws(() => buy(CLOTHES[0], poor, []), /모자라요/);
});

test('a full belly refuses more food but not a new dress', () => {
  const stuffed: Household = { ...rich, satiety: 100 };
  assert.equal(refusalFor(FOOD[0], stuffed, []), 'full');
  assert.equal(refusalFor(CLOTHES[0], stuffed, []), null);
});

// The promise the whole design rests on, checked end to end rather than by
// eyeballing two constants in different files.
test('a year of steady training pays for the whole wardrobe and her meals', () => {
  const typical: WorkoutFact = {
    id: 'w',
    started_at: '2026-09-20T10:00:00',
    groups: ['가슴'],
    doneSets: 12,
    volume: 3000,
    durationSec: 0,
    distanceKm: 0,
  };
  const earned = workoutGold(typical) * 156;
  const upkeep = DAILY_UPKEEP * 365;
  // Roughly a decent meal every other day alongside the clothes.
  const meals = 25 * 180;
  assert.ok(
    earned - upkeep - meals >= WARDROBE_TOTAL,
    `short by ${WARDROBE_TOTAL - (earned - upkeep - meals)}`
  );
});

test('wardrobe progress counts by price, not by pieces', () => {
  const early = wardrobeProgress(['linen']);
  assert.equal(early.count, 1);
  assert.ok(early.ratio < 0.1, 'the cheapest piece is a small share');
  const done = wardrobeProgress(CLOTHES.map((c) => c.id));
  assert.equal(done.complete, true);
  assert.equal(done.ratio, 1);
});
