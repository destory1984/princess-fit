import { FULL, type Household } from './economy.ts';

/**
 * What gold buys. Four kinds, and they behave differently on purpose:
 *
 * - Food is consumed. It refills her hunger and is gone.
 * - Clothes are kept, and a new outfit turns her out properly again. The
 *   wardrobe is the thing a year of training is for, so it must not evaporate
 *   the way a meal does.
 * - Accessories are kept too, but small: a good-week purchase that adds charm
 *   without pushing the coronation gown out of reach.
 * - Specials are bought with gems, which cannot be bought yet. They are shown
 *   locked rather than hidden, so the shop is honest about its own shape.
 *
 * The wardrobe totals WARDROBE_TOTAL, which the tests hold against a year of
 * steady training.
 */

export type ItemKind = 'food' | 'clothes' | 'accessory' | 'special';

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

/** Cheap to start, steep at the end — the last piece should feel earned. */
export const CLOTHES: Item[] = [
  { id: 'linen', kind: 'clothes', name: '무명 원피스', detail: '수수하지만 깨끗한', price: 300, icon: 'shirt-outline' },
  { id: 'outing', kind: 'clothes', name: '나들이옷', detail: '성 밖에 나가도 부끄럽지 않은', price: 700, icon: 'shirt-outline' },
  { id: 'squire', kind: 'clothes', name: '견습 기사복', detail: '처음으로 이름이 붙은 옷', price: 1_200, icon: 'shield-outline' },
  { id: 'ball', kind: 'clothes', name: '무도회 드레스', detail: '한 번쯤은 주인공이 되는', price: 1_800, icon: 'sparkles-outline' },
  { id: 'order', kind: 'clothes', name: '기사단 예복', detail: '검을 받던 날의 옷', price: 2_600, icon: 'ribbon-outline' },
  { id: 'crown', kind: 'clothes', name: '대관식 예복', detail: '일 년을 걸어야 닿는 자리', price: 3_400, icon: 'diamond-outline' },
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

export const CATALOG: Item[] = [...FOOD, ...CLOTHES, ...ACCESSORIES, ...SPECIALS];

export const WARDROBE_TOTAL = CLOTHES.reduce((sum, c) => sum + c.price, 0);

export function itemById(id: string) {
  return CATALOG.find((i) => i.id === id) ?? null;
}

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
  poor: '금화가 모자라요',
  owned: '이미 가지고 있어요',
  full: '지금은 배가 불러요',
  locked: '보석으로만 살 수 있어요 (준비 중)',
};

/** Clothes and accessories stay; food does not. */
export function isKept(item: Item) {
  return item.kind === 'clothes' || item.kind === 'accessory';
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
  // New clothes are new clothes: she is turned out properly again. An
  // accessory is not a change of outfit, so it does not mend a ragged one.
  const attire = item.kind === 'clothes' ? FULL : house.attire;
  return { house: { ...house, gold, attire }, wardrobe: [...wardrobe, item.id] };
}

/** Charm earned by what she is wearing, on top of what lessons taught. */
export function wornCharm(wardrobe: string[]) {
  return ACCESSORIES.filter((a) => wardrobe.includes(a.id)).reduce((s, a) => s + (a.charm ?? 0), 0);
}

/** How far along the wardrobe is, 0–1. The year's progress bar. */
export function wardrobeProgress(wardrobe: string[]) {
  const owned = CLOTHES.filter((c) => wardrobe.includes(c.id));
  return {
    count: owned.length,
    total: CLOTHES.length,
    spent: owned.reduce((s, c) => s + c.price, 0),
    ratio: owned.reduce((s, c) => s + c.price, 0) / WARDROBE_TOTAL,
    complete: owned.length === CLOTHES.length,
  };
}
