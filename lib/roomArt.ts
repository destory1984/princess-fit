import { roomTimeOf, type RoomTime } from './roomTime';

/**
 * The same room in three lights. Kept out of `./roomTime` so that file stays a
 * plain rule the tests can import without a bundler.
 */
const ROOMS: Record<RoomTime, number> = {
  day: require('../assets/room.png'),
  evening: require('../assets/room_evening.png'),
  night: require('../assets/room_night.png'),
};

/** The room as it looks at this hour. */
export function roomArt(at: Date): number {
  return ROOMS[roomTimeOf(at)];
}
