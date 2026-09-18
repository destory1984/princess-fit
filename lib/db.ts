import { supabase } from './supabase';
import type { Exercise, Routine, RoutineExercise, Workout, WorkoutSet } from './types';

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('로그인이 필요합니다.');
  return data.user.id;
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

  const days = new Set(rows.map((w) => w.started_at.slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) {
      if (streakDays === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (days.has(cursor.toISOString().slice(0, 10))) continue;
      }
      break;
    }
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
    const sets = routineExercises.flatMap((re) =>
      Array.from({ length: re.target_sets }, (_, i) => ({
        workout_id: workout.id,
        exercise_id: re.exercise_id,
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
    .order('exercise_id')
    .order('set_no');
  if (error) throw error;
  return data as WorkoutSet[];
}

export async function addWorkoutSet(
  workoutId: string,
  exerciseId: string,
  setNo: number,
  weight: number,
  reps: number
) {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_no: setNo,
      weight_kg: weight,
      reps,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSet;
}

export async function updateWorkoutSet(id: string, patch: Partial<WorkoutSet>) {
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

export async function getExerciseHistory(exerciseId: string, limit = 30) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, set_no, weight_kg, reps, workouts!inner(started_at, ended_at)')
    .eq('exercise_id', exerciseId)
    .eq('done', true)
    .not('workouts.ended_at', 'is', null)
    .order('set_no');
  if (error) throw error;

  const byWorkout = new Map<string, ExerciseHistoryPoint>();
  for (const row of data as any[]) {
    const point: ExerciseHistoryPoint = byWorkout.get(row.workout_id) ?? {
      workout_id: row.workout_id,
      date: row.workouts.started_at as string,
      max_weight: 0,
      volume: 0,
      sets: [],
    };
    point.sets.push({ set_no: row.set_no, weight_kg: row.weight_kg, reps: row.reps });
    point.max_weight = Math.max(point.max_weight, row.weight_kg);
    point.volume += row.weight_kg * row.reps;
    byWorkout.set(row.workout_id, point);
  }

  return [...byWorkout.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
}

export async function getLastPerformance(exerciseIds: string[]) {
  if (exerciseIds.length === 0) return new Map<string, ExerciseHistoryPoint>();
  const result = new Map<string, ExerciseHistoryPoint>();
  await Promise.all(
    exerciseIds.map(async (id) => {
      const history = await getExerciseHistory(id, 1);
      if (history[0]) result.set(id, history[0]);
    })
  );
  return result;
}
