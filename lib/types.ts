import type { Condition } from './condition.ts';

/** weight_reps: kg × 횟수 · duration: 시간만 · cardio: 시간 + 거리 */
export type TrackType = 'weight_reps' | 'duration' | 'cardio';

export const TRACK_TYPE_LABEL: Record<TrackType, string> = {
  weight_reps: '무게 × 횟수',
  duration: '시간',
  cardio: '시간 + 거리',
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  secondary_group: string | null;
  equipment: string;
  muscle_detail: string;
  body_parts: string;
  track_type: TrackType;
  /** Seconds of rest after a set of this exercise. */
  rest_sec: number;
  /** Starred, so it sorts to the top of the picker. */
  favourite: boolean;
  /**
   * Put away: still yours, still in your history, just not offered.
   *
   * Not deleted, because deleting takes the sets with it — and 「이 종목은 다시
   * 안 해요」 is not the same sentence as 「이 종목을 한 적이 없어요」. Rows made
   * before this column exists come back without it, so every reader must treat
   * a missing value as false.
   */
  hidden?: boolean;
  how_to: string;
  created_at: string;
};

export type Routine = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
};

export type Workout = {
  id: string;
  user_id: string;
  routine_id: string | null;
  title: string;
  started_at: string;
  ended_at: string | null;
  memo: string | null;
  /** How the body felt that day, or null for a session recorded before asking. */
  condition: Condition | null;
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  set_no: number;
  weight_kg: number;
  reps: number;
  duration_sec: number;
  distance_km: number;
  done: boolean;
};

export const MUSCLE_GROUPS = [
  '가슴',
  '등',
  '어깨',
  '하체',
  '팔',
  '복근',
  '유산소',
  '기타',
] as const;

export const EQUIPMENT = ['바벨', '덤벨', '머신', '케이블', '맨몸', '기타'] as const;

