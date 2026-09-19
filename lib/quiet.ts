/**
 * Hours when she should keep quiet.
 *
 * This covers the messages she starts — her daily line, leaving for and coming
 * back from a lesson. It deliberately does not cover the rest timer: that bell
 * was asked for a minute earlier by someone standing in a gym, and silencing
 * an alarm you just set would be the app deciding it knows better.
 */

export const DEFAULT_QUIET_FROM = 22;
export const DEFAULT_QUIET_TO = 7;

/** Whether an hour falls inside the quiet window, which usually wraps midnight. */
export function isQuiet(hour: number, from: number, to: number) {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

/**
 * The first hour at or after `hour` that is not quiet. Used to push a message
 * forward rather than drop it: she still says she is back from her lesson,
 * just at breakfast instead of at three in the morning.
 */
export function nextAudibleHour(hour: number, from: number, to: number) {
  if (!isQuiet(hour, from, to)) return hour;
  return to % 24;
}

/** Move a moment out of the quiet window, keeping its minute. */
export function whenAudible(at: Date, from: number, to: number) {
  if (!isQuiet(at.getHours(), from, to)) return at;

  const moved = new Date(at);
  moved.setHours(to % 24, 0, 0, 0);
  // Quiet spans midnight, so the end may be tomorrow morning rather than today.
  if (moved <= at) moved.setDate(moved.getDate() + 1);
  return moved;
}
