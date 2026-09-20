import { localDayKey } from './format.ts';

export type SetRow = { weight_kg: number; reps: number; warmup?: boolean };

/**
 * Total weight moved, counting only the sets that were the point.
 *
 * Warm-ups are skipped here rather than at each call site, because this is
 * where the word 「볼륨」 gets its meaning and there is only one meaning worth
 * having. Gold is paid against this number too, so counting the warm-ups
 * would let anyone earn a wardrobe with an empty bar.
 */
export function volumeOf(sets: SetRow[]) {
  return sets.reduce((sum, s) => (s.warmup ? sum : sum + s.weight_kg * s.reps), 0);
}

export function streakDays(workoutDays: Iterable<string>, today: Date = new Date()) {
  const days = new Set(workoutDays);
  const cursor = new Date(today);
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type HistoryRow = {
  workout_id: string;
  exercise_id: string;
  set_no: number;
  weight_kg: number;
  reps: number;
  duration_sec?: number;
  distance_km?: number;
  rir?: number | null;
  warmup?: boolean;
  side?: 'L' | 'R' | null;
  workouts: { started_at: string };
};

export type ExerciseHistoryPoint = {
  workout_id: string;
  date: string;
  max_weight: number;
  volume: number;
  durationSec: number;
  distanceKm: number;
  sets: {
    set_no: number;
    weight_kg: number;
    reps: number;
    rir?: number | null;
    warmup?: boolean;
    side?: 'L' | 'R' | null;
  }[];
};

export function groupHistory(rows: HistoryRow[]) {
  const byWorkout = new Map<string, ExerciseHistoryPoint>();
  for (const row of rows) {
    const point: ExerciseHistoryPoint = byWorkout.get(row.workout_id) ?? {
      workout_id: row.workout_id,
      date: row.workouts.started_at,
      max_weight: 0,
      volume: 0,
      durationSec: 0,
      distanceKm: 0,
      sets: [],
    };
    point.sets.push({
      set_no: row.set_no,
      weight_kg: row.weight_kg,
      reps: row.reps,
      // Carried through so the next session's reading can use what they said
      // rather than only what the reps did.
      rir: row.rir ?? null,
      warmup: row.warmup ?? false,
      side: row.side ?? null,
    });
    // A warm-up never sets a record and never counts toward the session's
    // top weight, however honestly it was lifted.
    if (!row.warmup) point.max_weight = Math.max(point.max_weight, row.weight_kg);
    point.volume += row.weight_kg * row.reps;
    point.durationSec += row.duration_sec ?? 0;
    point.distanceKm += row.distance_km ?? 0;
    byWorkout.set(row.workout_id, point);
  }
  return [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
}
