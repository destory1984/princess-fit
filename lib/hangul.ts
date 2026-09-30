/**
 * Searching Korean the way Korean is typed.
 *
 * Sixty-seven movements and a phone keyboard: nobody types 「바벨 벤치 프레스」
 * to find it. They type ㅂㅂㅂㅊㅍㄹㅅ, or the first few of those, because that
 * is how every Korean app has worked for twenty years — and a search box that
 * refuses it feels broken rather than strict.
 *
 * The rule is deliberately narrow. Initial-consonant matching applies only
 * when the whole query is bare consonants, so 「스」 still means the syllable
 * 스 and not "anything starting with ㅅ". Mixing the two reads as clever and
 * behaves as unpredictable.
 */

const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
const PER_INITIAL = 588;

const INITIALS = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/**
 * Whether every character is a bare consonant — a query nobody could have
 * meant literally, since a word never contains one.
 *
 * The doubled consonants are included: ㄲ is what the key gives with shift,
 * and someone hunting 꼬리 may well type it.
 */
export function isInitialsOnly(query: string) {
  const trimmed = query.replace(/\s+/g, '');
  if (trimmed.length === 0) return false;
  return [...trimmed].every((c) => INITIALS.includes(c));
}

/**
 * The initial consonants of a string, with everything else kept as it is.
 *
 * Latin letters and digits pass through so a query can still find 「1RM 계산」
 * by its numbers, and spaces are dropped so 「ㅂㅂㅅㅋㅌ」 finds 「바벨 스쿼트」
 * without anyone having to guess where the space went.
 */
export function initialsOf(text: string) {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code >= SYLLABLE_START && code <= SYLLABLE_END) {
      out += INITIALS[Math.floor((code - SYLLABLE_START) / PER_INITIAL)];
    } else if (!/\s/.test(char)) {
      out += char.toLowerCase();
    }
  }
  return out;
}

/**
 * Whether this text answers the query.
 *
 * An empty query matches everything, which is what an empty search box means.
 */
export function matches(text: string, query: string) {
  const q = query.trim();
  if (q === '') return true;
  if (isInitialsOnly(q)) {
    return initialsOf(text).includes(q.replace(/\s+/g, ''));
  }
  // Spaces are where people guess differently: 「ab슬라이드」 is 「AB 슬라이드」.
  const compact = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  if (compact(text).includes(compact(q))) return true;
  // Initials mixed with Latin letters or digits, as in 「abㅅㄹㅇㄷ」.
  if ([...q].some((c) => INITIALS.includes(c))) return initialsOf(text).includes(initialsOf(q));
  return false;
}

/** Whether any of these fields answers the query. */
export function matchesAny(fields: (string | null | undefined)[], query: string) {
  const q = query.trim();
  if (q === '') return true;
  return fields.some((field) => !!field && matches(field, q));
}
