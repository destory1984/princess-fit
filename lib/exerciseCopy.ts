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

const COMPOUND = ['데드리프트', '스쿼트', '벤치프레스', '오버헤드 프레스', '바벨 로우', '풀업'];

/** Which of her lines fits: decided by what kind of movement it is. */
export function tipKindOf(e: Described): TipKind {
  if (COMPOUND.some((c) => e.name.includes(c))) return 'compound';
  if (e.track_type === 'cardio' || e.track_type === 'floors') return 'cardio';
  if (e.track_type === 'duration') return 'hold';
  if (e.equipment === '머신') return 'machine';
  if (e.muscle_group === '복근') return 'abs';
  return 'other';
}

/** A short coaching line, in the voice of whoever is beside you. */
export function coachTipOf(e: Described, girl?: string) {
  return voiceOf(girl).tip[tipKindOf(e)];
}
