export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string;
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
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  set_no: number;
  weight_kg: number;
  reps: number;
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
