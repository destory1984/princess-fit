import type { Exercise } from './types.ts';
import { voiceOf, type TipKind } from './voices.ts';

type Described = Pick<
  Exercise,
  'name' | 'muscle_group' | 'secondary_group' | 'equipment' | 'muscle_detail' | 'track_type'
>;

/** 을/를, 은/는 — picked by whether the last syllable ends in a consonant. */
export function withParticle(word: string, pair: '을/를' | '은/는') {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = isHangul && (code - 0xac00) % 28 !== 0;
  const [withFinal, withoutFinal] = pair.split('/');
  return `${word}${hasFinal ? withFinal : withoutFinal}`;
}

const EQUIPMENT_PHRASE: Record<string, string> = {
  바벨: '바벨로 하는',
  덤벨: '덤벨로 하는',
  머신: '머신에서 하는',
  케이블: '케이블로 하는',
  맨몸: '맨몸으로 하는',
  기타: '',
};

/** One plain sentence built from what we actually know about the movement. */
export function introOf(e: Described) {
  const gear = EQUIPMENT_PHRASE[e.equipment] ?? '';
  const kind =
    e.track_type === 'cardio' || e.track_type === 'floors'
      ? '숨이 차오르는 유산소 운동'
      : e.track_type === 'duration'
        ? '자세를 버티는 운동'
        : `${withParticle(e.muscle_group, '을/를')} 쓰는 운동`;

  const lead = [gear, kind].filter(Boolean).join(' ');
  const detail = e.muscle_detail ? `${e.muscle_detail}에 주로 자극이 갑니다.` : '';
  const also =
    e.secondary_group && e.secondary_group !== e.muscle_group
      ? ` ${e.secondary_group}도 함께 쓰입니다.`
      : '';

  return `${withParticle(e.name, '은/는')} ${lead}입니다. ${detail}${also}`.replace(/\s+/g, ' ').trim();
}

// 「빈 봉으로 자세부터」 is advice for a bar: these, with a barbell or in a Smith machine.
const COMPOUND = ['데드리프트', '스쿼트', '벤치프레스', '오버헤드 프레스', '바벨 로우'];

/**
 * Which of her lines fits: decided by what kind of movement it is.
 *
 * Six kinds at first, and the last of them — everything that was not a big
 * lift, a machine, cardio, a hold or abs — took 74 of the 159 exercises, so
 * 「내릴 때를 더 천천히」 was what she said on nearly every screen, the box jump
 * included. The order matters: the first that fits wins.
 */
export function tipKindOf(e: Described): TipKind {
  const has = (re: RegExp) => re.test(e.name);
  if (e.track_type === 'cardio' || e.track_type === 'floors') return 'cardio';
  // Burpees and jumping jacks are counted in reps but are still about breath:
  // "lower it slowly" is advice for a weight, and there is none.
  if (e.muscle_group === '유산소') return 'cardio';
  if (e.track_type === 'duration') return 'hold';
  if (has(/점프|스윙|클린|스러스터|푸시 프레스/)) return 'power';
  if (COMPOUND.some((c) => e.name.includes(c)) && (e.equipment === '바벨' || has(/스미스/))) {
    return 'compound';
  }
  if (e.equipment === '머신') return 'machine';
  if (e.muscle_group === '복근') return 'abs';
  if (
    (e.muscle_group === '하체' || e.muscle_group === '등') &&
    has(/브릿지|쓰러스트|백 익스텐션|슈퍼맨|굿모닝|풀 스루|킥|데드리프트|햄스트링|랙 풀/)
  ) {
    return 'hip';
  }
  if (has(/프레스|푸시업|딥스/)) return 'press';
  if (has(/레이즈|플라이|크로스오버|풀오버|풀 어파트|페이스 풀|업라이트|슈러그/)) return 'raise';
  if (e.muscle_group === '팔') return 'arm';
  if (e.muscle_group === '등') return 'pull';
  if (e.muscle_group === '하체') return 'leg';
  return 'other';
}

/** A small stable number from a name, so two exercises of a kind need not get the same line. */
function seedOf(name: string) {
  let n = 0;
  for (const ch of name) n = (n * 31 + ch.codePointAt(0)!) % 9973;
  return n;
}

/**
 * A short coaching line, in the voice of whoever is beside you.
 *
 * `turn` moves on through her lines for that kind — the screen passes the day,
 * so the same exercise does not open on the same sentence every time.
 */
export function coachTipOf(e: Described, girl?: string, turn = 0) {
  const lines = voiceOf(girl).tip[tipKindOf(e)];
  return lines[(seedOf(e.name) + Math.max(0, Math.floor(turn))) % lines.length];
}
