import { DUMBBELL_STEP, PLATE_STEP, PLATE_THRESHOLD } from './weight.ts';

/**
 * How the body turned up today, asked once before a session starts.
 *
 * Every plan this app lays out is built from last time: same weights, same
 * sets. That is the right guess on an ordinary day and the wrong one on a day
 * you slept four hours — and the usual outcome of a plan that is too heavy is
 * not a hard session, it is no session. One question, three answers, and the
 * board comes up already adjusted.
 *
 * Deliberately worth no gold. If turning up tired paid better than turning up
 * fresh, the honest answer and the profitable answer would come apart, and the
 * question would stop telling the truth within a week. What an honest answer
 * buys is a lighter board, which is the thing actually wanted.
 */

export type Condition = 'light' | 'normal' | 'heavy';

export const CONDITIONS: {
  id: Condition;
  label: string;
  detail: string;
}[] = [
  { id: 'light', label: '가뿐해요', detail: '잘 쉬었고 몸이 가벼워요' },
  { id: 'normal', label: '보통이에요', detail: '평소와 비슷해요' },
  { id: 'heavy', label: '무거워요', detail: '피곤하거나 몸이 안 따라줘요' },
];

export const DEFAULT_CONDITION: Condition = 'normal';

/** How much weight comes off on a heavy day. */
export const EASE = 0.9;

export function isCondition(value: unknown): value is Condition {
  return value === 'light' || value === 'normal' || value === 'heavy';
}

export function conditionLabel(c: Condition) {
  return CONDITIONS.find((x) => x.id === c)!.label;
}

/** Down to the nearest weight the rack can actually make. */
function snapDown(value: number) {
  const step = value >= PLATE_THRESHOLD ? PLATE_STEP : DUMBBELL_STEP;
  return Math.max(0, Number((Math.floor(value / step) * step).toFixed(2)));
}

/**
 * A tenth off, landing on a real weight. Rounding down rather than to nearest
 * keeps a heavy day from quietly becoming a normal one.
 */
export function easeWeight(value: number) {
  if (value <= 0) return 0;
  const eased = snapDown(value * EASE);
  // The lightest dumbbell on the rack is still lighter than not lifting.
  return eased > 0 ? eased : value;
}

export type PlannedSet = { weight: number; reps: number };

/**
 * The plan, adjusted for how today feels.
 *
 * A heavy day loses its last set and a tenth of its weight; a light day gains
 * a set at the same weight. It gains a set rather than weight on purpose —
 * adding a rep is a decision you can abandon mid-set, adding kilos to a bar on
 * the strength of feeling good is how people get hurt. If you want more
 * weight, you can still put it there yourself.
 *
 * A single-entry plan is left alone in both directions: that shape means cardio
 * or a timed hold, where a second entry is not a second set of anything.
 */
export function shapePlan(sets: PlannedSet[], c: Condition): PlannedSet[] {
  if (c === 'normal' || sets.length === 0) return sets;

  if (c === 'light') {
    if (sets.length < 2) return sets;
    return [...sets, { ...sets[sets.length - 1] }];
  }

  const kept = sets.length > 1 ? sets.slice(0, -1) : sets;
  return kept.map((s) => ({ ...s, weight: easeWeight(s.weight) }));
}

/** What the adjustment did, in one line, so it is never a silent change. */
export function conditionNote(c: Condition, setCount: number): string | null {
  if (c === 'normal') return null;
  if (c === 'light') return setCount >= 2 ? '세트를 하나 더 얹었어요.' : null;
  return setCount > 1
    ? '무게를 조금 덜고 세트를 하나 줄였어요.'
    : '무게를 조금 덜었어요.';
}

// She answers the question, rather than confirming that it was recorded.
const LINES: Record<Condition, string> = {
  light: '좋은 날이네요. 그런 날은 조금 욕심내도 괜찮아요.',
  normal: '그럼 하던 대로 하시면 돼요.',
  heavy: '무리하지 마세요. 오늘 건 조금 덜어 뒀어요.',
};

export function conditionLine(c: Condition) {
  return LINES[c];
}

/** How many of the most recent sessions in a row came in heavy. */
export function heavyRun(recent: (Condition | null)[]) {
  let run = 0;
  for (const c of recent) {
    if (c !== 'heavy') break;
    run += 1;
  }
  return run;
}

/** Enough heavy days in a row to be about recovery rather than about one day. */
export const TIRED_RUN = 3;

/**
 * A word about a run of heavy days, shown where the question is asked.
 *
 * Three in a row is no longer a tired Tuesday. The app cannot tell whether
 * that is sleep, work or too much training, so it says what it saw and leaves
 * the conclusion alone — and it says resting is allowed, because a training
 * app that only ever pushes is the reason people quit them.
 */
export function tiredWord(recent: (Condition | null)[]): string | null {
  const run = heavyRun(recent);
  if (run < TIRED_RUN) return null;
  return `${run}번 연속으로 몸이 무거우셨어요. 오늘은 쉬어도 괜찮아요.`;
}
