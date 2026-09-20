/**
 * How much a weight moves by, which depends on what is holding it.
 *
 * Under 20kg you are usually on dumbbells, which come in whole kilos. Above
 * it you are loading a bar, and the small plates come in 1.25kg pairs — so the
 * bar changes by 2.5 at a time and nothing in between exists on the rack.
 */
export const PLATE_THRESHOLD = 20;
export const DUMBBELL_STEP = 1;
export const PLATE_STEP = 2.5;

/** The step that applies when moving away from `value` in `direction`. */
export function weightStep(value: number, direction: 1 | -1) {
  // At exactly the threshold, going up loads a bar and going down picks up a
  // dumbbell, so the boundary reads the same from either side.
  const leaving = direction === 1 ? value : value - 0.001;
  return leaving >= PLATE_THRESHOLD ? PLATE_STEP : DUMBBELL_STEP;
}

/**
 * The nearest weight that actually exists, at that size.
 *
 * The fine steps have always known the grid; the coarse ±10 did not, and it
 * is the one that moves between the two halves of the scale. From 11kg, +10
 * landed on 21 — a number no rack makes — and from there every 2.5 kept the
 * error: 23.5, 26, 28.5. The numbers on screen stopped being weights and
 * became arithmetic.
 *
 * Crossing upward lands on 20 rather than overshooting to 22.5, which is the
 * same rule the downward step has always followed at that boundary: the
 * threshold is a real place on the scale and both directions stop there.
 */
export function onRack(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < PLATE_THRESHOLD) return Math.round(value);
  const step = Math.round(value / PLATE_STEP) * PLATE_STEP;
  return Math.max(PLATE_THRESHOLD, Number(step.toFixed(2)));
}

/**
 * The next weight up or down. A step down from just above the threshold lands
 * on it rather than overshooting into a number no rack can make.
 */
export function nextWeight(value: number, direction: 1 | -1) {
  const step = weightStep(value, direction);
  const next = value + step * direction;
  if (direction === -1 && value > PLATE_THRESHOLD && next < PLATE_THRESHOLD) {
    return PLATE_THRESHOLD;
  }
  return Math.max(0, Number(next.toFixed(2)));
}
