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

export const BASE_GIRL: Art = {
  source: require('../assets/outfit/base.png'),
  aspect: 1086 / 1448,
};

/**
 * Each girl's gym-clothes base, keyed by advisor id.
 *
 * A girl is playable exactly when she has one of these: garments are drawn to
 * layer over this body, so a portrait alone can be shown in the roster but
 * never dressed. `advisors.ts` carries the matching `playable` flag — it stays
 * free of `require` so the tests can import it, which is why the two have to
 * be kept in step by hand.
 */
const BASE_ART: Record<string, Art> = {
  geumhwa: BASE_GIRL,
  // Drawn on the same canvas as 리나, which is what lets one wardrobe fit all
  // three: a garment's placement is in fractions of this box, so a base of a
  // different shape would wear every dress crooked.
  seora: { source: require('../assets/outfit/base_seora.png'), aspect: 1086 / 1448 },
  dohwa: { source: require('../assets/outfit/base_dohwa.png'), aspect: 1086 / 1448 },
};

export function baseArt(advisorId: string): Art {
  const art = BASE_ART[advisorId];
  if (!art) throw new Error(`no gym-clothes base for ${advisorId}`);
  return art;
}

const GARMENT_ART: Record<string, Art> = {
  bouquet: { source: require('../assets/outfit/bouquet.png'), aspect: 1086 / 1448 },
  sleeves_orange: { source: require('../assets/outfit/sleeves_orange.png'), aspect: 1086 / 1448 },
  sleeves_blue: { source: require('../assets/outfit/sleeves_blue.png'), aspect: 1312 / 1199 },
  skirt_white: { source: require('../assets/outfit/skirt_white.png'), aspect: 1371 / 1148 },
  skirt_orange: { source: require('../assets/outfit/skirt_orange.png'), aspect: 1148 / 1371 },
  skirt_blue: { source: require('../assets/outfit/skirt_blue.png'), aspect: 1371 / 1148 },
  blouse: { source: require('../assets/outfit/blouse.png'), aspect: 1148 / 1371 },
  gown: { source: require('../assets/outfit/gown.png'), aspect: 1086 / 1448 },
};

export function garmentArt(garmentId: string): Art {
  const art = GARMENT_ART[garmentId];
  if (!art) throw new Error(`no art for garment ${garmentId}`);
  return art;
}
