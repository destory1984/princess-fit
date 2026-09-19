/**
 * The advisor portraits, kept out of `./advisors` so that file stays importable
 * without a bundler. The requires are plain and eager on purpose: a file that
 * fails to resolve should break the build, not quietly show a blank frame.
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
