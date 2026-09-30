import type { Exercise } from './types.ts';

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

/** A short coaching line, chosen by what kind of movement it is. */
export function coachTipOf(e: Described) {
  if (COMPOUND.some((c) => e.name.includes(c))) {
    return '무거운 운동입니다. 무게를 올리기 전에 빈 봉으로 자세부터 익히세요.';
  }
  if (e.track_type === 'cardio' || e.track_type === 'floors') {
    return '숨이 조금 찰 정도가 좋습니다. 대화가 아예 불가능하면 너무 빠른 것입니다.';
  }
  if (e.track_type === 'duration') {
    return '시간을 늘리기보다 자세가 무너지지 않는 데까지만 버티세요.';
  }
  if (e.equipment === '머신') {
    return '의자와 패드 높이부터 몸에 맞추세요. 그것만으로 자극이 달라집니다.';
  }
  if (e.muscle_group === '복근') {
    return '반동으로 올리지 마세요. 느리게 할수록 잘 듣습니다.';
  }
  return '들어 올릴 때보다 내릴 때를 더 천천히 하세요. 거기서 근육이 자랍니다.';
}
