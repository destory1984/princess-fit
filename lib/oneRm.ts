/**
 * Estimating a one-rep max from a set you actually did.
 *
 * There is no single right answer — the published formulas disagree, and by
 * more the further you get from a single rep. Showing five of them side by
 * side is more honest than picking one and calling it your max: the spread
 * *is* the uncertainty.
 *
 * Every formula takes the weight lifted and the reps it was lifted for, and
 * all of them agree that one rep of a weight is a one-rep max of that weight.
 */

export type Formula = {
  name: string;
  /** Whose formula, for the legend: Epley, Brzycki, Lombardi, O'Conner, Wathen, written in Hangul like the rest of the screen. */
  estimate: (weight: number, reps: number) => number;
};

export const FORMULAS: Formula[] = [
  { name: '에플리', estimate: (w, r) => w * (1 + r / 30) },
  { name: '브르지키', estimate: (w, r) => w * (36 / (37 - r)) },
  { name: '롬바르디', estimate: (w, r) => w * r ** 0.1 },
  { name: '오코너', estimate: (w, r) => w * (1 + r / 40) },
  { name: '웨이선', estimate: (w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)) },
];

/**
 * Brzycki divides by (37 − reps), which explodes at 36 reps and goes negative
 * past it. Nothing above about twenty reps estimates a max meaningfully
 * anyway, so the input is capped rather than allowed to produce nonsense.
 */
export const MAX_REPS = 20;

/**
 * A single rep IS a one-rep max, by definition — but several of the formulas
 * do not know that: Epley returns w × 31/30 at one rep. They are all fitted
 * for multi-rep sets, so the single is answered directly instead.
 */
function estimateWith(formula: Formula, weight: number, reps: number) {
  if (reps === 1) return weight;
  return Math.round(formula.estimate(weight, Math.min(reps, MAX_REPS)) * 10) / 10;
}

export type Estimate = { name: string; kg: number };

export function estimates(weight: number, reps: number): Estimate[] {
  if (weight <= 0 || reps <= 0) return [];
  return FORMULAS.map((f) => ({ name: f.name, kg: estimateWith(f, weight, reps) }));
}

/** The range the formulas span, which is the number worth showing. */
export function spread(weight: number, reps: number) {
  const all = estimates(weight, reps).map((e) => e.kg);
  if (all.length === 0) return null;
  return { low: Math.min(...all), high: Math.max(...all) };
}

/** A curve per formula across the rep range, for drawing them together. */
export function curves(weight: number, upTo = MAX_REPS) {
  return FORMULAS.map((f) => ({
    name: f.name,
    points: Array.from({ length: upTo }, (_, i) => ({
      reps: i + 1,
      kg: estimateWith(f, weight, i + 1),
    })),
  }));
}
