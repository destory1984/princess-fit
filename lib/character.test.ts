import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archetypeOf, computeStats, masterSays, weeklyPlan } from './character.ts';
import type { WorkoutFact } from './gamification.ts';

function fact(partial: Partial<WorkoutFact> & { started_at: string }): WorkoutFact {
  return {
    id: partial.started_at,
    groups: [],
    doneSets: 0,
    volume: 0,
    durationSec: 0,
    distanceKm: 0,
    ...partial,
  };
}

test('an empty history leaves every stat at zero', () => {
  const stats = computeStats([], new Date('2026-09-19T10:00:00'));
  assert.deepEqual(Object.values(stats), [0, 0, 0, 0, 0]);
  assert.equal(archetypeOf(stats).name, '백지(白紙)');
});

test('stats stay within 0 and 100 even for absurd inputs', () => {
  const stats = computeStats(
    [fact({ started_at: '2026-09-19T10:00:00', volume: 5e6, doneSets: 9999, durationSec: 5e6 })],
    new Date('2026-09-19T12:00:00')
  );
  for (const [key, value] of Object.entries(stats)) {
    assert.ok(value >= 0 && value <= 100, `${key} out of range: ${value}`);
  }
});

test('lifting heavy makes 역사, running makes 축지 행자', () => {
  const day = (d: number) => `2026-09-${String(d).padStart(2, '0')}T10:00:00`;
  const lifter = computeStats([fact({ started_at: day(19), volume: 9000, doneSets: 20 })]);
  assert.equal(archetypeOf(lifter).name, '역사(力士)');

  const runner = computeStats([
    fact({ started_at: day(19), durationSec: 40_000, distanceKm: 60 }),
  ]);
  assert.equal(archetypeOf(runner).name, '축지 행자');
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
