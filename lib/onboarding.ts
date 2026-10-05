import { ROUTINE_PRESETS, type RoutinePreset } from './routinePresets.ts';

/**
 * The first five minutes, which decide whether there is a sixth.
 *
 * Before this, a new account landed on an empty room with an empty routine
 * list and a button. Everything the app needs in order to be useful — how
 * often you intend to come, where you train, what you are after — it already
 * had no way to ask, so it guessed, and its guesses were the same for
 * everybody.
 *
 * The questions are asked by her rather than by a form. That is not decoration:
 * "일주일에 몇 번 오실 건가요" from someone who is waiting is a promise, and
 * the same question in a settings row is data entry. It is also the honest
 * place to meet her, since she is who the gold is for.
 */

export type Goal = 'strength' | 'shape' | 'weight' | 'habit' | 'stamina';

export const GOALS: { id: Goal; label: string; detail: string }[] = [
  { id: 'strength', label: '힘을 키우고 싶어요', detail: '더 무겁게 드는 쪽으로' },
  { id: 'shape', label: '몸을 다듬고 싶어요', detail: '모양과 균형을 보는 쪽으로' },
  { id: 'weight', label: '체중을 줄이고 싶어요', detail: '오래, 자주 움직이는 쪽으로' },
  { id: 'habit', label: '꾸준히만 하고 싶어요', detail: '무리 없이 거르지 않는 쪽으로' },
  // From a review of a much larger app: 「운동 목적을 심폐 향상이나 민첩성
  // 향상에 두어도 그저 흔한 보디빌딩식 분할법 추천만 해주네요」. Four goals
  // that all answered with the same barbell is four goals pretending to be a
  // question. Someone who came to breathe better deserves a different answer.
  { id: 'stamina', label: '숨이 덜 차면 좋겠어요', detail: '심폐와 지구력을 올리는 쪽으로' },
];

export type Place = 'gym' | 'home';

export const PLACES: { id: Place; label: string; detail: string }[] = [
  { id: 'gym', label: '헬스장', detail: '기구와 덤벨이 있어요' },
  { id: 'home', label: '집', detail: '맨몸이나 가벼운 덤벨만 있어요' },
];

export const MIN_PER_WEEK = 1;
export const MAX_PER_WEEK = 7;

/**
 * Which ready-made routines to offer, given the answers.
 *
 * Twice a week is not enough days to split a body across, so those answers get
 * whole-body sessions however ambitious the goal; four or more has room for an
 * upper/lower pair and is wasted on repeating the same session. Training at
 * home skips the question entirely — there is only one routine that works
 * without a rack.
 *
 * Presets are returned rather than named so a caller that offers none can say
 * so, instead of building a routine out of a missing id.
 */
export function recommendPresets(
  place: Place,
  perWeek: number,
  goal: Goal | null = null
): RoutinePreset[] {
  const pick = (...ids: string[]) =>
    ids.map((id) => ROUTINE_PRESETS.find((p) => p.id === id)).filter((p): p is RoutinePreset => !!p);

  if (goal === 'stamina') {
    // The heart answers to minutes, not to plates — so the breathing day
    // leads, with the strength work behind it rather than instead of it.
    return place === 'home'
      ? pick('cardio', 'home', 'full-body')
      : pick('cardio', 'full-body', 'upper-lower-a');
  }
  if (place === 'home') return pick('home');
  if (perWeek >= 4) return pick('upper-lower-a', 'upper-lower-b', 'full-body');
  return pick('full-body', 'upper-lower-a', 'upper-lower-b');
}

/**
 * Her word on the plan just described, said back in her own words so the
 * answers read as heard rather than stored.
 */
export function planWord(goal: Goal, place: Place, perWeek: number) {
  const where = place === 'home' ? '집에서' : '헬스장에서';
  const aim: Record<Goal, string> = {
    strength: '힘을 키우는 쪽으로',
    shape: '몸을 다듬는 쪽으로',
    weight: '체중을 줄이는 쪽으로',
    habit: '거르지 않는 쪽으로',
    stamina: '숨이 덜 차는 쪽으로',
  };
  return `${where} 일주일에 ${perWeek}번, ${aim[goal]}. 그렇게 알고 있을게요.`;
}

/**
 * What she says about how often you intend to come.
 *
 * Nobody is talked out of an ambitious answer — it is their week, not the
 * app's. But seven days a week is a plan that fails in its second week, and
 * saying so once, gently, before it has failed is kinder than the streak
 * counter saying it afterwards.
 */
export function perWeekWord(perWeek: number): string {
  if (perWeek <= 1) return '한 번이라도 꾸준하면 그게 제일 좋아요.';
  if (perWeek <= 3) return '그 정도가 제일 오래 가요.';
  if (perWeek <= 5) return '꽤 자주 오시네요. 기다리는 보람이 있겠어요.';
  return '거의 매일이네요. 쉬는 날도 하루쯤 두세요.';
}

export const STEPS = ['meet', 'often', 'goal', 'place', 'routine', 'nudge'] as const;
export type Step = (typeof STEPS)[number];

/**
 * The steps this device can actually walk.
 *
 * A browser cannot deliver the daily word, so asking what hour to send it is a
 * question whose answer does nothing. Settings already hides the same card on
 * the web; this is the first screen a tester sees, and it was still asking.
 */
export function stepsFor(canNudge: boolean): readonly Step[] {
  return canNudge ? STEPS : STEPS.filter((s) => s !== 'nudge');
}

export function nextStep(step: Step, steps: readonly Step[] = STEPS): Step | null {
  const i = steps.indexOf(step);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

export function previousStep(step: Step, steps: readonly Step[] = STEPS): Step | null {
  const i = steps.indexOf(step);
  return i > 0 ? steps[i - 1] : null;
}

/** How far along, for the bar at the top. 0–1. */
export function progressOf(step: Step, steps: readonly Step[] = STEPS) {
  return (steps.indexOf(step) + 1) / steps.length;
}
