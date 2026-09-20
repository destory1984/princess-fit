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
 * The rug is out for now. Its art is drawn from too high an angle to lie
 * convincingly on this floor — 「나르는 양탄자야?」 — and widening it only
 * makes the ellipse more obviously a circle. The file is still in
 * assets/room, so putting it back is this one line once a flatter one exists.
 */
type Art = { source: number; aspect: number };

const ART: Record<string, Art> = {
  bed: { source: require('../assets/room/bed.png'), aspect: 1371 / 1148 },
  curtain: { source: require('../assets/room/curtain.png'), aspect: 1536 / 1024 },
  shelf: { source: require('../assets/room/shelf.png'), aspect: 1024 / 1536 },
  mirror: { source: require('../assets/room/mirror.png'), aspect: 1024 / 1536 },
  chandelier: { source: require('../assets/room/chandelier.png'), aspect: 1536 / 1024 },
};

export function artFor(furnitureId: string): Art | null {
  return ART[furnitureId] ?? null;
}
