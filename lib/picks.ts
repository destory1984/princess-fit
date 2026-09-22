import { localDayKey } from './format.ts';

/**
 * Who was here, and when. See docs/relationship.md §2–3.
 *
 * Every time a girl is chosen a row is kept: which girl, from when. From that
 * one list the app can tell who was there on any day — so closeness is
 * counted per girl, a diary is in the right hand, and the one who was left
 * knows when you come back.
 *
 * Everything before the first row belongs to the first girl chosen. Nobody
 * logged who was there before the list existed, and the girl picked now is
 * the least surprising answer.
 */

export type Pick = { girl: string; picked_at: string };

function sorted(picks: Pick[]) {
  return picks.slice().sort((a, b) => a.picked_at.localeCompare(b.picked_at));
}

/** Who was chosen at this moment, or null when nobody ever was. */
export function whoWasThere(picks: Pick[], at: string): string | null {
  const list = sorted(picks);
  if (!list.length) return null;
  let who = list[0].girl;
  for (const p of list) {
    if (p.picked_at <= at) who = p.girl;
    else break;
  }
  return who;
}

/** The things that happened while she was the one here. */
export function whileShe<T extends { started_at: string }>(
  girl: string,
  picks: Pick[],
  items: T[]
): T[] {
  if (!picks.length) return items;
  return items.filter((i) => whoWasThere(picks, i.started_at) === girl);
}

function dayNumber(key: string) {
  return Math.round(new Date(`${key}T00:00:00`).getTime() / 86_400_000);
}

export type Return = {
  /** Days between being left and being chosen again. */
  away: number;
  /** Who was chosen in between — the last of them, if several. */
  other: string;
  /** The day she was chosen again. */
  on: string;
};

/**
 * Whether she was chosen again after someone else was, and when. Only her
 * latest return: an old one is history, not news.
 */
export function lastReturn(girl: string, picks: Pick[]): Return | null {
  const list = sorted(picks);
  const last = list.length - 1;
  if (last < 1 || list[last].girl !== girl) return null;
  // Walk back past the others to the pick of hers before them.
  let i = last - 1;
  let other: string | null = null;
  while (i >= 0 && list[i].girl !== girl) {
    other ??= list[i].girl;
    i--;
  }
  if (i < 0 || !other) return null;
  const leftOn = localDayKey(new Date(list[i + 1].picked_at));
  const on = localDayKey(new Date(list[last].picked_at));
  return { away: Math.max(0, dayNumber(on) - dayNumber(leftOn)), other, on };
}

/** How long a sulk lasts at most, if nothing is done about it. */
export const SULK_DAYS = 2;

export type Sulk = { reason: 'returned' | 'fickle'; other: string | null; away: number };

/**
 * Whether she is sulking today, and why.
 *
 * Only for something done in the app to her: being left and come back to, or
 * being picked and dropped more than twice in a week. Never for time away
 * from training — that is punished enough by hunger and rags, and a sulk
 * waiting for someone who was ill would only keep them from coming back.
 *
 * It ends with a workout or a gift after it began, or on its own after
 * SULK_DAYS. The caller passes those as days: `trainedDays` and `giftDays`
 * are local YYYY-MM-DD keys.
 */
export function sulkOf(
  girl: string,
  picks: Pick[],
  trainedDays: Iterable<string>,
  giftDays: Iterable<string>,
  today = new Date()
): Sulk | null {
  const key = localDayKey(today);
  const made = (from: string) => {
    for (const d of trainedDays) if (d >= from && d <= key) return true;
    for (const d of giftDays) if (d >= from && d <= key) return true;
    return false;
  };
  const within = (from: string) => dayNumber(key) - dayNumber(from) < SULK_DAYS;

  const back = lastReturn(girl, picks);
  // A day away is not being left; she barely noticed.
  if (back && back.away >= 1 && within(back.on) && !made(back.on)) {
    return { reason: 'returned', other: back.other, away: back.away };
  }

  // Picked and dropped over and over: the latest girl feels like the next
  // one to be dropped.
  const week = sorted(picks).filter((p) => dayNumber(key) - dayNumber(localDayKey(new Date(p.picked_at))) < 7);
  const latest = week[week.length - 1];
  if (latest?.girl === girl && week.length > 3) {
    const on = localDayKey(new Date(latest.picked_at));
    if (within(on) && !made(on)) return { reason: 'fickle', other: null, away: 0 };
  }
  return null;
}
