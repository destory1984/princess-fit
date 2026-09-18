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
