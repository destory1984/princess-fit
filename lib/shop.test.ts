import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESSORIES, adorned, buy, effectiveCulture, FOOD, givenToday, refusalFor, wornCharm } from './shop.ts';
import { FURNITURE, ROOM_TOTAL } from './room.ts';
import { GARMENTS, OUTFIT_TOTAL } from './outfit.ts';
import { EMPTY_CULTURE, LESSONS } from './lessons.ts';
import { DAILY_UPKEEP, workoutGold, type Household } from './economy.ts';
import type { WorkoutFact } from './gamification.ts';
import { prizeFor } from './festival.ts';

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

test('an empty purse refuses before anything is spent', () => {
  const poor: Household = { ...rich, gold: 5 };
  assert.equal(refusalFor(ACCESSORIES[0], poor, []), 'poor');
  assert.throws(() => buy(ACCESSORIES[0], poor, []), /모자라요/);
});

test('a full belly refuses more food but not a new dress', () => {
  const stuffed: Household = { ...rich, satiety: 100 };
  assert.equal(refusalFor(FOOD[0], stuffed, []), 'full');
  assert.equal(refusalFor(ACCESSORIES[0], stuffed, []), null);
});

const typical: WorkoutFact = {
  id: 'w',
  started_at: '2026-09-20T10:00:00',
  groups: ['가슴'],
  doneSets: 12,
  volume: 3000,
  durationSec: 0,
  distanceKm: 0,
  cardioSec: 0,
};

// The shop is where you give her things, not a list to finish. A gift is
// something a week or two of turning up pays for — never a season's saving.
test('any one gift is a week or two of training, not a season', () => {
  const gifts = [...GARMENTS, ...ACCESSORIES, ...FURNITURE];
  for (const g of gifts) {
    const workouts = g.price / workoutGold(typical);
    assert.ok(workouts <= 12, `${g.name}: ${workouts.toFixed(1)} workouts`);
  }
});

// And steady training can give her all of it within the year, alongside her
// meals and her schooling — checked end to end rather than by eyeballing
// constants in different files.
//
// All of it but the spare festival clothes (2026-10-07). A contest wants one
// thing to wear to it, and the second gown is a choice between two, not a
// rung: the year pays for the cheapest of each. And the year has twelve
// festivals in it, which pay 40G apiece to someone who only ever comes third.
test('a year of steady training pays for every gift, her meals and her schooling', () => {
  const forContests = GARMENTS.filter((g) => g.suits);
  const oneEach = [...new Set(forContests.map((g) => g.suits))].map((c) =>
    Math.min(...forContests.filter((g) => g.suits === c).map((g) => g.price))
  );
  const spares = forContests.reduce((s, g) => s + g.price, 0) - oneEach.reduce((s, p) => s + p, 0);
  const prizes = 12 * prizeFor(3);
  const earned = workoutGold(typical) * 156;
  const upkeep = DAILY_UPKEEP * 365;
  const meals = 25 * 180;
  const schooling = 20 * (LESSONS.reduce((s, l) => s + l.price, 0) / LESSONS.length);
  const accessories = ACCESSORIES.reduce((s, a) => s + a.price, 0);
  const spare = earned + prizes - upkeep - meals - schooling - (OUTFIT_TOTAL - spares) - ROOM_TOTAL - accessories;
  assert.ok(spare >= 0, `short by ${Math.round(-spare)}`);
});

test('one gift a day; food is not a gift', () => {
  const today = new Date(2026, 8, 23, 20);
  assert.equal(givenToday('2026-09-23', today), true);
  assert.equal(givenToday('2026-09-22', today), false);
  assert.equal(givenToday(null, today), false);
  assert.equal(refusalFor(ACCESSORIES[0], rich, [], '2026-09-23', today), 'given');
  assert.equal(refusalFor(ACCESSORIES[0], rich, [], '2026-09-22', today), null);
  assert.equal(refusalFor(FOOD[0], rich, [], '2026-09-23', today), null);
});

test('accessories are kept but do not mend a ragged outfit', () => {
  const trinket = ACCESSORIES[0];
  const ragged: Household = { ...rich, attire: 10 };
  const { house, wardrobe } = buy(trinket, ragged, []);
  assert.equal(house.attire, 10, 'a brooch is not a change of clothes');
  assert.deepEqual(wardrobe, [trinket.id]);
  assert.equal(wornCharm(wardrobe), trinket.charm);
});


test('the charm an accessory promises actually shows up', () => {
  const taught = { grace: 10, learning: 10, charm: 20 };
  const brooch = ACCESSORIES.find((a) => a.id === 'brooch')!;
  const tiara = ACCESSORIES.find((a) => a.id === 'tiara')!;
  const worn = effectiveCulture(taught, [brooch.id, tiara.id]);
  assert.equal(worn.charm, 20 + brooch.charm! + tiara.charm!);
  assert.equal(worn.grace, 10, 'nothing else is touched');
});

test('the ribbon moved to the wardrobe and is a garment now, not a trinket', () => {
  // It has art, so it is drawn on her rather than counted from a list — which
  // means its charm counts only while she has it on, like every other garment.
  assert.ok(!ACCESSORIES.some((a) => a.id === 'ribbon'));
  const ribbon = GARMENTS.find((g) => g.id === 'ribbon')!;
  assert.equal(ribbon.slot, 'head');
  assert.equal(wornCharm(['ribbon']), 0, 'owning it is not wearing it');
});

test('what she wears cannot push her past the cap', () => {
  const nearly = { grace: 0, learning: 0, charm: 98 };
  assert.equal(effectiveCulture(nearly, ['tiara']).charm, 100);
});

test('the charm a garment promises counts only while she is wearing it', () => {
  const taught = { grace: 0, learning: 0, charm: 10 };
  const blouse = GARMENTS.find((g) => g.id === 'blouse')!;
  assert.equal(effectiveCulture(taught, ['blouse'], []).charm, 10, 'owned but not on');
  assert.equal(effectiveCulture(taught, ['blouse'], ['blouse']).charm, 10 + blouse.charm);
});

test('a garment hidden under the gown stops counting', () => {
  const taught = { grace: 0, learning: 0, charm: 0 };
  const gown = GARMENTS.find((g) => g.id === 'gown')!;
  assert.equal(effectiveCulture(taught, [], ['blouse', 'gown']).charm, gown.charm);
});

/**
 * Three times a price tag has promised something the code never did: the
 * condition factor, accessory charm, garment charm. This walks the whole
 * catalogue and holds every advertised effect to actually landing, so the
 * fourth one fails here rather than in someone's save file.
 */
test('every effect a shelf advertises actually happens', () => {
  const start: Household = { gold: 100_000, satiety: 0, attire: 50, settledOn: '2026-09-20' };

  for (const item of FOOD) {
    const { house } = buy(item, start, []);
    assert.equal(house.satiety, item.restores, `${item.id} restores what it says`);
    assert.equal(house.gold, start.gold - item.price, `${item.id} costs what it says`);
  }

  for (const item of ACCESSORIES) {
    const { house, wardrobe } = buy(item, start, []);
    assert.equal(house.gold, start.gold - item.price, `${item.id} costs what it says`);
    const before = effectiveCulture(EMPTY_CULTURE, [], []);
    const after = effectiveCulture(EMPTY_CULTURE, wardrobe, []);
    assert.equal(after.charm - before.charm, item.charm, `${item.id} adds the charm it says`);
  }

  for (const garment of GARMENTS) {
    const worn = effectiveCulture(EMPTY_CULTURE, [], [garment.id]);
    assert.equal(worn.charm, garment.charm, `${garment.id} adds the charm it says`);
  }
});

test('an accessory shows on her from the day it is given', () => {
  // There is no wearing or taking off an accessory: its charm counts once it
  // is owned, so the drawing has to show it then too.
  assert.deepEqual(adorned(['ribbon'], ['ribbon', 'tiara', 'gown']), ['ribbon', 'tiara']);
  assert.deepEqual(adorned([], []), []);
});

test('she takes her accessories off to train', async () => {
  const { dressedFor } = await import('./outfit.ts');
  assert.deepEqual(dressedFor(adorned(['ribbon', 'gown'], ['tiara', 'gloves']), 'gym'), ['ribbon']);
});
