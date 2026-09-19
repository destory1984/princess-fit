import { supabase } from './supabase';
import { listExercises } from './db';
import { DEFAULT_EXERCISES } from './exerciseCatalog';

export type { CatalogEntry } from './exerciseCatalog';
export { DEFAULT_EXERCISES } from './exerciseCatalog';

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
