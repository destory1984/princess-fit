import type { Insight } from './insight.ts';
import type { Goal, Place } from './onboarding.ts';

/**
 * What the two onboarding answers are actually for.
 *
 * She promises two things while asking them — 「집이라면 기구 없이 할 수 있는
 * 걸로 드릴게요」 and 「뭘 바라고 오셨는지 알면, 제가 드릴 말씀도 달라져요」 —
 * and for a while the answers were stored and never read again. This is the
 * debt.
 *
 * Neither one invents anything. Where you train changes the order movements
 * are offered in, not which ones exist; what you came for changes which true
 * thing is said first, not what is true. An app that hid the barbell work from
 * someone who said 집 would be wrong the first day they visited a gym, and one
 * that told a different story per goal would be telling at least three lies.
 */

/** What a room with no rack in it can still do. */
export const HOME_EQUIPMENT = ['맨몸', '덤벨', '기타'];

export function usableAt(place: Place, equipment: string) {
  return place === 'gym' || HOME_EQUIPMENT.includes(equipment);
}

/**
 * Movements you can do where you train, first.
 *
 * A stable partition rather than a filter: someone who trains at home this
 * month may be in a gym next week, and a picker that has quietly forgotten
 * the squat rack is a picker you stop trusting. Order is advice; absence
 * would be a decision.
 */
export function byPlace<T extends { equipment: string }>(
  exercises: T[],
  place: Place | null
): T[] {
  if (place === null || place === 'gym') return exercises;
  const here = exercises.filter((e) => usableAt(place, e.equipment));
  const elsewhere = exercises.filter((e) => !usableAt(place, e.equipment));
  return [...here, ...elsewhere];
}

/**
 * Which findings matter most, per goal.
 *
 * Every id here is one `insightsFor` already produces. The goal decides what
 * is read out first when there is only room for one or two — it does not add
 * a finding, remove one, or change what any of them says.
 */
const GOAL_PRIORITY: Record<Goal, string[]> = {
  // Adding load means turning up and not letting a group go cold.
  strength: ['neglected', 'sparse', 'lopsided', 'more-often', 'streak', 'balanced', 'cardio'],
  // Shape is about where the work lands, so imbalance leads.
  shape: ['lopsided', 'neglected', 'balanced', 'sparse', 'more-often', 'streak', 'cardio'],
  // Weight answers to how often and how long, before what.
  weight: ['sparse', 'cardio', 'more-often', 'streak', 'neglected', 'lopsided', 'balanced'],
  // Showing up is the whole goal; everything else is detail.
  habit: ['sparse', 'streak', 'more-often', 'neglected', 'lopsided', 'balanced', 'cardio'],
  // The heart answers to minutes, so how much breathing work there was leads,
  // and how often it happened comes next. The plates come last but still come.
  stamina: ['cardio', 'sparse', 'more-often', 'streak', 'neglected', 'lopsided', 'balanced'],
};

/**
 * The same findings, ordered by what you said you came for.
 *
 * Anything not named keeps its original position relative to the rest, so a
 * new finding added to `insightsFor` shows up rather than silently sorting to
 * the end of every list.
 */
export function rankByGoal(insights: Insight[], goal: Goal | null): Insight[] {
  if (goal === null) return insights;
  const priority = GOAL_PRIORITY[goal];
  const rankOf = (insight: Insight) => {
    const found = priority.indexOf(insight.id);
    return found === -1 ? priority.length : found;
  };
  return [...insights]
    .map((insight, index) => ({ insight, index, rank: rankOf(insight) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.insight);
}

// What she is watching for, said in her own words. Shown above the findings so
// the ordering is visible rather than mysterious — a list that quietly
// rearranges itself is worse than one that never changed.
const WATCHING: Record<Goal, string> = {
  strength: '힘을 키우신다고 하셨으니, 빠진 부위가 없는지부터 봐요.',
  shape: '몸을 다듬으신다고 하셨으니, 한쪽으로 쏠리지 않았는지부터 봐요.',
  weight: '체중을 줄이신다고 하셨으니, 얼마나 자주 오셨는지부터 봐요.',
  habit: '꾸준히만 하신다고 하셨으니, 거른 날이 있는지부터 봐요.',
  stamina: '숨이 덜 차면 좋겠다고 하셨으니, 유산소를 얼마나 하셨는지부터 봐요.',
};

export function watchingWord(goal: Goal | null) {
  return goal === null ? null : WATCHING[goal];
}
