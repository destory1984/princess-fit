/**
 * Paper-doll art, kept out of `./outfit` so that file stays plain data the
 * tests can import without a bundler. Required eagerly: a piece that fails to
 * resolve should break the build rather than quietly leave her half-dressed.
 *
 * Each entry carries its aspect ratio so a layer can be sized by width alone
 * and still have a defined height. An image given only a width falls back to
 * its intrinsic pixel size, which for this art is over a thousand pixels tall.
 */
import type { Face } from './economy';

type Art = { source: number; aspect: number };

/**
 * A girl as the doll stacks her: body, then her own clothes in three pieces (bottom,
 * feet, top), then her hair. A present goes on between her clothes and her hair —
 * 리나's hair falls in front of whatever she has on, so hair has to come after. Her own
 * top is a separate piece so that a blouse given to her can take its place: her jacket
 * has sleeves, and they would show under anything sleeveless. `whole` is all of it
 * already put together, for the round portraits.
 *
 * The layers are cut from one drawing by `scripts/sprite-layers.py` and laid on a
 * canvas every girl shares by `scripts/girl-assets.py` (64 x 96 dots, the body in the
 * same place on each). That shared canvas is what lets one wardrobe fit all three.
 */
export type GirlArt = {
  whole: number;
  body: number;
  bottom: number;
  feet: number;
  top: number;
  hair: number;
  aspect: number;
};

/** Width over height of the canvas every girl, and every garment drawn for her, is on. */
export const DOLL_ASPECT = 64 / 96;

/**
 * Each girl's art, keyed by advisor id.
 *
 * A girl is playable exactly when she has an entry here. `advisors.ts` carries the
 * matching `playable` flag — it stays free of `require` so the tests can import it,
 * which is why the two have to be kept in step by hand.
 */
const GIRL_ART: Record<string, GirlArt> = {
  geumhwa: {
    whole: require('../assets/girls/geumhwa_whole.png'),
    body: require('../assets/girls/geumhwa_body.png'),
    bottom: require('../assets/girls/geumhwa_bottom.png'),
    feet: require('../assets/girls/geumhwa_feet.png'),
    top: require('../assets/girls/geumhwa_top.png'),
    hair: require('../assets/girls/geumhwa_hair.png'),
    aspect: DOLL_ASPECT,
  },
  seora: {
    whole: require('../assets/girls/seora_whole.png'),
    body: require('../assets/girls/seora_body.png'),
    bottom: require('../assets/girls/seora_bottom.png'),
    feet: require('../assets/girls/seora_feet.png'),
    top: require('../assets/girls/seora_top.png'),
    hair: require('../assets/girls/seora_hair.png'),
    aspect: DOLL_ASPECT,
  },
  dohwa: {
    whole: require('../assets/girls/dohwa_whole.png'),
    body: require('../assets/girls/dohwa_body.png'),
    bottom: require('../assets/girls/dohwa_bottom.png'),
    feet: require('../assets/girls/dohwa_feet.png'),
    top: require('../assets/girls/dohwa_top.png'),
    hair: require('../assets/girls/dohwa_hair.png'),
    aspect: DOLL_ASPECT,
  },
};

/**
 * Her head and shoulders with another look on her face, on the same canvas as `whole`
 * so the round portrait takes either. The everyday face is `whole` itself. Only the
 * box her face is in differs (`scripts/girl-face.py`): her hair does not move when her
 * mood does.
 */
const FACE_ART: Record<string, Partial<Record<Face, number>>> = {
  geumhwa: {
    happy: require('../assets/girls/geumhwa_face_happy.png'),
    hungry: require('../assets/girls/geumhwa_face_hungry.png'),
    shabby: require('../assets/girls/geumhwa_face_shabby.png'),
    lonely: require('../assets/girls/geumhwa_face_lonely.png'),
    sulky: require('../assets/girls/geumhwa_face_sulky.png'),
  },
  seora: {
    happy: require('../assets/girls/seora_face_happy.png'),
    hungry: require('../assets/girls/seora_face_hungry.png'),
    shabby: require('../assets/girls/seora_face_shabby.png'),
    lonely: require('../assets/girls/seora_face_lonely.png'),
    sulky: require('../assets/girls/seora_face_sulky.png'),
  },
  dohwa: {
    happy: require('../assets/girls/dohwa_face_happy.png'),
    hungry: require('../assets/girls/dohwa_face_hungry.png'),
    shabby: require('../assets/girls/dohwa_face_shabby.png'),
    lonely: require('../assets/girls/dohwa_face_lonely.png'),
    sulky: require('../assets/girls/dohwa_face_sulky.png'),
  },
};

/** Her portrait with that face on, or her everyday one where it has not been drawn. */
export function faceArt(advisorId: string, face: Face): number {
  return FACE_ART[advisorId]?.[face] ?? girlArt(advisorId).whole;
}

export function girlArt(advisorId: string): GirlArt {
  const art = GIRL_ART[advisorId];
  if (!art) throw new Error(`no art for ${advisorId}`);
  return art;
}

/**
 * Garments redrawn as dots on the girls' canvas, keyed by garment id.
 *
 * This is what the doll draws. `GARMENT_ART` below is the older art, drawn for the tall
 * body the girls had before; on the dot body it would hang somewhere around the knees,
 * so the doll never draws it, and a garment without an entry here simply does not show
 * on her. Nothing draws the older art any more.
 */
const DOT_GARMENT_ART: Record<string, number> = {
  ribbon: require('../assets/garments/ribbon.png'),
  blouse: require('../assets/garments/blouse.png'),
  gown: require('../assets/garments/gown.png'),
  skirt_white: require('../assets/garments/skirt_white.png'),
  skirt_orange: require('../assets/garments/skirt_orange.png'),
  skirt_blue: require('../assets/garments/skirt_blue.png'),
  trousers_orange: require('../assets/garments/trousers_orange.png'),
  trousers_blue: require('../assets/garments/trousers_blue.png'),
  sailor: require('../assets/garments/sailor.png'),
  cardigan: require('../assets/garments/cardigan.png'),
  sundress: require('../assets/garments/sundress.png'),
  knight: require('../assets/garments/knight.png'),
  hanbok: require('../assets/garments/hanbok.png'),
  necklace: require('../assets/garments/necklace.png'),
  bouquet: require('../assets/garments/bouquet.png'),
};

export function dotGarmentArt(garmentId: string): number | undefined {
  return DOT_GARMENT_ART[garmentId];
}

/**
 * The same garments alone, each cut to its own square, for the shop's shelves, and
 * with them the things on the other shelves that are drawn but never worn: the four
 * dishes and the seven lessons (`scripts/shelf-assets.py`).
 */
const SHELF_ART: Record<string, number> = {
  ribbon: require('../assets/garments/ribbon_shelf.png'),
  blouse: require('../assets/garments/blouse_shelf.png'),
  gown: require('../assets/garments/gown_shelf.png'),
  skirt_white: require('../assets/garments/skirt_white_shelf.png'),
  skirt_orange: require('../assets/garments/skirt_orange_shelf.png'),
  skirt_blue: require('../assets/garments/skirt_blue_shelf.png'),
  trousers_orange: require('../assets/garments/trousers_orange_shelf.png'),
  trousers_blue: require('../assets/garments/trousers_blue_shelf.png'),
  sailor: require('../assets/garments/sailor_shelf.png'),
  cardigan: require('../assets/garments/cardigan_shelf.png'),
  sundress: require('../assets/garments/sundress_shelf.png'),
  knight: require('../assets/garments/knight_shelf.png'),
  hanbok: require('../assets/garments/hanbok_shelf.png'),
  necklace: require('../assets/garments/necklace_shelf.png'),
  bouquet: require('../assets/garments/bouquet_shelf.png'),
  brooch: require('../assets/garments/brooch_shelf.png'),
  gloves: require('../assets/garments/gloves_shelf.png'),
  tiara: require('../assets/garments/tiara_shelf.png'),
  bread: require('../assets/shop/bread.png'),
  stew: require('../assets/shop/stew.png'),
  roast: require('../assets/shop/roast.png'),
  feast: require('../assets/shop/feast.png'),
  etiquette: require('../assets/shop/etiquette.png'),
  dance: require('../assets/shop/dance.png'),
  voice: require('../assets/shop/voice.png'),
  painting: require('../assets/shop/painting.png'),
  literature: require('../assets/shop/literature.png'),
  mathematics: require('../assets/shop/mathematics.png'),
  theology: require('../assets/shop/theology.png'),
};

export function shelfArt(garmentId: string): number | undefined {
  return SHELF_ART[garmentId];
}

const GARMENT_ART: Record<string, Art> = {
  bouquet: { source: require('../assets/outfit/bouquet.png'), aspect: 1086 / 1448 },
  trousers_orange: { source: require('../assets/outfit/sleeves_orange.png'), aspect: 1086 / 1448 },
  trousers_blue: { source: require('../assets/outfit/sleeves_blue.png'), aspect: 1312 / 1199 },
  skirt_white: { source: require('../assets/outfit/skirt_white.png'), aspect: 1371 / 1148 },
  skirt_orange: { source: require('../assets/outfit/skirt_orange.png'), aspect: 1148 / 1371 },
  skirt_blue: { source: require('../assets/outfit/skirt_blue.png'), aspect: 1371 / 1148 },
  blouse: { source: require('../assets/outfit/blouse.png'), aspect: 1148 / 1371 },
  gown: { source: require('../assets/outfit/gown.png'), aspect: 1086 / 1448 },
  ribbon: { source: require('../assets/outfit/ribbon.png'), aspect: 1086 / 1448 },
  necklace: { source: require('../assets/outfit/necklace.png'), aspect: 1086 / 1448 },
};

export function garmentArt(garmentId: string): Art {
  const art = GARMENT_ART[garmentId];
  if (!art) throw new Error(`no art for garment ${garmentId}`);
  return art;
}

/**
 * Accessories on the girls' canvas, keyed by item id (lib/shop.ts). Drawn like a
 * garment, but she has one on from the day it is given (`adorned`). `overHair`
 * is for what sits on her head: under the hair a tiara is no tiara.
 */
const ACCESSORY_ART: Record<string, { source: number; overHair: boolean }> = {
  brooch: { source: require('../assets/garments/brooch.png'), overHair: false },
  gloves: { source: require('../assets/garments/gloves.png'), overHair: false },
  tiara: { source: require('../assets/garments/tiara.png'), overHair: true },
};

export function accessoryArt(itemId: string) {
  return ACCESSORY_ART[itemId];
}
