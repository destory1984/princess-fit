/**
 * Her room, bought one piece at a time.
 *
 * She starts with a bare room and a cheap bed — that is the point. The room is
 * the slowest-burning gold sink in the game and deliberately sits *outside* the
 * one-year promise the wardrobe makes: furnishing it fully is a second year's
 * work, not a competitor to the coronation gown.
 *
 * Each piece occupies a slot, and a slot holds one piece at a time, so buying
 * the good bed replaces the cheap one rather than leaving two beds in the room.
 */

export type Slot =
  | 'bed'
  | 'rug'
  | 'curtain'
  | 'dresser'
  | 'shelf'
  | 'light'
  | 'plant'
  | 'picture'
  | 'seat';

export const SLOT_NAME: Record<Slot, string> = {
  bed: '침대',
  rug: '양탄자',
  curtain: '커튼',
  dresser: '화장대',
  shelf: '책장',
  light: '조명',
  plant: '화초',
  picture: '그림',
  seat: '의자',
};

export type Furniture = {
  id: string;
  slot: Slot;
  name: string;
  detail: string;
  price: number;
  icon: string;
  /** True when the piece is part of the room painting, not a separate sprite. */
  paintedIn?: boolean;
  /**
   * Where the art sits in the room, as fractions of the room's width and
   * height: left/top of the piece, and its width. Height follows the art.
   */
  place: { x: number; y: number; w: number };
};

/**
 * What she already has on day one. Free, not for sale, and painted into the
 * room art rather than drawn as a sprite — which is why anything that fills
 * the bed slot must be wide and tall enough to cover this box completely, or
 * the old cot will peek out from behind the new bed.
 */
export const STARTER: Furniture = {
  id: 'cot',
  slot: 'bed',
  name: '싸구려 침대',
  detail: '삐걱거리지만, 잠은 와요',
  price: 0,
  icon: 'bed-outline',
  paintedIn: true,
  place: { x: 0.0, y: 0.5, w: 0.44 },
};

export const FURNITURE: Furniture[] = [
  { id: 'flowers', slot: 'plant', name: '들꽃 화병', detail: '방에 색이 하나 생겨요', price: 200, icon: 'flower-outline', place: { x: 0.86, y: 0.52, w: 0.14 } },
  { id: 'curtain', slot: 'curtain', name: '분홍 커튼', detail: '아침볕이 부드러워져요', price: 300, icon: 'browsers-outline', place: { x: 0.33, y: 0.096, w: 0.518 } },
  { id: 'rug', slot: 'rug', name: '꽃무늬 양탄자', detail: '맨발로 내려서도 괜찮아요', price: 350, icon: 'square-outline', place: { x: 0.37, y: 0.7, w: 0.58 } },
  { id: 'bench', slot: 'seat', name: '창가 벤치', detail: '앉아서 밖을 볼 자리', price: 350, icon: 'tablet-landscape-outline', place: { x: 0.06, y: 0.68, w: 0.3 } },
  { id: 'pictures', slot: 'picture', name: '액자 셋', detail: '벽이 허전하지 않게', price: 400, icon: 'image-outline', place: { x: 0.2, y: 0.1, w: 0.18 } },
  { id: 'mirror', slot: 'dresser', name: '전신 거울', detail: '차림새를 보고 나설 수 있어요', price: 450, icon: 'browsers-outline', place: { x: 0.602, y: 0.495, w: 0.251 } },
  { id: 'bed', slot: 'bed', name: '천개 달린 침대', detail: '이제 잘 자겠네요', price: 500, icon: 'bed-outline', place: { x: 0.0, y: 0.3, w: 0.48 } },
  { id: 'shelf', slot: 'shelf', name: '책장', detail: '배운 것을 쌓아둘 곳', price: 550, icon: 'library-outline', place: { x: 0.732, y: 0.45, w: 0.253 } },
  { id: 'chandelier', slot: 'light', name: '샹들리에', detail: '밤에도 방이 환해요', price: 700, icon: 'bulb-outline', place: { x: 0.42, y: 0.0, w: 0.2 } },
];

export const ROOM_TOTAL = FURNITURE.reduce((sum, f) => sum + f.price, 0);

/**
 * What is actually in the room right now, back to front. Later slots draw over
 * earlier ones, and the starter bed only shows while nothing better fills its
 * slot.
 */
export function roomContents(owned: string[]): Furniture[] {
  const bySlot = new Map<Slot, Furniture>([[STARTER.slot, STARTER]]);
  for (const piece of FURNITURE) {
    if (owned.includes(piece.id)) bySlot.set(piece.slot, piece);
  }
  // Rug first, then furniture, then what hangs on the wall.
  const order: Slot[] = ['rug', 'bed', 'seat', 'dresser', 'shelf', 'plant', 'curtain', 'picture', 'light'];
  return order.flatMap((slot) => {
    const piece = bySlot.get(slot);
    return piece ? [piece] : [];
  });
}

/** Whether buying this would replace something she already has. */
export function replaces(piece: Furniture, owned: string[]): Furniture | null {
  const current = roomContents(owned).find((f) => f.slot === piece.slot);
  return current && current.id !== piece.id ? current : null;
}

export function roomProgress(owned: string[]) {
  const mine = FURNITURE.filter((f) => owned.includes(f.id));
  return {
    count: mine.length,
    total: FURNITURE.length,
    ratio: mine.reduce((s, f) => s + f.price, 0) / ROOM_TOTAL,
    complete: mine.length === FURNITURE.length,
  };
}

/** A line about how the room looks, for the main screen. */
export function roomMood(owned: string[]) {
  const { count, total } = roomProgress(owned);
  if (count === 0) return '침대 하나뿐인 방이에요.';
  if (count === total) return '더 들일 것이 없는 방이 되었어요.';
  if (count >= total - 2) return '이제 제법 방다워졌어요.';
  if (count >= 3) return '하나씩 들어차고 있어요.';
  return '조금씩 방이 되어가요.';
}
