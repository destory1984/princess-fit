/**
 * Friends: the rules that do not need the database.
 *
 * The social side is built around the girl rather than the numbers. Friends
 * visit each other's rooms, send a little gold, and both earn a bonus on a day
 * they both trained. There is no leaderboard on purpose: this app has kept its
 * arithmetic honest — warm-ups do not count, an empty session earns nothing —
 * and a ranking is the one thing that pays people to inflate it.
 */
import { localDayKey } from './format.ts';
import { withParticle } from './korean.ts';

/** What can be sent. Few and small: a gift is a gesture, not a transfer. */
export const GIFT_AMOUNTS = [10, 30, 50] as const;

/** Each, for a day both trained. Must match claim_together in social.sql. */
export const TOGETHER_BONUS = 20;

/** The letters a code is made of — no 0/O, no 1/I/L, since it is read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** A code as typed — lower case, spaced, hyphenated — in the form it is stored. */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Whether a normalised code could be one: right length, right letters. */
export function isCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** A friend's name as a sentence can use it. */
export function displayName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed : '이름 없는 친구';
}

/**
 * How recently a friend trained, said as a day rather than a timestamp.
 * The day is all the list is ever told.
 */
export function lastTrainedLine(lastTrained: string | null, today = new Date()): string {
  if (!lastTrained) return '아직 운동 기록이 없어요';
  const then = localDayKey(new Date(lastTrained));
  const now = localDayKey(today);
  if (then === now) return '오늘 운동했어요';
  const days = Math.round(
    (Date.parse(`${now}T00:00:00`) - Date.parse(`${then}T00:00:00`)) / 86400000
  );
  if (days === 1) return '어제 운동했어요';
  return `${days}일 전에 운동했어요`;
}

export function trainedToday(lastTrained: string | null, today = new Date()): boolean {
  return !!lastTrained && localDayKey(new Date(lastTrained)) === localDayKey(today);
}

/** The Monday of the week a day falls in, as a day key. */
function weekOf(day: Date): string {
  const monday = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDayKey(monday);
}

/**
 * How many weeks in a row two friends have trained on the same day at least
 * once, ending this week — or last week, since this one is not over.
 *
 * Counted in weeks, not days. Nobody trains every day and nobody should: a
 * run that snapped on every rest day would punish exactly the people doing it
 * properly. A week with one shared session keeps it going.
 */
export function togetherStreak(days: string[], today = new Date()): number {
  const weeks = new Set(days.map((d) => weekOf(new Date(`${d}T12:00:00`))));
  const cursor = new Date(`${weekOf(today)}T12:00:00`);
  if (!weeks.has(weekOf(cursor))) cursor.setDate(cursor.getDate() - 7);
  let run = 0;
  while (weeks.has(weekOf(cursor))) {
    run += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return run;
}

/** The run as a line, or null when it is too short to be worth a word. */
export function togetherLine(streak: number): string | null {
  return streak >= 2 ? `함께 ${streak}주째` : null;
}

export type ArrivedGift = { kind: 'gift' | 'together'; amount: number; from_name: string };

/**
 * What arrived, one line per friend and kind, in the order it came.
 * Two gifts from the same friend on different days read as one line with
 * the sum — nobody wants 「민수가 10G를 보냈어요」 three times in a row.
 */
export function arrivedLines(gifts: ArrivedGift[]): string[] {
  const merged = new Map<string, ArrivedGift>();
  for (const g of gifts) {
    const key = `${g.kind}:${g.from_name}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, amount: prev.amount + g.amount } : { ...g });
  }
  return [...merged.values()].map((g) => {
    const who = displayName(g.from_name);
    return g.kind === 'together'
      ? `${withParticle(who, '와과')} 같은 날 운동했어요 +${g.amount}G`
      : `${withParticle(who, '이가')} ${g.amount}G를 보냈어요`;
  });
}

export function arrivedTotal(gifts: { amount: number }[]): number {
  return gifts.reduce((sum, g) => sum + g.amount, 0);
}
