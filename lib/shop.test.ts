import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESSORIES,
  buy,
  CLOTHES,
  FOOD,
  refusalFor,
  SPECIALS,
  WARDROBE_TOTAL,
  wardrobeProgress,
  effectiveCulture,
  wornCharm,
} from './shop.ts';
import { DAILY_UPKEEP, workoutGold, type Household } from './economy.ts';
import { LESSONS } from './lessons.ts';
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
test('a year of steady training pays for meals, the wardrobe and schooling', () => {
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
  // And twenty lessons across the year, at the going rate.
  const schooling = 20 * (LESSONS.reduce((s, l) => s + l.price, 0) / LESSONS.length);
  const spare = earned - upkeep - meals - schooling - WARDROBE_TOTAL;
  assert.ok(spare >= 0, `short by ${Math.round(-spare)}`);
});

test('wardrobe progress counts by price, not by pieces', () => {
  const early = wardrobeProgress(['linen']);
  assert.equal(early.count, 1);
  assert.ok(early.ratio < 0.1, 'the cheapest piece is a small share');
  const done = wardrobeProgress(CLOTHES.map((c) => c.id));
  assert.equal(done.complete, true);
  assert.equal(done.ratio, 1);
});

test('accessories are kept but do not mend a ragged outfit', () => {
  const ribbon = ACCESSORIES[0];
  const ragged: Household = { ...rich, attire: 10 };
  const { house, wardrobe } = buy(ribbon, ragged, []);
  assert.equal(house.attire, 10, 'a ribbon is not a change of clothes');
  assert.deepEqual(wardrobe, ['ribbon']);
  assert.equal(wornCharm(wardrobe), ribbon.charm);
});

test('the gem shelf is locked, however much gold she has', () => {
  assert.equal(refusalFor(SPECIALS[0], rich, []), 'locked');
  assert.throws(() => buy(SPECIALS[0], rich, []), /준비 중/);
});

test('accessories are not counted as wardrobe progress', () => {
  assert.equal(wardrobeProgress(['ribbon', 'tiara']).count, 0);
});

test('the charm an accessory promises actually shows up', () => {
  const taught = { grace: 10, learning: 10, charm: 20 };
  const worn = effectiveCulture(taught, ['ribbon', 'tiara']);
  assert.equal(worn.charm, 20 + 2 + 6);
  assert.equal(worn.grace, 10, 'nothing else is touched');
});

test('what she wears cannot push her past the cap', () => {
  const nearly = { grace: 0, learning: 0, charm: 98 };
  assert.equal(effectiveCulture(nearly, ['tiara']).charm, 100);
});
