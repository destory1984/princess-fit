/**
 * Ready-made routines for someone who has never written one.
 *
 * A blank routine screen asks a beginner the one question they cannot answer:
 * what should I do? These are the answers most gyms would give — machine and
 * dumbbell work over barbells, whole-body before splits, and few enough
 * movements to finish in an hour.
 *
 * Exercises are named rather than referenced by id, because the catalogue is
 * seeded per account: a preset picks whichever of its names that account
 * actually has, and skips the rest instead of failing.
 */

export type RoutinePreset = {
  id: string;
  name: string;
  /** Who it is for, in one line. */
  detail: string;
  /** Roughly how long, for planning a week around it. */
  minutes: number;
  days: string;
  exercises: { name: string; sets: number; reps: number }[];
};

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'full-body',
    name: '전신 입문',
    detail: '처음이라면 이것부터. 온몸을 한 번에 쓰고 주 2~3회면 충분해요.',
    minutes: 45,
    days: '주 2~3회',
    exercises: [
      { name: '레그 프레스', sets: 3, reps: 12 },
      { name: '체스트 프레스 머신', sets: 3, reps: 12 },
      { name: '랫 풀다운', sets: 3, reps: 12 },
      { name: '덤벨 숄더 프레스', sets: 3, reps: 12 },
      { name: '플랭크', sets: 3, reps: 0 },
    ],
  },
  {
    id: 'upper-lower-a',
    name: '상체 날',
    detail: '상하체를 나눠 하는 날. 아래와 번갈아 하세요.',
    minutes: 50,
    days: '주 2회',
    exercises: [
      { name: '덤벨 프레스', sets: 4, reps: 10 },
      { name: '시티드 로우', sets: 4, reps: 10 },
      { name: '사이드 레터럴 레이즈', sets: 3, reps: 15 },
      { name: '덤벨 컬', sets: 3, reps: 12 },
      { name: '트라이셉스 푸시다운', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'upper-lower-b',
    name: '하체 날',
    detail: '상체 날과 짝을 이루는 하루. 다리와 엉덩이 위주예요.',
    minutes: 45,
    days: '주 2회',
    exercises: [
      { name: '스쿼트', sets: 4, reps: 10 },
      { name: '루마니안 데드리프트', sets: 3, reps: 10 },
      { name: '레그 컬', sets: 3, reps: 12 },
      { name: '카프 레이즈', sets: 3, reps: 15 },
      { name: '크런치', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'home',
    name: '집에서 맨몸',
    detail: '기구 없이. 출장이나 쉬는 날에도 할 수 있어요.',
    minutes: 25,
    days: '아무 때나',
    exercises: [
      { name: '푸시업', sets: 3, reps: 10 },
      { name: '스쿼트', sets: 3, reps: 15 },
      { name: '런지', sets: 3, reps: 12 },
      { name: '플랭크', sets: 3, reps: 0 },
      { name: '걷기', sets: 1, reps: 0 },
    ],
  },
];

export function presetById(id: string) {
  return ROUTINE_PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * Match a preset's named exercises against the ones this account has.
 * Anything missing is reported rather than silently dropped, so the screen can
 * say "두 개는 종목에 없어서 빠졌어요" instead of quietly building a shorter
 * routine than the card promised.
 */
export function resolvePreset<T extends { id: string; name: string }>(
  preset: RoutinePreset,
  catalogue: T[]
) {
  const byName = new Map(catalogue.map((e) => [e.name, e]));
  const found: { exercise: T; sets: number; reps: number }[] = [];
  const missing: string[] = [];

  for (const wanted of preset.exercises) {
    const match = byName.get(wanted.name);
    if (match) found.push({ exercise: match, sets: wanted.sets, reps: wanted.reps });
    else missing.push(wanted.name);
  }
  return { found, missing };
}
