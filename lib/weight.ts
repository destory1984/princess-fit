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
