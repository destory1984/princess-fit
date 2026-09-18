import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupHistory, streakDays, volumeOf } from './stats.ts';
import { formatDate, localDayKey } from './format.ts';

const day = (y: number, m: number, d: number) => localDayKey(new Date(y, m - 1, d, 12));

test('streak counts consecutive local days ending today', () => {
  const today = new Date(2026, 8, 19, 9);
  const days = [day(2026, 9, 19), day(2026, 9, 18), day(2026, 9, 17), day(2026, 9, 14)];
  assert.equal(streakDays(days, today), 3);
});

test('streak survives a rest day today by counting from yesterday', () => {
  const today = new Date(2026, 8, 19, 9);
  const days = [day(2026, 9, 18), day(2026, 9, 17)];
  assert.equal(streakDays(days, today), 2);
});

test('streak is zero when neither today nor yesterday has a workout', () => {
  const today = new Date(2026, 8, 19, 9);
  assert.equal(streakDays([day(2026, 9, 16)], today), 0);
  assert.equal(streakDays([], today), 0);
});

test('local day key uses the local calendar, not UTC', () => {
  const lateEvening = new Date(2026, 8, 19, 23, 30);
  assert.equal(localDayKey(lateEvening), '2026-09-19');
  assert.equal(formatDate(lateEvening.toISOString()), '2026.09.19');
  assert.equal(formatDate(lateEvening.toISOString(), 'short'), '9/19');
});

test('groupHistory aggregates sets per workout in date order', () => {
  const rows = [
    { workout_id: 'b', exercise_id: 'x', set_no: 1, weight_kg: 62.5, reps: 8, workouts: { started_at: '2026-09-18T10:00:00Z' } },
    { workout_id: 'a', exercise_id: 'x', set_no: 1, weight_kg: 60, reps: 10, workouts: { started_at: '2026-09-15T10:00:00Z' } },
    { workout_id: 'a', exercise_id: 'x', set_no: 2, weight_kg: 60, reps: 8, workouts: { started_at: '2026-09-15T10:00:00Z' } },
  ];
  const points = groupHistory(rows);
  assert.deepEqual(
    points.map((p) => [p.workout_id, p.max_weight, p.volume, p.sets.length]),
    [
      ['a', 60, 1080, 2],
      ['b', 62.5, 500, 1],
    ]
  );
});

test('volumeOf multiplies weight by reps', () => {
  assert.equal(volumeOf([{ weight_kg: 60, reps: 10 }, { weight_kg: 0, reps: 12 }]), 600);
});
