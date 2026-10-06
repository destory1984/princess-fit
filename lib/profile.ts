import { onRack } from './weight.ts';

/**
 * Who is training: the three things the ready-made routines and the first
 * weight on an empty bar are fitted to (2026-10-06).
 *
 * Asked for by the owner in these words: 「남/여/몸무게/ 초중급」. Until then
 * every account was offered the same six routines and started every exercise
 * at 0kg, whoever they were.
 *
 * Each of the three may be left unsaid. Nothing here guesses: with no answer,
 * the routines are the ones everyone used to get and no weight is offered.
 */
export type Sex = 'female' | 'male';
export type Level = 'beginner' | 'intermediate';

export const SEXES: { id: Sex; label: string }[] = [
  { id: 'female', label: '여성' },
  { id: 'male', label: '남성' },
];

export const LEVELS: { id: Level; label: string; detail: string }[] = [
  { id: 'beginner', label: '처음이에요', detail: '기구와 맨몸 위주로, 무리 없는 횟수로' },
  { id: 'intermediate', label: '해 봤어요', detail: '바벨을 쓰는 종목으로, 더 무겁게' },
];

export const DEFAULT_LEVEL: Level = 'beginner';

export function sexOf(stored: string | null | undefined): Sex | null {
  return stored === 'female' || stored === 'male' ? stored : null;
}

export function levelOf(stored: string | null | undefined): Level {
  return stored === 'intermediate' ? 'intermediate' : DEFAULT_LEVEL;
}

/** A body weight someone could have, or nothing. Typos (7kg, 700kg) are nothing. */
export const MIN_BODY_KG = 30;
export const MAX_BODY_KG = 200;

export function bodyKgOf(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= MIN_BODY_KG && value <= MAX_BODY_KG ? value : null;
}

/**
 * What a first working set of about twelve might weigh, as a share of body
 * weight, for someone new to the movement. Barbell and machine numbers are the
 * whole load; dumbbell numbers are one hand.
 *
 * Deliberately low. The cost of starting too light is one easy set and a
 * 「더 올려 보세요」 next time (lib/progress.ts); the cost of starting too heavy
 * is a bad first day. Only movements listed here are offered a weight — the
 * rest start empty, as they always did, rather than borrowing a number from a
 * movement that happens to use the same bar.
 */
const SHARE: Record<string, { share: number; lower: boolean; hand?: boolean }> = {
  스쿼트: { share: 0.45, lower: true },
  데드리프트: { share: 0.55, lower: true },
  '루마니안 데드리프트': { share: 0.4, lower: true },
  '힙 쓰러스트': { share: 0.5, lower: true },
  '레그 프레스': { share: 0.8, lower: true },
  '레그 익스텐션': { share: 0.25, lower: true },
  '레그 컬': { share: 0.2, lower: true },
  벤치프레스: { share: 0.35, lower: false },
  '오버헤드 프레스': { share: 0.25, lower: false },
  '바벨 로우': { share: 0.3, lower: false },
  '랫 풀다운': { share: 0.35, lower: false },
  '시티드 로우': { share: 0.35, lower: false },
  '체스트 프레스 머신': { share: 0.3, lower: false },
  '덤벨 프레스': { share: 0.1, lower: false, hand: true },
  '덤벨 숄더 프레스': { share: 0.07, lower: false, hand: true },
  '덤벨 컬': { share: 0.06, lower: false, hand: true },
  '사이드 레터럴 레이즈': { share: 0.03, lower: false, hand: true },
  '불가리안 스플릿 스쿼트': { share: 0.08, lower: true, hand: true },
};

// The gap is wider above the waist than below it. From strength-standard
// tables, rounded down: these start someone, they do not rank them.
const FEMALE = { upper: 0.55, lower: 0.75 };
const INTERMEDIATE = 1.4;

/** An empty bar. A barbell movement cannot start below it. */
const BAR_KG = 20;
const LIGHT_BAR_KG = 15;
const BARBELL = new Set([
  '스쿼트',
  '데드리프트',
  '루마니안 데드리프트',
  '힙 쓰러스트',
  '벤치프레스',
  '오버헤드 프레스',
  '바벨 로우',
]);

export type Who = { sex: Sex | null; level: Level; bodyKg: number | null };

/**
 * A weight to put on a movement nobody has a record of yet, or null when there
 * is nothing honest to say: no body weight, no sex, or a movement not on the
 * list. Snapped to what a rack holds.
 */
export function startWeight(exerciseName: string, who: Who): number | null {
  const row = SHARE[exerciseName];
  const body = bodyKgOf(who.bodyKg);
  if (!row || body === null || who.sex === null) return null;

  let kg = body * row.share;
  if (who.sex === 'female') kg *= row.lower ? FEMALE.lower : FEMALE.upper;
  if (who.level === 'intermediate') kg *= INTERMEDIATE;

  if (BARBELL.has(exerciseName)) {
    const floor = who.sex === 'female' ? LIGHT_BAR_KG : BAR_KG;
    kg = Math.max(floor, kg);
  } else {
    kg = Math.max(row.hand ? 2 : 5, kg);
  }
  // Down, never up: the number is a place to begin from.
  const snapped = onRack(Math.floor(kg));
  return snapped > 0 ? snapped : null;
}

/** 「한 손에 6kg」 for dumbbells, since a pair is easy to read as the total. */
export function isPerHand(exerciseName: string) {
  return SHARE[exerciseName]?.hand === true;
}

/**
 * Whether someone who said they were new has trained enough to be offered the
 * heavier routines: two dozen real sessions spread over at least eight weeks.
 *
 * Both, because either alone is easy to reach without being ready — twenty-four
 * sessions in a keen first month, or eight weeks of turning up twice. Offered,
 * never switched: the level is theirs to change.
 */
export const LEVEL_UP_SESSIONS = 24;
export const LEVEL_UP_WEEKS = 8;

export function levelUpDue(
  level: Level,
  sessions: { started_at: string }[],
  today = new Date()
): boolean {
  if (level !== 'beginner' || sessions.length < LEVEL_UP_SESSIONS) return false;
  const first = Math.min(...sessions.map((s) => new Date(s.started_at).getTime()));
  const weeks = (today.getTime() - first) / (7 * 24 * 60 * 60 * 1000);
  return weeks >= LEVEL_UP_WEEKS;
}
