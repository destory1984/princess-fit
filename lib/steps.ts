/**
 * Walking, and what it is worth.
 *
 * Skipping a day costs three things at once — she gets hungry, the stats dim,
 * and the upkeep is charged anyway. That was chosen deliberately, but it means
 * a busy week is punishing, and a busy week is the normal case rather than the
 * exception. Walking is the way out that does not cheapen training.
 *
 * It pays no gold, on purpose. The shop is priced against a year of steady
 * training — 156 sessions — and a second source of income would pull that
 * apart quietly, until the wardrobe arrived months early and the year stopped
 * meaning anything. What walking buys instead is her: a day spent on your feet
 * keeps her from going as hungry as a day spent in a chair.
 *
 * It is never a meal. A full day of walking is worth less than half a day of
 * hunger, so it softens a gap and cannot replace turning up.
 *
 * What it buys, in her words, is the errand: a day spent on your feet is a day
 * you passed the market, so something came home with you. That story matters.
 * The screen used to say only 「대신 덜 배고파해요」 — what happens, with no
 * reason why — and the first question it got was 「음식을 주기 때문인가?」. A
 * rule nobody can explain is a rule nobody trusts.
 */

export const DEFAULT_STEP_GOAL = 8000;
export const MIN_STEP_GOAL = 2000;
export const MAX_STEP_GOAL = 30000;
export const STEP_GRAIN = 1000;

/** The most a full day of walking tops her up, against SATIETY_PER_DAY of 14. */
export const WALK_SATIETY = 6;

export function clampGoal(goal: number) {
  const snapped = Math.round(goal / STEP_GRAIN) * STEP_GRAIN;
  return Math.max(MIN_STEP_GOAL, Math.min(MAX_STEP_GOAL, snapped));
}

/** How much of the day's goal is done, 0–1. */
export function walkShare(steps: number, goal = DEFAULT_STEP_GOAL) {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, steps / goal));
}

/**
 * What today's walking is worth to her, in satiety.
 *
 * Credit is proportional rather than all-or-nothing. An app that gives 7,900
 * steps exactly nothing is an app people come to resent, and the ring filling
 * up is goal enough without a cliff at the end of it.
 */
export function walkSatiety(steps: number, goal = DEFAULT_STEP_GOAL) {
  return Math.floor(WALK_SATIETY * walkShare(steps, goal));
}

/**
 * The points still owed for today, given what has already been credited.
 *
 * Walking continues after the app is closed, so this is asked again every time
 * the home screen opens and pays only the difference. Never negative: a step
 * count that comes back lower than before — a new phone, a permission revoked,
 * a reset — must not take food away from her.
 */
export function walkOwed(steps: number, credited: number, goal = DEFAULT_STEP_GOAL) {
  return Math.max(0, walkSatiety(steps, goal) - credited);
}

// She notices the walking rather than reporting it. A number read back at you
// is a pedometer; "바람 좋았겠어요" is someone who was thinking about your day.
export function walkWord(steps: number, goal = DEFAULT_STEP_GOAL): string {
  if (steps <= 0) return '오늘은 아직 안 나가셨네요.';
  const share = walkShare(steps, goal);
  if (share >= 1) return '오늘 많이 걸으셨네요. 바람 좋았겠어요.';
  if (share >= 0.6) return '꽤 걸으셨어요. 조금만 더 걸으시면 딱이에요.';
  if (share >= 0.3) return '조금 걸으셨네요. 저녁에 한 바퀴 어떠세요?';
  return '오늘은 앉아 계셨나 봐요.';
}

/** Worth saying out loud only when walking actually stood in for a rest day. */
export function walkNote(points: number): string | null {
  if (points <= 0) return null;
  return `오는 길에 장을 봐 오셨어요 · 포만감 +${points}`;
}

/** Why walking feeds her at all, for the line under the card. */
export const WALK_REASON =
  '걷다 보면 장도 보게 되니까요. 골드는 들지 않아요.';
