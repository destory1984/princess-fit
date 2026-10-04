import { FULL, type Household } from './economy.ts';
import { CULTURE_CAP, type Culture } from './lessons.ts';
import { outfitCharm } from './outfit.ts';
import { localDayKey } from './format.ts';

/**
 * What gold buys. Two kinds here, and they behave differently on purpose:
 *
 * - Food is consumed. It refills her hunger and is gone.
 * - Accessories are kept too, but small: a good-week purchase that adds charm
 *   without pushing the coronation gown out of reach.
 *
 * Garments live in `./outfit`, because they are worn rather than merely owned.
 */

export type ItemKind = 'food' | 'accessory';

export type Item = {
  id: string;
  kind: ItemKind;
  name: string;
  detail: string;
  price: number;
  /** Food only: how much hunger it settles. */
  restores?: number;
  /** Accessories only: how much charm wearing it adds, once. */
  charm?: number;
  icon: string;
};

export const FOOD: Item[] = [
  { id: 'bread', kind: 'food', name: '호밀빵', detail: '요기는 되는 정도', price: 12, restores: 20, icon: 'cafe-outline' },
  { id: 'stew', kind: 'food', name: '고기 스튜', detail: '든든한 한 끼', price: 25, restores: 40, icon: 'restaurant-outline' },
  { id: 'roast', kind: 'food', name: '통닭 구이', detail: '오늘은 잘 먹는 날', price: 45, restores: 70, icon: 'flame-outline' },
  { id: 'feast', kind: 'food', name: '만찬', detail: '배가 터지도록', price: 90, restores: 100, icon: 'wine-outline' },
];

/**
 * Kept like clothes, but small and cheap — something to buy on a good week
 * without putting the coronation gown further out of reach. They lift her
 * charm a little, so they are not purely decorative.
 */
export const ACCESSORIES: Item[] = [
  { id: 'brooch', kind: 'accessory', name: '은 브로치', detail: '어머니에게 받은 듯한', price: 300, charm: 3, icon: 'ellipse-outline' },
  { id: 'gloves', kind: 'accessory', name: '레이스 장갑', detail: '손끝까지 단정하게', price: 400, charm: 3, icon: 'hand-left-outline' },
  { id: 'tiara', kind: 'accessory', name: '작은 티아라', detail: '언젠가의 예고처럼', price: 800, charm: 6, icon: 'diamond-outline' },
];

export type Purchase = { house: Household; wardrobe: string[] };

export type Refusal = 'poor' | 'owned' | 'full' | 'given' | null;

/**
 * One gift a day — a garment, an accessory or a piece for her room.
 *
 * The shop stopped being a list to finish and became the place you give her
 * things, and a gift is a day: ten bought in one sitting is one day, not ten.
 * It also keeps a purse saved up under the old prices from emptying the
 * shelves on the first evening. Food and lessons are not gifts — one is
 * looking after her, the other is something she goes and does.
 */
export function givenToday(giftedOn: string | null | undefined, today = new Date()) {
  return giftedOn === localDayKey(today);
}

/** Why she cannot have it, or null when she can. */
export function refusalFor(
  item: Item,
  house: Household,
  wardrobe: string[],
  giftedOn: string | null = null,
  today = new Date()
): Refusal {
  if (isKept(item) && wardrobe.includes(item.id)) return 'owned';
  if (item.kind === 'accessory' && givenToday(giftedOn, today)) return 'given';
  if (house.gold < item.price) return 'poor';
  if (item.kind === 'food' && house.satiety >= FULL) return 'full';
  return null;
}

export const REFUSAL_TEXT: Record<Exclude<Refusal, null>, string> = {
  poor: '골드가 모자라요',
  owned: '이미 가지고 있어요',
  full: '지금은 배가 불러요',
  given: '오늘은 이미 선물했어요. 내일 또 줘요',
};

/** Accessories stay; food does not. */
export function isKept(item: Item) {
  return item.kind === 'accessory';
}

/**
 * Spend. Callers must check `refusalFor` first; this throws rather than
 * silently no-opping, because a purchase that quietly does nothing is the kind
 * of bug that only shows up as a missing coin much later.
 */
export function buy(item: Item, house: Household, wardrobe: string[]): Purchase {
  const refusal = refusalFor(item, house, wardrobe);
  if (refusal) throw new Error(REFUSAL_TEXT[refusal]);

  const gold = house.gold - item.price;
  if (item.kind === 'food') {
    return {
      house: { ...house, gold, satiety: Math.min(FULL, house.satiety + (item.restores ?? 0)) },
      wardrobe,
    };
  }
  // An accessory is not a change of outfit, so it does not mend a ragged one.
  return { house: { ...house, gold }, wardrobe: [...wardrobe, item.id] };
}

/**
 * Everything to draw on her: what she has on, and every accessory she owns.
 *
 * An accessory has no putting on or taking off — its charm counts from the day
 * it is given (`wornCharm`), so that is also the day it shows. For the doll
 * only: charm is still reckoned from `worn` and the wardrobe separately.
 */
export function adorned(worn: string[], wardrobe: string[]): string[] {
  return [...worn, ...ACCESSORIES.filter((a) => wardrobe.includes(a.id)).map((a) => a.id)];
}

/** Charm earned by what she is wearing, on top of what lessons taught. */
export function wornCharm(wardrobe: string[]) {
  return ACCESSORIES.filter((a) => wardrobe.includes(a.id)).reduce((s, a) => s + (a.charm ?? 0), 0);
}


/**
 * Her standing as it actually reads: what lessons taught, plus what she has on.
 *
 * Both accessories and garments promise charm on the shelf, so both have to
 * show up here or the price tag is a lie. Accessories count from the moment
 * they are owned; a garment counts only while she is actually wearing it, and
 * not at all when a gown covers it.
 */
export function effectiveCulture(
  culture: Culture,
  wardrobe: string[],
  worn: string[] = []
): Culture {
  const extra = wornCharm(wardrobe) + outfitCharm(worn);
  return { ...culture, charm: Math.min(CULTURE_CAP, culture.charm + extra) };
}
