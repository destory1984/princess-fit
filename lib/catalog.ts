import { supabase } from './supabase';
import { listExercises } from './db';

export type CatalogEntry = {
  name: string;
  muscle_group: string;
  secondary_group: string | null;
  equipment: string;
  muscle_detail: string;
};

export const DEFAULT_EXERCISES: CatalogEntry[] = [
  { name: '벤치프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '바벨', muscle_detail: '대흉근, 삼두' },
  { name: '인클라인 벤치프레스', muscle_group: '가슴', secondary_group: '어깨', equipment: '바벨', muscle_detail: '대흉근 상부, 삼각근' },
  { name: '덤벨 프레스', muscle_group: '가슴', secondary_group: '팔', equipment: '덤벨', muscle_detail: '대흉근, 삼두' },
  { name: '체스트 프레스 머신', muscle_group: '가슴', secondary_group: '팔', equipment: '머신', muscle_detail: '대흉근, 삼두' },
  { name: '케이블 크로스오버', muscle_group: '가슴', secondary_group: null, equipment: '케이블', muscle_detail: '대흉근' },
  { name: '푸시업', muscle_group: '가슴', secondary_group: '팔', equipment: '맨몸', muscle_detail: '대흉근, 삼두' },

  { name: '데드리프트', muscle_group: '등', secondary_group: '하체', equipment: '바벨', muscle_detail: '척추기립근, 둔근, 햄스트링' },
  { name: '바벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '바벨', muscle_detail: '광배근, 승모근' },
  { name: '랫 풀다운', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 이두' },
  { name: '시티드 로우', muscle_group: '등', secondary_group: '팔', equipment: '머신', muscle_detail: '광배근, 승모근' },
  { name: '풀업', muscle_group: '등', secondary_group: '팔', equipment: '맨몸', muscle_detail: '광배근, 이두' },
  { name: '원암 덤벨 로우', muscle_group: '등', secondary_group: '팔', equipment: '덤벨', muscle_detail: '광배근' },

  { name: '오버헤드 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '바벨', muscle_detail: '삼각근, 삼두' },
  { name: '덤벨 숄더 프레스', muscle_group: '어깨', secondary_group: '팔', equipment: '덤벨', muscle_detail: '삼각근, 삼두' },
  { name: '사이드 레터럴 레이즈', muscle_group: '어깨', secondary_group: null, equipment: '덤벨', muscle_detail: '삼각근 측면' },
  { name: '페이스 풀', muscle_group: '어깨', secondary_group: '등', equipment: '케이블', muscle_detail: '후면 삼각근, 승모근' },
  { name: '리어 델트 플라이', muscle_group: '어깨', secondary_group: '등', equipment: '덤벨', muscle_detail: '후면 삼각근' },

  { name: '스쿼트', muscle_group: '하체', secondary_group: '복근', equipment: '바벨', muscle_detail: '대퇴사두, 둔근' },
  { name: '레그 프레스', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두, 둔근' },
  { name: '런지', muscle_group: '하체', secondary_group: null, equipment: '덤벨', muscle_detail: '대퇴사두, 둔근' },
  { name: '레그 익스텐션', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '대퇴사두' },
  { name: '레그 컬', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '햄스트링' },
  { name: '루마니안 데드리프트', muscle_group: '하체', secondary_group: '등', equipment: '바벨', muscle_detail: '햄스트링, 둔근' },
  { name: '힙 쓰러스트', muscle_group: '하체', secondary_group: null, equipment: '바벨', muscle_detail: '둔근' },
  { name: '카프 레이즈', muscle_group: '하체', secondary_group: null, equipment: '머신', muscle_detail: '종아리' },

  { name: '바벨 컬', muscle_group: '팔', secondary_group: null, equipment: '바벨', muscle_detail: '이두' },
  { name: '덤벨 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두' },
  { name: '해머 컬', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '이두, 전완' },
  { name: '트라이셉스 푸시다운', muscle_group: '팔', secondary_group: null, equipment: '케이블', muscle_detail: '삼두' },
  { name: '오버헤드 트라이셉스 익스텐션', muscle_group: '팔', secondary_group: null, equipment: '덤벨', muscle_detail: '삼두' },
  { name: '딥스', muscle_group: '팔', secondary_group: '가슴', equipment: '맨몸', muscle_detail: '삼두, 대흉근 하부' },

  { name: '크런치', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근' },
  { name: '레그 레이즈', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '하복부' },
  { name: '플랭크', muscle_group: '복근', secondary_group: null, equipment: '맨몸', muscle_detail: '복직근, 코어' },

  { name: '러닝', muscle_group: '유산소', secondary_group: '하체', equipment: '맨몸', muscle_detail: '심폐, 하체' },
  { name: '사이클', muscle_group: '유산소', secondary_group: '하체', equipment: '머신', muscle_detail: '심폐, 대퇴사두' },
  { name: '로잉 머신', muscle_group: '유산소', secondary_group: '등', equipment: '머신', muscle_detail: '심폐, 광배근' },
];

export async function seedDefaultExercises() {
  const { data: userData } = await supabase.auth.getSession();
  const userId = userData.session?.user.id;
  if (!userId) throw new Error('로그인이 필요합니다.');

  const existing = new Set((await listExercises()).map((e) => e.name));
  const rows = DEFAULT_EXERCISES.filter((e) => !existing.has(e.name)).map((e) => ({
    ...e,
    user_id: userId,
  }));
  if (rows.length === 0) return 0;

  const { error } = await supabase.from('exercises').insert(rows);
  if (error) throw error;
  return rows.length;
}
