import { supabase } from './supabase';
import type { Exercise, Routine, RoutineExercise, Workout, WorkoutSet } from './types';
import { localDayKey } from './format';

async function requireUserId() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('로그인이 필요합니다.');
  return data.session.user.id;
}

export async function listExercises() {
  const { data, error } = await supabase.from('exercises').select('*').order('name');
  if (error) throw error;
  return data as Exercise[];
}

export async function createExercise(name: string, muscleGroup: string) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('exercises')
    .insert({ user_id, name, muscle_group: muscleGroup })
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function countExerciseSets(exerciseId: string) {
  const { count, error } = await supabase
    .from('workout_sets')
    .select('id', { count: 'exact', head: true })
    .eq('exercise_id', exerciseId);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function listRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Routine[];
}

export async function getRoutine(id: string) {
  const { data, error } = await supabase.from('routines').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Routine;
}

export async function createRoutine(name: string) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('routines')
    .insert({ user_id, name })
    .select()
    .single();
  if (error) throw error;
  return data as Routine;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function listRoutineExercises(routineId: string) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*')
    .eq('routine_id', routineId)
    .order('position');
  if (error) throw error;
  return data as RoutineExercise[];
}

export async function addRoutineExercise(
  routineId: string,
  exerciseId: string,
  position: number
) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .insert({ routine_id: routineId, exercise_id: exerciseId, position })
    .select()
    .single();
  if (error) throw error;
  return data as RoutineExercise;
}

export async function removeRoutineExercise(id: string) {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function updateRoutineExercise(
  id: string,
  patch: Partial<Pick<RoutineExercise, 'target_sets' | 'target_reps' | 'position'>>
) {
  const { error } = await supabase.from('routine_exercises').update(patch).eq('id', id);
  if (error) throw error;
}

export type WeeklyStats = { workouts: number; volume: number; streakDays: number };

export async function getWeeklyStats(): Promise<WeeklyStats> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at, workout_sets(weight_kg, reps, done)')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(60);
  if (error) throw error;

  const rows = data as { id: string; started_at: string; workout_sets: WorkoutSet[] }[];
  const recent = rows.filter((w) => w.started_at >= since);
  const volume = recent
    .flatMap((w) => w.workout_sets)
    .filter((s) => s.done)
    .reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

  const days = new Set(rows.map((w) => localDayKey(new Date(w.started_at))));
  const cursor = new Date();
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  while (days.has(localDayKey(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { workouts: recent.length, volume, streakDays };
}

export async function listWorkouts(limit = 50) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Workout[];
}

export async function getActiveWorkout() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data[0] ?? null) as Workout | null;
}

export async function getWorkout(id: string) {
  const { data, error } = await supabase.from('workouts').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Workout;
}

export async function startWorkout(title: string, routineId: string | null) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id, title, routine_id: routineId })
    .select()
    .single();
  if (error) throw error;
  const workout = data as Workout;

  if (routineId) {
    const routineExercises = await listRoutineExercises(routineId);
    const sets = routineExercises.flatMap((re, position) =>
      Array.from({ length: re.target_sets }, (_, i) => ({
        workout_id: workout.id,
        exercise_id: re.exercise_id,
        position,
        set_no: i + 1,
        reps: re.target_reps,
        weight_kg: 0,
      }))
    );
    if (sets.length) {
      const { error: setsError } = await supabase.from('workout_sets').insert(sets);
      if (setsError) throw setsError;
    }
  }

  return workout;
}

export async function finishWorkout(id: string) {
  const { error } = await supabase
    .from('workouts')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

export async function listWorkoutSets(workoutId: string) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('position')
    .order('set_no');
  if (error) throw error;
  return data as WorkoutSet[];
}

export async function addWorkoutSet(input: {
  workoutId: string;
  exerciseId: string;
  position: number;
  setNo: number;
  weight: number;
  reps: number;
}) {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id: input.workoutId,
      exercise_id: input.exerciseId,
      position: input.position,
      set_no: input.setNo,
      weight_kg: input.weight,
      reps: input.reps,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSet;
}

export async function updateWorkoutSet(
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'done'>>
) {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteWorkoutSet(id: string) {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

export type ExerciseHistoryPoint = {
  workout_id: string;
  date: string;
  max_weight: number;
  volume: number;
  sets: { set_no: number; weight_kg: number; reps: number }[];
};

type HistoryRow = {
  workout_id: string;
  exercise_id: string;
  set_no: number;
  weight_kg: number;
  reps: number;
  workouts: { started_at: string };
};

function groupHistory(rows: HistoryRow[]) {
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

export async function getExerciseHistory(exerciseId: string, limit = 30) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, exercise_id, set_no, weight_kg, reps, workouts!inner(started_at, ended_at)')
    .eq('exercise_id', exerciseId)
    .eq('done', true)
    .not('workouts.ended_at', 'is', null)
    .order('set_no');
  if (error) throw error;
  return groupHistory(data as unknown as HistoryRow[]).slice(-limit);
}

export async function getLastPerformance(exerciseIds: string[], excludeWorkoutId?: string) {
  const result = new Map<string, ExerciseHistoryPoint>();
  if (exerciseIds.length === 0) return result;

  let recentQuery = supabase
    .from('workouts')
    .select('id')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(30);
  if (excludeWorkoutId) recentQuery = recentQuery.neq('id', excludeWorkoutId);
  const { data: recent, error: recentError } = await recentQuery;
  if (recentError) throw recentError;
  const recentIds = (recent as { id: string }[]).map((w) => w.id);
  if (recentIds.length === 0) return result;

  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, exercise_id, set_no, weight_kg, reps, workouts!inner(started_at)')
    .in('exercise_id', exerciseIds)
    .in('workout_id', recentIds)
    .eq('done', true)
    .order('set_no');
  if (error) throw error;

  const byExercise = new Map<string, HistoryRow[]>();
  for (const row of data as unknown as HistoryRow[]) {
    const list = byExercise.get(row.exercise_id) ?? [];
    list.push(row);
    byExercise.set(row.exercise_id, list);
  }
  for (const [exerciseId, rows] of byExercise) {
    const latest = groupHistory(rows).at(-1);
    if (latest) result.set(exerciseId, latest);
  }
  return result;
}
