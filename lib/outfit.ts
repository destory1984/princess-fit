/**
 * The paper doll.
 *
 * She starts in gym clothes and everything else is bought and layered on top.
 * One garment per slot, drawn back to front; a full gown hides the pieces it
 * would contradict rather than stacking over them.
 *
 * Each garment carries a `fit`: where its art sits over the base, as fractions
 * of the doll's box. This exists because the garment art was drawn on its own
 * canvas rather than registered to the base, so every piece needs placing by
 * hand. Art exported on the base's canvas would use the default fit and need
 * no entry at all.
 */

export type OutfitSlot = 'sleeves' | 'bottom' | 'top' | 'hand';

export const OUTFIT_SLOT_NAME: Record<OutfitSlot, string> = {
  sleeves: '소매',
  bottom: '치마',
  top: '상의',
  hand: '손에 든 것',
};

/** Back to front. Sleeves sit behind the body, what she holds sits in front. */
export const LAYER_ORDER: OutfitSlot[] = ['sleeves', 'bottom', 'top', 'hand'];

export type Fit = { x: number; y: number; w: number };

export type Garment = {
  id: string;
  slot: OutfitSlot;
  name: string;
  detail: string;
  price: number;
  /** Charm for wearing it, counted once. */
  charm: number;
  /** Slots this garment covers on its own, hiding anything in them. */
  hides?: OutfitSlot[];
  fit: Fit;
};

export const GARMENTS: Garment[] = [
  {
    id: 'bouquet',
    slot: 'hand',
    name: '흰 꽃다발',
    detail: '누가 준 것인지는 말하지 않아요',
    price: 400,
    charm: 2,
    fit: { x: 0.44, y: 0.42, w: 0.32 },
  },
  {
    id: 'sleeves_orange',
    slot: 'sleeves',
    name: '주황 덧소매',
    detail: '팔이 가벼워 보여요',
    price: 700,
    charm: 2,
    fit: { x: 0.2, y: 0.32, w: 0.6 },
  },
  {
    id: 'sleeves_blue',
    slot: 'sleeves',
    name: '푸른 덧소매',
    detail: '차분한 쪽이 좋다면',
    price: 700,
    charm: 2,
    fit: { x: 0.2, y: 0.32, w: 0.6 },
  },
  {
    id: 'skirt_white',
    slot: 'bottom',
    name: '흰 주름치마',
    detail: '무엇에나 어울려요',
    price: 900,
    charm: 3,
    fit: { x: 0.14, y: 0.48, w: 0.72 },
  },
  {
    id: 'skirt_orange',
    slot: 'bottom',
    name: '주황 주름치마',
    detail: '멀리서도 눈에 띄어요',
    price: 900,
    charm: 3,
    fit: { x: 0.14, y: 0.48, w: 0.72 },
  },
  {
    id: 'skirt_blue',
    slot: 'bottom',
    name: '푸른 주름치마',
    detail: '단정하게 보이고 싶은 날',
    price: 900,
    charm: 3,
    fit: { x: 0.14, y: 0.48, w: 0.72 },
  },
  {
    id: 'blouse',
    slot: 'top',
    name: '리본 블라우스',
    detail: '처음으로 제대로 갖춰 입는 옷',
    price: 1_200,
    charm: 4,
    fit: { x: 0.26, y: 0.36, w: 0.5 },
  },
  {
    id: 'gown',
    slot: 'top',
    name: '한 벌 드레스',
    detail: '일 년을 걸어야 닿는 자리',
    price: 3_600,
    charm: 10,
    // A whole outfit: anything underneath would only fight with it.
    hides: ['top', 'bottom', 'sleeves'],
    fit: { x: 0.14, y: 0.36, w: 0.72 },
  },
];

export const OUTFIT_TOTAL = GARMENTS.reduce((sum, g) => sum + g.price, 0);

export function garmentById(id: string) {
  return GARMENTS.find((g) => g.id === id) ?? null;
}

/**
 * What she is actually wearing, back to front. `worn` is what she owns and has
 * put on; a garment that hides a slot wins it, so a gown does not end up with a
 * skirt poking out from under it.
 */
export function layersOf(worn: string[]): Garment[] {
  const chosen = new Map<OutfitSlot, Garment>();
  for (const g of GARMENTS) {
    if (worn.includes(g.id)) chosen.set(g.slot, g);
  }

  const hidden = new Set<OutfitSlot>();
  for (const g of chosen.values()) {
    for (const slot of g.hides ?? []) {
      if (slot !== g.slot) hidden.add(slot);
    }
  }

  return LAYER_ORDER.flatMap((slot) => {
    const g = chosen.get(slot);
    return g && !hidden.has(slot) ? [g] : [];
  });
}

/** Charm from what she has on, which is not the same as what she owns. */
export function outfitCharm(worn: string[]) {
  return layersOf(worn).reduce((sum, g) => sum + g.charm, 0);
}

/** Putting on one garment takes off whatever shared its slot. */
export function wearing(worn: string[], garment: Garment) {
  return [...worn.filter((id) => garmentById(id)?.slot !== garment.slot), garment.id];
}

export function takingOff(worn: string[], garmentId: string) {
  return worn.filter((id) => id !== garmentId);
}

export function outfitProgress(owned: string[]) {
  const mine = GARMENTS.filter((g) => owned.includes(g.id));
  return {
    count: mine.length,
    total: GARMENTS.length,
    ratio: mine.reduce((s, g) => s + g.price, 0) / OUTFIT_TOTAL,
    complete: mine.length === GARMENTS.length,
  };
}
