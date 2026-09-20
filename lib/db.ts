import { supabase } from './supabase';
import type { Exercise, Routine, RoutineExercise, Workout, WorkoutSet } from './types';
import { localDayKey } from './format';
import type { WorkoutFact } from './gamification';
import {
  afterWorkout,
  FULL,
  newHousehold,
  settle,
  workoutGold,
  type Household,
} from './economy';
import { buy, type Item } from './shop';
import { DEFAULT_CONDITION, shapePlan, type Condition } from './condition';
import { resolvePreset, type RoutinePreset } from './routinePresets';
import type { BodyLog } from './body';
import type { UsageMap } from './exerciseUsage';
import type { SleepLog } from './sleep';
import { wearing, type Garment } from './outfit';
import { attend, EMPTY_CULTURE, type Culture, type Lesson } from './lessons';
import type { Furniture } from './room';
import {
  groupHistory,
  streakDays,
  volumeOf,
  type ExerciseHistoryPoint,
  type HistoryRow,
} from './stats';

export type { ExerciseHistoryPoint } from './stats';

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

export async function createExercise(
  name: string,
  muscleGroup: string,
  equipment: string,
  trackType: Exercise['track_type']
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('exercises')
    .insert({ user_id, name, muscle_group: muscleGroup, equipment, track_type: trackType })
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

/** Rewrites positions to match the given order. */
export async function reorderRoutineExercises(ids: string[]) {
  await Promise.all(ids.map((id, position) => updateRoutineExercise(id, { position })));
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
  const volume = volumeOf(recent.flatMap((w) => w.workout_sets).filter((s) => s.done));
  const days = rows.map((w) => localDayKey(new Date(w.started_at)));

  return { workouts: recent.length, volume, streakDays: streakDays(days) };
}

export type WorkoutSummary = Workout & { setCount: number; volume: number };

export async function listWorkouts(limit = 50): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_sets(weight_kg, reps, done)')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as (Workout & { workout_sets: Pick<WorkoutSet, 'weight_kg' | 'reps' | 'done'>[] })[]).map(
    ({ workout_sets, ...workout }) => {
      const done = workout_sets.filter((s) => s.done);
      return { ...workout, setCount: done.length, volume: volumeOf(done) };
    }
  );
}

export async function updateWorkout(id: string, patch: Partial<Pick<Workout, 'title' | 'memo'>>) {
  const { error } = await supabase.from('workouts').update(patch).eq('id', id);
  if (error) throw error;
}

export type WorkoutDetailExercise = {
  exercise: Exercise | null;
  exercise_id: string;
  sets: WorkoutSet[];
  topWeight: number;
  estimatedOneRm: number;
};

/** Epley: the load you could lift once, estimated from a set taken near failure. */
export function estimateOneRm(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export async function getWorkoutDetail(workoutId: string) {
  const [workout, sets, exercises] = await Promise.all([
    getWorkout(workoutId),
    listWorkoutSets(workoutId),
    listExercises(),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const grouped = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = grouped.get(s.exercise_id) ?? [];
    list.push(s);
    grouped.set(s.exercise_id, list);
  }

  const items: WorkoutDetailExercise[] = [...grouped.entries()].map(([exercise_id, list]) => {
    const done = list.filter((s) => s.done);
    const topWeight = Math.max(0, ...done.map((s) => s.weight_kg));
    const estimatedOneRm = Math.max(
      0,
      ...done.map((s) => estimateOneRm(s.weight_kg, s.reps))
    );
    return {
      exercise_id,
      exercise: byId.get(exercise_id) ?? null,
      sets: [...list].sort((a, b) => a.set_no - b.set_no),
      topWeight,
      estimatedOneRm,
    };
  });

  return { workout, items };
}

/** Every finished workout reduced to what the progress screens need. */
export async function listWorkoutFacts(limit = 500): Promise<WorkoutFact[]> {
  const [{ data, error }, exercises] = await Promise.all([
    supabase
      .from('workouts')
      .select(
        'id, started_at, workout_sets(exercise_id, weight_kg, reps, duration_sec, distance_km, done)'
      )
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit),
    listExercises(),
  ]);
  if (error) throw error;
  const groupOf = new Map(exercises.map((e) => [e.id, e.muscle_group]));

  return (
    data as {
      id: string;
      started_at: string;
      workout_sets: (Pick<
        WorkoutSet,
        'exercise_id' | 'weight_kg' | 'reps' | 'duration_sec' | 'distance_km' | 'done'
      >)[];
    }[]
  ).map((w) => {
    const done = w.workout_sets.filter((s) => s.done);
    return {
      id: w.id,
      started_at: w.started_at,
      groups: [...new Set(done.flatMap((s) => groupOf.get(s.exercise_id) ?? []))],
      doneSets: done.length,
      volume: done.reduce((sum, s) => sum + s.weight_kg * s.reps, 0),
      durationSec: done.reduce((sum, s) => sum + s.duration_sec, 0),
      distanceKm: done.reduce((sum, s) => sum + s.distance_km, 0),
    };
  });
}

/**
 * Heaviest weight lifted for each exercise before the given workout, so a new
 * best can be recognised. Bounded to recent sessions, like the last-time hints.
 */
export async function getPersonalBests(exerciseIds: string[], excludeWorkoutId?: string) {
  const best = new Map<string, number>();
  if (exerciseIds.length === 0) return best;

  let recentQuery = supabase
    .from('workouts')
    .select('id')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(60);
  if (excludeWorkoutId) recentQuery = recentQuery.neq('id', excludeWorkoutId);
  const { data: recent, error: recentError } = await recentQuery;
  if (recentError) throw recentError;
  const recentIds = (recent as { id: string }[]).map((w) => w.id);
  if (recentIds.length === 0) return best;

  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, weight_kg')
    .in('exercise_id', exerciseIds)
    .in('workout_id', recentIds)
    .eq('done', true);
  if (error) throw error;

  for (const row of data as { exercise_id: string; weight_kg: number }[]) {
    best.set(row.exercise_id, Math.max(best.get(row.exercise_id) ?? 0, row.weight_kg));
  }
  return best;
}

export type GroupTotal = { group: string; sets: number; volume: number; durationSec: number };

/** How effort split across muscle groups over a recent window. */
export async function getGroupTotals(days = 30): Promise<GroupTotal[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [{ data, error }, exercises] = await Promise.all([
    supabase
      .from('workout_sets')
      .select('exercise_id, weight_kg, reps, duration_sec, workouts!inner(started_at, ended_at)')
      .eq('done', true)
      .not('workouts.ended_at', 'is', null)
      .gte('workouts.started_at', since),
    listExercises(),
  ]);
  if (error) throw error;
  const groupOf = new Map(exercises.map((e) => [e.id, e.muscle_group]));

  const totals = new Map<string, GroupTotal>();
  for (const row of data as unknown as {
    exercise_id: string;
    weight_kg: number;
    reps: number;
    duration_sec: number;
  }[]) {
    const group = groupOf.get(row.exercise_id) ?? '기타';
    const entry = totals.get(group) ?? { group, sets: 0, volume: 0, durationSec: 0 };
    entry.sets += 1;
    entry.volume += row.weight_kg * row.reps;
    entry.durationSec += row.duration_sec;
    totals.set(group, entry);
  }
  return [...totals.values()].sort((a, b) => b.sets - a.sets);
}

/** Local-day keys (YYYY-MM-DD) of finished workouts, for the calendar. */
export async function listWorkoutDays(limit = 400) {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, title, started_at')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Pick<Workout, 'id' | 'title' | 'started_at'>[]).map((w) => ({
    ...w,
    day: localDayKey(new Date(w.started_at)),
  }));
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

export async function startWorkout(
  title: string,
  routineId: string | null,
  condition: Condition = DEFAULT_CONDITION
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id, title, routine_id: routineId, condition })
    .select()
    .single();
  if (error) throw error;
  const workout = data as Workout;

  if (routineId) {
    const [routineExercises, exercises] = await Promise.all([
      listRoutineExercises(routineId),
      listExercises(),
    ]);
    const trackTypes = new Map(exercises.map((e) => [e.id, e.track_type]));

    // Carry last time's weights forward. The routine says how many sets and
    // how many reps to aim for; what you actually lifted last time is a far
    // better starting point than zero, which has to be typed in every session.
    let past = new Map<string, ExerciseHistoryPoint>();
    try {
      past = await getLastPerformance(routineExercises.map((re) => re.exercise_id));
    } catch {
      // Starting from zero is worse, not broken.
    }

    const sets = routineExercises.flatMap((re, position) => {
      // Timed and cardio movements are one entry, not a stack of sets.
      const weighted = trackTypes.get(re.exercise_id) === 'weight_reps';
      const count = weighted ? re.target_sets : 1;
      const lastSets = past.get(re.exercise_id)?.sets ?? [];
      const planned = Array.from({ length: count }, (_, i) => {
        // Past a shorter history, keep repeating its final set.
        const before = lastSets[Math.min(i, lastSets.length - 1)];
        return {
          reps: weighted ? (before?.reps ?? re.target_reps) : 0,
          weight: weighted ? (before?.weight_kg ?? 0) : 0,
        };
      });
      // The routine says what an ordinary day looks like; today may not be one.
      return shapePlan(planned, condition).map((s, i) => ({
        workout_id: workout.id,
        exercise_id: re.exercise_id,
        position,
        set_no: i + 1,
        reps: s.reps,
        weight_kg: s.weight,
      }));
    });
    if (sets.length) {
      const { error: setsError } = await supabase.from('workout_sets').insert(sets);
      if (setsError) throw setsError;
    }
  }

  return workout;
}

/**
 * How the last few finished sessions felt, newest first.
 *
 * Only finished ones count. A session that was started and abandoned says
 * nothing about the body that day — and on a heavy day abandoning is exactly
 * what happens, so counting those would find a run of heavy days in every
 * stretch of not training.
 */
export async function listRecentConditions(limit = 5): Promise<(Condition | null)[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('condition')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as { condition: Condition | null }[]).map((w) => w.condition);
}

/**
 * Starts a new session with the same exercises and set structure as an earlier
 * one, carrying its weights forward as the starting point.
 */
export async function repeatWorkout(sourceId: string) {
  const [source, sourceSets] = await Promise.all([
    getWorkout(sourceId),
    listWorkoutSets(sourceId),
  ]);
  const user_id = await requireUserId();

  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id, title: source.title, routine_id: source.routine_id })
    .select()
    .single();
  if (error) throw error;
  const workout = data as Workout;

  const rows = sourceSets.map((s) => ({
    workout_id: workout.id,
    exercise_id: s.exercise_id,
    position: s.position,
    set_no: s.set_no,
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_sec: s.duration_sec,
    distance_km: s.distance_km,
  }));
  if (rows.length) {
    const { error: setsError } = await supabase.from('workout_sets').insert(rows);
    if (setsError) throw setsError;
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
  durationSec?: number;
  distanceKm?: number;
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
      duration_sec: input.durationSec ?? 0,
      distance_km: input.distanceKm ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutSet;
}

export async function updateWorkoutSet(
  id: string,
  patch: Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'duration_sec' | 'distance_km' | 'done'>>
) {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteWorkoutSet(id: string) {
  const { error } = await supabase.from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

export async function getExerciseHistory(exerciseId: string, limit = 30) {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('workout_id, exercise_id, set_no, weight_kg, reps, duration_sec, distance_km, workouts!inner(started_at, ended_at)')
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

/**
 * Her purse and how she is faring, brought up to today. The row is created on
 * first read so no separate sign-up step is needed, and settling is written
 * back only when a day has actually turned — otherwise every app open would
 * cost a round trip.
 */
export async function getHousehold(today = new Date()): Promise<Household> {
  return (await getLedger(today)).house;
}

/** The purse and the wardrobe together, which is how the shop needs them. */
export async function getLedger(today = new Date()): Promise<Ledger> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('household')
    .select('gold, satiety, attire, settled_on, wardrobe, worn, furniture, grace, learning, charm')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const stored: Household = data
    ? {
        gold: data.gold,
        satiety: data.satiety,
        attire: data.attire,
        settledOn: data.settled_on,
      }
    : newHousehold(today);

  const wardrobe: string[] = data?.wardrobe ?? [];
  const worn: string[] = data?.worn ?? [];
  const furniture: string[] = data?.furniture ?? [];
  const culture: Culture = data
    ? { grace: data.grace, learning: data.learning, charm: data.charm }
    : EMPTY_CULTURE;

  const settled = settle(stored, today);
  if (!data || settled !== stored) await saveHousehold(settled);
  return { house: settled, wardrobe, worn, furniture, culture };
}

export async function saveHousehold(house: Household, extra: Partial<Omit<Ledger, 'house'>> = {}) {
  const userId = await requireUserId();
  const { error } = await supabase.from('household').upsert({
    user_id: userId,
    gold: house.gold,
    satiety: house.satiety,
    attire: house.attire,
    settled_on: house.settledOn,
    ...(extra.wardrobe ? { wardrobe: extra.wardrobe } : {}),
    ...(extra.worn ? { worn: extra.worn } : {}),
    ...(extra.furniture ? { furniture: extra.furniture } : {}),
    ...(extra.culture ? extra.culture : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type Ledger = {
  house: Household;
  /** Garments owned. */
  wardrobe: string[];
  /** The subset of those she has on. */
  worn: string[];
  furniture: string[];
  culture: Culture;
};

/**
 * Buy a garment. She puts it on at once — nobody buys a dress to leave it in
 * the wardrobe — and being freshly dressed mends a ragged look.
 */
export async function buyGarment(garment: Garment, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.wardrobe.includes(garment.id)) throw new Error('이미 가지고 있어요');
  if (ledger.house.gold < garment.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - garment.price, attire: FULL };
  const wardrobe = [...ledger.wardrobe, garment.id];
  const worn = wearing(ledger.worn, garment);
  await saveHousehold(house, { wardrobe, worn });
  return { ...ledger, house, wardrobe, worn };
}

/** Put on or take off something she already owns. Free. */
export async function setWorn(worn: string[], today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  await saveHousehold(ledger.house, { worn });
  return { ...ledger, worn };
}

/** Spend at the shop. Returns the ledger as it stands afterwards. */
export async function buyItem(item: Item, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  const next = buy(item, ledger.house, ledger.wardrobe);
  await saveHousehold(next.house, { wardrobe: next.wardrobe });
  return { ...ledger, house: next.house, wardrobe: next.wardrobe };
}

/** Buy a piece for her room. The slot it fills may already hold something. */
export async function buyFurniture(piece: Furniture, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.furniture.includes(piece.id)) throw new Error('이미 가지고 있어요');
  if (ledger.house.gold < piece.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - piece.price };
  const furniture = [...ledger.furniture, piece.id];
  await saveHousehold(house, { furniture });
  return { ...ledger, house, furniture };
}

/** Pay for a lesson. What it teaches depends on how much she already knows. */
export async function takeLesson(lesson: Lesson, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.house.gold < lesson.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - lesson.price };
  const culture = attend(lesson, ledger.culture);
  await saveHousehold(house, { culture });
  return { ...ledger, house, culture };
}

/** Pay out a finished workout. Returns the new ledger and what it earned. */
export async function payForWorkout(fact: WorkoutFact, today = new Date()) {
  const before = await getHousehold(today);
  const after = afterWorkout(before, fact);
  await saveHousehold(after);
  return { house: after, gold: workoutGold(fact) };
}

export const DEFAULT_REST_SEC = 60;
export const REST_GRAIN = 10;
const REST_MIN = 10;
const REST_MAX = 600;

/** Ten-second grain, and never so short that the bell rings mid-set. */
export function clampRest(seconds: number) {
  const snapped = Math.round(seconds / REST_GRAIN) * REST_GRAIN;
  return Math.max(REST_MIN, Math.min(REST_MAX, snapped));
}

/** Change how long this exercise rests. Applies to every workout from now on. */
export async function setExerciseRest(exerciseId: string, seconds: number) {
  const { error } = await supabase
    .from('exercises')
    .update({ rest_sec: clampRest(seconds) })
    .eq('id', exerciseId);
  if (error) throw error;
}

/**
 * Build a routine from a preset, keeping only the exercises this account has.
 *
 * Returns what was skipped so the caller can say so: a routine quietly two
 * movements shorter than the card promised is worse than being told.
 */
export async function createRoutineFromPreset(preset: RoutinePreset) {
  const catalogue = await listExercises();
  const { found, missing } = resolvePreset(preset, catalogue);
  if (found.length === 0) {
    throw new Error('종목이 없어요. 설정에서 기본 종목을 먼저 불러오세요.');
  }

  const routine = await createRoutine(preset.name);
  const rows = found.map((item, position) => ({
    routine_id: routine.id,
    exercise_id: item.exercise.id,
    position,
    target_sets: item.sets,
    target_reps: item.reps,
  }));
  const { error } = await supabase.from('routine_exercises').insert(rows);
  if (error) throw error;

  return { routine, missing };
}

export async function listBodyLogs(limit = 400): Promise<BodyLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('body_logs')
    .select('id, measured_on, weight_kg, body_fat_pct, muscle_kg')
    .eq('user_id', userId)
    .order('measured_on', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as BodyLog[];
}

/**
 * Record today's measurements. One row per day: a second weigh-in replaces
 * the first rather than adding noise to the trend.
 */
export async function saveBodyLog(
  measurements: Partial<Pick<BodyLog, 'weight_kg' | 'body_fat_pct' | 'muscle_kg'>>,
  day = localDayKey(new Date())
) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('body_logs')
    .upsert(
      { user_id: userId, measured_on: day, ...measurements },
      { onConflict: 'user_id,measured_on' }
    );
  if (error) throw error;
}

export async function deleteBodyLog(id: string) {
  const { error } = await supabase.from('body_logs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * How often and how recently each exercise has been used.
 *
 * Counted over finished workouts only: sets abandoned mid-session say nothing
 * about what you actually train.
 */
export async function getExerciseUsage(sessions = 200): Promise<UsageMap> {
  // Queried from the workouts side: the sets table has no date of its own, and
  // PostgREST cannot order parent rows by an embedded column, so asking for
  // the most recent finished sessions is the only way the limit means
  // "recent" rather than "whichever rows came back".
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, workout_sets(exercise_id)')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(sessions);
  if (error) throw error;

  const rows = data as unknown as {
    started_at: string;
    workout_sets: { exercise_id: string }[] | null;
  }[];

  const usage: UsageMap = new Map();
  for (const row of rows) {
    const day = localDayKey(new Date(row.started_at));
    // Once per session, not once per set: five sets of squats is one day of
    // squats, and counting sets would rank by how many you happen to do.
    for (const id of new Set((row.workout_sets ?? []).map((s) => s.exercise_id))) {
      const seen = usage.get(id);
      if (seen) {
        seen.count += 1;
        if (day > seen.lastOn) seen.lastOn = day;
      } else {
        usage.set(id, { count: 1, lastOn: day });
      }
    }
  }
  return usage;
}

/** Star or unstar an exercise. Purely about finding it again quickly. */
export async function setExerciseFavourite(exerciseId: string, favourite: boolean) {
  const { error } = await supabase
    .from('exercises')
    .update({ favourite })
    .eq('id', exerciseId);
  if (error) throw error;
}

export async function listSleepLogs(limit = 180): Promise<SleepLog[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('id, slept_on, bed_minute, wake_minute')
    .eq('user_id', userId)
    .order('slept_on', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as SleepLog[];
}

/** One night per morning: correcting a night replaces it rather than adding. */
export async function saveSleepLog(
  bedMinute: number,
  wakeMinute: number,
  day = localDayKey(new Date())
) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('sleep_logs')
    .upsert(
      { user_id: userId, slept_on: day, bed_minute: bedMinute, wake_minute: wakeMinute },
      { onConflict: 'user_id,slept_on' }
    );
  if (error) throw error;
}

export async function deleteSleepLog(id: string) {
  const { error } = await supabase.from('sleep_logs').delete().eq('id', id);
  if (error) throw error;
}
