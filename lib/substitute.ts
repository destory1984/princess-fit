/**
 * What to do instead, when you cannot do this.
 *
 * The machine is taken, the rack is busy, the shoulder complains today, or
 * the room simply has no cable tower in it. Every one of those ends the same
 * way without an answer: the movement gets skipped and the muscle goes home
 * untrained. Naming a stand-in is the difference between a missing set and a
 * missing session.
 *
 * Similarity here means the muscles worked, not the name. 「덤벨 프레스」 is
 * close to 「벤치프레스」 because they share chest and triceps, and 「푸시업」 is
 * close for the same reason even though nothing about the two words matches.
 * The overlap is measured against what the catalogue already stores, so a new
 * exercise becomes substitutable the moment its body parts are filled in —
 * nothing here needs a hand-written table of equivalents to maintain.
 *
 * Different equipment is the point, so it is rewarded rather than required.
 * Rewarded, because the usual reason for asking is that this particular
 * apparatus is unavailable; not required, because two dumbbell movements can
 * be honest substitutes and refusing to say so would be the rule outranking
 * the truth.
 */

import { DEFAULT_EXERCISES } from './exerciseCatalog.ts';
import { withParticle } from './korean.ts';
import { slugsOf, type WorkedExercise } from './muscles.ts';
import type { Place } from './onboarding.ts';
import { usableAt } from './plan.ts';

export type Substitutable = WorkedExercise & {
  id?: string;
  name: string;
  equipment: string;
};

/**
 * How little shared muscle still counts as a substitute.
 *
 * Below this the two movements merely brush against each other — a squat and
 * a calf raise share the calves — and offering one for the other would train
 * people to ignore the whole feature.
 */
export const MIN_OVERLAP = 0.4;

/** How many to name. More than three reads as a catalogue, not an answer. */
export const MAX_SUBSTITUTES = 3;

export type Substitute<T> = { exercise: T; overlap: number; sameGear: boolean };

/** Shared muscles over total muscles: 1 when identical, 0 when unrelated. */
export function overlapOf(a: WorkedExercise, b: WorkedExercise) {
  const left = new Set(slugsOf(a));
  const right = new Set(slugsOf(b));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const slug of left) if (right.has(slug)) shared += 1;
  return shared / (left.size + right.size - shared);
}

const STAPLE_ORDER = new Map(DEFAULT_EXERCISES.map((e, i) => [e.name, i]));

/** Where a movement stands in the catalogue; after all of it when not in it. */
function staple(name: string) {
  return STAPLE_ORDER.get(name) ?? STAPLE_ORDER.size;
}

/**
 * Movements that would do instead, best first.
 *
 * Identity is matched on id where the caller has one and on name otherwise, so
 * a movement is never offered as a substitute for itself — which is what the
 * perfect overlap score would otherwise make it.
 */
export function substitutesFor<T extends Substitutable>(
  target: Substitutable,
  pool: T[],
  limit = MAX_SUBSTITUTES
): Substitute<T>[] {
  const isSelf = (e: T) =>
    target.id !== undefined && e.id !== undefined ? e.id === target.id : e.name === target.name;

  return pool
    .filter((e) => !isSelf(e))
    // The same part of the body first, before any counting. Overlap alone once
    // put 「덤벨 숄더 프레스」 above 「푸시업」 as a stand-in for the bench press,
    // because it shares the triceps and the deltoids — while missing the chest,
    // which is the entire reason the bench press was on the board. A substitute
    // that skips the muscle you came for is not a substitute.
    .filter((e) => e.muscle_group === target.muscle_group)
    .map((exercise) => ({
      exercise,
      overlap: overlapOf(target, exercise),
      sameGear: exercise.equipment === target.equipment,
    }))
    .filter((s) => s.overlap >= MIN_OVERLAP)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        // Among equally close movements, the one on other equipment first:
        // that is the one that answers the question actually being asked.
        Number(a.sameGear) - Number(b.sameGear) ||
        // Then the staple before the variation. The catalogue is written
        // staples first, and once it held three kinds of push-up, spelling
        // decided which one stood in for the bench press: 「니 푸시업」 sorts
        // ahead of 「덤벨 프레스」. A movement the person wrote themselves has
        // no place in that order and comes after, by name.
        staple(a.exercise.name) - staple(b.exercise.name) ||
        a.exercise.name.localeCompare(b.exercise.name)
    )
    .slice(0, limit);
}

/**
 * The same question, asked from where you actually are.
 *
 * At home the honest answer is drawn from what the room contains — offering a
 * cable machine to someone standing on a mat is the feature not listening. If
 * the room has nothing close enough, the wider answer is given rather than
 * none: knowing the machine that would do it is worth more than silence.
 */
export function substitutesHere<T extends Substitutable>(
  target: Substitutable,
  pool: T[],
  place: Place | null,
  limit = MAX_SUBSTITUTES
): Substitute<T>[] {
  if (place === 'home') {
    const here = substitutesFor(target, pool.filter((e) => usableAt('home', e.equipment)), limit);
    if (here.length > 0) return here;
  }
  return substitutesFor(target, pool, limit);
}

/**
 * Why this one, in her words. Never a percentage: the number is a ranking
 * device, and reading it out would invite an argument about whether 「67%」 is
 * good, which is not a question the number can answer.
 */
export function substituteWord(sub: Substitute<Substitutable>) {
  if (sub.overlap >= 0.8) return '거의 같은 데를 써요';
  if (sub.sameGear) return '쓰는 데가 비슷해요';
  return `${withParticle(sub.exercise.equipment, '으로로')} 비슷한 데를 써요`;
}
