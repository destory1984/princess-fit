import { localDayKey } from './format.ts';
import { withParticle } from './korean.ts';
import { voiceOf } from './voices.ts';

/**
 * How well she knows you, and what she remembers. See docs/companion.md.
 *
 * Gold and levels already measure how much you lifted. This measures how long
 * you have kept coming: the days with a workout in them, counted once each.
 * The one who stayed gets closer, not the one who lifted most.
 */

export type Stage = 'new' | 'familiar' | 'comfortable' | 'old';

/** The day each stage begins, counted in days together. */
const STAGE_FROM: [Stage, number][] = [
  ['old', 101],
  ['comfortable', 31],
  ['familiar', 8],
  ['new', 0],
];

/** How the 「함께한 날들」 screen names each stage. */
export const STAGE_NAME: Record<Stage, string> = {
  new: '서먹한 사이',
  familiar: '익숙한 사이',
  comfortable: '편안한 사이',
  old: '오래된 사이',
};

export function stageOf(daysTogether: number): Stage {
  return STAGE_FROM.find(([, from]) => daysTogether >= from)![0];
}

/**
 * One session as the memories need it: when, whether anything was done, and
 * the heaviest working set of each exercise. Warm-ups are left out by the
 * caller, as they are from gold — an empty bar is not a first 100kg.
 */
export type Session = {
  /** The workout's id, when read from the database. */
  id?: string;
  started_at: string;
  worked: boolean;
  lifts: { exercise: string; kg: number }[];
};

/** The memories there is one of, ever — each has its own lines in every voice. */
export type OnceKind =
  | 'first_day'
  | 'three_in_a_row'
  | 'first_triple_digit'
  | 'day_30'
  | 'day_100'
  | 'came_back'
  | 'best_after_half_year'
  | 'stage_familiar'
  | 'stage_comfortable'
  | 'stage_old'
  | 'first_garment'
  | 'first_lesson'
  | 'first_friend'
  | 'first_sulk'
  | 'first_makeup'
  | 'first_win';

/**
 * A gift is remembered by what it was — `gift:<item id>` — so each thing
 * given is its own day, and the unique key still stops one being written twice.
 */
export type GiftKind = `gift:${string}`;

/** A month's festival (lib/festival.ts), by its YYYY-MM: one each, ever. */
export type FestivalKind = `festival:${string}`;

export type MemoryKind = OnceKind | GiftKind | FestivalKind;

export function isGift(kind: MemoryKind): kind is GiftKind {
  return kind.startsWith('gift:');
}

export function isFestival(kind: MemoryKind): kind is FestivalKind {
  return kind.startsWith('festival:');
}

/**
 * What she needs from a festival memory to speak of it. Read here rather
 * than through lib/festival.ts, which reads this file — the detail is the
 * judged result as JSON, and a malformed one is simply not spoken of.
 */
function festivalOf(detail: string | null): { contestName: string; place: 1 | 2 | 3 | 4; winner: string } | null {
  try {
    const r = JSON.parse(detail ?? '');
    if (typeof r?.contestName !== 'string' || ![1, 2, 3, 4].includes(r.place)) return null;
    return { contestName: r.contestName, place: r.place, winner: r.entries?.[0]?.name ?? '' };
  } catch {
    return null;
  }
}

/** Her words for one memory, on the day it happened, or null if she has none. */
function freshLine(m: Memory, girl?: string): string | null {
  const voice = voiceOf(girl);
  if (isGift(m.kind)) return voice.gift.fresh(m.detail ?? '');
  if (isFestival(m.kind)) {
    const f = festivalOf(m.detail);
    return f ? voice.festival.place[f.place](f.contestName, f.winner) : null;
  }
  return voice.fresh[m.kind](m.detail ?? '');
}

function recallLine(m: Memory, when: string, girl?: string): string | null {
  const voice = voiceOf(girl);
  if (isGift(m.kind)) return voice.gift.recall(when, m.detail ?? '');
  if (isFestival(m.kind)) {
    const f = festivalOf(m.detail);
    return f ? voice.festival.recall(when, f.contestName, f.place) : null;
  }
  return voice.recall[m.kind]?.(when, m.detail ?? '') ?? null;
}

export type Memory = {
  kind: MemoryKind;
  /** Local YYYY-MM-DD. */
  day: string;
  /** What the 「함께한 날들」 screen shows. */
  line: string;
  /** The particular thing — a lift, a dress, a name — for her to say back. */
  detail: string | null;
};

/** Days away before coming back is worth remembering. */
export const LONG_AWAY_DAYS = 14;
/** How long you must have been at it before a new best counts as that memory. */
const HALF_YEAR_DAYS = 182;

function dayNumber(key: string) {
  return Math.round(new Date(`${key}T00:00:00`).getTime() / 86_400_000);
}

/** The distinct days with something done in them, oldest first. */
function workedDays(sessions: Session[]) {
  return [...new Set(sessions.filter((s) => s.worked).map((s) => localDayKey(new Date(s.started_at))))].sort();
}

export function daysTogether(sessions: Session[]) {
  return workedDays(sessions).length;
}

const kg = (n: number) => `${Math.round(n * 10) / 10}kg`;

/**
 * Every memory the history holds, each at the first day it happened.
 *
 * Read from the whole history rather than watched for as it happens, so the
 * first run after this ships finds what was already there, with its real
 * dates — and so a workout written down after the fact lands on its own day.
 */
export function memoriesFrom(sessions: Session[]): Memory[] {
  const found = new Map<MemoryKind, Memory>();
  const note = (kind: MemoryKind, day: string, line: string, detail: string | null = null) => {
    if (!found.has(kind)) found.set(kind, { kind, day, line, detail });
  };

  const days = workedDays(sessions);
  days.forEach((day, i) => {
    const count = i + 1;
    if (count === 1) note('first_day', day, '처음 함께한 날');
    if (count === 8) note('stage_familiar', day, '서로 조금 익숙해진 날');
    if (count === 30) note('day_30', day, '함께한 지 서른 번째 날');
    if (count === 31) note('stage_comfortable', day, '서로 편해진 날');
    if (count === 100) note('day_100', day, '함께한 지 백 번째 날');
    if (count === 101) note('stage_old', day, '오래된 사이가 된 날');

    if (i >= 2 && dayNumber(day) - dayNumber(days[i - 2]) === 2) {
      note('three_in_a_row', day, '처음으로 사흘 연속 운동한 날');
    }
    if (i >= 1) {
      const away = dayNumber(day) - dayNumber(days[i - 1]);
      if (away >= LONG_AWAY_DAYS) note('came_back', day, `${away}일 만에 돌아온 날`, `${away}일`);
    }
  });

  // Lifts, in the order they happened.
  const ordered = sessions
    .filter((s) => s.worked)
    .slice()
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  const first = days[0];
  const best = new Map<string, number>();
  for (const s of ordered) {
    const day = localDayKey(new Date(s.started_at));
    const heaviest = s.lifts.reduce<Session['lifts'][number] | null>(
      (top, l) => (!top || l.kg > top.kg ? l : top),
      null
    );
    if (heaviest && heaviest.kg >= 100) {
      const what = `${heaviest.exercise} ${kg(heaviest.kg)}`;
      note('first_triple_digit', day, `처음으로 ${what}을 든 날`, what);
    }
    for (const l of s.lifts) {
      const before = best.get(l.exercise);
      // A best only means something against earlier tries: the first time
      // an exercise is done is always its heaviest.
      if (
        before !== undefined &&
        l.kg > before &&
        first &&
        dayNumber(day) - dayNumber(first) >= HALF_YEAR_DAYS
      ) {
        const what = `${l.exercise} ${kg(l.kg)}`;
        note('best_after_half_year', day, `운동한 지 반년 넘어 ${withParticle(what, '으로로')} 최고 기록을 세운 날`, what);
      }
      best.set(l.exercise, Math.max(before ?? 0, l.kg));
    }
  }

  return [...found.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** A memory from something bought or made rather than lifted. */
export function eventMemory(
  kind: 'first_garment' | 'first_lesson' | 'first_friend' | 'first_sulk' | 'first_makeup' | 'first_win',
  detail: string,
  today = new Date()
): Memory {
  const line = {
    first_garment: `처음으로 옷을 사 준 날 — ${detail}`,
    first_lesson: `처음으로 수업을 마친 날 — ${detail}`,
    first_friend: `처음으로 친구가 생긴 날 — ${detail}`,
    first_sulk: '처음 토라진 날',
    first_makeup: '처음 화해한 날',
    first_win: `축제에서 처음 우승한 날 — ${detail}`,
  }[kind];
  return { kind, day: localDayKey(today), line, detail };
}

/**
 * The day something was given to her. The shop is where you give her things
 * now rather than a list to finish, so what builds up is the days you did.
 */
export function giftMemory(itemId: string, name: string, today = new Date()): Memory {
  return {
    kind: `gift:${itemId}`,
    day: localDayKey(today),
    line: `${withParticle(name, '을를')} 선물한 날`,
    detail: name,
  };
}

/** What memoriesFrom found that is not written down yet. */
export function unrecorded(found: Memory[], known: Iterable<MemoryKind>) {
  const have = new Set(known);
  return found.filter((m) => !have.has(m.kind));
}


/** 「얼마 전에」, 「석 달 전에」, 「작년 이맘때」 — how she would place it. */
export function whenItWas(day: string, today = new Date()) {
  const ago = dayNumber(localDayKey(today)) - dayNumber(day);
  if (ago < 21) return '얼마 전에';
  if (ago < 45) return '지난달에';
  if (ago >= 340 && ago <= 390) return '작년 이맘때';
  if (ago < 340) {
    const months = Math.round(ago / 30);
    const said = ['', '한', '두', '석', '넉', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한'][months];
    return `${said} 달 전에`;
  }
  return '오래전에';
}


/**
 * The day a month after `day`, as a key: the same date next month, or that
 * month's last day when it has no such date (the 31st → the 30th, or the 28th).
 */
function monthAfter(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(y, m + 1, 0).getDate();
  return localDayKey(new Date(y, m, Math.min(d, last)));
}

/**
 * What she says a month to the day after a gift, or null.
 *
 * The design asked whether a gift's month-day passing unmarked should make
 * her sulk, and settled that it should not: an app holding a date against
 * someone is pressure. She brings it up herself instead, once, and asks for
 * nothing (docs/relationship.md, 「여쭐 것」 3).
 *
 * Only the first month: a girl who marks every month of every ribbon is a
 * calendar. Several gifts on one day cannot happen (one a day), so there is
 * at most one to say.
 */
export function giftMonthLine(memories: Memory[], today = new Date(), girl?: string): string | null {
  const key = localDayKey(today);
  const gift = memories.find((m) => isGift(m.kind) && monthAfter(m.day) === key);
  return gift ? voiceOf(girl).gift.month(gift.detail ?? '') : null;
}

/** Roughly how often an old memory comes up: one day in this many. */
export const RECALL_EVERY = 6;

/**
 * Whatever she has to say from memory today, or null.
 *
 * A memory made today is said today, once — the day key picks it, so it is
 * the same line all day and a different one tomorrow. Older ones come up
 * only now and then: a girl who brings up your first 100kg every morning is
 * a notice board, the same trap lessonLine fell into.
 */
export function memoryLine(memories: Memory[], today = new Date(), girl?: string): string | null {
  const key = localDayKey(today);
  const fresh = memories.filter((m) => m.day === key);
  // Several can land on one day (a first day that is also a first 100kg);
  // the rarer one is the better news, and later in the list is rarer.
  if (fresh.length) {
    const said = freshLine(fresh[fresh.length - 1], girl);
    if (said) return said;
  }

  const n = dayNumber(key);
  if (n % RECALL_EVERY !== 0) return null;
  const old = memories.filter((m) => n - dayNumber(m.day) >= 7);
  const when = (m: Memory) => whenItWas(m.day, today);
  const said = old.flatMap((m) => {
    const line = recallLine(m, when(m), girl);
    return line ? [line] : [];
  });
  if (!said.length) return null;
  return said[Math.floor(n / RECALL_EVERY) % said.length];
}
