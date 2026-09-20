import { supabase } from './supabase';

/**
 * Asking for a movement the catalogue has not got.
 *
 * Seventy-one covers a gym and misses plenty — every machine with a brand
 * name on it, every movement somebody's coach taught them, everything a
 * particular sport does. Someone can already make one by hand, and that
 * solves it for them and for nobody else. This is the other half: the ones
 * worth adding for everyone arrive here, where they can be read.
 */

export type RequestStatus = 'new' | 'seen' | 'added' | 'declined';

export type ExerciseRequest = {
  id: string;
  user_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  note: string | null;
  status: RequestStatus;
  reply: string | null;
  created_at: string;
  handled_at: string | null;
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: '기다리는 중',
  seen: '읽었어요',
  added: '넣었어요',
  declined: '이번엔 못 넣었어요',
};

export async function sendExerciseRequest(input: {
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  note?: string | null;
}) {
  const { data } = await supabase.auth.getSession();
  const user_id = data.session?.user.id;
  if (!user_id) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase.from('exercise_requests').insert({
    user_id,
    name: input.name.trim(),
    muscle_group: input.muscleGroup ?? null,
    equipment: input.equipment ?? null,
    note: input.note?.trim() || null,
  });
  if (error) throw error;
}

/** What this account has asked for, newest first. */
export async function listMyRequests(): Promise<ExerciseRequest[]> {
  const { data, error } = await supabase
    .from('exercise_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ExerciseRequest[];
}

export async function withdrawRequest(id: string) {
  const { error } = await supabase.from('exercise_requests').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Whether this account can read the desk.
 *
 * Asked of the database rather than of a name in the app, because the answer
 * has to be the same one row level security will give — a screen that shows
 * itself and then cannot load anything is worse than one that stays hidden.
 *
 * False on any error, including being signed out. Failing closed is the only
 * safe direction for a question like this.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const user_id = data.session?.user.id;
    if (!user_id) return false;
    const { data: rows, error } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user_id)
      .limit(1);
    if (error) return false;
    return (rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
