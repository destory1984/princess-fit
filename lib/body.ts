/**
 * Body measurements over time.
 *
 * One reading a day at most: scales drift by a kilo across an afternoon, and
 * storing every weigh-in would turn a slow trend into noise. A second reading
 * on the same day replaces the first.
 */

export type BodyLog = {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_kg: number | null;
  height_cm: number | null;
};

export type BodyMetric = 'weight_kg' | 'body_fat_pct' | 'muscle_kg' | 'height_cm';

export const BODY_METRICS: Record<BodyMetric, { name: string; unit: string; decimals: number }> = {
  weight_kg: { name: '몸무게', unit: 'kg', decimals: 1 },
  body_fat_pct: { name: '체지방', unit: '%', decimals: 1 },
  muscle_kg: { name: '골격근량', unit: 'kg', decimals: 1 },
  height_cm: { name: '키', unit: 'cm', decimals: 1 },
};

export const BODY_METRIC_ORDER: BodyMetric[] = ['weight_kg', 'body_fat_pct', 'muscle_kg', 'height_cm'];

/** The most recent reading that actually has this measurement. */
export function latest(logs: BodyLog[], metric: BodyMetric) {
  const sorted = [...logs].sort((a, b) => b.measured_on.localeCompare(a.measured_on));
  return sorted.find((l) => l[metric] !== null)?.[metric] ?? null;
}

/**
 * How much a measurement has moved, and over what span.
 *
 * Deliberately not "since last time": two readings a day apart say nothing,
 * and a number that swings with every weigh-in is worse than none. This
 * compares against the oldest reading inside the window.
 */
export function change(logs: BodyLog[], metric: BodyMetric, days = 30, today = new Date()) {
  const since = new Date(today);
  since.setDate(since.getDate() - days);
  const key = since.toISOString().slice(0, 10);

  const inWindow = logs
    .filter((l) => l[metric] !== null && l.measured_on >= key)
    .sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  if (inWindow.length < 2) return null;

  const first = inWindow[0][metric]!;
  const last = inWindow[inWindow.length - 1][metric]!;
  return {
    delta: Math.round((last - first) * 10) / 10,
    from: inWindow[0].measured_on,
    to: inWindow[inWindow.length - 1].measured_on,
  };
}

/** Readings with this measurement, oldest first, ready to plot. */
export function series(logs: BodyLog[], metric: BodyMetric) {
  return logs
    .filter((l) => l[metric] !== null)
    .sort((a, b) => a.measured_on.localeCompare(b.measured_on))
    .map((l) => ({ label: l.measured_on.slice(5), value: l[metric]! }));
}

/**
 * Turn what was typed into the three boxes into something to save.
 *
 * Blank boxes are left out rather than saved as nothing, so weighing in
 * without the body-fat scale keeps this morning's body fat if it was already
 * written. A box with something unreadable in it — or a zero, which no scale
 * reads — stops the whole save and names the box, rather than saving the
 * other two and quietly dropping the third.
 */
export function parseMeasurements(
  drafts: Record<BodyMetric, string>
): { values: Partial<Record<BodyMetric, number>> } | { bad: BodyMetric } | { empty: true } {
  const values: Partial<Record<BodyMetric, number>> = {};
  for (const key of BODY_METRIC_ORDER) {
    const raw = drafts[key].trim().replace(',', '.');
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return { bad: key };
    values[key] = value;
  }
  return Object.keys(values).length ? { values } : { empty: true };
}

/**
 * Body mass index from a height in centimetres, to one decimal. Null when
 * either number is missing or not a plausible reading, rather than a BMI of
 * 0 or 900 on the screen.
 */
export function bmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm < 50 || heightCm > 250) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}
