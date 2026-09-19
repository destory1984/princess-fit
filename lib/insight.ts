import { localDayKey } from './format.ts';
import { bestWeeklyCoverage, streakOf, type WorkoutFact } from './gamification.ts';

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

export function insightsFor(workouts: WorkoutFact[], today = new Date()): Insight[] {
  if (workouts.length < MIN_WORKOUTS) return [];

  const found: Insight[] = [];
  const month = within(workouts, 30, today);
  const previousMonth = within(workouts, 60, today).filter((w) => !month.includes(w));

  // — what is going well —

  const streak = streakOf(workouts, today);
  if (streak >= 3) {
    found.push({
      id: 'streak',
      tone: 'good',
      title: `${streak}일 연속으로 하고 있어요`,
      detail: '이 흐름이 가장 크게 쌓여요. 오늘 쉬더라도 내일 다시 오면 돼요.',
    });
  }

  if (month.length > previousMonth.length && previousMonth.length > 0) {
    found.push({
      id: 'more-often',
      tone: 'good',
      title: `지난달보다 ${month.length - previousMonth.length}번 더 왔어요`,
      detail: `최근 30일 ${month.length}회 · 그 전 30일 ${previousMonth.length}회.`,
    });
  }

  const coverage = bestWeeklyCoverage(month);
  if (coverage >= 5) {
    found.push({
      id: 'balanced',
      tone: 'good',
      title: '한 주에 온몸을 고루 썼어요',
      detail: `한 주 안에 ${coverage}개 부위를 건드렸어요. 균형이 좋아요.`,
    });
  }

  // — what to look at —

  const recentGroups = new Set(month.flatMap((w) => w.groups));
  const neglected = GROUPS.filter((g) => !recentGroups.has(g));
  if (neglected.length > 0) {
    // Name three at most: a list of five is a wall of text, and capping the
    // rule instead would stay silent exactly when the gap is widest.
    const named = neglected.slice(0, 3).join(', ');
    const rest = neglected.length - 3;
    found.push({
      id: 'neglected',
      tone: 'watch',
      title:
        rest > 0
          ? `${named} 외 ${rest}개 부위를 한 달째 안 했어요`
          : `${named}은(는) 한 달째 안 했어요`,
      detail: '다음 운동에 하나만 끼워 넣어도 균형이 달라져요.',
    });
  }

  const counts = new Map<string, number>();
  for (const w of month) for (const g of w.groups) counts.set(g, (counts.get(g) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && total >= 8 && top[1] / total >= 0.5) {
    found.push({
      id: 'lopsided',
      tone: 'watch',
      title: `${top[0]}에 절반 넘게 몰려 있어요`,
      detail: `최근 30일 운동의 ${Math.round((top[1] / total) * 100)}%가 ${top[0]}이에요.`,
    });
  }

  const cardioMinutes = Math.round(month.reduce((s, w) => s + w.durationSec, 0) / 60);
  if (cardioMinutes < 30) {
    found.push({
      id: 'cardio',
      tone: 'watch',
      title: '유산소가 거의 없어요',
      detail:
        cardioMinutes === 0
          ? '한 달 동안 0분이에요. 운동 끝에 10분만 걸어도 달라져요.'
          : `한 달 동안 ${cardioMinutes}분이에요. 끝에 10분씩만 더해 보세요.`,
    });
  }

  const days = new Set(month.map((w) => localDayKey(new Date(w.started_at)))).size;
  if (days > 0 && days < 8) {
    found.push({
      id: 'sparse',
      tone: 'watch',
      title: '한 달에 여덟 번이 안 돼요',
      detail: `최근 30일 중 ${days}일 운동했어요. 주 2회만 지켜도 흐름이 생겨요.`,
    });
  }

  return found;
}

/** The one thing worth saying first, when there is only room for one. */
export function headline(workouts: WorkoutFact[], today = new Date()): Insight | null {
  const all = insightsFor(workouts, today);
  return all.find((i) => i.tone === 'watch') ?? all[0] ?? null;
}
