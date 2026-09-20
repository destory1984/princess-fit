import { localDayKey } from './format.ts';
import type { WorkoutFact } from './gamification.ts';

/**
 * Sleep, written down by hand.
 *
 * Nothing here guesses at REM or deep sleep — those come from a band on your
 * wrist, and an app that made them up would be lying in a graph. What can be
 * recorded honestly is when you went to bed and when you got up, which is
 * enough for the only question worth asking of it: does training change it?
 *
 * Times are stored as minutes past midnight rather than timestamps, so a
 * night that crosses midnight — which most do — needs no timezone reasoning.
 */

export type SleepLog = {
  id: string;
  /** The morning you woke, which is how a night is named. */
  slept_on: string;
  bed_minute: number;
  wake_minute: number;
};

export const DEFAULT_BED = 23 * 60;
export const DEFAULT_WAKE = 7 * 60;
const DAY = 24 * 60;

/** How long the night lasted, wrapping past midnight when it has to. */
export function sleepMinutes(bedMinute: number, wakeMinute: number) {
  const span = wakeMinute - bedMinute;
  return span > 0 ? span : span + DAY;
}

export function formatMinuteOfDay(minute: number) {
  const m = ((minute % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export function averageMinutes(logs: SleepLog[]) {
  if (logs.length === 0) return null;
  const total = logs.reduce((s, l) => s + sleepMinutes(l.bed_minute, l.wake_minute), 0);
  return Math.round(total / logs.length);
}

/**
 * Sleep on the nights before a workout against the nights before a rest day.
 *
 * This is the reason to keep the log at all, and the comparison is deliberately
 * cautious: with fewer than three nights on either side it says nothing, since
 * two nights and a hunch is how people talk themselves into a pattern.
 */
export const MIN_NIGHTS = 3;

export function trainedVersusRested(logs: SleepLog[], workouts: WorkoutFact[]) {
  const trainedDays = new Set(workouts.map((w) => localDayKey(new Date(w.started_at))));

  const trained: SleepLog[] = [];
  const rested: SleepLog[] = [];
  for (const log of logs) {
    (trainedDays.has(log.slept_on) ? trained : rested).push(log);
  }

  if (trained.length < MIN_NIGHTS || rested.length < MIN_NIGHTS) return null;
  return {
    trained: averageMinutes(trained)!,
    rested: averageMinutes(rested)!,
    trainedNights: trained.length,
    restedNights: rested.length,
  };
}

/** Oldest first, ready to plot in hours. */
export function series(logs: SleepLog[]) {
  return [...logs]
    .sort((a, b) => a.slept_on.localeCompare(b.slept_on))
    .map((l) => ({
      label: l.slept_on.slice(5),
      value: Math.round((sleepMinutes(l.bed_minute, l.wake_minute) / 60) * 10) / 10,
    }));
}
