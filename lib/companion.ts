import { localDayKey } from './format.ts';
import { withParticle } from './korean.ts';

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
  started_at: string;
  worked: boolean;
  lifts: { exercise: string; kg: number }[];
};

export type MemoryKind =
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
  | 'first_friend';

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
  kind: 'first_garment' | 'first_lesson' | 'first_friend',
  detail: string,
  today = new Date()
): Memory {
  const line = {
    first_garment: `처음으로 옷을 사 준 날 — ${detail}`,
    first_lesson: `처음으로 수업을 마친 날 — ${detail}`,
    first_friend: `처음으로 친구가 생긴 날 — ${detail}`,
  }[kind];
  return { kind, day: localDayKey(today), line, detail };
}

/** What memoriesFrom found that is not written down yet. */
export function unrecorded(found: Memory[], known: Iterable<MemoryKind>) {
  const have = new Set(known);
  return found.filter((m) => !have.has(m.kind));
}

// What she says on the day itself. Said once, that day, and never again in
// these words — the next time it comes up it is as something that happened.
function freshLine(m: Memory): string {
  const d = m.detail ?? '';
  switch (m.kind) {
    case 'first_day':
      return '오늘 처음 뵈었네요. 앞으로 잘 부탁드려요.';
    case 'three_in_a_row':
      return '사흘 연속이에요. 저 오늘 좀 들떠 있어요.';
    case 'first_triple_digit':
      return `오늘 ${d}, 세 자리예요. 오늘 일은 오래 기억할 거예요.`;
    case 'day_30':
      return '오늘이 함께한 서른 번째 날이에요. 세어 보고 있었어요.';
    case 'day_100':
      return '백 번째 날이에요. 처음 오셨던 날이 생각나요.';
    case 'came_back':
      return '돌아오셨네요. 괜찮아요, 기다리고 있었어요.';
    case 'best_after_half_year':
      return `${d}, 지금까지 중에 제일 무거웠어요. 반년 넘게 해 온 게 여기 있네요.`;
    case 'stage_familiar':
      return '이제 좀 익숙해졌어요. 오시는 발소리도 알 것 같아요.';
    case 'stage_comfortable':
      return '이제 좀 편해졌어요. 앞으로는 잔소리도 할 거예요.';
    case 'stage_old':
      return '벌써 이렇게 됐네요. 이제 오시는 게 당연한 것 같아요.';
    case 'first_garment':
      return `${d}, 처음 사 주신 거예요. 아껴 입을게요.`;
    case 'first_lesson':
      return `${d} 수업을 다 마쳤어요. 처음으로 뭔가를 끝까지 해 봤어요.`;
    case 'first_friend':
      return `${d} 님이 친구가 됐네요. 방이 좀 덜 조용해진 것 같아요.`;
  }
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

// What she says when an old one comes back to her. Only the ones with
// something in them to say; 「서른 번째 날이었죠」 is a date, not a memory.
function recallLine(m: Memory, today: Date): string | null {
  const when = whenItWas(m.day, today);
  const d = m.detail ?? '';
  switch (m.kind) {
    case 'first_day':
      return `${when} 처음 오셨을 때, 저 사실 좀 긴장했었어요.`;
    case 'first_triple_digit':
      return `${when} ${d} 드시고 한참 웃으셨잖아요. 오늘도 그런 날이면 좋겠어요.`;
    case 'three_in_a_row':
      return `${when} 사흘 연속 오셨던 거, 아직 기억해요.`;
    case 'came_back':
      return `${when} 오래 쉬다 오셨을 때도 금방 제자리였잖아요.`;
    case 'best_after_half_year':
      return `${when} ${d} 드셨던 날, 저도 같이 숨 참고 봤어요.`;
    case 'first_garment':
      return `이 옷장에서 제일 먼저 생긴 게 ${withParticle(d, '이에요예요')}. 아직도 제일 좋아해요.`;
    case 'first_lesson':
      return `${when} ${d} 수업 다니던 게 생각나요. 그때 좀 힘들었어요.`;
    case 'first_friend':
      return `${d} 님은 요즘 잘 지내시려나요.`;
    default:
      return null;
  }
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
export function memoryLine(memories: Memory[], today = new Date()): string | null {
  const key = localDayKey(today);
  const fresh = memories.filter((m) => m.day === key);
  // Several can land on one day (a first day that is also a first 100kg);
  // the rarer one is the better news, and later in the list is rarer.
  if (fresh.length) return freshLine(fresh[fresh.length - 1]);

  const n = dayNumber(key);
  if (n % RECALL_EVERY !== 0) return null;
  const old = memories.filter((m) => n - dayNumber(m.day) >= 7);
  const said = old.map((m) => recallLine(m, today)).filter((l): l is string => l !== null);
  if (!said.length) return null;
  return said[Math.floor(n / RECALL_EVERY) % said.length];
}
