import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afterWorkout,
  conditionFactor,
  DAILY_UPKEEP,
  faceFor,
  messageFor,
  moodOf,
  newHousehold,
  settle,
  STARTING_GOLD,
  tomorrowsMessage,
  dailyLine,
  thanksFor,
  workoutGold,
  type Bond,
  type GiftKind,
  type Household,
} from './economy.ts';
import type { WorkoutFact } from './gamification.ts';
import { enrol, LESSONS } from './lessons.ts';
import { eventMemory } from './companion.ts';

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
  assert.equal(workoutGold(fact({ doneSets: 1 })), 78);
  assert.equal(workoutGold(fact({ doneSets: 12 })), 111);
  assert.equal(workoutGold(fact({ doneSets: 1, volume: 3000 })), 93);
  assert.equal(workoutGold(fact({ durationSec: 1800 })), 105);
});

test('a session with nothing done pays nothing', () => {
  assert.equal(workoutGold(fact()), 0);
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

test('someone she has never seen train has not been away', () => {
  // A new account has no last day to count from. 「며칠 안 보이셔서요」 on the
  // first morning claims days she never saw.
  const house: Household = { gold: 150, satiety: 100, attire: 100, settledOn: '2026-09-20' };
  assert.equal(moodOf(house, [], new Date(2026, 8, 20)), 'fine');
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

test('she says what she needs before she says what your training needs', () => {
  const hungry: Household = { gold: 0, satiety: 10, attire: 100, settledOn: '2026-09-20' };
  const chestOnly = [0, 2, 4, 6, 8].map((d) => {
    const when = new Date(2026, 8, 20 - d);
    return fact({ id: `c${d}`, started_at: `${when.toISOString().slice(0, 10)}T10:00:00` });
  });
  const line = dailyLine(hungry, chestOnly, new Date(2026, 8, 20));
  assert.equal(line, messageFor('hungry', new Date(2026, 8, 20)));
});

test('once she is comfortable she passes on what the numbers noticed', () => {
  const settled: Household = { gold: 500, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  const chestOnly = [0, 2, 4, 6, 8, 45].map((d) => {
    const when = new Date(2026, 8, 20 - d);
    return fact({ id: `c${d}`, started_at: `${when.toISOString().slice(0, 10)}T10:00:00` });
  });
  const line = dailyLine(settled, chestOnly, new Date(2026, 8, 20));
  assert.match(line, /한 달째 안 했어요|유산소|몰려 있어요/);
});

test('with nothing to report she just says hello', () => {
  const settled: Household = { gold: 500, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  const line = dailyLine(settled, [], new Date(2026, 8, 20));
  assert.ok(line.length > 0);
  assert.doesNotMatch(line, /한 달째/);
});

test('she mentions a course on the days worth mentioning, and not the rest', () => {
  const happy: Household = { gold: 500, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  // One session on each day being checked: otherwise she is four days alone
  // by the end of the week, and being lonely rightly outranks a dance class.
  const trained = ['09-20', '09-21', '09-23', '09-24'].map((day) => ({
    started_at: `2026-${day}T09:00:00`,
    volume: 1000,
    doneSets: 10,
    durationSec: 0,
    groups: ['가슴'],
  })) as any;
  const lesson = enrol(LESSONS.find((l) => l.days === 5)!, new Date(2026, 8, 20));

  const first = dailyLine(happy, trained, new Date(2026, 8, 20), lesson);
  assert.ok(first.includes('오늘부터'), first);

  // The middle of a course: she has nothing new to say about it, so she says
  // something else rather than repeating herself every evening for a week.
  const middle = dailyLine(happy, trained, new Date(2026, 8, 21), lesson);
  assert.ok(!middle.includes('오늘부터'), middle);

  const lastButOne = dailyLine(happy, trained, new Date(2026, 8, 23), lesson);
  assert.ok(lastButOne.includes('이틀'), lastButOne);

  const last = dailyLine(happy, trained, new Date(2026, 8, 24), lesson);
  assert.ok(last.includes('마지막'), last);
});

test('a course never speaks over hunger or rags', () => {
  const hungry: Household = { gold: 0, satiety: 10, attire: 90, settledOn: '2026-09-20' };
  const lesson = enrol(LESSONS[0], new Date(2026, 8, 20));
  const said = dailyLine(hungry, [], new Date(2026, 8, 20), lesson);
  assert.ok(!said.includes('배우러'), said);
});

test("tomorrow's message drops a course that will be over by then", () => {
  const happy: Household = { gold: 500, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  const oneDay = enrol({ ...LESSONS[0], days: 1 }, new Date(2026, 8, 20));
  const said = tomorrowsMessage(happy, [], new Date(2026, 8, 20), oneDay);
  assert.ok(!said.includes('배우러'), said);
});

test('a memory made today is said before her schedule, but after her hunger', () => {
  const today = new Date(2026, 8, 20);
  const bond = { stage: 'new' as const, memories: [eventMemory('first_garment', '리본', today)] };
  const happy: Household = { gold: 500, satiety: 90, attire: 90, settledOn: '2026-09-20' };
  const trained = [fact({ id: 't', started_at: '2026-09-20T10:00:00', doneSets: 3 })];
  const lesson = enrol(LESSONS[0], today);
  assert.match(dailyLine(happy, trained, today, lesson, bond), /리본/);

  const hungry: Household = { ...happy, satiety: 10 };
  assert.equal(dailyLine(hungry, trained, today, lesson, bond), messageFor('hungry', today));
});

test('she speaks differently once she knows you', () => {
  const day = new Date(2026, 8, 20);
  const first = new Set([0, 1, 2, 3].map((d) => messageFor('fine', new Date(2026, 8, 20 + d))));
  const later = new Set([0, 1, 2, 3].map((d) => messageFor('fine', new Date(2026, 8, 20 + d), 'old')));
  assert.equal([...first].filter((l) => later.has(l)).length, 0);
  // Hunger is about her, and she says it the same way at every stage.
  assert.equal(messageFor('hungry', day, 'old'), messageFor('hungry', day));
});

test('a sulk comes before everything, and never reaches a notification', () => {
  const today = new Date(2026, 8, 20);
  const hungry: Household = { gold: 0, satiety: 10, attire: 100, settledOn: '2026-09-20' };
  const sulking = { stage: 'new' as const, memories: [], sulk: { reason: 'returned' as const, other: 'dohwa', away: 10 } };
  assert.match(dailyLine(hungry, [], today, null, sulking, 'geumhwa'), /피아|10일 만/);
  assert.doesNotMatch(tomorrowsMessage(hungry, [], today, null, sulking, 'geumhwa'), /피아|만이에요/);
  const madeUp = { stage: 'new' as const, memories: [], madeUp: true };
  assert.match(dailyLine(hungry, [], today, null, madeUp, 'dohwa'), /풀렸|화해/);
});

test('her face follows what she says: a sulk before hunger, and glad the day it ends', () => {
  const hungry: Household = { gold: 0, satiety: 10, attire: 100, settledOn: '2026-09-20' };
  const today = new Date(2026, 8, 20);
  const bond = { stage: 'new', memories: [] } as unknown as Bond;
  assert.equal(faceFor(hungry, [], null, today), 'hungry');
  assert.equal(faceFor(hungry, [], { ...bond, sulk: { reason: 'fickle' } } as unknown as Bond, today), 'sulky');
  assert.equal(faceFor(hungry, [], { ...bond, madeUp: true } as Bond, today), 'happy');
});
