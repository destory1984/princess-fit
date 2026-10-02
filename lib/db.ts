import { supabase } from './supabase';
import { carryTies } from './superset';
import type { Exercise, Routine, RoutineExercise, Workout, WorkoutSet } from './types';
import { localDayKey } from './format';
import { abandonedEnd, isAbandoned } from './abandoned';
import { isEmptyWorkout, type WorkoutFact } from './gamification';
import {
  afterWalk,
  afterWorkout,
  FULL,
  newHousehold,
  settle,
  workoutGold,
  type Household,
} from './economy';
import { buy, givenToday, REFUSAL_TEXT, type Item } from './shop';
import { DEFAULT_CONDITION, shapePlan, type Condition } from './condition';
import { slugsOf } from './muscles';
import type { Session as RecoverySession } from './recovery';
import { resolvePreset, type RoutinePreset } from './routinePresets';
import type { BodyLog } from './body';
import type { UsageMap } from './exerciseUsage';
import type { SleepLog } from './sleep';
import { wearing, type Garment } from './outfit';
import {
  attend,
  enrol,
  EMPTY_CULTURE,
  isFinished,
  lessonById,
  type Culture,
  type Enrolment,
  type Lesson,
} from './lessons';
import type { Furniture } from './room';
import { SPLIT_WINDOW_DAYS, type RoutineUse } from './split';
import type { BackupWorkout } from './backup';
import { unseen } from './restore';
import { diaryFor } from './diary';
import { sulkOf, whileShe, whoWasThere, type Pick as GirlPick, type Sulk } from './picks';
import { getChosenGirlId, getFestivalEntry, getWeeklyGoal } from './prefs';
import { favoursMet } from './favour';
import {
  CONTESTS,
  defaultEntry,
  festivalIndex,
  festivalMemory,
  judge,
  parseResult,
  previousFestival,
  prizeFor,
  standingAt,
  unresolved,
  type ContestId,
  type Festival,
  type Result as FestivalResult,
} from './festival';
import { DEFAULT_ADVISOR_ID } from './advisors';
import { arrivedTotal, type ArrivedGift } from './friends';
import {
  daysTogether,
  eventMemory,
  giftMemory,
  isGift,
  memoriesFrom,
  stageOf,
  unrecorded,
  type Memory,
  type MemoryKind,
  type Session as MemorySession,
  type Stage,
} from './companion';
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

export async function renameRoutine(id: string, name: string) {
  const { error } = await supabase.from('routines').update({ name }).eq('id', id);
  if (error) throw error;
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
    .select('id, started_at, workout_sets(weight_kg, reps, done, warmup)')
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

export type WorkoutSummary = Workout & { exerciseCount: number; setCount: number; volume: number };

/** How many sessions the history list reads at a time. */
export const WORKOUT_PAGE = 50;

const SUMMARY_COLUMNS = '*, workout_sets(exercise_id, weight_kg, reps, done, warmup)';

type SummaryRow = Workout & {
  workout_sets: Pick<WorkoutSet, 'exercise_id' | 'weight_kg' | 'reps' | 'done' | 'warmup'>[];
};

function summaryOf({ workout_sets, ...workout }: SummaryRow): WorkoutSummary {
  const done = workout_sets.filter((s) => s.done);
  // Warm-ups do not count as sets done either: 「12세트」 that is really
  // eight working sets and four with an empty bar is a number nobody
  // would recognise as their own afternoon.
  const working = done.filter((s) => !s.warmup);
  return {
    ...workout,
    exerciseCount: new Set(working.map((s) => s.exercise_id)).size,
    setCount: working.length,
    volume: volumeOf(working),
  };
}

/** Newest first, one page at a time: `offset` is how many are already shown. */
export async function listWorkouts(limit = WORKOUT_PAGE, offset = 0): Promise<WorkoutSummary[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(SUMMARY_COLUMNS)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data as SummaryRow[]).map(summaryOf);
}

/**
 * Every session on one local day. Asked for directly rather than filtered
 * out of the pages already read — a day older than those pages would
 * otherwise say 「이 날은 기록이 없어요」 about a day that has one.
 */
export async function listWorkoutsOn(dayKey: string): Promise<WorkoutSummary[]> {
  const from = new Date(`${dayKey}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const { data, error } = await supabase
    .from('workouts')
    .select(SUMMARY_COLUMNS)
    .gte('started_at', from.toISOString())
    .lt('started_at', to.toISOString())
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data as SummaryRow[]).map(summaryOf);
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
        'id, started_at, workout_sets(exercise_id, weight_kg, reps, duration_sec, distance_km, done, warmup)'
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
        'exercise_id' | 'weight_kg' | 'reps' | 'duration_sec' | 'distance_km' | 'done' | 'warmup'
      >)[];
    }[]
  ).map((w) => {
    // Warm-ups are done and are not the work. Gold and XP are both paid
    // against these numbers, so counting them would mean an empty bar buys
    // dresses — and the shop is priced against a year of turning up.
    const done = w.workout_sets.filter((s) => s.done && !s.warmup);
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

/**
 * Close every session left open long after anything happened in it — see
 * lib/abandoned.ts. Run before anything asks what is in progress, so a
 * workout forgotten last night neither shows as running nor blocks a new one.
 *
 * Best effort: a failure leaves the session open, which is what it was.
 */
export async function closeAbandonedWorkouts(now = new Date()) {
  const { data: open, error } = await supabase
    .from('workouts')
    .select('id, started_at')
    .is('ended_at', null);
  if (error || !open?.length) return;

  let closed = 0;
  for (const w of open as Pick<Workout, 'id' | 'started_at'>[]) {
    const { data: last } = await supabase
      .from('workout_sets')
      .select('done_at')
      .eq('workout_id', w.id)
      .not('done_at', 'is', null)
      .order('done_at', { ascending: false })
      .limit(1);
    const session = {
      started_at: w.started_at,
      lastDoneAt: (last as { done_at: string }[] | null)?.[0]?.done_at ?? null,
    };
    if (!isAbandoned(session, now)) continue;
    const { error: closeError } = await supabase
      .from('workouts')
      .update({ ended_at: abandonedEnd(session) })
      .eq('id', w.id)
      .is('ended_at', null);
    if (!closeError) closed += 1;
  }
  // The sets were done; forgetting the button should not cost her the gold.
  if (closed) await payUnpaidWorkouts(now).catch(() => {});
}

export async function getActiveWorkout() {
  await closeAbandonedWorkouts().catch(() => {});
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

    // Tied the way the last session of this routine ended (lib/superset.ts).
    // A convenience like the weights above: any failure starts untied.
    let ties: (string | null)[] = [];
    try {
      const board = await lastBoardOf(routineId, workout.id);
      let n = 0;
      ties = carryTies(
        board,
        routineExercises.map((re) => ({ exerciseId: re.exercise_id })),
        // Only has to be unlike the other marks in this one session.
        () => `${workout.id}:${(n += 1)}`
      );
    } catch {
      // Untied is how every session started before there were ties.
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
        // The column is named only when there is a tie to write. A database
        // that has not been migrated has no such column and no ties either,
        // and naming it there would fail the whole insert.
        ...(ties[position] ? { superset: ties[position] } : {}),
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
 * The blocks of this routine's last finished session, in order, with their
 * ties. Empty when there has not been one.
 */
async function lastBoardOf(routineId: string, notThis: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('id')
    .eq('routine_id', routineId)
    .not('ended_at', 'is', null)
    .neq('id', notThis)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = (data as { id: string }[] | null)?.[0];
  if (!last) return [];

  const blocks = new Map<number, { exerciseId: string; superset: string | null }>();
  for (const s of await listWorkoutSets(last.id)) {
    if (!blocks.has(s.position)) {
      blocks.set(s.position, { exerciseId: s.exercise_id, superset: s.superset ?? null });
    }
  }
  return [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, block]) => block);
}

/**
 * The routine used most recently, if any is still around.
 *
 * "지난번 그거" is the commonest intent on opening the app, and it is one tap
 * away only if the app knows which one that was. Deleted routines leave their
 * workouts behind with a null routine_id, so this looks past those rather than
 * returning nothing.
 */
/**
 * When each routine was last finished, over the whole history.
 *
 * Unbounded, unlike `recentRoutineUse`, because this answers a different
 * question: not 「다음은 무엇인가」 but 「이건 언제 했더라」, and a routine last
 * done in March is exactly the one that needs its date shown.
 */
export async function lastDoneByRoutine(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id, started_at')
    .not('routine_id', 'is', null)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });
  if (error) throw error;

  const seen = new Map<string, string>();
  for (const row of data as { routine_id: string; started_at: string }[]) {
    if (!seen.has(row.routine_id)) seen.set(row.routine_id, row.started_at);
  }
  return seen;
}

/**
 * When each routine was last finished, within the window `nextInSplit` cares
 * about. Sorted newest first so the first sighting of a routine is its latest.
 */
export async function recentRoutineUse(now = new Date()): Promise<RoutineUse[]> {
  const since = new Date(now);
  since.setDate(since.getDate() - SPLIT_WINDOW_DAYS);
  const { data, error } = await supabase
    .from('workouts')
    .select('routine_id, started_at')
    .not('routine_id', 'is', null)
    .not('ended_at', 'is', null)
    .gte('started_at', localDayKey(since))
    .order('started_at', { ascending: false });
  if (error) throw error;

  const seen = new Map<string, string>();
  for (const row of data as { routine_id: string; started_at: string }[]) {
    if (!seen.has(row.routine_id)) seen.set(row.routine_id, row.started_at.slice(0, 10));
  }
  return [...seen].map(([routineId, lastOn]) => ({ routineId, lastOn }));
}

/** Which muscles a routine sets out to work, as body-map slugs. */
export async function routineSlugs(routineId: string): Promise<string[]> {
  const [items, exercises] = await Promise.all([
    listRoutineExercises(routineId),
    listExercises(),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const slugs = new Set<string>();
  for (const item of items) {
    const exercise = byId.get(item.exercise_id);
    if (exercise) for (const slug of slugsOf(exercise)) slugs.add(slug);
  }
  return [...slugs];
}

/**
 * Completed sets per muscle, per session, over the recent past.
 *
 * Counted from the sets rather than from the exercises: three sets of squats
 * and nine are not the same thing for a pair of legs, and an exercise that was
 * added to the board and never done is not work. The window is short because
 * nothing older still counts — the longest a session is owed is three days.
 */
export async function listMuscleLoad(days = 7): Promise<RecoverySession[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [{ data, error }, exercises] = await Promise.all([
    supabase
      .from('workouts')
      .select('started_at, workout_sets(exercise_id, done)')
      .not('ended_at', 'is', null)
      .gte('started_at', since)
      .order('started_at', { ascending: false }),
    listExercises(),
  ]);
  if (error) throw error;
  const byId = new Map(exercises.map((e) => [e.id, e]));

  return (
    data as { started_at: string; workout_sets: { exercise_id: string; done: boolean }[] }[]
  ).map((w) => {
    const sets: Record<string, number> = {};
    for (const row of w.workout_sets) {
      if (!row.done) continue;
      const exercise = byId.get(row.exercise_id);
      if (!exercise) continue;
      for (const slug of slugsOf(exercise)) sets[slug] = (sets[slug] ?? 0) + 1;
    }
    return { startedAt: w.started_at, sets };
  });
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
    // 「그대로 다시」 includes what was done in turn. Named only where there is
    // one, for the same reason as in startWorkout.
    ...(s.superset ? { superset: `${workout.id}:${s.superset}` } : {}),
  }));
  if (rows.length) {
    const { error: setsError } = await supabase.from('workout_sets').insert(rows);
    if (setsError) throw setsError;
  }
  return workout;
}

/**
 * A session that happened but was never logged.
 *
 * Backdated to the evening of the day it names, because a workout at 00:00
 * reads as one nobody did. Everything else about it is an ordinary session —
 * the same screen fills it in, and finishing it pays the same gold, since the
 * training was real even though the logging was late.
 *
 * It is not asked how today's body felt. That question is about the day a
 * session starts, and this one started a week ago.
 */
export async function startWorkoutOn(dayKey: string, title: string) {
  const user_id = await requireUserId();
  const when = new Date(`${dayKey}T18:00:00`);
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id, title, routine_id: null, started_at: when.toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Workout;
}

/**
 * Close a session.
 *
 * A backdated one ends when it started rather than now: a record entered on
 * Friday for Tuesday's training did not take three days, and the honest answer
 * to how long it took is that nobody wrote it down. `formatDuration` shows
 * that as unrecorded rather than as a minute.
 */
export async function finishWorkout(id: string) {
  const workout = await getWorkout(id);

  /*
    A session ends when the last set was finished, not when the button was
    pressed. Those are the same moment for someone who ends the workout on the
    spot, and hours apart for everyone who presses it on the way out of the
    building or the next morning — which is how 487분 ended up on a card for
    eight sets.

    Falls back to the old behaviour when nothing carries a time: rows written
    before the column exists, and sets ticked while offline whose write is
    still in the queue.
  */
  const { data: last } = await supabase
    .from('workout_sets')
    .select('done_at')
    .eq('workout_id', id)
    .not('done_at', 'is', null)
    .order('done_at', { ascending: false })
    .limit(1);
  const lastDone = (last as { done_at: string }[] | null)?.[0]?.done_at ?? null;

  /*
    Only when the stamp belongs to the same day the session started.

    A Tuesday session written up on Friday has its sets ticked on Friday, so
    the last stamp is three days after the start — which would make a
    backdated entry read as a seventy-hour workout. The rule that already
    covered that case still covers it: a session not begun today has no
    recorded length at all.
  */
  const startedOn = localDayKey(new Date(workout.started_at));
  const usable = lastDone && localDayKey(new Date(lastDone)) === startedOn ? lastDone : null;
  const sameDay = startedOn === localDayKey(new Date());
  const ended_at = usable ?? (sameDay ? new Date().toISOString() : workout.started_at);
  const { error } = await supabase.from('workouts').update({ ended_at }).eq('id', id);
  if (error) throw error;
}

/**
 * The last finished outing of the same routine before this one.
 *
 * Null when the session had no routine behind it, or when this is the first
 * time it has been run — both of which mean there is nothing to compare
 * against, which is different from comparing against nothing.
 */
export async function previousRoutineSession(workoutId: string) {
  const workout = await getWorkout(workoutId);
  if (!workout.routine_id) return null;

  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at')
    .eq('routine_id', workout.routine_id)
    .not('ended_at', 'is', null)
    .lt('started_at', workout.started_at)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const found = (data as { id: string; started_at: string }[])[0];
  if (!found) return null;
  return { ...(await getWorkoutDetail(found.id)), started_at: found.started_at };
}

/** One finished session, compact enough that a month of them still reads. */
export type SessionLine = {
  started_at: string;
  title: string;
  /** Movement name and the heaviest working set, in the order they were done. */
  did: { name: string; topWeight: number; sets: number }[];
};

/**
 * A month of finished sessions, movement by movement.
 *
 * One query rather than one per workout: thirteen sessions is thirteen round
 * trips the other way, on a screen that already waits on three.
 *
 * Warm-ups are skipped, as everywhere else — a month of history is for seeing
 * a trend, and a trend read through warm-up weights is not the trend.
 */
export async function monthOfSessions(now = new Date()): Promise<SessionLine[]> {
  const since = new Date(now);
  since.setDate(since.getDate() - 30);

  const [{ data, error }, exercises] = await Promise.all([
    supabase
      .from('workout_sets')
      .select('workout_id, exercise_id, weight_kg, done, warmup, workouts!inner(started_at, title, ended_at)')
      .gte('workouts.started_at', since.toISOString())
      .not('workouts.ended_at', 'is', null)
      .order('position')
      .order('set_no'),
    listExercises(),
  ]);
  if (error) throw error;
  const named = new Map(exercises.map((e) => [e.id, e.name]));

  type Row = {
    workout_id: string;
    exercise_id: string;
    weight_kg: number;
    done: boolean;
    warmup: boolean | null;
    workouts: { started_at: string; title: string };
  };

  const byWorkout = new Map<string, SessionLine>();
  for (const row of data as unknown as Row[]) {
    if (!row.done || row.warmup) continue;
    let session = byWorkout.get(row.workout_id);
    if (!session) {
      session = { started_at: row.workouts.started_at, title: row.workouts.title, did: [] };
      byWorkout.set(row.workout_id, session);
    }
    const name = named.get(row.exercise_id) ?? '삭제된 종목';
    const seen = session.did.find((d) => d.name === name);
    if (seen) {
      seen.sets += 1;
      seen.topWeight = Math.max(seen.topWeight, row.weight_kg);
    } else {
      session.did.push({ name, topWeight: row.weight_kg, sets: 1 });
    }
  }

  return [...byWorkout.values()].sort((a, b) => b.started_at.localeCompare(a.started_at));
}

/**
 * Keep what was said about a session with the session it was about.
 *
 * It used to live only in the phone's own storage — gone on a new device, and
 * invisible to anyone trying to see how the advice is actually turning out.
 * Both kinds are kept, not only the model's: the rule-based line is the one
 * most people will read, and a record of the advice that skips it is a record
 * of the exception.
 *
 * Failure is ignored by the caller. Saving a sentence must never be the thing
 * that interrupts somebody who has just finished training.
 */
export async function saveAdvice(workoutId: string, advice: string, source: string, speaker: string) {
  const { error } = await supabase
    .from('workouts')
    .update({ advice, advice_source: source, advice_speaker: speaker })
    .eq('id', workoutId);
  if (error) throw error;
}

/** Drop what was said once the session it was about has been changed. */
export async function clearSavedAdvice(workoutId: string) {
  const { error } = await supabase
    .from('workouts')
    .update({ advice: null, advice_source: null, advice_speaker: null })
    .eq('id', workoutId);
  if (error) throw error;
}

/**
 * Delete the caller's account and everything tied to it (supabase/account.sql).
 *
 * Takes no argument on purpose: the server deletes whoever is asking, so there
 * is no id here to get wrong. Throws when the function is not installed —
 * better than appearing to have deleted something.
 */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
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

/**
 * Everything, in one read, shaped for a file the user keeps.
 *
 * Two queries rather than one join per workout: a year of training is a few
 * hundred rows on each side, and asking the server once for each is how an
 * export of a long history turns into a minute of waiting.
 */
export async function listBackup(): Promise<BackupWorkout[]> {
  const [workouts, sets, exercises] = await Promise.all([
    supabase
      .from('workouts')
      .select('id, started_at, ended_at, title, condition, memo')
      .order('started_at'),
    supabase
      .from('workout_sets')
      .select('workout_id, exercise_id, position, set_no, weight_kg, reps, duration_sec, distance_km, done')
      .order('position')
      .order('set_no'),
    listExercises(),
  ]);
  if (workouts.error) throw workouts.error;
  if (sets.error) throw sets.error;

  const named = new Map(exercises.map((e) => [e.id, e]));
  const byWorkout = new Map<string, Map<string, BackupWorkout['exercises'][number]>>();
  for (const row of sets.data as (WorkoutSet & { workout_id: string })[]) {
    let board = byWorkout.get(row.workout_id);
    if (!board) byWorkout.set(row.workout_id, (board = new Map()));
    let entry = board.get(row.exercise_id);
    if (!entry) {
      const exercise = named.get(row.exercise_id);
      // A set whose exercise has since been deleted is still a set that was
      // done. Dropping it would make the backup disagree with the history.
      entry = {
        name: exercise?.name ?? '삭제된 종목',
        muscle_group: exercise?.muscle_group ?? '',
        sets: [],
      };
      board.set(row.exercise_id, entry);
    }
    entry.sets.push({
      set_no: row.set_no,
      weight_kg: row.weight_kg,
      reps: row.reps,
      duration_sec: row.duration_sec,
      distance_km: row.distance_km,
      done: row.done,
      ...(row.warmup ? { warmup: true } : {}),
      ...(row.side ? { side: row.side } : {}),
      ...(typeof row.rir === 'number' ? { rir: row.rir } : {}),
    });
  }

  return (workouts.data as (Workout & { id: string })[]).map((w) => ({
    started_at: w.started_at,
    ended_at: w.ended_at,
    title: w.title,
    condition: w.condition ?? null,
    memo: w.memo ?? null,
    exercises: [...(byWorkout.get(w.id)?.values() ?? [])],
  }));
}

/**
 * Put a backup back, without paying anyone twice.
 *
 * Deliberately silent about gold. Importing is recovering what was already
 * earned, not earning it again — a restore that paid out for a year of past
 * training would hand someone the whole wardrobe for owning a file, and the
 * shop is priced against turning up.
 *
 * Exercises are matched by name and created when missing, so a history that
 * mentions a movement this account never had comes back with it rather than
 * arriving as 「삭제된 종목」.
 */
export async function restoreBackup(workouts: BackupWorkout[]) {
  const user_id = await requireUserId();

  const { data: seen, error: seenError } = await supabase.from('workouts').select('started_at');
  if (seenError) throw seenError;
  const fresh = unseen(
    workouts,
    (seen as { started_at: string }[]).map((w) => w.started_at)
  );
  if (fresh.length === 0) return { added: 0, already: workouts.length };

  const catalogue = await listExercises();
  const byName = new Map(catalogue.map((e) => [e.name, e]));

  for (const workout of fresh) {
    const { data: created, error } = await supabase
      .from('workouts')
      .insert({
        user_id,
        title: workout.title,
        routine_id: null,
        started_at: workout.started_at,
        ended_at: workout.ended_at,
        condition: workout.condition,
        memo: workout.memo,
      })
      .select()
      .single();
    if (error) throw error;
    // Taken back, not earned: marked paid before its sets land, so the sweep
    // for unpaid sessions never sees it. A separate write, because before
    // migrate.sql the column is missing and that must not stop the restore.
    await supabase
      .from('workouts')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', (created as Workout).id);

    const rows: Record<string, unknown>[] = [];
    let position = 0;
    for (const entry of workout.exercises) {
      let exercise = byName.get(entry.name);
      if (!exercise) {
        exercise = await createExercise(entry.name, entry.muscle_group, '기타', 'weight_reps');
        byName.set(entry.name, exercise);
      }
      for (const set of entry.sets) {
        rows.push({
          workout_id: (created as Workout).id,
          exercise_id: exercise.id,
          position,
          set_no: set.set_no,
          weight_kg: set.weight_kg,
          reps: set.reps,
          duration_sec: set.duration_sec,
          distance_km: set.distance_km,
          done: set.done,
          warmup: set.warmup === true,
          side: set.side ?? null,
          rir: set.rir ?? null,
        });
      }
      position += 1;
    }
    // A column is named only if some set in this session uses it, and then on
    // every row: rows sent together share their columns, and a row that left
    // `warmup` out would arrive as null where the column does not allow it.
    // A file with none of them names none — so it still restores into a
    // database from before those columns existed.
    for (const key of ['warmup', 'side', 'rir'] as const) {
      const used = rows.some((row) => row[key] !== null && row[key] !== false);
      if (!used) for (const row of rows) delete row[key];
    }
    if (rows.length) {
      const { error: setsError } = await supabase.from('workout_sets').insert(rows);
      if (setsError) throw setsError;
    }
  }

  return { added: fresh.length, already: workouts.length - fresh.length };
}

/**
 * Write a set that already knows its own id.
 *
 * Upsert rather than insert, because this is what a flush replays. A set that
 * did land before the connection dropped — the row written, the reply lost —
 * must not come back as a duplicate key error that blocks the queue behind it
 * forever. Writing the same row twice is the same row.
 */
/**
 * Rewrite the order the blocks sit in on one workout's board.
 *
 * Addressed by set id rather than by the position being replaced. Writing
 * 「everything at position 3 becomes 0」 while something else is moving from 0
 * to 1 is a race with itself — the second update finds rows the first one has
 * already moved. Ids do not move.
 *
 * One update per block, in parallel: a board holds a handful of movements.
 */
export async function reorderWorkoutBlocks(blocks: { setIds: string[]; position: number }[]) {
  await Promise.all(
    blocks.map(async ({ setIds, position }) => {
      if (setIds.length === 0) return;
      const { error } = await supabase
        .from('workout_sets')
        .update({ position })
        .in('id', setIds);
      if (error) throw error;
    })
  );
}

export async function insertWorkoutSet(row: Record<string, unknown>) {
  const { error } = await supabase.from('workout_sets').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateWorkoutSet(
  id: string,
  patch: Partial<
    Pick<
      WorkoutSet,
      | 'weight_kg'
      | 'reps'
      | 'duration_sec'
      | 'distance_km'
      | 'done'
      | 'rir'
      | 'warmup'
      | 'side'
      | 'done_at'
      | 'superset'
    >
  >
) {
  const { error } = await supabase.from('workout_sets').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * Tie these sets into a superset, or set them free with null.
 *
 * One statement, so the blocks are never half tied. Throws on an account
 * whose database has no `superset` column yet — the caller says so rather
 * than queueing a write that cannot land.
 */
export async function markSuperset(setIds: string[], superset: string | null) {
  if (setIds.length === 0) return;
  const { error } = await supabase.from('workout_sets').update({ superset }).in('id', setIds);
  if (error) throw error;
}

/**
 * Move the sets still ahead of you onto a different movement.
 *
 * Only the undone ones. Sets already marked done are what happened, and
 * rewriting them would be the app editing the record of an afternoon that is
 * over — the same line `readiness` draws when it applies a weight change.
 *
 * The weights come along unchanged. A dumbbell press is not a bench press at
 * the same load, and she says so on the sheet; silently guessing a number
 * would be worse than leaving one you can see and correct.
 */
export async function swapRemainingSets(setIds: string[], toExerciseId: string) {
  if (setIds.length === 0) return;
  const { error } = await supabase
    .from('workout_sets')
    .update({ exercise_id: toExerciseId })
    .in('id', setIds);
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
    .select('workout_id, exercise_id, set_no, weight_kg, reps, rir, warmup, side, workouts!inner(started_at)')
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
  const columns =
    'gold, satiety, attire, settled_on, wardrobe, worn, furniture, grace, learning, charm, lesson_id, lesson_started_on, lesson_ends_on';
  let { data, error } = await supabase
    .from('household')
    .select(`${columns}, gifted_on`)
    .eq('user_id', userId)
    .maybeSingle();
  // Before migrate.sql adds gifted_on the household would not load at all —
  // and the household is the whole of her. Read it without, and give freely.
  if (error && /gifted_on/.test(error.message)) {
    ({ data, error } = await supabase.from('household').select(columns).eq('user_id', userId).maybeSingle());
  }
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
  let culture: Culture = data
    ? { grace: data.grace, learning: data.learning, charm: data.charm }
    : EMPTY_CULTURE;

  let lesson: Enrolment | null =
    data?.lesson_id && data.lesson_started_on && data.lesson_ends_on
      ? {
          lessonId: data.lesson_id,
          startedOn: data.lesson_started_on,
          endsOn: data.lesson_ends_on,
        }
      : null;

  const settled = settle(stored, today);

  // A course that has run out is collected here rather than when the shop is
  // opened. What she learned should land on the morning after her last class
  // whether or not anyone was looking, the same way the days away are charged.
  let collected: Enrolment | null = null;
  if (lesson && isFinished(lesson, today)) {
    const taught = lessonById(lesson.lessonId);
    if (taught) {
      culture = attend(taught, culture);
      // Only the first course is remembered, and the unique key is what
      // makes it the first: a later one is simply turned away.
      void remember(eventMemory('first_lesson', taught.name, today));
    }
    collected = lesson;
    lesson = null;
  }

  if (!data || settled !== stored || collected) {
    await saveHousehold(settled, collected ? { culture, lesson } : undefined);
  }
  const giftedOn: string | null = (data as { gifted_on?: string | null } | null)?.gifted_on ?? null;
  return { house: settled, wardrobe, worn, furniture, culture, lesson, giftedOn };
}

/**
 * Feed her for today's walking, and report what was actually paid.
 *
 * Reads and writes rather than incrementing blind: `getLedger` is what charges
 * the days that have gone by, so going through it means a top-up can never be
 * applied to a ledger that has not been settled yet — which would credit
 * satiety that is about to be taken away again.
 */
export async function creditWalk(points: number, today = new Date()) {
  if (points <= 0) return 0;
  const { house } = await getLedger(today);
  const fed = afterWalk(house, points);
  if (fed.satiety === house.satiety) return 0;
  await saveHousehold(fed);
  return fed.satiety - house.satiety;
}

export async function saveHousehold(house: Household, extra: Partial<Omit<Ledger, 'house'>> = {}) {
  const userId = await requireUserId();
  const { error } = await supabase.from('household').upsert({
    user_id: userId,
    gold: house.gold,
    satiety: house.satiety,
    attire: house.attire,
    settled_on: house.settledOn,
    // `lesson` is the one field whose null is meaningful — it is how a course
    // ends — so it is written whenever the caller mentions it at all.
    ...('lesson' in extra
      ? {
          lesson_id: extra.lesson?.lessonId ?? null,
          lesson_started_on: extra.lesson?.startedOn ?? null,
          lesson_ends_on: extra.lesson?.endsOn ?? null,
        }
      : {}),
    ...(extra.wardrobe ? { wardrobe: extra.wardrobe } : {}),
    ...(extra.worn ? { worn: extra.worn } : {}),
    ...(extra.furniture ? { furniture: extra.furniture } : {}),
    ...(extra.culture ? extra.culture : {}),
    ...(extra.giftedOn ? { gifted_on: extra.giftedOn } : {}),
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
  /** The course she is part-way through, or null when she is free. */
  lesson: Enrolment | null;
  /** The day the last gift was given (see givenToday), or null. */
  giftedOn: string | null;
};

/**
 * Buy a garment. She puts it on at once — nobody buys a dress to leave it in
 * the wardrobe — and being freshly dressed mends a ragged look.
 */
export async function buyGarment(garment: Garment, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.wardrobe.includes(garment.id)) throw new Error('이미 가지고 있어요');
  if (givenToday(ledger.giftedOn, today)) throw new Error(REFUSAL_TEXT.given);
  if (ledger.house.gold < garment.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - garment.price, attire: FULL };
  const wardrobe = [...ledger.wardrobe, garment.id];
  const worn = wearing(ledger.worn, garment);
  const giftedOn = localDayKey(today);
  await saveHousehold(house, { wardrobe, worn, giftedOn });
  void remember(giftMemory(garment.id, garment.name, today));
  return { ...ledger, house, wardrobe, worn, giftedOn };
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
  const gift = item.kind === 'accessory';
  if (gift && givenToday(ledger.giftedOn, today)) throw new Error(REFUSAL_TEXT.given);
  const next = buy(item, ledger.house, ledger.wardrobe);
  const giftedOn = gift ? localDayKey(today) : ledger.giftedOn;
  await saveHousehold(next.house, { wardrobe: next.wardrobe, ...(gift ? { giftedOn } : {}) });
  if (gift) void remember(giftMemory(item.id, item.name, today));
  return { ...ledger, house: next.house, wardrobe: next.wardrobe, giftedOn };
}

/** Buy a piece for her room. The slot it fills may already hold something. */
export async function buyFurniture(piece: Furniture, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.furniture.includes(piece.id)) throw new Error('이미 가지고 있어요');
  if (givenToday(ledger.giftedOn, today)) throw new Error(REFUSAL_TEXT.given);
  if (ledger.house.gold < piece.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - piece.price };
  const furniture = [...ledger.furniture, piece.id];
  const giftedOn = localDayKey(today);
  await saveHousehold(house, { furniture, giftedOn });
  void remember(giftMemory(piece.id, piece.name, today));
  return { ...ledger, house, furniture, giftedOn };
}

/** Pay for a lesson. What it teaches depends on how much she already knows. */
/**
 * Sign her up. What she learns lands when the course finishes, not now.
 *
 * Paying and learning in the same instant made the length meaningless and the
 * notification a lie — it said she had set off for a lesson whose points were
 * already banked.
 */
export async function takeLesson(lesson: Lesson, today = new Date()): Promise<Ledger> {
  const ledger = await getLedger(today);
  if (ledger.lesson) throw new Error('지금은 수업 중이에요');
  if (ledger.house.gold < lesson.price) throw new Error('골드가 모자라요');

  const house = { ...ledger.house, gold: ledger.house.gold - lesson.price };
  const enrolment = enrol(lesson, today);
  await saveHousehold(house, { lesson: enrolment });
  return { ...ledger, house, lesson: enrolment };
}

/**
 * Mark a workout paid, if nobody has yet. True when this call won it, false
 * when it was paid before, null when the column is not there yet (before
 * migrate.sql) — in which case paying goes on unguarded, as it always did.
 *
 * A conditional update rather than read-then-write, so the finish button and
 * the sweep for closed sessions cannot both pay the same one.
 */
async function claimPayment(id: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('workouts')
    .update({ paid_at: new Date().toISOString() })
    .eq('id', id)
    .is('paid_at', null)
    .select('id');
  if (error) {
    if (/paid_at/.test(error.message)) return null;
    throw error;
  }
  return (data as unknown[]).length > 0;
}

async function releasePayment(id: string) {
  await supabase.from('workouts').update({ paid_at: null }).eq('id', id);
}

/**
 * Pay out a finished workout. Returns the new ledger and what it earned — 0
 * when it had already been paid.
 */
export async function payForWorkout(fact: WorkoutFact, today = new Date()) {
  const claimed = await claimPayment(fact.id);
  if (claimed === false) return { house: await getHousehold(today), gold: 0 };
  try {
    const before = await getHousehold(today);
    const after = afterWorkout(before, fact);
    await saveHousehold(after);
    // Written now, by whoever is here now: this is the moment that decides
    // whose hand the entry is in. Never allowed to fail the payment.
    void getChosenGirlId().then((girl) => writeDiaries(girl ?? undefined)).catch(() => {});
    return { house: after, gold: workoutGold(fact) };
  } catch (e) {
    // Handed back, so the retry — or the next sweep — can pay it after all.
    if (claimed) await releasePayment(fact.id).catch(() => {});
    throw e;
  }
}

/**
 * Pay every finished session that has not been paid and has something in it.
 *
 * Sessions closed by closeAbandonedWorkouts never pass the finish button,
 * and ones written down after the fact are filled in through the editor —
 * neither was ever paid. Empty ones are left unclaimed rather than paid 0,
 * so filling them in later still earns. Returns the gold paid in all.
 */
export async function payUnpaidWorkouts(today = new Date()) {
  const { data, error } = await supabase
    .from('workouts')
    .select('id')
    .not('ended_at', 'is', null)
    .is('paid_at', null);
  if (error || !data?.length) return 0;
  const unpaid = new Set((data as { id: string }[]).map((w) => w.id));
  const facts = (await listWorkoutFacts()).filter(
    (f) => unpaid.has(f.id) && !isEmptyWorkout(f)
  );
  let gold = 0;
  for (const fact of facts) gold += (await payForWorkout(fact, today)).gold;
  return gold;
}

/*
  Friends. Everything goes through the functions in supabase/social.sql,
  which check the friendship before handing anything over; no table of
  another person's is ever read directly.
*/

export type Friend = { user_id: string; name: string; girl: string; last_trained: string | null };
export type FriendRoom = { name: string; girl: string; furniture: string[]; worn: string[] };

/** The caller's code, creating the card on first call. Name and girl kept current. */
export async function ensureFriendCard(name: string, girl: string): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_friend_card', { p_name: name, p_girl: girl });
  if (error) throw error;
  return data as string;
}

/** The name on the caller's own card, or '' before there is one. */
export async function myFriendName(): Promise<string> {
  const { data, error } = await supabase.rpc('my_friend_name');
  if (error) throw error;
  return (data as string | null) ?? '';
}

export async function addFriend(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('add_friend', { p_code: code });
  if (error) throw error;
  void remember(eventMemory('first_friend', data as string));
  return data as string;
}

export async function removeFriend(friendId: string) {
  const { error } = await supabase.rpc('remove_friend', { p_friend: friendId });
  if (error) throw error;
}

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('list_friends');
  if (error) throw error;
  return data as Friend[];
}

/**
 * Days trained together, per friend. Empty rather than failing: before
 * social.sql is re-run the function is missing, and the list still works.
 */
export async function listTogetherDays(): Promise<Map<string, string[]>> {
  const { data, error } = await supabase.rpc('together_days');
  const byFriend = new Map<string, string[]>();
  if (error) return byFriend;
  for (const row of data as { friend_id: string; day: string }[]) {
    byFriend.set(row.friend_id, [...(byFriend.get(row.friend_id) ?? []), row.day]);
  }
  return byFriend;
}

export async function getFriendRoom(friendId: string): Promise<FriendRoom> {
  const { data, error } = await supabase.rpc('friend_room', { p_friend: friendId });
  if (error) throw error;
  const row = (data as FriendRoom[])[0];
  if (!row) throw new Error('방을 찾지 못했어요');
  return row;
}

/** Send gold. Taken from the purse on the server, so read the ledger again after. */
export async function sendGift(friendId: string, amount: number, today = new Date()) {
  const { error } = await supabase.rpc('send_gift', {
    p_friend: friendId,
    p_amount: amount,
    p_day: localDayKey(today),
  });
  if (error) throw error;
}

/**
 * Write the together-bonus for a day the caller trained, for every friend
 * who trained too. Best effort — before social.sql is run there is nothing
 * to claim, and a workout must never fail over a bonus.
 */
export async function claimTogether(day: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { data, error } = await supabase.rpc('claim_together', { p_day: day, p_tz: tz });
  if (error) return 0;
  return (data as number) ?? 0;
}

/**
 * Collect what friends have sent and add it to the purse. Handed back to be
 * collected again if the purse cannot be saved, so a failure costs nothing.
 */
export async function collectGifts(today = new Date()): Promise<ArrivedGift[]> {
  const { data, error } = await supabase.rpc('claim_gifts');
  if (error) return [];
  const arrived = data as (ArrivedGift & { id: string })[];
  if (!arrived.length) return [];
  try {
    const house = await getHousehold(today);
    await saveHousehold({ ...house, gold: house.gold + arrivedTotal(arrived) });
  } catch (e) {
    await supabase.rpc('unclaim_gifts', { p_ids: arrived.map((g) => g.id) });
    throw e;
  }
  return arrived;
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
  const read = (columns: string) =>
    supabase
      .from('body_logs')
      .select(columns)
      .eq('user_id', userId)
      .order('measured_on', { ascending: false })
      .limit(limit);
  const full = await read('id, measured_on, weight_kg, body_fat_pct, muscle_kg, height_cm');
  if (!full.error) return full.data as unknown as BodyLog[];
  // Before migrate.sql has added height_cm, the rest still reads: a missing
  // column should cost the height, not the whole screen.
  if (!/height_cm/.test(full.error.message)) throw full.error;
  const older = await read('id, measured_on, weight_kg, body_fat_pct, muscle_kg');
  if (older.error) throw older.error;
  return (older.data as unknown as Omit<BodyLog, 'height_cm'>[]).map((row) => ({
    ...row,
    height_cm: null,
  }));
}

/**
 * Record today's measurements. One row per day: a second weigh-in replaces
 * the first rather than adding noise to the trend.
 */
export async function saveBodyLog(
  measurements: Partial<Pick<BodyLog, 'weight_kg' | 'body_fat_pct' | 'muscle_kg' | 'height_cm'>>,
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
/**
 * Put a movement away, or take it back out.
 *
 * Starring and hiding are opposites, so doing one undoes the other: a hidden
 * movement that was once a favourite would otherwise come back to the top of
 * the picker the moment it was unhidden, which is not what either tap meant.
 */
export async function setExerciseHidden(exerciseId: string, hidden: boolean) {
  const { error } = await supabase
    .from('exercises')
    .update(hidden ? { hidden, favourite: false } : { hidden })
    .eq('id', exerciseId);
  if (error) throw error;
}

/**
 * Whether this movement is done one side at a time.
 *
 * Stored on the movement rather than guessed from its name, because the person
 * who needed this is the one who typed a name nothing could recognise.
 */
export async function setExerciseUnilateral(exerciseId: string, unilateral: boolean) {
  const { error } = await supabase
    .from('exercises')
    .update({ unilateral })
    .eq('id', exerciseId);
  if (error) throw error;
}

/**
 * Turn the whole catalogue on or off at once.
 *
 * One statement rather than seventy: row level security already scopes it to
 * this account, and 「전부 끄기」 that takes a visible minute is one nobody
 * presses twice.
 *
 * Turning everything off also unstars everything, for the same reason the
 * single version does — a favourite that is not offered is a contradiction
 * waiting to surface the moment it comes back.
 */
export async function setAllExercisesHidden(hidden: boolean, ids?: string[]) {
  const user_id = await requireUserId();
  const patch = hidden ? { hidden, favourite: false } : { hidden };
  // Narrowed to what is on screen when the list is filtered, because that is
  // what 「전부」 means to someone looking at eight cable movements. Nothing
  // rather than everything when the filter matches none: a sweep over an
  // empty list must not quietly become a sweep over the whole catalogue.
  if (ids) {
    if (ids.length === 0) return;
    const { error } = await supabase.from('exercises').update(patch).in('id', ids);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('exercises').update(patch).eq('user_id', user_id);
  if (error) throw error;
}

export async function setExerciseFavourite(exerciseId: string, favourite: boolean) {
  const { error } = await supabase
    .from('exercises')
    // Starring something you had put away takes it back out. The two taps
    // mean opposite things, so one has to undo the other in both directions.
    .update(favourite ? { favourite, hidden: false } : { favourite })
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

/*
  What she remembers (docs/companion.md). Memories from training are read off
  the whole history each time rather than caught as they happen, so a
  session filled in afterwards, or one closed by itself, still lands on its
  own day. Only the ones from the shop and friends are written as they occur.
*/

/** Every finished session, as the memories read it. */
async function listMemorySessions(): Promise<MemorySession[]> {
  const [{ data, error }, exercises] = await Promise.all([
    supabase
      .from('workouts')
      .select('id, started_at, workout_sets(exercise_id, weight_kg, reps, duration_sec, done, warmup)')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: true })
      .limit(5000),
    listExercises(),
  ]);
  if (error) throw error;
  const nameOf = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    data as {
      id: string;
      started_at: string;
      workout_sets: Pick<WorkoutSet, 'exercise_id' | 'weight_kg' | 'reps' | 'duration_sec' | 'done' | 'warmup'>[];
    }[]
  ).map((w) => {
    // The same line isEmptyWorkout draws: warm-ups are not the work.
    const done = w.workout_sets.filter((s) => s.done && !s.warmup);
    const top = new Map<string, number>();
    for (const s of done) {
      const name = nameOf.get(s.exercise_id);
      if (name && s.weight_kg > 0 && s.reps > 0) top.set(name, Math.max(top.get(name) ?? 0, s.weight_kg));
    }
    return {
      id: w.id,
      started_at: w.started_at,
      worked: done.length > 0,
      lifts: [...top].map(([exercise, kg]) => ({ exercise, kg })),
    };
  });
}

const MEMORY_COLUMNS = 'kind, day, line, detail';

/**
 * Write one down, unless one of its kind already is. Never throws: a memory
 * that fails to save is a line she does not say, not a purchase that failed.
 */
async function remember(memories: Memory | Memory[], girl?: string) {
  const rows = (Array.isArray(memories) ? memories : [memories]).map((m) => ({ ...m }));
  if (!rows.length) return;
  try {
    const userId = await requireUserId();
    // Hers who is here now, unless the caller knows better.
    const who = girl ?? (await getChosenGirlId()) ?? DEFAULT_ADVISOR_ID;
    await supabase.from('memories').upsert(
      rows.map((m) => ({ user_id: userId, girl: who, ...m })),
      { onConflict: 'user_id,girl,kind', ignoreDuplicates: true }
    );
  } catch {
    // Before migrate.sql there is no table; the rest of the app goes on.
  }
}

/**
 * Every pick, oldest first. The first time it is asked with nothing there,
 * the girl here now is written in as having been here all along — everything
 * before the list existed is hers (lib/picks.ts). Empty when the table is
 * not there yet, which makes every girl see all of the history, as before.
 */
export async function listPicks(current?: string): Promise<GirlPick[]> {
  try {
    const { data, error } = await supabase
      .from('girl_picks')
      .select('girl, picked_at')
      .order('picked_at');
    if (error) return [];
    const picks = data as GirlPick[];
    if (picks.length || !current) return picks;
    const first = { girl: current, picked_at: new Date(0).toISOString() };
    const userId = await requireUserId();
    await supabase.from('girl_picks').insert({ user_id: userId, ...first });
    return [first];
  } catch {
    return [];
  }
}

/** Write down that she was chosen, now. Never throws. */
export async function recordPick(girl: string, previous?: string) {
  try {
    // The one being left is the one who was here all along, if nobody was
    // ever written down: otherwise the history would change hands with her.
    await listPicks(previous);
    const userId = await requireUserId();
    await supabase.from('girl_picks').insert({ user_id: userId, girl });
  } catch {
    // Before migrate.sql: the choice still holds on this phone.
  }
}

export type Bond = {
  days: number;
  stage: Stage;
  memories: Memory[];
  /** Read anyway to find the memories; 피아 reads the lifts in them too. */
  sessions: MemorySession[];
  sulk: Sulk | null;
  /** A sulk that ended today because of something done about it. */
  madeUp: boolean;
};

/**
 * How long she has known you and what she remembers, bringing the book up to
 * date on the way. Counted only over the days she was the one here, so each
 * girl has her own closeness and her own memories (docs/relationship.md).
 * Before migrate.sql the memories are simply empty and she still knows how
 * long it has been.
 */
export async function getBond(girl: string, today = new Date()): Promise<Bond> {
  const [sessions, picks] = await Promise.all([listMemorySessions(), listPicks(girl)]);
  const hers = whileShe(girl, picks, sessions);
  const days = daysTogether(hers);
  const firstGirl = picks[0]?.girl ?? girl;

  const trainedDays = sessions.filter((s) => s.worked).map((s) => localDayKey(new Date(s.started_at)));
  const { data, error } = await supabase.from('memories').select(`${MEMORY_COLUMNS}, girl`).order('day');
  const rows = error ? [] : (data as (Memory & { girl: string | null })[]);
  // Written before memories had a girl: they were the first girl's.
  if (rows.some((r) => r.girl === null)) {
    void supabase.from('memories').update({ girl: firstGirl }).is('girl', null).then(() => {});
  }
  const known: Memory[] = rows
    .filter((r) => (r.girl ?? firstGirl) === girl)
    .map(({ kind, day, line, detail }) => ({ kind, day, line, detail }));
  const giftDays = known.filter((m) => isGift(m.kind)).map((m) => m.day);

  // A sulk, and whether today is the day it was made up for.
  const sulk = sulkOf(girl, picks, trainedDays, giftDays, today);
  const key = localDayKey(today);
  const before = (d: string) => d < key;
  const wouldBe = sulkOf(girl, picks, trainedDays.filter(before), giftDays.filter(before), today);
  const madeUp = !sulk && wouldBe !== null;

  const events: Memory[] = [];
  if (sulk) events.push(eventMemory('first_sulk', '', today));
  if (madeUp) events.push(eventMemory('first_makeup', '', today));
  const found = [...memoriesFrom(hers), ...events];

  if (error) return { days, stage: stageOf(days), memories: [], sessions, sulk, madeUp };
  const missing = unrecorded(found, known.map((m) => m.kind as MemoryKind));
  if (missing.length) await remember(missing, girl);
  const memories = [...known, ...missing].sort((a, b) => a.day.localeCompare(b.day));
  return { days, stage: stageOf(days), memories, sessions, sulk, madeUp };
}

/*
  Her diary (lib/diary.ts, docs/relationship.md). Each finished session gets
  one entry, written once by the girl chosen at the time and never rewritten.
*/

/**
 * Write the entries still missing, newest first, a batch at a time. Called
 * when a session is paid (so it is hers who was there) and when the history
 * opens (which fills in sessions from before the diary existed, in the hand
 * of whoever is here now — the least untrue answer for days nobody logged).
 *
 * Never throws: before migrate.sql there is no diary column, and a diary
 * that could not be written is an empty line, not a failed workout.
 */
export async function writeDiaries(girl?: string, batch = 40): Promise<number> {
  try {
    const { data: missing, error } = await supabase
      .from('workouts')
      .select('id')
      .not('ended_at', 'is', null)
      .is('diary', null)
      .order('started_at', { ascending: false })
      .limit(batch);
    if (error || !missing?.length) return 0;

    const [facts, sessions, stored, picks] = await Promise.all([
      listWorkoutFacts(),
      listMemorySessions(),
      supabase
        .from('memories')
        .select(MEMORY_COLUMNS)
        .then(({ data: rows }) => (rows as Memory[] | null) ?? []),
      listPicks(girl),
    ]);
    const memories = [...memoriesFrom(sessions), ...stored.filter((m) => isGift(m.kind as MemoryKind))];
    const byId = new Map(facts.map((f) => [f.id, f]));
    const ordered = sessions.slice().sort((a, b) => a.started_at.localeCompare(b.started_at));

    let written = 0;
    for (const { id } of missing as { id: string }[]) {
      const today = byId.get(id);
      if (!today) continue;
      const day = localDayKey(new Date(today.started_at));
      const at = ordered.findIndex((s) => s.id === id);
      const bestBefore = new Map<string, number>();
      for (const s of ordered.slice(0, Math.max(0, at))) {
        for (const l of s.lifts) bestBefore.set(l.exercise, Math.max(bestBefore.get(l.exercise) ?? 0, l.kg));
      }
      // In the hand of whoever was chosen at the time, when that is known.
      const hand = whoWasThere(picks, today.started_at) ?? girl;
      const entry = diaryFor(
        {
          today,
          history: facts,
          lifts: at >= 0 ? ordered[at].lifts : [],
          bestBefore,
          memories: memories.filter((m) => m.day === day),
        },
        hand
      );
      if (!entry) continue;
      // Only where there is still none: two phones racing must not have the
      // second rewrite what the first girl wrote.
      const { error: saveError } = await supabase
        .from('workouts')
        .update({ diary: entry, diary_by: hand ?? DEFAULT_ADVISOR_ID })
        .eq('id', id)
        .is('diary', null);
      if (!saveError) written++;
    }
    return written;
  } catch {
    return 0;
  }
}

/*
  The festival (lib/festival.ts, docs/festival.md). Judged once, on the first
  open after the day. The memory row is the claim: it is written before the
  prize is paid, and taken back if the purse cannot be saved, so neither a
  second phone nor a second girl is paid for the same month.
*/

export type FestivalRecord = FestivalResult & { girl: string | null };

/**
 * The favours met for `festival` so far — since the one before it, up to the
 * end of `day` — each week asked by whoever was here at its start. 0 rather
 * than failing: a festival is never lost over the bonus.
 */
export async function festivalFavours(
  girl: string,
  facts: WorkoutFact[],
  festival: Festival,
  day: Date
): Promise<number> {
  try {
    const [picks, goal] = await Promise.all([listPicks(girl), getWeeklyGoal()]);
    const after = new Date(`${previousFestival(festival).day}T12:00:00`);
    return favoursMet(facts, after, day, (iso) => whoWasThere(picks, iso) ?? girl, goal);
  } catch {
    return 0;
  }
}

/** Every festival she has been to, newest first. Empty before migrate.sql. */
export async function listFestivalResults(): Promise<FestivalRecord[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('kind, detail, girl')
    .like('kind', 'festival:%')
    .order('day', { ascending: false });
  if (error) return [];
  return (data as { detail: string | null; girl: string | null }[]).flatMap((row) => {
    const result = parseResult(row.detail);
    return result ? [{ ...result, girl: row.girl }] : [];
  });
}

/**
 * Judge the festival just gone, if there is one waiting and nobody has yet.
 * Returns what was judged and paid, or null when there was nothing to do.
 * Never throws for want of the memories table — there is simply no festival
 * until there is somewhere to keep it.
 */
export async function judgeFestival(
  girl: string,
  facts: WorkoutFact[],
  today = new Date()
): Promise<{ result: FestivalResult; prize: number } | null> {
  const festival = unresolved(facts, today);
  if (!festival) return null;
  const kind = `festival:${festival.key}`;
  const { data: had, error } = await supabase.from('memories').select('kind').eq('kind', kind).limit(1);
  if (error || (had as unknown[]).length) return null;

  const ledger = await getLedger(today);
  const day = new Date(`${festival.day}T12:00:00`);
  const standing = standingAt(facts, ledger, day, await festivalFavours(girl, facts, festival, day));
  const chosen = await getFestivalEntry(festival.key);
  const contest = CONTESTS.some((c) => c.id === chosen) ? (chosen as ContestId) : defaultEntry(standing);
  const result = judge(contest, standing, festival, festivalIndex(facts, festival));

  const userId = await requireUserId();
  const { error: claimError } = await supabase
    .from('memories')
    .insert({ user_id: userId, girl, ...festivalMemory(result) });
  // Taken already — by another phone, a moment ago.
  if (claimError) return null;
  // The unique key is per girl, so two phones with different girls can both
  // get past the check above. The first row written keeps the month; a
  // later one takes itself back before anything is paid.
  const { data: rows } = await supabase
    .from('memories')
    .select('girl, created_at')
    .eq('kind', kind)
    .order('created_at')
    .limit(1);
  const first = (rows as { girl: string }[] | null)?.[0];
  if (first && first.girl !== girl) {
    await supabase.from('memories').delete().eq('kind', kind).eq('girl', girl);
    return null;
  }

  const prize = prizeFor(result.place);
  try {
    const { house } = await getLedger(today);
    await saveHousehold({ ...house, gold: house.gold + prize });
  } catch (e) {
    await supabase.from('memories').delete().eq('kind', kind).eq('girl', girl);
    throw e;
  }
  return { result, prize };
}
