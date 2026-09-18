import { supabase } from './supabase';
import { listExercises } from './db';

export const DEFAULT_EXERCISES: { name: string; muscle_group: string }[] = [
  { name: '벤치프레스', muscle_group: '가슴' },
  { name: '인클라인 벤치프레스', muscle_group: '가슴' },
  { name: '덤벨 프레스', muscle_group: '가슴' },
  { name: '체스트 프레스 머신', muscle_group: '가슴' },
  { name: '케이블 크로스오버', muscle_group: '가슴' },
  { name: '푸시업', muscle_group: '가슴' },
  { name: '데드리프트', muscle_group: '등' },
  { name: '바벨 로우', muscle_group: '등' },
  { name: '랫 풀다운', muscle_group: '등' },
  { name: '시티드 로우', muscle_group: '등' },
  { name: '풀업', muscle_group: '등' },
  { name: '원암 덤벨 로우', muscle_group: '등' },
  { name: '오버헤드 프레스', muscle_group: '어깨' },
  { name: '덤벨 숄더 프레스', muscle_group: '어깨' },
  { name: '사이드 레터럴 레이즈', muscle_group: '어깨' },
  { name: '페이스 풀', muscle_group: '어깨' },
  { name: '리어 델트 플라이', muscle_group: '어깨' },
  { name: '스쿼트', muscle_group: '하체' },
  { name: '레그 프레스', muscle_group: '하체' },
  { name: '런지', muscle_group: '하체' },
  { name: '레그 익스텐션', muscle_group: '하체' },
  { name: '레그 컬', muscle_group: '하체' },
  { name: '루마니안 데드리프트', muscle_group: '하체' },
  { name: '힙 쓰러스트', muscle_group: '하체' },
  { name: '카프 레이즈', muscle_group: '하체' },
  { name: '바벨 컬', muscle_group: '팔' },
  { name: '덤벨 컬', muscle_group: '팔' },
  { name: '해머 컬', muscle_group: '팔' },
  { name: '트라이셉스 푸시다운', muscle_group: '팔' },
  { name: '오버헤드 트라이셉스 익스텐션', muscle_group: '팔' },
  { name: '딥스', muscle_group: '팔' },
  { name: '크런치', muscle_group: '복근' },
  { name: '레그 레이즈', muscle_group: '복근' },
  { name: '플랭크', muscle_group: '복근' },
  { name: '러닝', muscle_group: '유산소' },
  { name: '사이클', muscle_group: '유산소' },
  { name: '로잉 머신', muscle_group: '유산소' },
];

export async function seedDefaultExercises() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('로그인이 필요합니다.');

  const existing = new Set((await listExercises()).map((e) => e.name));
  const rows = DEFAULT_EXERCISES.filter((e) => !existing.has(e.name)).map((e) => ({
    ...e,
    user_id: userData.user!.id,
  }));
  if (rows.length === 0) return 0;

  const { error } = await supabase.from('exercises').insert(rows);
  if (error) throw error;
  return rows.length;
}
