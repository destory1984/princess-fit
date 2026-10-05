import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAT_ORDER,
  archetypeOf,
  computeStats,
  conditionPenalty,
  masterSays,
  scaleStats,
  weeklyPlan,
} from './character.ts';
import type { WorkoutFact } from './gamification.ts';

function fact(partial: Partial<WorkoutFact> & { started_at: string }): WorkoutFact {
  return {
    id: partial.started_at,
    groups: [],
    doneSets: 0,
    volume: 0,
    durationSec: 0,
    distanceKm: 0,
    cardioSec: 0,
    ...partial,
  };
}

test('an empty history leaves every stat at zero', () => {
  const stats = computeStats([], new Date('2026-09-19T10:00:00'));
  assert.deepEqual(Object.values(stats), [0, 0, 0, 0, 0]);
  assert.equal(archetypeOf(stats).name, '이름 없는 아이');
});

test('stats stay within 0 and 100 even for absurd inputs', () => {
  const stats = computeStats(
    [fact({ started_at: '2026-09-19T10:00:00', volume: 5e6, doneSets: 9999, durationSec: 5e6, cardioSec: 5e6 })],
    new Date('2026-09-19T12:00:00')
  );
  for (const [key, value] of Object.entries(stats)) {
    assert.ok(value >= 0 && value <= 100, `${key} out of range: ${value}`);
  }
});

test('lifting heavy makes a warrior, running makes a pilgrim', () => {
  const day = (d: number) => `2026-09-${String(d).padStart(2, '0')}T10:00:00`;
  const lifter = computeStats([fact({ started_at: day(19), volume: 9000, doneSets: 20 })]);
  assert.equal(archetypeOf(lifter).name, '괴력의 전사');

  const runner = computeStats([
    fact({ started_at: day(19), durationSec: 40_000, cardioSec: 40_000, distanceKm: 60 }),
  ]);
  assert.equal(archetypeOf(runner).name, '순례자');
});

test('balance rises with how many groups a week covers', () => {
  const groups = ['가슴', '등', '어깨', '하체', '팔', '복근'];
  const all = computeStats([fact({ started_at: '2026-09-19T10:00:00', groups })]);
  const half = computeStats([
    fact({ started_at: '2026-09-19T10:00:00', groups: groups.slice(0, 3) }),
  ]);
  assert.equal(all.balance, 100);
  assert.equal(half.balance, 50);
});

test('the master speaks to whatever is weakest, and to a broken streak', () => {
  const today = new Date('2026-09-19T10:00:00');
  assert.match(masterSays(computeStats([]), [], today), /첫 기록/);

  const stale = [fact({ started_at: '2026-09-01T10:00:00', volume: 5000 })];
  assert.match(masterSays(computeStats(stale, today), stale, today), /다시 시작/);
});

test('weekly plan counts distinct days since Monday', () => {
  const thursday = new Date('2026-09-17T10:00:00');
  const workouts = [
    fact({ started_at: '2026-09-14T10:00:00' }),
    fact({ started_at: '2026-09-16T10:00:00' }),
    fact({ started_at: '2026-09-16T19:00:00' }),
    fact({ started_at: '2026-09-10T10:00:00' }),
  ];
  const plan = weeklyPlan(workouts, 3, thursday);
  assert.equal(plan.done, 2);
  assert.equal(plan.met, false);
  assert.equal(plan.daysLeft, 3);
});

test('neglect dims every stat without reordering her strengths', () => {
  const stats = { strength: 80, stamina: 40, vitality: 60, balance: 20, discipline: 50 };
  const dim = scaleStats(stats, 0.7);
  assert.equal(dim.strength, 56);
  assert.equal(dim.balance, 14);
  const order = (s: typeof stats) =>
    STAT_ORDER.map((k) => [k, s[k]] as const).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  assert.deepEqual(order(dim), order(stats));
});

test('a well-kept girl is told nothing; a neglected one is told why', () => {
  assert.equal(conditionPenalty(1), null);
  assert.match(conditionPenalty(0.7)!, /30% 낮게/);
});

test('one modest session does not read as most of a year of strength', () => {
  // Two sets on the first evening came to 1,060kg and 근력 74, with the title
  // 괴력의 전사 to go with it. Strength has to leave the year something to fill.
  const day = new Date(2026, 9, 4);
  const first = computeStats([fact({ started_at: '2026-10-04T10:00:00', volume: 1_060, doneSets: 2 })], day);
  assert.equal(first.strength, 30);
  const strong = computeStats([fact({ started_at: '2026-10-04T10:00:00', volume: 6_000 })], day);
  assert.equal(strong.strength, 71);
  const capped = computeStats([fact({ started_at: '2026-10-04T10:00:00', volume: 20_000 })], day);
  assert.equal(capped.strength, 100);
});

test('one light afternoon does not earn a title', () => {
  // Three sets of 60kg × 10 on the first day: strength 39, the rest lower.
  const first = computeStats(
    [fact({ started_at: '2026-10-05T12:00:00', volume: 1800, doneSets: 3, groups: ['등'] })],
    new Date('2026-10-05T13:00:00')
  );
  assert.ok(first.strength < 50);
  assert.equal(archetypeOf(first).name, '길을 찾는 아이');
});
