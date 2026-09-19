/**
 * Paper-doll art, kept out of `./outfit` so that file stays plain data the
 * tests can import without a bundler. Required eagerly: a piece that fails to
 * resolve should break the build rather than quietly leave her half-dressed.
 */
export const BASE_GIRL = require('../assets/outfit/base.png');

const GARMENT_ART: Record<string, number> = {
  bouquet: require('../assets/outfit/bouquet.png'),
  sleeves_orange: require('../assets/outfit/sleeves_orange.png'),
  sleeves_blue: require('../assets/outfit/sleeves_blue.png'),
  skirt_white: require('../assets/outfit/skirt_white.png'),
  skirt_orange: require('../assets/outfit/skirt_orange.png'),
  skirt_blue: require('../assets/outfit/skirt_blue.png'),
  blouse: require('../assets/outfit/blouse.png'),
  gown: require('../assets/outfit/gown.png'),
};

export function garmentArt(garmentId: string): number {
  const art = GARMENT_ART[garmentId];
  if (!art) throw new Error(`no art for garment ${garmentId}`);
  return art;
}
