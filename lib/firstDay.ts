/**
 * The first day: the session that shows what this app is.
 *
 * Memories, sulking, the festival and the weekly favour all take weeks to
 * show themselves, and the person of the first day leaves before then
 * (docs/first-day.md). So the first finished session is walked once around
 * the whole loop — the work, the gold, the girl — where it would otherwise
 * end on a card of numbers.
 *
 * Nothing is inflated to do it. A new household starts with enough that one
 * real session reaches the cheapest gift, and a test holds that sum. The
 * design allowed a one-time top-up if it did not; it does, so there is none.
 */

import { STARTING_GOLD, workoutGold } from './economy.ts';
import { localDayKey } from './format.ts';
import { isEmptyWorkout, type WorkoutFact } from './gamification.ts';
import { GARMENTS } from './outfit.ts';
import { FURNITURE } from './room.ts';
import { ACCESSORIES } from './shop.ts';

export type FirstGift = { id: string; name: string; price: number };

/**
 * Whether this is the one session there has ever been.
 *
 * Counted over sessions with something in them, like everything else that
 * counts days. An account that imported a year of history has had its first
 * day somewhere else, and is not walked through this one.
 */
export function isFirstWorkout(facts: WorkoutFact[], workoutId: string) {
  const real = facts.filter((f) => !isEmptyWorkout(f));
  return real.length === 1 && real[0].id === workoutId;
}

/**
 * Whether anything was done on a day before this session's. A second session
 * on the very first day is not the first workout, but there is still no
 * yesterday for it to have beaten.
 */
export function hasEarlierDay(facts: WorkoutFact[], workoutId: string) {
  const mine = facts.find((f) => f.id === workoutId);
  if (!mine) return true;
  const day = localDayKey(new Date(mine.started_at));
  return facts.some(
    (f) => !isEmptyWorkout(f) && localDayKey(new Date(f.started_at)) < day
  );
}

/** The least expensive thing that can be given. Free pieces are not gifts. */
export function cheapestGift(): FirstGift {
  const all: FirstGift[] = [...GARMENTS, ...FURNITURE, ...ACCESSORIES]
    .filter((item) => item.price > 0)
    .map(({ id, name, price }) => ({ id, name, price }));
  return all.reduce((least, item) => (item.price < least.price ? item : least));
}

export type FirstDayStep =
  /** Not the first session, or nothing to offer. */
  | { step: 'none' }
  /** Enough gold and nothing given yet: the way to the shop. */
  | { step: 'invite'; gift: FirstGift }
  /** Given: she has it, and the card above shows her in it. */
  | { step: 'given' };

/**
 * Where the first day stands.
 *
 * Short of gold there is no invitation at all. Someone who spent the opening
 * purse on food before training has made a choice, and a button to a shop
 * where everything is refused would be the app pointing at it.
 */
export function firstDayStep(
  facts: WorkoutFact[],
  workoutId: string,
  gold: number,
  everGiven: boolean
): FirstDayStep {
  if (!isFirstWorkout(facts, workoutId)) return { step: 'none' };
  if (everGiven) return { step: 'given' };
  const gift = cheapestGift();
  return gold >= gift.price ? { step: 'invite', gift } : { step: 'none' };
}

/** What a new household holds after the smallest session that counts. */
export function goldAfterSmallestFirstSession() {
  const smallest: WorkoutFact = {
    id: 'first',
    started_at: '2026-01-01T00:00:00',
    groups: [],
    doneSets: 1,
    volume: 0,
    durationSec: 0,
    distanceKm: 0,
    cardioSec: 0,
  };
  return STARTING_GOLD + workoutGold(smallest);
}
