import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageMinutes,
  formatDuration,
  formatMinuteOfDay,
  MIN_NIGHTS,
  series,
  sleepMinutes,
  trainedVersusRested,
  type SleepLog,
} from './sleep.ts';
import type { WorkoutFact } from './gamification.ts';

const night = (slept_on: string, bed: number, wake: number): SleepLog => ({
  id: slept_on,
  slept_on,
  bed_minute: bed,
  wake_minute: wake,
});

// Most nights cross midnight, which is the whole reason these are minutes
// past midnight rather than timestamps.
test('a night that crosses midnight is measured the long way round', () => {
  assert.equal(sleepMinutes(23 * 60, 7 * 60), 8 * 60);
  assert.equal(sleepMinutes(23 * 60 + 30, 6 * 60 + 15), 6 * 60 + 45);
});

test('a nap inside one day is measured directly', () => {
  assert.equal(sleepMinutes(13 * 60, 15 * 60), 2 * 60);
});

test('times and durations read the way people say them', () => {
  assert.equal(formatMinuteOfDay(23 * 60 + 5), '23:05');
  assert.equal(formatMinuteOfDay(0), '00:00');
  assert.equal(formatDuration(7 * 60 + 9), '7시간 9분');
  assert.equal(formatDuration(8 * 60), '8시간');
});

test('an average needs something to average', () => {
  assert.equal(averageMinutes([]), null);
  assert.equal(averageMinutes([night('2026-09-20', 23 * 60, 7 * 60)]), 480);
});

const workout = (day: string): WorkoutFact => ({
  id: day,
  started_at: `${day}T18:00:00`,
  groups: ['가슴'],
  doneSets: 10,
  volume: 2000,
  durationSec: 0,
  distanceKm: 0,
});

test('sleep on training days is compared with sleep on rest days', () => {
  const logs = [
    night('2026-09-14', 23 * 60, 7 * 60),
    night('2026-09-15', 23 * 60, 7 * 60),
    night('2026-09-16', 23 * 60, 7 * 60),
    night('2026-09-17', 1 * 60, 7 * 60),
    night('2026-09-18', 1 * 60, 7 * 60),
    night('2026-09-19', 1 * 60, 7 * 60),
  ];
  const trained = ['2026-09-14', '2026-09-15', '2026-09-16'].map(workout);
  const compared = trainedVersusRested(logs, trained)!;
  assert.equal(compared.trained, 8 * 60);
  assert.equal(compared.rested, 6 * 60);
  assert.equal(compared.trainedNights, 3);
});

// Two nights and a hunch is how people talk themselves into a pattern.
test('too few nights on either side says nothing at all', () => {
  const logs = [
    night('2026-09-18', 23 * 60, 7 * 60),
    night('2026-09-19', 23 * 60, 7 * 60),
    night('2026-09-20', 23 * 60, 7 * 60),
  ];
  assert.equal(trainedVersusRested(logs, [workout('2026-09-18')]), null);
  assert.equal(trainedVersusRested(logs, []), null, 'no training days either');
  assert.ok(MIN_NIGHTS >= 3);
});

test('a series comes back oldest first, in hours', () => {
  const logs = [
    night('2026-09-20', 23 * 60, 7 * 60),
    night('2026-09-18', 0, 6 * 60 + 30),
  ];
  assert.deepEqual(
    series(logs).map((p) => p.value),
    [6.5, 8]
  );
});
