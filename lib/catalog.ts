import { supabase } from './supabase';
import { listExercises } from './db';
import type { TrackType } from './types';
import { HOW_TO } from './howTo';

export type CatalogEntry = {
  name: string;
  muscle_group: string;
  secondary_group: string | null;
  equipment: string;
  muscle_detail: string;
  body_parts: string;
  track_type: TrackType;
  how_to: string;
};

const ENTRIES: Omit<CatalogEntry, 'how_to'>[] = [
  { name: '벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '바벨', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps,deltoids' , track_type: 'weight_reps' },
  { name: '인클라인 벤치프레스', muscle_group: '가슴', secondary_group: '어깨', equipment: '바벨', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids,triceps' , track_type: 'weight_reps' },
  { name: '덤벨 프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '덤벨', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '체스트 프레스 머신', muscle_group: '가슴', secondary_group: '팔', equipment: '머신', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '케이블 크로스오버', muscle_group: '가슴', secondary_group: null, equipment: '케이블', muscle_detail: '대흉근', body_parts: 'chest' , track_type: 'weight_reps' },
  { name: '푸시업', muscle_group: '가슴', secondary_group: '팔', equipment: '맨몸', muscle_detail: '대흉근, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },

  { name: '데드리프트', muscle_group: '등', secondary_group: '하체', equipment: '바벨', muscle_detail: '척추기립근, 둔근, 햄스트링', body_parts: 'lower-back,gluteal,hamstring,trapezius' , track_type: 'weight_reps' },
  { name: '바벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '바벨', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius,biceps' , track_type: 'weight_reps' },
  { name: '랫 풀다운', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '시티드 로우', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius' , track_type: 'weight_reps' },
  { name: '풀업', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '원암 덤벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '광배근', body_parts: 'upper-back' , track_type: 'weight_reps' },

  { name: '오버헤드 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '바벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '덤벨 숄더 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '덤벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '사이드 레터럴 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '덤벨', muscle_detail: '삼각근 측면', body_parts: 'deltoids' , track_type: 'weight_reps' },
  { name: '페이스 풀', muscle_group: '어깨', secondary_group: '등', equipment: '케이블', muscle_detail: '후면 삼각근, 승모근', body_parts: 'deltoids,trapezius' , track_type: 'weight_reps' },
  { name: '리어 델트 플라이', muscle_group: '어깨', secondary_group: '등', equipment: '덤벨', muscle_detail: '후면 삼각근', body_parts: 'deltoids,upper-back' , track_type: 'weight_reps' },

  { name: '스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '바벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '레그 프레스', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '런지', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '레그 익스텐션', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두', body_parts: 'quadriceps' , track_type: 'weight_reps' },
  { name: '레그 컬', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '햄스트링', body_parts: 'hamstring' , track_type: 'weight_reps' },
  { name: '루마니안 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '햄스트링, 둔근', body_parts: 'hamstring,gluteal,lower-back' , track_type: 'weight_reps' },
  { name: '힙 쓰러스트', muscle_group: '하체', secondary_group: null, equipment: '바벨', muscle_detail: '둔근', body_parts: 'gluteal' , track_type: 'weight_reps' },
  { name: '카프 레이즈', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '종아리', body_parts: 'calves' , track_type: 'weight_reps' },

  { name: '바벨 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '덤벨 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '해머 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두, 전완', body_parts: 'biceps,forearm' , track_type: 'weight_reps' },
  { name: '트라이셉스 푸시다운', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '오버헤드 트라이셉스 익스텐션', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '딥스', muscle_group: '팔', secondary_group: '가슴', equipment: '맨몸', muscle_detail: '삼두, 대흉근 하부', body_parts: 'triceps,chest' , track_type: 'weight_reps' },

  { name: '크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '윗몸 일으키기', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '레그 레이즈', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '하복부', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '행잉 레그 레이즈', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '하복부', body_parts: 'abs' , track_type: 'weight_reps' },
  { name: '바이시클 크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 복사근', body_parts: 'abs,obliques' , track_type: 'weight_reps' },
  { name: '러시안 트위스트', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복사근', body_parts: 'obliques' , track_type: 'weight_reps' },
  { name: '마운틴 클라이머', muscle_group: '복근', secondary_group: '유산소', equipment: '맨몸', muscle_detail: '복직근, 심폐', body_parts: 'abs,quadriceps' , track_type: 'weight_reps' },
  { name: '플랭크', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 코어', body_parts: 'abs,obliques' , track_type: 'duration' },

  { name: '인클라인 덤벨 프레스', muscle_group: '가슴', secondary_group: '어깨', equipment: '덤벨', muscle_detail: '대흉근 상부, 삼각근', body_parts: 'chest,deltoids' , track_type: 'weight_reps' },
  { name: '디클라인 벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '바벨', muscle_detail: '대흉근 하부, 삼두', body_parts: 'chest,triceps' , track_type: 'weight_reps' },
  { name: '펙덱 플라이', muscle_group: '가슴', secondary_group: null, equipment: '머신', muscle_detail: '대흉근', body_parts: 'chest' , track_type: 'weight_reps' },

  { name: '친업', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 이두', body_parts: 'upper-back,biceps' , track_type: 'weight_reps' },
  { name: '티바 로우', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 승모근', body_parts: 'upper-back,trapezius,biceps' , track_type: 'weight_reps' },
  { name: '백 익스텐션', muscle_group: '등', secondary_group: '하체', equipment: '맨몸', muscle_detail: '척추기립근, 둔근', body_parts: 'lower-back,gluteal' , track_type: 'weight_reps' },
  { name: '슈러그', muscle_group: '등', secondary_group: null, equipment: '덤벨', muscle_detail: '승모근', body_parts: 'trapezius' , track_type: 'weight_reps' },

  { name: '아놀드 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '덤벨', muscle_detail: '삼각근, 삼두', body_parts: 'deltoids,triceps' , track_type: 'weight_reps' },
  { name: '업라이트 로우', muscle_group: '어깨', secondary_group: '등', equipment: '바벨', muscle_detail: '삼각근, 승모근', body_parts: 'deltoids,trapezius' , track_type: 'weight_reps' },
  { name: '프론트 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '덤벨', muscle_detail: '전면 삼각근', body_parts: 'deltoids' , track_type: 'weight_reps' },

  { name: '불가리안 스플릿 스쿼트', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '스텝업', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal' , track_type: 'weight_reps' },
  { name: '점프 스쿼트', muscle_group: '하체', secondary_group: '유산소', equipment: '맨몸', muscle_detail: '대퇴사두, 둔근', body_parts: 'quadriceps,gluteal,calves' , track_type: 'weight_reps' },
  { name: '월 싯', muscle_group: '하체', secondary_group: null, equipment: '맨몸', muscle_detail: '대퇴사두', body_parts: 'quadriceps' , track_type: 'duration' },
  { name: '케틀벨 스윙', muscle_group: '하체', secondary_group: '등', equipment: '기타', muscle_detail: '둔근, 햄스트링', body_parts: 'gluteal,hamstring,lower-back' , track_type: 'weight_reps' },

  { name: '프리처 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '케이블 컬', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '이두', body_parts: 'biceps' , track_type: 'weight_reps' },
  { name: '트라이셉스 킥백', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '삼두', body_parts: 'triceps' , track_type: 'weight_reps' },
  { name: '리버스 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '전완, 이두', body_parts: 'forearm,biceps' , track_type: 'weight_reps' },

  { name: '러닝', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,calves' , track_type: 'cardio' },
  { name: '걷기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,calves' , track_type: 'cardio' },
  { name: '줄넘기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 종아리', body_parts: 'calves,quadriceps' , track_type: 'duration' },
  { name: '계단 오르기', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 둔근', body_parts: 'gluteal,quadriceps' , track_type: 'cardio' },
  { name: '버피', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '전신, 심폐', body_parts: 'quadriceps,chest,abs' , track_type: 'weight_reps' },
  { name: '수영', muscle_group: '유산소', secondary_group: '등', equipment: '맨몸', muscle_detail: '전신, 심폐', body_parts: 'upper-back,deltoids' , track_type: 'cardio' },
  { name: '사이클', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 대퇴사두', body_parts: 'quadriceps' , track_type: 'cardio' },
  { name: '일립티컬', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 하체', body_parts: 'quadriceps,gluteal' , track_type: 'cardio' },
  { name: '로잉 머신', muscle_group: '유산소', secondary_group: '등', equipment: '머신', muscle_detail: '심폐, 광배근', body_parts: 'upper-back,quadriceps' , track_type: 'cardio' },
];

/**
 * Adds any missing default exercises and backfills catalog metadata onto rows
 * that predate it, matched by name. Rows the user has already annotated are
 * left alone.
 */
export const DEFAULT_EXERCISES: CatalogEntry[] = ENTRIES.map((e) => ({
  ...e,
  how_to: HOW_TO[e.name] ?? '',
}));

export async function seedDefaultExercises() {
  const { data: userData } = await supabase.auth.getSession();
  const userId = userData.session?.user.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const existing = await listExercises();
  const byName = new Map(existing.map((e) => [e.name, e]));

  const inserts = DEFAULT_EXERCISES.filter((e) => !byName.has(e.name)).map((e) => ({
    ...e,
    user_id: userId,
  }));
  if (inserts.length) {
    const { error } = await supabase.from('exercises').insert(inserts);
    if (error) throw error;
  }

  const stale = DEFAULT_EXERCISES.flatMap((entry) => {
    const row = byName.get(entry.name);
    const stale = row && (!row.body_parts || (!row.how_to && entry.how_to));
    return stale ? [{ id: row.id, entry }] : [];
  });
  await Promise.all(
    stale.map(({ id, entry }) =>
      supabase
        .from('exercises')
        .update({
          muscle_group: entry.muscle_group,
          secondary_group: entry.secondary_group,
          equipment: entry.equipment,
          muscle_detail: entry.muscle_detail,
          body_parts: entry.body_parts,
          track_type: entry.track_type,
          how_to: entry.how_to,
        })
        .eq('id', id)
    )
  );

  return { added: inserts.length, updated: stale.length };
}
