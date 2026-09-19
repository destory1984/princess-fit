import { FULL, type Household } from './economy.ts';
import { CULTURE_CAP, type Culture } from './lessons.ts';
import { outfitCharm } from './outfit.ts';

/**
 * What gold buys. Four kinds, and they behave differently on purpose:
 *
 * - Food is consumed. It refills her hunger and is gone.
 * - Accessories are kept too, but small: a good-week purchase that adds charm
 *   without pushing the coronation gown out of reach.
 * - Specials are bought with gems, which cannot be bought yet. They are shown
 *   locked rather than hidden, so the shop is honest about its own shape.
 *
 * Garments live in `./outfit`, because they are worn rather than merely owned.
 */

export type ItemKind = 'food' | 'accessory' | 'special';

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
  { id: 'ribbon', kind: 'accessory', name: '머리 리본', detail: '작지만 눈에 띄는', price: 150, charm: 2, icon: 'flower-outline' },
  { id: 'brooch', kind: 'accessory', name: '은 브로치', detail: '어머니에게 받은 듯한', price: 400, charm: 3, icon: 'ellipse-outline' },
  { id: 'gloves', kind: 'accessory', name: '레이스 장갑', detail: '손끝까지 단정하게', price: 600, charm: 3, icon: 'hand-left-outline' },
  { id: 'necklace', kind: 'accessory', name: '진주 목걸이', detail: '무도회에 어울리는', price: 1_100, charm: 5, icon: 'ellipse-outline' },
  { id: 'tiara', kind: 'accessory', name: '작은 티아라', detail: '언젠가의 예고처럼', price: 1_600, charm: 6, icon: 'diamond-outline' },
];

/**
 * The shelf behind the counter. These are bought with gems rather than gold,
 * and gems are not purchasable yet — the shelf is shown locked so the shape of
 * the shop is honest about what it will become, rather than appearing later as
 * a surprise.
 */
export const SPECIALS: Item[] = [
  { id: 'star_gown', kind: 'special', name: '별빛 드레스', detail: '밤하늘을 그대로 두른', price: 30, icon: 'star-outline' },
  { id: 'wings', kind: 'special', name: '요정의 날개', detail: '가볍게, 아주 가볍게', price: 50, icon: 'paper-plane-outline' },
  { id: 'crown_jewel', kind: 'special', name: '왕관의 보석', detail: '단 하나뿐인', price: 80, icon: 'diamond-outline' },
];

export type Purchase = { house: Household; wardrobe: string[] };

export type Refusal = 'poor' | 'owned' | 'full' | 'locked' | null;

/** Why she cannot have it, or null when she can. */
export function refusalFor(item: Item, house: Household, wardrobe: string[]): Refusal {
  if (item.kind === 'special') return 'locked';
  if (isKept(item) && wardrobe.includes(item.id)) return 'owned';
  if (house.gold < item.price) return 'poor';
  if (item.kind === 'food' && house.satiety >= FULL) return 'full';
  return null;
}

export const REFUSAL_TEXT: Record<Exclude<Refusal, null>, string> = {
  poor: '골드가 모자라요',
  owned: '이미 가지고 있어요',
  full: '지금은 배가 불러요',
  locked: '보석으로만 살 수 있어요 (준비 중)',
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
