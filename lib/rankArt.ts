/**
 * The badge of each rank: one shield, with the rim going from wood to iron to
 * silver to gold as the ranks climb. Kept out of `./gamification` so that file
 * stays plain rules the tests can import without a bundler.
 */
const RANK_ART: number[] = [
  require('../assets/ranks/rank1.png'),
  require('../assets/ranks/rank2.png'),
  require('../assets/ranks/rank3.png'),
  require('../assets/ranks/rank4.png'),
  require('../assets/ranks/rank5.png'),
  require('../assets/ranks/rank6.png'),
  require('../assets/ranks/rank7.png'),
  require('../assets/ranks/rank8.png'),
  require('../assets/ranks/rank9.png'),
  require('../assets/ranks/rank10.png'),
  require('../assets/ranks/rank11.png'),
  require('../assets/ranks/rank12.png'),
];

/** Levels past the last rank keep the last badge, as they keep its title. */
export function rankArt(level: number): number {
  return RANK_ART[Math.min(Math.max(level, 1), RANK_ART.length) - 1];
}
