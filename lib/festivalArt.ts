/**
 * The faces of the festival's rivals and the cup they are after. Kept out of
 * `./festival` so that file stays plain rules the tests can import without a bundler.
 *
 * Keyed by name, not id: a result is written into `memories` with the names of who
 * stood where, and a festival judged before the faces were drawn has to find them too.
 * A rival without an entry simply has no face on her row.
 */
const RIVAL_ART: Record<string, number> = {
  세실: require('../assets/rivals/cecile.png'),
  마르타: require('../assets/rivals/martha.png'),
  브리엔: require('../assets/rivals/brienne.png'),
  넬: require('../assets/rivals/nell.png'),
  로잘린: require('../assets/rivals/rosaline.png'),
  이자벨: require('../assets/rivals/isabel.png'),
  미라: require('../assets/rivals/mira.png'),
  테오도라: require('../assets/rivals/theodora.png'),
  오필리아: require('../assets/rivals/ophelia.png'),
};

export function rivalArt(name: string): number | undefined {
  return RIVAL_ART[name];
}

/** The winner's cup. */
export const TROPHY: number = require('../assets/rivals/trophy.png');
