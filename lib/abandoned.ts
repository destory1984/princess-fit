/**
 * A session nobody finished.
 *
 * Pressing 운동 완료 is the only thing that closes a workout, and people walk
 * out of the gym without pressing it. The session then stays 「진행 중」 for
 * ever — yesterday's workout still running today, which cannot be true, and
 * which also blocks starting a new one.
 *
 * Judged by the last thing that happened in it, not by when it began: a
 * Tuesday session being written up on Friday has sets ticked on Friday and
 * is very much in progress. Twelve hours is longer than any workout and
 * shorter than a night's sleep, so the one forgotten last night is closed by
 * morning and the one under way over midnight is not.
 */

export const ABANDONED_AFTER_MS = 12 * 60 * 60 * 1000;

export type OpenSession = { started_at: string; lastDoneAt: string | null };

export function isAbandoned(s: OpenSession, now: Date): boolean {
  const last = Date.parse(s.lastDoneAt ?? s.started_at);
  return now.getTime() - last > ABANDONED_AFTER_MS;
}

/**
 * When an abandoned session ended: at its last set, which is when the
 * training stopped. One with no sets ends where it began — how long nothing
 * took is not a number anybody recorded.
 */
export function abandonedEnd(s: OpenSession): string {
  return s.lastDoneAt ?? s.started_at;
}
