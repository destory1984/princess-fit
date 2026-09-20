/**
 * Turning a database complaint into something a person can act on.
 *
 * PostgREST answers a request for a column it does not know about with
 * 「Could not find the 'hidden' column of 'exercises' in the schema cache」,
 * and that went straight to the screen under the heading 저장 실패. It is an
 * accurate sentence that tells the reader nothing they can do.
 *
 * It has one cause worth naming: the app has been updated and the database
 * has not — or it has, and the cache in front of it has not noticed yet. Both
 * are fixed by one person running one statement, so the message says so
 * rather than quoting the machine.
 */

const MISSING_COLUMN = /Could not find the '(\w+)' column of '(\w+)'/;

export function explain(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const missing = MISSING_COLUMN.exec(raw);
  if (missing) {
    const [, column, table] = missing;
    return (
      `앱이 ${table}.${column} 칸을 찾는데 데이터베이스에 아직 없어요.\n\n` +
      'supabase/migrate.sql을 실행한 뒤,\n' +
      "notify pgrst, 'reload schema'; 도 한 번 실행해 주세요."
    );
  }
  // Anything else is passed through: a made-up explanation is worse than a
  // raw one, because it sends people looking in the wrong place.
  return raw;
}
