/**
 * Which light the room is in. The room is drawn three times — day, evening,
 * night — with only the sky in the window and the colour of the light changed,
 * so the furniture and the girl stand in the same place in all three.
 *
 * By the clock on the phone, not by the sun: the app does not know where it is.
 */
export type RoomTime = 'day' | 'evening' | 'night';

/** Evening from five, night from eight until six in the morning. */
export function roomTimeOf(at: Date): RoomTime {
  const hour = at.getHours();
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}
