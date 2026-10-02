/**
 * Which plates go on the bar for a given weight.
 *
 * The number on the set card is the whole bar. What a person does with it at
 * the rack is subtract the bar, halve the rest and work out which plates make
 * that — in their head, between sets, usually while out of breath. This does
 * that sum and writes the answer for one side.
 *
 * It is only true for a 20kg bar. An EZ bar or a Smith machine weighs
 * something else, and the app does not know which one is in the hands — so
 * the card names the bar it assumed.
 */

/** A full-size bar. The same 20 that `PLATE_THRESHOLD` stands on. */
export const BAR = 20;

/** What a rack carries, heaviest first. The 1.25s are why the bar moves by 2.5. */
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export type PlateLoad = {
  /** Plates for one side, heaviest first — the order they go on. */
  perSide: number[];
  /** What the bar weighs with them on. Less than asked when no plates make it. */
  loaded: number;
};

/**
 * The plates for one side, or nothing when the weight is lighter than the bar.
 *
 * Heaviest first is not only the fewest plates: it is the order they are
 * loaded, big ones against the collar.
 *
 * A weight the plates cannot make is rounded down, never up — the same rule
 * the warm-up follows. A bar 1kg lighter than the number costs nothing, and
 * one heavier is the wrong direction to be wrong in.
 */
export function platesFor(total: number, bar = BAR): PlateLoad | null {
  if (!Number.isFinite(total) || total < bar) return null;

  // In hundredths, so 1.25 a side adds up without drifting.
  let left = Math.round(((total - bar) / 2) * 100);
  const perSide: number[] = [];
  for (const plate of PLATES) {
    const size = Math.round(plate * 100);
    while (left >= size) {
      perSide.push(plate);
      left -= size;
    }
  }

  const side = perSide.reduce((sum, plate) => sum + plate, 0);
  return { perSide, loaded: Number((bar + side * 2).toFixed(2)) };
}

/** 「한쪽에 25×2 · 10」. The same plate twice is written once. */
export function plateWord(total: number, bar = BAR): string | null {
  const load = platesFor(total, bar);
  if (!load) return null;
  if (load.perSide.length === 0 && load.loaded === total) return '빈 봉';

  const counts = new Map<number, number>();
  for (const plate of load.perSide) counts.set(plate, (counts.get(plate) ?? 0) + 1);
  const plates = [...counts]
    .map(([plate, count]) => (count > 1 ? `${plate}×${count}` : `${plate}`))
    .join(' · ');

  const side = plates ? `한쪽에 ${plates}` : '빈 봉';
  // Said plainly when the number on screen is not one the rack can make.
  return load.loaded === total ? side : `${side} — 그러면 ${load.loaded}kg`;
}
