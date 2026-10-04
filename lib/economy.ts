import { localDayKey } from './format.ts';
import { isEmptyWorkout, type WorkoutFact } from './gamification.ts';
import { memoryLine, type Memory, type Stage } from './companion.ts';
import { insightsFor } from './insight.ts';
import { voiceOf } from './voices.ts';
import { noticeFor, type Seen } from './notice.ts';
import type { Sulk } from './picks.ts';
import { ADVISORS } from './advisors.ts';
import { daysLeft, isFinished, lessonById, type Enrolment } from './lessons.ts';

/**
 * The household ledger: what a workout earns, and what a day away costs.
 *
 * The numbers are set against two promises: any one gift is a week or two of
 * training, and a year of steady training (three sessions a week, 156 in
 * all) pays for every gift, her meals and a year of schooling besides.
 * Change one and the year drifts, so the shop tests re-derive both rather
 * than trusting a comment.
 */

export const GOLD_PER_WORKOUT = 75;
export const GOLD_PER_SET = 3;
/** Heavy days pay a little more, but not enough to make volume the whole game. */
export const GOLD_PER_200KG = 1;
export const GOLD_PER_CARDIO_MINUTE = 1;

/** Living costs, charged per day whether or not you show up. */
export const DAILY_UPKEEP = 2;

/** How fast she gets hungry and how fast her clothes wear, per day away. */
export const SATIETY_PER_DAY = 14;
export const ATTIRE_PER_DAY = 2;

export const FULL = 100;

export function workoutGold(w: WorkoutFact) {
  if (isEmptyWorkout(w)) return 0;
  return (
    GOLD_PER_WORKOUT +
    w.doneSets * GOLD_PER_SET +
    Math.floor(w.volume / 200) * GOLD_PER_200KG +
    Math.floor(w.durationSec / 60) * GOLD_PER_CARDIO_MINUTE
  );
}

export type Household = {
  gold: number;
  /** 0–100. Empty means she has been going hungry. */
  satiety: number;
  /** 0–100. Empty means her clothes are in rags. */
  attire: number;
  /** The last day already charged, as a local YYYY-MM-DD key. */
  settledOn: string;
};

/**
 * A purse to start with. Without it the first week is a trap: she gets hungry
 * from day one, and nothing can be bought until a workout has been finished
 * and banked. Enough for a few decent meals, not enough for a dress.
 */
export const STARTING_GOLD = 150;

export function newHousehold(today = new Date()): Household {
  return {
    gold: STARTING_GOLD,
    satiety: FULL,
    attire: FULL,
    settledOn: localDayKey(today),
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(FULL, value));
}

function daysBetween(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`).getTime();
  const to = new Date(`${toKey}T00:00:00`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * Bring the ledger up to today. Charging happens per elapsed day rather than
 * continuously, so the result is the same whether the app is opened once a day
 * or once a month.
 */
export function settle(house: Household, today = new Date()): Household {
  const todayKey = localDayKey(today);
  const days = daysBetween(house.settledOn, todayKey);
  if (days === 0) return house;

  return {
    gold: Math.max(0, house.gold - DAILY_UPKEEP * days),
    satiety: clamp(house.satiety - SATIETY_PER_DAY * days),
    attire: clamp(house.attire - ATTIRE_PER_DAY * days),
    settledOn: todayKey,
  };
}

/** A finished workout pays, and being seen doing well lifts her a little. */
export function afterWorkout(house: Household, w: WorkoutFact): Household {
  return {
    ...house,
    gold: house.gold + workoutGold(w),
    satiety: clamp(house.satiety + 4),
  };
}

/**
 * A day on your feet, which keeps her from going as hungry.
 *
 * Only satiety moves. Walking pays no gold — the shop is priced against a year
 * of steady training, and a second income would quietly pull that apart — and
 * it does not touch her clothes, which wear by the calendar rather than by
 * anything you do.
 */
export function afterWalk(house: Household, points: number): Household {
  if (points <= 0) return house;
  return { ...house, satiety: clamp(house.satiety + points) };
}

/**
 * How well she is doing, 0–1. Stats are shown scaled by this, so letting her go
 * hungry or ragged costs real ground rather than only looking sad.
 */
export function conditionFactor(house: Household) {
  const average = (house.satiety + house.attire) / 2 / FULL;
  // Never below 0.7: a bad stretch should sting, not erase a year of work.
  return 0.7 + 0.3 * average;
}

export type Mood = 'happy' | 'fine' | 'hungry' | 'shabby' | 'lonely';

/** What she is feeling most, which picks the line she sends. */
export function moodOf(house: Household, workouts: WorkoutFact[], today = new Date()): Mood {
  const lastDay = workouts.length
    ? Math.max(...workouts.map((w) => new Date(w.started_at).getTime()))
    : 0;
  // Null when she has never seen a session: there is no day to have been
  // away since, and missing someone takes having met them.
  const away = lastDay ? daysBetween(localDayKey(new Date(lastDay)), localDayKey(today)) : null;

  if (house.satiety <= 30) return 'hungry';
  if (house.attire <= 30) return 'shabby';
  if (away !== null && away >= 4) return 'lonely';
  if (house.satiety >= 70 && house.attire >= 70 && away !== null && away <= 1) return 'happy';
  return 'fine';
}

/**
 * One line from her, chosen by mood. The day key seeds the pick so the same day
 * always says the same thing — a message that changes on every render reads as
 * noise rather than as someone speaking.
 */
export function messageFor(mood: Mood, today = new Date(), stage: Stage = 'new', girl?: string) {
  const { mood: said } = voiceOf(girl);
  const lines = mood === 'hungry' || mood === 'shabby' ? said[mood] : said.byStage[stage][mood];
  const key = localDayKey(today);
  const seed = [...key].reduce((n, c) => n + c.charCodeAt(0), 0);
  return lines[seed % lines.length];
}


// What she says about the course she is on. Only on the days that are worth
// remarking on — the first, the last, and the one after — because a girl who
// mentions her dance class every single evening for a week is a notice board.
function lessonLine(lesson: Enrolment, today: Date, girl?: string): string | null {
  const taught = lessonById(lesson.lessonId);
  if (!taught) return null;

  const said = voiceOf(girl).lesson;
  const left = daysLeft(lesson, today);
  if (localDayKey(today) === lesson.startedOn) return said.starts(taught.name);
  if (left === 1) return said.lastDay(taught.name);
  if (left === 2) return said.twoLeft(taught.name);
  return null;
}

/**
 * The line she will have tomorrow, used to schedule the daily message today.
 * Projecting rather than reusing today's mood matters most at the boundary: a
 * girl who is fine this evening and hungry by tomorrow night should say the
 * hungry line, not the cheerful one.
 */
export function tomorrowsMessage(
  house: Household,
  workouts: WorkoutFact[],
  today = new Date(),
  lesson: Enrolment | null = null,
  bond: Bond | null = null,
  girl?: string,
  seen?: Omit<Seen, 'facts'>
) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const projected = settle(house, tomorrow);
  // A course that will have ended by tomorrow is not news tomorrow.
  const still = lesson && !isFinished(lesson, tomorrow) ? lesson : null;
  // Never sulks through a notification. A notification reaches into the
  // rest of someone's day, and 「왜 안 와요」 there is pressure, not charm.
  const calm = bond ? { ...bond, sulk: null, madeUp: false } : null;
  return dailyLine(projected, workouts, tomorrow, still, calm, girl, seen);
}

/** How long she has known you and what she remembers, as dailyLine needs it. */
export type Bond = {
  stage: Stage;
  memories: Memory[];
  /** Whether she is sulking today, and why (lib/picks.ts). */
  sulk?: Sulk | null;
  /** Whether a sulk ended today because of something you did. */
  madeUp?: boolean;
};

function daySeed(today: Date) {
  return [...localDayKey(today)].reduce((n, c) => n + c.charCodeAt(0), 0);
}

// A sulk, or its end. Before everything else, hunger included: a girl who is
// upset with you is not going to mention dinner.
function feelingLine(bond: Bond | null, today: Date, girl?: string): string | null {
  const say = voiceOf(girl).sulk;
  const pickOf = (lines: string[]) => lines[daySeed(today) % lines.length];
  if (bond?.madeUp) return pickOf(say.madeUp);
  if (!bond?.sulk) return null;
  if (bond.sulk.reason === 'fickle') return pickOf(say.fickle);
  const other = ADVISORS.find((a) => a.id === bond.sulk!.other)?.name ?? '다른 애';
  return pickOf(say.returned(other, bond.sulk.away));
}

/**
 * What she says the day after the only session there has been, or null.
 * Counted over sessions with something in them. An imported history has
 * many, so it never reads as a first day.
 */
function firstNightLine(workouts: WorkoutFact[], today: Date, girl?: string): string | null {
  const real = workouts.filter((w) => !isEmptyWorkout(w));
  if (real.length !== 1) return null;
  const [only] = real;
  if (daysBetween(localDayKey(new Date(only.started_at)), localDayKey(today)) !== 1) return null;
  const what = only.groups.length
    ? only.groups.join(', ')
    : only.durationSec > 0
      ? `유산소 ${Math.round(only.durationSec / 60)}분`
      : '운동';
  return voiceOf(girl).firstNight(only.doneSets > 0 ? `${what} ${only.doneSets}세트` : what);
}

/** The faces she has been drawn with: one for each mood, and one for a sulk. */
export type Face = Mood | 'sulky';

/**
 * The face beside what `dailyLine` says. The same order as the line, so the two
 * never disagree: a sulk shows before hunger does, and the day she comes round
 * she is glad of it whatever else is true.
 */
export function faceFor(
  house: Household,
  workouts: WorkoutFact[],
  bond: Bond | null = null,
  today = new Date()
): Face {
  if (bond?.madeUp) return 'happy';
  if (bond?.sulk) return 'sulky';
  return moodOf(house, workouts, today);
}

export type GiftKind = 'food' | 'clothes' | 'accessory' | 'furniture' | 'lesson';

/**
 * Her word of thanks. Seeded by the thing bought rather than random, so buying
 * the same item twice does not read as two different moods about it.
 */
export function thanksFor(kind: GiftKind, itemId: string, girl?: string) {
  const lines = voiceOf(girl).thanks[kind];
  const seed = [...itemId].reduce((n, c) => n + c.charCodeAt(0), 0);
  return lines[seed % lines.length];
}

/**
 * Her line for a given day: what she needs first, then what your training
 * needs.
 *
 * Hunger and rags come first because they are about her, and she is the one
 * speaking. Once she is comfortable she has attention to spare for the thing
 * the numbers noticed — which is how a companion differs from a dashboard.
 */
export function dailyLine(
  house: Household,
  workouts: WorkoutFact[],
  today = new Date(),
  lesson: Enrolment | null = null,
  bond: Bond | null = null,
  girl?: string,
  seen?: Omit<Seen, 'facts'>,
  festival: string | null = null
): string {
  const felt = feelingLine(bond, today, girl);
  if (felt) return felt;

  const mood = moodOf(house, workouts, today);
  const stage = bond?.stage ?? 'new';
  if (mood !== 'fine' && mood !== 'happy') return messageFor(mood, today, stage, girl);

  // Something she remembers. A memory made today is the news of the day and
  // goes before her schedule; an old one coming back is a passing thought and
  // waits behind what the numbers noticed.
  const remembered = bond ? memoryLine(bond.memories, today, girl) : null;
  const freshToday = bond?.memories.some((m) => m.day === localDayKey(today));
  if (remembered && freshToday) return remembered;

  // The festival, in the few days either side of it (lib/festival.ts
  // festivalTalk, worked out by the caller). Her own big day comes before
  // her classes and before what the numbers noticed.
  if (festival) return festival;

  // The day after the very first session: she points at what was recorded
  // (docs/first-day.md 4). Nothing she usually watches has a second point to
  // compare with yet, so without this the second day opens on a stock line —
  // and the second day is the one that decides whether there is a third.
  // Behind the festival, which is her own day and was settled to go first.
  const first = firstNightLine(workouts, today, girl);
  if (first) return first;

  // A course she is part-way through is the most concrete thing in her week,
  // and it only exists because gold was spent on it — so it should reach the
  // room rather than living on a shop shelf. It yields to hunger and to rags,
  // which are about her rather than about her schedule.
  if (lesson) {
    const word = lessonLine(lesson, today, girl);
    if (word) return word;
  }

  // What she, in particular, keeps an eye on. Each girl watches something
  // different (lib/notice.ts), which is most of what makes them three people.
  const noticed = noticeFor(girl, { ...seen, facts: workouts }, stage, today);
  if (noticed) return noticed;

  // The general reading of the numbers, for when she has nothing of her own.
  // Not for 유키: it is the same watch she already keeps, in a register she
  // would not use until you are comfortable with each other.
  if (girl !== 'seora') {
    const watch = insightsFor(workouts, today, girl).find((i) => i.tone === 'watch');
    if (watch) return `${watch.title}. ${watch.detail}`;
  }

  if (remembered) return remembered;
  return messageFor(mood, today, stage, girl);
}
