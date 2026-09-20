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
 * Only set edits belong here, and that is a deliberate limit rather than a
 * stopping point. An edit names a row that already exists and sets fields on
 * it, so replaying it late lands exactly where it would have landed early, and
 * replaying it twice changes nothing. Creating a row offline would need an id
 * nobody has agreed on yet, and deleting one that was never created is a knot
 * this does not have to tie to be worth having.
 */

export type SetPatch = {
  weight_kg?: number;
  reps?: number;
  duration_sec?: number;
  distance_km?: number;
  done?: boolean;
};

/** One unsent edit. `at` is only for showing how long it has been waiting. */
export type PendingWrite = { setId: string; patch: SetPatch; at: string };

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
export function queue(pending: PendingWrite[], setId: string, patch: SetPatch, at: string) {
  const found = pending.findIndex((p) => p.setId === setId);
  if (found === -1) {
    return [...pending, { setId, patch, at }].slice(-MAX_PENDING);
  }
  const next = [...pending];
  next[found] = { setId, patch: { ...next[found].patch, ...patch }, at };
  return next;
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
  send: (setId: string, patch: SetPatch) => Promise<unknown>
): Promise<PendingWrite[]> {
  const sent: string[] = [];
  for (const write of pending) {
    try {
      await send(write.setId, write.patch);
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
          !!p && typeof p.setId === 'string' && !!p.patch && typeof p.patch === 'object'
      )
      .slice(-MAX_PENDING);
  } catch {
    // Storage that cannot be read is storage that is empty. Refusing to open
    // the workout screen over a corrupt queue would be the cure being worse.
    return [];
  }
}
