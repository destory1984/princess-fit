/**
 * Sprites for the room, keyed by furniture id.
 *
 * Each entry carries its art's aspect ratio so a piece can be placed by width
 * alone and keep its proportions — the room data says where a thing goes, and
 * this file says what shape it is.
 *
 * A piece with no entry here still shows in the room as a small gold plaque,
 * so a purchase visibly lands instead of vanishing into a database column,
 * and it stays obvious which art is still missing.
 *
 * Every piece is dot art ordered in the style of the room (docs/art-order.md)
 * and trimmed to its own edges by scripts/room-assets.py, so its place in
 * lib/room.ts is the piece itself, not a canvas with a piece somewhere in it.
 */
type Art = { source: number; aspect: number };

const ART: Record<string, Art> = {
  rug: { source: require('../assets/room/rug.png'), aspect: 768 / 242 },
  bed: { source: require('../assets/room/bed.png'), aspect: 768 / 641 },
  bench: { source: require('../assets/room/bench.png'), aspect: 768 / 274 },
  mirror: { source: require('../assets/room/mirror.png'), aspect: 262 / 768 },
  shelf: { source: require('../assets/room/shelf.png'), aspect: 504 / 768 },
  flowers: { source: require('../assets/room/flowers.png'), aspect: 410 / 768 },
  curtain: { source: require('../assets/room/curtain.png'), aspect: 671 / 768 },
  pictures: { source: require('../assets/room/pictures.png'), aspect: 687 / 768 },
  chandelier: { source: require('../assets/room/chandelier.png'), aspect: 736 / 768 },
};

export function artFor(furnitureId: string): Art | null {
  return ART[furnitureId] ?? null;
}
