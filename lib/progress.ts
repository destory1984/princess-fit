import { nextWeight } from './weight.ts';

/**
 * Whether last time earned more weight this time.
 *
 * The board already carries last session's weights forward, which is the right
 * guess and a silent one: nothing ever says 「이제 올려도 돼요」, so the number
 * that got you here stays there for months. This says it.
 *
 * The rule is double progression, read off what was actually done rather than
 * off a target nobody set. If the last set held up against the first, there was
 * room left — fatigue had not caught up — and the weight goes up one step. If
 * it dropped a little, the weight was right and the reps are still being earned.
 * If it collapsed, the weight was too much.
 *
 * It suggests and never applies. Warming up badly, sleeping badly and cutting a
 * set short all look identical from here, and only one person in the room knows
 * which it was.
 */

export type Verdict = 'add' | 'hold' | 'ease';

export type PastSet = { weight_kg: number; reps: number };

/** Below this share of the opening set, the last set did not hold up at all. */
export const COLLAPSE = 0.6;

/** Fewer than this and there is no shape to read. */
export const MIN_SETS = 2;

export type Readiness = {
  verdict: Verdict;
  /** The weight this points at, in kilos the rack can make. */
  weight: number;
  /** What it was, for saying what changed. */
  from: number;
};

/**
 * Read the last session of one exercise.
 *
 * Null when there is nothing to read: too few sets, or none of them weighted.
 * Bodyweight and timed work go through here too and get nothing, which is
 * correct — there is no next plate for a plank.
 */
export function readiness(sets: PastSet[]): Readiness | null {
  const weighted = sets.filter((s) => s.weight_kg > 0 && s.reps > 0);
  if (weighted.length < MIN_SETS) return null;

  const first = weighted[0];
  const last = weighted[weighted.length - 1];
  // The heaviest set is what the session was really about; a light back-off
  // set afterwards should not read as the working weight.
  const working = Math.max(...weighted.map((s) => s.weight_kg));

  if (last.reps >= first.reps) {
    return { verdict: 'add', weight: nextWeight(working, 1), from: working };
  }
  if (last.reps < first.reps * COLLAPSE) {
    return { verdict: 'ease', weight: nextWeight(working, -1), from: working };
  }
  return { verdict: 'hold', weight: working, from: working };
}

/**
 * Her line about it, or null when there is nothing worth interrupting for.
 *
 * "Hold" is deliberately silent. Staying at the same weight is what the board
 * already does, and a sentence every session saying nothing changed is a
 * sentence people learn to look past — which costs the two that matter.
 */
export function progressWord(readiness: Readiness | null): string | null {
  if (!readiness || readiness.verdict === 'hold') return null;
  const { verdict, weight, from } = readiness;
  if (weight === from) return null;

  return verdict === 'add'
    ? `지난번 마지막 세트까지 버티셨어요. 오늘 ${weight}kg 어떠세요?`
    : `지난번 뒤로 갈수록 힘들어 보였어요. ${weight}kg으로 내려도 괜찮아요.`;
}

/** Short label for the button that applies it. */
export function applyLabel(readiness: Readiness) {
  return `${readiness.weight}kg으로`;
}
