import { localDayKey } from './format.ts';
import { isEmptyWorkout, streakOf, type WorkoutFact } from './gamification.ts';
import { isGift, type Memory, type OnceKind } from './companion.ts';
import { voiceOf } from './voices.ts';
import { ADVISORS } from './advisors.ts';
import type { Sulk } from './picks.ts';
import type { Favour } from './favour.ts';

/**
 * Her diary: a line or two about each session, written the day it was paid.
 * See docs/relationship.md.
 *
 * Only what was recorded. She did not watch you lift — nothing in the app
 * can see a face or a knee — so the diary says what the numbers say and
 * guesses at the rest the way anyone reading a log would: 「바빴나 보다」, never
 * 「웃었다」. And the person is 「그 사람」, never a boyfriend: several people
 * use this app, and none of them should be told who they are.
 *
 * Written once and kept. Advice is asked again when the girl changes; a
 * diary is the opposite — last month's entry stays in the hand of the girl
 * who was there, which is how switching girls ends up in the story.
 */

export type DiaryInput = {
  today: WorkoutFact;
  /** Every other finished session, any order. Only the earlier ones are read. */
  history: WorkoutFact[];
  /** This session's heaviest working set per exercise. */
  lifts: { exercise: string; kg: number }[];
  /** The heaviest ever lifted on each exercise before this session. */
  bestBefore: Map<string, number>;
  /** Memories dated this session's day. */
  memories: Memory[];
  /**
   * The sulk she was in when this session began. A workout ends a sulk, so
   * this is the session that made it up — the one day the diary can say it.
   */
  sulk?: Sulk | null;
  /** The week's favour, when this is the session that met it (`favourMetBy`). */
  favour?: Pick<Favour, 'kind' | 'target' | 'group'> | null;
};

/** Which of the day's memories is the news, rarest first. */
const MEMORY_ORDER = [
  'first_day',
  'day_100',
  'best_after_half_year',
  'first_triple_digit',
  'day_30',
  'came_back',
  'three_in_a_row',
] as const satisfies readonly OnceKind[];

const GROUPS = ['가슴', '등', '어깨', '하체', '팔', '복근'];
const kg = (n: number) => `${Math.round(n * 10) / 10}kg`;

function dayNumber(key: string) {
  return Math.round(new Date(`${key}T00:00:00`).getTime() / 86_400_000);
}

/** The entry for one session, in her hand. Null for an empty session. */
export function diaryFor(input: DiaryInput, girl?: string): string | null {
  const { today, lifts, bestBefore, memories } = input;
  if (isEmptyWorkout(today)) return null;
  const write = voiceOf(girl).diary;
  const day = localDayKey(new Date(today.started_at));
  const before = input.history.filter(
    (w) => w.id !== today.id && w.started_at < today.started_at && !isEmptyWorkout(w)
  );

  // Something worth remembering happened today: that is the entry.
  for (const kind of MEMORY_ORDER) {
    const m = memories.find((x) => x.kind === kind);
    if (m) return write.memory[kind](m.detail ?? '');
  }

  // She was sulking until this session: what she kept to herself. Said
  // nowhere else — out loud she only says it is over.
  if (input.sulk) {
    if (input.sulk.reason === 'fickle') return write.sulked.fickle;
    const other = ADVISORS.find((a) => a.id === input.sulk!.other)?.name ?? '다른 애';
    return write.sulked.returned(other, input.sulk.away);
  }

  // The week's favour, met by this session. Once a week at most, so it goes
  // before a new best, which a beginner sets every time.
  if (input.favour) {
    const met = write.favour[input.favour.kind];
    if (met) return met(input.favour.target.toLocaleString(), input.favour.group ?? '');
  }

  // A new best, on something done before.
  const best = lifts
    .filter((l) => (bestBefore.get(l.exercise) ?? 0) > 0 && l.kg > bestBefore.get(l.exercise)!)
    .sort((a, b) => b.kg - a.kg)[0];
  if (best) return write.best(best.exercise, kg(best.kg));

  const gift = memories.find((m) => isGift(m.kind));
  if (gift) return write.gift(gift.detail ?? '');

  const streak = streakOf([...before, today], new Date(`${day}T12:00:00`));
  if (streak >= 3) return write.streak(streak);

  // A part left alone for a while, done today.
  for (const g of today.groups) {
    const last = before
      .filter((w) => w.groups.includes(g))
      .map((w) => dayNumber(localDayKey(new Date(w.started_at))));
    if (!last.length) continue;
    const gap = dayNumber(day) - Math.max(...last);
    if (gap >= 10 && GROUPS.includes(g)) return write.returned(g, gap);
  }

  const recent = before.slice().sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 8);
  if (recent.length >= 3) {
    const avgVolume = recent.reduce((s, w) => s + w.volume, 0) / recent.length;
    const avgSets = recent.reduce((s, w) => s + w.doneSets, 0) / recent.length;
    if (avgVolume > 0 && today.volume > avgVolume * 1.3) return write.heavy;
    if (avgSets > 0 && today.doneSets < avgSets * 0.6) return write.short;
  }

  const what = today.groups.length
    ? today.groups.join(', ')
    : today.durationSec > 0
      ? `유산소 ${Math.round(today.durationSec / 60)}분`
      : '운동';
  return write.plain(today.doneSets > 0 ? `${what} ${today.doneSets}세트` : what);
}
