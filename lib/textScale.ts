/**
 * How large the app's text is drawn, as a percentage chosen on the settings
 * screen. 100 is the size the screens were laid out at.
 *
 * The range stops at 140. Past that the fixed parts of a screen (the stat
 * plaque, a row of four buttons on the rest bar) no longer hold their words,
 * and a setting that breaks the screen it sits on is not a setting.
 */
export const MIN_TEXT_SCALE = 80;
export const MAX_TEXT_SCALE = 140;
export const TEXT_SCALE_STEP = 5;
export const DEFAULT_TEXT_SCALE = 100;

/** The numbers written under the slider. */
export const TEXT_SCALE_MARKS = [80, 100, 120, 140];

/** Onto the nearest step, inside the range. */
export function clampTextScale(percent: number) {
  if (!Number.isFinite(percent)) return DEFAULT_TEXT_SCALE;
  const stepped = Math.round(percent / TEXT_SCALE_STEP) * TEXT_SCALE_STEP;
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, stepped));
}

/** What was stored, or the default if nothing usable was. */
export function textScaleOf(stored: string | null | undefined) {
  if (stored === null || stored === undefined || stored.trim() === '') return DEFAULT_TEXT_SCALE;
  return clampTextScale(Number(stored));
}

/** A size in points at this percentage. Whole points: half points blur on some screens. */
export function scaledSize(size: number, percent: number) {
  return percent === 100 ? size : Math.round((size * percent) / 100);
}

/**
 * Where along a slider a touch is, as a value on its steps.
 * `at` is the touch's distance from the track's left edge, `width` the track's.
 */
export function valueAt(at: number, width: number, min: number, max: number, step: number) {
  if (width <= 0) return min;
  const along = Math.min(1, Math.max(0, at / width));
  const raw = min + along * (max - min);
  return Math.min(max, Math.max(min, Math.round(raw / step) * step));
}
