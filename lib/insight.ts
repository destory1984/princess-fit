import { localDayKey } from './format.ts';
import { bestWeeklyCoverage, streakOf, type WorkoutFact } from './gamification.ts';
import { voiceOf } from './voices.ts';

/**
 * Reading the numbers so you do not have to.
 *
 * A chart tells you what happened; it does not tell you that you have not
 * touched your back in three weeks. Each finding is one sentence you could act
 * on tomorrow, and nothing is said unless there is enough history to mean it —
 * an app that invents patterns from two workouts teaches you to ignore it.
 */

export type Tone = 'good' | 'watch';

export type Insight = {
  id: string;
  tone: Tone;
  /** The finding, short enough to read at a glance. */
  title: string;
  /** Why it is being said, in the numbers it came from. */
  detail: string;
};

const GROUPS = ['가슴', '등', '어깨', '하체', '팔', '복근'];

/** Enough history to say anything at all. Below this, silence is honest. */
export const MIN_WORKOUTS = 4;

function daysAgo(days: number, today: Date) {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
}

function within(workouts: WorkoutFact[], days: number, today: Date) {
  const since = daysAgo(days, today).getTime();
  return workouts.filter((w) => new Date(w.started_at).getTime() >= since);
}

export function insightsFor(workouts: WorkoutFact[], today = new Date(), girl?: string): Insight[] {
  if (workouts.length < MIN_WORKOUTS) return [];
  const say = voiceOf(girl).insight;
  const said = (id: string, tone: Tone, [title, detail]: [string, string]): Insight => ({ id, tone, title, detail });

  const found: Insight[] = [];
  const month = within(workouts, 30, today);
  const previousMonth = within(workouts, 60, today).filter((w) => !month.includes(w));

  // — what is going well —

  const streak = streakOf(workouts, today);
  if (streak >= 3) {
    found.push(said('streak', 'good', say.streak(streak)));
  }

  if (month.length > previousMonth.length && previousMonth.length > 0) {
    found.push(said('more-often', 'good', say.moreOften(month.length - previousMonth.length, month.length, previousMonth.length)));
  }

  const coverage = bestWeeklyCoverage(month);
  if (coverage >= 5) {
    found.push(said('balanced', 'good', say.balanced(coverage)));
  }

  // — what to look at —

  const recentGroups = new Set(month.flatMap((w) => w.groups));
  const neglected = GROUPS.filter((g) => !recentGroups.has(g));
  if (neglected.length > 0) {
    // Name three at most: a list of five is a wall of text, and capping the
    // rule instead would stay silent exactly when the gap is widest.
    const named = neglected.slice(0, 3).join(', ');
    const rest = neglected.length - 3;
    found.push(said('neglected', 'watch', say.neglected(named, rest)));
  }

  const counts = new Map<string, number>();
  for (const w of month) for (const g of w.groups) counts.set(g, (counts.get(g) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && total >= 8 && top[1] / total >= 0.5) {
    found.push(said('lopsided', 'watch', say.lopsided(top[0], Math.round((top[1] / total) * 100))));
  }

  const cardioMinutes = Math.round(month.reduce((s, w) => s + w.durationSec, 0) / 60);
  if (cardioMinutes < 30) {
    found.push(said('cardio', 'watch', say.cardio(cardioMinutes)));
  }

  const days = new Set(month.map((w) => localDayKey(new Date(w.started_at)))).size;
  if (days > 0 && days < 8) {
    found.push(said('sparse', 'watch', say.sparse(days)));
  }

  return found;
}

/** The one thing worth saying first, when there is only room for one. */
export function headline(workouts: WorkoutFact[], today = new Date(), girl?: string): Insight | null {
  const all = insightsFor(workouts, today, girl);
  return all.find((i) => i.tone === 'watch') ?? all[0] ?? null;
}
