/**
 * Roster portraits, kept out of `./advisors` so that file stays importable
 * without a bundler. These are full-body illustrations in their own outfits —
 * they are for the picker, not for the paper doll, whose base is drawn in gym
 * clothes so garments can be layered over it.
 */
const PORTRAITS: Record<string, number> = {
  geumhwa: require('../assets/advisors/geumhwa.png'),
  dana: require('../assets/advisors/dana.png'),
  munhui: require('../assets/advisors/munhui.png'),
  dohwa: require('../assets/advisors/dohwa.png'),
  cheongram: require('../assets/advisors/cheongram.png'),
  seora: require('../assets/advisors/seora.png'),
};

export function portraitOf(advisorId: string): number {
  return PORTRAITS[advisorId] ?? PORTRAITS.geumhwa;
}
