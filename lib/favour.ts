import { localDayKey } from './format.ts';
import { isEmptyWorkout, type WorkoutFact } from './gamification.ts';
import { voiceOf } from './voices.ts';

/**
 * 「이번 주 부탁」: one small thing she asks of the week. See docs/festival.md.
 *
 * The festival gives the month a goal and a workout gives the day one; the
 * week had nothing. Each girl asks for what she keeps an eye on anyway
 * (lib/notice.ts) — 리나 for the body's sake, 피아 for a number to beat, 유키
 * for the gap — so the favour is one more way the three are three people.
 *
 * Every favour only goes up. Nothing done in the week can make it fail, so
 * there is no moment of being told it is too late; it is simply met or not
 * by Sunday. And it is fixed from what came before the week, so it does not
 * move under you while you work at it.
 */

export type FavourKind =
  | 'twice'
  | 'cardio'
  | 'light'
  | 'more_days'
  | 'sets'
  | 'best_session'
  | 'neglected'
  | 'goal'
  | 'coverage';

/** What each girl asks for, in the order she comes round to them. */
export const FAVOURS_OF: Record<string, FavourKind[]> = {
  geumhwa: ['twice', 'cardio', 'light'],
  dohwa: ['more_days', 'sets', 'best_session'],
  seora: ['neglected', 'goal', 'coverage'],
};

const GROUPS = ['가슴', '등', '어깨', '하체', '팔', '복근'];

export type Favour = {
  kind: FavourKind;
  /** The Monday of the week it is for, YYYY-MM-DD. */
  week: string;
  target: number;
  /** For 유키's gap: which part. */
  group: string | null;
  now: number;
  done: boolean;
  /** Her words asking for it. */
  ask: string;
  /** How far along, in a few plain words: 「12/20분」. */
  progress: string;
};

export function weekStart(d: Date): Date {
  const m = new Date(d);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}

function real(facts: WorkoutFact[]) {
  return facts.filter((f) => !isEmptyWorkout(f));
}

function between(facts: WorkoutFact[], from: Date, to: Date) {
  return facts.filter((f) => {
    const t = new Date(f.started_at).getTime();
    return t >= from.getTime() && t < to.getTime();
  });
}

function dayCount(facts: WorkoutFact[]) {
  return new Set(facts.map((f) => localDayKey(new Date(f.started_at)))).size;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

type Asked = { kind: FavourKind; target: number; group: string | null };

/** What the history before `monday` makes of each kind, or null if it cannot be asked yet. */
function shape(kind: FavourKind, before: WorkoutFact[], monday: Date, goal: number): Asked | null {
  const lastWeek = between(before, addDays(monday, -7), monday);
  switch (kind) {
    case 'twice':
      return { kind, target: 2, group: null };
    case 'cardio':
      return { kind, target: 20, group: null };
    case 'light':
      return { kind, target: 1, group: null };
    case 'more_days':
      return { kind, target: Math.min(5, Math.max(2, dayCount(lastWeek) + 1)), group: null };
    case 'sets': {
      const sets = lastWeek.reduce((s, f) => s + f.doneSets, 0);
      const target = sets ? Math.round((sets * 1.1) / 5) * 5 : 30;
      return { kind, target: Math.min(150, Math.max(30, target)), group: null };
    }
    case 'best_session': {
      const month = between(before, addDays(monday, -28), monday);
      const best = Math.max(0, ...month.map((f) => f.volume));
      if (best === 0) return null;
      return { kind, target: Math.floor(best / 100) * 100 + 100, group: null };
    }
    case 'neglected': {
      if (!before.length) return null;
      const last = new Map<string, string>();
      for (const f of before) {
        const day = localDayKey(new Date(f.started_at));
        for (const g of f.groups) if (!last.has(g) || last.get(g)! < day) last.set(g, day);
      }
      // Never trained sorts before any day, which is right: it is the
      // longest left alone of all.
      const group = [...GROUPS].sort((a, b) => (last.get(a) ?? '').localeCompare(last.get(b) ?? ''))[0];
      return { kind, target: 1, group };
    }
    case 'goal':
      return { kind, target: Math.max(1, Math.min(7, goal)), group: null };
    case 'coverage':
      return { kind, target: 4, group: null };
  }
}

function measure(asked: Asked, week: WorkoutFact[]): number {
  switch (asked.kind) {
    case 'twice':
    case 'more_days':
    case 'goal':
      return dayCount(week);
    case 'cardio':
      return Math.floor(week.reduce((s, f) => s + f.durationSec, 0) / 60);
    case 'light':
      return week.some((f) => f.doneSets > 0 && f.doneSets <= 10) ? 1 : 0;
    case 'sets':
      return week.reduce((s, f) => s + f.doneSets, 0);
    case 'best_session':
      return Math.max(0, ...week.map((f) => f.volume));
    case 'neglected':
      return week.some((f) => f.groups.includes(asked.group!)) ? 1 : 0;
    case 'coverage':
      return new Set(week.flatMap((f) => f.groups).filter((g) => GROUPS.includes(g))).size;
  }
}

function progressOf(a: Asked, now: number): string {
  switch (a.kind) {
    case 'twice':
    case 'more_days':
    case 'goal':
      return `${Math.min(now, a.target)}/${a.target}일`;
    case 'cardio':
      return `${Math.min(now, a.target)}/${a.target}분`;
    case 'sets':
      return `${Math.min(now, a.target)}/${a.target}세트`;
    case 'best_session':
      return `최고 ${now.toLocaleString()}/${a.target.toLocaleString()}kg`;
    case 'coverage':
      return `${Math.min(now, a.target)}/${a.target}부위`;
    case 'light':
    case 'neglected':
      return now >= a.target ? '했어요' : '아직';
  }
}

/** Which week this is, counted from a fixed Monday, to take turns by. */
function weekNumber(monday: Date) {
  return Math.round((monday.getTime() - new Date(2024, 0, 1).getTime()) / (7 * 86_400_000));
}

/**
 * Her favour for the week `today` falls in, and how far it has got.
 * `until` stops the count early — a festival on Saturday does not see Sunday.
 */
export function favourFor(girl: string, facts: WorkoutFact[], today: Date, weeklyGoal: number, until?: Date): Favour {
  const monday = weekStart(today);
  const done = real(facts);
  const before = done.filter((f) => new Date(f.started_at) < monday);
  const kinds = FAVOURS_OF[girl] ?? FAVOURS_OF.geumhwa;
  const possible = kinds.map((k) => shape(k, before, monday, weeklyGoal)).filter((a): a is Asked => a !== null);
  const asked = possible[weekNumber(monday) % possible.length];

  const end = until && until < addDays(monday, 7) ? until : addDays(monday, 7);
  const now = measure(asked, between(done, monday, end));
  const said = voiceOf(girl).favour.ask[asked.kind] ?? voiceOf(undefined).favour.ask[asked.kind]!;
  return {
    kind: asked.kind,
    week: localDayKey(monday),
    target: asked.target,
    group: asked.group,
    now,
    done: now >= asked.target,
    ask: said(asked.target.toLocaleString(), asked.group ?? ''),
    progress: progressOf(asked, now),
  };
}

/**
 * How many weeks' favours were met between two festivals — what she takes
 * into the second with her. A week belongs to the festival after its Monday,
 * so every week counts towards exactly one; `after` is the day of the one
 * before, and counting stops at the end of `day`.
 *
 * Each week is asked by whoever was there at its start (`girlAt`, given the
 * Monday as an ISO string), because it was her favour that was met, not
 * whoever happens to be here on the day.
 */
export function favoursMet(
  facts: WorkoutFact[],
  after: Date,
  day: Date,
  girlAt: (mondayIso: string) => string | undefined,
  weeklyGoal: number
): number {
  const end = addDays(new Date(day.getFullYear(), day.getMonth(), day.getDate()), 1);
  let monday = addDays(weekStart(after), 7);
  let met = 0;
  while (monday < end) {
    const girl = girlAt(monday.toISOString()) ?? 'geumhwa';
    if (favourFor(girl, facts, monday, weeklyGoal, end).done) met += 1;
    monday = addDays(monday, 7);
  }
  return met;
}
