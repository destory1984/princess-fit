/**
 * Paper-doll art, kept out of `./outfit` so that file stays plain data the
 * tests can import without a bundler. Required eagerly: a piece that fails to
 * resolve should break the build rather than quietly leave her half-dressed.
 *
 * Each entry carries its aspect ratio so a layer can be sized by width alone
 * and still have a defined height. An image given only a width falls back to
 * its intrinsic pixel size, which for this art is over a thousand pixels tall.
 */
type Art = { source: number; aspect: number };

/**
 * A girl as the doll stacks her: body, then her gym clothes, then her hair. A present
 * goes on between the body and the hair — 리나's plait hangs down in front of her top,
 * so hair has to be the last thing drawn. `whole` is the three already put together,
 * for the round portraits.
 *
 * The three layers are cut from one drawing by `scripts/sprite-layers.py` and laid on
 * a canvas every girl shares by `scripts/girl-assets.py` (64 x 96 dots, the body in the
 * same place on each). That shared canvas is what lets one wardrobe fit all three.
 */
export type GirlArt = { whole: number; body: number; clothes: number; hair: number; aspect: number };

/** Width over height of the canvas every girl, and every garment drawn for her, is on. */
export const DOLL_ASPECT = 64 / 96;
/** How many dots tall that canvas is, for sizing her to whole pixels per dot. */
export const DOLL_DOTS_TALL = 96;

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
    clothes: require('../assets/girls/geumhwa_clothes.png'),
    hair: require('../assets/girls/geumhwa_hair.png'),
    aspect: DOLL_ASPECT,
  },
  seora: {
    whole: require('../assets/girls/seora_whole.png'),
    body: require('../assets/girls/seora_body.png'),
    clothes: require('../assets/girls/seora_clothes.png'),
    hair: require('../assets/girls/seora_hair.png'),
    aspect: DOLL_ASPECT,
  },
  dohwa: {
    whole: require('../assets/girls/dohwa_whole.png'),
    body: require('../assets/girls/dohwa_body.png'),
    clothes: require('../assets/girls/dohwa_clothes.png'),
    hair: require('../assets/girls/dohwa_hair.png'),
    aspect: DOLL_ASPECT,
  },
};

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
 * on her. The shop's shelves still use the older pictures.
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
  necklace: require('../assets/garments/necklace.png'),
  bouquet: require('../assets/garments/bouquet.png'),
};

export function dotGarmentArt(garmentId: string): number | undefined {
  return DOT_GARMENT_ART[garmentId];
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
