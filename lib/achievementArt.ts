/**
 * The medal of each achievement: one ribbon over one round medal. The rim goes
 * bronze, silver, gold as a family climbs (3, 7, 30 days in a row), the ribbon's
 * colour says which family it is, and the middle is the one thing that differs.
 * Kept out of `./gamification` so that file stays plain rules the tests can
 * import without a bundler.
 */
const ART: Record<string, number> = {
  first: require('../assets/achievements/first.png'),
  ten: require('../assets/achievements/ten.png'),
  fifty: require('../assets/achievements/fifty.png'),
  hundred: require('../assets/achievements/hundred.png'),
  streak3: require('../assets/achievements/streak3.png'),
  streak7: require('../assets/achievements/streak7.png'),
  streak30: require('../assets/achievements/streak30.png'),
  heavy: require('../assets/achievements/heavy.png'),
  ton10: require('../assets/achievements/ton10.png'),
  ton100: require('../assets/achievements/ton100.png'),
  balance: require('../assets/achievements/balance.png'),
  marathon: require('../assets/achievements/marathon.png'),
  tenhours: require('../assets/achievements/tenhours.png'),
  dawn: require('../assets/achievements/dawn.png'),
  night: require('../assets/achievements/night.png'),
  weeks4: require('../assets/achievements/weeks4.png'),
  weeks12: require('../assets/achievements/weeks12.png'),
};

/** Undefined for an achievement added before its medal was drawn; the row falls back to its icon. */
export function achievementArt(id: string): number | undefined {
  return ART[id];
}
