import { localDayKey } from './format.ts';

export type SetRow = { weight_kg: number; reps: number };

export function volumeOf(sets: SetRow[]) {
  return sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
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
  workouts: { started_at: string };
};

export type ExerciseHistoryPoint = {
  workout_id: string;
  date: string;
  max_weight: number;
  volume: number;
  sets: { set_no: number; weight_kg: number; reps: number }[];
};

export function groupHistory(rows: HistoryRow[]) {
  const byWorkout = new Map<string, ExerciseHistoryPoint>();
  for (const row of rows) {
    const point: ExerciseHistoryPoint = byWorkout.get(row.workout_id) ?? {
      workout_id: row.workout_id,
      date: row.workouts.started_at,
      max_weight: 0,
      volume: 0,
      sets: [],
    };
    point.sets.push({ set_no: row.set_no, weight_kg: row.weight_kg, reps: row.reps });
    point.max_weight = Math.max(point.max_weight, row.weight_kg);
    point.volume += row.weight_kg * row.reps;
    byWorkout.set(row.workout_id, point);
  }
  return [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
}
