import type { TrackType } from './types.ts';

/**
 * What to put on the board when an exercise is added to a workout.
 *
 * Adding a bench press and getting one empty set means typing the whole thing
 * out again every time. Last time's sets are the best guess at this time's —
 * same count, same weights, same reps — and a first-ever exercise gets a plain
 * three by ten to edit down from.
 */

export const PRESET_SETS = 3;
export const PRESET_REPS = 10;

export type PlannedSet = { weight: number; reps: number };

/** A previous session's sets, as `getLastPerformance` returns them. */
export type PastSet = { weight_kg: number; reps: number };

export function planFor(track: TrackType, past: PastSet[] | undefined): PlannedSet[] {
  // Cardio and timed work are one entry you edit, not a list of sets.
  if (track !== 'weight_reps') return [{ weight: 0, reps: 0 }];

  if (past && past.length > 0) {
    return past.map((s) => ({ weight: s.weight_kg, reps: s.reps }));
  }
  return Array.from({ length: PRESET_SETS }, () => ({ weight: 0, reps: PRESET_REPS }));
}

/**
 * Sets of the same exercise that should follow the one just finished.
 *
 * Nobody loads the bar for set two and then starts set three from nothing, but
 * sets laid out in advance have no way to know what weight the day turned out
 * to be. A later set that has never been given a weight adopts the one just
 * finished; a set that was deliberately set to something is left alone, which
 * is why zero is the test rather than "not yet edited".
 */
export function followOn<T extends { id: string; set_no: number; done: boolean; weight_kg: number }>(
  sameExercise: T[],
  completed: T
) {
  return sameExercise.filter(
    (s) => !s.done && s.set_no > completed.set_no && s.weight_kg === 0
  );
}

/**
 * What the sets still waiting should become, now that one has been done.
 *
 * The board is laid out from last time: set three shows what set three was
 * then. But 10kg for 12 and then for 10 today means last time's 15 is not
 * coming, and neither is last time's 20kg after it. A board that goes on
 * asking is reading from a day that is not this one. Two rules, both of which
 * only ever take away:
 *
 * - A later set at the same weight or heavier does not ask for more reps than
 *   the set just finished.
 * - Once the reps have fallen at a weight (fewer than an earlier set today at
 *   that same weight), later sets do not go heavier than it.
 *
 * A lighter set after a heavy one is a drop set and is meant to have more
 * reps, so it is left alone. A heavier set is left alone until the reps fall:
 * 40×12, 50×10, 60×6 is a pyramid, and its reps fall because the weight rose,
 * not because the lifter is spent. A set that asks for fewer is a plan, not an
 * oversight. Warm-ups are neither measured against nor changed — three reps
 * at 80% says nothing about the working sets after it.
 *
 * Returns only the sets that change, with what they change to.
 */
export function settle<
  T extends {
    id: string;
    set_no: number;
    done: boolean;
    weight_kg: number;
    reps: number;
    warmup?: boolean | null;
  },
>(sameExercise: T[], completed: T): { id: string; weight_kg: number; reps: number }[] {
  if (completed.warmup || completed.reps <= 0) return [];
  const tiring = sameExercise.some(
    (s) =>
      s.done &&
      !s.warmup &&
      s.id !== completed.id &&
      s.set_no < completed.set_no &&
      s.weight_kg === completed.weight_kg &&
      s.reps > completed.reps
  );
  const changes: { id: string; weight_kg: number; reps: number }[] = [];
  for (const s of sameExercise) {
    if (s.done || s.warmup || s.set_no <= completed.set_no) continue;
    // A set with no weight yet takes the finished one's (followOn).
    const planned = s.weight_kg === 0 ? completed.weight_kg : s.weight_kg;
    const weight = tiring && planned > completed.weight_kg ? completed.weight_kg : planned;
    const reps = weight >= completed.weight_kg ? Math.min(s.reps, completed.reps) : s.reps;
    if (weight !== planned || reps !== s.reps) changes.push({ id: s.id, weight_kg: weight, reps });
  }
  return changes;
}
