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
  /**
   * Done one side at a time — or unsaid, which is not the same as no.
   *
   * Three states, and the third is the point. Null means nobody has decided,
   * so the name decides (see `lib/sides.ts`); false means someone turned it
   * off and does not want to be asked again. Collapsing the two would either
   * lose the seven built-ins the moment this column exists, or reinstate the
   * question for the person who said no to it.
   */
  unilateral?: boolean | null;
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
  /**
   * What was said after this session, kept with the session it was about.
   *
   * It used to live only in the phone's own storage, which meant it was gone
   * on a new device and invisible to anyone looking at how the advice is
   * actually turning out. Whether it came from the model or the rules is kept
   * beside it, because the two are worth telling apart when reading them back.
   */
  advice?: string | null;
  advice_source?: string | null;
  /**
   * Which girl said it. She can be changed at any time, and a line in one
   * girl's voice under another girl's name is the wrong girl talking — so a
   * mismatch means it is asked again rather than shown.
   */
  advice_speaker?: string | null;
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
  /**
   * When this set was marked done.
   *
   * The session's real end, because pressing 운동 종료 is something people do
   * on the way out of the building — or the next morning. Null on rows made
   * before the column, and on sets not yet done.
   */
  done_at?: string | null;
  /**
   * Which side this set was done on, for movements done one limb at a time.
   *
   * Null on everything else, and on rows made before the column — both of
   * which mean the same thing: the question does not apply here.
   */
  side?: 'L' | 'R' | null;
  /**
   * Done to get warm rather than to count.
   *
   * Kept out of the volume, out of the records and out of the reading that
   * decides next week's weight. Optional, so rows made before the column
   * exists read as working sets — which is what they were.
   */
  warmup?: boolean;
  /**
   * Reps they felt were left when the set was racked, if they were asked.
   *
   * Optional and nullable, and those mean the same thing here: nobody said.
   * A zero is an answer — 「더 못 해요」 — so it must never stand in for silence.
   */
  rir?: number | null;
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

