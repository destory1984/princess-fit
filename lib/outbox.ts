/**
 * Writes that have not landed yet.
 *
 * Every set is saved the moment it is typed, straight to the server, and the
 * gym is in a basement. When the write failed the screen said 「저장 실패」 and
 * then reloaded — which replaced the numbers just typed with the server's
 * older ones. The reload was meant to keep the screen honest; what it actually
 * did was throw away the only copy of the work.
 *
 * So failed writes are kept instead. They sit in a queue that survives the app
 * being closed, and go out when the signal comes back. Nothing is lost by
 * walking into a basement, which is where the work happens.
 *
 * Edits and additions both. An edit names a row that already exists, so
 * replaying it late lands where it would have landed early and replaying it
 * twice changes nothing. An addition is only harder if the id has to come from
 * the server — and it does not. The column is a uuid with a default, so the
 * client can name the row first and every edit that follows has something to
 * point at. That is the whole trick, and without it a set added in a basement
 * has no name until the signal returns.
 *
 * Deleting is still not queued. A set deleted offline that was also created
 * offline should simply never be sent, and one deleted offline that exists on
 * the server is a row that will come back on the next reload until it goes —
 * a knot worth tying only if anyone ever pulls on it.
 */

export type SetPatch = {
  weight_kg?: number;
  reps?: number;
  duration_sec?: number;
  distance_km?: number;
  done?: boolean;
  rir?: number | null;
  warmup?: boolean;
  side?: 'L' | 'R' | null;
  done_at?: string | null;
};

/** The columns a set needs before it can exist at all. */
export type NewSetRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  set_no: number;
};

/**
 * One unsent write. `at` is only for showing how long it has been waiting.
 *
 * With a `row` it is a set that does not exist on the server yet, and the
 * whole row goes out. Without one it is an edit to a set that does. The id is
 * made here in both cases — the column is a uuid with a default, so a client
 * that brings its own is not fighting the database for the right to name a
 * row, it is simply naming it first. That is what makes a set added in a
 * basement referable by every edit that follows it.
 */
export type PendingWrite = {
  setId: string;
  patch: SetPatch;
  at: string;
  row?: NewSetRow;
};

/**
 * A queue that never grows without bound. A phone left offline for a week
 * would otherwise fill its storage with edits to one workout, and the oldest
 * of those have already been overwritten by the newest.
 */
export const MAX_PENDING = 200;

/**
 * Add an edit, folding it into the one already waiting for that set.
 *
 * Coalescing rather than appending, because these are field assignments and
 * not increments: typing 40 then 45 then 50 into one box is one write of 50,
 * and sending all three would be three chances to fail for one result.
 *
 * Position is kept from the first sighting, so the order edits were made in
 * survives — two sets of the same exercise must go out in the order they were
 * finished, or a later reload shows them the wrong way round.
 */
export function queue(
  pending: PendingWrite[],
  setId: string,
  patch: SetPatch,
  at: string,
  row?: NewSetRow
) {
  const found = pending.findIndex((p) => p.setId === setId);
  if (found === -1) {
    return [...pending, { setId, patch, at, ...(row ? { row } : {}) }].slice(-MAX_PENDING);
  }
  const next = [...pending];
  // A set queued for creation stays queued for creation, however many edits
  // land on it afterwards. They fold into the row that has yet to be born, so
  // what finally goes out is one insert carrying every number — not an insert
  // followed by three updates, each of which could fail on its own.
  next[found] = {
    setId,
    patch: { ...next[found].patch, ...patch },
    at,
    ...(next[found].row || row ? { row: next[found].row ?? row } : {}),
  };
  return next;
}

/**
 * The sets that exist only in the queue, as rows the board can show.
 *
 * A set added offline is not in anything the server returns, so laying edits
 * over the server's rows is not enough — there is no row underneath. These are
 * appended, or adding a set in a basement would make it vanish the moment the
 * screen reloaded, which is the same bug in a new place.
 */
export function pendingRows(pending: PendingWrite[]) {
  return pending
    .filter((p): p is PendingWrite & { row: NewSetRow } => !!p.row)
    .map((p) => ({
      ...p.row,
      weight_kg: 0,
      reps: 0,
      duration_sec: 0,
      distance_km: 0,
      done: false,
      ...p.patch,
    }));
}

/**
 * What a save for this set should actually put on the wire.
 *
 * Anything already queued for it has to go out with the new fields, or the
 * write lands alone and the older ones stay stale on the row — 50kg arrives
 * while the 10 reps typed beside it in the basement never does.
 */
export function mergedPatch(pending: PendingWrite[], setId: string, patch: SetPatch): SetPatch {
  return { ...pending.find((p) => p.setId === setId)?.patch, ...patch };
}

/**
 * Send what is waiting, oldest first, and return what is still waiting after.
 *
 * Stops at the first failure rather than pressing on. A failure here almost
 * always means no signal, and the rest would fail the same way — thirty doomed
 * requests would only spend the battery of someone mid-workout.
 */
export async function drain(
  pending: PendingWrite[],
  send: (setId: string, patch: SetPatch, row?: NewSetRow) => Promise<unknown>
): Promise<PendingWrite[]> {
  const sent: string[] = [];
  for (const write of pending) {
    try {
      await send(write.setId, write.patch, write.row);
      sent.push(write.setId);
    } catch {
      break;
    }
  }
  return settle(pending, sent);
}

/** Drop the ones that have now gone out, keeping everything else in order. */
export function settle(pending: PendingWrite[], sent: string[]) {
  const done = new Set(sent);
  return pending.filter((p) => !done.has(p.setId));
}

/**
 * What the screen should show, given what the server said and what has not
 * reached it yet.
 *
 * The reload after a failure is what lost the work, so this puts it back:
 * server rows first, then the unsent edits laid over them. A reload can then
 * be as aggressive as it likes without costing anyone a set.
 */
export function overlay<T extends { id: string }>(rows: T[], pending: PendingWrite[]): T[] {
  if (pending.length === 0) return rows;
  const patches = new Map(pending.map((p) => [p.setId, p.patch]));
  return rows.map((row) => {
    const patch = patches.get(row.id);
    return patch ? { ...row, ...patch } : row;
  });
}

/**
 * What to say about it, or nothing at all.
 *
 * Silence while everything is landing: a status line that is always there
 * stops being read, and the whole point is that a bad signal is not something
 * anyone should have to think about.
 */
export function pendingWord(pending: PendingWrite[]) {
  if (pending.length === 0) return null;
  return `아직 못 보낸 기록 ${pending.length}개 · 신호가 오면 보낼게요`;
}

/** Rows that survive a round trip through storage, dropping anything odd. */
export function parse(raw: string | null): PendingWrite[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is PendingWrite =>
          !!p &&
          typeof p.setId === 'string' &&
          !!p.patch &&
          typeof p.patch === 'object' &&
          // A row without the columns to insert with is worse than no row: it
          // would be retried forever against a database that keeps refusing it.
          (p.row === undefined ||
            (typeof p.row?.workout_id === 'string' && typeof p.row?.exercise_id === 'string'))
      )
      .slice(-MAX_PENDING);
  } catch {
    // Storage that cannot be read is storage that is empty. Refusing to open
    // the workout screen over a corrupt queue would be the cure being worse.
    return [];
  }
}
