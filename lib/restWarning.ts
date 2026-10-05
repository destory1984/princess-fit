/*
  When the warning before the end of a rest is due. Apart from `./bell`, which
  makes the sound and so needs a browser: this is a plain rule the tests can run.
*/

/**
 * How long before the end of a rest the warning comes: long enough to put the
 * phone down, chalk up and get under the bar.
 */
export const WARN_SECONDS = 10;

/**
 * Whether the warning is due. Not for a rest too short to need one — in a
 * twenty second rest it would come halfway through — and never twice.
 */
export function warningDue(remainingMs: number, lengthSeconds: number, warned: boolean) {
  if (warned || lengthSeconds < WARN_SECONDS * 3) return false;
  return remainingMs > 0 && remainingMs <= WARN_SECONDS * 1000;
}
