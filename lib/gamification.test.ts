import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bestWeeklyCoverage,
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
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00' })), 50);
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', doneSets: 3 })), 80);
  assert.equal(workoutXp(fact({ started_at: '2026-09-19T10:00:00', volume: 2500 })), 75);
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

test('level titles rise with level', () => {
  assert.equal(levelAt(0).title, '입문');
  assert.equal(levelAt(400).title, '초급');
  assert.equal(levelAt(1600).title, '중급');
  assert.equal(levelAt(4900).title, '상급');
  assert.equal(levelAt(12100).title, '고수');
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
