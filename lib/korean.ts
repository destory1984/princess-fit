/**
 * Korean particles, chosen rather than bracketed.
 *
 * 「금빛 목걸이을(를) 입혀 봤어요」 is how an app writes when it does not know
 * the word it is about to print. Korean picks the particle from whether the
 * preceding syllable ends in a consonant, and that is a computable fact about
 * a string — so it gets computed.
 *
 * The bracket is not a neutral spelling. It is the app admitting, in the
 * middle of a sentence, that it is assembling text rather than saying
 * something, which is exactly the impression this app spends its whole voice
 * trying not to give.
 */

const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
const FINALS = 28;
/** The final-consonant index for ㄹ, which some particles treat as bare. */
const RIEUL = 8;

/**
 * Whether the word ends in a final consonant, or null when it cannot be told.
 *
 * Latin letters and digits are read the way they are said aloud in Korean —
 * "1RM" ends in 엠, "7" in 칠 — since those are what actually appear in this
 * app's sentences. Anything else gives null, and the caller falls back to the
 * form that reads least wrongly rather than guessing.
 */
export function endsInConsonant(word: string): boolean | null {
  const last = [...word.trimEnd()].pop();
  if (!last) return null;

  const code = last.codePointAt(0)!;
  if (code >= SYLLABLE_START && code <= SYLLABLE_END) {
    return (code - SYLLABLE_START) % FINALS !== 0;
  }

  // Said aloud: 0 영, 1 일, 2 이, 3 삼 …
  const DIGIT_HAS_FINAL = [true, true, false, true, false, false, true, true, true, false];
  if (last >= '0' && last <= '9') return DIGIT_HAS_FINAL[Number(last)];

  // Units are read as words, not as letters: kg is 킬로그램, ending in ㅁ,
  // which is nothing like the 지 that a bare "g" would give. These are the
  // ones this app actually prints; anything else falls through to the letter.
  const UNIT_HAS_FINAL: Record<string, boolean> = {
    kg: true, // 킬로그램, ends in ㅁ
    km: false, // 킬로미터, ends open
    cm: false, // 센티미터, ends open
    rm: true, // 1RM — 알엠, ends in ㅁ
  };
  const tail = word.trimEnd().slice(-2).toLowerCase();
  if (tail in UNIT_HAS_FINAL) return UNIT_HAS_FINAL[tail];
  if (last === '%') return false; // 퍼센트

  // Letter names: A 에이, L 엘, M 엠, N 엔 …
  const LETTER_HAS_FINAL: Record<string, boolean> = {
    a: false, b: false, c: false, d: false, e: false, f: false, g: false,
    h: false, i: false, j: false, k: false, l: true, m: true, n: true,
    o: false, p: false, q: false, r: true, s: false, t: false, u: false,
    v: false, w: false, x: false, y: false, z: false,
  };
  const letter = last.toLowerCase();
  if (letter in LETTER_HAS_FINAL) return LETTER_HAS_FINAL[letter];

  return null;
}

export type ParticlePair =
  | '을를'
  | '은는'
  | '이가'
  | '와과'
  | '으로로'
  | '이에요예요';

const PAIRS: Record<ParticlePair, [string, string]> = {
  // [after a final consonant, after a vowel]
  을를: ['을', '를'],
  은는: ['은', '는'],
  이가: ['이', '가'],
  와과: ['과', '와'],
  으로로: ['으로', '로'],
  이에요예요: ['이에요', '예요'],
};

/**
 * The particle that follows this word.
 *
 * ㄹ is the exception the rule needs: 「서울로」, not 「서울으로」. When the
 * ending cannot be read at all — an emoji, a symbol — the consonant form is
 * used, because it is the one that survives being wrong out loud.
 */
export function particle(word: string, pair: ParticlePair): string {
  const [afterConsonant, afterVowel] = PAIRS[pair];
  const closed = endsInConsonant(word);
  if (pair === '으로로' && closed === true) {
    const last = [...word.trimEnd()].pop()!;
    const code = last.codePointAt(0)!;
    if (
      code >= SYLLABLE_START &&
      code <= SYLLABLE_END &&
      (code - SYLLABLE_START) % FINALS === RIEUL
    ) {
      return afterVowel;
    }
  }
  return closed === false ? afterVowel : afterConsonant;
}

/** The word with its particle attached, which is how it is nearly always used. */
export function withParticle(word: string, pair: ParticlePair): string {
  return word + particle(word, pair);
}
