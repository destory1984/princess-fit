import { localDayKey } from './format.ts';
import { workoutXp, type WorkoutFact } from './gamification.ts';

/**
 * The household ledger: what a workout earns, and what a day away costs.
 *
 * The numbers are set against one target — a year of steady training (three
 * sessions a week, 156 in all) should pay for her meals, the full wardrobe,
 * and a year of schooling besides. Change one and the year drifts, so the
 * shop tests re-derive it rather than trusting a comment.
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
  const away = lastDay ? daysBetween(localDayKey(new Date(lastDay)), localDayKey(today)) : 99;

  if (house.satiety <= 30) return 'hungry';
  if (house.attire <= 30) return 'shabby';
  if (away >= 4) return 'lonely';
  if (house.satiety >= 70 && house.attire >= 70 && away <= 1) return 'happy';
  return 'fine';
}

// She hints rather than asks. A character who states her needs plainly reads
// as a meter with a face; one who glances at the kitchen reads as a person.
const LINES: Record<Mood, string[]> = {
  happy: ['오늘도 와 주셨네요. 기분이 좋아요.', '요즘은 뭐든 될 것 같은 기분이에요.'],
  fine: ['오늘은 뭘 하실 건가요?', '기다리고 있었어요.'],
  hungry: ['오늘 저녁은 뭘까, 그 생각만 했어요.', '자꾸 부엌 쪽을 보게 되네요.'],
  shabby: ['소매가 좀 해졌죠? 아직은 괜찮아요.', '오늘따라 거울을 오래 보게 되네요.'],
  lonely: ['오늘은 오시려나 했어요.', '문 쪽을 몇 번이나 봤는지 몰라요.'],
};

/**
 * One line from her, chosen by mood. The day key seeds the pick so the same day
 * always says the same thing — a message that changes on every render reads as
 * noise rather than as someone speaking.
 */
export function messageFor(mood: Mood, today = new Date()) {
  const lines = LINES[mood];
  const key = localDayKey(today);
  const seed = [...key].reduce((n, c) => n + c.charCodeAt(0), 0);
  return lines[seed % lines.length];
}

/** XP and gold move together; kept here so callers pay one visit. */
export function rewardsFor(w: WorkoutFact) {
  return { xp: workoutXp(w), gold: workoutGold(w) };
}

/**
 * The line she will have tomorrow, used to schedule the daily message today.
 * Projecting rather than reusing today's mood matters most at the boundary: a
 * girl who is fine this evening and hungry by tomorrow night should say the
 * hungry line, not the cheerful one.
 */
export function tomorrowsMessage(house: Household, workouts: WorkoutFact[], today = new Date()) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const projected = settle(house, tomorrow);
  return messageFor(moodOf(projected, workouts, tomorrow), tomorrow);
}
