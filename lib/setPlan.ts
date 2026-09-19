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
