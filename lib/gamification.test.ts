import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bestWeeklyCoverage,
  weeklyGoalRun,
  evaluateBadges,
  levelAt,
  longestStreak,
  summarise,
  workoutXp,
  type WorkoutFact,
} from './gamification.ts';

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

test('xp rewards sets, volume and cardio minutes on top of showing up', () => {
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', doneSets: 1 })), 60);
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', doneSets: 3 })), 80);
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', doneSets: 1, volume: 2500 })), 85);
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', durationSec: 1800 })), 110);
});

test('levels start at 100 xp and stretch out', () => {
  assert.equal(levelAt(0).level, 1);
  assert.equal(levelAt(99).level, 1);
  assert.equal(levelAt(100).level, 2);
  assert.equal(levelAt(400).level, 3);
  assert.equal(levelAt(2500).level, 6);
  const at150 = levelAt(150);
  assert.equal(at150.floorXp, 100);
  assert.equal(at150.nextXp, 400);
  assert.equal(at150.toNext, 250);
});

test('every level has its own rank, and the top one holds', () => {
  assert.equal(levelAt(0).title, '견습');
  assert.equal(levelAt(100).title, '시동');
  assert.equal(levelAt(400).title, '종자');
  assert.equal(levelAt(12100).title, '여왕');
  // past the last rank the title stays put rather than going undefined
  assert.equal(levelAt(1_000_000).title, '여왕');
});

test('longest streak counts consecutive calendar days, not sessions', () => {
  const days = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-15'];
  const workouts = days.map((d) => fact({ started_at: `${d}T10:00:00` }));
  assert.equal(longestStreak(workouts), 3);
  // two sessions on one day must not inflate the streak
  workouts.push(fact({ started_at: '2026-09-15T19:00:00' }));
  assert.equal(longestStreak(workouts), 3);
});

test('weekly coverage looks at any 7-day window', () => {
  const workouts = [
    fact({ started_at: '2026-09-01T10:00:00', groups: ['가슴'] }),
    fact({ started_at: '2026-09-03T10:00:00', groups: ['등', '팔'] }),
    fact({ started_at: '2026-09-06T10:00:00', groups: ['하체'] }),
    fact({ started_at: '2026-09-20T10:00:00', groups: ['어깨'] }),
  ];
  assert.equal(bestWeeklyCoverage(workouts), 4);
});

test('badges report progress before they are earned', () => {
  const workouts = Array.from({ length: 4 }, (_, i) =>
    fact({ started_at: `2026-09-0${i + 1}T10:00:00` })
  );
  const badges = evaluateBadges(workouts, new Date('2026-09-05T10:00:00'));
  const first = badges.find((b) => b.id === 'first')!;
  const ten = badges.find((b) => b.id === 'ten')!;
  assert.equal(first.earned, true);
  assert.equal(ten.earned, false);
  assert.equal(ten.progress, 0.4);
});

test('an empty history earns nothing and stays at level 1', () => {
  const s = summarise([], new Date('2026-09-19T10:00:00'));
  assert.equal(s.xp, 0);
  assert.equal(s.level, 1);
  assert.equal(s.streak, 0);
  assert.equal(s.earnedCount, 0);
});

test('weekly goal run counts consecutive qualifying weeks', () => {
  // Mondays: 2026-08-31, 09-07, 09-14. Today falls in the 09-14 week.
  const today = new Date(2026, 8, 17);
  const on = (y: number, m: number, d: number) => fact({ started_at: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T10:00:00` });
  const workouts = [
    on(2026, 8, 31), on(2026, 9, 1), on(2026, 9, 2),
    on(2026, 9, 7), on(2026, 9, 8), on(2026, 9, 9),
    on(2026, 9, 14), on(2026, 9, 15), on(2026, 9, 16),
  ];
  assert.equal(weeklyGoalRun(workouts, 3, today), 3);
});

test('a week still in progress does not break the run', () => {
  const today = new Date(2026, 8, 15); // Tuesday, only one session so far
  const on = (m: number, d: number) => fact({ started_at: `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T10:00:00` });
  const workouts = [on(9, 7), on(9, 8), on(9, 9), on(9, 14)];
  assert.equal(weeklyGoalRun(workouts, 3, today), 1);
});

test('two sessions in one day count once toward the weekly goal', () => {
  const today = new Date(2026, 8, 17);
  const twice = [
    fact({ id: 'a', started_at: '2026-09-14T09:00:00' }),
    fact({ id: 'b', started_at: '2026-09-14T19:00:00' }),
    fact({ id: 'c', started_at: '2026-09-15T09:00:00' }),
  ];
  assert.equal(weeklyGoalRun(twice, 3, today), 0);
});

test('an empty session earns nothing and keeps no streak', () => {
  const empty = fact({ started_at: '2026-09-21T10:00:00' });
  assert.equal(workoutXp(empty), 0);
  const done = fact({ started_at: '2026-09-20T10:00:00', doneSets: 3 });
  const s = summarise([empty, done], new Date('2026-09-21T20:00:00'));
  assert.equal(s.xp, workoutXp(done));
  assert.equal(s.streak, 1);
});
