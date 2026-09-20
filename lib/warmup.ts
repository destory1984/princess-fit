/**
 * The sets before the sets that count.
 *
 * Warming up was already possible — a set can be marked 워밍업 and is then
 * left out of the volume, the gold, the records and the weight maths. What was
 * missing is the part nobody does by hand: working out the ramp. Someone about
 * to squat 80 has to decide on 40 and 60 and how many reps of each, every
 * time, standing in front of a bar. Given nothing, most people either skip it
 * or put a full set of 80 first and call it a warmup.
 *
 * So the ramp is offered, never imposed. It is a suggestion on the board with
 * the weights written out, because a suggestion you can read and refuse is the
 * only kind worth making about someone else's body.
 *
 * The percentages are the ordinary ones — roughly 40, 60, 80 of the working
 * weight, with the reps coming down as the weight goes up. They are not
 * precise and do not pretend to be: the point of the last warmup set is to
 * have lifted something near the working weight, not to have hit 78.4%.
 */

import { DUMBBELL_STEP, PLATE_STEP, PLATE_THRESHOLD } from './weight.ts';

export type WarmupSet = { weight: number; reps: number };

/**
 * Below this there is nothing to ramp up to.
 *
 * A 15kg dumbbell curl does not need three sets of preparation, and offering
 * them is how a useful suggestion becomes one people learn to dismiss without
 * reading. The bar itself is 20, so this is the weight at which plates have
 * started going on.
 */
export const WARMUP_FLOOR = 40;

/** Share of the working weight, and what to do at it. */
const RAMP = [
  { share: 0.4, reps: 8 },
  { share: 0.6, reps: 5 },
  { share: 0.8, reps: 3 },
];

/**
 * A weight that exists on the rack, rounded down.
 *
 * Down rather than nearest, because the one thing a warmup must not do is
 * come out heavier than intended — and 2.5 too light costs nothing at all.
 */
export function rackable(weight: number) {
  const step = weight >= PLATE_THRESHOLD ? PLATE_STEP : DUMBBELL_STEP;
  return Math.max(0, Math.floor(weight / step) * step);
}

/**
 * The ramp up to a working weight, or nothing.
 *
 * Empty below the floor, and empty for a movement with no weight at all —
 * bodyweight and cardio warm up by doing the thing, not by doing 40% of it.
 *
 * Steps that round to the same weight are folded together: at 45kg the first
 * two both land on 17.5 and 27.5 respectively, but at lighter working weights
 * the grid collapses them, and offering 「20kg×8 · 20kg×5」 reads as a bug.
 */
export function warmupFor(workingWeight: number): WarmupSet[] {
  if (!Number.isFinite(workingWeight) || workingWeight < WARMUP_FLOOR) return [];
  const sets: WarmupSet[] = [];
  for (const step of RAMP) {
    const weight = rackable(workingWeight * step.share);
    // Nothing to lift, and nothing at or above the working weight: a warmup
    // that equals the work is just the work done early.
    if (weight <= 0 || weight >= workingWeight) continue;
    if (sets.some((s) => s.weight === weight)) continue;
    sets.push({ weight, reps: step.reps });
  }
  return sets;
}

/**
 * The weight the ramp should lead up to.
 *
 * The heaviest planned set rather than the first, because someone whose three
 * sets climb 60·70·80 is warming up for 80. Warmup sets already on the board
 * are ignored — asking a ramp to lead up to a ramp compounds downward until
 * it suggests the empty bar.
 */
export function workingWeightOf(sets: { weight_kg: number; warmup?: boolean }[]) {
  return sets.filter((s) => !s.warmup).reduce((top, s) => Math.max(top, s.weight_kg), 0);
}

/** What the offer says, with the weights in it so it can be refused knowingly. */
export function warmupWord(sets: WarmupSet[]) {
  if (sets.length === 0) return null;
  return sets.map((s) => `${s.weight}kg × ${s.reps}회`).join(' · ');
}
