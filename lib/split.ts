/**
 * Which routine to offer next.
 *
 * The home screen's second button used to offer the routine you did last time,
 * which is right for one person and wrong for the other. Someone with a single
 * routine wants it again. Someone running 상체 날 / 하체 날 wants the *other*
 * one — offering what they finished yesterday is the app failing to notice a
 * split it can plainly see. A UX study of a much larger workout app reached the
 * same place from the other end: 「운동 부위 보다는 DAY A, B가 더 사용하기 편함」.
 *
 * One rule covers both: offer whichever routine has gone longest without being
 * done. With one routine that is the same routine; with two it alternates; with
 * three it rotates. Nothing has to be declared a split, and nothing breaks when
 * a week is skipped or a day is done out of order.
 *
 * Only recent use counts. A routine made once and abandoned would otherwise win
 * forever on the strength of never having been done, and the button would point
 * at the one thing you have decided against.
 */

export const SPLIT_WINDOW_DAYS = 30;

/** A routine and the day it was last finished, as a YYYY-MM-DD key. */
export type RoutineUse = { routineId: string; lastOn: string };

/**
 * The routine to put on the button, or null when nothing recent qualifies —
 * a first-time user, or a month away. The caller decides what to show then;
 * this does not invent a routine nobody has run.
 */
export function nextInSplit(uses: RoutineUse[], routineIds: string[]): string | null {
  const alive = new Set(routineIds);
  // Oldest first, so a routine deleted and its history left behind is skipped
  // rather than offered.
  const recent = uses.filter((use) => alive.has(use.routineId));
  if (recent.length === 0) return null;

  // Ties broken by id so the same history always produces the same button:
  // two routines last done on the same day must not swap places on each load.
  const sorted = [...recent].sort(
    (a, b) => a.lastOn.localeCompare(b.lastOn) || a.routineId.localeCompare(b.routineId)
  );
  return sorted[0].routineId;
}

/**
 * Whether this is a turn in a rotation rather than a repeat, which is the only
 * case worth saying out loud — 「다음 차례」 over a single routine would be
 * calling a habit a schedule.
 */
export function isRotation(uses: RoutineUse[], routineIds: string[]) {
  const alive = new Set(routineIds);
  const ids = new Set(uses.filter((u) => alive.has(u.routineId)).map((u) => u.routineId));
  return ids.size >= 2;
}

/**
 * The routines in the order they are worth looking at.
 *
 * From the reviews of another app: 「홈 화면에서 내 루틴을 오래된 순으로
 * 나열하기도 있으면 좋겠습니다. 현재는 시간순이 최근순 밖에 없어서
 * 아쉽습니다」 — which is really 「내가 찾는 걸 못 찾겠다」 wearing a request
 * for a sort menu.
 *
 * So no menu. One rule: most recently used first, and a routine never used
 * counts as used on the day it was made. A routine created a minute ago sits
 * near the top where its owner expects it, and one untouched since March
 * sinks — without anyone having to choose an ordering, or discover that they
 * could.
 */
export function byLastUsed<T extends { id: string; name: string; created_at: string }>(
  routines: T[],
  lastDone: Map<string, string>
): T[] {
  const when = (r: T) => lastDone.get(r.id) ?? r.created_at;
  // Ties broken by name so the same set of routines always lists the same
  // way — two made in the same second must not swap places on each load.
  return [...routines].sort(
    (a, b) => when(b).localeCompare(when(a)) || a.name.localeCompare(b.name)
  );
}
