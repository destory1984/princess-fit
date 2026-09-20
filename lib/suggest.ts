import { slugsOf, type WorkedExercise } from './muscles.ts';
import type { Place } from './onboarding.ts';
import { usableAt } from './plan.ts';
import { MUSCLE_LABELS, READY, type Muscle } from './recovery.ts';

/**
 * One movement to start with, chosen rather than listed.
 *
 * An empty board and 「종목을 하나 골라볼까요?」 asks the one question the app
 * is better placed to answer than the person holding it: it knows which
 * muscles have had the longest rest, where they train, and which movements
 * they actually use. Handing back a list of sixty-seven is passing the
 * question along.
 *
 * She suggests and never decides. The pick is one tap to accept and one tap to
 * ignore, and the reason is always shown — 「등이 제일 오래 쉬었어요」 — because
 * a recommendation without a reason is just an app being bossy.
 */

export type Candidate = WorkedExercise & { id: string; name: string; equipment: string };

export type Suggestion = {
  id: string;
  name: string;
  /** Why this one, in her words. */
  why: string;
};

/** A movement is only as rested as its most tired part. */
function restOf(slugs: string[], recovery: Map<string, number>) {
  const known = slugs.filter((slug) => recovery.has(slug));
  if (known.length === 0) return 100;
  return Math.min(...known.map((slug) => recovery.get(slug)!));
}

/** Whichever of its muscles has waited longest — the reason to do this one. */
function reasonMuscle(slugs: string[], muscles: Muscle[]) {
  const relevant = muscles.filter((m) => slugs.includes(m.slug));
  if (relevant.length === 0) return null;
  return relevant.reduce((best, m) =>
    (m.hoursSince ?? Infinity) > (best.hoursSince ?? Infinity) ? m : best
  );
}

/**
 * Being able to do it where you are outranks everything.
 *
 * A perfectly rested barbell squat is not a suggestion to someone standing in
 * their bedroom, so equipment is worth more than any amount of freshness. Rest
 * comes next, then familiarity — a movement you have done before needs no
 * lesson first, and the point is to get the first set started.
 */
const PLACE_WEIGHT = 1000;
const REST_WEIGHT = 5;
const FAMILIAR_CAP = 10;

export function suggestExercise(
  candidates: Candidate[],
  muscles: Muscle[],
  options: {
    place?: Place | null;
    /** How many recent sessions used each exercise. */
    usage?: Map<string, number>;
    /** Already on today's board; suggesting one of these helps nobody. */
    exclude?: Set<string>;
  } = {}
): Suggestion | null {
  const { place = null, usage = new Map(), exclude = new Set() } = options;
  const recovery = new Map(muscles.map((m) => [m.slug, m.recovery]));

  const scored = candidates
    .filter((c) => !exclude.has(c.id))
    .map((c) => {
      const slugs = slugsOf(c);
      const rest = restOf(slugs, recovery);
      const here = place === null || usableAt(place, c.equipment);
      return {
        candidate: c,
        slugs,
        rest,
        score:
          (here ? PLACE_WEIGHT : 0) +
          rest * REST_WEIGHT +
          Math.min(usage.get(c.id) ?? 0, FAMILIAR_CAP),
      };
    })
    // Ties broken by name so the same board always suggests the same thing.
    // A suggestion that changes when you look away is one you stop trusting.
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name));

  const best = scored[0];
  if (!best) return null;

  const muscle = reasonMuscle(best.slugs, muscles);
  return { id: best.candidate.id, name: best.candidate.name, why: whyOf(best.rest, muscle) };
}

function whyOf(rest: number, muscle: Muscle | null) {
  if (!muscle) return '가볍게 시작하기 좋아요.';
  const label = MUSCLE_LABELS[muscle.slug] ?? muscle.label;

  if (muscle.hoursSince === null) return `${label}은(는) 아직 한 번도 안 하셨어요.`;
  if (rest < READY) return `${label}이(가) 아직 ${rest}%지만, 가볍게라면 괜찮아요.`;

  const days = Math.floor(muscle.hoursSince / 24);
  if (days >= 1) return `${label}을(를) ${days}일째 안 하셨어요.`;
  return `${label}은(는) 충분히 쉬었어요.`;
}

/** Her line offering it, so the wording lives beside the choosing. */
export function offerWord(suggestion: Suggestion) {
  return `${suggestion.why} ${suggestion.name} 어떠세요?`;
}
