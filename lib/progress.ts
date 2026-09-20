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

export type PastSet = {
  weight_kg: number;
  reps: number;
  /**
   * A set done to get warm rather than to count.
   *
   * It has to be known here, because the shape this file reads is the shape of
   * the working sets. A warm-up of fifteen easy reps sitting in front of three
   * hard sets of six makes the last set look like a collapse, and the advice
   * that comes out is 「내려도 괜찮아요」 to someone who was never struggling.
   */
  warmup?: boolean;
  /**
   * Reps left in the tank when the set was racked, if they were asked.
   *
   * A review of a much larger app, about a feature it had quietly dropped:
   * 「예전에 보였던 '현재 세트에 대해 몇 회 더 할 수 있을 것 같나요?' 이 문구가
   * 안 뜨네요. 그걸로 도움 받은 게 많았는데」. It is the only number in this
   * file the person actually knows. Everything else here is inference from
   * what the reps did, and inference cannot tell a hard set from a distracted
   * one — but the lifter can, and they answer in one tap.
   */
  rir?: number | null;
};

/** Enough left over that the weight was simply too light. */
export const EASY_RIR = 3;

/** None left. One more rep was not happening. */
export const SPENT_RIR = 0;

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
  // Working sets only. What was lifted to get warm is not part of the shape.
  const weighted = sets.filter((s) => !s.warmup && s.weight_kg > 0 && s.reps > 0);
  if (weighted.length < MIN_SETS) return null;

  const first = weighted[0];
  const last = weighted[weighted.length - 1];
  // The heaviest set is what the session was really about; a light back-off
  // set afterwards should not read as the working weight.
  const working = Math.max(...weighted.map((s) => s.weight_kg));

  /*
    What they said outranks what the numbers imply.

    The rep shape is a guess at how hard it was; 「3회 더 할 수 있었어요」 is
    the answer. A session cut short because a call came in looks identical to
    an easy one from the outside, and only one person in the room knows which
    it was — so when they have told us, the guess steps aside.
  */
  const said = last.rir;
  if (typeof said === 'number') {
    if (said >= EASY_RIR) {
      return { verdict: 'add', weight: nextWeight(working, 1), from: working };
    }
    // Spent on the last set *and* the reps fell away is the one case where
    // being spent means too heavy rather than exactly heavy enough.
    if (said <= SPENT_RIR && last.reps < first.reps * COLLAPSE) {
      return { verdict: 'ease', weight: nextWeight(working, -1), from: working };
    }
    return { verdict: 'hold', weight: working, from: working };
  }

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
export function progressWord(
  readiness: Readiness | null,
  said = false
): string | null {
  if (!readiness || readiness.verdict === 'hold') return null;
  const { verdict, weight, from } = readiness;
  if (weight === from) return null;

  // Said differently when they told us themselves, because 「보였어요」 to
  // someone who answered the question reads as not having been listened to.
  if (said) {
    return verdict === 'add'
      ? `지난번에 여유가 있으셨다니, 오늘 ${weight}kg 어떠세요?`
      : `지난번에 꽉 채우셨죠. ${weight}kg으로 내려도 괜찮아요.`;
  }
  return verdict === 'add'
    ? `지난번 마지막 세트까지 버티셨어요. 오늘 ${weight}kg 어떠세요?`
    : `지난번 뒤로 갈수록 힘들어 보였어요. ${weight}kg으로 내려도 괜찮아요.`;
}

/** The three answers, which is as many as anyone will give between sets. */
export const RIR_CHOICES = [
  { rir: 0, label: '더 못 해요' },
  { rir: 2, label: '1~2개' },
  { rir: 4, label: '3개 넘게' },
] as const;

/** Asked once a set is racked, never before it. */
export const RIR_QUESTION = '몇 개 더 하실 수 있었어요?';

/** Short label for the button that applies it. */
export function applyLabel(readiness: Readiness) {
  return `${readiness.weight}kg으로`;
}
