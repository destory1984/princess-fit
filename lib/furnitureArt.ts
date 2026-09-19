/**
 * Sprites for the room, keyed by furniture id.
 *
 * Empty for now: only the bare room and its painted-in cot exist as art. A
 * piece with no sprite still shows in the room as a small gold plaque, so a
 * purchase visibly lands instead of vanishing into a database column — and so
 * it stays obvious which art is still missing.
 *
 * Add entries here as the art arrives; nothing else needs to change.
 */
const ART: Record<string, number> = {
  // flowers: require('../assets/room/flowers.png'),
};

export function artFor(furnitureId: string): number | null {
  return ART[furnitureId] ?? null;
}
